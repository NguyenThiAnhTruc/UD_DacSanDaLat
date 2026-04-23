import { Injectable, inject } from '@angular/core';
import { CanActivate, CanMatch, Route, Router, UrlSegment, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * StockManagerGuard - Protects stock management routes
 * Allows both Admin and Seller to access stock management pages
 */
@Injectable({
  providedIn: 'root',
})
export class StockManagerGuard implements CanActivate, CanMatch {
  private authService = inject(AuthService);
  private router = inject(Router);

  async canActivate(): Promise<boolean | UrlTree> {
    return this.checkAccess();
  }

  async canMatch(_route: Route, _segments: UrlSegment[]): Promise<boolean | UrlTree> {
    return this.checkAccess();
  }

  private async checkAccess(): Promise<boolean | UrlTree> {
    await this.authService.waitForAuthReady();

    // Allow both admin and seller to manage stock
    if (this.authService.isAuthenticated() && this.authService.isStockManager()) {
      return true;
    }

    return this.router.parseUrl('/tabs/tab3');
  }
}
