import { Injectable } from '@angular/core';

export interface ValidationError {
  field: string;
  message: string;
  type: 'error' | 'warning' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  
  // Email validation
  isValidEmail(email: string): { valid: boolean; error?: string } {
    if (!email) return { valid: false, error: 'Email không được để trống' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Email không hợp lệ' };
    }
    return { valid: true };
  }

  // Phone validation
  isValidPhone(phone: string): { valid: boolean; error?: string } {
    if (!phone) return { valid: false, error: 'Số điện thoại không được để trống' };
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return { valid: false, error: 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)' };
    }
    return { valid: true };
  }

  // Password validation
  isValidPassword(password: string): { valid: boolean; error?: string } {
    if (!password) return { valid: false, error: 'Mật khẩu không được để trống' };
    if (password.length < 6) {
      return { valid: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' };
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      return { valid: false, error: 'Mật khẩu phải chứa chữ hoa, chữ thường và số' };
    }
    return { valid: true };
  }

  // Name validation
  isValidName(name: string): { valid: boolean; error?: string } {
    if (!name) return { valid: false, error: 'Tên không được để trống' };
    if (name.trim().length < 2) {
      return { valid: false, error: 'Tên phải có ít nhất 2 ký tự' };
    }
    if (name.trim().length > 100) {
      return { valid: false, error: 'Tên không được vượt quá 100 ký tự' };
    }
    return { valid: true };
  }

  // Address validation
  isValidAddress(address: string): { valid: boolean; error?: string } {
    if (!address) return { valid: false, error: 'Địa chỉ không được để trống' };
    if (address.trim().length < 5) {
      return { valid: false, error: 'Địa chỉ phải có ít nhất 5 ký tự' };
    }
    if (address.trim().length > 200) {
      return { valid: false, error: 'Địa chỉ không được vượt quá 200 ký tự' };
    }
    return { valid: true };
  }

  // File size validation (in MB)
  isValidFileSize(sizeInBytes: number, maxSizeMB: number = 5): { valid: boolean; error?: string } {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (sizeInBytes > maxSizeBytes) {
      return { valid: false, error: `Kích thước tệp không được vượt quá ${maxSizeMB}MB` };
    }
    return { valid: true };
  }

  // Image file validation
  isValidImageFile(fileName: string, sizeInBytes: number): { valid: boolean; error?: string } {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      return { valid: false, error: 'Chỉ hỗ trợ định dạng: JPG, PNG, WebP, GIF' };
    }

    return this.isValidFileSize(sizeInBytes, 5);
  }

  // Validate password match
  doPasswordsMatch(password: string, confirmPassword: string): { valid: boolean; error?: string } {
    if (password !== confirmPassword) {
      return { valid: false, error: 'Mật khẩu xác nhận không khớp' };
    }
    return { valid: true };
  }

  // Multiple field validation
  validateFields(fields: Record<string, any>, rules: Record<string, (value: any) => { valid: boolean; error?: string }>): ValidationError[] {
    const errors: ValidationError[] = [];
    
    Object.entries(rules).forEach(([fieldName, validationFn]) => {
      const value = fields[fieldName];
      const result = validationFn(value);
      
      if (!result.valid) {
        errors.push({
          field: fieldName,
          message: result.error || 'Giá trị không hợp lệ',
          type: 'error'
        });
      }
    });

    return errors;
  }

  // Get user-friendly error message
  getErrorMessage(errorCode: string, context?: any): string {
    const messages: Record<string, string> = {
      'auth/email-already-in-use': 'Email này đã được đăng ký',
      'auth/invalid-email': 'Email không hợp lệ',
      'auth/weak-password': 'Mật khẩu quá yếu',
      'auth/user-not-found': 'Tài khoản không tồn tại',
      'auth/wrong-password': 'Mật khẩu không đúng',
      'auth/too-many-requests': 'Đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau',
      'permission-denied': 'Không có quyền truy cập',
      'not-found': 'Dữ liệu không tồn tại',
      'failed-precondition': 'Hoạt động không thể thực hiện',
      'aborted': 'Hoạt động bị hủy',
      'unauthenticated': 'Vui lòng đăng nhập trước',
    };

    return messages[errorCode] || 'Có lỗi xảy ra. Vui lòng thử lại';
  }
}
