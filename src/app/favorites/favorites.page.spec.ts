import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { FavoritesPage } from './favorites.page';
import { ProductService } from '../services/product.service';
import { FavoritesService } from '../services/favorites.service';

describe('FavoritesPage', () => {
  let component: FavoritesPage;
  let fixture: ComponentFixture<FavoritesPage>;

  beforeEach(async () => {
    const presentSpy = jasmine.createSpy('present').and.returnValue(Promise.resolve());
    const alertControllerSpy = jasmine.createSpyObj<AlertController>('AlertController', ['create']);
    const toastControllerSpy = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    alertControllerSpy.create.and.returnValue(Promise.resolve({ present: presentSpy } as any));
    toastControllerSpy.create.and.returnValue(Promise.resolve({ present: presentSpy } as any));

    const productServiceStub = {
      products$: new BehaviorSubject<any[]>([]).asObservable(),
      addToCart: jasmine.createSpy('addToCart'),
    };

    const favoritesServiceStub = {
      favorites$: new BehaviorSubject<number[]>([]).asObservable(),
      getFavoriteIds: jasmine.createSpy('getFavoriteIds').and.returnValue([]),
      removeFavorite: jasmine.createSpy('removeFavorite').and.returnValue(Promise.resolve()),
      clearAllFavorites: jasmine.createSpy('clearAllFavorites').and.returnValue(Promise.resolve()),
    };

    const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [FavoritesPage],
      providers: [
        { provide: ProductService, useValue: productServiceStub },
        { provide: FavoritesService, useValue: favoritesServiceStub },
        { provide: ToastController, useValue: toastControllerSpy },
        { provide: AlertController, useValue: alertControllerSpy },
        { provide: Router, useValue: routerSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(FavoritesPage, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(FavoritesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
