import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { OrderService } from '../services/order.service';
import { Order } from '../models/product.model';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.page.html',
  styleUrls: ['./orders.page.scss'],
  standalone: false
})
export class OrdersPage implements OnInit, OnDestroy {
  private orderService = inject(OrderService);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private router = inject(Router);

  orders: Order[] = [];
  filteredOrders: Order[] = [];
  selectedFilter: Order['status'] | 'all' = 'all';
  private ordersSubscription?: Subscription;
  private etaRefreshTimer?: ReturnType<typeof setInterval>;
  nowEpochMs = Date.now();

  statusLabels = {
    awaiting_payment: 'Chờ thanh toán',
    confirmed: 'Đã xác nhận',
    processing: 'Đang xử lý',
    shipping: 'Đang giao',
    delivered: 'Đã giao',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy'
  };

  statusColors = {
    awaiting_payment: 'warning',
    confirmed: 'primary',
    processing: 'primary',
    shipping: 'tertiary',
    delivered: 'success',
    completed: 'success',
    cancelled: 'danger'
  };

  paymentStatusLabels: Record<Order['paymentStatus'], string> = {
    unpaid: 'Chưa thanh toán',
    pending: 'Chờ xác thực chuyển khoản',
    paid: 'Đã thanh toán',
    refunded: 'Đã hoàn tiền',
    failed: 'Thanh toán thất bại',
  };

  ngOnInit() {
    this.loadOrders();
    this.etaRefreshTimer = setInterval(() => {
      this.nowEpochMs = Date.now();
    }, 30000);
  }

  ngOnDestroy() {
    this.ordersSubscription?.unsubscribe();
    if (this.etaRefreshTimer) {
      clearInterval(this.etaRefreshTimer);
    }
  }

  ionViewWillEnter() {
    this.loadOrders();
  }

  loadOrders() {
    if (this.ordersSubscription) {
      return;
    }

    this.ordersSubscription = this.orderService.orders$.subscribe(orders => {
      this.orders = [...orders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      this.applyFilter();
    });
  }

  applyFilter() {
    if (this.selectedFilter === 'all') {
      this.filteredOrders = this.orders;
    } else {
      this.filteredOrders = this.orders.filter(order => order.status === this.selectedFilter);
    }
  }

  filterOrders(status: Order['status'] | 'all') {
    this.selectedFilter = status;
    this.applyFilter();
  }

  async cancelOrder(order: Order) {
    if (order.status !== 'awaiting_payment' && order.status !== 'confirmed' && order.status !== 'processing' && order.status !== 'shipping') {
      const toast = await this.toastController.create({
        message: 'Không thể hủy đơn hàng này',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
      return;
    }

    const alert = await this.alertController.create({
      header: 'Xác nhận hủy đơn',
      message: `Bạn có chắc muốn hủy đơn hàng #${order.id}?`,
      buttons: [
        {
          text: 'Không',
          role: 'cancel'
        },
        {
          text: 'Hủy đơn',
          handler: async () => {
            const success = this.orderService.cancelOrder(order.id);
            if (success) {
              const toast = await this.toastController.create({
                message: 'Đã hủy đơn hàng thành công',
                duration: 2000,
                color: 'success'
              });
              await toast.present();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async viewOrderDetail(order: Order) {
    const alert = await this.alertController.create({
      header: `Chi tiết đơn hàng #${order.id}`,
      message: this.getOrderDetailHtml(order),
      cssClass: 'order-detail-alert',
      buttons: ['Đóng']
    });

    await alert.present();
  }

  private getOrderDetailHtml(order: Order): string {
    let itemsHtml = order.items.map(item =>
      `<div style="display: flex; justify-content: space-between; padding: 5px 0;">
        <span>${this.escapeHtml(item.product.name)} x${item.quantity}</span>
        <span>${this.formatPrice(item.product.price * item.quantity)}</span>
      </div>`
    ).join('');

    const noteHtml = order.orderNote
      ? `<p><strong>Ghi chú:</strong> ${this.escapeHtml(order.orderNote)}</p>`
      : '';

    return `
      <div style="text-align: left;">
        <p><strong>Người nhận:</strong> ${this.escapeHtml(order.customerName)}</p>
        <p><strong>SĐT:</strong> ${this.escapeHtml(order.customerPhone)}</p>
        <p><strong>Địa chỉ:</strong> ${this.escapeHtml(order.deliveryAddress)}</p>
        <p><strong>Ngày đặt:</strong> ${this.formatDate(order.createdAt)}</p>
        ${noteHtml}
        <hr>
        <p><strong>Sản phẩm:</strong></p>
        ${itemsHtml}
        <hr>
        <p style="font-size: 18px;"><strong>Tổng cộng:</strong> ${this.formatPrice(order.total)}</p>
      </div>
    `;
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }

  formatDate(date: Date): string {
    // Fix: date is already a Date object, no need to wrap with new Date()
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  getTotalItems(order: Order): number {
    return order.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  getOrderStatusIcon(status: Order['status']): string {
    const icons = {
      awaiting_payment: 'cash-outline',
      confirmed: 'checkmark-done-outline',
      processing: 'car-outline',
      shipping: 'bicycle-outline',
      delivered: 'checkmark-circle-outline',
      completed: 'checkmark-done-circle-outline',
      cancelled: 'close-circle-outline'
    };
    return icons[status];
  }

  getTimelineSteps(order: Order): Array<{ key: Order['status']; label: string; state: 'done' | 'current' | 'todo' | 'cancelled' }> {
    const flow: Order['status'][] = ['awaiting_payment', 'confirmed', 'processing', 'shipping', 'delivered', 'completed'];

    if (order.status === 'cancelled') {
      return flow.map(step => ({
        key: step,
        label: this.statusLabels[step],
        state: step === 'awaiting_payment' ? 'done' : 'cancelled',
      }));
    }

    const currentIndex = flow.indexOf(order.status);
    return flow.map((step, index) => ({
      key: step,
      label: this.statusLabels[step],
      state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo',
    }));
  }

  getEtaText(order: Order): string {
    if (order.status === 'cancelled') {
      return 'Đơn đã hủy';
    }

    if (order.status === 'completed' || order.status === 'delivered') {
      return 'Đã giao thành công';
    }

    if (!order.expectedDeliveryAt) {
      return 'Đang cập nhật ETA';
    }

    const diffMs = new Date(order.expectedDeliveryAt).getTime() - this.nowEpochMs;
    if (diffMs <= 0) {
      return 'Dự kiến giao: trong hôm nay';
    }

    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);

    if (days > 0) {
      return `Dự kiến giao sau ${days} ngày ${hours} giờ`;
    }

    return `Dự kiến giao sau ${Math.max(1, hours)} giờ`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
