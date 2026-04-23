import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CloudinaryImageStorageService {
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB

  async uploadProductImage(productId: string, file: File): Promise<string> {
    if (!productId || !file) {
      throw new Error('Product ID and file are required');
    }

    this.validateFile(file);

    const cloudName = environment.cloudinary.cloudName.trim();
    const uploadPreset = environment.cloudinary.uploadPreset.trim();

    if (!cloudName || !uploadPreset) {
      throw new Error('Cloudinary config is missing. Please set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', `products/${productId}`);

    // Use deterministic naming to simplify tracing uploads in Cloudinary dashboard.
    const timestamp = Date.now();
    const safeName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    formData.append('public_id', `${productId}-${timestamp}-${safeName}`);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      const message = typeof data?.error?.message === 'string' ? data.error.message : 'Cloudinary upload failed';
      throw new Error(message);
    }

    if (typeof data?.secure_url !== 'string' || !data.secure_url) {
      throw new Error('Cloudinary did not return secure_url');
    }

    return data.secure_url;
  }

  async uploadUserAvatar(userId: string, file: File): Promise<string> {
    if (!userId || !file) {
      throw new Error('User ID and file are required');
    }

    this.validateFile(file);

    const cloudName = environment.cloudinary.cloudName.trim();
    const uploadPreset = environment.cloudinary.uploadPreset.trim();

    if (!cloudName || !uploadPreset) {
      throw new Error('Cloudinary config is missing. Please set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', `avatars/${userId}`);
    formData.append('public_id', `${userId}-${Date.now()}-avatar`);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      const message = typeof data?.error?.message === 'string' ? data.error.message : 'Cloudinary upload failed';
      throw new Error(message);
    }

    if (typeof data?.secure_url !== 'string' || !data.secure_url) {
      throw new Error('Cloudinary did not return secure_url');
    }

    return data.secure_url;
  }

  getMaxFileSize(): number {
    return this.maxFileSize;
  }

  base64ToFile(base64String: string, fileName: string, mimeType: string = 'image/jpeg'): File {
    const byteCharacters = atob(base64String);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return new File([blob], fileName, { type: mimeType });
  }

  private validateFile(file: File): void {
    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds ${this.maxFileSize / (1024 * 1024)}MB limit`);
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('Invalid file type. Only images are allowed.');
    }
  }
}
