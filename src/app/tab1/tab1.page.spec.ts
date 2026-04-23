import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { Tab1Page } from './tab1.page';
import { ProductService } from '../services/product.service';
import { FavoritesService } from '../services/favorites.service';

describe('Tab1Page', () => {
  let component: Tab1Page;
  let fixture: ComponentFixture<Tab1Page>;

  beforeEach(async () => {
    const presentSpy = jasmine.createSpy('present').and.returnValue(Promise.resolve());
    const toastControllerSpy = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastControllerSpy.create.and.returnValue(Promise.resolve({ present: presentSpy } as any));

    const productServiceStub = {
      products$: new BehaviorSubject<any[]>([]).asObservable(),
      cart$: new BehaviorSubject<any[]>([]).asObservable(),
      getCategories: jasmine.createSpy('getCategories').and.returnValue([]),
      getCartItemCount: jasmine.createSpy('getCartItemCount').and.returnValue(0),
      getCart: jasmine.createSpy('getCart').and.returnValue([]),
      addToCart: jasmine.createSpy('addToCart'),
    };

    const favoritesServiceStub = {
      favorites$: new BehaviorSubject<number[]>([]).asObservable(),
      getFavoriteIds: jasmine.createSpy('getFavoriteIds').and.returnValue([]),
    };

    const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [Tab1Page],
      providers: [
        { provide: ProductService, useValue: productServiceStub },
        { provide: FavoritesService, useValue: favoritesServiceStub },
        { provide: ToastController, useValue: toastControllerSpy },
        { provide: Router, useValue: routerSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(Tab1Page, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Tab1Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
