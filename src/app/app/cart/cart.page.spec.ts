import { ChangeDetectorRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CartPage } from './cart.page';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';
import { AlertController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { CartItem, Order } from '../../models/product.model';

describe('CartPage', () => {
  let component: CartPage;
  let fixture: ComponentFixture<CartPage>;
  let productServiceSpy: jasmine.SpyObj<ProductService>;
  let alertControllerSpy: jasmine.SpyObj<AlertController>;

  beforeEach(async () => {
    productServiceSpy = jasmine.createSpyObj<ProductService>('ProductService', [
      'getCartTotal',
      'getCartItemCount',
      'updateCartItemQuantity',
      'removeFromCart',
      'clearCart',
      'createOrder',
    ]);

    const cartSubject = new BehaviorSubject<CartItem[]>([]);
    Object.defineProperty(productServiceSpy, 'cart$', {
      value: cartSubject.asObservable(),
    });

    const authStub = {
      isAuthenticated$: new BehaviorSubject<boolean>(true).asObservable(),
      isGuestMode$: new BehaviorSubject<boolean>(false).asObservable(),
      getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue(null),
      isGuestMode: jasmine.createSpy('isGuestMode').and.returnValue(false),
    };

    const presentSpy = jasmine.createSpy('present').and.returnValue(Promise.resolve());
    alertControllerSpy = jasmine.createSpyObj<AlertController>('AlertController', ['create']);
    alertControllerSpy.create.and.returnValue(Promise.resolve({ present: presentSpy } as any));

    const toastControllerSpy = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastControllerSpy.create.and.returnValue(Promise.resolve({ present: presentSpy } as any));

    const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const cdrStub = { markForCheck: jasmine.createSpy('markForCheck') };

    await TestBed.configureTestingModule({
      declarations: [CartPage],
      providers: [
        { provide: ProductService, useValue: productServiceSpy },
        { provide: AuthService, useValue: authStub },
        { provide: AlertController, useValue: alertControllerSpy },
        { provide: ToastController, useValue: toastControllerSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ChangeDetectorRef, useValue: cdrStub },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(CartPage, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CartPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows warning when checkout form fields are missing', async () => {
    component.customerName = '';
    component.customerPhone = '';
    component.deliveryAddress = '';
    spyOn(component, 'showToast');

    await component.placeOrder();

    expect(component.showToast).toHaveBeenCalledWith('Vui lòng điền đầy đủ thông tin giao hàng', 'warning');
    expect(productServiceSpy.createOrder).not.toHaveBeenCalled();
  });

  it('shows warning when cart is empty', async () => {
    component.customerName = 'Nguyen Van A';
    component.customerPhone = '0909000001';
    component.deliveryAddress = '123 Duong Tran Phu, Da Lat';
    component.cartItems = [];
    spyOn(component, 'showToast');

    await component.placeOrder();

    expect(component.showToast).toHaveBeenCalledWith('Giỏ hàng trống', 'warning');
    expect(productServiceSpy.createOrder).not.toHaveBeenCalled();
  });

  it('creates order with orderNote and resets checkout state', async () => {
    component.customerName = 'Nguyen Van A';
    component.customerPhone = '0909000001';
    component.deliveryAddress = '123 Duong Tran Phu, Da Lat';
    component.orderNote = 'Giao buổi sáng';
    component.showCheckoutForm = true;
    component.cartItems = [{
      product: {
        id: 1,
        name: 'Dau Tay',
        price: 100000,
        image: '',
        category: 'Trai cay',
        unit: 'kg',
        description: '',
        stock: 10,
        origin: 'Da Lat',
      },
      quantity: 1,
    }];

    const mockOrder: Order = {
      id: 'ORD_TEST',
      orderCode: 'DL-ORD_TEST',
      items: component.cartItems,
      total: 100000,
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: 'qr',
      paymentDate: new Date(),
      createdAt: new Date(),
      customerName: component.customerName,
      customerPhone: component.customerPhone,
      deliveryAddress: component.deliveryAddress,
      orderNote: component.orderNote,
    };

    productServiceSpy.createOrder.and.returnValue(mockOrder);
    spyOn(window, 'setTimeout').and.callFake((handler: TimerHandler) => {
      if (typeof handler === 'function') {
        handler();
      }
      return 0 as any;
    });

    await component.placeOrder();

    expect(productServiceSpy.createOrder).toHaveBeenCalledWith(
      'Nguyen Van A',
      '0909000001',
      '123 Duong Tran Phu, Da Lat',
      'Giao buổi sáng',
      'cod',
      'unpaid',
      undefined,
      undefined,
    );
    expect(component.isProcessingOrder).toBeFalse();
    expect(component.showCheckoutForm).toBeFalse();
    expect(component.orderNote).toBe('');
    expect(alertControllerSpy.create).toHaveBeenCalled();
  });

  it('shows service error message when createOrder throws', async () => {
    component.customerName = 'Nguyen Van A';
    component.customerPhone = '0909000001';
    component.deliveryAddress = '123 Duong Tran Phu, Da Lat';
    component.cartItems = [{
      product: {
        id: 1,
        name: 'Dau Tay',
        price: 100000,
        image: '',
        category: 'Trai cay',
        unit: 'kg',
        description: '',
        stock: 0,
        origin: 'Da Lat',
      },
      quantity: 1,
    }];

    productServiceSpy.createOrder.and.throwError('Sản phẩm không đủ tồn kho');
    spyOn(window, 'setTimeout').and.callFake((handler: TimerHandler) => {
      if (typeof handler === 'function') {
        handler();
      }
      return 0 as any;
    });
    spyOn(component, 'showToast');

    await component.placeOrder();

    expect(component.showToast).toHaveBeenCalledWith('Sản phẩm không đủ tồn kho', 'danger');
    expect(component.isProcessingOrder).toBeFalse();
  });

  it('throttles duplicate checkout requests when clicking too fast', async () => {
    component.customerName = 'Nguyen Van A';
    component.customerPhone = '0909000001';
    component.deliveryAddress = '123 Duong Tran Phu, Da Lat';
    component.cartItems = [{
      product: {
        id: 1,
        name: 'Dau Tay',
        price: 100000,
        image: '',
        category: 'Trai cay',
        unit: 'kg',
        description: '',
        stock: 10,
        origin: 'Da Lat',
      },
      quantity: 1,
    }];

    const mockOrder: Order = {
      id: 'ORD_TEST_2',
      orderCode: 'DL-ORD_TEST_2',
      items: component.cartItems,
      total: 100000,
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: 'qr',
      paymentDate: new Date(),
      createdAt: new Date(),
      customerName: component.customerName,
      customerPhone: component.customerPhone,
      deliveryAddress: component.deliveryAddress,
      orderNote: '',
    };

    productServiceSpy.createOrder.and.returnValue(mockOrder);
    spyOn(window, 'setTimeout').and.callFake((handler: TimerHandler) => {
      if (typeof handler === 'function') {
        handler();
      }
      return 0 as any;
    });
    spyOn(Date, 'now').and.returnValues(1000, 1200);
    spyOn(component, 'showToast').and.callThrough();

    await component.placeOrder();
    await component.placeOrder();

    expect(productServiceSpy.createOrder).toHaveBeenCalledTimes(1);
    expect(component.showToast).toHaveBeenCalledWith('Bạn thao tác quá nhanh, vui lòng chờ giây lát', 'warning');
  });
});
