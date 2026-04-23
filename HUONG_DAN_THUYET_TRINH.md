# 🌿 ỨNG DỤNG BÁN NÔNG SẢN ĐÀ LẠT

## Tổng Quan Dự Án

Ứng dụng bán nông sản Đà Lạt là một giải pháp thương mại điện tử di động toàn diện, được xây dựng bằng **Ionic Framework** và **Angular**, cung cấp trải nghiệm mua sắm trực tuyến cho các sản phẩm nông nghiệp địa phương.

---

## 🎯 Mục Tiêu Dự Án

- Kết nối nông dân Đà Lạt với người tiêu dùng
- Đảm bảo truy xuất nguồn gốc sản phẩm minh bạch
- Cung cấp trải nghiệm mua sắm thuận tiện
- Hỗ trợ thanh toán QR Code an toàn và nhanh chóng
- Theo dõi đơn hàng thời gian thực

---

## ⚙️ Công Nghệ Sử Dụng

### Frontend
- **Ionic Framework 8.0** - Cross-platform mobile framework
- **Angular 20.0** - JavaScript framework
- **TypeScript** - Strongly typed programming
- **SCSS** - Styling

### Kiến trúc
- **Standalone Components** - Modern Angular architecture
- **RxJS** - Reactive programming
- **LocalStorage** - Client-side data persistence

---

## 🔄 QUY TRÌNH SỬ DỤNG ỨNG DỤNG (FLOW HOÀN CHỈNH)

```
Bắt đầu
   ↓
Người dùng mở ứng dụng
   ↓
Đăng nhập / Đăng ký tài khoản (hoặc Bỏ qua)
   ↓
Xem danh mục sản phẩm (Tìm kiếm & Lọc)
   ↓
Chọn sản phẩm
   ↓
Xem chi tiết sản phẩm ← [TRANG MỚI]
   ↓
Truy xuất nguồn gốc sản phẩm
   ↓
Thêm vào giỏ hàng (Chọn số lượng)
   ↓
Đặt hàng (Nhập thông tin giao hàng)
   ↓
Thanh toán bằng mã QR ← [TÍNH NĂNG MỚI]
   ↓
Hệ thống xác nhận đơn hàng
   ↓
Theo dõi trạng thái đơn hàng
   ↓
Kết thúc
```

---

## 📱 QUY TRÌNH CHI TIẾT THEO TỪNG BƯỚC

### **Bước 1: Đăng Nhập/Đăng Ký Hệ Thống** 🔐

#### Chức năng:
- **Đăng nhập** với email và mật khẩu
- **Đăng ký** tài khoản mới với thông tin đầy đủ
- **Bỏ qua đăng nhập** - Mua hàng ngay (Guest mode)

#### Thông tin đăng ký:
- Họ và tên
- Email
- Số điện thoại
- Địa chỉ giao hàng
- Mật khẩu (tối thiểu 6 ký tự)

#### Tính năng bảo mật:
- Validation dữ liệu đầu vào
- Mã hóa thông tin
- Session management

**File:** `src/app/login/`

---

### **Bước 2: Xem và Chọn Sản Phẩm** 🛍️

#### Danh sách sản phẩm:
- **12 sản phẩm** nông sản Đà Lạt
- Hiển thị: Tên, giá, hình ảnh, đánh giá, tồn kho

#### Tính năng lọc & tìm kiếm:
- **Tìm kiếm** theo tên sản phẩm
- **Bộ lọc** theo danh mục:
  - Trái cây (Dâu tây, Bơ, Dứa)
  - Rau củ (Atiso, Xà lách, Măng tây, Bắp cải tím)
  - Cà phê (Arabica)
  - Sữa (Sữa bò tươi)
  - Hoa (Hoa hồng)
  - Trà (Ô Long)
  - Thực phẩm (Mật ong rừng)

#### Hiển thị thông tin:
- Giá cả rõ ràng
- Đơn vị tính (kg, chai, bó)
- Số lượng còn trong kho
- Rating sao (1-5)
- Xuất xứ

#### Tương tác:
- **Click vào sản phẩm** → Xem chi tiết
- **Nút "Thêm vào giỏ"** → Thêm nhanh (số lượng = 1)
- **Nút "Xem chi tiết"** → Trang chi tiết sản phẩm

**File:** `src/app/tab1/`

---

### **Bước 3: Xem Chi Tiết Sản Phẩm** 📋 [TÍNH NĂNG MỚI]

#### Thông tin hiển thị:
- **Hình ảnh lớn** với gallery
- **Tên sản phẩm** và **Giá cả** nổi bật
- **Đánh giá sao** chi tiết
- **Trạng thái kho** (Còn hàng/Hết hàng)
- **Mô tả đầy đủ** về sản phẩm
- **Danh mục** sản phẩm

#### Chức năng:
- **Chọn số lượng** bằng nút +/-
- **Thêm vào giỏ hàng** với số lượng tùy chỉnh
- **Quay lại** danh sách sản phẩm
- **Xem giỏ hàng** nhanh

**File:** `src/app/product-detail/`

---

### **Bước 4: Truy Xuất Nguồn Gốc** 🌾

#### Thông tin minh bạch (Hiển thị trong trang chi tiết):
- **Cơ sở sản xuất**: Tên nông trại/HTX
- **Ngày thu hoạch**: Ngày cụ thể
- **Chứng nhận**: VietGAP, Organic, HACCP, OCOP
- **Thông tin nông dân**:
  - Tên nông dân
  - Số năm kinh nghiệm
  - Ảnh đại diện
- **Thông tin dinh dưỡng**:
  - Calories
  - Protein
  - Carbohydrates
  - Vitamin

#### Ví dụ sản phẩm "Dâu Tây Đà Lạt":
```
Nông trại: Hoa Lan
Thu hoạch: 25/01/2026
Chứng nhận: VietGAP, Organic, HACCP
Nông dân: Anh Nguyễn Văn A (15 năm kinh nghiệm)
Dinh dưỡng: 32 kcal, Vitamin C, K, Folate
```

**Data Model:** `src/app/models/product.model.ts`

---

### **Bước 5: Thêm Vào Giỏ Hàng** 🛒

#### Chức năng giỏ hàng:
- **Thêm sản phẩm** từ danh sách hoặc trang chi tiết
- **Tăng/giảm số lượng** trực tiếp
- **Xóa sản phẩm** khỏi giỏ (swipe to delete)
- **Xóa toàn bộ** giỏ hàng
- **Tính tổng tiền** tự động

#### Validation:
- Kiểm tra tồn kho trước khi thêm
- Không cho phép vượt quá số lượng tồn kho
- Thông báo toast khi thành công/thất bại

#### Badge hiển thị:
- Số lượng sản phẩm trong giỏ
- Cập nhật real-time

**File:** `src/app/tab2/`

---

### **Bước 6: Đặt Hàng và Thanh Toán QR Code** 💳 [TÍNH NĂNG MỚI]

#### Form nhập thông tin:
- **Họ và tên** người nhận
- **Số điện thoại** liên hệ
- **Địa chỉ giao hàng** chi tiết

#### Quy trình thanh toán:
1. **Nhập thông tin giao hàng** đầy đủ
2. **Nhấn "Đặt hàng"** → Xác nhận đơn hàng
3. **Hiển thị mã QR thanh toán** → VietQR
4. **Quét mã QR** bằng app ngân hàng
5. **Xác nhận đã thanh toán** → Hoàn tất đơn hàng

#### Thông tin thanh toán QR:
- **Ngân hàng**: MB Bank (Quân đội)
- **Chủ tài khoản**: NONG SAN DA LAT
- **Số tiền**: Tự động điền từ tổng đơn hàng
- **Nội dung**: Mã đơn hàng (tự động)

#### Tính năng:
- **Tự động tạo QR Code** với thông tin chính xác
- **Hiển thị QR lớn** dễ quét
- **Thông tin chi tiết** về tài khoản nhận
- **Hủy thanh toán** nếu cần
- **Xác nhận thanh toán** sau khi chuyển khoản

**File:** `src/app/tab2/` - QR Payment Section

---

### **Bước 7: Theo Dõi Đơn Hàng** 📦

#### Trạng thái đơn hàng:
1. **Chờ xác nhận** (Pending) - Màu vàng
   - Icon: ⏱️ time-outline
2. **Đang xử lý** (Processing) - Màu xanh dương
   - Icon: 🚴 bicycle-outline
3. **Đã giao** (Delivered) - Màu xanh lá
   - Icon: ✅ checkmark-circle-outline
4. **Đã hủy** (Cancelled) - Màu đỏ
   - Icon: ❌ close-circle-outline

#### Thông tin đơn hàng:
- Mã đơn hàng (ORD + timestamp)
- Ngày đặt hàng
- Danh sách sản phẩm
- Tổng tiền
- Thông tin người nhận
- Địa chỉ giao hàng

#### Tính năng:
- Xem lịch sử tất cả đơn hàng
- Xem chi tiết từng đơn hàng
- Thống kê số lượng đơn hàng

**File:** `src/app/tab3/`

---

## 🎨 TÍNH NĂNG CHUYÊN NGHIỆP

### 1. **Quản Lý State**
- **ProductService**: Quản lý sản phẩm, giỏ hàng, đơn hàng
- **AuthService**: Quản lý xác thực người dùng
- **RxJS BehaviorSubject**: Reactive state management
- **LocalStorage**: Lưu trữ dữ liệu offline

### 2. **UI/UX Design**
- **Theme màu xanh tươi mát** - Phù hợp nông sản
- **Gradient backgrounds** đẹp mắt
- **Card shadows** và hover effects
- **Smooth animations**: fadeIn, slideInUp
- **Responsive design** cho mọi thiết bị
- **Icons phù hợp** cho từng chức năng

### 3. **User Experience**
- Toast notifications
- Alert confirmations
- Loading indicators
- Form validation
- Error handling
- Empty states
- Real-time updates

### 4. **Data Persistence**
- Giỏ hàng tự động lưu
- Đơn hàng lưu trữ
- Thông tin người dùng
- Session persistence

---

## 📁 CẤU TRÚC DỰ ÁN

```
da-lat-farm/
├── src/
│   ├── app/
│   │   ├── login/              # Đăng nhập/Đăng ký
│   │   ├── tab1/               # Danh sách sản phẩm
│   │   ├── tab2/               # Giỏ hàng & Thanh toán
│   │   ├── tab3/               # Tài khoản & Đơn hàng
│   │   ├── tabs/               # Tab navigation
│   │   ├── models/             # TypeScript interfaces
│   │   │   └── product.model.ts
│   │   └── services/           # Business logic
│   │       ├── product.service.ts
│   │       └── auth.service.ts
│   ├── theme/
│   │   └── variables.scss      # Theme colors
│   └── global.scss            # Global styles
├── package.json
└── README.md
```

---

## 🚀 CÁCH CHẠY ỨNG DỤNG

### 1. Cài đặt dependencies:
```bash
cd da-lat-farm
npm install
```

### 2. Chạy ứng dụng:
```bash
npm start
# hoặc
ionic serve
```

### 3. Mở trình duyệt:
```
http://localhost:4200
```

---

## 📊 THỐNG KÊ DỰ ÁN

- **Số trang**: 4 trang chính + 1 trang đăng nhập
- **Số component**: 5 components
- **Số service**: 2 services
- **Số sản phẩm**: 12 sản phẩm
- **Số danh mục**: 7 danh mục
- **Dòng code**: ~3000+ lines

---

## 💡 TÍNH NĂNG NỔI BẬT

✅ **Hoàn chỉnh** - Đầy đủ chức năng từ A-Z
✅ **Chuyên nghiệp** - UI/UX hiện đại
✅ **An toàn** - Authentication & validation
✅ **Minh bạch** - Truy xuất nguồn gốc
✅ **Tiện lợi** - Dễ sử dụng, mượt mà
✅ **Responsive** - Tương thích mọi thiết bị

---

## 🔮 KẾ HOẠCH TƯƠNG LAI

### Phase 2 (Đang phát triển):
- [ ] Tích hợp thanh toán QR Code (VNPay/MoMo)
- [ ] Push notifications
- [ ] Email confirmation
- [ ] Rating & Review sản phẩm
- [ ] Wishlist (Yêu thích)
- [ ] Trang chi tiết sản phẩm
- [ ] Chatbot hỗ trợ
- [ ] Map giao hàng real-time

### Phase 3 (Kế hoạch):
- [ ] Backend API (Node.js/NestJS)
- [ ] Database (PostgreSQL/MongoDB)
- [ ] Admin Dashboard
- [ ] Analytics & Reports
- [ ] Multi-language support
- [ ] Dark mode

---

## 👨‍💻 THÔNG TIN LIÊN HỆ

**Developer**: Phong
**Email**: phong@dalatfarm.vn
**Version**: 1.0.0
**License**: MIT

---

## 📝 GHI CHÚ THUYẾT TRÌNH

### Điểm nhấn khi demo:
1. Bắt đầu từ trang đăng nhập (UI đẹp mắt)
2. Đăng ký tài khoản mới hoặc bỏ qua
3. Xem danh sách sản phẩm với filter
4. Thêm sản phẩm vào giỏ (xem toast)
5. Vào giỏ hàng, chỉnh số lượng
6. Điền thông tin và đặt hàng
7. Xem đơn hàng trong Tab 3
8. Đăng xuất

### Câu hỏi thường gặp:
**Q: Dữ liệu có mất khi refresh không?**
A: Không, sử dụng LocalStorage để lưu trữ

**Q: Có chạy trên điện thoại được không?**
A: Có, build thành APK/IPA bằng Capacitor

**Q: Thanh toán thật không?**
A: Chưa, đang trong phase kế hoạch

---

**🌿 Cảm ơn đã sử dụng Nông Sản Đà Lạt! 🌿**
