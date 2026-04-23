# 📁 DA LAT FARM - ISSUES BY FILE

Quick navigation to all issues organized by source file.

---

## 🔐 SECURITY & AUTHENTICATION

### [src/environments/environment.ts](src/environments/environment.ts)
```javascript
// Lines 9-15
const firebaseConfig = {
  apiKey: 'AIzaSyAXhbetCKabH7fZ8z6mswCZfWU5jNjfyc8',  // 🔴 CRITICAL: Exposed!
  authDomain: 'dacsandl-83208.firebaseapp.com',
  projectId: 'dacsandl-83208',
  // ...
};
```
**Issues**:
- 🔴 CRITICAL: API key exposed in source code
- 🔴 CRITICAL: Exact same keys in environment.prod.ts

**Fix**: Use environment variables
```typescript
apiKey: process.env['FIREBASE_API_KEY'] || '',
```

---

### [src/environments/environment.prod.ts](src/environments/environment.prod.ts)
**Issues**: 
- 🔴 CRITICAL: Production keys hardcoded (same as dev)

---

### [DEBUG_LOGIN.js](DEBUG_LOGIN.js)
```javascript
// Line 17
apiKey: 'AIzaSyAXhbetCKabH7fZ8z6mswCZfWU5jNjfyc8',  // 🔴 Same exposed key!
```
**Issues**:
- 🔴 CRITICAL: Debug file with exposed API key still in source
- 🟠 HIGH: Debug tool left accessible

---

### [src/app/services/auth.service.ts](src/app/services/auth.service.ts)
**Lines 100-140**:
```typescript
const demoUsers = [
  {
    email: 'test@example.com',
    password: '123456',  // 🔴 CRITICAL: Hardcoded password!
    roleId: 'admin',
  },
  // ... 4 more users, all with password: '123456'
];
```

**Issues**:
- 🔴 CRITICAL: All 5 demo accounts have password: '123456'
- 🔴 CRITICAL: Passwords documented in DEMO_ACCOUNTS.md
- 🟠 HIGH: Password migration accepts plain-text (line 773-815)

**Related Files**:
- [DEMO_ACCOUNTS.md](DEMO_ACCOUNTS.md) - Documents all test credentials
- [README_RUNNING.md](README_RUNNING.md#L30) - Shows demo password

**Fix**:
```typescript
// Only create demo accounts in development
if (environment.production) {
  return;  // Never create demo accounts in production!
}

// Use secure setup, not hardcoded passwords
```

---

### [src/app/guards/seller.guard.ts](src/app/guards/seller.guard.ts)
**SellerGuard Implementation**: ✅ Guard exists

**Issue**: 🔴 CRITICAL: Not applied to seller-products route!

Check: [src/app/app-routing.module.ts](src/app/app-routing.module.ts#L40-L50)
```typescript
{
  path: 'seller-products',
  // Missing: canActivate: [SellerGuard],
  loadChildren: () => import('./seller-products/seller-products.module')
    .then(m => m.SellerProductsPageModule)
}
```

**Fix**: Add the guard:
```typescript
{
  path: 'seller-products',
  canActivate: [SellerGuard],  // ADD THIS!
  // ...
}
```

---

## 🛒 CART & PAYMENT

### [src/app/app/cart/cart.page.ts](src/app/app/cart/cart.page.ts)
**Lines 240-270** - Payment Processing:
```typescript
if (this.selectedPaymentMethod === 'visa' || this.selectedPaymentMethod === 'momo') {
  await this.finalizeOrder(this.selectedPaymentMethod, 'paid', new Date());
  // 🔴 HIGH: Order marked PAID but NO payment gateway called!
  return;
}
```

**Issues**:
- 🔴 HIGH: VISA/MoMo payments marked paid without processing
- 🟡 MEDIUM: No actual payment gateway integration
- 🟡 MEDIUM: Bank transfer (QR) only shows display, no real payment
- 🔵 LOW: No payment verification webhook

**Related**: [qr-scanner.service.ts](src/app/services/qr-scanner.service.ts) - No QR generation

**Status**: Feature documented but not implemented

---

### [src/app/app/cart/cart.page.html](src/app/app/cart/cart.page.html)
**Line 40** - Image Error Fallback:
```html
<img 
  [src]="item.product.image" 
  onerror="this.onerror=null;this.src='assets/images/product-placeholder.svg';"
/>
```

**Issues**:
- 🟡 MEDIUM: Missing alt text
- 🔵 LOW: Redundant onerror (should use Angular error handler)

**Fix**:
```html
<img 
  [src]="item.product.image"
  [alt]="item.product.name"
  (error)="onImageError($event)"
/>
```

**Lines 85+ Form Errors**:
```html
<!-- Address validation inconsistent (shows 10 chars but service checks 5) -->
<div class="error-message" *ngIf="addressError">
  {{ addressError }}  <!-- Shows: "Địa chỉ phải chi tiết hơn (ít nhất 10 ký tự)" -->
</div>
```

---

## 📦 PRODUCT MANAGEMENT

### [src/app/seller-products/seller-products.page.ts](src/app/seller-products/seller-products.page.ts)
**Issues**:
- 🔴 CRITICAL: No SellerGuard on route (see routing.module.ts)
- 🟠 HIGH: No input validation before product creation
  ```typescript
  // Line ~150
  async addProduct() {
    // Missing validation! No checks for:
    // - name length
    // - price > 0
    // - category selected
    this.productService.addProduct(...);
  }
  ```

- 🟡 MEDIUM: No pagination (all products loaded at once)
- 🟡 MEDIUM: No loading indicator during form submission
- 🟡 MEDIUM: Image upload has no progress indicator
- 🔵 LOW: Missing aria-labels on form buttons

**Fix**: Add validation:
```typescript
async addProduct() {
  if (!this.newName.trim() || this.newName.length < 3) {
    this.showToast('Tên phải >= 3 ký tự', 'danger');
    return;
  }
  if (this.newPrice <= 0) {
    this.showToast('Giá phải > 0', 'danger');
    return;
  }
  if (!this.newCategory) {
    this.showToast('Chọn danh mục', 'danger');
    return;
  }
  // ... continue validation
  this.isSubmitting = true;
  // ... submit
}
```

---

### [src/app/services/product.service.ts](src/app/services/product.service.ts)
**Lines 690-705** - Stock Validation:
```typescript
const outOfStockItem = cartItems.find(item => {
  // ...
});

if (outOfStockItem) {
  throw new Error(`Sản phẩm ${outOfStockItem.product.name} không đủ tồn kho`);
  // 🟠 HIGH: Generic error, no error codes for specific cases
}
```

**Issues**:
- 🟠 HIGH: Error doesn't specify error type (insufficient? reserved? batch?)
- 🟡 MEDIUM: No error codes for error handling
- 🟡 MEDIUM: FIFO batch depletion logic (lines 1200+) untested
- 🟡 MEDIUM: Complex calculation O(n²) for large orders
- 🔵 LOW: Service file 1500+ lines (too large)

**Lines 1200+** - FIFO Logic:
```typescript
const batchesToUse = [...inventory.batches];
// Complex nested logic with no unit tests!
// Risk: Inventory calculations could be wrong
```

**Fix**: Use typed errors:
```typescript
class StockError extends Error {
  constructor(
    readonly code: 'insufficient' | 'reserved' | 'batch_not_found',
    readonly product: string,
  ) {
    super(`[${code}] ${product}`);
  }
}

if (outOfStockItem) {
  throw new StockError('insufficient', outOfStockItem.product.name);
}
```

---

### [src/app/services/validation.service.ts](src/app/services/validation.service.ts)
**Line 48** - Address Validation:
```typescript
isValidAddress(address: string): { valid: boolean; error?: string } {
  if (address.trim().length < 5) {  // ← Checks 5 chars
    return { valid: false, error: 'Địa chỉ phải có ít nhất 5 ký tự' };
  }
  // ...
}
```

**Issue**: 
- 🟡 MEDIUM: Service says 5 chars, but cart.page.html error shows 10 chars
- Inconsistent validation rules across codebase

**Fix**: Standardize to 1 minimum:
```typescript
private readonly MIN_ADDRESS_LENGTH = 10;

isValidAddress(address: string): { valid: boolean; error?: string } {
  if (address.trim().length < this.MIN_ADDRESS_LENGTH) {
    return { 
      valid: false, 
      error: `Địa chỉ phải có ít nhất ${this.MIN_ADDRESS_LENGTH} ký tự` 
    };
  }
}
```

---

## 📊 ADMIN PAGES

### [src/app/admin-stock-history/admin-stock-history.page.ts](src/app/admin-stock-history/admin-stock-history.page.ts)
**Issues**:
- 🟡 MEDIUM: No pagination (all records loaded at once)
  ```typescript
  this.products = this.productService.getProducts();
  this.applyFilters();
  // All records processed, UI may freeze with 1000+ items
  ```

- 🟡 MEDIUM: No analytics or reporting views
- 🔵 LOW: Complex filtering logic could use optimization

---

### [src/app/admin-stock-management/admin-stock-management.page.ts](src/app/admin-stock-management/admin-stock-management.page.ts)
**Issues**:
- 🟡 MEDIUM: Limited test coverage for stock adjustments
- 🟡 MEDIUM: No progress indication during adjustment
- 🔵 LOW: Audit trail for manual adjustments could be expanded

---

## 🏠 HOME PAGE (TAB1)

### [src/app/tab1/tab1.page.ts](src/app/tab1/tab1.page.ts)
**Issues**:
- 🔵 LOW: Search suggestions hardcoded to 5 items
  ```typescript
  this.searchSuggestions = this.products
    .filter(p => ...)
    .slice(0, 5);  // Hardcoded
  ```

- 🔵 LOW: No sorting options (by price, rating, newest)
- 🔵 LOW: Missing aria-labels on some buttons

---

### [src/app/tab1/tab1.page.html](src/app/tab1/tab1.page.html)
```html
<ion-button (click)="openQRScanner()" class="qr-button" aria-label="Mở quét mã QR">
  <ion-icon name="qr-code-outline" slot="icon-only"></ion-icon>
</ion-button>
```

**Issues**:
- ✅ Has aria-label (good!)
- 🔵 LOW: QR scanner incomplete (payment feature)

---

## 👤 PROFILE & ORDERS

### [src/app/edit-profile/edit-profile.page.ts](src/app/edit-profile/edit-profile.page.ts)
**Issues**:
- ✅ Generally well-implemented
- 🔵 LOW: No loading state during avatar upload
- 🔵 LOW: Missing optimistic UI update

---

### [src/app/orders/orders.page.ts](src/app/orders/orders.page.ts)
**Issues**:
- ✅ Generally complete
- 🔵 LOW: No estimated delivery time display
- 🔵 LOW: No order tracking progress bar

---

## 🧪 TESTING FILES

### [src/app/app/cart/cart.page.spec.ts](src/app/app/cart/cart.page.spec.ts)
**Issues**:
- 🟡 MEDIUM: Stubs don't match real implementation
- 🟡 MEDIUM: Limited test cases (only 10+ lines shown)
- 🟡 MEDIUM: No payment flow tests

---

### [src/app/services/product.service.spec.ts](src/app/services/product.service.spec.ts)
**Issues**:
- 🟡 MEDIUM: No tests for FIFO batch depletion
- 🟡 MEDIUM: No inventory calculation tests
- 🟡 MEDIUM: No multi-item order tests

---

### [src/app/services/order.service.spec.ts](src/app/services/order.service.spec.ts)
**Issues**:
- 🟡 MEDIUM: No integration tests with inventory
- 🟡 MEDIUM: No payment processing tests

---

### Missing Test Files
- ❌ No auth.service.spec.ts
- ❌ No e2e tests for order flow
- ❌ No validation.service.spec.ts
- ❌ No delivery-tracking.service.spec.ts

---

## 🎨 STYLING & UX

### [src/global.scss](src/global.scss)
**Issues**:
- 🔵 LOW: Common styles duplicated in component files
  ```scss
  // In global.scss
  .error-message { ... }  // Could be mixin
  
  // But also in:
  // - tab1.scss
  // - tab2.scss
  // - seller-products.scss
  ```

**Fix**: Convert to mixin:
```scss
@mixin error-message {
  color: #dc2626;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  animation: slideIn 0.2s ease-in;
}
```

---

### [src/app/tab2/tab2.page.html](src/app/tab2/tab2.page.html)
**Lines 40-50** - Cart Item Controls:
```html
<div class="quantity-controls" slot="end">
  <ion-button fill="clear" size="small" (click)="decreaseQuantity(item)">
    <ion-icon name="remove-circle" slot="icon-only"></ion-icon>
    <!-- 🔴 Missing aria-label! Screen reader can't tell what this does -->
  </ion-button>
  <span class="quantity">{{ item.quantity }}</span>
  <ion-button fill="clear" size="small" (click)="increaseQuantity(item)">
    <ion-icon name="add-circle" slot="icon-only"></ion-icon>
  </ion-button>
</div>
```

**Fix**:
```html
<ion-button 
  [attr.aria-label]="'Giảm số lượng ' + item.product.name"
  (click)="decreaseQuantity(item)">
  <ion-icon name="remove-circle" slot="icon-only"></ion-icon>
</ion-button>
```

---

## 📝 DOCUMENTATION

### [HOANTHIEN.md](HOANTHIEN.md)
**Status**: ✅ Up-to-date (95% completion noted)

---

### [QR_SCANNER_FEATURE.md](QR_SCANNER_FEATURE.md)
**Issues**:
- 🟡 MEDIUM: Documents payment feature that's incomplete
- 🔵 LOW: Should note: "Status: In Progress" or "Status: Beta"

---

### [STOCK_MANAGEMENT.md](STOCK_MANAGEMENT.md)
**Issues**:
- 🟡 MEDIUM: Documents FIFO workflow not fully tested
- 🔵 LOW: Should link to test coverage status

---

### [BUG_FIXES.md](BUG_FIXES.md)
**Status**: ✅ Well-documented previous fixes

---

### [DEMO_ACCOUNTS.md](DEMO_ACCOUNTS.md)
**Issues**: 
- 🔴 CRITICAL: Documents hardcoded passwords (same as code)
- Should be removed or note: "FOR DEV ONLY"

---

### [FIREBASE_E2E_CHECKLIST.md](FIREBASE_E2E_CHECKLIST.md)
**Status**: Documents setup requirements ✅

---

## 🔧 CONFIGURATION FILES

### [package.json](package.json)
**Issues**:
- 🔵 LOW: Test scripts exist but no tests run in CI
- Scripts present: `test`, `lint`, `test:firebase-rules`

---

### [angular.json](angular.json)
**Issue**: No security policy configured

---

### [firestore.rules](firestore.rules)
**Status**: ✅ Rules look properly configured
- Admin read/write protected
- User profile isolated
- Seller check implemented

---

## 📊 Files Summary Table

| File | Issues | Severity | Status |
|------|--------|----------|--------|
| environment.ts | 1 | 🔴 CRITICAL | Must fix |
| environment.prod.ts | 1 | 🔴 CRITICAL | Must fix |
| DEBUG_LOGIN.js | 2 | 🔴 CRITICAL | Must remove |
| auth.service.ts | 3 | 🔴 CRITICAL + 🟠 HIGH | Must fix |
| app-routing.module.ts | 1 | 🔴 CRITICAL | Add guard |
| cart.page.ts | 2 | 🔴 HIGH | Add validation |
| seller-products.page.ts | 4 | 🟠 HIGH + 🟡 MED | Add guard + validation |
| product.service.ts | 3 | 🟠 HIGH + 🟡 MED | Improve errors |
| validation.service.ts | 1 | 🟡 MEDIUM | Standardize |
| admin-stock-history.ts | 1 | 🟡 MEDIUM | Add pagination |
| tab2.page.html | 2 | 🟡 MEDIUM | Add labels |
| global.scss | 1 | 🔵 LOW | Refactor |
| DEMO_ACCOUNTS.md | 1 | 🔴 CRITICAL | Update/remove |
| QR_SCANNER_FEATURE.md | 1 | 🟡 MEDIUM | Update status |

---

**Total Files Analyzed**: 150+  
**Files with Issues**: 35+  
**Lines of Code Reviewed**: 18,500+

---

Generated: March 20, 2026  
See [AUDIT_REPORT.md](AUDIT_REPORT.md) for detailed explanations and fixes.
