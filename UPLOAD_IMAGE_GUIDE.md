# Hướng dẫn Upload va Display Anh (Cloudinary)

## Flow hien tai

```
1. User chon anh (Camera/Gallery)
   ↓
2. Preview (base64) + kiem tra kich thuoc va type
   ↓
3. Upload -> Cloudinary unsigned preset
   ↓
4. Nhan secure_url
   ↓
5. Luu URL vao Firestore
   ↓
6. Hien thi anh trong HTML (img src=URL)
```

---

## Service dang dung

- `src/app/services/cloudinary-image-storage.service.ts`
  - `uploadUserAvatar(userId, file): Promise<string>`
  - `uploadProductImage(productId, file): Promise<string>`
  - `base64ToFile(base64String, fileName, mimeType): File`

Service upload bang `fetch` + `FormData` toi Cloudinary API va tra ve `secure_url`.

---

## Runtime config can co

- `.env`
  - `CLOUDINARY_CLOUD_NAME=...`
  - `CLOUDINARY_UPLOAD_PRESET=...`

- `src/assets/env.js` se duoc tao qua:

```bash
npm.cmd run prepare:env
```

---

## Vi tri tich hop trong app

- Upload anh san pham:
  - `src/app/seller-products/seller-products.page.ts`
  - goi `this.imageStorageService.uploadProductImage(...)`

- Upload avatar profile:
  - `src/app/services/auth.service.ts`
  - goi `this.cloudinaryImageStorageService.uploadUserAvatar(...)`

Luu y: `edit-profile.page.ts` khong upload truc tiep nua de tranh upload 2 lan. Viec upload duoc thuc hien trong `auth.service.ts` khi goi `updateProfileWithAvatar()`.

---

## Test nhanh

1. Chay app:

```bash
npm.cmd start -- --port 4201
```

2. Test san pham:
- Vao trang Seller Products
- Chon anh moi
- Bam luu
- Kiem tra URL anh la Cloudinary (`https://res.cloudinary.com/...`)

3. Test avatar:
- Vao trang Edit Profile
- Chon anh
- Bam luu
- Reload trang va kiem tra avatar van hien

---

## Troubleshooting

- Loi `Cloudinary config is missing`:
  - Kiem tra bien `CLOUDINARY_CLOUD_NAME` va `CLOUDINARY_UPLOAD_PRESET` trong `.env`
  - Chay lai `npm.cmd run prepare:env`

- Loi `Upload preset not found`:
  - Kiem tra preset da tao dung trong Cloudinary Console
  - Dam bao preset la unsigned

- Loi anh khong hien:
  - Kiem tra field image/avatar trong Firestore da luu `secure_url`
  - Mo URL truc tiep tren browser de xac nhan URL hop le

  <!-- Form fields... -->
  <div class="form-fields">
    <!-- name, email, phone, address inputs -->
  </div>

  <!-- Save button -->
  <button 
    class="save-button"
    (click)="saveProfile()"
    [disabled]="isUploadingAvatar"
  >
    {{ isUploadingAvatar ? 'Đang cập nhật...' : 'Lưu thông tin' }}
  </button>
</ion-content>
```

---

## 🖼️ Display Ảnh trong Danh Sách Sản Phẩm

### HTML (product list / tab1)

```html
<!-- Product card -->
<ion-card *ngFor="let product of products">
  
  <!-- Product image -->
  <div class="product-image-container">
    <img 
      [src]="product.images[0] || 'assets/images/placeholder.svg'" 
      alt="{{ product.name }}"
      class="product-image"
      (error)="onImageError($event)"
      [alt]="'Image of ' + product.name"
    />
  </div>

  <!-- Product info -->
  <ion-card-header>
    <ion-card-title>{{ product.name }}</ion-card-title>
    <ion-card-subtitle>
      {{ product.price | currency:'VND' }}
    </ion-card-subtitle>
  </ion-card-header>

</ion-card>
```

### TypeScript (handle image error)

```typescript
/**
 * Handle image load error - show placeholder
 */
onImageError(event: any) {
  console.warn('Image failed to load:', event);
  event.target.src = 'assets/images/placeholder.svg';
}
```

---

## 🔐 Firebase Storage Rules (storage.rules)

Đã được cấu hình để:
- ✅ Allow **public read** (hiển thị ảnh)
- ✅ Allow **authenticated upload** (chỉ user đăng nhập)

```rules
match /products/{productId}/{fileName} {
  // Công khai đọc (để hiển thị ảnh)
  allow read: if true;
  
  // Chỉ user đăng nhập upload
  allow create, update: if signedIn()
    && request.resource != null
    && request.resource.size < 8 * 1024 * 1024
    && request.resource.contentType.matches('image/.*');
}

match /avatars/{userId}/{fileName} {
  // User đăng nhập đọc
  allow read: if signedIn();
  
  // Chỉ owner upload
  allow create, update: if isOwner(userId)
    && request.resource != null
    && request.resource.size < 5 * 1024 * 1024
    && request.resource.contentType.matches('image/.*');
}
```

---

## Debugging checklist

- [ ] `.env` co `CLOUDINARY_CLOUD_NAME` va `CLOUDINARY_UPLOAD_PRESET`
- [ ] Da chay `npm.cmd run prepare:env`
- [ ] Upload thanh cong va tra ve URL bat dau bang `https://res.cloudinary.com/`
- [ ] URL duoc luu vao Firestore (`product.image`, `user.avatar`)
- [ ] Anh hien thi dung trong HTML
- [ ] Khong gap loi `Invalid time value`

---

## Summary

| Buoc | File | Ham | Output |
|---|---|---|---|
| 1. Chon anh | `camera.service.ts` | `getPhoto()` | Base64 string |
| 2. Validate | `validation.service.ts` | `isValidImageFile()` | Valid true/false |
| 3. Upload | `cloudinary-image-storage.service.ts` | `uploadUserAvatar()` / `uploadProductImage()` | secure_url |
| 4. Luu profile/product | `auth.service.ts` / `product.service.ts` | update va persist | URL duoc luu vao Firestore |
| 5. Display | HTML img tag | `[src]` | Anh hien thi |

---

Ngay cap nhat: 2026-03-21
Status: Ready to use
