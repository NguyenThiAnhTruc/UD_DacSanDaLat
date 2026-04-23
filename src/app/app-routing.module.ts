import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AdminGuard } from './guards/admin.guard';
import { SellerGuard } from './guards/seller.guard';
import { StockManagerGuard } from './guards/stock-manager.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'splash',
    pathMatch: 'full'
  },
  {
    path: 'splash',
    loadChildren: () => import('./splash/splash.module').then( m => m.SplashPageModule)
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule)
  },
  {
    path: 'product-detail/:id',
    loadChildren: () => import('./product-detail/product-detail.module').then(m => m.ProductDetailPageModule)
  },
  {
    path: 'cart',
    loadChildren: () => import('./app/cart/cart.module').then( m => m.CartPageModule)
  },
  {
    path: 'orders',
    loadChildren: () => import('./orders/orders.module').then( m => m.OrdersPageModule)
  },
  {
    path: 'favorites',
    loadChildren: () => import('./favorites/favorites.module').then( m => m.FavoritesPageModule)
  },
  {
    path: 'edit-profile',
    loadChildren: () => import('./edit-profile/edit-profile.module').then( m => m.EditProfilePageModule)
  },
  {
    path: 'product-origin/:id',
    loadChildren: () => import('./product-origin/product-origin.module').then( m => m.ProductOriginPageModule)
  },
  {
    path: 'qr-scanner',
    loadChildren: () => import('./qr-scanner/qr-scanner.module').then( m => m.QrScannerPageModule)
  },
  {
    path: 'admin/stock-history',
    canMatch: [AdminGuard],
    canActivate: [AdminGuard],
    loadChildren: () => import('./admin-stock-history/admin-stock-history.module').then( m => m.AdminStockHistoryPageModule)
  },
  {
    path: 'admin/stock-management',
    canMatch: [AdminGuard],
    canActivate: [AdminGuard],
    loadChildren: () => import('./admin-stock-management/admin-stock-management.module').then( m => m.AdminStockManagementPageModule)
  },
  {
    path: 'seller/stock-management',
    canMatch: [StockManagerGuard],
    canActivate: [StockManagerGuard],
    loadChildren: () => import('./admin-stock-management/admin-stock-management.module').then( m => m.AdminStockManagementPageModule)
  },
  {
    path: 'seller/products',
    canMatch: [SellerGuard],
    canActivate: [SellerGuard],
    loadChildren: () => import('./seller-products/seller-products.module').then(m => m.SellerProductsPageModule)
  },
  {
    path: 'seller/orders',
    canMatch: [SellerGuard],
    canActivate: [SellerGuard],
    loadChildren: () => import('./seller-orders/seller-orders.module').then(m => m.SellerOrdersPageModule)
  }

];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
