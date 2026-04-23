import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { collection, deleteDoc, doc, Firestore, getDoc, getDocs, getFirestore, setDoc } from 'firebase/firestore';
import { environment } from '../../environments/environment';

export interface StorageWriteError {
  key: string;
  message: string;
  code?: string;
  details?: string;
  occurredAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseStorageService {
  private firebaseApp: FirebaseApp;
  private firestore: Firestore;
  private cache = new Map<string, unknown>();
  private writeErrors = new Map<string, StorageWriteError>();
  private writeErrorSubject = new BehaviorSubject<StorageWriteError | null>(null);
  private readyPromise: Promise<void>;
  private readonly appStateCollection = 'app_state';
  private readonly productsChunkCollection = 'app_state_products';
  private readonly productsMetaKey = 'products_meta_v2';
  private readonly productsChunkSize = 20;
  private readonly legacyMigrationKey = 'legacyMigrationDoneV1';
  private readonly legacyCleanupCountdownKey = 'legacyCleanupCountdownV1';
  private readonly cleanupRunsBeforeDelete = 3;

  constructor() {
    this.firebaseApp = getApps()[0] ?? initializeApp(environment.firebaseConfig);
    this.firestore = getFirestore(this.firebaseApp);
    this.readyPromise = this.bootstrap();
  }

  ready(): Promise<void> {
    return this.readyPromise;
  }

  get writeError$(): Observable<StorageWriteError | null> {
    return this.writeErrorSubject.asObservable();
  }

  getLastWriteError(key: string): StorageWriteError | null {
    return this.writeErrors.get(key) ?? null;
  }

  getItem<T>(key: string, fallback: T): T {
    if (!this.cache.has(key)) {
      const localValue = this.readLocalFallback(key);
      if (localValue !== undefined) {
        this.cache.set(key, localValue);
        return localValue as T;
      }

      this.cache.set(key, fallback);
      return fallback;
    }

    return this.cache.get(key) as T;
  }

  async setItem<T>(key: string, value: T): Promise<boolean> {
    this.cache.set(key, value);
    this.writeLocalFallback(key, value);

    try {
      if (key === 'products' && Array.isArray(value)) {
        await this.setProductsChunks(value as unknown[]);
        this.clearWriteError(key);
        return true;
      }

      const ref = doc(this.firestore, this.appStateCollection, key);
      await setDoc(ref, { value: this.sanitizeForFirestore(value), updatedAt: Date.now() });
      this.clearWriteError(key);
      return true;
    } catch (error) {
      console.warn('Firebase save failed for key:', key, error);
      this.recordWriteError(key, error, 'Không thể lưu dữ liệu lên Firebase');
      return false;
    }
  }

  async removeItem(key: string): Promise<boolean> {
    this.cache.delete(key);
    this.removeLocalFallback(key);

    try {
      if (key === 'products') {
        await this.removeProductsChunks();
      }

      const ref = doc(this.firestore, this.appStateCollection, key);
      await deleteDoc(ref);
      this.clearWriteError(key);
      return true;
    } catch (error) {
      console.warn('Firebase delete failed for key:', key, error);
      this.recordWriteError(key, error, 'Không thể xóa dữ liệu trên Firebase');
      return false;
    }
  }

  private async bootstrap(): Promise<void> {
    const keys = ['currentUser', 'guestMode', 'users', 'passwords', 'favorites', 'cart', 'orders', 'products'];

    try {
      const snapshot = await getDocs(collection(this.firestore, this.appStateCollection));
      snapshot.forEach(docSnapshot => {
        const data = docSnapshot.data();
        this.cache.set(docSnapshot.id, data['value']);
      });
    } catch (error) {
      console.warn('Firebase app_state bootstrap load failed:', error);
    }

    const chunkedProducts = await this.loadProductsChunks();
    if (chunkedProducts) {
      this.cache.set('products', chunkedProducts);
    } else {
      const legacyProducts = this.cache.get('products');
      if (Array.isArray(legacyProducts) && legacyProducts.length > 0) {
        await this.tryMigrateProductsToChunks(legacyProducts);
      }
    }

    await this.migrateLegacyLocalStorage(keys);
    this.loadLocalFallbackCache();
  }

  private loadLocalFallbackCache(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const allowedKeyPattern = /^(currentUser|guestMode|users|passwords|favorites|products|cart_(?:user_.+|guest_local)|orders_(?:user_.+|guest_local))$/;

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !allowedKeyPattern.test(key) || this.cache.has(key)) {
        continue;
      }

      const localValue = this.readLegacyValue(key);
      if (localValue !== undefined) {
        this.cache.set(key, localValue);
      }
    }
  }

  private readLocalFallback(key: string): unknown {
    if (typeof localStorage === 'undefined') {
      return undefined;
    }

    const raw = localStorage.getItem(key);
    if (raw === null) {
      return undefined;
    }

    return this.readLegacyValue(key);
  }

  private writeLocalFallback<T>(key: string, value: T): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      if (typeof value === 'string') {
        localStorage.setItem(key, value);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.warn('Failed to write local fallback for key:', key, error);
    }
  }

  private removeLocalFallback(key: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(key);
  }

  private async migrateLegacyLocalStorage(keys: string[]): Promise<void> {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const migrationSnapshot = await this.tryGetDoc(this.legacyMigrationKey);
    if (migrationSnapshot?.exists()) {
      const data = migrationSnapshot.data();
      if (data['value'] === true) {
        this.runDelayedLegacyCleanup(keys);
        return;
      }
    }

    let migratedAnyData = false;
    let migrationFailed = false;

    for (const key of keys) {
      if (this.cache.has(key)) {
        continue;
      }

      const legacyValue = this.readLegacyValue(key);
      if (legacyValue === undefined) {
        continue;
      }

      this.cache.set(key, legacyValue);
      migratedAnyData = true;

      try {
        await this.setItem(key, legacyValue);
      } catch (error) {
        console.warn('Legacy migration save failed for key:', key, error);
        migrationFailed = true;
      }
    }

    if (migratedAnyData) {
      console.log('Legacy localStorage data migrated to Firebase.');
    }

    if (migrationFailed) {
      console.warn('Legacy migration incomplete. Local cleanup postponed to prevent data loss.');
      return;
    }

    try {
      const ref = doc(this.firestore, this.appStateCollection, this.legacyMigrationKey);
      await setDoc(ref, { value: true, updatedAt: Date.now() });
    } catch (error) {
      console.warn('Legacy migration flag save failed:', error);
    }

    localStorage.setItem(this.legacyMigrationKey, 'true');
    this.initializeCleanupCountdown();
    this.runDelayedLegacyCleanup(keys);
  }

  private initializeCleanupCountdown(): void {
    const current = Number(localStorage.getItem(this.legacyCleanupCountdownKey));
    if (!Number.isFinite(current) || current < 0) {
      localStorage.setItem(this.legacyCleanupCountdownKey, String(this.cleanupRunsBeforeDelete));
    }
  }

  private runDelayedLegacyCleanup(keys: string[]): void {
    const current = Number(localStorage.getItem(this.legacyCleanupCountdownKey));
    const remainingRuns = Number.isFinite(current) && current >= 0
      ? current
      : this.cleanupRunsBeforeDelete;

    if (remainingRuns > 0) {
      localStorage.setItem(this.legacyCleanupCountdownKey, String(remainingRuns - 1));
      return;
    }

    for (const key of keys) {
      localStorage.removeItem(key);
    }

    localStorage.removeItem(this.legacyCleanupCountdownKey);
    console.log('Legacy localStorage data cleaned up after migration.');
  }

  private readLegacyValue(key: string): unknown {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return undefined;
    }

    if (key === 'guestMode') {
      return raw === 'true';
    }

    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  private async tryGetDoc(key: string) {
    try {
      const ref = doc(this.firestore, this.appStateCollection, key);
      return await getDoc(ref);
    } catch {
      return null;
    }
  }

  private async loadProductsChunks(): Promise<unknown[] | null> {
    try {
      const metaRef = doc(this.firestore, this.appStateCollection, this.productsMetaKey);
      const metaSnapshot = await getDoc(metaRef);
      if (!metaSnapshot.exists()) {
        return null;
      }

      const chunksSnapshot = await getDocs(collection(this.firestore, this.productsChunkCollection));
      const chunks = chunksSnapshot.docs
        .map(chunkDoc => {
          const chunkData = chunkDoc.data();
          return {
            index: Number(chunkData['index'] ?? 0),
            value: Array.isArray(chunkData['value']) ? chunkData['value'] : [],
          };
        })
        .sort((a, b) => a.index - b.index);

      return chunks.reduce<unknown[]>((accumulator, chunk) => {
        accumulator.push(...chunk.value);
        return accumulator;
      }, []);
    } catch (error) {
      console.warn('Failed to load chunked products from Firebase:', error);
      return null;
    }
  }

  private async setProductsChunks(products: unknown[]): Promise<void> {
    const chunks: unknown[][] = [];
    for (let i = 0; i < products.length; i += this.productsChunkSize) {
      chunks.push(products.slice(i, i + this.productsChunkSize));
    }

    const chunkSnapshot = await getDocs(collection(this.firestore, this.productsChunkCollection));
    const staleChunkIds = new Set(chunkSnapshot.docs.map(chunkDoc => chunkDoc.id));

    for (let index = 0; index < chunks.length; index += 1) {
      const chunkId = `chunk_${index}`;
      staleChunkIds.delete(chunkId);

      const chunkRef = doc(this.firestore, this.productsChunkCollection, chunkId);
      await setDoc(chunkRef, {
        index,
        value: this.sanitizeForFirestore(chunks[index]),
        updatedAt: Date.now(),
      });
    }

    for (const staleId of staleChunkIds) {
      await deleteDoc(doc(this.firestore, this.productsChunkCollection, staleId));
    }

    await setDoc(doc(this.firestore, this.appStateCollection, this.productsMetaKey), {
      value: {
        version: 1,
        chunkCount: chunks.length,
      },
      updatedAt: Date.now(),
    });

    await deleteDoc(doc(this.firestore, this.appStateCollection, 'products')).catch(() => undefined);
  }

  private async removeProductsChunks(): Promise<void> {
    const chunkSnapshot = await getDocs(collection(this.firestore, this.productsChunkCollection));
    await Promise.all(chunkSnapshot.docs.map(chunkDoc => deleteDoc(chunkDoc.ref)));
    await deleteDoc(doc(this.firestore, this.appStateCollection, this.productsMetaKey)).catch(() => undefined);
  }

  private async tryMigrateProductsToChunks(products: unknown[]): Promise<void> {
    try {
      await this.setProductsChunks(products);
      console.log('Migrated legacy products payload to chunked Firebase documents.');
    } catch (error) {
      console.warn('Failed to migrate products to chunked documents:', error);
    }
  }

  private clearWriteError(key: string): void {
    this.writeErrors.delete(key);
    this.writeErrorSubject.next(null);
  }

  private recordWriteError(key: string, error: unknown, fallbackMessage: string): void {
    const parsed = this.parseStorageError(error, fallbackMessage);
    const writeError: StorageWriteError = {
      key,
      message: parsed.message,
      code: parsed.code,
      details: parsed.details,
      occurredAt: Date.now(),
    };

    this.writeErrors.set(key, writeError);
    this.writeErrorSubject.next(writeError);
  }

  private parseStorageError(error: unknown, fallbackMessage: string): { message: string; code?: string; details?: string } {
    const errorObj = error as { code?: string; message?: string };
    const code = typeof errorObj?.code === 'string' ? errorObj.code : undefined;
    const rawMessage = typeof errorObj?.message === 'string' ? errorObj.message : '';
    const normalized = rawMessage.toLowerCase();

    if (code === 'permission-denied' || normalized.includes('permission denied')) {
      return {
        message: 'Firebase từ chối ghi dữ liệu (permission-denied). Kiểm tra Firestore Rules cho app_state/app_state_products.',
        code,
        details: rawMessage,
      };
    }

    if (normalized.includes('resource-exhausted') || normalized.includes('maximum document size') || normalized.includes('entity too large')) {
      return {
        message: 'Dữ liệu lưu quá lớn. Hãy giảm kích thước payload hoặc tách thêm chunk nhỏ hơn.',
        code,
        details: rawMessage,
      };
    }

    if (code === 'unavailable' || normalized.includes('network') || normalized.includes('offline')) {
      return {
        message: 'Mất kết nối Firebase khi lưu dữ liệu. Vui lòng kiểm tra mạng và thử lại.',
        code,
        details: rawMessage,
      };
    }

    if (normalized.includes('invalid time value') || normalized.includes('toisostring')) {
      return {
        message: 'Dữ liệu có trường ngày giờ không hợp lệ (Invalid Date). Hệ thống đã tự lọc dữ liệu lỗi trước khi lưu, vui lòng thử lại thao tác.',
        code,
        details: rawMessage,
      };
    }

    return {
      message: `${fallbackMessage}${rawMessage ? `: ${rawMessage}` : ''}`,
      code,
      details: rawMessage || undefined,
    };
  }

  private sanitizeForFirestore(value: unknown): unknown {
    if (value === null || value === undefined) {
      return null;
    }

    if (value instanceof Date) {
      const timestamp = value.getTime();
      return Number.isFinite(timestamp) ? value : null;
    }

    if (Array.isArray(value)) {
      return value.map(item => this.sanitizeForFirestore(item));
    }

    if (typeof value === 'object') {
      const result: Record<string, unknown> = {};
      Object.entries(value as Record<string, unknown>).forEach(([key, nestedValue]) => {
        if (nestedValue === undefined || typeof nestedValue === 'function' || typeof nestedValue === 'symbol') {
          return;
        }

        result[key] = this.sanitizeForFirestore(nestedValue);
      });

      return result;
    }

    return value;
  }
}
