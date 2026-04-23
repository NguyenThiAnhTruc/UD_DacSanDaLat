import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Order, Product } from '../models/product.model';
import { AuthService } from '../services/auth.service';
import { CloudinaryImageStorageService } from '../services/cloudinary-image-storage.service';
import { ProductImageMapEntry, ProductService, SmartStockAlert } from '../services/product.service';

@Component({
  selector: 'app-seller-products',
  templateUrl: './seller-products.page.html',
  styleUrls: ['./seller-products.page.scss'],
  standalone: false,
})
export class SellerProductsPage implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private productService = inject(ProductService);
  private imageStorageService = inject(CloudinaryImageStorageService);
  private router = inject(Router);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);

  products: Product[] = [];
  showAddForm = false;
  isSubmitting = false;
  isImportingImages = false;

  // Form thêm sản phẩm
  newName = '';
  newPrice = 0;
  newCategory = '';
  newUnit = 'kg';
  newDescription = '';
  newOrigin = 'Đà Lạt, Lâm Đồng';
  newImage = '';

  readonly categories = ['Trái cây', 'Rau củ', 'Cà phê', 'Trà', 'Sữa', 'Hoa', 'Thực phẩm', 'Khác'];
  readonly units = ['kg', 'bó', 'chai', 'hộp', 'gói', 'cái'];
  
  // Edit mode
  editingProductId: number | null = null;
  editName = '';
  editPriceValue = 0;
  editCategory = '';
  editUnit = '';
  editDescription = '';
  editOrigin = '';
  editImage = '';

  readonly categoryKeywords: Record<string, string[]> = {
    'Trái cây': ['trai cay', 'ngot', 'tuoi', 'vitamin'],
    'Rau củ': ['rau', 'cu', 'tuoi', 'gion', 'chat xo'],
    'Cà phê': ['ca phe', 'rang', 'thom', 'dam'],
    'Trà': ['tra', 'huong', 'thanh', 'hau vi'],
    'Sữa': ['sua', 'tuoi', 'nguyen chat', 'dinh duong'],
    'Hoa': ['hoa', 'tuoi', 'mau', 'huong'],
    'Thực phẩm': ['thuc pham', 'an toan', 'chat luong', 'nguyen chat'],
    'Khác': [],
  };

  // Filter & Search
  searchQuery = '';
  filterCategory = '';
  filterPriceMin = 0;
  filterPriceMax = 10000000;
  filterStockStatus = 'all'; // all, in-stock, low-stock, out-of-stock
  currentPage = 1;
  readonly pageSize = 12;

  readonly filterOptions = {
    stockStatus: [
      { value: 'all', label: 'Tất cả' },
      { value: 'in-stock', label: 'Còn hàng' },
      { value: 'low-stock', label: 'Sắp hết' },
      { value: 'out-of-stock', label: 'Hết hàng' },
    ],
  };
  private productSaveErrorSubscription?: Subscription;
  private productsSubscription?: Subscription;
  private lastShownProductSaveError: string | null = null;

  ngOnInit(): void {
    if (!this.authService.isSeller()) {
      void this.showToast('Bạn không có quyền vào khu vực người bán', 'danger');
      this.router.navigate(['/tabs/tab3']);
      return;
    }

    this.productSaveErrorSubscription = this.productService.productSaveError$.subscribe(errorMessage => {
      if (!errorMessage) {
        this.lastShownProductSaveError = null;
        return;
      }

      if (this.lastShownProductSaveError === errorMessage) {
        return;
      }

      this.lastShownProductSaveError = errorMessage;
      void this.showToast(`Lưu sản phẩm thất bại: ${errorMessage}`, 'danger');
    });

    this.productsSubscription = this.productService.products$.subscribe(products => {
      this.products = products;
      this.currentPage = 1;
    });

    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.productsSubscription?.unsubscribe();
    this.productSaveErrorSubscription?.unsubscribe();
  }

  // Get filtered products
  get filteredProducts(): Product[] {
    let result = [...this.products];

    // Search by name
    if (this.searchQuery.trim()) {
      const query = this.normalizeSearchText(this.searchQuery);
      result = result.filter(p => this.normalizeSearchText(p.name).includes(query));
    }

    // Filter by category
    if (this.filterCategory) {
      result = result.filter(p => p.category === this.filterCategory);
    }

    // Filter by price range
    result = result.filter(p => p.price >= this.filterPriceMin && p.price <= this.filterPriceMax);

    // Filter by stock status
    if (this.filterStockStatus !== 'all') {
      result = result.filter(p => {
        if (this.filterStockStatus === 'in-stock') return p.stock > 10;
        if (this.filterStockStatus === 'low-stock') return p.stock > 0 && p.stock <= 10;
        if (this.filterStockStatus === 'out-of-stock') return p.stock === 0;
        return true;
      });
    }

    return result;
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.filterCategory = '';
    this.filterPriceMin = 0;
    this.filterPriceMax = 10000000;
    this.filterStockStatus = 'all';
    this.currentPage = 1;
  }

  onFiltersChanged(): void {
    this.currentPage = 1;
  }

  get visibleProducts(): Product[] {
    return this.filteredProducts.slice(0, this.currentPage * this.pageSize);
  }

  get canLoadMoreProducts(): boolean {
    return this.visibleProducts.length < this.filteredProducts.length;
  }

  get smartStockAlerts(): SmartStockAlert[] {
    return this.productService.getSmartStockAlerts();
  }

  loadMoreProducts(): void {
    this.currentPage += 1;
  }

  getStockBadgeColor(product: Product): string {
    if (product.stock <= 0) {
      return 'danger';
    }

    const threshold = Math.max(1, product.inventory?.lowStockThreshold ?? 5);
    return product.stock <= threshold ? 'warning' : 'success';
  }

  // Bulk edit mode
  bulkEditMode = false;
  selectedProductIds = new Set<number>();
  bulkEditField: 'price' | 'category' | 'status' | null = null;
  bulkEditValue: string | number = '';

  toggleBulkEditMode(): void {
    this.bulkEditMode = !this.bulkEditMode;
    if (!this.bulkEditMode) {
      this.selectedProductIds.clear();
      this.bulkEditField = null;
      this.bulkEditValue = '';
    }
  }

  toggleProductSelection(productId: number): void {
    if (this.selectedProductIds.has(productId)) {
      this.selectedProductIds.delete(productId);
    } else {
      this.selectedProductIds.add(productId);
    }
  }

  selectAllFiltered(): void {
    this.filteredProducts.forEach(p => this.selectedProductIds.add(p.id));
  }

  clearSelection(): void {
    this.selectedProductIds.clear();
  }

  async applyBulkEdit(): Promise<void> {
    if (this.selectedProductIds.size === 0 || !this.bulkEditField) {
      await this.showToast('Vui lòng chọn sản phẩm và trường cần sửa', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Xác nhận',
      message: `Bạn chắc chắn muốn sửa ${this.selectedProductIds.size} sản phẩm?`,
      buttons: [
        { text: 'Hủy', role: 'cancel' },
        {
          text: 'Xác nhận',
          handler: () => {
            this.executeBulkEdit();
          },
        },
      ],
    });
    await alert.present();
  }

  private executeBulkEdit(): void {
    const selectedProducts = this.products.filter(p => this.selectedProductIds.has(p.id));

    selectedProducts.forEach(product => {
      const updated = { ...product };
      
      if (this.bulkEditField === 'price') {
        updated.price = Number(this.bulkEditValue);
      } else if (this.bulkEditField === 'category') {
        updated.category = String(this.bulkEditValue);
      } else if (this.bulkEditField === 'status') {
        // Status: 'active', 'inactive', 'out-of-stock'
        updated.status = String(this.bulkEditValue) as any;
      }

      this.productService.updateProduct(updated);
    });

    this.loadProducts();
    this.selectedProductIds.clear();
    this.bulkEditField = null;
    this.bulkEditValue = '';
    void this.showToast(`Đã cập nhật ${selectedProducts.length} sản phẩm`, 'success');
  }

  get selectedCount(): number {
    return this.selectedProductIds.size;
  }

  // Analytics
  showAnalytics = false;

  analyticsTimeRange: '7d' | '30d' | 'quarter' = '30d';
  analyticsOrderStatusFilter: 'all' | 'delivered' | 'completed' | 'delivered_completed' = 'delivered_completed';

  readonly analyticsTimeRangeOptions: Array<{ value: '7d' | '30d' | 'quarter'; label: string }> = [
    { value: '7d', label: '7 ngày' },
    { value: '30d', label: '30 ngày' },
    { value: 'quarter', label: 'Quý này' },
  ];

  readonly analyticsOrderStatusOptions: Array<{
    value: 'all' | 'delivered' | 'completed' | 'delivered_completed';
    label: string;
  }> = [
    { value: 'delivered_completed', label: 'Đã giao + Hoàn tất' },
    { value: 'delivered', label: 'Đã giao' },
    { value: 'completed', label: 'Hoàn tất' },
    { value: 'all', label: 'Tất cả (trừ hủy)' },
  ];

  get analyticsOrderStatusLabel(): string {
    if (this.analyticsOrderStatusFilter === 'delivered') {
      return 'đơn đã giao';
    }

    if (this.analyticsOrderStatusFilter === 'completed') {
      return 'đơn hoàn tất';
    }

    if (this.analyticsOrderStatusFilter === 'all') {
      return 'tất cả đơn hợp lệ';
    }

    return 'đơn đã giao + hoàn tất';
  }

  get analyticsTimeRangeLabel(): string {
    if (this.analyticsTimeRange === '7d') {
      return '7 ngày gần nhất';
    }

    if (this.analyticsTimeRange === 'quarter') {
      return 'quý hiện tại';
    }

    return '30 ngày gần nhất';
  }

  onAnalyticsTimeRangeChanged(value: unknown): void {
    if (value === '7d' || value === '30d' || value === 'quarter') {
      this.analyticsTimeRange = value;
    }
  }

  onAnalyticsOrderStatusChanged(value: unknown): void {
    if (value === 'all' || value === 'delivered' || value === 'completed' || value === 'delivered_completed') {
      this.analyticsOrderStatusFilter = value;
    }
  }

  private getAnalyticsOrdersInRange(): Order[] {
    const range = this.getAnalyticsRangeBoundaries();
    return this.productService
      .getAllOrdersForSeller()
      .filter(order => this.isOrderIncludedInAnalytics(order, range.start, range.end));
  }

  private getPreviousPeriodAnalyticsOrders(): Order[] {
    const range = this.getAnalyticsRangeBoundaries();
    return this.productService
      .getAllOrdersForSeller()
      .filter(order => this.isOrderIncludedInAnalytics(order, range.previousStart, range.previousEnd));
  }

  private isOrderIncludedInAnalytics(order: Order, start: Date, end: Date): boolean {
    if (order.status === 'cancelled') {
      return false;
    }

    if (!this.isOrderStatusMatched(order)) {
      return false;
    }

    return order.createdAt >= start && order.createdAt < end;
  }

  private isOrderStatusMatched(order: Order): boolean {
    if (this.analyticsOrderStatusFilter === 'all') {
      return true;
    }

    if (this.analyticsOrderStatusFilter === 'delivered') {
      return order.status === 'delivered';
    }

    if (this.analyticsOrderStatusFilter === 'completed') {
      return order.status === 'completed';
    }

    return order.status === 'delivered' || order.status === 'completed';
  }

  private getAnalyticsRangeBoundaries(): {
    start: Date;
    end: Date;
    previousStart: Date;
    previousEnd: Date;
  } {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);

    let previousStart: Date;
    let previousEnd: Date;

    if (this.analyticsTimeRange === '7d') {
      start.setDate(start.getDate() - 6);

      previousEnd = new Date(start);
      previousStart = new Date(start);
      previousStart.setDate(previousStart.getDate() - 7);

      return {
        start,
        end,
        previousStart,
        previousEnd,
      };
    }

    if (this.analyticsTimeRange === 'quarter') {
      const quarterStartMonth = Math.floor(start.getMonth() / 3) * 3;
      start.setMonth(quarterStartMonth, 1);

      previousEnd = new Date(start);
      previousStart = new Date(start);
      previousStart.setMonth(previousStart.getMonth() - 3, 1);

      return {
        start,
        end,
        previousStart,
        previousEnd,
      };
    }

    start.setDate(start.getDate() - 29);

    previousEnd = new Date(start);
    previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - 30);

    return {
      start,
      end,
      previousStart,
      previousEnd,
    };
  }

  private buildSalesMapFromOrders(orders: Order[]): Map<number, { sales: number; revenue: number }> {
    const salesMap = new Map<number, { sales: number; revenue: number }>();

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const productId = item.product.id;
        const quantity = Math.max(0, Number(item.quantity) || 0);
        const unitPrice = Math.max(0, Number(item.product.price) || 0);

        const existing = salesMap.get(productId) ?? { sales: 0, revenue: 0 };
        existing.sales += quantity;
        existing.revenue += quantity * unitPrice;
        salesMap.set(productId, existing);
      });
    });

    return salesMap;
  }

  private getProductAnalyticsRows(): Array<{
    id: number;
    name: string;
    price: number;
    views: number;
    rating: number;
    sales: number;
    previousSales: number;
    revenue: number;
    previousRevenue: number;
    revenueDeltaPercent: number | null;
    revenueDeltaAbsolute: number;
    conversionRate: number;
    stock: number;
  }> {
    const currentSalesMap = this.buildSalesMapFromOrders(this.getAnalyticsOrdersInRange());
    const previousSalesMap = this.buildSalesMapFromOrders(this.getPreviousPeriodAnalyticsOrders());

    return this.products
      .map((product) => {
        const salesStats = currentSalesMap.get(product.id) ?? { sales: 0, revenue: 0 };
        const previousSalesStats = previousSalesMap.get(product.id) ?? { sales: 0, revenue: 0 };
        const views = product.views ?? 0;
        const conversionRate = views > 0 ? (salesStats.sales / views) * 100 : 0;
        const revenueDeltaAbsolute = salesStats.revenue - previousSalesStats.revenue;

        let revenueDeltaPercent: number | null = 0;
        if (previousSalesStats.revenue > 0) {
          revenueDeltaPercent = (revenueDeltaAbsolute / previousSalesStats.revenue) * 100;
        } else if (salesStats.revenue > 0) {
          revenueDeltaPercent = null;
        }

        return {
          id: product.id,
          name: product.name,
          price: product.price,
          views,
          rating: product.rating ?? 0,
          sales: salesStats.sales,
          previousSales: previousSalesStats.sales,
          revenue: salesStats.revenue,
          previousRevenue: previousSalesStats.revenue,
          revenueDeltaPercent,
          revenueDeltaAbsolute,
          conversionRate,
          stock: product.stock,
        };
      })
      .sort((a, b) => {
        const revenueDiff = b.revenue - a.revenue;
        if (revenueDiff !== 0) {
          return revenueDiff;
        }

        const salesDiff = b.sales - a.sales;
        if (salesDiff !== 0) {
          return salesDiff;
        }

        return b.views - a.views;
      });
  }

  get topProductsByRevenue() {
    return this.getProductAnalyticsRows()
      .filter(p => p.revenue > 0)
      .slice(0, 5);
  }

  get topProductsBySales() {
    return this.getProductAnalyticsRows()
      .filter(p => p.sales > 0)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  }

  get topProductsByViews() {
    return this.getProductAnalyticsRows()
      .filter(p => p.views > 0)
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
  }

  get totalRevenue() {
    return this.productStatisticsRows.reduce((sum, row) => sum + row.revenue, 0);
  }

  get totalSales() {
    return this.productStatisticsRows.reduce((sum, row) => sum + row.sales, 0);
  }

  get totalViews() {
    return this.productStatisticsRows.reduce((sum, row) => sum + row.views, 0);
  }

  get averageOrderValue() {
    return this.totalSales > 0 ? this.totalRevenue / this.totalSales : 0;
  }

  get averageConversionRate() {
    return this.totalViews > 0 ? (this.totalSales / this.totalViews) * 100 : 0;
  }

  get productStatisticsRows(): Array<{
    id: number;
    name: string;
    price: number;
    views: number;
    rating: number;
    sales: number;
    previousSales: number;
    revenue: number;
    previousRevenue: number;
    revenueDeltaPercent: number | null;
    revenueDeltaAbsolute: number;
    conversionRate: number;
    stock: number;
  }> {
    return this.getProductAnalyticsRows().slice(0, 20);
  }

  get productStatisticsTotals(): {
    totalViews: number;
    totalSales: number;
    totalRevenue: number;
    averageConversionRate: number;
  } {
    const totalViews = this.totalViews;
    const totalSales = this.totalSales;
    const totalRevenue = this.totalRevenue;
    const averageConversionRate = this.averageConversionRate;

    return {
      totalViews,
      totalSales,
      totalRevenue,
      averageConversionRate,
    };
  }

  exportStatisticsCsv(): void {
    if (this.productStatisticsRows.length === 0) {
      void this.showToast('Không có dữ liệu để xuất CSV', 'warning');
      return;
    }

    const header = [
      'STT',
      'San pham',
      'Gia (VND)',
      'Luot xem',
      'Da ban',
      'Doanh thu (VND)',
      'Doanh thu ky truoc (VND)',
      'Tang/Giam doanh thu (%)',
      'Chuyen doi (%)',
      'Ton kho',
    ];

    const rows = this.productStatisticsRows.map((row, index) => [
      index + 1,
      row.name,
      row.price,
      row.views,
      row.sales,
      row.revenue,
      row.previousRevenue,
      row.revenueDeltaPercent === null ? 'Moi' : row.revenueDeltaPercent.toFixed(1),
      row.conversionRate.toFixed(1),
      row.stock,
    ]);

    const totals = this.productStatisticsTotals;
    const summaryRow = [
      'Tong cong',
      '',
      '',
      totals.totalViews,
      totals.totalSales,
      totals.totalRevenue,
      '',
      '',
      totals.averageConversionRate.toFixed(1),
      '',
    ];

    const csvLines = [header, ...rows, summaryRow]
      .map(line => line.map(value => this.toCsvCell(value)).join(','))
      .join('\n');

    const filename = `thong-ke-ban-hang-${this.analyticsTimeRange}-${Date.now()}.csv`;
    this.downloadFile(filename, '\uFEFF' + csvLines, 'text/csv;charset=utf-8;');
    void this.showToast('Đã xuất file CSV thống kê bán hàng', 'success');
  }

  exportStatisticsExcel(): void {
    if (this.productStatisticsRows.length === 0) {
      void this.showToast('Không có dữ liệu để xuất Excel', 'warning');
      return;
    }

    const xlsx = this.getSheetJs();
    if (!xlsx) {
      void this.showToast('Chưa tải được thư viện xuất Excel. Vui lòng tải lại trang.', 'warning');
      return;
    }

    const totals = this.productStatisticsTotals;
    const aoa: Array<Array<string | number>> = [
      ['Bảng thống kê bán hàng'],
      [`Thời gian: ${this.analyticsTimeRangeLabel}`],
      [`Trạng thái đơn: ${this.analyticsOrderStatusLabel}`],
      [],
      [
        'STT',
        'Sản phẩm',
        'Giá (VND)',
        'Lượt xem',
        'Đã bán',
        'Doanh thu (VND)',
        'Doanh thu kỳ trước (VND)',
        'Tăng/Giảm doanh thu (%)',
        'Chuyển đổi (%)',
        'Tồn kho',
      ],
      ...this.productStatisticsRows.map((row, index) => [
        index + 1,
        row.name,
        row.price,
        row.views,
        row.sales,
        row.revenue,
        row.previousRevenue,
        row.revenueDeltaPercent === null ? 'Mới' : Number(row.revenueDeltaPercent.toFixed(1)),
        Number(row.conversionRate.toFixed(1)),
        row.stock,
      ]),
      [
        'Tổng cộng',
        '',
        '',
        totals.totalViews,
        totals.totalSales,
        totals.totalRevenue,
        '',
        '',
        Number(totals.averageConversionRate.toFixed(1)),
        '',
      ],
    ];

    const worksheet = xlsx.utils.aoa_to_sheet(aoa);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'ThongKeBanHang');

    const filename = `thong-ke-ban-hang-${this.analyticsTimeRange}-${Date.now()}.xlsx`;
    xlsx.writeFile(workbook, filename, { compression: true });
    void this.showToast('Đã xuất file Excel .xlsx thống kê bán hàng', 'success');
  }

  private getSheetJs(): any | null {
    const globalWindow = window as unknown as { XLSX?: any };
    return globalWindow.XLSX ?? null;
  }

  private toCsvCell(value: string | number): string {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }

  private downloadFile(filename: string, content: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  toggleAnalytics(): void {
    this.showAnalytics = !this.showAnalytics;
  }

  loadProducts(): void {
    this.products = this.productService.getProducts();
    this.currentPage = 1;
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.resetForm();
    }
  }

  async submitNewProduct(): Promise<void> {
    if (this.isSubmitting) return;

    if (!this.newName.trim()) {
      await this.showToast('Vui lòng nhập tên sản phẩm', 'warning');
      return;
    }

    if (this.newDescriptionWarnings.length > 0) {
      const continueSubmit = await this.confirmSubmitWithWarnings();
      if (!continueSubmit) {
        return;
      }
    }
    if (this.newPrice <= 0) {
      await this.showToast('Giá sản phẩm phải lớn hơn 0', 'warning');
      return;
    }
    if (!this.newCategory.trim()) {
      await this.showToast('Vui lòng chọn danh mục', 'warning');
      return;
    }

    const newProductError = this.validateProductInput({
      name: this.newName,
      price: this.newPrice,
      category: this.newCategory,
      description: this.newDescription,
      origin: this.newOrigin,
      image: this.newImage,
    });
    if (newProductError) {
      await this.showToast(newProductError, 'warning');
      return;
    }

    this.isSubmitting = true;
    try {
      this.productService.addNewProduct({
        name: this.newName,
        price: this.newPrice,
        category: this.newCategory,
        unit: this.newUnit,
        description: this.newDescription,
        origin: this.newOrigin,
        image: this.newImage,
      });
      this.loadProducts();
      this.showAddForm = false;
      this.resetForm();
      await this.showToast('Thêm sản phẩm thành công! Vào Quản lý kho để nhập số lượng.', 'success');
    } finally {
      this.isSubmitting = false;
    }
  }

  async editPrice(product: Product): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Cập nhật giá',
      subHeader: product.name,
      inputs: [
        {
          name: 'price',
          type: 'number',
          placeholder: 'Giá mới (VNĐ)',
          value: product.price.toString(),
          min: 1,
        },
      ],
      buttons: [
        { text: 'Hủy', role: 'cancel' },
        {
          text: 'Lưu',
          handler: (data: { price: string }) => {
            const newPrice = parseInt(data.price, 10);
            if (!newPrice || newPrice <= 0) {
              void this.showToast('Giá không hợp lệ', 'warning');
              return;
            }
            const ok = this.productService.updateProductPrice(product.id, newPrice);
            if (ok) {
              this.loadProducts();
              void this.showToast(`Đã cập nhật giá ${product.name}`, 'success');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  goToStockManagement(): void {
    this.router.navigate(['/seller/stock-management']);
  }

  async importImagesFromTemplate(): Promise<void> {
    if (this.isImportingImages) {
      return;
    }

    this.isImportingImages = true;
    try {
      const response = await fetch('assets/data/product-image-map.template.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json() as ProductImageMapEntry[];
      const updatedCount = this.productService.applyImageMap(payload);
      this.loadProducts();

      if (updatedCount === 0) {
        await this.showToast('Không có ảnh nào được cập nhật từ file JSON', 'warning');
        return;
      }

      await this.showToast(`Đã cập nhật ${updatedCount} ảnh sản phẩm từ file JSON`, 'success');
    } catch {
      await this.showToast('Không thể import ảnh từ file JSON', 'danger');
    } finally {
      this.isImportingImages = false;
    }
  }

  // Upload hình ảnh trực tiếp từ file
  async handleImageUpload(event: Event, isNewProduct: boolean = true): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      await this.showToast('Vui lòng chọn file hình ảnh', 'warning');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      await this.showToast('File quá lớn, tối đa 5MB', 'warning');
      return;
    }

    try {
      const uploadKey = isNewProduct
        ? `draft_${Date.now()}`
        : `product_${this.editingProductId ?? Date.now()}`;
      const uploadedUrl = await this.imageStorageService.uploadProductImage(uploadKey, file);
      
      if (isNewProduct) {
        this.newImage = uploadedUrl;
        await this.showToast('Ảnh đã upload lên Cloudinary', 'success');
      } else {
        this.editImage = uploadedUrl;
        await this.showToast('Ảnh đã upload lên Cloudinary', 'success');
      }

      // Reset input
      if (input) {
        input.value = '';
      }
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Lỗi upload ảnh lên Cloudinary';
      await this.showToast(message, 'danger');
    }
  }

  clickImageUploadNew(): void {
    const input = document.getElementById('imageUploadNew') as HTMLInputElement;
    input?.click();
  }

  clickImageUploadEdit(): void {
    const input = document.getElementById('imageUploadEdit') as HTMLInputElement;
    input?.click();
  }

  // Sửa thông tin sản phẩm
  startEditProduct(product: Product): void {
    this.editingProductId = product.id;
    this.editName = product.name;
    this.editPriceValue = product.price;
    this.editCategory = product.category;
    this.editUnit = product.unit;
    this.editDescription = product.description;
    this.editOrigin = product.origin;
    this.editImage = product.image;
  }

  cancelEditProduct(): void {
    this.editingProductId = null;
    this.resetEditForm();
  }

  async saveEditProduct(): Promise<void> {
    if (!this.editName.trim()) {
      await this.showToast('Tên sản phẩm không được để trống', 'warning');
      return;
    }
    if (this.editPriceValue <= 0) {
      await this.showToast('Giá phải lớn hơn 0', 'warning');
      return;
    }
    if (!this.editCategory.trim()) {
      await this.showToast('Vui lòng chọn danh mục', 'warning');
      return;
    }

    const product = this.products.find(p => p.id === this.editingProductId);
    if (!product) {
      await this.showToast('Sản phẩm không tồn tại', 'danger');
      return;
    }

    const updatedProduct: Product = {
      ...product,
      name: this.editName,
      price: this.editPriceValue,
      category: this.editCategory,
      unit: this.editUnit,
      description: this.editDescription,
      origin: this.editOrigin,
      image: this.editImage,
    };

    const editError = this.validateProductInput({
      name: updatedProduct.name,
      price: updatedProduct.price,
      category: updatedProduct.category,
      description: updatedProduct.description,
      origin: updatedProduct.origin,
      image: updatedProduct.image,
    });
    if (editError) {
      await this.showToast(editError, 'warning');
      return;
    }

    const updated = this.productService.updateProduct(updatedProduct);
    if (!updated) {
      await this.showToast('Không thể cập nhật sản phẩm. Vui lòng thử lại.', 'danger');
      return;
    }

    this.loadProducts();
    this.cancelEditProduct();
    await this.showToast(`Đã cập nhật sản phẩm ${this.editName}`, 'success');
  }

  private resetEditForm(): void {
    this.editName = '';
    this.editPriceValue = 0;
    this.editCategory = '';
    this.editUnit = '';
    this.editDescription = '';
    this.editOrigin = '';
    this.editImage = '';
  }

  async deleteProduct(product: Product): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Xóa sản phẩm',
      message: `Bạn chắc chắn muốn xóa "<strong>${product.name}</strong>"? Hành động này không thể hoàn tác.`,
      buttons: [
        { text: 'Hủy', role: 'cancel' },
        {
          text: 'Xóa',
          role: 'destructive',
          handler: () => {
            const deleted = this.productService.deleteProduct(product.id);
            if (!deleted) {
              void this.showToast('Không thể xóa sản phẩm. Vui lòng thử lại.', 'danger');
              return;
            }

            this.loadProducts();
            void this.showToast(`Đã xóa sản phẩm ${product.name}`, 'success');
          },
        },
      ],
    });
    await alert.present();
  }

  get editDescriptionWarnings(): string[] {
    const warnings: string[] = [];
    const description = this.editDescription.trim();

    if (description.length === 0) {
      return warnings;
    }

    if (description.length < 30) {
      warnings.push('Mô tả hơi ngắn, nên từ 30 ký tự để rõ giá trị sản phẩm.');
    }

    if (this.editCategory) {
      const normalizedDescription = this.normalizeSearchText(description);
      const categoryKeywords = this.categoryKeywords[this.editCategory] || [];
      const hasKeyword = categoryKeywords.length === 0 || categoryKeywords.some(keyword => normalizedDescription.includes(keyword));

      if (!hasKeyword) {
        warnings.push(`Mô tả chưa chứa từ khóa gợi ý cho danh mục ${this.editCategory}.`);
      }
    }

    return warnings;
  }

  get newDescriptionWarnings(): string[] {
    const warnings: string[] = [];
    const description = this.newDescription.trim();

    if (description.length === 0) {
      return warnings;
    }

    if (description.length < 30) {
      warnings.push('Mô tả hơi ngắn, nên từ 30 ký tự để rõ giá trị sản phẩm.');
    }

    if (this.newCategory) {
      const normalizedDescription = this.normalizeSearchText(description);
      const categoryKeywords = this.categoryKeywords[this.newCategory] || [];
      const hasKeyword = categoryKeywords.length === 0 || categoryKeywords.some(keyword => normalizedDescription.includes(keyword));

      if (!hasKeyword) {
        warnings.push(`Mô tả chưa chứa từ khóa gợi ý cho danh mục ${this.newCategory}.`);
      }
    }

    return warnings;
  }

  private normalizeSearchText(value: string): string {
    return value
      .trim()
      .replace(/\s+/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private validateProductInput(input: {
    name: string;
    price: number;
    category: string;
    description: string;
    origin: string;
    image: string;
  }): string | null {
    const name = input.name.trim();
    if (name.length < 3 || name.length > 120) {
      return 'Tên sản phẩm phải từ 3 đến 120 ký tự.';
    }

    if (!Number.isFinite(input.price) || input.price <= 0 || input.price > 1000000000) {
      return 'Giá sản phẩm không hợp lệ.';
    }

    if (!this.categories.includes(input.category)) {
      return 'Danh mục sản phẩm không hợp lệ.';
    }

    if (input.description.trim().length > 500) {
      return 'Mô tả sản phẩm tối đa 500 ký tự.';
    }

    if (input.origin.trim().length > 120) {
      return 'Xuất xứ sản phẩm tối đa 120 ký tự.';
    }

    const image = input.image.trim();
    if (image && image.startsWith('data:')) {
      return 'Ảnh base64 không hỗ trợ lưu bền vững trên Firebase. Vui lòng dùng nút upload ảnh.';
    }

    if (image) {
      try {
        const parsed = new URL(image);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return 'URL hình ảnh phải dùng giao thức http hoặc https.';
        }
      } catch {
        return 'URL hình ảnh không hợp lệ.';
      }
    }

    return null;
  }

  private async confirmSubmitWithWarnings(): Promise<boolean> {
    const alert = await this.alertController.create({
      header: 'Cảnh báo chất lượng mô tả',
      message: `<ul>${this.newDescriptionWarnings.map(item => `<li>${item}</li>`).join('')}</ul><p>Bạn vẫn muốn thêm sản phẩm?</p>`,
      buttons: [
        { text: 'Sửa lại', role: 'cancel' },
        { text: 'Vẫn thêm', role: 'confirm' },
      ],
    });

    await alert.present();
    const result = await alert.onDidDismiss();
    return result.role === 'confirm';
  }

  private resetForm(): void {
    this.newName = '';
    this.newPrice = 0;
    this.newCategory = '';
    this.newUnit = 'kg';
    this.newDescription = '';
    this.newOrigin = 'Đà Lạt, Lâm Đồng';
    this.newImage = '';
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 2500, color, position: 'bottom' });
    await toast.present();
  }
}
