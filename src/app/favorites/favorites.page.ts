import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Product } from '../models/product.model';
import { ProductService } from '../services/product.service';
import { FavoritesService } from '../services/favorites.service';

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.page.html',
  styleUrls: ['./favorites.page.scss'],
  standalone: false
})
export class FavoritesPage implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private favoritesService = inject(FavoritesService);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);
  private router = inject(Router);

  favoriteProducts: Product[] = [];
  private allProducts: Product[] = [];
  private productsSubscription?: Subscription;
  private favoritesSubscription?: Subscription;

  ngOnInit() {
    this.productsSubscription = this.productService.products$.subscribe(products => {
      this.allProducts = products;
      this.loadFavorites();
    });

    this.favoritesSubscription = this.favoritesService.favorites$.subscribe(() => {
      this.loadFavorites();
    });
  }

  ngOnDestroy() {
    if (this.productsSubscription) {
      this.productsSubscription.unsubscribe();
    }
    if (this.favoritesSubscription) {
      this.favoritesSubscription.unsubscribe();
    }
  }

  ionViewWillEnter() {
    this.loadFavorites();
  }

  loadFavorites() {
    const favoriteIds = this.getFavoriteIds();
    this.favoriteProducts = this.allProducts.filter(p => favoriteIds.includes(p.id));
  }

  getFavoriteIds(): number[] {
    return this.favoritesService.getFavoriteIds();
  }

  async removeFavorite(product: Product) {
    await this.favoritesService.removeFavorite(product.id);
    
    this.loadFavorites();
    this.showToast(`Đã xóa ${product.name} khỏi danh sách yêu thích`);
  }

  async confirmRemoveFavorite(product: Product) {
    const alert = await this.alertController.create({
      header: 'Xóa khỏi yêu thích',
      message: `Bạn có muốn xóa ${product.name} khỏi danh sách yêu thích?`,
      buttons: [
        {
          text: 'Hủy',
          role: 'cancel'
        },
        {
          text: 'Xóa',
          role: 'destructive',
          handler: async () => {
            await this.removeFavorite(product);
          }
        }
      ]
    });

    await alert.present();
  }

  addToCart(product: Product) {
    this.productService.addToCart(product, 1);
    this.showToast(`Đã thêm ${product.name} vào giỏ hàng`, 'success');
  }

  viewProduct(product: Product) {
    this.router.navigate(['/product-detail', product.id]);
  }

  async clearAllFavorites() {
    const alert = await this.alertController.create({
      header: 'Xóa tất cả',
      message: 'Bạn có chắc muốn xóa tất cả sản phẩm yêu thích?',
      buttons: [
        {
          text: 'Hủy',
          role: 'cancel'
        },
        {
          text: 'Xóa tất cả',
          role: 'destructive',
          handler: async () => {
            await this.favoritesService.clearAllFavorites();
            this.loadFavorites();
            this.showToast('Đã xóa tất cả sản phẩm yêu thích');
          }
        }
      ]
    });

    await alert.present();
  }

  async showToast(message: string, color: string = 'medium') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }
}
