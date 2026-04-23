import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { ProductService } from './product.service';
import { FirebaseStorageService } from './firebase-storage.service';
import { AuthService } from './auth.service';
import { ProductBatch, User } from '../models/product.model';

describe('ProductService – business logic', () => {
  let service: ProductService;
  let storageSpy: jasmine.SpyObj<FirebaseStorageService>;

  beforeEach(fakeAsync(() => {
    const storageState = new Map<string, unknown>();

    storageSpy = jasmine.createSpyObj<FirebaseStorageService>(
      'FirebaseStorageService',
      ['getItem', 'setItem', 'ready']
    );
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
        { provide: FirebaseStorageService, useValue: storageSpy },
        { provide: AuthService, useValue: authStub },
      ],
    });

    service = TestBed.inject(ProductService);
    // Let all promises from initializeState and loadScopedState settle
    flush();
  }));

  // ─────────────────────────── createOrder ───────────────────────────

  describe('createOrder', () => {
    beforeEach(() => {
      // Put the first default product (stock: 50) into the cart, qty = 1
      service.addToCart(service.getProducts()[0]);
    });

    it('deducts stock for each ordered item', () => {
      const firstProduct = service.getProducts()[0];
      const stockBefore = firstProduct.stock;

      service.createOrder('Nguyễn A', '0909000001', 'Đà Lạt');

      const stockAfter = service.getProducts().find(p => p.id === firstProduct.id)!.stock;
      expect(stockAfter).toBe(stockBefore - 1);
    });

    it('saves orderNote on the returned order', () => {
      const note = 'Giao buổi sáng nhé';
      const order = service.createOrder('Nguyễn A', '0909000001', 'Đà Lạt', note);

      expect(order.orderNote).toBe(note);
    });

    it('trims whitespace from orderNote', () => {
      const order = service.createOrder('Nguyễn A', '0909000001', 'Đà Lạt', '  nhẹ tay  ');

      expect(order.orderNote).toBe('nhẹ tay');
    });

    it('stores empty string when no orderNote is supplied', () => {
      const order = service.createOrder('Nguyễn A', '0909000001', 'Đà Lạt');

      expect(order.orderNote).toBe('');
    });

    it('appends the new order to the orders list', () => {
      service.createOrder('Nguyễn A', '0909000001', 'Đà Lạt');

      expect(service.getOrders().length).toBe(1);
    });

    it('clears the cart after the order is placed', () => {
      service.createOrder('Nguyễn A', '0909000001', 'Đà Lạt');

      expect(service.getCart().length).toBe(0);
    });

    it('throws when cart becomes stale after stock drops and keeps stock unchanged', () => {
      const product = service.getProducts()[0];
      const staleQuantity = 1;

      // Simulate another checkout/source that depletes inventory after this cart was created.
      (service as any).products = (service as any).products.map((item: any) =>
        item.id === product.id
          ? { ...item, stock: 0, inventory: { ...(item.inventory || {}), stockQuantity: 0 } }
          : item
      );
      (service as any).productsSubject.next((service as any).products);

      expect(() => service.createOrder('Nguyễn A', '0909000001', 'Đà Lạt'))
        .toThrowError(`Sản phẩm ${product.name} không đủ tồn kho`);

      const stockAfter = service.getProducts().find(p => p.id === product.id)!.stock;
      expect(stockAfter).toBe(0);
      expect(service.getCart().find(item => item.product.id === product.id)?.quantity).toBe(staleQuantity);
    });
  });

  // ─────────────────────────── cancelOrder ───────────────────────────

  describe('cancelOrder', () => {
    it('restores stock when a pending order is cancelled', () => {
      const firstProduct = service.getProducts()[0];
      const stockBefore = firstProduct.stock;

      service.addToCart(firstProduct);
      const order = service.createOrder('Nguyễn A', '0909000001', 'Đà Lạt');

      // stock deducted by 1
      expect(service.getProducts().find(p => p.id === firstProduct.id)!.stock)
        .toBe(stockBefore - 1);

      const success = service.cancelOrder(order.id);
      expect(success).toBeTrue();

      // stock should be fully restored
      expect(service.getProducts().find(p => p.id === firstProduct.id)!.stock)
        .toBe(stockBefore);
    });

    it('marks the order status as cancelled', () => {
      service.addToCart(service.getProducts()[0]);
      const order = service.createOrder('Nguyễn A', '0909000001', 'Đà Lạt');

      service.cancelOrder(order.id);

      expect(service.getOrderById(order.id)!.status).toBe('cancelled');
    });

    it('returns false for a non-existent order id', () => {
      expect(service.cancelOrder('NON_EXISTENT')).toBeFalse();
    });

    it('returns false and does not restore stock for an already-delivered order', () => {
      service.addToCart(service.getProducts()[0]);
      const firstProduct = service.getProducts()[0];
      const order = service.createOrder('Nguyễn A', '0909000001', 'Đà Lạt');
      service.updateOrderStatus(order.id, 'confirmed');
      service.updateOrderStatus(order.id, 'processing');
      service.updateOrderStatus(order.id, 'shipping');
      service.updateOrderStatus(order.id, 'delivered');

      const stockBeforeAttempt = service.getProducts().find(p => p.id === firstProduct.id)!.stock;
      const result = service.cancelOrder(order.id);

      expect(result).toBeFalse();
      // stock must remain unchanged
      expect(service.getProducts().find(p => p.id === firstProduct.id)!.stock)
        .toBe(stockBeforeAttempt);
    });

    it('returns false for an already-cancelled order', () => {
      service.addToCart(service.getProducts()[0]);
      const order = service.createOrder('Nguyễn A', '0909000001', 'Đà Lạt');

      service.cancelOrder(order.id);        // first cancel succeeds
      expect(service.cancelOrder(order.id)).toBeFalse(); // second must fail
    });

    it('syncs cancelled status to global orders', () => {
      const product = service.getProducts()[0];
      service.addToCart(product);
      const order = service.createOrder('Nguyễn A', '0909000001', 'Đà Lạt', '', 'cod', 'paid');

      const cancelled = service.cancelOrder(order.id);
      const globalOrder = service.getAllOrdersForSeller().find(item => item.id === order.id);

      expect(cancelled).toBeTrue();
      expect(globalOrder?.status).toBe('cancelled');
      expect(globalOrder?.paymentStatus).toBe('refunded');
      expect(globalOrder?.cancelledAt).toBeDefined();
    });
  });

  describe('order status flow', () => {
    it('rejects invalid status jumps and allows sequential transition only', () => {
      service.addToCart(service.getProducts()[0]);
      const order = service.createOrder('Nguyễn A', '0909000001', 'Đà Lạt');

      const invalidJump = service.updateOrderStatus(order.id, 'shipping');
      const toConfirmed = service.updateOrderStatus(order.id, 'confirmed');

      expect(invalidJump).toBeFalse();
      expect(toConfirmed).toBeTrue();
      expect(service.getOrderById(order.id)?.status).toBe('confirmed');
    });

    it('sets deliveredAt when transitioning to delivered', () => {
      service.addToCart(service.getProducts()[0]);
      const order = service.createOrder('Nguyễn A', '0909000001', 'Đà Lạt');

      service.updateOrderStatus(order.id, 'confirmed');
      service.updateOrderStatus(order.id, 'processing');
      service.updateOrderStatus(order.id, 'shipping');
      const delivered = service.updateOrderStatus(order.id, 'delivered');

      const updated = service.getOrderById(order.id)!;
      expect(delivered).toBeTrue();
      expect(updated.status).toBe('delivered');
      expect(updated.deliveredAt).toBeDefined();
      expect(updated.completedAt).toBeUndefined();
    });

    it('supports delivered to completed transition and records completedAt', () => {
      service.addToCart(service.getProducts()[0]);
      const order = service.createOrder('Nguyễn A', '0909000001', 'Đà Lạt');

      service.updateOrderStatus(order.id, 'confirmed');
      service.updateOrderStatus(order.id, 'processing');
      service.updateOrderStatus(order.id, 'shipping');
      service.updateOrderStatus(order.id, 'delivered');

      const completed = service.updateOrderStatus(order.id, 'completed');
      const updated = service.getOrderById(order.id)!;
      const global = service.getAllOrdersForSeller().find(item => item.id === order.id)!;

      expect(completed).toBeTrue();
      expect(updated.status).toBe('completed');
      expect(updated.deliveredAt).toBeDefined();
      expect(updated.completedAt).toBeDefined();
      expect(global.status).toBe('completed');
      expect(global.completedAt).toBeDefined();
    });
  });

  // ───────────────────────── rating and inventory ─────────────────────────

  describe('ratings and stock operations', () => {
    it('adds a review and recalculates average rating', () => {
      const product = service.getProducts()[0];
      const initialCount = product.reviewCount || 0;

      const success = service.addProductReview(product.id, 5, 'Rat ngon');
      expect(success).toBeTrue();

      const updated = service.getProductById(product.id)!;
      expect((updated.reviewCount || 0)).toBe(initialCount + 1);
      expect((updated.reviews || [])[0].rating).toBe(5);
      expect(updated.rating).toBeDefined();
    });

    it('restocks inventory and records movement', () => {
      const product = service.getProducts()[0];
      const before = product.stock;

      const success = service.restockProduct(product.id, 7, 'Nhap hang thu nghiem');
      expect(success).toBeTrue();

      const updated = service.getProductById(product.id)!;
      expect(updated.stock).toBe(before + 7);

      const movements = service.getStockMovements(product.id);
      expect(movements.length).toBeGreaterThan(0);
      expect(movements[0].type).toBe('restock');
      expect(movements[0].quantity).toBe(7);
      expect(movements[0].actorName).toBeTruthy();
    });

    it('records sale and cancel_refund movements around order lifecycle', () => {
      const product = service.getProducts()[0];
      service.addToCart(product, 2);
      const order = service.createOrder('Nguyen A', '0909000001', 'Da Lat');
      service.cancelOrder(order.id);

      const movements = service.getStockMovements(product.id);
      const movementTypes = movements.map(item => item.type);

      expect(movementTypes).toContain('sale');
      expect(movementTypes).toContain('cancel_refund');
    });

    it('builds aggregated inventory audit rows for stock and traceability export', () => {
      const rows = service.getInventoryAuditRows();

      expect(rows.length).toBeGreaterThan(0);
      expect(rows.some(row => !!row.traceOccurredAt)).toBeTrue();

      service.restockProduct(service.getProducts()[0].id, 5, 'Nhap kho test');
      const updatedRows = service.getInventoryAuditRows();
      expect(updatedRows.some(row => row.movementType === 'restock')).toBeTrue();
    });

    it('adds a custom traceability event and returns it in timeline', () => {
      const product = service.getProducts()[0];
      const occurredAt = new Date();
      occurredAt.setDate(occurredAt.getDate() - 1);

      const result = service.addTraceabilityEvent(product.id, {
        stage: 'Sơ chế',
        description: 'Sơ chế và phân loại sau thu hoạch tại kho lạnh',
        occurredAt,
        icon: 'cube-outline',
      });

      expect(result.success).toBeTrue();
      const timeline = service.getTraceabilityTimeline(product.id);
      expect(timeline.some(item => item.stage === 'Sơ chế')).toBeTrue();
    });

    it('rejects traceability event in the future', () => {
      const product = service.getProducts()[0];
      const future = new Date(Date.now() + 60 * 60 * 1000);

      const result = service.addTraceabilityEvent(product.id, {
        stage: 'Vận chuyển',
        description: 'Lô hàng đang được điều phối đến điểm bán',
        occurredAt: future,
      });

      expect(result.success).toBeFalse();
    });

    it('rejects duplicated traceability event within same minute', () => {
      const product = service.getProducts()[0];
      const occurredAt = new Date();
      occurredAt.setDate(occurredAt.getDate() - 2);

      const first = service.addTraceabilityEvent(product.id, {
        stage: 'Đóng gói',
        description: 'Đóng gói theo tiêu chuẩn vệ sinh thực phẩm',
        occurredAt,
      });
      const second = service.addTraceabilityEvent(product.id, {
        stage: 'Đóng gói',
        description: 'Đóng gói theo tiêu chuẩn vệ sinh thực phẩm',
        occurredAt,
      });

      expect(first.success).toBeTrue();
      expect(second.success).toBeFalse();
    });
  });

  // ───────────────────────── edge cases: fifo/reserved/rollback ─────────────────────────

  describe('FIFO and rollback edge cases', () => {
    it('consumes stock by FIFO across multiple batches', () => {
      const product = service.getProducts()[0];
      const batches: ProductBatch[] = [
        {
          id: 'BATCH_OLD',
          batchCode: 'DL-OLD',
          harvestDate: new Date('2025-12-01T00:00:00.000Z'),
          expiryDate: new Date('2026-01-01T00:00:00.000Z'),
          quantity: 5,
          remainingQuantity: 5,
        },
        {
          id: 'BATCH_NEW',
          batchCode: 'DL-NEW',
          harvestDate: new Date('2026-01-01T00:00:00.000Z'),
          expiryDate: new Date('2026-02-01T00:00:00.000Z'),
          quantity: 20,
          remainingQuantity: 20,
        },
      ];

      const internalProducts = (service as any).products as Array<any>;
      const target = internalProducts.find(p => p.id === product.id);
      target.batches = batches;
      target.inventory = {
        stockQuantity: 25,
        reservedQuantity: 0,
        warehouseLocation: 'Kho test',
        lastUpdate: new Date(),
      };
      target.stock = 25;
      (service as any).persistProducts();

      service.addToCart(service.getProductById(product.id)!, 7);
      service.createOrder('Nguyen Van A', '0909000001', 'Da Lat');

      const updated = service.getProductById(product.id)!;
      const oldBatch = updated.batches!.find(batch => batch.id === 'BATCH_OLD')!;
      const newBatch = updated.batches!.find(batch => batch.id === 'BATCH_NEW')!;

      expect(oldBatch.remainingQuantity).toBe(0);
      expect(newBatch.remainingQuantity).toBe(18);
      expect(updated.inventory?.stockQuantity).toBe(18);
      expect(updated.inventory?.reservedQuantity).toBe(0);
    });

    it('restores reserved/stock correctly after first cancel and blocks second cancel', () => {
      const product = service.getProducts()[0];
      const beforeStock = product.stock;

      service.addToCart(product, 3);
      const created = service.createOrder('Nguyen Van A', '0909000001', 'Da Lat');

      const firstCancel = service.cancelOrder(created.id);
      const secondCancel = service.cancelOrder(created.id);
      const updatedProduct = service.getProductById(product.id)!;

      expect(firstCancel).toBeTrue();
      expect(secondCancel).toBeFalse();
      expect(updatedProduct.inventory?.stockQuantity).toBe(beforeStock);
      expect(updatedProduct.inventory?.reservedQuantity).toBe(0);

      // After rollback, placing the same quantity again must still be possible.
      service.addToCart(updatedProduct, 3);
      const reordered = service.createOrder('Nguyen Van A', '0909000001', 'Da Lat');
      expect(reordered.id).toBeTruthy();
    });

    it('rejects second checkout when using a stale cart snapshot (concurrent simulation)', () => {
      const product = service.getProducts()[0];
      const initialStock = product.stock;
      const desiredQuantity = initialStock;

      const staleCart = [{ product, quantity: desiredQuantity }];
      (service as any).cartSubject.next(staleCart);

      const firstOrder = service.createOrder('Nguyen Van A', '0909000001', 'Da Lat');
      expect(firstOrder.id).toBeTruthy();

      // Simulate another client still trying to checkout from stale cart state.
      (service as any).cartSubject.next(staleCart);

      expect(() => service.createOrder('Nguyen Van A', '0909000001', 'Da Lat'))
        .toThrowError(`Sản phẩm ${product.name} không đủ tồn kho`);

      const latest = service.getProductById(product.id)!;
      expect(latest.inventory?.stockQuantity).toBe(initialStock - desiredQuantity);
      expect(latest.inventory?.reservedQuantity).toBe(0);
    });

    it('handles checkout across more than two batches using FIFO order', () => {
      const product = service.getProducts()[0];
      const batches: ProductBatch[] = [
        {
          id: 'BATCH_A',
          batchCode: 'DL-A',
          harvestDate: new Date('2025-11-01T00:00:00.000Z'),
          expiryDate: new Date('2025-12-01T00:00:00.000Z'),
          quantity: 4,
          remainingQuantity: 4,
        },
        {
          id: 'BATCH_B',
          batchCode: 'DL-B',
          harvestDate: new Date('2025-12-01T00:00:00.000Z'),
          expiryDate: new Date('2026-01-01T00:00:00.000Z'),
          quantity: 6,
          remainingQuantity: 6,
        },
        {
          id: 'BATCH_C',
          batchCode: 'DL-C',
          harvestDate: new Date('2026-01-01T00:00:00.000Z'),
          expiryDate: new Date('2026-02-01T00:00:00.000Z'),
          quantity: 15,
          remainingQuantity: 15,
        },
      ];

      const internalProducts = (service as any).products as Array<any>;
      const target = internalProducts.find(p => p.id === product.id);
      target.batches = batches;
      target.inventory = {
        stockQuantity: 25,
        reservedQuantity: 0,
        warehouseLocation: 'Kho stress',
        lastUpdate: new Date(),
      };
      target.stock = 25;
      (service as any).persistProducts();

      service.addToCart(service.getProductById(product.id)!, 13);
      service.createOrder('Nguyen Van A', '0909000001', 'Da Lat');

      const updated = service.getProductById(product.id)!;
      expect(updated.batches!.find(batch => batch.id === 'BATCH_A')!.remainingQuantity).toBe(0);
      expect(updated.batches!.find(batch => batch.id === 'BATCH_B')!.remainingQuantity).toBe(0);
      expect(updated.batches!.find(batch => batch.id === 'BATCH_C')!.remainingQuantity).toBe(12);
      expect(updated.inventory?.stockQuantity).toBe(12);
      expect(updated.inventory?.reservedQuantity).toBe(0);
    });

    it('keeps inventory and batches synchronized across repeated cancel-checkout cycles', () => {
      const product = service.getProducts()[0];
      const baseStock = product.stock;

      for (let i = 0; i < 5; i += 1) {
        service.addToCart(service.getProductById(product.id)!, 3);
        const order = service.createOrder('Nguyen Van A', '0909000001', 'Da Lat');

        const cancelled = service.cancelOrder(order.id);
        expect(cancelled).toBeTrue();

        const updated = service.getProductById(product.id)!;
        const totalRemainingFromBatches = (updated.batches || []).reduce(
          (sum, batch) => sum + batch.remainingQuantity,
          0
        );

        expect(updated.inventory?.stockQuantity).toBe(baseStock);
        expect(updated.inventory?.reservedQuantity).toBe(0);
        expect(updated.stock).toBe(baseStock);
        expect(totalRemainingFromBatches).toBe(baseStock);
      }
    });
  });
});
