# Demo Accounts - Hướng Dẫn Đăng Nhập

## 📋 Danh Sách Tài Khoản Demo

Các tài khoản demo được tạo tự động khi ứng dụng khởi động (trong chế độ development).

### 1. **Admin Tổng** (Super Admin)
- **Email**: `test@example.com`
- **Mật khẩu**: `123456`
- **Quyền hạn**: Admin toàn quyền
- **Mô tả**: Quản lý toàn bộ hệ thống

### 2. **Admin Kho** (Stock Admin)
- **Email**: `admin.stock@dalatfarm.vn`
- **Mật khẩu**: `123456`
- **Quyền hạn**: Admin (Quản lý kho)
- **Mô tả**: Quản lý hàng tồn kho, xuất nhập kho

### 3. **Người Bán Demo** (Seller)
- **Email**: `seller@dalatfarm.vn`
- **Mật khẩu**: `123456`
- **Quyền hạn**: Seller (Người bán)
- **Mô tả**: Bán sản phẩm, quản lý cửa hàng

### 4. **Khách Hàng A** (Customer A)
- **Email**: `customer.a@dalatfarm.vn`
- **Mật khẩu**: `123456`
- **Quyền hạn**: Customer (Khách hàng)
- **Mô tả**: Mua sắm, xem sản phẩm

### 5. **Khách Hàng B** (Customer B)
- **Email**: `customer.b@dalatfarm.vn`
- **Mật khẩu**: `123456`
- **Quyền hạn**: Customer (Khách hàng)
- **Mô tả**: Mua sắm, xem sản phẩm

---

## 🔧 Khắc Phục Sự Cố Đăng Nhập

### ❌ Lỗi: "Email hoặc mật khẩu không đúng"

**Nguyên nhân**: Tài khoản demo chưa được tạo trong Firebase Firestore

**Giải pháp**:

#### Cách 1: Sử dụng Nút "Khôi Phục Tài Khoản Demo" (Dễ Nhất)
1. Thi login page
2. Cuộn xuống đến phần "Không dăng nhập được?"
3. Nhấn nút **"Khôi phục tài khoản Demo"**
4. Chờ thông báo "Đã tạo/cập nhật thành công"
5. Thử đăng nhập lại với một trong các email ở trên

#### Cách 2: Xóa Local Storage & Tải Lại Trang
1. Nhấn **F12** để mở DevTools
2. Vào tab **Application** (hoặc Storage)
3. Chọn **Local Storage** > trang hiện tại
4. Xóa tất cả các item
5. Tải lại trang (Ctrl+F5)
6. Thử đăng nhập lại

#### Cách 3: Kiểm Tra Firebase Configuration
1. Mở DevTools (F12)
2. Vào tab **Console**
3. Kiếm lỗi liên quan đến Firebase:
   - **`auth/configuration-not-found`**: Cần bật Email/Password Auth trong Firebase Console
   - **`permission-denied`**: Kiểm tra Firebase Firestore Rules

---

## ✅ Cách Xác Nhận Tài Khoản Đã Được Tạo

### Qua Browser DevTools:
1. Nhấn **F12** → **Application** → **Local Storage**
2. Tìm item `dalatfarm_auth_user` 
3. Nếu có dữ liệu = tài khoản đã được tạo thành công

### Qua Firebase Console:
1. Truy cập: https://console.firebase.google.com
2. Chọn project: `dacsandl-83208`
3. Vào **Firestore Database** → Collection `users`
4. Tìm các document với email demo

---

## 🚀 Hành Động Tiếp Theo

Sau khi đăng nhập thành công, bạn có thể:

- **Khách hàng**: Xem sản phẩm, thêm vào giỏ, thanh toán
- **Seller**: Thêm sản phẩm, xem đơn hàng
- **Admin**: Quản lý người dùng, sản phẩm, đơn hàng

---

## ⚙️ Quy Trình Tạo Tài Khoản Demo (Tự Động)

Khi ứng dụng khởi động lần đầu:

```typescript
// 1. Kiểm tra environment.enableDemoAccount = true
// 2. Gọi initializeDemoAccount()
// 3. Với mỗi email demo:
//    a. Kiểm tra user đã tồn tại trong Firestore?
//    b. Nếu chưa: tạo mới với password hash
//    c. Nếu có: cập nhật thông tin
// 4. Xóa trường password cũ để bảo mật
```

---

## 🔒 Bảo Mật

⚠️ **Quan trọng**: 
- Chỉ sử dụng tài khoản demo trong **development**
- Production build (`environment.prod.ts`) có `enableDemoAccount: false`
- Mật khẩu demo `123456` chỉ cho test, không dùng cho thực tế

---

## 📞 Hỗ Trợ

Nếu vẫn không thể đăng nhập:
1. Kiểm tra console (F12) cho lỗi
2. Xóa Browser cache: Ctrl+Shift+Delete
3. Thử browser khác (Chrome, Firefox)
4. Liên hệ admin để reset Firestore

