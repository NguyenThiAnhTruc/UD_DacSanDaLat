import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { CameraService } from '../services/camera.service';
import { ValidationService } from '../services/validation.service';
import { CloudinaryImageStorageService } from '../services/cloudinary-image-storage.service';
import { User } from '../models/product.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.page.html',
  styleUrls: ['./edit-profile.page.scss'],
  standalone: false
})
export class EditProfilePage implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private cameraService = inject(CameraService);
  private validationService = inject(ValidationService);
  private imageStorageService = inject(CloudinaryImageStorageService);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);
  private router = inject(Router);

  user: User | null = null;
  
  // Form fields
  name: string = '';
  email: string = '';
  phone: string = '';
  address: string = '';
  
  // Avatar
  avatarPreview: string = '';
  selectedAvatarFile: File | null = null;
  isUploadingAvatar: boolean = false;
  
  // Password change
  currentPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  
  // Loading states
  isSaving: boolean = false;
  isChangingPassword: boolean = false;
  
  // Form validation
  nameError: string = '';
  phoneError: string = '';
  addressError: string = '';
  passwordError: string = '';
  avatarError: string = '';
  private userSubscription?: Subscription;

  ngOnInit() {
    this.loadUserData();
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  loadUserData() {
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.user = user;
        this.name = user.name;
        this.email = user.email;
        this.phone = user.phone;
        this.address = user.address || '';
        this.avatarPreview = user.avatar || 'https://ionicframework.com/docs/img/demos/avatar.svg';
      }
    });
  }

  /**
   * Camera: Take photo or pick from gallery
   */
  async selectPhoto() {
    try {
      this.avatarError = '';
      
      const image = await this.cameraService.getPhoto();
      if (!image) {
        this.showToast('Không chọn ảnh', 'warning');
        return;
      }

      if (!image.base64) {
        this.showToast('Không thể đọc dữ liệu ảnh', 'danger');
        return;
      }

      // Validate image
      const imageFile = this.imageStorageService.base64ToFile(
        image.base64,
        image.fileName,
        image.mimeType
      );

      const validation = this.validationService.isValidImageFile(imageFile.name, imageFile.size);
      if (!validation.valid) {
        this.avatarError = validation.error || 'Ảnh không hợp lệ';
        this.showToast(this.avatarError, 'danger');
        return;
      }

      // Preview image
      this.avatarPreview = `data:${image.mimeType};base64,${image.base64}`;
      this.selectedAvatarFile = imageFile;
      this.showToast('Đã chọn ảnh, nhấn Lưu để cập nhật', 'success');
    } catch (error) {
      console.error('Error selecting photo:', error);
      this.avatarError = 'Có lỗi xảy ra khi chọn ảnh';
      this.showToast(this.avatarError, 'danger');
    }
  }

  async saveProfile() {
    // Clear errors
    this.nameError = '';
    this.phoneError = '';
    this.addressError = '';
    this.avatarError = '';
    
    let hasError = false;

    // Validate
    if (!this.name || this.name.trim().length < 2) {
      this.nameError = 'Tên phải có ít nhất 2 ký tự';
      hasError = true;
    }

    if (!this.phone) {
      this.phoneError = 'Vui lòng nhập số điện thoại';
      hasError = true;
    } else {
      const phoneValidation = this.validationService.isValidPhone(this.phone);
      if (!phoneValidation.valid) {
        this.phoneError = phoneValidation.error || 'Số điện thoại không hợp lệ';
        hasError = true;
      }
    }

    if (this.address && this.address.trim().length < 5) {
      this.addressError = 'Địa chỉ phải có ít nhất 5 ký tự';
      hasError = true;
    }

    if (hasError) {
      this.showToast('Vui lòng kiểm tra lại thông tin', 'warning');
      return;
    }

    this.isSaving = true;

    try {
      if (!this.user) {
        this.showToast('Không tìm thấy thông tin người dùng', 'danger');
        return;
      }

      // Avatar upload is handled inside authService.updateProfileWithAvatar().
      this.isUploadingAvatar = !!this.selectedAvatarFile;

      // Update profile with security check
      const result = await this.authService.updateProfileWithAvatar(
        this.user.id,
        {
          name: this.name,
          phone: this.phone,
          address: this.address,
        },
        this.selectedAvatarFile || undefined
      );

      if (result.success) {
        this.showToast('Cập nhật thông tin thành công', 'success');
        this.selectedAvatarFile = null;
        this.router.navigate(['/tabs/tab3']);
      } else {
        this.showToast(result.message, 'danger');
      }
    } catch (error) {
      this.showToast('Có lỗi xảy ra. Vui lòng thử lại', 'danger');
    } finally {
      this.isUploadingAvatar = false;
      this.isSaving = false;
    }
  }

  async changePassword() {
    this.passwordError = '';

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.passwordError = 'Vui lòng điền đầy đủ thông tin';
      return;
    }

    const passwordValidation = this.validationService.isValidPassword(this.newPassword);
    if (!passwordValidation.valid) {
      this.passwordError = passwordValidation.error || 'Mật khẩu không hợp lệ';
      return;
    }

    const matchValidation = this.validationService.doPasswordsMatch(this.newPassword, this.confirmPassword);
    if (!matchValidation.valid) {
      this.passwordError = matchValidation.error || 'Mật khẩu xác nhận không khớp';
      return;
    }

    this.isChangingPassword = true;

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const result = await this.authService.changePassword(
        this.currentPassword,
        this.newPassword
      );

      if (result.success) {
        this.showToast('Đổi mật khẩu thành công', 'success');
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
      } else {
        this.passwordError = result.message;
      }
    } catch (error) {
      this.passwordError = 'Có lỗi xảy ra. Vui lòng thử lại';
    } finally {
      this.isChangingPassword = false;
    }
  }

  async deleteAccount() {
    const alert = await this.alertController.create({
      header: 'Xóa tài khoản',
      message: 'Bạn có chắc chắn muốn xóa tài khoản? Hành động này không thể hoàn tác.',
      buttons: [
        {
          text: 'Hủy',
          role: 'cancel'
        },
        {
          text: 'Xóa',
          role: 'destructive',
          handler: () => {
            this.confirmDeleteAccount();
          }
        }
      ]
    });

    await alert.present();
  }

  async confirmDeleteAccount() {
    if (!this.user) return;

    const result = await this.authService.deleteUserData(this.user.id, 'account');
    await this.showToast(result.message, result.success ? 'success' : 'danger');

    if (result.success) {
      await this.router.navigate(['/login'], { replaceUrl: true });
    }
  }

  async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
