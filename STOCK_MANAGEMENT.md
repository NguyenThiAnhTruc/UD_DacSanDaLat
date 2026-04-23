# Hệ Thống Quản Lý Tồn Kho Sản Phẩm

## Tổng Quan
Hệ thống quản lý tồn kho giúp người dùng nhận biết rõ ràng trạng thái còn hàng/hết hàng của sản phẩm khi mua, bao gồm:
- ✅ Hiển thị trạng thái tồn kho với màu sắc trực quan
- ✅ Ngăn không cho thêm sản phẩm khi hết hàng
- ✅ Cảnh báo khi sắp hết hàng (≤ 10 sản phẩm)
- ✅ Kiểm tra số lượng trong giỏ hàng trước khi thêm
- ✅ Thông báo chi tiết về số lượng còn lại

## Trạng Thái Tồn Kho

### 1. Còn Hàng Nhiều (> 20 sản phẩm)
- **Màu sắc**: Xanh lá (success)  
- ** Icon**: `checkmark-circle`
- **Hiển thị**: "Còn [số lượng]"
- **Hành động**: Cho phép thêm vào giỏ bình thường

### 2. Sắp Hết Hàng (6-20 sản phẩm)
- **Màu sắc**: Vàng cam (warning)
- **Icon**: `warning`
- **Hiển thị**: "Còn [số lượng]"
- **Cảnh báo**: Hiển thị animation pulse để thu hút sự chú ý
- **Hành động**: Cho phép thêm nhưng cảnh báo số lượng còn lại

### 3. Gần Hết Hàng (1-5 sản phẩm)
- **Màu sắc**: Đỏ (danger)
- **Icon**: `alert-circle`
- **Hiển thị**: "Chỉ còn [số lượng]" hoặc "Còn [số lượng]"
- **Cảnh báo**: Animation pulse mạnh + thông báo warning khi thêm vào giỏ
- **Hành động**: Cho phép thêm nhưng cảnh báo nghiêm trọng

### 4. Hết Hàng (0 sản phẩm)
- **Màu sắc**: Đỏ đậm (danger)
- **Icon**: `close-circle`
- **Hiển thị**: "❌ Hết hàng"
- **Overlay**: Lớp phủ tối trên ảnh sản phẩm
- **Hành động**: Vô hiệu hóa nút "Thêm vào giỏ"

## Chức Năng Chi Tiết

### 1. Trang Chủ (Tab1)

#### Featured Products (Sản phẩm nổi bật)
```html
<div class="stock-indicator" 
     [ngClass]="{'low-stock': product.stock <= 10, 'out-of-stock': product.stock <= 0}">
  <ion-icon [name]="product.stock <= 0 ? 'close-circle' : 'checkmark-circle'"></ion-icon>
  <span>{{ product.stock <= 0 ? 'Hết' : 'Còn hàng' }}</span>
</div>
```

- **Vị trí**: Góc trên bên phải của card sản phẩm
- **Kiểu**: Badge nhỏ gọn, trong suốt với backdrop-filter
- **Màu sắc động**: 
  - Xanh lá: Còn hàng
  - Vàng cam: Sắp hết (≤10)
  - Đỏ: Hết hàng

#### Product Cards (Thẻ sản phẩm)
```html
<ion-badge class="stock-badge" [color]="getStockColor(product.stock)">
  <ion-icon [name]="getStockIcon(product.stock)"></ion-icon>
  {{ getStockStatus(product.stock) }}
</ion-badge>
```

- **Overlay hết hàng**: Khi `stock === 0`, hiển thị lớp phủ đen mờ với label "Hết hàng"
- **Quick view**: Ẩn nút "Xem nhanh" khi hết hàng
- **Nút "Thêm vào giỏ"**:
  - Disabled khi `stock <= 0`
  - Hiển thị "❌ Hết hàng" thay vì "Thêm vào giỏ"
  - Thay đổi icon từ `cart` → `close-circle`
  - Màu nền chuyển sang xám

#### Logic Kiểm Tra
```typescript
async addToCart(product: Product) {
  // 1. Kiểm tra còn hàng
  if (product.stock <= 0) {
    await this.showToast('❌ Sản phẩm đã hết hàng', 'danger');
    return;
  }

  // 2. Kiểm tra số lượng trong giỏ
  const currentCartItem = this.productService.getCart()
    .find(item => item.product.id === product.id);
  const currentQuantity = currentCartItem ? currentCartItem.quantity : 0;
  
  // 3. Kiểm tra vượt quá tồn kho
  if (currentQuantity >= product.stock) {
    await this.showToast(
      `⚠️ Không thể thêm. Chỉ còn ${product.stock} ${product.unit}`, 
      'warning'
    );
    return;
  }

  // 4. Thêm vào giỏ
  this.productService.addToCart(product, 1);
  
  // 5. Cảnh báo nếu sắp hết
  const remainingStock = product.stock - (currentQuantity + 1);
  if (remainingStock <= 3) {
    await this.showToast(
      `✓ Đã thêm vào giỏ. ⚠️ Chỉ còn ${remainingStock} ${product.unit}!`, 
      'warning'
    );
  } else {
    await this.showToast(
      `✓ Đã thêm ${product.name} vào giỏ hàng`, 
      'success'
    );
  }
}
```

### 2. Trang Chi Tiết Sản Phẩm (Product Detail)

#### Stock Badge
```html
<ion-badge class="stock-badge" [color]="getStockColor(product.stock)">
  <ion-icon [name]="getStockIcon(product.stock)"></ion-icon>
  {{ getStockText(product.stock) }}
</ion-badge>
```

- **Vị trí**: Góc trên bên phải của ảnh sản phẩm chính
- **Badge kèm**: Hiển thị chứng nhận (VietGAP, Organic, etc.)
- **Kích thước**: Lớn hơn so với trang chủ để dễ nhìn

#### Stock Status trong Rating
```html
<span class="stock-text" 
      [class.low-stock]="product.stock <= 10" 
      [class.out-of-stock]="product.stock === 0">
  <ion-icon [name]="product.stock <= 0 ? 'close-circle' : 'checkmark-circle'"></ion-icon>
  {{ product.stock === 0 ? 'Hết hàng' : product.stock + ' còn lại' }}
</span>
```

- **Màu nền động**:
  - Xanh nhạt (#f0fdf4): Còn hàng
  - Vàng nhạt (#fffbeb): Sắp hết với animation pulse
  - Đỏ nhạt (#fef2f2): Hết hàng

#### Quantity Selector
```typescript
increaseQuantity() {
  if (this.product && this.quantity < this.product.stock) {
    this.quantity++;
  }
}
```

- **Giới hạn**: Không cho tăng quá `product.stock`
- **Disable button +**: Khi đạt tối đa tồn kho

#### Add to Cart Button
```html
<ion-button 
  expand="block" 
  class="add-to-cart-button"
  [class.out-of-stock]="!product || product.stock === 0"
  (click)="addToCart()"
  [disabled]="!product || product.stock === 0 || isAddingToCart">
  <ion-icon [name]="product.stock === 0 ? 'close-circle' : 'cart-outline'"></ion-icon>
  <span>{{ product.stock === 0 ? '❌ Hết hàng' : 'Thêm vào giỏ' }}</span>
</ion-button>
```

- **Disabled state**: Khi hết hàng hoặc đang thêm
- **Màu nền**: Đỏ (#ef4444) khi hết hàng
- **Loading**: Hiển thị spinner khi đang xử lý

#### Logic Kiểm Tra Nâng Cao
```typescript
async addToCart() {
  // 1. Kiểm tra sản phẩm tồn tại
  if (!this.product || this.isAddingToCart) return;

  // 2. Kiểm tra hết hàng
  if (this.product.stock === 0) {
    await this.showToast('❌ Sản phẩm đã hết hàng', 'danger', 'close-circle');
    return;
  }

  // 3. Kiểm tra số lượng trong giỏ
  const currentCartItem = this.productService.getCart()
    .find(item => item.product.id === this.product!.id);
  const currentQuantity = currentCartItem ? currentCartItem.quantity : 0;
  const totalQuantity = currentQuantity + this.quantity;

  // 4. Kiểm tra vượt tồn kho
  if (totalQuantity > this.product.stock) {
    const available = this.product.stock - currentQuantity;
    if (available <= 0) {
      await this.showToast(
        `⚠️ Bạn đã có ${currentQuantity} ${this.product.unit} trong giỏ. Không thể thêm nữa!`,
        'warning', 
        'warning'
      );
      return;
    }
    await this.showToast(
      `⚠️ Chỉ có thể thêm tối đa ${available} ${this.product.unit}`, 
      'warning', 
      'warning'
    );
    this.quantity = available;
    return;
  }

  // 5. Thêm vào giỏ
  try {
    this.isAddingToCart = true;
    this.productService.addToCart(this.product, this.quantity);
    
    // 6. Thông báo kết quả
    const remainingStock = this.product.stock - totalQuantity;
    if (remainingStock <= 3) {
      await this.showToast(
        `✓ Đã thêm ${this.quantity} ${this.product.unit}. ⚠️ Chỉ còn ${remainingStock}!`,
        'warning',
        'checkmark-circle'
      );
    } else {
      await this.showToast(
        `✓ Đã thêm ${this.quantity} ${this.product.name} vào giỏ hàng`,
        'success',
        'checkmark-circle'
      );
    }
    
    // 7. Điều hướng
    setTimeout(() => {
      this.router.navigate(['/tabs/tab2']);
    }, 500);
  } catch (error) {
    await this.showToast('❌ Đã xảy ra lỗi. Vui lòng thử lại', 'danger');
  } finally {
    this.isAddingToCart = false;
  }
}
```

## Helper Functions

### 1. getStockStatus()
```typescript
getStockStatus(stock: number): string {
  if (stock <= 0) return 'Hết hàng';
  if (stock <= 5) return `Còn ${stock}`;
  if (stock <= 20) return `Còn ${stock}`;
  return `Còn ${stock}`;
}
```

### 2. getStockColor()
```typescript
getStockColor(stock: number): string {
  if (stock <= 0) return 'danger';    // Đỏ
  if (stock <= 5) return 'danger';    // Đỏ
  if (stock <= 20) return 'warning';  // Vàng
  return 'success';                    // Xanh
}
```

### 3. getStockIcon()
```typescript
getStockIcon(stock: number): string {
  if (stock <= 0) return 'close-circle';     // X
  if (stock <= 5) return 'alert-circle';     // !
  if (stock <= 20) return 'warning';         // ⚠
  return 'checkmark-circle';                 // ✓
}
```

### 4. getStockText()
```typescript
getStockText(stock: number): string {
  if (stock === 0) return 'Hết hàng';
  if (stock <= 5) return `Chỉ còn ${stock}`;
  if (stock <= 20) return `Còn ${stock}`;
  return 'Còn hàng';
}
```

## Styling (SCSS)

### Stock Badge
```scss
.stock-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  
  ion-icon {
    font-size: 14px;
  }
}
```

### Out of Stock Overlay
```scss
.out-of-stock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.3s ease;

  .out-of-stock-label {
    background: rgba(239, 68, 68, 0.95);
    color: white;
    padding: 12px 24px;
    border-radius: 16px;
    font-size: 16px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4);
    animation: bounce 0.5s ease;
  }
}
```

### Stock Indicator (Featured Products)
```scss
.stock-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(16, 185, 129, 0.95);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 2;
  backdrop-filter: blur(8px);

  &.low-stock {
    background: rgba(245, 158, 11, 0.95);
    animation: pulse 2s ease-in-out infinite;
  }

  &.out-of-stock {
    background: rgba(239, 68, 68, 0.95);
  }
}
```

### Disabled Button
```scss
.add-cart-btn {
  &.disabled-btn {
    --background: #d1d5db;
    --color: #6b7280;
    cursor: not-allowed;
    opacity: 0.6;

    &:hover {
      transform: none;
      --box-shadow: none;
    }
  }
}
```

## Animations

### Pulse (Cảnh báo sắp hết)
```scss
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
}
```

### Bounce (Hết hàng)
```scss
@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
```

## Thông Báo (Toast Messages)

### Success
- ✓ Đã thêm [tên sản phẩm] vào giỏ hàng
- Color: success (xanh lá)
- Icon: checkmark-circle

### Warning (Sắp hết)
- ⚠️ Chỉ còn [số lượng] [đơn vị]!
- ⚠️ Không thể thêm. Chỉ còn [số lượng] [đơn vị]
- Color: warning (vàng cam)
- Icon: warning

### Danger (Hết hàng)
- ❌ Sản phẩm đã hết hàng
- Color: danger (đỏ)
- Icon: close-circle

## Kiểm Tra Và Test

### Test Cases
1. ✅ **Còn hàng > 20**: Badge xanh, cho phép thêm bình thường
2. ✅ **Còn hàng 6-20**: Badge vàng, animation pulse, cảnh báo nhẹ
3. ✅ **Còn hàng 1-5**: Badge đỏ, animation pulse mạnh, cảnh báo nghiêm trọng
4. ✅ **Hết hàng (0)**: Badge đỏ, overlay tối, nút disabled, icon X
5. ✅ **Vượt tồn kho trong giỏ**: Kiểm tra số lượng hiện tại + số lượng mới
6. ✅ **Đã đầy giỏ**: Thông báo "Không thể thêm nữa"
7. ✅ **Chỉ có thể thêm 1 phần**: Thông báo "Chỉ có thể thêm tối đa X"

### Mobile Responsive
- Badge và overlay hiển thị tốt trên màn hình nhỏ
- Toast message không che khuất nút hành động
- Animation mượt mà, không lag

## Lưu Ý Quan Trọng

1. **Không cập nhật stock thực tế**: Hệ thống hiện tại chỉ kiểm tra, không trừ stock trong database/service
2. **Cần backend API**: Để cập nhật stock thực tế khi đặt hàng thành công
3. **Race condition**: Cần xử lý khi nhiều người mua cùng lúc
4. **Refresh data**: Cần reload stock từ server định kỳ

## Tích Hợp Tương Lai

### Backend API
```typescript
// Cập nhật stock khi checkout
async completeOrder(orderId: number) {
  const order = await this.orderService.getOrder(orderId);
  for (const item of order.items) {
    await this.productService.updateStock(
      item.product.id, 
      -item.quantity // Trừ số lượng
    );
  }
}
```

### WebSocket Realtime
```typescript
// Nhận cập nhật stock realtime
this.socket.on('stock-updated', (data: {productId: number, newStock: number}) => {
  const product = this.products.find(p => p.id === data.productId);
  if (product) {
    product.stock = data.newStock;
  }
});
```

### Push Notification
- Thông báo khi sản phẩm yêu thích có hàng trở lại
- Cảnh báo admin khi stock <= 5
