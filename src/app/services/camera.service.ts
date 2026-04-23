import { Injectable, inject } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Platform } from '@ionic/angular';

export interface CameraImage {
  path: string;
  webPath?: string;
  base64?: string;
  fileName: string;
  mimeType: string;
}

@Injectable({
  providedIn: 'root'
})
export class CameraService {
  private platform = inject(Platform);

  /**
   * Take photo using device camera
   */
  async takePhoto(): Promise<CameraImage | null> {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        promptLabelHeader: 'Chọn nguồn',
        promptLabelPhoto: 'Chụp ảnh',
      });

      return this.convertPhotoToImage(photo);
    } catch (error) {
      console.error('Error taking photo:', error);
      throw new Error('Không thể chụp ảnh');
    }
  }

  /**
   * Pick photo from gallery
   */
  async pickPhoto(): Promise<CameraImage | null> {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
        promptLabelHeader: 'Chọn ảnh',
        promptLabelPicture: 'Chọn',
      });

      return this.convertPhotoToImage(photo);
    } catch (error) {
      console.error('Error picking photo:', error);
      throw new Error('Không thể chọn ảnh');
    }
  }

  /**
   * Take photo or pick from gallery
   */
  async getPhoto(): Promise<CameraImage | null> {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
        promptLabelHeader: 'Chọn ảnh',
        promptLabelPhoto: 'Chụp ảnh',
        promptLabelPicture: 'Chọn từ thư viện',
      });

      return this.convertPhotoToImage(photo);
    } catch (error) {
      console.error('Error getting photo:', error);
      throw new Error('Không thể lấy ảnh');
    }
  }

  /**
   * Convert Capacitor photo to internal image format
   */
  private convertPhotoToImage(photo: Photo): CameraImage {
    const fileName = this.generateFileName(photo.format || 'jpeg');
    
    return {
      path: photo.path || '',
      webPath: photo.webPath,
      base64: photo.base64String,
      fileName: fileName,
      mimeType: `image/${photo.format || 'jpeg'}`
    };
  }

  /**
   * Generate unique file name
   */
  private generateFileName(format: string): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `photo-${timestamp}-${random}.${format}`;
  }

  /**
   * Save photo to app storage
   */
  async savePhotoToStorage(image: CameraImage, folderName: string = 'photos'): Promise<string> {
    try {
      if (!image.base64) {
        throw new Error('No base64 data available');
      }

      const result = await Filesystem.writeFile({
        path: `${folderName}/${image.fileName}`,
        data: image.base64,
        directory: Directory.Data,
        recursive: true,
      });

      return result.uri;
    } catch (error) {
      console.error('Error saving photo to storage:', error);
      throw new Error('Không thể lưu ảnh');
    }
  }

  /**
   * Read photo from app storage
   */
  async readPhotoFromStorage(filePath: string): Promise<string> {
    try {
      const data = await Filesystem.readFile({
        path: filePath,
        directory: Directory.Data,
      });

      return data.data as string;
    } catch (error) {
      console.error('Error reading photo:', error);
      throw new Error('Không thể đọc ảnh');
    }
  }

  /**
   * Delete photo from app storage
   */
  async deletePhotoFromStorage(filePath: string): Promise<void> {
    try {
      await Filesystem.deleteFile({
        path: filePath,
        directory: Directory.Data,
      });
    } catch (error) {
      console.error('Error deleting photo:', error);
      throw new Error('Không thể xóa ảnh');
    }
  }

  /**
   * List photos in folder
   */
  async listPhotos(folderName: string = 'photos'): Promise<string[]> {
    try {
      const result = await Filesystem.readdir({
        path: folderName,
        directory: Directory.Data,
      });

      return result.files.map(f => `${folderName}/${f.name}`);
    } catch (error) {
      console.error('Error listing photos:', error);
      return [];
    }
  }

  /**
   * Check camera permission
   */
  async checkCameraPermission(): Promise<boolean> {
    try {
      if (this.isWebLikePlatform()) {
        return true; // Web uses browser permissions
      }

      const permission = await Camera.checkPermissions();
      return permission.camera !== 'denied';
    } catch (error) {
      console.error('Error checking camera permission:', error);
      return false;
    }
  }

  /**
   * Request camera permission
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      if (this.isWebLikePlatform()) {
        return true;
      }

      const permission = await Camera.requestPermissions();
      return permission.camera !== 'denied';
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  }

  private isWebLikePlatform(): boolean {
    return this.platform.is('mobileweb') || this.platform.is('desktop') || this.platform.is('pwa');
  }
}
