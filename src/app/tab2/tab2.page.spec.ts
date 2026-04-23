import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { Tab2Page } from './tab2.page';
import { ProductService } from '../services/product.service';

describe('Tab2Page', () => {
  let component: Tab2Page;
  let fixture: ComponentFixture<Tab2Page>;

  beforeEach(async () => {
    const presentSpy = jasmine.createSpy('present').and.returnValue(Promise.resolve());
    const alertControllerSpy = jasmine.createSpyObj<AlertController>('AlertController', ['create']);
    const toastControllerSpy = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    const modalControllerSpy = jasmine.createSpyObj<ModalController>('ModalController', ['create']);
    alertControllerSpy.create.and.returnValue(Promise.resolve({ present: presentSpy } as any));
    toastControllerSpy.create.and.returnValue(Promise.resolve({ present: presentSpy } as any));
    modalControllerSpy.create.and.returnValue(Promise.resolve({ present: presentSpy } as any));

    const productServiceStub = {
      cart$: new BehaviorSubject<any[]>([]).asObservable(),
      getCartTotal: jasmine.createSpy('getCartTotal').and.returnValue(0),
      updateCartItemQuantity: jasmine.createSpy('updateCartItemQuantity'),
      removeFromCart: jasmine.createSpy('removeFromCart'),
      clearCart: jasmine.createSpy('clearCart'),
    };

    const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [Tab2Page],
      providers: [
        { provide: ProductService, useValue: productServiceStub },
        { provide: AlertController, useValue: alertControllerSpy },
        { provide: ToastController, useValue: toastControllerSpy },
        { provide: ModalController, useValue: modalControllerSpy },
        { provide: Router, useValue: routerSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(Tab2Page, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Tab2Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
