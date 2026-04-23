import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';
import { CartItem, Order } from '../../models/product.model';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartPage implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);

  cartItems: CartItem[] = [];
  isAuthenticated: boolean = false;
  isGuestMode: boolean = false;
  
  // Checkout form
  showCheckoutForm: boolean = false;
  customerName: string = '';
  customerPhone: string = '';
  deliveryAddress: string = '';
  orderNote: string = '';
  selectedPaymentMethod: Order['paymentMethod'] = 'cod';
  showQRPayment: boolean = false;
  qrCodeUrl: string = '';
  paymentAmount: number = 0;
  paymentReference: string = '';
  isProcessingOrder: boolean = false;
  private lastOrderAttemptAt: number = 0;
  private readonly orderThrottleMs: number = 1200;
  readonly paymentMethodOptions: Array<{ value: Order['paymentMethod']; label: string; icon: string; disabled?: boolean; note?: string }> = [
    { value: 'cod', label: 'Tiền mặt khi nhận hàng', icon: 'cash-outline' },
    { value: 'bank_transfer', label: 'Chuyển khoản ngân hàng (QR)', icon: 'qr-code-outline' },
    { value: 'visa', label: 'Thẻ Visa/Mastercard', icon: 'card-outline', disabled: true, note: 'Đang nâng cấp cổng thanh toán' },
    { value: 'momo', label: 'Ví MoMo', icon: 'wallet-outline', disabled: true, note: 'Đang nâng cấp cổng thanh toán' },
  ];

  // Subscriptions for cleanup
  private subscriptions = new Subscription();

  ngOnInit() {
    this.loadCart();
    this.checkAuthStatus();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  ionViewWillEnter() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.customerName = user.name;
      this.customerPhone = user.phone;
      this.deliveryAddress = user.address;
    }
    this.cdr.markForCheck();
  }

  // TrackBy function for performance optimization
  trackByCartItem(index: number, item: CartItem): number {
    return item.product.id;
  }

  loadCart() {
    this.subscriptions.add(this.productService.cart$.subscribe(cart => {
      this.cartItems = cart;
      this.cdr.markForCheck();
    }));
  }

  checkAuthStatus() {
    this.subscriptions.add(this.authService.isAuthenticated$.subscribe(isAuth => {
      this.isAuthenticated = isAuth;
      this.cdr.markForCheck();
    }));
    this.subscriptions.add(this.authService.isGuestMode$.subscribe(isGuest => {
      this.isGuestMode = isGuest;
      this.cdr.markForCheck();
    }));
    
    // Pre-fill user info if logged in
    const user = this.authService.getCurrentUser();
    if (user) {
      this.customerName = user.name;
      this.customerPhone = user.phone;
      this.deliveryAddress = user.address;
    }

    this.cdr.markForCheck();
  }

  getTotal(): number {
    return this.productService.getCartTotal();
  }

  getItemCount(): number {
    return this.productService.getCartItemCount();
  }

  updateQuantity(item: CartItem, change: number) {
    const newQuantity = item.quantity + change;
    const availableStock = this.productService.getAvailableStockByProductId(item.product.id);
    
    if (newQuantity <= 0) {
      this.confirmRemoveItem(item);
      return;
    }
    
    if (newQuantity > availableStock) {
      this.showToast('Số lượng vượt quá tồn kho', 'warning');
      return;
    }
    
    this.productService.updateCartItemQuantity(item.product.id, newQuantity);
  }

  async confirmRemoveItem(item: CartItem) {
    const alert = await this.alertController.create({
      header: 'Xác nhận',
      message: `Bạn có muốn xóa ${item.product.name} khỏi giỏ hàng?`,
      buttons: [
        {
          text: 'Hủy',
          role: 'cancel'
        },
        {
          text: 'Xóa',
          role: 'destructive',
          handler: () => {
            this.removeItem(item);
          }
        }
      ]
    });
    await alert.present();
  }

  removeItem(item: CartItem) {
    this.productService.removeFromCart(item.product.id);
    this.showToast('Đã xóa sản phẩm khỏi giỏ hàng', 'success');
  }

  async clearCart() {
    const alert = await this.alertController.create({
      header: 'Xác nhận',
      message: 'Bạn có muốn xóa toàn bộ giỏ hàng?',
      buttons: [
        {
          text: 'Hủy',
          role: 'cancel'
        },
        {
          text: 'Xóa tất cả',
          role: 'destructive',
          handler: () => {
            this.productService.clearCart();
            this.showToast('Đã xóa toàn bộ giỏ hàng', 'success');
          }
        }
      ]
    });
    await alert.present();
  }

  proceedToCheckout() {
    if (!this.isAuthenticated && !this.isGuestMode) {
      this.showLoginPrompt();
      return;
    }
    
    this.showCheckoutForm = true;
    this.showQRPayment = false;
  }

  async showLoginPrompt() {
    const alert = await this.alertController.create({
      header: 'Yêu cầu đăng nhập',
      message: 'Bạn cần đăng nhập hoặc sử dụng chế độ khách để đặt hàng',
      buttons: [
        {
          text: 'Hủy',
          role: 'cancel'
        },
        {
          text: 'Đăng nhập',
          handler: () => {
            this.router.navigate(['/login']);
          }
        }
      ]
    });
    await alert.present();
  }

  cancelCheckout() {
    this.showCheckoutForm = false;
    this.orderNote = '';
    this.showQRPayment = false;
    this.qrCodeUrl = '';
    this.paymentReference = '';
    this.selectedPaymentMethod = 'cod';
  }

  async placeOrder() {
    if (this.isProcessingOrder) {
      return;
    }

    const now = Date.now();
    if (now - this.lastOrderAttemptAt < this.orderThrottleMs) {
      this.showToast('Bạn thao tác quá nhanh, vui lòng chờ giây lát', 'warning');
      return;
    }
    this.lastOrderAttemptAt = now;

    const checkoutError = this.validateCheckoutInput();
    if (checkoutError) {
      this.showToast(checkoutError, 'warning');
      return;
    }

    if (this.cartItems.length === 0) {
      this.showToast('Giỏ hàng trống', 'warning');
      return;
    }

    this.isProcessingOrder = true;

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 700));

      if (this.selectedPaymentMethod === 'bank_transfer') {
        this.prepareBankTransfer();
        this.isProcessingOrder = false;
        return;
      }

      if (!this.isPaymentMethodSupported(this.selectedPaymentMethod)) {
        this.isProcessingOrder = false;
        this.showToast('Phương thức thanh toán này đang tạm khóa. Vui lòng chọn COD hoặc chuyển khoản.', 'warning');
        return;
      }

      await this.finalizeOrder('cod', 'unpaid');
    } catch (error) {
      this.isProcessingOrder = false;
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại';
      this.showToast(errorMessage, 'danger');
    }
  }

  async confirmBankTransferPayment() {
    if (this.isProcessingOrder) {
      return;
    }

    this.isProcessingOrder = true;

    try {
      await this.finalizeOrder('bank_transfer', 'pending', undefined, this.paymentReference);
    } catch (error) {
      this.isProcessingOrder = false;
      const errorMessage = error instanceof Error ? error.message : 'Không thể xác nhận thanh toán';
      this.showToast(errorMessage, 'danger');
    }
  }

  cancelBankTransferPayment() {
    if (this.isProcessingOrder) {
      return;
    }

    this.showQRPayment = false;
    this.qrCodeUrl = '';
    this.paymentReference = '';
    this.showToast('Đã hủy bước thanh toán QR', 'warning');
  }

  private prepareBankTransfer(): void {
    // Validate payment amount
    const amount = this.getTotal();
    if (amount <= 0) {
      this.showToast('Số tiền không hợp lệ. Vui lòng kiểm tra giỏ hàng', 'danger');
      this.isProcessingOrder = false;
      return;
    }

    // Max amount 50 million VND for QR payment
    const MAX_QR_AMOUNT = 50_000_000;
    if (amount > MAX_QR_AMOUNT) {
      this.showToast(`Số tiền vượt quá giới hạn ${MAX_QR_AMOUNT.toLocaleString()}đ. Vui lòng liên hệ hỗ trợ`, 'danger');
      this.isProcessingOrder = false;
      return;
    }

    const now = Date.now();
    this.paymentAmount = amount;
    this.paymentReference = `DL${now}`;

    // Generate and validate QR code
    try {
      this.qrCodeUrl = this.generateBankTransferQrUrl(this.paymentAmount, this.paymentReference);
      if (!this.qrCodeUrl) {
        throw new Error('Không thể tạo mã QR thanh toán');
      }
      this.showQRPayment = true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi tạo mã QR';
      this.showToast(errorMsg, 'danger');
      this.isProcessingOrder = false;
    }
  }

  private generateBankTransferQrUrl(amount: number, reference: string): string {
    // Validate inputs
    if (!amount || amount <= 0) {
      throw new Error('Số tiền không hợp lệ');
    }
    if (!reference || reference.trim().length === 0) {
      throw new Error('Mã tham chiếu không hợp lệ');
    }

    // Validate reference format (alphanumeric only)
    if (!/^[A-Za-z0-9]+$/.test(reference)) {
      throw new Error('Mã tham chiếu chỉ chứa chữ và số');
    }

    const bankId = '970422'; // MB Bank
    const accountNo = '0123456789';
    const accountName = 'NONG SAN DA LAT';

    // Validate bank account credentials
    if (!bankId || !accountNo || !accountName) {
      throw new Error('Thông tin tài khoản ngân hàng không hợp lệ');
    }

    try {
      const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.jpg?amount=${Math.floor(amount)}&addInfo=${encodeURIComponent(reference)}&accountName=${encodeURIComponent(accountName)}`;
      return qrUrl;
    } catch (error) {
      throw new Error('Không thể tạo đường dẫn mã QR');
    }
  }

  private async finalizeOrder(
    paymentMethod: Order['paymentMethod'],
    paymentStatus: Order['paymentStatus'],
    paymentDate?: Date,
    paymentReference?: string,
  ): Promise<void> {
    const order = this.productService.createOrder(
      this.customerName,
      this.customerPhone,
      this.deliveryAddress,
      this.orderNote,
      paymentMethod,
      paymentStatus,
      paymentDate,
      paymentReference,
    );

    this.isProcessingOrder = false;
    this.showCheckoutForm = false;
    this.showQRPayment = false;
    this.qrCodeUrl = '';
    this.paymentReference = '';
    this.orderNote = '';

    const paymentLabel = this.getPaymentMethodLabel(paymentMethod);
    const paymentStatusLabel =
      paymentStatus === 'pending'
        ? 'Đang chờ xác nhận chuyển khoản'
        : paymentStatus === 'paid'
          ? 'Đã thanh toán'
          : 'Chưa thanh toán';

    const alert = await this.alertController.create({
      header: 'Đặt hàng thành công!',
      message: `Mã đơn hàng: ${order.id}<br>Tổng tiền: ${order.total.toLocaleString('vi-VN')}đ<br>Phương thức: ${paymentLabel}<br>Trạng thái thanh toán: ${paymentStatusLabel}<br><br>Cảm ơn bạn đã đặt hàng!`,
      buttons: [
        {
          text: 'Xem đơn hàng',
          handler: () => {
            this.router.navigate(['/orders']);
          }
        },
        {
          text: 'Tiếp tục mua sắm',
          handler: () => {
            this.router.navigate(['/tabs/tab1']);
          }
        }
      ]
    });
    await alert.present();
  }

  private getPaymentMethodLabel(method: Order['paymentMethod']): string {
    const found = this.paymentMethodOptions.find(option => option.value === method);
    return found?.label ?? 'Khác';
  }

  private isPaymentMethodSupported(method: Order['paymentMethod']): boolean {
    const found = this.paymentMethodOptions.find(option => option.value === method);
    return !!found && !found.disabled;
  }

  private validateCheckoutInput(): string | null {
    if (!this.customerName.trim() || !this.customerPhone.trim() || !this.deliveryAddress.trim()) {
      return 'Vui lòng điền đầy đủ thông tin giao hàng';
    }

    if (!/^\d{10,11}$/.test(this.customerPhone.replace(/\s+/g, ''))) {
      return 'Số điện thoại không hợp lệ';
    }

    if (this.deliveryAddress.trim().length < 10) {
      return 'Địa chỉ giao hàng quá ngắn';
    }

    if (!this.isPaymentMethodSupported(this.selectedPaymentMethod)) {
      return 'Phương thức thanh toán đã chọn hiện chưa hỗ trợ';
    }

    return null;
  }

  continueShopping() {
    this.router.navigate(['/tabs/tab1']);
  }

  async showToast(message: string, color: string = 'dark') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

}
