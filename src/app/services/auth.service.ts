import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../models/product.model';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  Firestore,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  Auth,
  EmailAuthProvider,
  GoogleAuthProvider,
  User as FirebaseUser,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile as updateAuthProfile,
} from 'firebase/auth';
import { environment } from '../../environments/environment';
import { CloudinaryImageStorageService } from './cloudinary-image-storage.service';
import { NativeGoogleAuthService } from './native-google-auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private static readonly DEFAULT_AVATAR =
    'https://ionicframework.com/docs/img/demos/avatar.svg';
  private static readonly GUEST_MODE_KEY = 'dalatfarm_guest_mode';
  private static readonly DEMO_INIT_MARKER_KEY = 'demoAccountsInitializedV1';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> =
    this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$: Observable<boolean> =
    this.isAuthenticatedSubject.asObservable();

  private isGuestModeSubject = new BehaviorSubject<boolean>(false);
  public isGuestMode$: Observable<boolean> =
    this.isGuestModeSubject.asObservable();

  private readonly cloudinaryImageStorageService = inject(
    CloudinaryImageStorageService,
  );
  private readonly nativeGoogleAuthService = inject(NativeGoogleAuthService);
  private readonly firebaseApp: FirebaseApp =
    getApps()[0] ?? initializeApp(environment.firebaseConfig);
  private readonly auth: Auth = getAuth(this.firebaseApp);
  private readonly firestore: Firestore = getFirestore(this.firebaseApp);
  private readonly authReadyPromise: Promise<void> = this.initializeAuth();

  private async initializeAuth(): Promise<void> {
    await this.sanitizeLegacyCredentialFields();

    // CRITICAL: Force browserLocalPersistence for Capacitor mobile support
    // This avoids Firebase trying to use sessionStorage (which fails on WebView)
    try {
      await setPersistence(this.auth, browserLocalPersistence);
      console.info(
        '[Auth] Firebase persistence set to browserLocalPersistence (localStorage)',
      );
    } catch (error) {
      console.warn('[Auth] Failed to set persistence:', error);
      // Fall through - Firebase will use default (in-memory) if localStorage fails
    }

    if (environment.enableDemoAccount) {
      try {
        const shouldInitializeDemoAccounts =
          await this.shouldInitializeDemoAccounts();
        if (shouldInitializeDemoAccounts) {
          await this.initializeDemoAccount();
          await this.markDemoAccountsInitialized();
        }
      } catch (error) {
        console.error('[Auth] Demo account initialization failed:', error);
      }
    }

    // DO NOT force localStorage persistence - let Firebase use in-memory on mobile
    // Many mobile browsers (Zalo, FB) block sessionStorage which breaks setPersistence
    console.info(
      '[Auth] Using Firebase default persistence (in-memory for mobile, localStorage for web)',
    );

    // Add storage event listener to detect changes from other tabs (web only)
    try {
      window.addEventListener('storage', (e) => {
        if (e.key?.startsWith('firebase:')) {
          console.debug('[Auth] Storage event from other tab:', e.key);
          void this.syncAuthState(this.auth.currentUser);
        }
      });
    } catch {
      // Ignore if storage events not available (mobile)
    }

    // Do NOT check getRedirectResult - it requires sessionStorage (not available on mobile)
    // We'll only use popup auth which works on both web and mobile

    await new Promise<void>((resolve) => {
      let initialStateHandled = false;

      onAuthStateChanged(this.auth, (firebaseUser) => {
        void this.syncAuthState(firebaseUser).finally(() => {
          if (!initialStateHandled) {
            initialStateHandled = true;
            console.info(
              '[Auth] Auth state initialized:',
              firebaseUser ? firebaseUser.email : 'anonymous',
            );
            resolve();
          }
        });
      });

      // Fallback timeout in case onAuthStateChanged never fires
      const timeout = setTimeout(() => {
        if (!initialStateHandled) {
          console.warn(
            '[Auth] onAuthStateChanged timeout - proceeding without initial state',
          );
          initialStateHandled = true;
          resolve();
        }
      }, 5000);
    });
  }

  private async initializeDemoAccount(): Promise<void> {
    const demoPassword = this.resolveDemoPassword();

    const demoUsers = [
      {
        id: 'DEMO001',
        name: 'Admin Tổng',
        email: 'test@example.com',
        password: demoPassword,
        phone: '0901234567',
        address: 'Đà Lạt, Lâm Đồng',
        roleId: 'admin' as const,
      },
      {
        id: 'DEMO002',
        name: 'Admin Kho',
        email: 'admin.stock@dalatfarm.vn',
        password: demoPassword,
        phone: '0902234567',
        address: 'Kho trung tâm Đà Lạt',
        roleId: 'admin' as const,
      },
      {
        id: 'DEMO003',
        name: 'Người Bán Demo',
        email: 'seller@dalatfarm.vn',
        password: demoPassword,
        phone: '0905234567',
        address: 'Chợ Đà Lạt, Lâm Đồng',
        roleId: 'seller' as const,
      },
      {
        id: 'DEMO101',
        name: 'Khách Hàng A',
        email: 'customer.a@dalatfarm.vn',
        password: demoPassword,
        phone: '0903234567',
        address: 'Phường 1, Đà Lạt',
        roleId: 'customer' as const,
      },
      {
        id: 'DEMO102',
        name: 'Khách Hàng B',
        email: 'customer.b@dalatfarm.vn',
        password: demoPassword,
        phone: '0904234567',
        address: 'Phường 3, Đà Lạt',
        roleId: 'customer' as const,
      },
    ];

    for (const demoUser of demoUsers) {
      try {
        // First, try to create user in Firebase Authentication
        // This will fail silently if user already exists (we catch and continue)
        try {
          const authCredential = await createUserWithEmailAndPassword(
            this.auth,
            demoUser.email,
            demoUser.password,
          );

          // Create profile in Firestore after creating in Auth
          await setDoc(doc(this.firestore, 'users', authCredential.user.uid), {
            id: authCredential.user.uid,
            name: demoUser.name,
            email: demoUser.email,
            phone: demoUser.phone,
            address: demoUser.address,
            avatar: AuthService.DEFAULT_AVATAR,
            role_id: demoUser.roleId,
            status: 'active',
            auth_provider: 'password',
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
            last_login: serverTimestamp(),
          });
        } catch (authError: any) {
          // If user already exists in Firebase Auth, just update Firestore profile
          if (authError?.code === 'auth/email-already-in-use') {
            // Try to get existing user by email from Firestore
            const existingFirestoreUser = await this.getUserByEmail(
              demoUser.email,
            );
            if (existingFirestoreUser) {
              // Update existing Firestore document
              try {
                await setDoc(
                  doc(
                    this.firestore,
                    'users',
                    existingFirestoreUser['id'] ?? demoUser.id,
                  ),
                  {
                    name: existingFirestoreUser['name'] ?? demoUser.name,
                    phone: existingFirestoreUser['phone'] ?? demoUser.phone,
                    address:
                      existingFirestoreUser['address'] ?? demoUser.address,
                    avatar:
                      existingFirestoreUser['avatar'] ??
                      AuthService.DEFAULT_AVATAR,
                    role_id: demoUser.roleId,
                    status: 'active',
                    updated_at: serverTimestamp(),
                    last_login: serverTimestamp(),
                  },
                  { merge: true },
                );
              } catch (updateError) {
                // Firestore write may fail due to permissions not being deployed yet
                console.warn(
                  `[Auth] Could not update Firestore for ${demoUser.email} (Rules may not be deployed):`,
                  updateError,
                );
              }
            }
          } else if (
            authError?.code?.includes('permission') ||
            authError?.message?.includes('permission')
          ) {
            // Permission error - Rules likely not deployed, but Firebase Auth might exist
            console.warn(
              `[Auth] Permission denied for demo account ${demoUser.email} - Firestore Rules may not be deployed to Firebase yet`,
            );
          } else {
            // Other auth errors - log but continue with other demo accounts
            console.warn(
              `[Init Demo] Failed to create auth for ${demoUser.email}:`,
              authError?.message,
            );
          }
        }
      } catch (error) {
        console.error(
          `[Init Demo] Error initializing demo account ${demoUser.email}:`,
          error,
        );
      }
    }
  }

  private async sanitizeLegacyCredentialFields(): Promise<void> {
    try {
      // Only sanitize current user profile (don't try to read all users - permission denied)
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        console.debug('[Auth] No current user - skipping sanitization');
        return;
      }

      const userDocRef = doc(this.firestore, 'users', currentUser.uid);
      const userDocSnapshot = await getDoc(userDocRef);

      if (!userDocSnapshot.exists()) {
        console.debug('[Auth] User profile not found - skipping sanitization');
        return;
      }

      const data = userDocSnapshot.data();
      const hasLegacyCredentials =
        Object.prototype.hasOwnProperty.call(data, 'password') ||
        Object.prototype.hasOwnProperty.call(data, 'password_hash') ||
        Object.prototype.hasOwnProperty.call(data, 'password_salt');

      if (hasLegacyCredentials) {
        console.info(
          '[Auth] Removing legacy credential fields from user profile',
        );
        await updateDoc(userDocRef, {
          password: deleteField(),
          password_hash: deleteField(),
          password_salt: deleteField(),
          updated_at: serverTimestamp(),
        });
      }
    } catch (error) {
      // Ignore sanitization failures to avoid blocking app startup
      console.warn(
        '[Auth] Sanitization skipped (normal in SPAs):',
        (error as any)?.code,
      );
    }
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ success: boolean; message: string; user?: User }> {
    await this.authReadyPromise;

    try {
      const credential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password,
      );
      const user = await this.ensureUserProfileDoc(credential.user);
      await this.persistCurrentUser(user);
      return { success: true, message: 'Đăng nhập thành công', user };
    } catch (error) {
      // Log error for debugging (visible in browser console)
      console.error('[Auth] Login error:', {
        code: this.getAuthErrorCode(error),
        message: (error as any)?.message,
        fullError: error,
      });

      if (this.isRecoverableLegacyLoginError(error)) {
        const migratedUser = await this.migrateLegacyUserToFirebaseAuth(
          email,
          password,
        );
        if (migratedUser) {
          return {
            success: true,
            message: 'Đăng nhập thành công',
            user: migratedUser,
          };
        }
      }

      // Check for Firestore/network errors (400, permission denied, etc)
      const errorMessage = this.mapAuthError(
        error,
        'Email hoặc mật khẩu không đúng',
      );
      if (errorMessage.includes('400') || errorMessage.includes('permission')) {
        return {
          success: false,
          message: `${errorMessage}\n\n💡 Hãy thử:\n1. Nhấn "Khôi Phục Demo" trên trang login\n2. Hoặc xóa cache (Ctrl+Shift+Delete) rồi tải lại`,
        };
      }

      return { success: false, message: errorMessage };
    }
  }

  async register(
    name: string,
    email: string,
    phone: string,
    password: string,
    address: string,
  ): Promise<{ success: boolean; message: string; user?: User }> {
    await this.authReadyPromise;

    try {
      const credential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password,
      );
      const newUser: User = {
        id: credential.user.uid,
        name,
        email,
        phone,
        address,
        avatar: AuthService.DEFAULT_AVATAR,
        role: 'customer',
      };

      await updateAuthProfile(credential.user, {
        displayName: name,
        photoURL: newUser.avatar,
      });

      await this.persistUserProfile(newUser, undefined, credential.user);
      await this.persistCurrentUser(newUser);

      return { success: true, message: 'Đăng ký thành công', user: newUser };
    } catch (error) {
      return {
        success: false,
        message: this.mapAuthError(error, 'Không thể đăng ký tài khoản'),
      };
    }
  }

  async logout(): Promise<void> {
    await this.performLogout();
  }

  enableGuestMode(): void {
    void this.activateGuestMode();
  }

  async loginWithGoogle(): Promise<{
    success: boolean;
    message: string;
    user?: User;
  }> {
    try {
      await this.authReadyPromise;
    } catch (error) {
      return {
        success: false,
        message: this.mapAuthError(
          error,
          'Không thể khởi tạo xác thực Firebase',
        ),
      };
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      console.info(
        '[Auth] Attempting Google login with popup (no redirect - it needs sessionStorage)...',
      );

      try {
        // Use native wrapper for mobile WebView compatibility
        // Wrapper handles sessionStorage issues on Capacitor WebView
        let credential;
        try {
          credential = await this.nativeGoogleAuthService.signIn(this.auth);
        } catch (nativeError: any) {
          // If native service fails, provide detailed mobile-friendly error
          console.error('[Auth] Native Google Auth failed:', nativeError);
          throw nativeError;
        }
        const user = await this.ensureUserProfileDoc(credential.user);
        await this.persistCurrentUser(user);

        return {
          success: true,
          message: 'Đăng nhập thành công với Google',
          user,
        };
      } catch (popupError: any) {
        const errorCode = (popupError as any)?.code;
        const errorMsg = (popupError as any)?.message || '';

        console.warn('[Auth] Popup auth failed:', errorCode, errorMsg);

        // Check what type of error occurred
        if (
          errorCode === 'auth/popup-blocked' ||
          errorCode === 'auth/popup-closed-by-user'
        ) {
          return {
            success: false,
            message: `❌ Popup bị chặn hoặc bạn đóng cửa sổ Google.\n\nVui lòng:\n1. Thử lại\n2. Hoặc dùng tài khoản Demo\n3. Hoặc đăng ký tài khoản mới`,
          };
        }

        // Check if it's a storage/environment error
        if (
          errorMsg.includes('sessionStorage') ||
          errorMsg.includes('partitioned') ||
          errorCode?.includes('permission')
        ) {
          return {
            success: false,
            message: `⚠️ Trình duyệt này không hỗ trợ đăng nhập Google.\n\nVui lòng:\n1. Dùng Chrome/Firefox browser\n2. Hoặc đăng ký tài khoản mới (email + password)\n3. Hoặc dùng tài khoản Demo`,
          };
        }

        // Network error
        if (errorCode?.includes('network') || errorMsg.includes('network')) {
          return {
            success: false,
            message: `❌ Lỗi kết nối mạng.\n\nVui lòng:\n1. Kiểm tra Wi-Fi/3G/4G\n2. Thử lại`,
          };
        }

        // Fallback for unknown errors
        return {
          success: false,
          message: this.mapAuthError(
            popupError,
            'Không thể đăng nhập với Google. Thử dùng tài khoản Demo hoặc đăng ký mới',
          ),
        };
      }
    } catch (error) {
      return {
        success: false,
        message: this.mapAuthError(error, 'Không thể đăng nhập với Google'),
      };
    }
  }

  private checkStorageAccess(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  isGuestMode(): boolean {
    return this.isGuestModeSubject.value;
  }

  canShop(): boolean {
    // User can shop if authenticated OR in guest mode
    return this.isAuthenticated() || this.isGuestMode();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  isAdmin(): boolean {
    return this.currentUserSubject.value?.role === 'admin';
  }

  isSeller(): boolean {
    // Seller area is shared for seller and admin accounts.
    const role = this.currentUserSubject.value?.role;
    return role === 'seller' || role === 'admin';
  }

  isStockManager(): boolean {
    // Both admin and seller can manage stock
    const role = this.currentUserSubject.value?.role;
    return role === 'admin' || role === 'seller';
  }

  async waitForAuthReady(): Promise<void> {
    await this.authReadyPromise;
  }

  /**
   * Ensure demo accounts are created in Firebase Firestore
   * Useful for first-time setup or debugging login issues
   */
  async ensureDemoAccountsCreated(): Promise<{
    success: boolean;
    message: string;
    createdCount: number;
  }> {
    await this.authReadyPromise;

    if (!environment.enableDemoAccount) {
      return {
        success: false,
        message:
          'Demo accounts bị vô hiệu hóa trong production. Kích hoạt enableDemoAccount trong environment.ts',
        createdCount: 0,
      };
    }

    try {
      // Remove old Firestore-only users (created before Firebase Auth fix)
      const oldDemoEmails = [
        'test@example.com',
        'admin.stock@dalatfarm.vn',
        'seller@dalatfarm.vn',
        'customer.a@dalatfarm.vn',
        'customer.b@dalatfarm.vn',
      ];

      for (const email of oldDemoEmails) {
        const oldUser = await this.getUserByEmail(email);
        if (oldUser && !oldUser['password']) {
          // No password stored = likely old Firestore-only record
          // Delete it so new Firebase Auth user can be created with matching UID
          try {
            await deleteDoc(doc(this.firestore, 'users', oldUser['id']));
          } catch {
            // Ignore delete errors
          }
        }
      }

      // Re-initialize demo accounts with proper Firebase Auth
      await this.initializeDemoAccount();
      await this.markDemoAccountsInitialized();

      return {
        success: true,
        message: `✅ Đã tạo/cập nhật thành công các tài khoản demo trong Firebase Auth.\n\nEmail: ${oldDemoEmails.join(', ')}\nMật khẩu: lấy từ biến DEMO_ACCOUNT_PASSWORD trong .env`,
        createdCount: oldDemoEmails.length,
      };
    } catch (error) {
      console.error('Failed to ensure demo accounts:', error);
      return {
        success: false,
        message: `⚠️ Lỗi khi tạo tài khoản demo: ${this.mapAuthError(error, 'Lỗi không xác định')}`,
        createdCount: 0,
      };
    }
  }

  private resolveDemoPassword(): string {
    const password = environment.demoAccountPassword?.trim() ?? '';
    if (!password) {
      throw new Error(
        'Thiếu DEMO_ACCOUNT_PASSWORD trong .env khi bật enableDemoAccount.',
      );
    }

    if (password.length < 8) {
      throw new Error('DEMO_ACCOUNT_PASSWORD phải có ít nhất 8 ký tự.');
    }

    return password;
  }

  private async shouldInitializeDemoAccounts(): Promise<boolean> {
    try {
      const markerDoc = await getDoc(
        doc(this.firestore, 'app_state', AuthService.DEMO_INIT_MARKER_KEY),
      );
      return !markerDoc.exists() || markerDoc.data()['value'] !== true;
    } catch {
      return true;
    }
  }

  private async markDemoAccountsInitialized(): Promise<void> {
    try {
      await setDoc(
        doc(this.firestore, 'app_state', AuthService.DEMO_INIT_MARKER_KEY),
        {
          value: true,
          updatedAt: Date.now(),
        },
        { merge: true },
      );
    } catch {
      // Ignore marker write failures to avoid blocking login flows.
    }
  }

  updateUserProfile(user: User): void {
    this.currentUserSubject.next(user);
    void updateDoc(doc(this.firestore, 'users', user.id), {
      name: user.name,
      phone: user.phone,
      address: user.address,
      avatar: user.avatar ?? '',
      updated_at: serverTimestamp(),
    });
  }

  async updateProfile(
    name: string,
    phone: string,
    address: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.authReadyPromise;

    const firebaseUser = this.auth.currentUser;
    const currentUser = this.getCurrentUser();
    if (!firebaseUser || !currentUser) {
      return { success: false, message: 'Không tìm thấy thông tin người dùng' };
    }

    const updatedUser: User = {
      ...currentUser,
      name,
      phone,
      address,
    };

    try {
      await updateAuthProfile(firebaseUser, {
        displayName: name,
        photoURL: updatedUser.avatar ?? AuthService.DEFAULT_AVATAR,
      });
      await this.persistUserProfile(updatedUser, undefined, firebaseUser);
      await this.persistCurrentUser(updatedUser);
      return { success: true, message: 'Cập nhật thành công' };
    } catch (error) {
      return {
        success: false,
        message: this.mapAuthError(error, 'Không thể cập nhật thông tin'),
      };
    }
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.authReadyPromise;

    const firebaseUser = this.auth.currentUser;
    if (!firebaseUser || !firebaseUser.email) {
      return { success: false, message: 'Không tìm thấy thông tin người dùng' };
    }

    try {
      const credential = EmailAuthProvider.credential(
        firebaseUser.email,
        currentPassword,
      );
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);
      await updateDoc(doc(this.firestore, 'users', firebaseUser.uid), {
        password: deleteField(),
        password_hash: deleteField(),
        password_salt: deleteField(),
        updated_at: serverTimestamp(),
      });

      return { success: true, message: 'Đổi mật khẩu thành công' };
    } catch (error) {
      return {
        success: false,
        message: this.mapAuthError(error, 'Không thể đổi mật khẩu'),
      };
    }
  }

  async forgotPassword(
    email: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.authReadyPromise;

    try {
      await sendPasswordResetEmail(this.auth, email);
      return {
        success: true,
        message: `Đã gửi link khôi phục mật khẩu về ${email}`,
      };
    } catch (error) {
      return {
        success: false,
        message: this.mapAuthError(
          error,
          'Không thể gửi email khôi phục mật khẩu',
        ),
      };
    }
  }

  async deleteAccount(): Promise<{ success: boolean; message: string }> {
    await this.authReadyPromise;

    const firebaseUser = this.auth.currentUser;
    if (!firebaseUser) {
      return {
        success: false,
        message: 'Không tìm thấy phiên đăng nhập hiện tại',
      };
    }

    try {
      const userRef = doc(this.firestore, 'users', firebaseUser.uid);
      await deleteUser(firebaseUser);
      await deleteDoc(userRef).catch(() => undefined);
      this.currentUserSubject.next(null);
      this.isAuthenticatedSubject.next(false);
      this.isGuestModeSubject.next(false);
      this.writeGuestModeFlag(false);
      return { success: true, message: 'Tài khoản đã được xóa' };
    } catch (error) {
      return {
        success: false,
        message: this.mapAuthError(error, 'Không thể xóa tài khoản'),
      };
    }
  }

  /**
   * Security check: Verify user owns the data they're trying to modify
   * Only allow edit/delete if userId matches current user's ID
   */
  async verifyUserOwnership(
    userId: string,
  ): Promise<{ authorized: boolean; message?: string }> {
    const currentUser = this.getCurrentUser();

    if (!currentUser) {
      return {
        authorized: false,
        message: 'Vui lòng đăng nhập để thực hiện hành động này',
      };
    }

    if (currentUser.id !== userId) {
      console.warn(
        `Unauthorized access attempt: user ${currentUser.id} tried to modify user ${userId}`,
      );
      return {
        authorized: false,
        message: 'Bạn không có quyền chỉnh sửa thông tin này',
      };
    }

    return { authorized: true };
  }

  /**
   * Update profile with avatar upload
   * Includes security check to ensure only user can modify their own profile
   * ✅ FIX: Actually upload avatar + save Download URL (not placeholder)
   */
  async updateProfileWithAvatar(
    userId: string,
    updates: Partial<User>,
    avatarFile?: File,
  ): Promise<{ success: boolean; message: string; user?: User }> {
    await this.authReadyPromise;

    // Security check: verify user can only modify their own data
    const ownershipCheck = await this.verifyUserOwnership(userId);
    if (!ownershipCheck.authorized) {
      return {
        success: false,
        message: ownershipCheck.message || 'Không có quyền truy cập',
      };
    }

    const firebaseUser = this.auth.currentUser;
    const currentUser = this.getCurrentUser();

    if (!firebaseUser || !currentUser) {
      return { success: false, message: 'Không tìm thấy thông tin người dùng' };
    }

    try {
      const updatedUser: User = {
        ...currentUser,
        ...updates,
      };

      // Avatar upload via Cloudinary and save secure_url.
      if (avatarFile) {
        try {
          const downloadUrl =
            await this.cloudinaryImageStorageService.uploadUserAvatar(
              userId,
              avatarFile,
            );

          updatedUser.avatar = downloadUrl;

          console.log('Avatar uploaded successfully:', downloadUrl);
        } catch (uploadError) {
          console.error('Avatar upload error:', uploadError);
          // Continue with profile update even if avatar fails
          // (user can update other fields while avatar setup is being debugged)
        }
      }

      await updateAuthProfile(firebaseUser, {
        displayName: updatedUser.name,
        photoURL: updatedUser.avatar ?? AuthService.DEFAULT_AVATAR,
      });

      await this.persistUserProfile(updatedUser, undefined, firebaseUser);
      await this.persistCurrentUser(updatedUser);

      return {
        success: true,
        message: 'Cập nhật thành công',
        user: updatedUser,
      };
    } catch (error) {
      return {
        success: false,
        message: this.mapAuthError(error, 'Không thể cập nhật thông tin'),
      };
    }
  }

  /**
   * Delete user data with security verification
   * Only allows deletion of owned data
   */
  async deleteUserData(
    userId: string,
    dataType: 'profile' | 'account',
  ): Promise<{ success: boolean; message: string }> {
    await this.authReadyPromise;

    // Security check
    const ownershipCheck = await this.verifyUserOwnership(userId);
    if (!ownershipCheck.authorized) {
      return {
        success: false,
        message: ownershipCheck.message || 'Không có quyền truy cập',
      };
    }

    try {
      if (dataType === 'account') {
        return await this.deleteAccount();
      }

      // Delete profile data only
      const userRef = doc(this.firestore, 'users', userId);
      await updateDoc(userRef, {
        address: deleteField(),
        phone: deleteField(),
        avatar: deleteField(),
        updated_at: serverTimestamp(),
      });

      return { success: true, message: 'Dữ liệu đã được xóa' };
    } catch (error) {
      return {
        success: false,
        message: this.mapAuthError(error, 'Không thể xóa dữ liệu'),
      };
    }
  }

  private async getUserByEmail(
    email: string,
  ): Promise<Record<string, any> | null> {
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('email', '==', email), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const userDoc = querySnapshot.docs[0];
    return {
      ...userDoc.data(),
      id: userDoc.id,
    };
  }

  private async getUserById(
    userId: string,
  ): Promise<Record<string, any> | null> {
    const directDoc = await getDoc(doc(this.firestore, 'users', userId));
    if (directDoc.exists()) {
      return {
        ...directDoc.data(),
        id: directDoc.id,
      };
    }

    const usersRef = collection(this.firestore, 'users');
    const byIdQuery = query(usersRef, where('id', '==', userId), limit(1));
    const byIdSnapshot = await getDocs(byIdQuery);

    if (byIdSnapshot.empty) {
      const fallbackSnapshot = await getDocs(
        query(
          usersRef,
          where('email', '==', this.currentUserSubject.value?.email ?? ''),
          limit(1),
        ),
      );
      if (fallbackSnapshot.empty) {
        return null;
      }

      const fallbackDoc = fallbackSnapshot.docs[0];
      return {
        ...fallbackDoc.data(),
        id: fallbackDoc.id,
      };
    }

    const userDoc = byIdSnapshot.docs[0];
    return {
      ...userDoc.data(),
      id: userDoc.id,
    };
  }

  private mapUserRecordToUser(
    docId: string,
    record: Record<string, any>,
  ): User {
    const resolvedRole = this.resolveRoleFromRecord(record);

    return {
      id: docId,
      name: record['name'] ?? '',
      email: record['email'] ?? '',
      phone: record['phone'] ?? '',
      address: record['address'] ?? '',
      avatar: record['avatar'] ?? AuthService.DEFAULT_AVATAR,
      role: resolvedRole,
    };
  }

  private async syncAuthState(
    firebaseUser: FirebaseUser | null,
  ): Promise<void> {
    if (firebaseUser) {
      const user = await this.ensureUserProfileDoc(firebaseUser);
      await this.persistCurrentUser(user);
      return;
    }

    const guestMode = this.readGuestModeFlag();
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.isGuestModeSubject.next(guestMode);
  }

  private async ensureUserProfileDoc(
    firebaseUser: FirebaseUser,
  ): Promise<User> {
    const userRef = doc(this.firestore, 'users', firebaseUser.uid);
    const directSnapshot = await getDoc(userRef);

    if (directSnapshot.exists()) {
      const existingRecord = directSnapshot.data();
      const currentUser = this.mapUserRecordToUser(firebaseUser.uid, {
        ...existingRecord,
        name: existingRecord['name'] ?? firebaseUser.displayName ?? '',
        email: existingRecord['email'] ?? firebaseUser.email ?? '',
        avatar:
          existingRecord['avatar'] ??
          firebaseUser.photoURL ??
          AuthService.DEFAULT_AVATAR,
      });

      await this.persistUserProfile(currentUser, existingRecord, firebaseUser);
      return currentUser;
    }

    const legacyRecord = firebaseUser.email
      ? await this.getUserByEmail(firebaseUser.email)
      : null;
    const user = this.mapFirebaseUserToDomainUser(firebaseUser, legacyRecord);
    await this.persistUserProfile(
      user,
      legacyRecord ?? undefined,
      firebaseUser,
    );

    if (legacyRecord?.['id'] && legacyRecord['id'] !== firebaseUser.uid) {
      await deleteDoc(doc(this.firestore, 'users', legacyRecord['id'])).catch(
        () => undefined,
      );
    }

    return user;
  }

  private mapFirebaseUserToDomainUser(
    firebaseUser: FirebaseUser,
    legacyRecord?: Record<string, any> | null,
  ): User {
    const resolvedRole = this.resolveRoleFromRecord(legacyRecord ?? undefined);

    return {
      id: firebaseUser.uid,
      name: legacyRecord?.['name'] ?? firebaseUser.displayName ?? 'Khách hàng',
      email: firebaseUser.email ?? legacyRecord?.['email'] ?? '',
      phone: legacyRecord?.['phone'] ?? '',
      address: legacyRecord?.['address'] ?? '',
      avatar:
        legacyRecord?.['avatar'] ??
        firebaseUser.photoURL ??
        AuthService.DEFAULT_AVATAR,
      role: resolvedRole,
    };
  }

  private async persistUserProfile(
    user: User,
    existingRecord?: Record<string, any>,
    firebaseUser?: FirebaseUser,
  ): Promise<void> {
    const resolvedRole =
      user.role ?? this.resolveRoleFromRecord(existingRecord) ?? 'customer';

    await setDoc(
      doc(this.firestore, 'users', user.id),
      {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        avatar: user.avatar ?? AuthService.DEFAULT_AVATAR,
        role_id: resolvedRole,
        role: resolvedRole,
        status: existingRecord?.['status'] ?? 'active',
        auth_provider:
          firebaseUser?.providerData[0]?.providerId ??
          existingRecord?.['auth_provider'] ??
          'password',
        created_at: existingRecord?.['created_at'] ?? serverTimestamp(),
        updated_at: serverTimestamp(),
        last_login: serverTimestamp(),
        password: deleteField(),
        password_hash: deleteField(),
        password_salt: deleteField(),
      },
      { merge: true },
    );
  }

  private resolveRoleFromRecord(
    record?: Record<string, any> | null,
  ): User['role'] {
    const rawRole = (
      record?.['role_id'] ??
      record?.['role'] ??
      record?.['roleId'] ??
      ''
    )
      .toString()
      .trim()
      .toLowerCase();

    if (rawRole === 'admin') {
      return 'admin';
    }

    if (rawRole === 'seller') {
      return 'seller';
    }

    return 'customer';
  }

  private async persistCurrentUser(user: User): Promise<void> {
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
    this.isGuestModeSubject.next(false);
    this.writeGuestModeFlag(false);
  }

  private async activateGuestMode(): Promise<void> {
    this.writeGuestModeFlag(true);

    if (this.auth.currentUser) {
      await signOut(this.auth).catch(() => undefined);
    }

    await this.nativeGoogleAuthService.signOut().catch(() => undefined);

    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.isGuestModeSubject.next(true);
  }

  private async performLogout(): Promise<void> {
    this.writeGuestModeFlag(false);
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.isGuestModeSubject.next(false);
    await signOut(this.auth).catch(() => undefined);
    await this.nativeGoogleAuthService.signOut().catch(() => undefined);
  }

  private async migrateLegacyUserToFirebaseAuth(
    email: string,
    password: string,
  ): Promise<User | null> {
    const legacyRecord = await this.getUserByEmail(email);
    if (
      !legacyRecord ||
      !(await this.verifyAndMigratePassword(legacyRecord, password))
    ) {
      return null;
    }

    try {
      const credential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password,
      );
      const user = this.mapUserRecordToUser(credential.user.uid, legacyRecord);

      await updateAuthProfile(credential.user, {
        displayName: user.name,
        photoURL: user.avatar ?? AuthService.DEFAULT_AVATAR,
      });

      await this.persistUserProfile(user, legacyRecord, credential.user);

      if (legacyRecord['id'] && legacyRecord['id'] !== credential.user.uid) {
        await deleteDoc(doc(this.firestore, 'users', legacyRecord['id'])).catch(
          () => undefined,
        );
      }

      await this.persistCurrentUser(user);
      return user;
    } catch (error) {
      if (this.getAuthErrorCode(error) === 'auth/email-already-in-use') {
        return null;
      }

      throw error;
    }
  }

  private async createPasswordRecord(
    password: string,
  ): Promise<{ password_hash: string; password_salt: string }> {
    const salt = this.generateSalt();
    const hash = await this.hashPassword(password, salt);
    return {
      password_hash: hash,
      password_salt: salt,
    };
  }

  private async verifyAndMigratePassword(
    userRecord: Record<string, any>,
    password: string,
  ): Promise<boolean> {
    const docId = userRecord['id'];
    const hash = userRecord['password_hash'];
    const salt = userRecord['password_salt'];

    if (typeof hash === 'string' && typeof salt === 'string') {
      const computedHash = await this.hashPassword(password, salt);
      return computedHash === hash;
    }

    const legacyPassword = userRecord['password'];
    if (typeof legacyPassword === 'string' && legacyPassword === password) {
      const newPasswordRecord = await this.createPasswordRecord(password);
      await updateDoc(doc(this.firestore, 'users', docId), {
        ...newPasswordRecord,
        password: deleteField(),
        updated_at: serverTimestamp(),
      });
      return true;
    }

    return false;
  }

  private generateSalt(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async hashPassword(password: string, salt: string): Promise<string> {
    const data = new TextEncoder().encode(`${salt}:${password}`);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(digest));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  private isRecoverableLegacyLoginError(error: unknown): boolean {
    const code = this.getAuthErrorCode(error);
    return (
      code === 'auth/user-not-found' ||
      code === 'auth/invalid-credential' ||
      code === 'auth/invalid-login-credentials'
    );
  }

  private getAuthErrorCode(error: unknown): string | null {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof (error as { code: unknown }).code === 'string'
    ) {
      return (error as { code: string }).code;
    }

    return null;
  }

  private mapAuthError(error: unknown, fallbackMessage: string): string {
    const code = this.getAuthErrorCode(error);
    const errorObj = error as any;

    switch (code) {
      case 'auth/email-already-in-use':
        return 'Email đã được sử dụng';
      case 'auth/invalid-email':
        return 'Email không hợp lệ';
      case 'auth/weak-password':
        return 'Mật khẩu phải có ít nhất 6 ký tự';
      case 'auth/user-not-found':
      case 'auth/invalid-credential':
      case 'auth/invalid-login-credentials':
        return 'Email hoặc mật khẩu không đúng';
      case 'auth/popup-closed-by-user':
        return 'Bạn đã đóng cửa sổ đăng nhập Google';
      case 'auth/popup-blocked':
        return 'Trình duyệt đang chặn cửa sổ đăng nhập Google';
      case 'auth/cancelled-popup-request':
        return 'Yêu cầu đăng nhập Google đã bị hủy';
      case 'auth/unauthorized-domain':
        return 'Domain hiện tại chưa được cấp quyền trong Firebase Authentication > Settings > Authorized domains';
      case 'auth/operation-not-supported-in-this-environment':
        return 'Môi trường hiện tại không hỗ trợ popup đăng nhập Google. Hãy thử bằng trình duyệt với URL localhost';
      case 'auth/requires-recent-login':
        return 'Vui lòng đăng nhập lại trước khi thực hiện thao tác này';
      case 'auth/too-many-requests':
        return 'Bạn thử quá nhiều lần. Vui lòng thử lại sau';
      case 'auth/network-request-failed':
        return 'Không thể kết nối tới Firebase. Vui lòng kiểm tra mạng';
      case 'auth/invalid-api-key':
      case 'auth/app-not-authorized':
      case 'auth/project-not-found':
        return 'Cấu hình Firebase không hợp lệ. Vui lòng kiểm tra file env.js và tải lại trang (Ctrl+F5)';
      case 'auth/operation-not-allowed':
      case 'auth/configuration-not-found':
        return 'Nhà cung cấp đăng nhập chưa được bật trong Firebase Console';
      default:
        // Check for HTTP 400 and permission/network errors (Firestore/Firebase API issues)
        if (
          errorObj?.message?.includes('400') ||
          errorObj?.statusCode === 400
        ) {
          return 'Lỗi 400: Yêu cầu không hợp lệ. Có thể Firestore Rules bị chặn. Hãy thử "Khôi Phục Demo"';
        }

        if (
          errorObj?.message?.includes('Permission denied') ||
          code === 'permission-denied'
        ) {
          return 'Lỗi: Không có quyền truy cập. Firestore Rules có thể bị chặn. Hãy thử "Khôi Phục Demo"';
        }

        // If error has a custom message, include it
        if (errorObj?.message && typeof errorObj.message === 'string') {
          return `${fallbackMessage} (${errorObj.message.substring(0, 100)})`;
        }
        return fallbackMessage;
    }
  }

  private readGuestModeFlag(): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }

    return localStorage.getItem(AuthService.GUEST_MODE_KEY) === 'true';
  }

  private writeGuestModeFlag(value: boolean): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(AuthService.GUEST_MODE_KEY, String(value));
  }
}
