# Verify Upload Flow (Cloudinary)

Status: IMPLEMENTED
Last verified: 2026-03-21

---

## Requirement check

1. Khong dung HttpClient upload anh
- Status: PASS
- Upload duoc thuc hien bang `fetch` trong Cloudinary service

2. Upload product image thanh cong
- Status: PASS
- File: `src/app/seller-products/seller-products.page.ts`
- Goi: `uploadProductImage(...)`

3. Upload avatar profile thanh cong
- Status: PASS
- File: `src/app/services/auth.service.ts`
- Goi: `uploadUserAvatar(...)`

4. Luu URL vao Firestore
- Status: PASS
- Product image luu vao `product.image`
- Avatar luu vao `user.avatar`

---

## Service dang dung

- `src/app/services/cloudinary-image-storage.service.ts`
  - `uploadProductImage(productId, file)`
  - `uploadUserAvatar(userId, file)`
  - tra ve `secure_url`

---

## Runtime config

- `.env`
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_UPLOAD_PRESET`

- Generate runtime:

```bash
npm.cmd run prepare:env
```

---

## Validation commands

```bash
npm.cmd run test -- --watch=false --browsers=ChromeHeadless
npm.cmd run build
```

Expected:
- Unit tests pass
- Build pass

---

## Notes

- Service upload Firebase cu da duoc xoa khoi codebase
- Tai lieu nay thay the ban verify Firebase SDK truoc do
