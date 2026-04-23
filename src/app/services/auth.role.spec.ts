/// <reference types="jasmine" />

import { AuthService } from './auth.service';
import { BehaviorSubject } from 'rxjs';
import { User } from '../models/product.model';

describe('AuthService - Role Methods', () => {
  let service: AuthService;

  beforeEach(() => {
    // Avoid running AuthService constructor to keep unit tests isolated from Firebase setup.
    service = Object.create(AuthService.prototype) as AuthService;
    (service as any).currentUserSubject = new BehaviorSubject<User | null>(null);
  });

  describe('isAdmin()', () => {
    it('should return true when user role is admin', (done) => {
      const adminUser: User = {
        id: '123',
        name: 'Admin User',
        email: 'admin@test.com',
        phone: '0123456789',
        address: 'Test Address',
        avatar: 'avatar.jpg',
        role: 'admin',
      };

      // Mock currentUserSubject
      (service as any).currentUserSubject.next(adminUser);

      const result = service.isAdmin();
      expect(result).toBe(true);
      done();
    });

    it('should return false when user role is seller', (done) => {
      const sellerUser: User = {
        id: '123',
        name: 'Seller User',
        email: 'seller@test.com',
        phone: '0123456789',
        address: 'Test Address',
        avatar: 'avatar.jpg',
        role: 'seller',
      };

      (service as any).currentUserSubject.next(sellerUser);

      const result = service.isAdmin();
      expect(result).toBe(false);
      done();
    });

    it('should return false when user role is customer', (done) => {
      const customerUser: User = {
        id: '123',
        name: 'Customer User',
        email: 'customer@test.com',
        phone: '0123456789',
        address: 'Test Address',
        avatar: 'avatar.jpg',
        role: 'customer',
      };

      (service as any).currentUserSubject.next(customerUser);

      const result = service.isAdmin();
      expect(result).toBe(false);
      done();
    });

    it('should return false when no user is logged in', (done) => {
      (service as any).currentUserSubject.next(null);

      const result = service.isAdmin();
      expect(result).toBe(false);
      done();
    });
  });

  describe('isSeller()', () => {
    it('should return true when user role is seller', (done) => {
      const sellerUser: User = {
        id: '123',
        name: 'Seller User',
        email: 'seller@test.com',
        phone: '0123456789',
        address: 'Test Address',
        avatar: 'avatar.jpg',
        role: 'seller',
      };

      (service as any).currentUserSubject.next(sellerUser);

      const result = service.isSeller();
      expect(result).toBe(true);
      done();
    });

    it('should return true when user role is admin (admin has seller access)', (done) => {
      const adminUser: User = {
        id: '123',
        name: 'Admin User',
        email: 'admin@test.com',
        phone: '0123456789',
        address: 'Test Address',
        avatar: 'avatar.jpg',
        role: 'admin',
      };

      (service as any).currentUserSubject.next(adminUser);

      const result = service.isSeller();
      expect(result).toBe(true);
      done();
    });

    it('should return false when user role is customer', (done) => {
      const customerUser: User = {
        id: '123',
        name: 'Customer User',
        email: 'customer@test.com',
        phone: '0123456789',
        address: 'Test Address',
        avatar: 'avatar.jpg',
        role: 'customer',
      };

      (service as any).currentUserSubject.next(customerUser);

      const result = service.isSeller();
      expect(result).toBe(false);
      done();
    });

    it('should return false when no user is logged in', (done) => {
      (service as any).currentUserSubject.next(null);

      const result = service.isSeller();
      expect(result).toBe(false);
      done();
    });
  });

  describe('isStockManager()', () => {
    it('should return true when user role is admin', (done) => {
      const adminUser: User = {
        id: '123',
        name: 'Admin User',
        email: 'admin@test.com',
        phone: '0123456789',
        address: 'Test Address',
        avatar: 'avatar.jpg',
        role: 'admin',
      };

      (service as any).currentUserSubject.next(adminUser);

      const result = service.isStockManager();
      expect(result).toBe(true);
      done();
    });

    it('should return true when user role is seller', (done) => {
      const sellerUser: User = {
        id: '123',
        name: 'Seller User',
        email: 'seller@test.com',
        phone: '0123456789',
        address: 'Test Address',
        avatar: 'avatar.jpg',
        role: 'seller',
      };

      (service as any).currentUserSubject.next(sellerUser);

      const result = service.isStockManager();
      expect(result).toBe(true);
      done();
    });

    it('should return false when user role is customer', (done) => {
      const customerUser: User = {
        id: '123',
        name: 'Customer User',
        email: 'customer@test.com',
        phone: '0123456789',
        address: 'Test Address',
        avatar: 'avatar.jpg',
        role: 'customer',
      };

      (service as any).currentUserSubject.next(customerUser);

      const result = service.isStockManager();
      expect(result).toBe(false);
      done();
    });

    it('should return false when no user is logged in', (done) => {
      (service as any).currentUserSubject.next(null);

      const result = service.isStockManager();
      expect(result).toBe(false);
      done();
    });
  });

  describe('Authorization Role Hierarchy', () => {
    it('admin should have admin and seller access', (done) => {
      const adminUser: User = {
        id: '123',
        name: 'Admin User',
        email: 'admin@test.com',
        phone: '0123456789',
        address: 'Test Address',
        avatar: 'avatar.jpg',
        role: 'admin',
      };

      (service as any).currentUserSubject.next(adminUser);

      expect(service.isAdmin()).toBe(true);
      expect(service.isSeller()).toBe(true);
      expect(service.isStockManager()).toBe(true);
      done();
    });

    it('seller should have seller access but NOT admin access', (done) => {
      const sellerUser: User = {
        id: '123',
        name: 'Seller User',
        email: 'seller@test.com',
        phone: '0123456789',
        address: 'Test Address',
        avatar: 'avatar.jpg',
        role: 'seller',
      };

      (service as any).currentUserSubject.next(sellerUser);

      expect(service.isAdmin()).toBe(false);
      expect(service.isSeller()).toBe(true);
      expect(service.isStockManager()).toBe(true); // 👈 Seller can manage stock
      done();
    });

    it('customer should have NO special access', (done) => {
      const customerUser: User = {
        id: '123',
        name: 'Customer User',
        email: 'customer@test.com',
        phone: '0123456789',
        address: 'Test Address',
        avatar: 'avatar.jpg',
        role: 'customer',
      };

      (service as any).currentUserSubject.next(customerUser);

      expect(service.isAdmin()).toBe(false);
      expect(service.isSeller()).toBe(false);
      expect(service.isStockManager()).toBe(false);
      done();
    });
  });
});
