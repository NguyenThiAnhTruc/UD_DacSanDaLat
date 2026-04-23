# 🚀 HƯỚNG DẪN CHẠY ỨNG DỤNG

## Yêu cầu hệ thống
- Node.js >= 18.x
- npm >= 9.x
- Ionic CLI >= 8.x

## Cài đặt

```bash
# 1. Di chuyển vào thư mục dự án
cd da-lat-farm

# 2. Cài đặt dependencies
npm install

# 3. Chạy ứng dụng
ionic serve
# hoặc
npm start
```

## Truy cập ứng dụng

Mở trình duyệt tại: http://localhost:4200

## Tài khoản demo

**Email:** test@example.com  
**Password:** 123456

## Chức năng chính

### 1. Guest Mode (Không cần đăng nhập)
- Bỏ qua đăng nhập
- Xem sản phẩm
- Thêm vào giỏ hàng
- Thanh toán

### 2. Login Mode
- Đăng nhập với tài khoản
- Lưu sản phẩm yêu thích
- Xem lịch sử đơn hàng
- Quản lý thông tin cá nhân

### 3. Tính năng mới
- **Search Suggestions:** Gõ từ khóa để xem gợi ý tìm kiếm
- **Favorites:** Nhấn icon trái tim để lưu sản phẩm yêu thích
- **Loading States:** Skeleton và spinner khi load dữ liệu
- **Form Validation:** Thông báo lỗi chi tiết khi nhập sai

## Build production

```bash
ionic build --prod
```

## Cấu trúc thư mục

```
src/
├── app/
│   ├── login/          # Đăng nhập
│   ├── tab1/           # Trang chủ
│   ├── tab2/           # Giỏ hàng
│   ├── tab3/           # Tài khoản
│   ├── product-detail/ # Chi tiết sản phẩm
│   ├── services/       # AuthService, ProductService
│   └── models/         # Product, Order, User
├── assets/             # Hình ảnh, icons
└── theme/              # CSS variables

```

## Troubleshooting

### Lỗi: Cannot find module
```bash
npm install
```

### Lỗi: Port 4200 đã được sử dụng
```bash
ionic serve --port 4201
```

### Lỗi: Ionic CLI không tìm thấy
```bash
npm install -g @ionic/cli
```

## Support

Liên hệ: support@dalatfarm.vn
