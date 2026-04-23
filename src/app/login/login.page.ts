import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private loadingController = inject(LoadingController);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);

  isLoginMode = true;
  
  // Login form
  loginEmail = '';
  loginPassword = '';
  
  // Register form
  registerName = '';
  registerEmail = '';
  registerPhone = '';
  registerPassword = '';
  registerConfirmPassword = '';
  registerAddress = '';

  ngOnInit() {
    // If user is already logged in or in guest mode, redirect to tabs
    if (this.authService.isAuthenticated() || this.authService.isGuestMode()) {
      this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
    }
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
  }

  async login() {
    if (!this.loginEmail || !this.loginPassword) {
      await this.showToast('Vui lòng nhập đầy đủ thông tin', 'warning');
      return;
    }

    // Validate email format
    if (!this.isValidEmail(this.loginEmail)) {
      await this.showToast('Email không hợp lệ', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Đang đăng nhập...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const result = await this.authService.login(this.loginEmail, this.loginPassword);
      await loading.dismiss();

      if (result.success) {
        // Clear form
        this.loginEmail = '';
        this.loginPassword = '';
        
        // Navigate with replaceUrl to prevent going back to login
        await this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
        await this.showToast(result.message, 'success');
      } else {
        await this.showToast(result.message, 'danger');
      }
    } catch (error) {
      await loading.dismiss();
      await this.showToast('Đã xảy ra lỗi. Vui lòng thử lại', 'danger');
    }
  }

  async register() {
    // Validation
    if (!this.registerName || !this.registerEmail || !this.registerPhone || 
        !this.registerPassword || !this.registerAddress) {
      await this.showToast('Vui lòng nhập đầy đủ thông tin', 'warning');
      return;
    }

    // Validate email
    if (!this.isValidEmail(this.registerEmail)) {
      await this.showToast('Email không hợp lệ', 'warning');
      return;
    }

    // Validate phone
    if (!this.isValidPhone(this.registerPhone)) {
      await this.showToast('Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)', 'warning');
      return;
    }

    if (this.registerPassword !== this.registerConfirmPassword) {
      await this.showToast('Mật khẩu xác nhận không khớp', 'warning');
      return;
    }

    if (this.registerPassword.length < 6) {
      await this.showToast('Mật khẩu phải có ít nhất 6 ký tự', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Đang đăng ký...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const result = await this.authService.register(
        this.registerName,
        this.registerEmail,
        this.registerPhone,
        this.registerPassword,
        this.registerAddress
      );
      
      await loading.dismiss();

      if (result.success) {
        // Clear form
        this.registerName = '';
        this.registerEmail = '';
        this.registerPhone = '';
        this.registerPassword = '';
        this.registerConfirmPassword = '';
        this.registerAddress = '';
        
        // Navigate with replaceUrl to prevent going back to login
        await this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
        await this.showToast(result.message, 'success');
      } else {
        await this.showToast(result.message, 'danger');
      }
    } catch (error) {
      await loading.dismiss();
      await this.showToast('Đã xảy ra lỗi. Vui lòng thử lại', 'danger');
    }
  }

  async skipLogin() {
    // Enable guest mode for shopping without account
    this.authService.enableGuestMode();
    
    // Navigate with replaceUrl to prevent going back to login
    await this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
    await this.showToast('Đang mua hàng với chế độ khách', 'success');
  }

  async loginWithGoogle() {
    const loading = await this.loadingController.create({
      message: 'Đang kết nối với Google...',
      spinner: 'crescent',
      cssClass: 'google-loading'
    });
    await loading.present();

    try {
      const result = await this.authService.loginWithGoogle();
      await loading.dismiss();

      if (!result.success) {
        await this.showToast(result.message, 'danger');
        return;
      }

      await this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
      await this.showToast(result.message, 'success');
    } catch (error: any) {
      await loading.dismiss();
      const fallbackMessage = typeof error?.message === 'string'
        ? `Không thể đăng nhập với Google (${error.message.substring(0, 100)})`
        : 'Không thể đăng nhập với Google';
      await this.showToast(fallbackMessage, 'danger');
    }
  }

  async loginWithFacebook() {
    await this.showToast('Chức năng đang phát triển', 'warning');
  }

  async reinitializeDemoAccounts() {
    const loading = await this.loadingController.create({
      message: 'Đang khôi phục tài khoản demo...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const result = await this.authService.ensureDemoAccountsCreated();
      await loading.dismiss();

      if (result.success) {
        await this.showToast(result.message, 'success');
      } else {
        await this.showToast(result.message, 'danger');
      }
    } catch (error) {
      await loading.dismiss();
      await this.showToast('Lỗi khi khôi phục tài khoản demo', 'danger');
    }
  }

  async forgotPassword() {
    const alert = await this.alertController.create({
      header: 'Quên mật khẩu',
      message: 'Nhập email đã đăng ký để nhận link khôi phục mật khẩu',
      inputs: [
        {
          name: 'email',
          type: 'email',
          placeholder: 'Email của bạn',
          attributes: {
            autocomplete: 'email'
          }
        }
      ],
      buttons: [
        {
          text: 'Hủy',
          role: 'cancel'
        },
        {
          text: 'Gửi',
          handler: async (data) => {
            if (!data.email) {
              this.showToast('Vui lòng nhập email', 'warning');
              return false;
            }

            // Validate email format
            if (!this.isValidEmail(data.email)) {
              this.showToast('Email không hợp lệ', 'warning');
              return false;
            }

            const loading = await this.loadingController.create({
              message: 'Đang gửi email...',
              spinner: 'crescent'
            });
            await loading.present();

            const result = await this.authService.forgotPassword(data.email);
            await loading.dismiss();

            await this.showToast(result.message, result.success ? 'success' : 'danger');
            return result.success;
          }
        }
      ]
    });

    await alert.present();
  }

  // Validation helpers
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    // Vietnamese phone number: starts with 0, 10 digits
    const phoneRegex = /^0\d{9}$/;
    return phoneRegex.test(phone);
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    toast.present();
  }
}
