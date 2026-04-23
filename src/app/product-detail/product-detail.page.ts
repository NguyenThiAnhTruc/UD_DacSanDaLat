import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Product, ProductReview } from '../models/product.model';
import { ProductService } from '../services/product.service';
import { FavoritesService } from '../services/favorites.service';

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.page.html',
  styleUrls: ['./product-detail.page.scss'],
  standalone: false,
})
export class ProductDetailPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private toastController = inject(ToastController);
  private favoritesService = inject(FavoritesService);

  product: Product | undefined;
  quantity: number = 1;
  selectedImage: string = '';
  isLoading: boolean = true;
  isFavorite: boolean = false;
  isAddingToCart: boolean = false;
  reviews: ProductReview[] = [];
  selectedRating: number = 5;
  reviewComment: string = '';
  isSubmittingReview: boolean = false;
  private productsSubscription?: Subscription;

  ngOnInit() {
    this.loadProduct();
  }

  ngOnDestroy() {
    if (this.productsSubscription) {
      this.productsSubscription.unsubscribe();
    }
  }

  async loadProduct() {
    try {
      this.isLoading = true;
      const id = Number(this.route.snapshot.paramMap.get('id'));
      
      if (isNaN(id)) {
        await this.showToast('ID sản phẩm không hợp lệ', 'danger');
        this.router.navigate(['/tabs/tab1']);
        return;
      }

      // Simulate network delay for better UX
      await new Promise(resolve => setTimeout(resolve, 300));

      if (this.productsSubscription) {
        this.productsSubscription.unsubscribe();
      }

      this.productsSubscription = this.productService.products$.subscribe(async products => {
        if (!products.length) {
          return;
        }

        this.product = products.find(p => p.id === id);

        if (this.product) {
          this.selectedImage = this.product.image;
          this.checkIfFavorite();
          this.reviews = this.productService.getProductReviews(this.product.id);
        } else {
          await this.showToast('Không tìm thấy sản phẩm', 'warning');
          this.router.navigate(['/tabs/tab1']);
        }

        this.isLoading = false;
      });

      return;
    } catch (error) {
      await this.showToast('Đã xảy ra lỗi. Vui lòng thử lại', 'danger');
      this.router.navigate(['/tabs/tab1']);
    } finally {
      if (!this.productsSubscription) {
        this.isLoading = false;
      }
    }
  }

  checkIfFavorite() {
    if (this.product) {
      this.isFavorite = this.favoritesService.isFavorite(this.product.id);
    }
  }

  async toggleFavorite() {
    if (!this.product) return;

    const isFavorite = await this.favoritesService.toggleFavorite(this.product.id);
    this.isFavorite = isFavorite;

    if (!isFavorite) {
      await this.showToast('Đã xóa khỏi danh sách yêu thích', 'medium');
    } else {
      await this.showToast('Đã thêm vào danh sách yêu thích', 'success');
    }
  }

  decreaseQuantity() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  increaseQuantity() {
    if (this.product && this.quantity < this.product.stock) {
      this.quantity++;
    }
  }

  async addToCart() {
    if (!this.product || this.isAddingToCart) return;

    if (this.product.stock === 0) {
      await this.showToast('❌ Sản phẩm đã hết hàng', 'danger', 'close-circle');
      return;
    }

    // Check current cart quantity
    const currentCartItem = this.productService.getCart().find((item: { product: { id: number | undefined; }; }) => item.product.id === this.product!.id);
    const currentQuantity = currentCartItem ? currentCartItem.quantity : 0;
    const totalQuantity = currentQuantity + this.quantity;

    if (totalQuantity > this.product.stock) {
      const available = this.product.stock - currentQuantity;
      if (available <= 0) {
        await this.showToast(`⚠️ Bạn đã có ${currentQuantity} ${this.product.unit} trong giỏ. Không thể thêm nữa!`, 'warning', 'warning');
        return;
      }
      await this.showToast(`⚠️ Chỉ có thể thêm tối đa ${available} ${this.product.unit}`, 'warning', 'warning');
      this.quantity = available;
      return;
    }

    try {
      this.isAddingToCart = true;
      this.productService.addToCart(this.product, this.quantity);
      
      const remainingStock = this.product.stock - totalQuantity;
      if (remainingStock <= 3) {
        await this.showToast(
          `✓ Đã thêm ${this.quantity} ${this.product.unit}. ⚠️ Chỉ còn ${remainingStock} ${this.product.unit}!`,
          'warning',
          'checkmark-circle'
        );
      } else {
        await this.showToast(
          `✓ Đã thêm ${this.quantity} ${this.product.name} vào giỏ hàng`,
          'success',
          'checkmark-circle'
        );
      }
      
      // Navigate to cart after a short delay
      setTimeout(() => {
        this.router.navigate(['/tabs/tab2']);
      }, 500);
    } catch (error) {
      await this.showToast('❌ Đã xảy ra lỗi. Vui lòng thử lại', 'danger');
    } finally {
      this.isAddingToCart = false;
    }
  }

  setSelectedRating(star: number): void {
    this.selectedRating = star;
  }

  async submitReview() {
    if (!this.product || this.isSubmittingReview) {
      return;
    }

    this.isSubmittingReview = true;

    try {
      const success = this.productService.addProductReview(
        this.product.id,
        this.selectedRating,
        this.reviewComment
      );

      if (!success) {
        await this.showToast('Không thể gửi đánh giá. Vui lòng thử lại.', 'danger');
        return;
      }

      const updatedProduct = this.productService.getProductById(this.product.id);
      if (updatedProduct) {
        this.product = updatedProduct;
      }
      this.reviews = this.productService.getProductReviews(this.product.id);
      this.reviewComment = '';
      this.selectedRating = 5;
      await this.showToast('Cảm ơn bạn đã đánh giá sản phẩm!', 'success', 'star');
    } finally {
      this.isSubmittingReview = false;
    }
  }

  getStockText(stock: number): string {
    if (stock === 0) return 'Hết hàng';
    if (stock <= 5) return `Chỉ còn ${stock}`;
    if (stock <= 20) return `Còn ${stock}`;
    return 'Còn hàng';
  }

  getStockColor(stock: number): string {
    if (stock === 0) return 'danger';
    if (stock <= 5) return 'danger';
    if (stock <= 20) return 'warning';
    return 'success';
  }

  getStockIcon(stock: number): string {
    if (stock === 0) return 'close-circle';
    if (stock <= 5) return 'alert-circle';
    if (stock <= 20) return 'warning';
    return 'checkmark-circle';
  }

  async showToast(message: string, color: string, icon?: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color,
      icon
    });
    await toast.present();
  }

  goBack() {
    this.router.navigate(['/tabs/tab1']);
  }

  getStarArray(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i < Math.round(rating) ? 1 : 0);
  }

  formatReviewDate(date: Date): string {
    // Fix: date is already a Date object, no need to wrap with new Date()
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
}
