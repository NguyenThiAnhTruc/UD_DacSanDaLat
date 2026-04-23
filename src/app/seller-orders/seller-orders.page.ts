import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular';
import { Order } from '../models/product.model';
import { AuthService } from '../services/auth.service';
import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-seller-orders',
  templateUrl: './seller-orders.page.html',
  styleUrls: ['./seller-orders.page.scss'],
  standalone: false,
})
export class SellerOrdersPage implements OnInit {
  private authService = inject(AuthService);
  private productService = inject(ProductService);
  private router = inject(Router);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);

  orders: Order[] = [];
  filterStatus: string = 'all';
  dashboardRange: 'day' | 'week' | 'month' = 'day';

  readonly statusOptions: { value: string; label: string }[] = [
    { value: 'all', label: 'Tất cả' },
    { value: 'completed_today', label: 'Hôm nay' },
    { value: 'awaiting_payment', label: 'Chờ thanh toán' },
    { value: 'confirmed', label: 'Đã xác nhận' },
    { value: 'processing', label: 'Đang xử lý' },
    { value: 'shipping', label: 'Đang giao' },
    { value: 'delivered', label: 'Đã giao' },
    { value: 'completed', label: 'Hoàn thành' },
    { value: 'cancelled', label: 'Đã hủy' },
  ];

  ngOnInit(): void {
    if (!this.authService.isSeller()) {
      void this.showToast('Bạn không có quyền vào khu vực người bán', 'danger');
      this.router.navigate(['/tabs/tab3']);
      return;
    }
    this.loadOrders();
  }

  ionViewWillEnter(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.orders = this.productService.getAllOrdersForSeller();
  }

  get ordersInDashboardRange(): Order[] {
    const now = new Date();
    const start = new Date(now);

    if (this.dashboardRange === 'day') {
      start.setHours(0, 0, 0, 0);
    } else if (this.dashboardRange === 'week') {
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }

    return this.orders.filter(order => new Date(order.createdAt).getTime() >= start.getTime());
  }

  get dashboardRevenue(): number {
    return this.ordersInDashboardRange
      .filter(order => order.status !== 'cancelled' && order.paymentStatus !== 'failed')
      .reduce((sum, order) => sum + order.total, 0);
  }

  get pendingVerificationCount(): number {
    return this.orders.filter(order =>
      order.paymentMethod === 'bank_transfer' &&
      order.paymentStatus === 'pending' &&
      order.status !== 'cancelled'
    ).length;
  }

  get filteredOrders(): Order[] {
    if (this.filterStatus === 'all') return this.orders;
    if (this.filterStatus === 'completed_today') {
      const todayKey = this.toDateKey(new Date());
      return this.orders.filter(order => {
        if (order.status !== 'completed') {
          return false;
        }
        const completedDate = order.completedAt ?? order.deliveredAt;
        return !!completedDate && this.toDateKey(new Date(completedDate)) === todayKey;
      });
    }
    return this.orders.filter(o => o.status === this.filterStatus);
  }

  get inProgressCount(): number {
    return this.orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;
  }

  get deliveredCount(): number {
    return this.orders.filter(o => o.status === 'completed').length;
  }

  get completedTodayCount(): number {
    const todayKey = this.toDateKey(new Date());
    return this.orders.filter(order => {
      if (order.status !== 'completed') {
        return false;
      }
      const completedDate = order.completedAt ?? order.deliveredAt;
      return !!completedDate && this.toDateKey(new Date(completedDate)) === todayKey;
    }).length;
  }

  get completedByDay(): Array<{ dateKey: string; label: string; count: number }> {
    const grouped = new Map<string, number>();

    this.orders.forEach(order => {
      if (order.status !== 'completed') {
        return;
      }

      const completedDate = order.completedAt ?? order.deliveredAt;
      if (!completedDate) {
        return;
      }

      const dateKey = this.toDateKey(new Date(completedDate));
      grouped.set(dateKey, (grouped.get(dateKey) || 0) + 1);
    });

    return Array.from(grouped.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .slice(0, 7)
      .map(([dateKey, count]) => ({
        dateKey,
        label: this.toDisplayDate(dateKey),
        count,
      }));
  }

  async updateStatus(order: Order): Promise<void> {
    const nextStatus = this.getNextStatus(order.status);
    if (!nextStatus) return;

    const alert = await this.alertController.create({
      header: 'Cập nhật trạng thái',
      message: `Chuyển đơn #${order.orderCode ?? order.id} sang "<strong>${this.getStatusText(nextStatus)}</strong>"?`,
      buttons: [
        { text: 'Hủy', role: 'cancel' },
        {
          text: 'Xác nhận',
          handler: () => {
            const ok = this.productService.updateOrderStatusGlobal(order.id, nextStatus);
            if (ok) {
              this.loadOrders();
              void this.showToast('Đã cập nhật trạng thái đơn hàng', 'success');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async verifyPayment(order: Order): Promise<void> {
    if (order.paymentMethod !== 'bank_transfer' || order.paymentStatus !== 'pending') {
      await this.showToast('Đơn này không ở trạng thái chờ xác thực chuyển khoản', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Xác thực thanh toán',
      message: `Xác thực chuyển khoản cho đơn #${order.orderCode ?? order.id}`,
      inputs: [
        {
          name: 'reference',
          type: 'text',
          placeholder: 'Mã giao dịch/ngân hàng',
        },
        {
          name: 'note',
          type: 'text',
          placeholder: 'Ghi chú xác thực (tuỳ chọn)',
        },
      ],
      buttons: [
        { text: 'Hủy', role: 'cancel' },
        {
          text: 'Xác thực',
          handler: (data: { reference?: string; note?: string }) => {
            const ok = this.productService.verifyOrderPayment(
              order.id,
              data.reference ?? '',
              undefined,
              data.note,
            );
            if (!ok) {
              void this.showToast('Không thể xác thực thanh toán. Vui lòng kiểm tra mã giao dịch.', 'danger');
              return;
            }

            this.loadOrders();
            void this.showToast('Đã xác thực thanh toán thành công', 'success');
          },
        },
      ],
    });

    await alert.present();
  }

  async exportCsv(): Promise<void> {
    const rows = this.filteredOrders;
    if (rows.length === 0) {
      await this.showToast('Không có dữ liệu để export', 'warning');
      return;
    }

    const headers = [
      'MaDon',
      'MaDonHienThi',
      'NgayDat',
      'KhachHang',
      'SoDienThoai',
      'TongTien',
      'TrangThaiDon',
      'PhuongThucThanhToan',
      'TrangThaiThanhToan',
      'MaGiaoDich',
      'ETA',
    ];

    const csvRows = rows.map(order => [
      order.id,
      order.orderCode ?? order.id,
      this.formatDateTime(order.createdAt),
      order.customerName,
      order.customerPhone,
      order.total.toString(),
      this.getStatusText(order.status),
      order.paymentMethod ?? '',
      this.getPaymentStatusText(order.paymentStatus),
      order.paymentReference ?? '',
      order.expectedDeliveryAt ? this.formatDateTime(order.expectedDeliveryAt) : '',
    ]);

    const csvContent = [headers, ...csvRows]
      .map(cols => cols.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `seller-orders-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    await this.showToast('Đã export CSV đơn hàng', 'success');
  }

  getNextStatus(current: Order['status']): Order['status'] | null {
    const flow: Order['status'][] = ['awaiting_payment', 'confirmed', 'processing', 'shipping', 'delivered', 'completed'];
    const idx = flow.indexOf(current);
    if (idx === -1 || idx === flow.length - 1) return null;
    return flow[idx + 1];
  }

  getStatusText(status: string): string {
    const map: Record<string, string> = {
      awaiting_payment: 'Chờ thanh toán',
      confirmed: 'Đã xác nhận',
      processing: 'Đang xử lý',
      shipping: 'Đang giao',
      delivered: 'Đã giao',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
    };
    return map[status] ?? status;
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      awaiting_payment: 'warning',
      confirmed: 'primary',
      processing: 'primary',
      shipping: 'tertiary',
      delivered: 'success',
      completed: 'success',
      cancelled: 'danger',
    };
    return map[status] ?? 'medium';
  }

  getPaymentStatusText(status: Order['paymentStatus']): string {
    const map: Record<Order['paymentStatus'], string> = {
      unpaid: 'Chưa thanh toán',
      pending: 'Chờ xác thực',
      paid: 'Đã thanh toán',
      refunded: 'Đã hoàn tiền',
      failed: 'Thất bại',
    };
    return map[status];
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 2000, color, position: 'bottom' });
    await toast.present();
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toDisplayDate(dateKey: string): string {
    const [year, month, day] = dateKey.split('-');
    return `${day}/${month}/${year}`;
  }

  private formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }
}
