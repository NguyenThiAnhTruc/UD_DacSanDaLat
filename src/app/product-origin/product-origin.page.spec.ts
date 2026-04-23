import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { BehaviorSubject, of } from 'rxjs';
import { ProductOriginPage } from './product-origin.page';
import { AuthService } from '../services/auth.service';
import { ProductService } from '../services/product.service';
import { QrScannerService } from '../services/qr-scanner.service';

describe('ProductOriginPage', () => {
  let component: ProductOriginPage;
  let fixture: ComponentFixture<ProductOriginPage>;

  beforeEach(async () => {
    const product = {
      id: 1,
      name: 'Dau Tay',
      category: 'Trai cay',
      price: 100000,
      unit: 'kg',
      image: '',
      description: '',
      stock: 10,
      origin: 'Da Lat',
    };

    const productServiceStub = {
      products$: new BehaviorSubject<any[]>([product]).asObservable(),
      getProductById: jasmine.createSpy('getProductById').and.returnValue(product),
      getTraceabilityTimeline: jasmine.createSpy('getTraceabilityTimeline').and.returnValue([]),
    };

    const routeStub = {
      snapshot: {
        queryParamMap: convertToParamMap({}),
      },
      paramMap: of(convertToParamMap({ id: '1' })),
    };

    const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const qrScannerServiceStub = jasmine.createSpyObj<QrScannerService>('QrScannerService', [
      'generateTraceCode',
      'generateQrLinkData',
      'generateQrImageUrl',
      'generateProductTraceUrl',
    ]);
    qrScannerServiceStub.generateTraceCode.and.returnValue('DLVN12026');
    qrScannerServiceStub.generateQrLinkData.and.returnValue('https://example.test/product-origin/1');
    qrScannerServiceStub.generateQrImageUrl.and.returnValue('https://example.test/qr.png');
    qrScannerServiceStub.generateProductTraceUrl.and.returnValue('https://example.test/product-origin/1');

    const authServiceStub = jasmine.createSpyObj<AuthService>('AuthService', ['isStockManager']);
    authServiceStub.isStockManager.and.returnValue(false);

    const toastControllerStub = jasmine.createSpyObj<ToastController>('ToastController', ['create']);

    await TestBed.configureTestingModule({
      declarations: [ProductOriginPage],
      providers: [
        { provide: ProductService, useValue: productServiceStub },
        { provide: ActivatedRoute, useValue: routeStub },
        { provide: Router, useValue: routerSpy },
        { provide: QrScannerService, useValue: qrScannerServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: ToastController, useValue: toastControllerStub },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ProductOriginPage, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ProductOriginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
