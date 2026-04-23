import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { CartItem } from '../models/product.model';
import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private modalController = inject(ModalController);
  private router = inject(Router);

  cartItems: CartItem[] = [];
  total: number = 0;
  private cartSubscription?: Subscription;

  // Loading states
  isLoading: boolean = false;
  isCheckingOut: boolean = false;
  isUpdatingCart: boolean = false;

  // Checkout form
  customerName: string = '';
  customerPhone: string = '';
  deliveryAddress: string = '';
  
  // Form validation
  nameError: string = '';
  phoneError: string = '';
  addressError: string = '';
  
  // QR Code payment
  showQRPayment: boolean = false;
  qrCodeUrl: string = '';
  paymentAmount: number = 0;

  ngOnInit() {
    this.cartSubscription = this.productService.cart$.subscribe(cart => {
      this.cartItems = cart;
      this.calculateTotal();
    });
  }

  ngOnDestroy() {
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }

  calculateTotal() {
    this.total = this.productService.getCartTotal();
  }

  increaseQuantity(item: CartItem) {
    if (this.isUpdatingCart) return;

    const availableStock = this.productService.getAvailableStockByProductId(item.product.id);
    if (item.quantity < availableStock) {
      this.isUpdatingCart = true;
      setTimeout(() => {
        this.productService.updateCartItemQuantity(item.product.id, item.quantity + 1);
        this.isUpdatingCart = false;
      }, 200);
    } else {
      this.showToast('Số lượng vượt quá tồn kho', 'warning');
    }
  }

  decreaseQuantity(item: CartItem) {
    if (this.isUpdatingCart) return;
    
    if (item.quantity > 1) {
      this.isUpdatingCart = true;
      setTimeout(() => {
        this.productService.updateCartItemQuantity(item.product.id, item.quantity - 1);
        this.isUpdatingCart = false;
      }, 200);
    } else {
      this.confirmRemoveItem(item);
    }
  }

  async confirmRemoveItem(item: CartItem) {
    const alert = await this.alertController.create({
      header: 'Xóa sản phẩm',
      message: `Bạn có chắc muốn xóa ${item.product.name} khỏi giỏ hàng?`,
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
    this.showToast(`Đã xóa ${item.product.name}`, 'success');
  }

  async clearCart() {
    const alert = await this.alertController.create({
      header: 'Xóa giỏ hàng',
      message: 'Bạn có chắc muốn xóa tất cả sản phẩm?',
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
            this.showToast('Giỏ hàng đã được xóa', 'success');
          }
        }
      ]
    });

    await alert.present();
  }

  async checkout() {
    // Clear previous errors
    this.nameError = '';
    this.phoneError = '';
    this.addressError = '';

    if (this.cartItems.length === 0) {
      this.showToast('Giỏ hàng trống', 'warning');
      return;
    }

    // Validate all fields
    let hasError = false;

    if (!this.customerName || this.customerName.trim().length < 2) {
      this.nameError = 'Tên phải có ít nhất 2 ký tự';
      hasError = true;
    }

    if (!this.customerPhone) {
      this.phoneError = 'Vui lòng nhập số điện thoại';
      hasError = true;
    } else if (!this.isValidPhone(this.customerPhone)) {
      this.phoneError = 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)';
      hasError = true;
    }

    if (!this.deliveryAddress || this.deliveryAddress.trim().length < 10) {
      this.addressError = 'Địa chỉ phải chi tiết hơn (ít nhất 10 ký tự)';
      hasError = true;
    }

    if (hasError) {
      this.showToast('Vui lòng kiểm tra lại thông tin', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Xác nhận đặt hàng',
      message: `Tổng tiền: ${this.total.toLocaleString('vi-VN')}đ<br>Bạn có chắc muốn đặt hàng?`,
      buttons: [
        {
          text: 'Hủy',
          role: 'cancel'
        },
        {
          text: 'Đặt hàng',
          handler: () => {
            this.completeCheckout();
          }
        }
      ]
    });

    await alert.present();
  }

  async completeCheckout() {
    this.isCheckingOut = true;
    
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate QR Code for payment
      this.paymentAmount = this.total;
      this.generateQRCode();
      this.showQRPayment = true;
    } catch (error) {
      this.showToast('Có lỗi xảy ra. Vui lòng thử lại', 'danger');
    } finally {
      this.isCheckingOut = false;
    }
  }

  generateQRCode() {
    // Generate VietQR format (for Vietnamese banking)
    // Format: Bank ID|Account Number|Amount|Description
    const bankInfo = {
      bankId: '970422', // MB Bank
      accountNo: '0123456789',
      accountName: 'NONG SAN DA LAT',
      amount: this.total,
      description: `DonHang${Date.now()}`
    };

    // Using QR API service to generate QR code image
    const qrContent = `2|99|${bankInfo.accountNo}|${bankInfo.accountName}|${bankInfo.amount}|${bankInfo.description}|0|0|${this.total}`;
    
    // Using API to generate QR code
    // Popular Vietnamese QR services: api.vietqr.io
    this.qrCodeUrl = `https://img.vietqr.io/image/${bankInfo.bankId}-${bankInfo.accountNo}-compact2.jpg?amount=${this.total}&addInfo=${encodeURIComponent(bankInfo.description)}&accountName=${encodeURIComponent(bankInfo.accountName)}`;
  }

  async confirmPayment() {
    const alert = await this.alertController.create({
      header: 'Xác nhận thanh toán',
      message: 'Bạn đã hoàn tất thanh toán?',
      buttons: [
        {
          text: 'Chưa',
          role: 'cancel'
        },
        {
          text: 'Đã thanh toán',
          handler: () => {
            this.finalizeOrder();
          }
        }
      ]
    });

    await alert.present();
  }

  async finalizeOrder() {
    try {
      this.productService.createOrder(
        this.customerName,
        this.customerPhone,
        this.deliveryAddress,
        '',
        'bank_transfer',
        'paid',
        new Date()
      );

      await this.showToast('Đặt hàng thành công! Đơn hàng đang được xử lý.', 'success');

      // Reset form and QR
      this.customerName = '';
      this.customerPhone = '';
      this.deliveryAddress = '';
      this.showQRPayment = false;

      // Navigate to orders page to view order
      this.router.navigate(['/orders']);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại';
      await this.showToast(errorMessage, 'danger');
    }
  }

  cancelPayment() {
    this.showQRPayment = false;
  }

  async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    toast.present();
  }

  continueShopping() {
    this.router.navigate(['/tabs/tab1']);
  }

  // Validation helper
  private isValidPhone(phone: string): boolean {
    // Vietnamese phone number: starts with 0, 10 digits
    const phoneRegex = /^0\d{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }
}
