import { Injectable, inject } from '@angular/core';
import { ModalController, AlertController } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QrScannerService {
  private modalController = inject(ModalController);
  private alertController = inject(AlertController);

  private scanResultSubject = new BehaviorSubject<string | null>(null);
  public scanResult$ = this.scanResultSubject.asObservable();

  // Extract product ID from QR code
  extractProductId(qrData: string): number | null {
    const source = (qrData ?? '').trim();
    if (!source) {
      return null;
    }

    try {
      // Format 1: Direct product ID
      const directId = parseInt(source, 10);
      if (!isNaN(directId)) {
        return directId;
      }

      // Format 2: URL with product ID (e.g., /product-origin/1)
      const urlMatch = source.match(/product-(origin|detail)\/(\d+)/);
      if (urlMatch && urlMatch[2]) {
        return parseInt(urlMatch[2], 10);
      }

      // Format 3: Trace code text (e.g., DLVN12026)
      const traceCodeMatch = source.match(/^DLVN(\d+)\d{4}$/i);
      if (traceCodeMatch && traceCodeMatch[1]) {
        return parseInt(traceCodeMatch[1], 10);
      }

      // Format 4: JSON format
      const jsonData = JSON.parse(source);
      if (jsonData.productId) {
        return parseInt(jsonData.productId, 10);
      }

      return null;
    } catch (error) {
      console.error('Error extracting product ID:', error);
      return null;
    }
  }

  // Validate QR code format
  isValidQRCode(qrData: string): boolean {
    return this.extractProductId(qrData) !== null;
  }

  // Generate QR data for a product
  generateQRData(productId: number): string {
    return JSON.stringify({
      productId: productId,
      type: 'product-origin',
      route: `/product-origin/${productId}`,
      traceCode: this.generateTraceCode(productId),
      timestamp: new Date().toISOString(),
    });
  }

  generateTraceCode(productId: number): string {
    const year = new Date().getFullYear();
    return `DLVN${productId}${year}`;
  }

  generateQrImageUrl(productId: number): string {
    const data = encodeURIComponent(this.generateQrLinkData(productId));
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${data}`;
  }

  generateQrLinkData(productId: number): string {
    return this.generateProductTraceUrl(productId);
  }

  generateProductTraceUrl(productId: number): string {
    const configuredBase = environment.appPublicBaseUrl?.trim();
    if (configuredBase) {
      return `${configuredBase.replace(/\/$/, '')}/product-origin/${productId}`;
    }

    const projectId = environment.firebaseConfig.projectId?.trim();
    if (projectId) {
      // Public Firebase Hosting domain is reachable from phone even when dev server runs on localhost.
      return `https://${projectId}.web.app/product-origin/${productId}`;
    }

    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/product-origin/${productId}`;
    }

    return `/product-origin/${productId}`;
  }

  async showInvalidQRAlert() {
    const alert = await this.alertController.create({
      header: 'Mã QR không hợp lệ',
      message: 'Mã QR này không thuộc hệ thống truy xuất nguồn gốc của chúng tôi.',
      buttons: ['OK']
    });
    await alert.present();
  }
}
