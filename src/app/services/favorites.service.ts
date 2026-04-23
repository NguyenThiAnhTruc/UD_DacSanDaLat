import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { FirebaseStorageService } from './firebase-storage.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private storage = inject(FirebaseStorageService);
  private authService = inject(AuthService);

  private favoritesSubject = new BehaviorSubject<number[]>([]);
  public favorites$: Observable<number[]> = this.favoritesSubject.asObservable();
  private currentScope = '';

  constructor() {
    void this.initialize();

    this.authService.currentUser$.subscribe(() => {
      void this.loadFavoritesForScope();
    });

    this.authService.isGuestMode$.subscribe(() => {
      void this.loadFavoritesForScope();
    });
  }

  getFavoriteIds(): number[] {
    return this.favoritesSubject.value;
  }

  isFavorite(productId: number): boolean {
    return this.favoritesSubject.value.includes(productId);
  }

  async toggleFavorite(productId: number): Promise<boolean> {
    const favorites = [...this.favoritesSubject.value];
    const index = favorites.indexOf(productId);

    if (index >= 0) {
      favorites.splice(index, 1);
      await this.saveFavorites(favorites);
      return false;
    }

    favorites.push(productId);
    await this.saveFavorites(favorites);
    return true;
  }

  async removeFavorite(productId: number): Promise<void> {
    const favorites = this.favoritesSubject.value.filter(id => id !== productId);
    await this.saveFavorites(favorites);
  }

  async clearAllFavorites(): Promise<void> {
    await this.saveFavorites([]);
  }

  private async initialize(): Promise<void> {
    await this.storage.ready();
    await this.loadFavoritesForScope(true);
  }

  private async saveFavorites(favorites: number[]): Promise<void> {
    this.favoritesSubject.next(favorites);
    await this.storage.setItem(this.getFavoritesKey(), favorites);
  }

  private async loadFavoritesForScope(forceReload: boolean = false): Promise<void> {
    await this.storage.ready();

    const nextScope = this.getStateScope();
    if (!forceReload && nextScope === this.currentScope) {
      return;
    }

    const previousScope = this.currentScope;
    let favorites = this.storage.getItem<number[]>(this.getFavoritesKey(nextScope), []);

    if (previousScope.startsWith('guest_') && nextScope.startsWith('user_') && favorites.length === 0) {
      const guestFavorites = this.storage.getItem<number[]>(this.getFavoritesKey(previousScope), []);
      if (guestFavorites.length > 0) {
        favorites = [...guestFavorites];
        await this.storage.setItem(this.getFavoritesKey(nextScope), favorites);
      }
    }

    this.currentScope = nextScope;
    this.favoritesSubject.next(favorites);
  }

  private getStateScope(): string {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      return `user_${currentUser.id}`;
    }

    return 'guest_local';
  }

  private getFavoritesKey(scope: string = this.currentScope || this.getStateScope()): string {
    return `favorites_${scope}`;
  }
}
