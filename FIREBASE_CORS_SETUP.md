# Hướng dẫn sửa lỗi CORS Firebase Storage

## Tình trạng hiện tại
- ❌ Lỗi: `Access to XMLHttpRequest has been blocked by CORS policy`
- ❌ Endpoint trả HTTP 404 khi upload
- 📋 Nguyên nhân: Bucket chưa được enable hoặc CORS chưa cấu hình

---

## Bước 1: Kiểm tra Firebase Storage đã enable
1. Vào [Firebase Console](https://console.firebase.google.com)
2. Chọn project **dacsandl-83208**
3. Sang tab **Storage** (bên trái)
4. Nếu chưa enable:
   - Nhấn **"Get Started"** hoặc **"Start"**
   - Chọn vị trí (mặc định là OK)
   - Chọn **"Next"** → **"Done"**

---

## Bước 2: Thiết lập CORS qua Google Cloud Shell

### Cách 1: Dùng Google Cloud Console (Recommended)
1. Vào [Google Cloud Console](https://console.cloud.google.com)
2. Đảm bảo project là **dacsandl-83208**
3. Mở **Cloud Shell** (icon terminal ở góc trên phải)
4. Chạy lệnh sau:

```bash
# Cấu hình CORS cho bucket Storage
gsutil cors set storage.cors.json gs://dacsandl-83208.appspot.com
```

File `storage.cors.json` đã được cập nhật trong project với các header cần thiết.

**Kết quả thành công:**
```
Setting CORS configuration on gs://dacsandl-83208.appspot.com/...
```

### Cách 2: Dùng Firebase CLI (Nếu có cài đặt local)
```bash
cd da-lat-farm

# Nếu chưa login
firebase login

# Cấu hình CORS
firebase functions:log

# Hoặc upload rules trực tiếp
firebase deploy --only storage
```

---

## Bước 3: Xác minh CORS được cấu hình

### Kiểm tra trên Google Cloud Shell:
```bash
gsutil cors get gs://dacsandl-83208.appspot.com
```

Kết quả sẽ hiển thị config tương tự file `storage.cors.json`:
```json
[
  {
    "origin": [
      "http://localhost:4200",
      "http://127.0.0.1:4200",
      ...
    ],
    "method": [
      "GET",
      "HEAD",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS"
    ],
    ...
  }
]
```

---

## Bước 4: Test upload ảnh

### Dùng cURL để test:
```bash
# Windows (PowerShell)
$response = Invoke-WebRequest -Uri "https://firebasestorage.googleapis.com/v0/b/dacsandl-83208.appspot.com/o" `
  -Method Get `
  -Headers @{"Origin"="http://localhost:4200"}

echo $response.StatusCode  # Nên trả 200, không phải 404
```

### Hoặc kiểm tra trong browser:
1. Chạy ứng dụng: `npm start` (hoặc `ionic serve`)
2. Mở DevTools (F12)
3. Tab **Network**
4. Upload ảnh
5. Tìm request tới `firebasestorage.googleapis.com`
6. Kiểm tra response status:
   - ✅ **200**: CORS OK
   - ❌ **404**: Bucket không sẵn sàng
   - ❌ **CORS error**: CORS chưa được cấu hình

---

## Bước 5: Cấu hình biến môi trường

Đảm bảo `.env` đã có:
```env
FIREBASE_STORAGE_BUCKET=dacsandl-83208.appspot.com
```

Rồi chạy:
```bash
npm run prepare:env
```

---

## Troubleshooting

### Lỗi 1: "gsutil command not found"
**Giải pháp:**
- Cài đặt [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
- Windows: Chạy Cloud Shell từ [Firebase Console](https://console.firebase.google.com) thay vì terminal local

### Lỗi 2: "Bucket not found" hoặc "Permission denied"
**Giải pháp:**
- Đảm bảo bạn login với account có quyền Firebase Admin
- Recheck project ID: `dacsandl-83208`

### Lỗi 3: "Response to preflight request doesn't pass access control check"
**Giải pháp:**
- CORS chưa được apply
- Refresh page hoặc xóa browser cache
- Chạy lệnh CORS set lại (Bước 2)

### Lỗi 4: Application chạy nhưng vẫn gặp CORS
**Giải pháp:**
- Kiểm tra URL ứng dụng trùng với `storage.cors.json` origins:
  - Localhost: `http://localhost:4200`, `http://127.0.0.1:4200`
  - Nếu dùng port khác (ví dụ 8100): Thêm vào `storage.cors.json`:
    ```json
    "origin": [
      "http://localhost:4200",
      "http://localhost:8100",
      ...
    ]
    ```
  - Rồi chạy lại CORS set (Bước 2)

---

## File cấu hình
- **storage.cors.json** - Config CORS (đã được cập nhật)
- **storage.rules** - Rules truy cập Storage (cho phép public read, auth upload)

---

## Kết quả sau khi fix
✅ Upload ảnh thành công  
✅ Hiển thị ảnh không lỗi CORS  
✅ Không gặp "Invalid time value" khi format date  

---

**Ngày cập nhật:** 2026-03-21  
**Trạng thái:** Ready to deploy
