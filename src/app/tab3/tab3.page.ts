import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Order, User } from '../models/product.model';
import { ProductService } from '../services/product.service';
import { AuthService } from '../services/auth.service';
import { FavoritesService } from '../services/favorites.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnInit, OnDestroy {
  private readonly defaultAvatar = 'https://ionicframework.com/docs/img/demos/avatar.svg';
  private productService = inject(ProductService);
  private authService = inject(AuthService);
  private favoritesService = inject(FavoritesService);
  private alertController = inject(AlertController);
  private router = inject(Router);

  orders: Order[] = [];
  private ordersSubscription?: Subscription;
  private userSubscription?: Subscription;
  private favoritesSubscription?: Subscription;
  isGuestMode: boolean = false;
  
  // Loading states
  isLoading: boolean = true;
  isEditing: boolean = false;
  
  // Favorites
  favoriteProductsCount: number = 0;
  isAdmin: boolean = false;
  isSeller: boolean = false;
  roleLabel: string = 'Khách hàng';
  roleColor: 'success' | 'warning' | 'medium' = 'medium';

  userInfo: User = {
    id: '',
    name: 'Khách hàng',
    email: 'guest@dalatfarm.vn',
    phone: '---',
    address: '---',
    avatar: this.defaultAvatar
  };

  ngOnInit() {
    this.loadFavoritesCount();

    this.favoritesSubscription = this.favoritesService.favorites$.subscribe(() => {
      this.loadFavoritesCount();
    });
    
    this.ordersSubscription = this.productService.orders$.subscribe(orders => {
      this.orders = orders;
      setTimeout(() => {
        this.isLoading = false;
      }, 500);
    });

    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userInfo = user;
        this.isGuestMode = false;
        this.isAdmin = user.role === 'admin';
        // Keep this aligned with SellerGuard: seller area is shared for seller/admin.
        this.isSeller = user.role === 'seller' || user.role === 'admin';
        this.setRoleBadge(user.role);
      } else {
        this.isGuestMode = this.authService.isGuestMode();
        this.isAdmin = false;
        this.isSeller = false;
        this.roleLabel = 'Khách';
        this.roleColor = 'medium';
        if (this.isGuestMode) {
          this.userInfo = {
            id: 'GUEST',
            name: 'Khách hàng',
            email: 'guest@dalatfarm.vn',
            phone: '---',
            address: '---',
            avatar: this.defaultAvatar
          };
        }
      }
      setTimeout(() => {
        this.isLoading = false;
      }, 300);
    });
  }

  ionViewWillEnter() {
    // Reload favorites count when tab becomes active
    this.loadFavoritesCount();
  }

  loadFavoritesCount() {
    const favorites = this.favoritesService.getFavoriteIds();
    this.favoriteProductsCount = favorites.length;
  }

  ngOnDestroy() {
    if (this.ordersSubscription) {
      this.ordersSubscription.unsubscribe();
    }
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    if (this.favoritesSubscription) {
      this.favoritesSubscription.unsubscribe();
    }
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'awaiting_payment': 'warning',
      'confirmed': 'primary',
      'processing': 'primary',
      'shipping': 'tertiary',
      'delivered': 'success',
      'completed': 'success',
      'cancelled': 'danger'
    };
    return colors[status] || 'medium';
  }

  getStatusText(status: string): string {
    const texts: { [key: string]: string } = {
      'awaiting_payment': 'Chờ thanh toán',
      'confirmed': 'Đã xác nhận',
      'processing': 'Đang xử lý',
      'shipping': 'Đang giao',
      'delivered': 'Đã giao',
      'completed': 'Hoàn thành',
      'cancelled': 'Đã hủy'
    };
    return texts[status] || status;
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'awaiting_payment': 'cash-outline',
      'confirmed': 'checkmark-done-outline',
      'processing': 'bicycle-outline',
      'shipping': 'car-outline',
      'delivered': 'checkmark-circle-outline',
      'completed': 'checkmark-done-circle-outline',
      'cancelled': 'close-circle-outline'
    };
    return icons[status] || 'ellipse-outline';
  }

  async viewOrderDetails(order: Order) {
    const itemsList = order.items
      .map(item => `${this.escapeHtml(item.product.name)} x${item.quantity}`)
      .join('<br>');

    const noteHtml = order.orderNote
      ? `<strong>Ghi chú:</strong> ${this.escapeHtml(order.orderNote)}<br><br>`
      : '';

    const alert = await this.alertController.create({
      header: `Đơn hàng #${order.id}`,
      message: `
        <strong>Sản phẩm:</strong><br>
        ${itemsList}<br><br>
        <strong>Khách hàng:</strong> ${this.escapeHtml(order.customerName)}<br>
        <strong>SĐT:</strong> ${this.escapeHtml(order.customerPhone)}<br>
        <strong>Địa chỉ:</strong> ${this.escapeHtml(order.deliveryAddress)}<br><br>
        ${noteHtml}<strong>Tổng tiền:</strong> ${order.total.toLocaleString('vi-VN')}đ<br>
        <strong>Trạng thái:</strong> ${this.getStatusText(order.status)}
      `,
      buttons: ['OK']
    });

    await alert.present();
  }

  async editProfile() {
    this.router.navigate(['/edit-profile']);
  }

  viewFavorites() {
    this.router.navigate(['/favorites']);
  }

  openStockHistory() {
    this.router.navigate(['/admin/stock-history']);
  }

  openStockManagement() {
    this.router.navigate(['/admin/stock-management']);
  }

  openSellerProducts() {
    this.router.navigate(['/seller/products']);
  }

  openSellerOrders() {
    this.router.navigate(['/seller/orders']);
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Đăng xuất',
      message: 'Bạn có chắc muốn đăng xuất?',
      buttons: [
        {
          text: 'Hủy',
          role: 'cancel'
        },
        {
          text: 'Đăng xuất',
          role: 'destructive',
          handler: async () => {
            await this.authService.logout();
            await this.router.navigate(['/login'], { replaceUrl: true });
          }
        }
      ]
    });

    await alert.present();
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  onAvatarLoadError(): void {
    if (this.userInfo.avatar !== this.defaultAvatar) {
      this.userInfo = {
        ...this.userInfo,
        avatar: this.defaultAvatar,
      };
    }
  }

  private setRoleBadge(role?: User['role']): void {
    if (role === 'admin') {
      this.roleLabel = 'Admin';
      this.roleColor = 'success';
      return;
    }

    if (role === 'seller') {
      this.roleLabel = 'Người bán';
      this.roleColor = 'warning';
      return;
    }

    this.roleLabel = 'Khách hàng';
    this.roleColor = 'medium';
  }
}
