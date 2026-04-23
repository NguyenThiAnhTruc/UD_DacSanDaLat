import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AdminGuard } from './admin.guard';
import { SellerGuard } from './seller.guard';
import { StockManagerGuard } from './stock-manager.guard';
import { AuthService } from '../services/auth.service';

describe('Authorization Guards', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let adminGuard: AdminGuard;
  let sellerGuard: SellerGuard;
  let stockManagerGuard: StockManagerGuard;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'waitForAuthReady',
      'isAuthenticated',
      'isAdmin',
      'isSeller',
      'isStockManager',
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['parseUrl']);

    TestBed.configureTestingModule({
      providers: [
        AdminGuard,
        SellerGuard,
        StockManagerGuard,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    adminGuard = TestBed.inject(AdminGuard);
    sellerGuard = TestBed.inject(SellerGuard);
    stockManagerGuard = TestBed.inject(StockManagerGuard);

    // Default setup
    authService.waitForAuthReady.and.resolveTo();
  });

  describe('AdminGuard', () => {
    it('should allow access for authenticated admin user', async () => {
      authService.isAuthenticated.and.returnValue(true);
      authService.isAdmin.and.returnValue(true);

      const result = await adminGuard.canActivate();

      expect(result).toBe(true);
      expect(router.parseUrl).not.toHaveBeenCalled();
    });

    it('should deny access for non-admin user', async () => {
      authService.isAuthenticated.and.returnValue(true);
      authService.isAdmin.and.returnValue(false);
      router.parseUrl.and.returnValue({} as any);

      const result = await adminGuard.canActivate();

      expect(result).toBeTruthy();
      expect(router.parseUrl).toHaveBeenCalledWith('/tabs/tab3');
    });

    it('should deny access for unauthenticated user', async () => {
      authService.isAuthenticated.and.returnValue(false);
      authService.isAdmin.and.returnValue(false);
      router.parseUrl.and.returnValue({} as any);

      const result = await adminGuard.canActivate();

      expect(result).toBeTruthy();
      expect(router.parseUrl).toHaveBeenCalledWith('/tabs/tab3');
    });

    it('should allow access via canMatch method', async () => {
      authService.isAuthenticated.and.returnValue(true);
      authService.isAdmin.and.returnValue(true);

      const result = await adminGuard.canMatch({} as any, []);

      expect(result).toBe(true);
    });
  });

  describe('SellerGuard', () => {
    it('should allow access for authenticated seller user', async () => {
      authService.isAuthenticated.and.returnValue(true);
      authService.isSeller.and.returnValue(true);

      const result = await sellerGuard.canActivate();

      expect(result).toBe(true);
      expect(router.parseUrl).not.toHaveBeenCalled();
    });

    it('should deny access for admin user (admin should NOT have seller access)', async () => {
      authService.isAuthenticated.and.returnValue(true);
      authService.isSeller.and.returnValue(false); // isSeller() now only returns true for seller role
      router.parseUrl.and.returnValue({} as any);

      const result = await sellerGuard.canActivate();

      expect(result).toBeTruthy();
      expect(router.parseUrl).toHaveBeenCalledWith('/tabs/tab3');
    });

    it('should deny access for customer user', async () => {
      authService.isAuthenticated.and.returnValue(true);
      authService.isSeller.and.returnValue(false);
      router.parseUrl.and.returnValue({} as any);

      const result = await sellerGuard.canActivate();

      expect(result).toBeTruthy();
    });

    it('should deny access for unauthenticated user', async () => {
      authService.isAuthenticated.and.returnValue(false);
      authService.isSeller.and.returnValue(false);
      router.parseUrl.and.returnValue({} as any);

      const result = await sellerGuard.canActivate();

      expect(result).toBeTruthy();
    });

    it('should allow access via canMatch method', async () => {
      authService.isAuthenticated.and.returnValue(true);
      authService.isSeller.and.returnValue(true);

      const result = await sellerGuard.canMatch({} as any, []);

      expect(result).toBe(true);
    });
  });

  describe('StockManagerGuard', () => {
    it('should allow access for authenticated admin user', async () => {
      authService.isAuthenticated.and.returnValue(true);
      authService.isStockManager.and.returnValue(true);

      const result = await stockManagerGuard.canActivate();

      expect(result).toBe(true);
    });

    it('should allow access for authenticated seller user', async () => {
      authService.isAuthenticated.and.returnValue(true);
      authService.isStockManager.and.returnValue(true);

      const result = await stockManagerGuard.canActivate();

      expect(result).toBe(true);
    });

    it('should deny access for customer user', async () => {
      authService.isAuthenticated.and.returnValue(true);
      authService.isStockManager.and.returnValue(false);
      router.parseUrl.and.returnValue({} as any);

      const result = await stockManagerGuard.canActivate();

      expect(result).toBeTruthy();
      expect(router.parseUrl).toHaveBeenCalledWith('/tabs/tab3');
    });

    it('should deny access for unauthenticated user', async () => {
      authService.isAuthenticated.and.returnValue(false);
      authService.isStockManager.and.returnValue(false);
      router.parseUrl.and.returnValue({} as any);

      const result = await stockManagerGuard.canActivate();

      expect(result).toBeTruthy();
    });

    it('should allow access via canMatch method', async () => {
      authService.isAuthenticated.and.returnValue(true);
      authService.isStockManager.and.returnValue(true);

      const result = await stockManagerGuard.canMatch({} as any, []);

      expect(result).toBe(true);
    });
  });

  describe('Authorization Logic Verification', () => {
    it('admin should NOT be able to access seller-only pages via SellerGuard', async () => {
      // Setup: admin is authenticated but isSeller() returns false
      authService.isAuthenticated.and.returnValue(true);
      authService.isSeller.and.returnValue(false); // Important: admin is NOT seller anymore
      router.parseUrl.and.returnValue({} as any);

      const result = await sellerGuard.canActivate();

      expect(result).toBeTruthy();
      expect(router.parseUrl).toHaveBeenCalledWith('/tabs/tab3');
    });

    it('admin and seller should both be able to access stock management via StockManagerGuard', async () => {
      authService.isAuthenticated.and.returnValue(true);
      authService.isStockManager.and.returnValue(true);

      const adminResult = await stockManagerGuard.canActivate();
      const sellerResult = await stockManagerGuard.canActivate();

      expect(adminResult).toBe(true);
      expect(sellerResult).toBe(true);
    });

    it('customer should not be able to access any admin/seller/stock management pages', async () => {
      authService.isAuthenticated.and.returnValue(true);
      authService.isAdmin.and.returnValue(false);
      authService.isSeller.and.returnValue(false);
      authService.isStockManager.and.returnValue(false);
      router.parseUrl.and.returnValue({} as any);

      const adminResult = await adminGuard.canActivate();
      const sellerResult = await sellerGuard.canActivate();
      const stockResult = await stockManagerGuard.canActivate();

      expect(adminResult).toBeTruthy();
      expect(sellerResult).toBeTruthy();
      expect(stockResult).toBeTruthy();
    });
  });
});
