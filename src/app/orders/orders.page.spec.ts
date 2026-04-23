import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { OrdersPage } from './orders.page';
import { OrderService } from '../services/order.service';

describe('OrdersPage', () => {
  let component: OrdersPage;
  let fixture: ComponentFixture<OrdersPage>;

  beforeEach(async () => {
    const presentSpy = jasmine.createSpy('present').and.returnValue(Promise.resolve());
    const alertControllerSpy = jasmine.createSpyObj<AlertController>('AlertController', ['create']);
    const toastControllerSpy = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    alertControllerSpy.create.and.returnValue(Promise.resolve({ present: presentSpy } as any));
    toastControllerSpy.create.and.returnValue(Promise.resolve({ present: presentSpy } as any));

    const orderServiceStub = {
      orders$: new BehaviorSubject<any[]>([]).asObservable(),
      cancelOrder: jasmine.createSpy('cancelOrder').and.returnValue(true),
    };

    const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [OrdersPage],
      providers: [
        { provide: OrderService, useValue: orderServiceStub },
        { provide: AlertController, useValue: alertControllerSpy },
        { provide: ToastController, useValue: toastControllerSpy },
        { provide: Router, useValue: routerSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(OrdersPage, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(OrdersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
