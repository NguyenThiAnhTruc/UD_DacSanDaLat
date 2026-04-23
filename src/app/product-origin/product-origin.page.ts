import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ProductService } from '../services/product.service';
import { QrScannerService } from '../services/qr-scanner.service';
import { AuthService } from '../services/auth.service';
import { Product, TraceabilityEvent } from '../models/product.model';

@Component({
  selector: 'app-product-origin',
  templateUrl: './product-origin.page.html',
  styleUrls: ['./product-origin.page.scss'],
  standalone: false
})
export class ProductOriginPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastController = inject(ToastController);
  private productService = inject(ProductService);
  private qrScannerService = inject(QrScannerService);
  private authService = inject(AuthService);

  product: Product | undefined;
  productId: number = 0;
  isLoading: boolean = true;
  traceabilityEvents: TraceabilityEvent[] = [];
  traceCode: string = '';
  qrTraceLink: string = '';
  qrImageUrl: string = '';
  shareUrl: string = '';
  cameFromQrScan: boolean = false;
  canEditTraceability: boolean = false;
  showTraceabilityInfoEditor: boolean = false;
  isSubmittingTraceability: boolean = false;
  isSavingTraceabilityInfo: boolean = false;
  traceStageInput: string = '';
  traceDescriptionInput: string = '';
  traceOccurredAtInput: string = '';
  traceIconInput: string = 'location-outline';
  traceOriginInput: string = '';
  traceFarmNameInput: string = '';
  traceFarmerNameInput: string = '';
  traceFarmerExperienceInput: string = '';
  readonly traceIconOptions: string[] = [
    'leaf-outline',
    'water-outline',
    'basket-outline',
    'shield-checkmark-outline',
    'cube-outline',
    'car-outline',
    'location-outline',
  ];
  private productsSubscription?: Subscription;

  ngOnInit() {
    this.canEditTraceability = this.authService.isStockManager();
    this.traceOccurredAtInput = this.toLocalDatetimeInputValue(new Date());
    this.cameFromQrScan = this.route.snapshot.queryParamMap.get('scanned') === '1';

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.productId = parseInt(id, 10);
        this.loadProductData();
      }
    });
  }

  async submitTraceabilityEvent(): Promise<void> {
    if (!this.product || this.isSubmittingTraceability || !this.canEditTraceability) {
      return;
    }

    this.isSubmittingTraceability = true;
    try {
      const result = this.productService.addTraceabilityEvent(this.product.id, {
        stage: this.traceStageInput,
        description: this.traceDescriptionInput,
        occurredAt: this.traceOccurredAtInput,
        icon: this.traceIconInput,
      });

      if (!result.success) {
        await this.showToast(result.message, 'warning');
        return;
      }

      this.traceabilityEvents = this.productService.getTraceabilityTimeline(this.product.id);
      this.traceStageInput = '';
      this.traceDescriptionInput = '';
      this.traceOccurredAtInput = this.toLocalDatetimeInputValue(new Date());
      this.traceIconInput = 'location-outline';
      await this.showToast(result.message, 'success');
    } finally {
      this.isSubmittingTraceability = false;
    }
  }

  onTraceStageChanged(): void {
    const stage = this.traceStageInput.trim().toLowerCase();
    if (!stage) {
      return;
    }

    if (stage.includes('gieo') || stage.includes('trồng') || stage.includes('canh tác')) {
      this.traceIconInput = 'leaf-outline';
      return;
    }
    if (stage.includes('chăm sóc') || stage.includes('tưới')) {
      this.traceIconInput = 'water-outline';
      return;
    }
    if (stage.includes('thu hoạch')) {
      this.traceIconInput = 'basket-outline';
      return;
    }
    if (stage.includes('kiểm') || stage.includes('chất lượng')) {
      this.traceIconInput = 'shield-checkmark-outline';
      return;
    }
    if (stage.includes('đóng gói') || stage.includes('bao gói')) {
      this.traceIconInput = 'cube-outline';
      return;
    }
    if (stage.includes('vận chuyển') || stage.includes('giao')) {
      this.traceIconInput = 'car-outline';
      return;
    }

    this.traceIconInput = 'location-outline';
  }

  ngOnDestroy() {
    if (this.productsSubscription) {
      this.productsSubscription.unsubscribe();
    }
  }

  loadProductData() {
    this.isLoading = true;

    if (this.productsSubscription) {
      this.productsSubscription.unsubscribe();
    }

    this.productsSubscription = this.productService.products$.subscribe(products => {
      if (!products.length) {
        return;
      }

      this.product = this.productService.getProductById(this.productId);
      this.traceabilityEvents = this.productService.getTraceabilityTimeline(this.productId);

      if (this.product) {
        this.traceOriginInput = this.product.origin || '';
        this.traceFarmNameInput = this.product.farmName || '';
        this.traceFarmerNameInput = this.product.farmerInfo?.name || '';
        this.traceFarmerExperienceInput = this.product.farmerInfo?.experience || '';
        this.traceCode = this.qrScannerService.generateTraceCode(this.product.id);
        this.qrTraceLink = this.qrScannerService.generateQrLinkData(this.product.id);
        this.qrImageUrl = this.qrScannerService.generateQrImageUrl(this.product.id);
        this.shareUrl = this.qrScannerService.generateProductTraceUrl(this.product.id);
      }

      this.isLoading = false;
    });
  }

  formatDateTime(date: Date): string {
    // Fix: date is already a Date object, no need to wrap with new Date()
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }


  goBack() {
    if (this.cameFromQrScan) {
      this.router.navigate(['/qr-scanner']);
      return;
    }

    this.router.navigate(['/product-detail', this.productId]);
  }

  viewProductDetail() {
    this.router.navigate(['/product-detail', this.productId]);
  }

  toggleTraceabilityInfoEditor(): void {
    if (!this.canEditTraceability) {
      return;
    }

    this.showTraceabilityInfoEditor = !this.showTraceabilityInfoEditor;
  }

  async saveTraceabilityInfo(): Promise<void> {
    if (!this.product || !this.canEditTraceability || this.isSavingTraceabilityInfo) {
      return;
    }

    const productId = this.product.id;
    this.isSavingTraceabilityInfo = true;
    try {
      const result = this.productService.updateTraceabilityInfo(productId, {
        origin: this.traceOriginInput,
        farmName: this.traceFarmNameInput,
        farmerName: this.traceFarmerNameInput,
        farmerExperience: this.traceFarmerExperienceInput,
      });

      if (!result.success) {
        await this.showToast(result.message, 'warning');
        return;
      }

      this.product = this.productService.getProductById(productId);
      this.traceabilityEvents = this.productService.getTraceabilityTimeline(productId);
      this.showTraceabilityInfoEditor = false;
      await this.showToast(result.message, 'success');
    } finally {
      this.isSavingTraceabilityInfo = false;
    }
  }

  async downloadQrPng(): Promise<void> {
    if (!this.qrImageUrl) {
      await this.showToast('Không có mã QR để tải', 'warning');
      return;
    }

    try {
      const response = await fetch(this.qrImageUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `${this.traceCode || 'ma-truy-xuat'}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);

      await this.showToast('Đã tải mã QR PNG', 'success');
    } catch (error) {
      console.error('Download QR failed:', error);
      await this.showToast('Không thể tải mã QR, vui lòng thử lại', 'danger');
    }
  }

  shareViaFacebook(): void {
    if (!this.product) {
      return;
    }

    const text = `Truy xuất nguồn gốc sản phẩm ${this.product.name}`;
    const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.shareUrl)}&quote=${encodeURIComponent(text)}`;
    window.open(facebookShareUrl, '_blank', 'noopener,noreferrer,width=680,height=540');
  }

  shareViaZalo(): void {
    if (!this.product) {
      return;
    }

    const shareText = `Truy xuất sản phẩm ${this.product.name}`;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      navigator.share({
        title: `Truy xuất: ${this.product.name}`,
        text: shareText,
        url: this.shareUrl,
      }).catch(() => {
        const zaloShareUrl = `https://zalo.me/share?u=${encodeURIComponent(this.shareUrl)}`;
        window.open(zaloShareUrl, '_blank', 'noopener,noreferrer,width=680,height=540');
      });
      return;
    }

    const zaloShareUrl = `https://zalo.me/share?u=${encodeURIComponent(this.shareUrl)}`;
    window.open(zaloShareUrl, '_blank', 'noopener,noreferrer,width=680,height=540');
  }

  private async showToast(message: string, color: string = 'medium'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color,
    });
    await toast.present();
  }

  private toLocalDatetimeInputValue(date: Date): string {
    const timezoneOffsetMinutes = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - timezoneOffsetMinutes * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  }

}
