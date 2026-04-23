# Quick Start (Cloudinary Upload)

## Trang thai hien tai

| Hang muc | Status | Ghi chu |
|---|---|---|
| Upload product image | DONE | Cloudinary service |
| Upload profile avatar | DONE | Cloudinary service |
| Date invalid time fix | DONE | Da patch trong code |

---

## 3 buoc chay nhanh

### Buoc 1: Kiem tra bien moi truong

Trong `.env` can co:

```env
CLOUDINARY_CLOUD_NAME=ddyhwuqcf
CLOUDINARY_UPLOAD_PRESET=dacsan_dalat_preset
```

### Buoc 2: Generate runtime env

```bash
npm.cmd run prepare:env
```

### Buoc 3: Chay app va test upload

```bash
npm.cmd start -- --port 4201
```

Test:
1. Seller Products -> Chon anh -> Save
2. Edit Profile -> Chon anh -> Save
3. Kiem tra Firestore luu URL Cloudinary

---

## Neu gap loi

- `Cloudinary config is missing`:
	- Kiem tra `.env`
	- Chay lai `npm.cmd run prepare:env`

- `Upload preset not found`:
	- Kiem tra preset tren Cloudinary Console
	- Dam bao preset la unsigned

- Anh khong hien sau khi luu:
	- Kiem tra field image/avatar trong Firestore
	- URL phai bat dau bang `https://res.cloudinary.com/`

---

## ✨ Kết quả

✅ Upload ảnh không CORS error  
✅ Images hiển thị từ Firebase Storage  
✅ Date format safe  
✅ Ready for production  

---

**Thời gian:** ~15 phút để triển khai + test  
**Status:** 🟢 Ready to go!
