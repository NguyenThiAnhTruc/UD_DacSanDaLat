import { Injectable, inject } from '@angular/core';
import { CanActivate, CanMatch, Route, Router, UrlSegment, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class SellerGuard implements CanActivate, CanMatch {
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

    // Only allow seller role (NOT admin)
    if (this.authService.isAuthenticated() && this.authService.isSeller()) {
      return true;
    }

    return this.router.parseUrl('/tabs/tab3');
  }
}
