import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { EditProfilePage } from './edit-profile.page';
import { AuthService } from '../services/auth.service';
import { CameraService } from '../services/camera.service';
import { ValidationService } from '../services/validation.service';
import { CloudinaryImageStorageService } from '../services/cloudinary-image-storage.service';

describe('EditProfilePage', () => {
  let component: EditProfilePage;
  let fixture: ComponentFixture<EditProfilePage>;

  beforeEach(async () => {
    const presentSpy = jasmine.createSpy('present').and.returnValue(Promise.resolve());
    const toastControllerSpy = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    const alertControllerSpy = jasmine.createSpyObj<AlertController>('AlertController', ['create']);
    toastControllerSpy.create.and.returnValue(Promise.resolve({ present: presentSpy } as any));
    alertControllerSpy.create.and.returnValue(Promise.resolve({ present: presentSpy } as any));

    const authServiceStub = {
      currentUser$: new BehaviorSubject<any>(null).asObservable(),
      updateProfileWithAvatar: jasmine.createSpy('updateProfileWithAvatar').and.returnValue(Promise.resolve({ success: true, message: '' })),
      changePassword: jasmine.createSpy('changePassword').and.returnValue(Promise.resolve({ success: true, message: '' })),
    };

    const cameraServiceStub = {
      getPhoto: jasmine.createSpy('getPhoto').and.returnValue(Promise.resolve(null)),
    };

    const validationServiceStub = {
      isValidImageFile: jasmine.createSpy('isValidImageFile').and.returnValue({ valid: true }),
      isValidPhone: jasmine.createSpy('isValidPhone').and.returnValue({ valid: true }),
      isValidPassword: jasmine.createSpy('isValidPassword').and.returnValue({ valid: true }),
      doPasswordsMatch: jasmine.createSpy('doPasswordsMatch').and.returnValue({ valid: true }),
    };

    const cloudinaryImageStorageStub = {
      base64ToFile: jasmine.createSpy('base64ToFile'),
      uploadUserAvatar: jasmine.createSpy('uploadUserAvatar').and.returnValue(Promise.resolve('avatar.jpg')),
    };

    const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [EditProfilePage],
      providers: [
        { provide: AuthService, useValue: authServiceStub },
        { provide: CameraService, useValue: cameraServiceStub },
        { provide: ValidationService, useValue: validationServiceStub },
        { provide: CloudinaryImageStorageService, useValue: cloudinaryImageStorageStub },
        { provide: ToastController, useValue: toastControllerSpy },
        { provide: AlertController, useValue: alertControllerSpy },
        { provide: Router, useValue: routerSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(EditProfilePage, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(EditProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
