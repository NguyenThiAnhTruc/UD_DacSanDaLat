import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Product } from '../models/product.model';
import { AuthService } from '../services/auth.service';
import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-admin-stock-management',
  templateUrl: './admin-stock-management.page.html',
  styleUrls: ['./admin-stock-management.page.scss'],
  standalone: false,
})
export class AdminStockManagementPage implements OnInit {
  private authService = inject(AuthService);
  private productService = inject(ProductService);
  private router = inject(Router);
  private toastController = inject(ToastController);

  products: Product[] = [];
  selectedProductId: number | null = null;
  actionType: 'restock' | 'manual_adjustment' = 'restock';
  quantity: number = 1;
  lowStockThreshold: number = 5;
  note: string = '';
  isSubmitting: boolean = false;

  ngOnInit(): void {
    if (!this.authService.isStockManager()) {
      void this.showToast('Bạn không có quyền vào màn quản lý kho', 'danger');
      this.router.navigate(['/tabs/tab3']);
      return;
    }

    this.products = this.productService.getProducts();
    if (this.products.length > 0) {
      this.selectedProductId = this.products[0].id;
      this.syncThresholdFromSelectedProduct();
    }
  }

  get selectedProduct(): Product | undefined {
    if (this.selectedProductId === null) {
      return undefined;
    }

    return this.products.find(product => product.id === this.selectedProductId);
  }

  onSelectedProductChanged(): void {
    this.syncThresholdFromSelectedProduct();
  }

  async saveLowStockThreshold(): Promise<void> {
    if (this.selectedProductId === null) {
      return;
    }

    const threshold = Math.max(1, Math.floor(this.lowStockThreshold));
    const ok = this.productService.updateProductLowStockThreshold(this.selectedProductId, threshold);
    if (!ok) {
      await this.showToast('Không thể cập nhật ngưỡng cảnh báo tồn kho', 'danger');
      return;
    }

    this.products = this.productService.getProducts();
    this.syncThresholdFromSelectedProduct();
    await this.showToast(`Đã lưu ngưỡng cảnh báo: ${threshold}`, 'success');
  }

  async submitStockAdjustment(): Promise<void> {
    if (this.isSubmitting || this.selectedProductId === null) {
      return;
    }

    const quantity = Math.abs(Math.floor(this.quantity));
    if (quantity <= 0) {
      await this.showToast('Số lượng phải lớn hơn 0', 'warning');
      return;
    }

    this.isSubmitting = true;
    try {
      let success = false;
      const note = this.note.trim() || 'Điều chỉnh tồn kho từ màn quản lý kho';

      if (this.actionType === 'restock') {
        success = this.productService.restockProduct(this.selectedProductId, quantity, note);
      } else {
        success = this.productService.adjustProductStock(this.selectedProductId, quantity, 'manual_adjustment', note);
      }

      if (!success) {
        await this.showToast('Không thể cập nhật tồn kho', 'danger');
        return;
      }

      this.products = this.productService.getProducts();
      this.note = '';
      await this.showToast('Cập nhật tồn kho thành công', 'success');
    } finally {
      this.isSubmitting = false;
    }
  }

  async subtractStock(): Promise<void> {
    if (this.isSubmitting || this.selectedProductId === null) {
      return;
    }

    const quantity = Math.abs(Math.floor(this.quantity));
    if (quantity <= 0) {
      await this.showToast('Số lượng phải lớn hơn 0', 'warning');
      return;
    }

    const currentStock = this.selectedProduct?.stock ?? 0;
    if (quantity > currentStock) {
      await this.showToast('Số lượng trừ không được vượt tồn kho hiện tại', 'warning');
      return;
    }

    this.isSubmitting = true;
    try {
      const note = this.note.trim() || 'Trừ tồn kho thủ công từ màn quản lý kho';
      const success = this.productService.adjustProductStock(this.selectedProductId, -quantity, 'manual_adjustment', note);

      if (!success) {
        await this.showToast('Không thể trừ tồn kho', 'danger');
        return;
      }

      this.products = this.productService.getProducts();
      this.note = '';
      await this.showToast('Đã trừ tồn kho thành công', 'success');
    } finally {
      this.isSubmitting = false;
    }
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      color,
      duration: 1800,
      position: 'bottom',
    });
    await toast.present();
  }

  private syncThresholdFromSelectedProduct(): void {
    const selected = this.selectedProduct;
    if (!selected) {
      this.lowStockThreshold = 5;
      return;
    }

    const threshold = selected.inventory?.lowStockThreshold;
    this.lowStockThreshold = Math.max(1, Math.floor(threshold ?? 5));
  }
}
