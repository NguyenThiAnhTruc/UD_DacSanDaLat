import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { InventoryAuditRow, ProductService } from '../services/product.service';
import { Product } from '../models/product.model';

@Component({
  selector: 'app-admin-stock-history',
  templateUrl: './admin-stock-history.page.html',
  styleUrls: ['./admin-stock-history.page.scss'],
  standalone: false,
})
export class AdminStockHistoryPage implements OnInit {
  private authService = inject(AuthService);
  private productService = inject(ProductService);
  private router = inject(Router);
  private toastController = inject(ToastController);

  products: Product[] = [];
  filteredRows: InventoryAuditRow[] = [];
  selectedProductId: string = 'all';
  fromDate: string = '';
  toDate: string = '';
  selectedSection: 'all' | 'stock' | 'trace' = 'all';
  selectedMovementType: string = 'all';
  searchQuery: string = '';
  showAnalytics = false;
  currentRowPage = 1;
  readonly rowsPageSize = 30;
  isAdmin: boolean = false;

  readonly movementTypes = [
    { value: 'all', label: 'Tất cả loại' },
    { value: 'sale', label: 'Bán hàng' },
    { value: 'restock', label: 'Nhập hàng' },
    { value: 'reserve', label: 'Giữ hàng' },
    { value: 'cancel_refund', label: 'Hoàn kho' },
    { value: 'manual_adjustment', label: 'Điều chỉnh' },
  ];

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    if (!this.isAdmin) {
      void this.showToast('Bạn không có quyền truy cập khu vực quản trị kho', 'danger');
      this.router.navigate(['/tabs/tab3']);
      return;
    }

    this.products = this.productService.getProducts();
    this.applyFilters();
  }

  applyFilters(): void {
    const fromTime = this.fromDate ? new Date(this.fromDate).setHours(0, 0, 0, 0) : null;
    const toTime = this.toDate ? new Date(this.toDate).setHours(23, 59, 59, 999) : null;
    const searchNorm = this.normalizeSearchText(this.searchQuery);

    this.filteredRows = this.productService.getInventoryAuditRows().filter(row => {
      if (this.selectedProductId !== 'all' && row.productId !== Number(this.selectedProductId)) {
        return false;
      }

      // Search by product name
      if (searchNorm && !this.normalizeSearchText(row.productName).includes(searchNorm)) {
        return false;
      }

      if (this.selectedSection === 'stock' && !row.movementCreatedAt) {
        return false;
      }

      if (this.selectedSection === 'trace' && !row.traceOccurredAt) {
        return false;
      }

      // Filter by movement type
      if (this.selectedMovementType !== 'all' && row.movementType !== this.selectedMovementType) {
        return false;
      }

      const rowTime = row.movementCreatedAt?.getTime() ?? row.traceOccurredAt?.getTime();
      if (!rowTime) {
        return false;
      }

      if (fromTime !== null && rowTime < fromTime) {
        return false;
      }

      if (toTime !== null && rowTime > toTime) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      const bTime = b.movementCreatedAt?.getTime() ?? b.traceOccurredAt?.getTime() ?? 0;
      const aTime = a.movementCreatedAt?.getTime() ?? a.traceOccurredAt?.getTime() ?? 0;
      return bTime - aTime;
    });

    this.currentRowPage = 1;
  }

  resetFilters(): void {
    this.selectedProductId = 'all';
    this.fromDate = '';
    this.toDate = '';
    this.selectedSection = 'all';
    this.selectedMovementType = 'all';
    this.searchQuery = '';
    this.applyFilters();
  }

  toggleAnalytics(): void {
    this.showAnalytics = !this.showAnalytics;
  }

  get visibleRows(): InventoryAuditRow[] {
    return this.filteredRows.slice(0, this.currentRowPage * this.rowsPageSize);
  }

  get canLoadMoreRows(): boolean {
    return this.visibleRows.length < this.filteredRows.length;
  }

  loadMoreRows(): void {
    this.currentRowPage += 1;
  }

  get totalMovements(): number {
    return this.filteredRows.length;
  }

  get totalQuantityIn(): number {
    return this.filteredRows
      .filter(r => r.movementCreatedAt && ['restock', 'cancel_refund'].includes(r.movementType ?? ''))
      .reduce((sum, r) => sum + (r.movementQuantity ?? 0), 0);
  }

  get totalQuantityOut(): number {
    return this.filteredRows
      .filter(r => r.movementCreatedAt && ['sale', 'reserve'].includes(r.movementType ?? ''))
      .reduce((sum, r) => sum + Math.abs(r.movementQuantity ?? 0), 0);
  }

  get averageQuantityPerMovement(): number {
    const stockMovements = this.filteredRows.filter(r => r.movementCreatedAt);
    if (stockMovements.length === 0) return 0;
    const totalQty = stockMovements.reduce((sum, r) => sum + Math.abs(r.movementQuantity ?? 0), 0);
    return totalQty / stockMovements.length;
  }

  get movementTypeStats() {
    const stats: Record<string, number> = {};
    this.filteredRows.forEach(r => {
      if (r.movementType) {
        stats[r.movementType] = (stats[r.movementType] ?? 0) + 1;
      }
    });
    return stats;
  }

  private normalizeSearchText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  async exportCsv(): Promise<void> {
    if (this.filteredRows.length === 0) {
      await this.showToast('Không có dữ liệu để export', 'warning');
      return;
    }

    const headers = [
      'section',
      'product_id',
      'product_name',
      'category',
      'current_stock',
      'movement_type',
      'movement_quantity',
      'before_stock',
      'after_stock',
      'movement_note',
      'movement_actor_user_id',
      'movement_actor_name',
      'movement_created_at',
      'trace_stage',
      'trace_description',
      'trace_occurred_at',
    ];

    const rows = this.filteredRows.map(row => [
      row.movementCreatedAt ? 'stock_movement' : 'traceability',
      row.productId,
      row.productName,
      row.category,
      row.currentStock,
      row.movementType ?? '',
      row.movementQuantity ?? '',
      row.beforeStock ?? '',
      row.afterStock ?? '',
      row.movementNote ?? '',
      row.movementActorUserId ?? '',
      row.movementActorName ?? '',
      row.movementCreatedAt ? this.formatDateTime(row.movementCreatedAt) : '',
      row.traceStage ?? '',
      row.traceDescription ?? '',
      row.traceOccurredAt ? this.formatDateTime(row.traceOccurredAt) : '',
    ]);

    const csvContent = [headers, ...rows]
      .map(columns => columns.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-history-${new Date().getTime()}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    await this.showToast('Đã export CSV thành công', 'success');
  }

  getRowDate(row: InventoryAuditRow): string {
    return this.formatDateTime(row.movementCreatedAt ?? row.traceOccurredAt ?? new Date());
  }

  getRowTitle(row: InventoryAuditRow): string {
    if (row.movementCreatedAt) {
      return `${this.getMovementLabel(row.movementType)} ${row.movementQuantity && row.movementQuantity > 0 ? '+' : ''}${row.movementQuantity ?? 0}`;
    }

    return row.traceStage ?? 'Truy xuất nguồn gốc';
  }

  getRowDescription(row: InventoryAuditRow): string {
    if (row.movementCreatedAt) {
      const actor = row.movementActorName ? ` • Người thao tác: ${row.movementActorName}` : '';
      return `${row.beforeStock ?? 0} -> ${row.afterStock ?? 0}${row.movementNote ? ' • ' + row.movementNote : ''}${actor}`;
    }

    return row.traceDescription ?? '';
  }

  getMovementLabel(type?: string | InventoryAuditRow['movementType']): string {
    const labels: Record<string, string> = {
      sale: 'Bán hàng',
      reserve: 'Giữ hàng',
      restock: 'Nhập hàng',
      cancel_refund: 'Hoàn kho',
      manual_adjustment: 'Điều chỉnh',
    };

    return type ? labels[type] ?? 'Biến động kho' : 'Biến động kho';
  }

  getRowColor(row: InventoryAuditRow): string {
    if (!row.movementCreatedAt) {
      return 'primary';
    }

    if (row.movementType === 'sale') {
      return 'danger';
    }

    if (row.movementType === 'restock') {
      return 'success';
    }

    if (row.movementType === 'cancel_refund') {
      return 'tertiary';
    }

    return 'warning';
  }

  goToStockManagement(): void {
    this.router.navigate(['/admin/stock-management']);
  }

  private formatDateTime(date: Date): string {
    // Fix: date is already a Date object, no need to wrap with new Date()
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1800,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
