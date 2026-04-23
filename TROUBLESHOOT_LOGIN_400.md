# 🔧 Hướng Dẫn Khắc Phục Lỗi 400 Khi Đăng Nhập

## ❌ Lỗi: "Failed to load resource: the server responded with a status of 400"

---

## 🔍 Tại Sao Bị Lỗi 400?

HTTP Status 400 = **Bad Request** - Yêu cầu không hợp lệ/không đầy đủ

Khi đăng nhập với Firebase, những điều này có thể gây 400:

| Nguyên nhân | Giải pháp |
|-----------|----------|
| **Email/Password auth chưa bật** | Bật trong Firebase Console |
| **Tài khoản demo ko tồn tại** | Dùng nút "Khôi phục Demo" trên login |
| **Firestore Rules quá hạn chế** | Sửa rules cho phép anonymous read |
| **Project chưa được bật** | Kích hoạt Firebase Authentication |

---

## 📋 BƯỚC 1: Kiểm Tra Firebase Console

### 1.1. Truy cập Firebase
- Vào: https://console.firebase.google.com
- Chọn project: **dacsandl-83208**

### 1.2. Bật Email/Password Authentication
1. Vào **Authentication** (trong menu bên trái)
2. Click tab **Sign-in method**
3. Tìm **Email/Password**
4. Nếu bị **Disabled** → Click nó → Bật toàn bộ toggle
5. Click **Enable** → **Save**

### 1.3. Kiểm Tra Firestore Rules
1. Vào **Firestore Database**
2. Click tab **Rules**
3. Xem rule có cho phép đọc collection `users` không?

**Rules hiện tại có thể quá hạn chế:**
```
match /users/{document=**} {
  allow read, write: if false;  // ❌ BỊ CHẶN
}
```

**Cần sửa thành:**
```
match /users/{document=**} {
  allow read: if true;           // ✅ Cho phép đọc
  allow write: if request.auth != null && request.auth.uid == resource.id;
}
```

---

## 📱 BƯỚC 2: Kiểm Tra Browser Console

### Mở Developer Tools
1. Nhấn **F12** hoặc **Chuột phải → Inspect**

### Tab **Console**
1. Dán đoạn code này:
```javascript
// Kiểm tra Local Storage
console.log('👤 Demo Accounts Stored:');
for(let i=0; i<localStorage.length; i++) {
  const key = localStorage.key(i);
  console.log(key);
}

// Kiểm tra Firebase Config
console.log('\n🔧 Firebase Project: dacsandl-83208');
```
2. Bấm Enter → Xem kết quả

### Tab **Network**
1. Nhấn **F5** để tải lại trang
2. **Bộ lọc: XHR** (để xem HTTP requests)
3. Thử đăng nhập lại
4. Tìm request có chứa `identitytoolkit.googleapis.com` hoặc `firestore.googleapis.com`
5. Click vào request đó → Xem **Response** tab → Kết quả:

**Nếu thấy:**
```json
{
  "error": {
    "code": 400,
    "message": "..."
  }
}
```
→ Copy message đó và gửi cho tôi để debug

---

## 🔄 BƯỚC 3: Khôi Phục Tài Khoản Demo

### Cách 1: Dùng Nút Trên App (Dễ Nhất)
1. Mở app
2. Scroll xuống trang login
3. Nhấn **"Khôi Phục Tài Khoản Demo"**
4. Chờ thông báo xanh ✅
5. Thử đăng nhập lại

### Cách 2: Xóa Cache & Tải Lại
```
Ctrl+Shift+Delete  (hoặc Cmd+Shift+Delete trên Mac)
→ Chọn "All time"
→ Clear data
→ Tải lại trang (F5)
```

### Cách 3: Thử Chế Độ Ẩn Danh (Incognito)
```
Ctrl+Shift+N (hoặc Cmd+Shift+N)
→ Truy cập app
→ Thử đăng nhập
```

---

## ✅ BƯỚC 4: Kiểm Tra Firestore Data

1. Firebase Console → **Firestore Database**
2. Collection **users**
3. Xem có document nào không?

**Nếu có** document với email `admin.stock@dalatfarm.vn`:
- ✅ Tài khoản đã được tạo
- → Vấn đề ở Firestore Rules

**Nếu trống:**
- ❌ Demo accounts chưa được khởi tạo
- → Nhấn nút "Khôi phục Demo" trên app

---

## 🚀 GIẢI PHÁP HOÀN CHỈNH

### Dành cho **Admin/Developer**:

**Cập nhật Firestore Security Rules:**

1. Vào Firebase Console → Firestore Database → Rules
2. Xóa rules cũ, thay bằng:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if true;  // Anonymous can read (để login hoạt động)
    }

    // Allow products to be read by everyone
    match /products/{doc=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Allow orders only for authenticated users
    match /orders/{doc=**} {
      allow create: if request.auth != null;
      allow read, write: if request.auth != null && (
        resource.data.user_id == request.auth.uid ||
        request.auth.token.role == 'admin'
      );
    }

    // Allow everything for admins
    match /{document=**} {
      allow read, write: if request.auth.token.role == 'admin';
    }
  }
}
```

3. Click **Publish**

### Dùng Nút App (Hành Động Tức Thì):
1. Login page → Scroll xuống
2. **"Khôi Phục Tài Khoản Demo"**
3. Thường giải quyết 80% trường hợp

---

## 📞 Nếu Vẫn Lỗi

Vui lòng cung cấp:

1. **Screenshot Network tab** showing the 400 error
2. **Full error message** từ Response body
3. **Firestore Rules** hiện tại (paste từ Firebase Console)
4. **Kết quả** từ Browser Console

---

## 🎯 TL;DR (Tóm Tắt)

```
1. Nhấn F12 → Network → Thử đăng nhập → Xem 400 error chi tiết
2. Vào Firebase Console → Check Email/Password auth bật chưa?
3. Kiểm tra Firestore Rules - có cho phép đọc collection users?
4. Trên app: Nhấn "Khôi Phục Tài Khoản Demo"
5. Xóa cache: Ctrl+Shift+Delete
```

