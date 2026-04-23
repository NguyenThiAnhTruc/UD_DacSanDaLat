import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  Auth,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  UserCredential,
} from 'firebase/auth';

/**
 * Google auth wrapper:
 * - Native platform (Android/iOS): uses Capacitor Firebase Authentication
 * - Web platform: uses Firebase popup auth
 */
@Injectable({
  providedIn: 'root',
})
export class NativeGoogleAuthService {
  constructor() {}

  async signIn(auth: Auth): Promise<UserCredential> {
    if (Capacitor.isNativePlatform()) {
      return this.signInNative(auth);
    }

    return this.signInWeb(auth);
  }

  async signOut(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    await FirebaseAuthentication.signOut().catch(() => undefined);
  }

  private async signInNative(auth: Auth): Promise<UserCredential> {
    try {
      console.info('[NativeGoogleAuth] Starting native Google sign-in...');
      const result = await FirebaseAuthentication.signInWithGoogle();

      const idToken = result.credential?.idToken;
      const accessToken = result.credential?.accessToken;

      if (!idToken && !accessToken) {
        throw new Error('Google native sign-in did not return OAuth tokens.');
      }

      const credential = GoogleAuthProvider.credential(
        idToken ?? undefined,
        accessToken ?? undefined,
      );
      const userCredential = await signInWithCredential(auth, credential);
      console.info('[NativeGoogleAuth] Native Google sign-in succeeded');
      return userCredential;
    } catch (error: any) {
      throw this.mapNativeError(error);
    }
  }

  private async signInWeb(auth: Auth): Promise<UserCredential> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      console.info('[NativeGoogleAuth] Starting web popup Google sign-in...');
      const result = await signInWithPopup(auth, provider);
      console.info('[NativeGoogleAuth] Web popup Google sign-in succeeded');
      return result;
    } catch (error: any) {
      const errorCode = error?.code;
      const errorMsg = error?.message || '';

      console.error(
        '[NativeGoogleAuth] Web popup auth error:',
        errorCode,
        errorMsg,
      );

      if (
        errorMsg.includes('sessionStorage') ||
        errorMsg.includes('partitioned') ||
        errorMsg.includes('state') ||
        errorCode?.includes('permission')
      ) {
        throw new Error(
          'Thiết bị/trình duyệt hiện tại không hỗ trợ popup Google trong WebView. ' +
            'Hãy dùng app Android đã build lại với Native Google Sign-In hoặc mở bản web trên Chrome.',
        );
      }

      throw error;
    }
  }

  private mapNativeError(error: any): Error {
    const code = error?.code ?? '';
    const message = error?.message ?? '';

    if (code.includes('canceled') || code.includes('cancelled')) {
      return new Error('Bạn đã hủy đăng nhập Google. Vui lòng thử lại.');
    }

    if (
      message.includes('12500') ||
      message.toLowerCase().includes('developer error') ||
      message.includes('default_web_client_id')
    ) {
      return new Error(
        'Google Sign-In Android chưa cấu hình đúng OAuth. ' +
          'Cần thêm google-services.json đúng package com.dalatfarm.app và SHA-1/SHA-256 trong Firebase Console.',
      );
    }

    return new Error(
      message || 'Không thể đăng nhập Google trên thiết bị này.',
    );
  }
}
