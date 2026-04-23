import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { QrScannerService } from '../services/qr-scanner.service';
import { ProductService } from '../services/product.service';
import jsQR from 'jsqr';

@Component({
  selector: 'app-qr-scanner',
  templateUrl: './qr-scanner.page.html',
  styleUrls: ['./qr-scanner.page.scss'],
  standalone: false,
})
export class QrScannerPage implements OnInit, OnDestroy {
  private router = inject(Router);
  private toastController = inject(ToastController);
  private qrScannerService = inject(QrScannerService);
  private productService = inject(ProductService);

  @ViewChild('videoElement', { static: false })
  videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement', { static: false })
  canvasElement?: ElementRef<HTMLCanvasElement>;

  scanResult: string | null = null;
  showManualInput: boolean = false;
  manualCode: string = '';
  isFlashlightOn: boolean = false;
  demoProductIds: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  private stream?: MediaStream;
  private scanAnimationFrame?: number;
  private scanningActive = false;
  private isProcessingScan = false;
  private lastScanAt = 0;
  private readonly scanIntervalMs = 250;
  private lastInvalidToastAt = 0;
  private readonly invalidToastCooldownMs = 2000;
  private barcodeDetector: {
    detect: (
      source: ImageBitmapSource | HTMLVideoElement | HTMLCanvasElement,
    ) => Promise<Array<{ rawValue?: string }>>;
  } | null = null;

  ngOnInit() {
    // Initialize camera when in scan mode
    if (!this.showManualInput) {
      this.initializeCamera();
    }
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  async initializeCamera() {
    try {
      this.stopCamera();

      if (!this.isCameraApiSupported()) {
        await this.showToast(
          'Thiết bị không hỗ trợ camera API trên trình duyệt này. Vui lòng dùng nhập mã thủ công.',
          'warning',
        );
        this.showManualInput = true;
        return;
      }

      // Request camera permission and get stream
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use rear camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
        this.videoElement.nativeElement.setAttribute('playsinline', 'true');
        this.videoElement.nativeElement.muted = true;
        this.videoElement.nativeElement.play();

        // Start scanning after camera is ready
        this.videoElement.nativeElement.onloadedmetadata = () => {
          void this.startScanning();
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      await this.showToast(
        'Không thể truy cập camera. Vui lòng sử dụng nhập mã thủ công.',
        'danger',
      );
      this.showManualInput = true;
    }
  }

  private async startScanning(): Promise<void> {
    if (this.scanningActive || !this.videoElement || !this.canvasElement) {
      return;
    }

    this.scanningActive = true;
    this.barcodeDetector = this.createBarcodeDetector();

    const loop = async () => {
      if (!this.scanningActive) {
        return;
      }

      const now = Date.now();
      if (now - this.lastScanAt >= this.scanIntervalMs) {
        this.lastScanAt = now;
        await this.scanCurrentFrame();
      }

      this.scanAnimationFrame = requestAnimationFrame(() => {
        void loop();
      });
    };

    await loop();
  }

  stopCamera() {
    this.scanningActive = false;

    if (this.scanAnimationFrame) {
      cancelAnimationFrame(this.scanAnimationFrame);
      this.scanAnimationFrame = undefined;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = undefined;
    }

    if (this.videoElement) {
      this.videoElement.nativeElement.srcObject = null;
    }

    this.isFlashlightOn = false;
  }

  toggleManualInput() {
    this.showManualInput = !this.showManualInput;

    if (!this.showManualInput) {
      // Restart camera when switching back to scan mode
      this.initializeCamera();
    } else {
      // Stop camera when switching to manual input
      this.stopCamera();
    }
  }

  async processManualCode() {
    if (!this.manualCode) {
      return;
    }

    const productId = this.qrScannerService.extractProductId(this.manualCode);

    if (productId === null || Number.isNaN(productId)) {
      await this.showToast('Mã sản phẩm không hợp lệ', 'danger');
      return;
    }

    const allProducts = this.productService.getProducts();
    if (allProducts.length === 0) {
      await this.showToast(
        'Dữ liệu sản phẩm đang đồng bộ từ Firebase, vui lòng thử lại sau vài giây',
        'warning',
      );
      return;
    }

    // Check if product exists
    const product = this.productService.getProductById(productId);
    if (!product) {
      await this.showToast('Không tìm thấy sản phẩm với mã này', 'warning');
      return;
    }

    // Show success state
    this.scanResult = productId.toString();
    this.isProcessingScan = true;

    // Navigate directly to product origin and product info page
    setTimeout(() => {
      this.stopCamera();
      this.router.navigate(['/product-origin', productId], {
        queryParams: { source: 'qr', scanned: '1' },
      });
    }, 1500);
  }

  selectDemoCode(productId: number) {
    this.manualCode = productId.toString();
    this.processManualCode();
  }

  async toggleFlashlight() {
    try {
      if (this.stream) {
        const track = this.stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;

        if (capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: !this.isFlashlightOn } as any],
          });
          this.isFlashlightOn = !this.isFlashlightOn;
        } else {
          await this.showToast('Thiết bị không hỗ trợ đèn flash', 'warning');
        }
      }
    } catch (error) {
      console.error('Error toggling flashlight:', error);
      await this.showToast('Không thể bật/tắt đèn flash', 'danger');
    }
  }

  private async scanCurrentFrame(): Promise<void> {
    if (!this.videoElement || !this.canvasElement || this.isProcessingScan) {
      return;
    }

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;

    if (
      video.readyState < 2 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return;
    }

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const scannedText = await this.tryDecodeQr(video, canvas, context);
    if (!scannedText) {
      return;
    }

    await this.processScannedText(scannedText);
  }

  private async tryDecodeQr(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
  ): Promise<string | null> {
    // Try native BarcodeDetector first when available.
    if (this.barcodeDetector) {
      try {
        const result = await this.barcodeDetector.detect(video);
        const rawValue = result?.[0]?.rawValue?.trim();
        if (rawValue) {
          return rawValue;
        }
      } catch {
        // Continue with jsQR fallback.
      }
    }

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    return decoded?.data?.trim() || null;
  }

  private async processScannedText(scannedText: string): Promise<void> {
    if (this.isProcessingScan) {
      return;
    }

    const productId = this.qrScannerService.extractProductId(scannedText);
    if (productId === null || Number.isNaN(productId)) {
      const now = Date.now();
      if (now - this.lastInvalidToastAt >= this.invalidToastCooldownMs) {
        this.lastInvalidToastAt = now;
        await this.showToast(
          'Mã QR không hợp lệ với hệ thống sản phẩm',
          'warning',
        );
      }
      return;
    }

    const allProducts = this.productService.getProducts();
    if (allProducts.length === 0) {
      await this.showToast(
        'Dữ liệu sản phẩm đang đồng bộ từ Firebase, vui lòng thử lại sau vài giây',
        'warning',
      );
      return;
    }

    const product = this.productService.getProductById(productId);
    if (!product) {
      await this.showToast('Không tìm thấy sản phẩm với mã này', 'warning');
      return;
    }

    this.isProcessingScan = true;
    this.scanResult = String(productId);
    this.stopCamera();

    setTimeout(() => {
      this.router.navigate(['/product-origin', productId], {
        queryParams: { source: 'qr', scanned: '1' },
      });
    }, 700);
  }

  private isCameraApiSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    );
  }

  private createBarcodeDetector(): {
    detect: (
      source: ImageBitmapSource | HTMLVideoElement | HTMLCanvasElement,
    ) => Promise<Array<{ rawValue?: string }>>;
  } | null {
    const globalWindow = window as Window & {
      BarcodeDetector?: new (options?: { formats?: string[] }) => {
        detect: (
          source: ImageBitmapSource | HTMLVideoElement | HTMLCanvasElement,
        ) => Promise<Array<{ rawValue?: string }>>;
      };
    };

    if (!globalWindow.BarcodeDetector) {
      return null;
    }

    try {
      return new globalWindow.BarcodeDetector({ formats: ['qr_code'] });
    } catch {
      return null;
    }
  }

  closeScanner() {
    this.stopCamera();
    this.router.navigate(['/tabs/tab1']);
  }

  async showToast(message: string, color: string = 'medium') {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      position: 'bottom',
      color,
    });
    await toast.present();
  }
}
