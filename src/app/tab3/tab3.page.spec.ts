import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { Tab3Page } from './tab3.page';
import { ProductService } from '../services/product.service';
import { AuthService } from '../services/auth.service';
import { FavoritesService } from '../services/favorites.service';

describe('Tab3Page', () => {
  let component: Tab3Page;
  let fixture: ComponentFixture<Tab3Page>;

  beforeEach(async () => {
    const presentSpy = jasmine.createSpy('present').and.returnValue(Promise.resolve());
    const alertControllerSpy = jasmine.createSpyObj<AlertController>('AlertController', ['create']);
    alertControllerSpy.create.and.returnValue(Promise.resolve({ present: presentSpy } as any));

    const productServiceStub = {
      orders$: new BehaviorSubject<any[]>([]).asObservable(),
    };

    const authServiceStub = {
      currentUser$: new BehaviorSubject<any>(null).asObservable(),
      isGuestMode: jasmine.createSpy('isGuestMode').and.returnValue(false),
      logout: jasmine.createSpy('logout').and.returnValue(Promise.resolve()),
    };

    const favoritesServiceStub = {
      favorites$: new BehaviorSubject<number[]>([]).asObservable(),
      getFavoriteIds: jasmine.createSpy('getFavoriteIds').and.returnValue([]),
    };

    const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [Tab3Page],
      providers: [
        { provide: ProductService, useValue: productServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: FavoritesService, useValue: favoritesServiceStub },
        { provide: AlertController, useValue: alertControllerSpy },
        { provide: Router, useValue: routerSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(Tab3Page, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Tab3Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
