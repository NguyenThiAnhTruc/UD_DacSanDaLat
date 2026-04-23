import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { ProductService } from './product.service';
import { OrderService } from './order.service';
import { FirebaseStorageService } from './firebase-storage.service';
import { AuthService } from './auth.service';
import { User } from '../models/product.model';

describe('OrderService integration', () => {
  let productService: ProductService;
  let orderService: OrderService;
  let storageSpy: jasmine.SpyObj<FirebaseStorageService>;

  beforeEach(fakeAsync(() => {
    const storageState = new Map<string, unknown>();

    storageSpy = jasmine.createSpyObj<FirebaseStorageService>('FirebaseStorageService', [
      'getItem',
      'setItem',
      'ready',
    ]);
    storageSpy.ready.and.returnValue(Promise.resolve());
    storageSpy.getItem.and.callFake(<T>(key: string, fallback: T): T => {
      if (storageState.has(key)) {
        return storageState.get(key) as T;
      }
      return fallback;
    });
    storageSpy.setItem.and.callFake(async <T>(key: string, value: T): Promise<boolean> => {
      storageState.set(key, value);
      return true;
    });

    const authStub = {
      currentUser$: new BehaviorSubject<User | null>(null),
      isGuestMode$: new BehaviorSubject<boolean>(false),
      getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue(null),
      isGuestMode: jasmine.createSpy('isGuestMode').and.returnValue(false),
    };

    TestBed.configureTestingModule({
      providers: [
        ProductService,
        OrderService,
        { provide: FirebaseStorageService, useValue: storageSpy },
        { provide: AuthService, useValue: authStub },
      ],
    });

    productService = TestBed.inject(ProductService);
    orderService = TestBed.inject(OrderService);
    flush();
  }));

  it('exposes the same order stream as ProductService after checkout', () => {
    const firstProduct = productService.getProducts()[0];
    productService.addToCart(firstProduct, 2);

    const createdOrder = productService.createOrder(
      'Nguyen Van A',
      '0909000001',
      'Da Lat',
      'Giao nhanh giup minh'
    );

    const latestOrders = orderService.getOrders();

    expect(latestOrders.length).toBe(1);
    expect(latestOrders[0].id).toBe(createdOrder.id);
    expect(latestOrders[0].orderNote).toBe('Giao nhanh giup minh');
  });

  it('keeps order history consistent when cancelOrder is called from OrderService', () => {
    const firstProduct = productService.getProducts()[0];
    const stockBefore = firstProduct.stock;

    productService.addToCart(firstProduct, 1);
    const createdOrder = productService.createOrder('Nguyen Van A', '0909000001', 'Da Lat');

    const cancelResult = orderService.cancelOrder(createdOrder.id);
    const updatedOrder = orderService.getOrderById(createdOrder.id);
    const stockAfter = productService.getProducts().find(p => p.id === firstProduct.id)?.stock;

    expect(cancelResult).toBeTrue();
    expect(updatedOrder?.status).toBe('cancelled');
    expect(stockAfter).toBe(stockBefore);
  });

  it('follows sequential flow to completed and records completion timestamp', () => {
    const firstProduct = productService.getProducts()[0];
    productService.addToCart(firstProduct, 1);
    const createdOrder = productService.createOrder('Nguyen Van A', '0909000001', 'Da Lat');

    expect(orderService.updateOrderStatus(createdOrder.id, 'confirmed')).toBeTrue();
    expect(orderService.updateOrderStatus(createdOrder.id, 'processing')).toBeTrue();
    expect(orderService.updateOrderStatus(createdOrder.id, 'shipping')).toBeTrue();
    expect(orderService.updateOrderStatus(createdOrder.id, 'delivered')).toBeTrue();
    expect(orderService.updateOrderStatus(createdOrder.id, 'completed')).toBeTrue();

    const updatedOrder = orderService.getOrderById(createdOrder.id);
    expect(updatedOrder?.status).toBe('completed');
    expect(updatedOrder?.completedAt).toBeDefined();
  });

  it('rejects skipping status steps', () => {
    const firstProduct = productService.getProducts()[0];
    productService.addToCart(firstProduct, 1);
    const createdOrder = productService.createOrder('Nguyen Van A', '0909000001', 'Da Lat');

    expect(orderService.updateOrderStatus(createdOrder.id, 'shipping')).toBeFalse();
    expect(orderService.getOrderById(createdOrder.id)?.status).toBe('awaiting_payment');
  });
});
