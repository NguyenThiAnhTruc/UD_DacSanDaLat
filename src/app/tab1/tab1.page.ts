import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Product } from '../models/product.model';
import { ProductService } from '../services/product.service';
import { FavoritesService } from '../services/favorites.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private favoritesService = inject(FavoritesService);
  private router = inject(Router);
  private toastController = inject(ToastController);

  products: Product[] = [];
  filteredProducts: Product[] = [];
  featuredProducts: Product[] = [];
  favoriteProducts: Product[] = [];
  searchTerm: string = '';
  searchSuggestions: string[] = [];
  showSuggestions: boolean = false;
  selectedCategory: string = 'all';
  categories: string[] = [];
  cartItemCount: number = 0;
  private cartSubscription?: Subscription;
  private favoritesSubscription?: Subscription;
  private productsSubscription?: Subscription;

  ngOnInit() {
    this.productsSubscription = this.productService.products$.subscribe(products => {
      this.products = products;
      this.filteredProducts = products;
      this.featuredProducts = products.slice(0, 6);
      this.loadCategories();
      this.loadFavorites();
    });
    
    // Subscribe to cart changes
    this.cartSubscription = this.productService.cart$.subscribe(() => {
      this.cartItemCount = this.productService.getCartItemCount();
    });

    this.favoritesSubscription = this.favoritesService.favorites$.subscribe(() => {
      this.loadFavorites();
    });
  }

  ngOnDestroy() {
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
    if (this.favoritesSubscription) {
      this.favoritesSubscription.unsubscribe();
    }
    if (this.productsSubscription) {
      this.productsSubscription.unsubscribe();
    }
  }

  ionViewWillEnter() {
    // Reload favorites when tab becomes active
    this.loadFavorites();
  }

  loadCategories() {
    this.categories = this.productService.getCategories();
  }

  loadFavorites() {
    const favoriteIds = this.favoritesService.getFavoriteIds();
    this.favoriteProducts = this.products.filter(p => favoriteIds.includes(p.id));
  }

  onSearchInput() {
    // Filter products first
    this.filterProducts();
    
    // Generate suggestions
    if (this.searchTerm.trim().length > 1) {
      this.searchSuggestions = this.products
        .filter(p => p.name.toLowerCase().includes(this.searchTerm.toLowerCase()))
        .map(p => p.name)
        .slice(0, 5);
      this.showSuggestions = this.searchSuggestions.length > 0;
    } else {
      this.showSuggestions = false;
      this.searchSuggestions = [];
    }
  }

  selectSuggestion(suggestion: string) {
    this.searchTerm = suggestion;
    this.showSuggestions = false;
    this.filterProducts();
  }

  clearSearch() {
    this.searchTerm = '';
    this.showSuggestions = false;
    this.searchSuggestions = [];
    this.filterProducts();
  }

  filterProducts() {
    let results = this.products;

    // Filter by category
    if (this.selectedCategory !== 'all') {
      results = results.filter(p => p.category === this.selectedCategory);
    }

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      results = results.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term)
      );
    }

    this.filteredProducts = results;
  }

  async addToCart(product: Product) {
    if (product.stock <= 0) {
      await this.showToast('❌ Sản phẩm đã hết hàng', 'danger');
      return;
    }

    // Check if adding would exceed stock
    const currentCartItem = this.productService.getCart().find((item: { product: { id: number; }; }) => item.product.id === product.id);
    const currentQuantity = currentCartItem ? currentCartItem.quantity : 0;
    
    if (currentQuantity >= product.stock) {
      await this.showToast(`⚠️ Không thể thêm. Chỉ còn ${product.stock} ${product.unit}`, 'warning');
      return;
    }

    this.productService.addToCart(product, 1);
    
    // Show different messages based on remaining stock
    const remainingStock = product.stock - (currentQuantity + 1);
    if (remainingStock <= 3) {
      await this.showToast(`✓ Đã thêm vào giỏ. Chỉ còn ${remainingStock} ${product.unit}!`, 'warning');
    } else {
      await this.showToast(`✓ Đã thêm ${product.name} vào giỏ hàng`, 'success');
    }
  }

  getStockStatus(stock: number): string {
    if (stock <= 0) return 'Hết hàng';
    if (stock <= 5) return `Còn ${stock}`;
    if (stock <= 20) return `Còn ${stock}`;
    return `Còn ${stock}`;
  }

  getStockColor(stock: number): string {
    if (stock <= 0) return 'danger';
    if (stock <= 5) return 'danger';
    if (stock <= 20) return 'warning';
    return 'success';
  }

  getStockIcon(stock: number): string {
    if (stock <= 0) return 'close-circle';
    if (stock <= 5) return 'alert-circle';
    if (stock <= 20) return 'warning';
    return 'checkmark-circle';
  }

  async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    toast.present();
  }

  openQRScanner() {
    this.router.navigate(['/qr-scanner']);
  }

  goToCart() {
    this.router.navigate(['/tabs/tab2']);
  }

  viewProductDetail(product: Product) {
    this.router.navigate(['/product-detail', product.id]);
  }

  getStarArray(rating: number = 0): number[] {
    return Array(5).fill(0).map((_, i) => i < Math.floor(rating) ? 1 : 0);
  }
}
