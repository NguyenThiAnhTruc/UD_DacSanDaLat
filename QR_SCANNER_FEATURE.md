# Tính Năng Quét Mã QR - Truy Xuất Nguồn Gốc Sản Phẩm

## Mô Tả
Tính năng quét mã QR cho phép người dùng nhanh chóng truy cập thông tin nguồn gốc sản phẩm bằng cách:
- Quét mã QR trên bao bì sản phẩm bằng camera
- Nhập mã sản phẩm thủ công nếu không có camera hoặc gặp lỗi
- Xem thông tin chi tiết về nguồn gốc, chứng nhận, và quy trình sản xuất

## Cách Sử Dụng

### 1. Mở Trình Quét QR
- Từ trang chủ (Tab 1), nhấn vào icon QR code ở góc trên bên phải
- Ứng dụng sẽ yêu cầu quyền truy cập camera (cho phép để tiếp tục)

### 2. Quét Mã QR
**Phương Pháp 1: Quét Bằng Camera**
- Di chuyển camera để khung quét màu xanh bao phủ mã QR
- Giữ camera cách mã QR khoảng 10-20cm
- Hệ thống tự động nhận diện và xử lý

**Phương Pháp 2: Nhập Thủ Công**
- Nhấn nút "Nhập mã thủ công"
- Nhập mã sản phẩm (ví dụ: 1, 2, 3...)
- Hoặc chọn từ danh sách mã demo bên dưới
- Nhấn "Xác nhận"

### 3. Xem Thông Tin Nguồn Gốc
- Sau khi quét thành công, ứng dụng hiển thị thông báo thành công
- Tự động chuyển đến trang Truy Xuất Nguồn Gốc
- Xem đầy đủ thông tin về sản phẩm, nguồn gốc, chứng nhận

## Cấu Trúc File

### Service Layer
```
src/app/services/qr-scanner.service.ts
```
- `extractProductId(qrData)`: Phân tích mã QR và trích xuất ID sản phẩm
  - Hỗ trợ 3 định dạng: ID trực tiếp, URL pattern, JSON object
- `isValidQRCode(qrData)`: Kiểm tra tính hợp lệ của mã QR
- `generateQRData(productId)`: Tạo dữ liệu QR chuẩn JSON
- `showInvalidQRAlert()`: Hiển thị cảnh báo khi mã QR không hợp lệ

### Page Component
```
src/app/qr-scanner/
  ├── qr-scanner.page.ts              # Logic xử lý
  ├── qr-scanner.page.html            # Template UI
  ├── qr-scanner.page.scss            # Styling
  ├── qr-scanner.module.ts            # Module configuration
  └── qr-scanner-routing.module.ts   # Routing setup
```

### Tính Năng Component
**qr-scanner.page.ts:**
- `initializeCamera()`: Khởi tạo camera với getUserMedia API
- `startScanning()`: Bắt đầu quét mã QR
- `stopCamera()`: Dừng camera và giải phóng tài nguyên
- `toggleManualInput()`: Chuyển đổi giữa quét camera và nhập thủ công
- `processManualCode()`: Xử lý mã nhập thủ công
- `toggleFlashlight()`: Bật/tắt đèn flash (nếu thiết bị hỗ trợ)
- `closeScanner()`: Đóng trình quét và quay về trang chủ

## Routing Configuration
```typescript
// app-routing.module.ts
{
  path: 'qr-scanner',
  loadChildren: () => import('./qr-scanner/qr-scanner.module')
    .then(m => m.QrScannerPageModule)
}
```

## UI/UX Design

### Camera View
- Màn hình đen toàn màn hình
- Video stream từ camera
- Khung quét 260x260px màu xanh emerald (#10b981)
- 4 góc với viền 40x40px
- Đường quét di chuyển dọc (animation 2s)
- Hướng dẫn "Điều chỉnh camera để quét mã QR"

### Manual Input View
- Card trắng bo tròn
- Input số với placeholder "Nhập mã sản phẩm"
- Nút xác nhận gradient xanh
- Demo chips với các mã sản phẩm mẫu (SP-1 đến SP-10)

### Success State
- Icon checkmark màu xanh với hiệu ứng bounce
- Spinner xoay
- Text "Đang tải thông tin..."
- Tự động chuyển trang sau 1.5s

### Action Buttons
- Nút "Nhập mã thủ công" / "Quét QR"
- Nút "Đèn flash" (chỉ hiện khi thiết bị hỗ trợ)
- Nút "Đóng" ở header

## Browser Compatibility

### Tested Browsers
- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Safari (iOS)
- ✅ Samsung Internet
- ⚠️ Firefox (playsinline attribute not supported)

### Required Permissions
- **Camera**: Bắt buộc để quét QR
- **Media Capture**: Tự động yêu cầu khi truy cập getUserMedia

## Demo Mode

### Test Product IDs
Sử dụng các mã sau để test:
- 1, 2, 3, 4, 5: Rau củ
- 6, 7, 8, 9, 10: Trái cây

### QR Code Format Support
1. **Direct ID**: Chỉ số ID (ví dụ: "5")
2. **URL Pattern**: URL có dạng `/product-origin/:id` (ví dụ: "https://app.com/product-origin/5")
3. **JSON Object**: JSON với field `productId` (ví dụ: `{"productId": "5", "type": "product"}`)

## Integration Points

### Home Page (Tab1)
```html
<!-- tab1.page.html -->
<ion-button (click)="openQRScanner()">
  <ion-icon name="qr-code-outline"></ion-icon>
</ion-button>
```

```typescript
// tab1.page.ts
openQRScanner() {
  this.router.navigate(['/qr-scanner']);
}
```

### Product Origin Page
- Nhận productId từ route params
- Hiển thị thông tin đầy đủ về nguồn gốc
- Back button quay về trang chủ

## Future Enhancements

### Planned Features
1. **Real QR Detection**: Tích hợp thư viện jsQR hoặc ZXing
2. **Offline Support**: Cache dữ liệu sản phẩm để xem offline
3. **History**: Lưu lịch sử các sản phẩm đã quét
4. **Share**: Chia sẻ thông tin sản phẩm
5. **Multiple Formats**: Hỗ trợ barcode, Data Matrix, etc.

### Performance Optimizations
- Lazy load jsQR library chỉ khi cần
- Debounce camera frame processing
- Use Web Workers for QR detection

## Known Limitations

1. **Camera Access**: Yêu cầu HTTPS hoặc localhost
2. **Browser Support**: Không hỗ trợ IE11
3. **QR Detection**: Hiện tại chỉ có UI, cần tích hợp thư viện QR decoder
4. **Flashlight**: Chỉ hoạt động trên các thiết bị có torch capability

## Testing Checklist

- [ ] Camera khởi tạo thành công
- [ ] Chuyển đổi giữa camera và manual input
- [ ] Nhập mã thủ công và xác nhận
- [ ] Click vào demo chips
- [ ] Flashlight toggle (nếu thiết bị hỗ trợ)
- [ ] Close button quay về trang chủ
- [ ] Navigation đến product-origin page
- [ ] Error handling khi camera không khả dụng
- [ ] Toast messages hiển thị đúng

## Resources

- **Ionic Camera**: https://ionicframework.com/docs/native/camera
- **jsQR Library**: https://github.com/cozmo/jsQR
- **MediaDevices API**: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices
- **getUserMedia**: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
