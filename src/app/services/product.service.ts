import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Product, CartItem, Order, ProductReview, StockMovement, TraceabilityEvent, ProductBatch, ProductInventory, BatchAllocation } from '../models/product.model';
import { FirebaseStorageService } from './firebase-storage.service';
import { AuthService } from './auth.service';

export interface InventoryAuditRow {
  productId: number;
  productName: string;
  category: string;
  currentStock: number;
  movementId?: string;
  movementType?: StockMovement['type'];
  movementQuantity?: number;
  beforeStock?: number;
  afterStock?: number;
  movementNote?: string;
  movementActorUserId?: string;
  movementActorName?: string;
  movementCreatedAt?: Date;
  traceStage?: string;
  traceDescription?: string;
  traceOccurredAt?: Date;
}

export interface ProductImageMapEntry {
  id?: number;
  name?: string;
  imageUrl: string;
}

export interface SmartStockAlert {
  productId: number;
  productName: string;
  category: string;
  availableStock: number;
  threshold: number;
  targetStockLevel: number;
  suggestedRestock: number;
  urgency: 'critical' | 'warning';
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private storage = inject(FirebaseStorageService);
  private authService = inject(AuthService);
  private readonly fallbackImage = 'assets/images/product-placeholder.svg';

  private defaultProducts: Product[] = [
    {
      id: 1,
      name: 'Dâu Tây Đà Lạt',
      price: 120000,
      image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400',
      category: 'Trái cây',
      unit: 'kg',
      description: 'Dâu tây Đà Lạt tươi ngon, vị thanh ngọt, thu hoạch mới mỗi ngày.',
      stock: 50,
      origin: 'Đà Lạt, Lâm Đồng',
      rating: 4.8,
      farmName: 'Nông trại Hoa Lan',
      harvestDate: '2026-01-25',
      certification: ['VietGAP', 'Organic', 'HACCP'],
      farmerInfo: {
        name: 'Anh Nguyễn Văn A',
        experience: '15 năm kinh nghiệm trồng dâu',
        avatar: 'https://ionicframework.com/docs/img/demos/avatar.svg'
      },
      images: [
        'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=800',
        'https://images.unsplash.com/photo-1543528176-61b239494933?w=800',
        'https://images.unsplash.com/photo-1518635017498-87f514b751ba?w=800'
      ],
      nutritionInfo: {
        calories: '32 kcal',
        protein: '0.7g',
        carbs: '7.7g',
        vitamins: ['Vitamin C', 'Vitamin K', 'Folate']
      },
      views: 450,
      salesCount: 28,
      revenue: 3360000,
      status: 'active'
    },
    {
      id: 2,
      name: 'Atiso Đà Lạt',
      price: 80000,
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Artichoke_J1.jpg/640px-Artichoke_J1.jpg',
      category: 'Rau củ',
      unit: 'kg',
      description: 'Atiso tươi, đặc sản Đà Lạt nổi tiếng với nhiều công dụng cho sức khỏe.',
      stock: 30,
      origin: 'Đà Lạt, Lâm Đồng',
      rating: 4.6,
      farmName: 'HTX Atiso Đà Lạt',
      harvestDate: '2026-01-24',
      certification: ['VietGAP', 'OCOP 4 sao'],
      farmerInfo: {
        name: 'Chị Trần Thị B',
        experience: '20 năm trồng atiso',
      },
      images: [
        'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=800'
      ],
      views: 320,
      salesCount: 15,
      revenue: 1200000,
      status: 'active'
    },
    {
      id: 3,
      name: 'Cà Phê Arabica',
      price: 200000,
      image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400',
      category: 'Cà phê',
      unit: 'kg',
      description: 'Cà phê Arabica Đà Lạt rang xay nguyên chất, hương thơm đậm và hậu vị dịu.',
      stock: 100,
      origin: 'Đà Lạt, Lâm Đồng',
      rating: 4.9,
      views: 580,
      salesCount: 32,
      revenue: 6400000,
      status: 'active'
    },
    {
      id: 4,
      name: 'Bơ Đà Lạt',
      price: 150000,
      image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400',
      category: 'Trái cây',
      unit: 'kg',
      description: 'Bơ Đà Lạt dẻo béo, cơm dày, phù hợp làm sinh tố và món ăn healthy.',
      stock: 40,
      origin: 'Đà Lạt, Lâm Đồng',
      rating: 4.7,
      views: 290,
      salesCount: 18,
      revenue: 2700000,
      status: 'active'
    },
    {
      id: 5,
      name: 'Sữa Bò Đà Lạt',
      price: 35000,
      image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400',
      category: 'Sữa',
      unit: 'chai',
      description: 'Sữa bò Đà Lạt tươi sạch, vị thanh tự nhiên, bổ sung năng lượng mỗi ngày.',
      stock: 200,
      origin: 'Đà Lạt, Lâm Đồng',
      rating: 4.9,
      views: 820,
      salesCount: 65,
      revenue: 2275000,
      status: 'active'
    },
    {
      id: 6,
      name: 'Rau Xà Lách',
      price: 25000,
      image: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400',
      category: 'Rau củ',
      unit: 'kg',
      description: 'Xà lách Đà Lạt giòn mát, sạch an toàn, lý tưởng cho salad và món cuốn.',
      stock: 80,
      origin: 'Đà Lạt, Lâm Đồng',
      rating: 4.5,
      views: 210,
      salesCount: 22,
      revenue: 550000,
      status: 'active'
    },
    {
      id: 7,
      name: 'Hoa Hồng Đà Lạt',
      price: 50000,
      image: 'https://images.unsplash.com/photo-1518709594023-6eab9bab4489?w=400',
      category: 'Hoa',
      unit: 'bó',
      description: 'Hoa hồng Đà Lạt tươi lâu, màu đẹp, phù hợp làm quà tặng và trang trí.',
      stock: 60,
      origin: 'Đà Lạt, Lâm Đồng',
      rating: 5.0,
      views: 410,
      salesCount: 35,
      revenue: 1750000,
      status: 'active'
    },
    {
      id: 8,
      name: 'Măng Tây Đà Lạt',
      price: 90000,
      image: 'https://images.unsplash.com/photo-1598870588615-d362c58a0a1b?w=400',
      category: 'Rau củ',
      unit: 'kg',
      description: 'Măng tây Đà Lạt non ngon, giàu chất xơ, hợp cho bữa ăn cân bằng.',
      stock: 35,
      origin: 'Đà Lạt, Lâm Đồng',
      rating: 4.6,
      views: 180,
      salesCount: 12,
      revenue: 1080000,
      status: 'active'
    },
    {
      id: 9,
      name: 'Mật Ong Rừng',
      price: 250000,
      image: 'https://images.unsplash.com/photo-1587049352846-4a222e784efc?w=400',
      category: 'Thực phẩm',
      unit: 'kg',
      description: 'Mật ong rừng nguyên chất, hương thơm tự nhiên, dùng tốt cho sức khỏe.',
      stock: 25,
      origin: 'Đà Lạt, Lâm Đồng',
      rating: 4.8,
      views: 350,
      salesCount: 8,
      revenue: 2000000,
      status: 'active'
    },
    {
      id: 10,
      name: 'Bắp Cải Tím',
      price: 30000,
      image: 'https://images.unsplash.com/photo-1556801712-76c8eb07bbc9?w=400',
      category: 'Rau củ',
      unit: 'kg',
      description: 'Bắp cải tím Đà Lạt tươi giòn, màu đẹp, dễ chế biến nhiều món ăn.',
      stock: 70,
      origin: 'Đà Lạt, Lâm Đồng',
      rating: 4.4,
      views: 140,
      salesCount: 10,
      revenue: 300000,
      status: 'active'
    },
    {
      id: 11,
      name: 'Dứa Đà Lạt',
      price: 40000,
      image: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=400',
      category: 'Trái cây',
      unit: 'kg',
      description: 'Dứa Đà Lạt ngọt thơm, nhiều nước, giàu vitamin C cho đề kháng.',
      stock: 55,
      origin: 'Đà Lạt, Lâm Đồng',
      rating: 4.5,
      views: 190,
      salesCount: 16,
      revenue: 640000,
      status: 'active'
    },
    {
      id: 12,
      name: 'Trà Ô Long',
      price: 180000,
      image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400',
      category: 'Trà',
      unit: 'kg',
      description: 'Trà ô long Đà Lạt cao cấp, hương thơm thanh, vị hậu ngọt dễ chịu.',
      stock: 45,
      origin: 'Đà Lạt, Lâm Đồng',
      rating: 4.7,
      views: 270,
      salesCount: 14,
      revenue: 2520000,
      status: 'active'
    }
  ];

  private products: Product[] = [];
  private productsSubject = new BehaviorSubject<Product[]>([]);
  public products$: Observable<Product[]> = this.productsSubject.asObservable();
  private productSaveErrorSubject = new BehaviorSubject<string | null>(null);
  public productSaveError$: Observable<string | null> = this.productSaveErrorSubject.asObservable();

  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  public cart$: Observable<CartItem[]> = this.cartSubject.asObservable();

  private ordersSubject = new BehaviorSubject<Order[]>([]);
  public orders$: Observable<Order[]> = this.ordersSubject.asObservable();
  private currentScope = '';
  private readonly orderStatusFlow: Order['status'][] = [
    'awaiting_payment',
    'confirmed',
    'processing',
    'shipping',
    'delivered',
    'completed',
  ];
  private readonly cancellableOrderStatuses: Order['status'][] = [
    'awaiting_payment',
    'confirmed',
    'processing',
    'shipping',
  ];

  constructor() {
    void this.initializeState();

    this.authService.currentUser$.subscribe(() => {
      void this.loadScopedState();
    });

    this.authService.isGuestMode$.subscribe(() => {
      void this.loadScopedState();
    });
  }

  private async initializeState(): Promise<void> {
    await this.storage.ready();

    const savedProducts = this.storage.getItem<Product[]>('products', []);
    if (Array.isArray(savedProducts) && savedProducts.length > 0) {
      const normalizedProducts = this.normalizeProducts(savedProducts);
      const repaired = this.repairDefaultCatalogText(normalizedProducts);
      this.products = repaired.products;
      if (repaired.repairedCount > 0) {
        await this.storage.setItem('products', this.products);
      }
    } else {
      this.products = this.normalizeProducts([...this.defaultProducts]);
      await this.storage.setItem('products', this.products);
    }

    this.productsSubject.next(this.products);

    await this.loadScopedState(true);
  }

  // Product methods
  getProducts(): Product[] {
    return this.productsSubject.value;
  }

  getProductById(id: number): Product | undefined {
    return this.products.find(p => p.id === id);
  }

  getProductsByCategory(category: string): Product[] {
    if (category === 'all') return this.products;
    return this.products.filter(p => p.category === category);
  }

  addNewProduct(data: { name: string; price: number; category: string; unit: string; description: string; origin: string; image: string }): Product {
    const normalized = this.applyMarketingContentRules(data);
    const maxId = this.products.reduce((max, p) => (p.id > max ? p.id : max), 0);
    const newProduct: Product = {
      id: maxId + 1,
      name: normalized.name,
      price: data.price,
      category: normalized.category,
      unit: normalized.unit,
      description: normalized.description,
      origin: normalized.origin,
      image: normalized.image,
      stock: 0,
      rating: 0,
    };
    this.products = [...this.products, newProduct];
    this.productsSubject.next(this.products);
    this.persistProducts();
    return newProduct;
  }

  updateProductPrice(productId: number, newPrice: number): boolean {
    let wasUpdated = false;
    this.products = this.products.map(p => {
      if (p.id !== productId) return p;
      wasUpdated = true;
      return { ...p, price: newPrice };
    });
    if (wasUpdated) {
      this.productsSubject.next(this.products);
      this.persistProducts();
    }
    return wasUpdated;
  }

  updateProduct(updatedProduct: Product): boolean {
    let wasUpdated = false;
    this.products = this.products.map(p => {
      if (p.id !== updatedProduct.id) return p;
      wasUpdated = true;
      return { ...updatedProduct };
    });
    if (wasUpdated) {
      this.productsSubject.next(this.products);
      this.persistProducts();
    }
    return wasUpdated;
  }

  deleteProduct(productId: number): boolean {
    const initialLength = this.products.length;
    this.products = this.products.filter(p => p.id !== productId);
    
    if (this.products.length < initialLength) {
      this.productsSubject.next(this.products);
      this.persistProducts();
      return true;
    }
    return false;
  }

  applyImageMap(entries: ProductImageMapEntry[]): number {
    if (!Array.isArray(entries) || entries.length === 0) {
      return 0;
    }

    const byId = new Map<number, string>();
    const byName = new Map<string, string>();

    entries.forEach(entry => {
      const imageUrl = this.normalizeText(entry.imageUrl || '');
      if (!imageUrl) {
        return;
      }

      if (typeof entry.id === 'number' && Number.isFinite(entry.id)) {
        byId.set(entry.id, imageUrl);
      }

      const normalizedName = this.normalizeSearchText(entry.name || '');
      if (normalizedName) {
        byName.set(normalizedName, imageUrl);
      }
    });

    let changedCount = 0;
    this.products = this.products.map(product => {
      const nextById = byId.get(product.id);
      const nextByName = byName.get(this.normalizeSearchText(product.name));
      const nextImage = nextById || nextByName;

      if (!nextImage || nextImage === product.image) {
        return product;
      }

      changedCount += 1;
      return {
        ...product,
        image: nextImage,
      };
    });

    if (changedCount > 0) {
      this.persistProducts();
    }

    return changedCount;
  }

  getProductReviews(productId: number): ProductReview[] {
    const product = this.getProductById(productId);
    if (!product?.reviews) {
      return [];
    }

    return [...product.reviews].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  addProductReview(productId: number, rating: number, comment: string = ''): boolean {
    const boundedRating = Math.min(5, Math.max(1, Math.round(rating)));
    const reviewer = this.authService.getCurrentUser();
    let wasUpdated = false;

    this.products = this.products.map(product => {
      if (product.id !== productId) {
        return product;
      }

      wasUpdated = true;

      const newReview: ProductReview = {
        id: `RVW_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        userId: reviewer?.id,
        userName: reviewer?.name || 'Khách hàng',
        rating: boundedRating,
        comment: comment.trim(),
        createdAt: new Date(),
      };

      const nextReviews = [newReview, ...(product.reviews || [])];
      const averageRating = nextReviews.reduce((sum, review) => sum + review.rating, 0) / nextReviews.length;

      return {
        ...product,
        reviews: nextReviews,
        reviewCount: nextReviews.length,
        rating: Number(averageRating.toFixed(1)),
      };
    });

    if (!wasUpdated) {
      return false;
    }

    this.persistProducts();
    return true;
  }

  restockProduct(productId: number, quantity: number, note: string = 'Nhập hàng'): boolean {
    return this.adjustProductStock(productId, Math.abs(quantity), 'restock', note);
  }

  adjustProductStock(
    productId: number,
    quantityDelta: number,
    type: StockMovement['type'] = 'manual_adjustment',
    note: string = 'Điều chỉnh tồn kho'
  ): boolean {
    if (quantityDelta === 0) {
      return false;
    }

    let wasUpdated = false;
    this.products = this.products.map(product => {
      if (product.id !== productId) {
        return product;
      }

      wasUpdated = true;
      return this.applyStockMovement(product, quantityDelta, type, note);
    });

    if (!wasUpdated) {
      return false;
    }

    this.persistProducts();
    return true;
  }

  getStockMovements(productId: number): StockMovement[] {
    const product = this.getProductById(productId);
    if (!product?.stockMovements) {
      return [];
    }

    return [...product.stockMovements].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getTraceabilityTimeline(productId: number): TraceabilityEvent[] {
    const product = this.getProductById(productId);
    if (!product) {
      return [];
    }

    const baseEvents = this.buildDefaultTraceabilityEvents(product);
    const customEvents = product.traceabilityEvents || [];
    return [...baseEvents, ...customEvents].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  }

  addTraceabilityEvent(
    productId: number,
    payload: {
      stage: string;
      description: string;
      occurredAt: Date | string;
      icon?: string;
    }
  ): { success: boolean; message: string; event?: TraceabilityEvent } {
    const product = this.getProductById(productId);
    if (!product) {
      return { success: false, message: 'Không tìm thấy sản phẩm để bổ sung truy xuất' };
    }

    const stage = (payload.stage || '').trim();
    if (stage.length < 3 || stage.length > 80) {
      return { success: false, message: 'Giai đoạn phải từ 3 đến 80 ký tự' };
    }

    const description = (payload.description || '').trim();
    if (description.length < 10 || description.length > 300) {
      return { success: false, message: 'Mô tả phải từ 10 đến 300 ký tự' };
    }

    const occurredAt = new Date(payload.occurredAt);
    if (!Number.isFinite(occurredAt.getTime())) {
      return { success: false, message: 'Thời điểm diễn ra không hợp lệ' };
    }

    const now = new Date();
    if (occurredAt.getTime() > now.getTime() + 60 * 1000) {
      return { success: false, message: 'Không thể thêm sự kiện truy xuất trong tương lai' };
    }

    const icon = this.resolveTraceabilityIcon(stage, payload.icon);
    const event: TraceabilityEvent = {
      id: `TRC_CUSTOM_${productId}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      stage,
      icon,
      description,
      occurredAt,
    };

    const customEvents = product.traceabilityEvents || [];
    const hasSameEvent = customEvents.some(item =>
      item.stage.trim().toLowerCase() === stage.toLowerCase() &&
      item.description.trim().toLowerCase() === description.toLowerCase() &&
      Math.abs(item.occurredAt.getTime() - occurredAt.getTime()) < 60 * 1000
    );

    if (hasSameEvent) {
      return { success: false, message: 'Sự kiện truy xuất đã tồn tại, vui lòng kiểm tra lại' };
    }

    this.products = this.products.map(item => {
      if (item.id !== productId) {
        return item;
      }

      return {
        ...item,
        traceabilityEvents: [...(item.traceabilityEvents || []), event],
      };
    });

    this.persistProducts();
    return { success: true, message: 'Đã bổ sung thông tin truy xuất', event };
  }

  updateTraceabilityInfo(
    productId: number,
    payload: {
      origin: string;
      farmName?: string;
      farmerName?: string;
      farmerExperience?: string;
    }
  ): { success: boolean; message: string } {
    const product = this.getProductById(productId);
    if (!product) {
      return { success: false, message: 'Không tìm thấy sản phẩm để cập nhật truy xuất' };
    }

    const origin = (payload.origin || '').trim();
    const farmName = (payload.farmName || '').trim();
    const farmerName = (payload.farmerName || '').trim();
    const farmerExperience = (payload.farmerExperience || '').trim();

    if (origin.length < 3 || origin.length > 120) {
      return { success: false, message: 'Xuất xứ phải từ 3 đến 120 ký tự' };
    }

    if (farmName.length > 0 && (farmName.length < 2 || farmName.length > 120)) {
      return { success: false, message: 'Tên trang trại phải từ 2 đến 120 ký tự' };
    }

    if (farmerName.length > 0 && (farmerName.length < 2 || farmerName.length > 80)) {
      return { success: false, message: 'Tên người trồng phải từ 2 đến 80 ký tự' };
    }

    if (farmerExperience.length > 0 && (farmerExperience.length < 2 || farmerExperience.length > 120)) {
      return { success: false, message: 'Kinh nghiệm người trồng phải từ 2 đến 120 ký tự' };
    }

    this.products = this.products.map(item => {
      if (item.id !== productId) {
        return item;
      }

      const nextFarmerInfo = (farmerName || farmerExperience)
        ? {
            name: farmerName || item.farmerInfo?.name || 'Đang cập nhật',
            experience: farmerExperience || item.farmerInfo?.experience || 'Đang cập nhật',
            avatar: item.farmerInfo?.avatar,
          }
        : item.farmerInfo;

      return {
        ...item,
        origin,
        farmName: farmName || item.farmName,
        farmerInfo: nextFarmerInfo,
      };
    });

    this.persistProducts();
    return { success: true, message: 'Đã cập nhật thông tin truy xuất nguồn gốc' };
  }

  getInventoryAuditRows(): InventoryAuditRow[] {
    const rows: InventoryAuditRow[] = [];

    this.products.forEach((product: Product) => {
      const movementRows = this.getStockMovements(product.id).map(movement => ({
        productId: product.id,
        productName: product.name,
        category: product.category,
        currentStock: product.stock,
        movementId: movement.id,
        movementType: movement.type,
        movementQuantity: movement.quantity,
        beforeStock: movement.beforeStock,
        afterStock: movement.afterStock,
        movementNote: movement.note,
        movementActorUserId: movement.actorUserId,
        movementActorName: movement.actorName,
        movementCreatedAt: movement.createdAt,
      }));

      const traceRows = this.getTraceabilityTimeline(product.id).map(event => ({
        productId: product.id,
        productName: product.name,
        category: product.category,
        currentStock: product.stock,
        traceStage: event.stage,
        traceDescription: event.description,
        traceOccurredAt: event.occurredAt,
      }));

      rows.push(...movementRows, ...traceRows);
    });

    return rows;
  }

  searchProducts(term: string): Product[] {
    const lowerTerm = term.toLowerCase();
    return this.products.filter(p => 
      p.name.toLowerCase().includes(lowerTerm) ||
      p.description.toLowerCase().includes(lowerTerm)
    );
  }

  getCategories(): string[] {
    const categories = new Set(this.products.map(p => p.category));
    return Array.from(categories);
  }

  // Cart methods
  getCart(): CartItem[] {
    return this.cartSubject.value;
  }

  addToCart(product: Product, quantity: number = 1): void {
    const latestProduct = this.products.find(item => item.id === product.id);
    if (!latestProduct) {
      return;
    }

    // Validate stock before adding
    if (this.getAvailableStock(latestProduct) <= 0) {
      console.warn('Product out of stock:', latestProduct.name);
      return;
    }

    const currentCart = this.cartSubject.value;
    const existingItem = currentCart.find(item => item.product.id === product.id);

    let newCart: CartItem[];
    if (existingItem) {
      // Check if new quantity exceeds stock
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > this.getAvailableStock(latestProduct)) {
        console.warn('Quantity exceeds stock for:', latestProduct.name);
        return;
      }
      
      newCart = currentCart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: newQuantity }
          : item
      );
    } else {
      // Check if initial quantity exceeds stock
      if (quantity > this.getAvailableStock(latestProduct)) {
        console.warn('Quantity exceeds stock for:', latestProduct.name);
        return;
      }
      newCart = [...currentCart, { product: latestProduct, quantity }];
    }

    this.cartSubject.next(newCart);
    this.saveCart(newCart);
  }

  updateCartItemQuantity(productId: number, quantity: number): void {
    const product = this.products.find(item => item.id === productId);
    if (!product) {
      return;
    }

    const safeQuantity = Math.max(0, Math.min(quantity, this.getAvailableStock(product)));
    const currentCart = this.cartSubject.value;
    const newCart = currentCart.map(item =>
      item.product.id === productId
        ? { ...item, quantity: safeQuantity }
        : item
    ).filter(item => item.quantity > 0);

    this.cartSubject.next(newCart);
    this.saveCart(newCart);
  }

  removeFromCart(productId: number): void {
    const currentCart = this.cartSubject.value;
    const newCart = currentCart.filter(item => item.product.id !== productId);
    this.cartSubject.next(newCart);
    this.saveCart(newCart);
  }

  clearCart(): void {
    this.cartSubject.next([]);
    this.saveCart([]);
  }

  getCartTotal(): number {
    return this.cartSubject.value.reduce(
      (total, item) => total + (item.product.price * item.quantity),
      0
    );
  }

  getCartItemCount(): number {
    return this.cartSubject.value.reduce(
      (count, item) => count + item.quantity,
      0
    );
  }

  getAvailableStockByProductId(productId: number): number {
    const product = this.products.find(item => item.id === productId);
    if (!product) {
      return 0;
    }

    return this.getAvailableStock(product);
  }

  updateProductLowStockThreshold(productId: number, threshold: number): boolean {
    const normalizedThreshold = Math.max(1, Math.floor(threshold));
    let updated = false;

    this.products = this.products.map(product => {
      if (product.id !== productId) {
        return product;
      }

      updated = true;
      const inventory = this.ensureInventory(product);
      return {
        ...product,
        inventory: {
          ...inventory,
          lowStockThreshold: normalizedThreshold,
          lastUpdate: new Date(),
        },
      };
    });

    if (updated) {
      this.persistProducts();
    }

    return updated;
  }

  getSmartStockAlerts(): SmartStockAlert[] {
    const alerts: SmartStockAlert[] = this.products.map(product => {
      const inventory = this.ensureInventory(product);
      const availableStock = this.getAvailableStock(product);
      const threshold = this.getSmartLowStockThreshold(product);
      const targetStockLevel = Math.max(threshold + 5, inventory.targetStockLevel ?? threshold * 3);
      const suggestedRestock = Math.max(0, targetStockLevel - availableStock);
      const urgency: SmartStockAlert['urgency'] =
        availableStock <= Math.max(2, Math.floor(threshold * 0.5)) ? 'critical' : 'warning';

      return {
        productId: product.id,
        productName: product.name,
        category: product.category,
        availableStock,
        threshold,
        targetStockLevel,
        suggestedRestock,
        urgency,
      };
    }).filter(alert => alert.availableStock <= alert.threshold);

    return alerts.sort((a, b) => a.availableStock - b.availableStock);
  }

  private saveCart(cart: CartItem[]): void {
    void this.storage.setItem(this.getCartKey(), cart);
  }

  // Order methods
  createOrder(
    customerName: string,
    customerPhone: string,
    deliveryAddress: string,
    orderNote: string = '',
    paymentMethod: Order['paymentMethod'] = 'cod',
    paymentStatus: Order['paymentStatus'] = 'unpaid',
    paymentDate?: Date,
    paymentReference?: string,
  ): Order {
    const cartItems = [...this.cartSubject.value];
    const batchAllocationsByProduct = new Map<number, BatchAllocation[]>();
    const createdAt = new Date();
    const expectedDeliveryAt = new Date(createdAt);
    expectedDeliveryAt.setDate(expectedDeliveryAt.getDate() + 2);

    // Prevent checkout when stock has changed and cart is stale.
    const outOfStockItem = cartItems.find(item => {
      const latestProduct = this.products.find(product => product.id === item.product.id);
      return !latestProduct || item.quantity > this.getAvailableStock(latestProduct);
    });

    if (outOfStockItem) {
      throw new Error(`Sản phẩm ${outOfStockItem.product.name} không đủ tồn kho`);
    }

    // Reserve first, then deduct by FIFO batch order.
    this.products = this.products.map(product => {
      const orderedItem = cartItems.find(item => item.product.id === product.id);
      if (!orderedItem) {
        return product;
      }

      return this.applyStockMovement(
        product,
        orderedItem.quantity,
        'reserve',
        `Giữ hàng cho đơn ${customerName} - ${customerPhone}`
      );
    });

    this.products = this.products.map(product => {
      const orderedItem = cartItems.find(item => item.product.id === product.id);
      if (!orderedItem) {
        return product;
      }

      const consumeResult = this.consumeStockWithFifo(
        product,
        orderedItem.quantity,
        `Bán hàng theo đơn ${customerName} - ${customerPhone}`
      );

      batchAllocationsByProduct.set(product.id, consumeResult.allocations);
      return consumeResult.product;
    });
    this.persistProducts();

    const order: Order = {
      id: 'ORD' + Date.now(),
      orderCode: 'DL-' + Date.now(),
      items: cartItems.map(item => ({
        ...item,
        batchAllocations: batchAllocationsByProduct.get(item.product.id) || [],
      })),
      total: this.getCartTotal(),
      status: 'awaiting_payment',
      paymentStatus,
      paymentMethod,
      paymentDate,
      paymentReference: paymentReference?.trim() || undefined,
      createdAt,
      expectedDeliveryAt,
      customerName,
      customerPhone,
      deliveryAddress,
      orderNote: orderNote.trim(),
    };

    const currentOrders = this.ordersSubject.value;
    const newOrders = [order, ...currentOrders];
    this.ordersSubject.next(newOrders);
    this.saveOrders(newOrders);
    this.saveGlobalOrder(order);

    this.clearCart();
    return order;
  }

  getOrders(): Order[] {
    return this.sortOrdersByCreatedAtDesc(this.ordersSubject.value);
  }

  addOrder(order: Order): void {
    const orders = [order, ...this.ordersSubject.value];
    this.ordersSubject.next(orders);
    this.saveOrders(orders);
  }

  private saveOrders(orders: Order[]): void {
    void this.storage.setItem(this.getOrdersKey(), orders);
  }

  private saveGlobalOrder(order: Order): void {
    const global = this.storage.getItem<Order[]>('global_orders', []);
    const updated = [order, ...global.filter(o => o.id !== order.id)];
    void this.storage.setItem('global_orders', updated);
  }

  getAllOrdersForSeller(): Order[] {
    const raw = this.storage.getItem<Order[]>('global_orders', []);
    return this.sortOrdersByCreatedAtDesc(this.normalizeOrders(raw));
  }

  updateOrderStatusGlobal(orderId: string, status: Order['status']): boolean {
    const global = this.normalizeOrders(this.storage.getItem<Order[]>('global_orders', []));
    const idx = global.findIndex(o => o.id === orderId);
    if (idx === -1) return false;

    const currentOrder = global[idx];
    if (!this.canTransitionOrderStatus(currentOrder.status, status)) {
      return false;
    }

    global[idx] = this.applyOrderStatusMetadata(currentOrder, status);
    void this.storage.setItem('global_orders', global);

    const scopedOrders = [...this.ordersSubject.value];
    const scopedOrderIndex = scopedOrders.findIndex(order => order.id === orderId);
    if (scopedOrderIndex !== -1) {
      scopedOrders[scopedOrderIndex] = this.applyOrderStatusMetadata(scopedOrders[scopedOrderIndex], status);
      this.ordersSubject.next(scopedOrders);
      this.saveOrders(scopedOrders);
    }

    return true;
  }

  verifyOrderPayment(orderId: string, referenceCode: string, verifierName?: string, note?: string): boolean {
    const normalizedReference = referenceCode.trim();
    if (!normalizedReference) {
      return false;
    }

    const globalOrders = this.normalizeOrders(this.storage.getItem<Order[]>('global_orders', []));
    const globalIndex = globalOrders.findIndex(order => order.id === orderId);
    if (globalIndex === -1) {
      return false;
    }

    const globalOrder = globalOrders[globalIndex];
    if (globalOrder.paymentMethod !== 'bank_transfer') {
      return false;
    }

    const verifiedAt = new Date();
    const nextStatus = globalOrder.status === 'awaiting_payment' ? 'confirmed' : globalOrder.status;
    const verifiedGlobalOrder: Order = {
      ...this.applyOrderStatusMetadata(globalOrder, nextStatus),
      paymentStatus: 'paid',
      paymentDate: verifiedAt,
      paymentReference: normalizedReference,
      paymentVerifiedAt: verifiedAt,
      paymentVerifiedBy: verifierName?.trim() || this.authService.getCurrentUser()?.name || 'Seller',
      paymentVerificationNote: note?.trim() || 'Đã xác thực chuyển khoản',
    };
    globalOrders[globalIndex] = verifiedGlobalOrder;
    void this.storage.setItem('global_orders', globalOrders);

    const scopedOrders = [...this.ordersSubject.value];
    const scopedIndex = scopedOrders.findIndex(order => order.id === orderId);
    if (scopedIndex !== -1) {
      scopedOrders[scopedIndex] = {
        ...scopedOrders[scopedIndex],
        status: verifiedGlobalOrder.status,
        paymentStatus: 'paid',
        paymentDate: verifiedAt,
        paymentReference: normalizedReference,
        paymentVerifiedAt: verifiedAt,
        paymentVerifiedBy: verifiedGlobalOrder.paymentVerifiedBy,
        paymentVerificationNote: verifiedGlobalOrder.paymentVerificationNote,
      };
      this.ordersSubject.next(scopedOrders);
      this.saveOrders(scopedOrders);
    }

    return true;
  }

  getOrderById(id: string): Order | undefined {
    return this.ordersSubject.value.find(order => order.id === id);
  }

  updateOrderStatus(orderId: string, status: Order['status']): boolean {
    const orders = [...this.ordersSubject.value];
    const orderIndex = orders.findIndex(order => order.id === orderId);

    if (orderIndex === -1) {
      return false;
    }

    const currentOrder = orders[orderIndex];
    if (!this.canTransitionOrderStatus(currentOrder.status, status)) {
      return false;
    }

    orders[orderIndex] = this.applyOrderStatusMetadata(currentOrder, status);

    this.ordersSubject.next(orders);
    this.saveOrders(orders);
    this.syncGlobalOrderState(orders[orderIndex]);
    return true;
  }

  cancelOrder(orderId: string): boolean {
    const order = this.getOrderById(orderId);
    if (!order || !this.cancellableOrderStatuses.includes(order.status)) {
      return false;
    }

    // Restore stock for each item in the cancelled order.
    this.products = this.products.map(product => {
      const cancelledItem = order.items.find(item => item.product.id === product.id);
      if (!cancelledItem) {
        return product;
      }
      return this.applyStockMovement(
        product,
        cancelledItem.quantity,
        'cancel_refund',
        `Hoàn kho do hủy đơn ${order.id}`,
        cancelledItem.batchAllocations
      );
    });
    this.persistProducts();

    const orders = [...this.ordersSubject.value];
    const orderIndex = orders.findIndex(item => item.id === orderId);
    if (orderIndex === -1) {
      return false;
    }

    orders[orderIndex] = {
      ...this.applyOrderStatusMetadata(orders[orderIndex], 'cancelled'),
      paymentStatus: orders[orderIndex].paymentStatus === 'paid' ? 'refunded' : orders[orderIndex].paymentStatus,
      cancelledAt: new Date(),
    };
    this.ordersSubject.next(orders);
    this.saveOrders(orders);
    this.syncGlobalOrderState(orders[orderIndex]);
    return true;
  }

  private async loadScopedState(forceReload: boolean = false): Promise<void> {
    await this.storage.ready();

    const nextScope = this.getStateScope();
    if (!forceReload && nextScope === this.currentScope) {
      return;
    }

    const previousScope = this.currentScope;
    let savedCart = this.storage.getItem<CartItem[]>(this.getCartKey(nextScope), []);
    let savedOrders = this.storage.getItem<Order[]>(this.getOrdersKey(nextScope), []);

    if (previousScope.startsWith('guest_') && nextScope.startsWith('user_')) {
      const guestCart = this.storage.getItem<CartItem[]>(this.getCartKey(previousScope), []);
      const guestOrders = this.storage.getItem<Order[]>(this.getOrdersKey(previousScope), []);

      if (savedCart.length === 0 && guestCart.length > 0) {
        savedCart = [...guestCart];
        await this.storage.setItem(this.getCartKey(nextScope), savedCart);
      }

      if (savedOrders.length === 0 && guestOrders.length > 0) {
        savedOrders = [...guestOrders];
        await this.storage.setItem(this.getOrdersKey(nextScope), savedOrders);
      }
    }

    const mergedScopedOrders = this.mergeScopedOrdersWithGlobal(savedOrders);
    if (mergedScopedOrders.length !== savedOrders.length || mergedScopedOrders.some((order, index) => {
      const previous = savedOrders[index];
      return !previous || previous.status !== order.status || previous.paymentStatus !== order.paymentStatus;
    })) {
      savedOrders = mergedScopedOrders;
      await this.storage.setItem(this.getOrdersKey(nextScope), savedOrders);
    }

    this.currentScope = nextScope;
    this.cartSubject.next(savedCart);
    this.ordersSubject.next(this.sortOrdersByCreatedAtDesc(this.normalizeOrders(savedOrders)));
  }

  private mergeScopedOrdersWithGlobal(scopedOrders: Order[]): Order[] {
    const normalizedScopedOrders = this.normalizeOrders(scopedOrders);
    const globalOrders = this.normalizeOrders(this.storage.getItem<Order[]>('global_orders', []));
    if (globalOrders.length === 0) {
      return normalizedScopedOrders;
    }

    const globalById = new Map(globalOrders.map(order => [order.id, order]));
    return normalizedScopedOrders.map(order => {
      const global = globalById.get(order.id);
      if (!global) {
        return order;
      }

      return {
        ...order,
        status: global.status,
        paymentStatus: global.paymentStatus,
        paymentDate: global.paymentDate,
        paymentReference: global.paymentReference,
        paymentVerifiedAt: global.paymentVerifiedAt,
        paymentVerifiedBy: global.paymentVerifiedBy,
        paymentVerificationNote: global.paymentVerificationNote,
        expectedDeliveryAt: global.expectedDeliveryAt,
        cancelledAt: global.cancelledAt,
        deliveredAt: global.deliveredAt,
        completedAt: global.completedAt,
      };
    });
  }

  private canTransitionOrderStatus(currentStatus: Order['status'], nextStatus: Order['status']): boolean {
    if (currentStatus === nextStatus) {
      return true;
    }

    const currentIndex = this.orderStatusFlow.indexOf(currentStatus);
    const nextIndex = this.orderStatusFlow.indexOf(nextStatus);

    if (this.cancellableOrderStatuses.includes(currentStatus) && nextStatus === 'cancelled') {
      return true;
    }

    if (currentIndex === -1 || nextIndex === -1) {
      return false;
    }

    return nextIndex === currentIndex + 1;
  }

  private applyOrderStatusMetadata(order: Order, status: Order['status']): Order {
    const now = new Date();
    const nextOrder: Order = {
      ...order,
      status,
    };

    if (status === 'delivered') {
      nextOrder.deliveredAt = nextOrder.deliveredAt ?? now;
      nextOrder.completedAt = undefined;
      return nextOrder;
    }

    if (status === 'completed') {
      nextOrder.deliveredAt = nextOrder.deliveredAt ?? now;
      nextOrder.completedAt = nextOrder.completedAt ?? now;
      return nextOrder;
    }

    if (status === 'cancelled') {
      nextOrder.cancelledAt = nextOrder.cancelledAt ?? now;
    }

    nextOrder.deliveredAt = undefined;
    nextOrder.completedAt = undefined;

    return nextOrder;
  }

  private syncGlobalOrderState(order: Order): void {
    const global = this.normalizeOrders(this.storage.getItem<Order[]>('global_orders', []));
    const index = global.findIndex(item => item.id === order.id);
    if (index === -1) {
      return;
    }

    global[index] = {
      ...global[index],
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentDate: order.paymentDate,
      paymentReference: order.paymentReference,
      paymentVerifiedAt: order.paymentVerifiedAt,
      paymentVerifiedBy: order.paymentVerifiedBy,
      paymentVerificationNote: order.paymentVerificationNote,
      expectedDeliveryAt: order.expectedDeliveryAt,
      cancelledAt: order.cancelledAt,
      deliveredAt: order.deliveredAt,
      completedAt: order.completedAt,
    };
    void this.storage.setItem('global_orders', global);
  }

  private normalizeOrders(orders: Order[]): Order[] {
    return orders.map(order => ({
      ...order,
      status: this.normalizeOrderStatus(order.status as string),
      paymentStatus: this.normalizePaymentStatus(order.paymentStatus as string),
      paymentDate: order.paymentDate ? new Date(order.paymentDate) : undefined,
      paymentVerifiedAt: order.paymentVerifiedAt ? new Date(order.paymentVerifiedAt) : undefined,
      createdAt: new Date(order.createdAt),
      expectedDeliveryAt: order.expectedDeliveryAt ? new Date(order.expectedDeliveryAt) : undefined,
      cancelledAt: order.cancelledAt ? new Date(order.cancelledAt) : undefined,
      deliveredAt: order.deliveredAt ? new Date(order.deliveredAt) : undefined,
      completedAt: order.completedAt ? new Date(order.completedAt) : undefined,
    }));
  }

  private normalizeOrderStatus(status: string): Order['status'] {
    if (status === 'pending') {
      return 'awaiting_payment';
    }

    if (status === 'processing' || status === 'shipping' || status === 'delivered' || status === 'completed' || status === 'cancelled' || status === 'confirmed' || status === 'awaiting_payment') {
      return status;
    }

    return 'confirmed';
  }

  private normalizePaymentStatus(status?: string): Order['paymentStatus'] {
    if (status === 'pending' || status === 'paid' || status === 'refunded' || status === 'failed' || status === 'unpaid') {
      return status;
    }

    return 'paid';
  }

  private sortOrdersByCreatedAtDesc(orders: Order[]): Order[] {
    return [...orders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private normalizeProducts(products: Product[]): Product[] {
    return products.map(product => ({
      ...product,
      image: typeof product.image === 'string' && product.image.trim().length > 0
        ? product.image.trim()
        : this.fallbackImage,
      batches: (product.batches || this.createInitialBatch(product)).map(batch => ({
        ...batch,
        harvestDate: new Date(batch.harvestDate),
        expiryDate: batch.expiryDate ? new Date(batch.expiryDate) : undefined,
      })),
      inventory: this.normalizeInventory(product),
      reviews: (product.reviews || []).map(review => ({
        ...review,
        createdAt: new Date(review.createdAt),
      })),
      stockMovements: (product.stockMovements || []).map(movement => ({
        ...movement,
        createdAt: new Date(movement.createdAt),
      })),
      traceabilityEvents: (product.traceabilityEvents || []).map(event => ({
        ...event,
        occurredAt: new Date(event.occurredAt),
      })),
      stock: this.normalizeInventory(product).stockQuantity,
      reviewCount: product.reviewCount ?? product.reviews?.length ?? 0,
    }));
  }

  private repairDefaultCatalogText(products: Product[]): { products: Product[]; repairedCount: number } {
    const defaultById = new Map(this.defaultProducts.map(item => [item.id, item]));
    let repairedCount = 0;

    const repairedProducts = products.map(product => {
      const fallback = defaultById.get(product.id);
      if (!fallback) {
        return product;
      }

      let nextProduct = product;

      if (this.isLikelyCorruptedVietnameseText(product.name)) {
        nextProduct = { ...nextProduct, name: fallback.name };
      }

      if (this.isLikelyCorruptedVietnameseText(product.category)) {
        nextProduct = { ...nextProduct, category: fallback.category };
      }

      if (this.isLikelyCorruptedVietnameseText(product.origin)) {
        nextProduct = { ...nextProduct, origin: fallback.origin };
      }

      if (this.isLikelyCorruptedVietnameseText(product.description)) {
        nextProduct = { ...nextProduct, description: fallback.description };
      }

      if (this.isLikelyCorruptedVietnameseText(product.farmName) && fallback.farmName) {
        nextProduct = { ...nextProduct, farmName: fallback.farmName };
      }

      if (product.farmerInfo && fallback.farmerInfo) {
        const repairedFarmerInfo = { ...product.farmerInfo };
        let farmerInfoChanged = false;

        if (this.isLikelyCorruptedVietnameseText(product.farmerInfo.name) && fallback.farmerInfo.name) {
          repairedFarmerInfo.name = fallback.farmerInfo.name;
          farmerInfoChanged = true;
        }

        if (this.isLikelyCorruptedVietnameseText(product.farmerInfo.experience) && fallback.farmerInfo.experience) {
          repairedFarmerInfo.experience = fallback.farmerInfo.experience;
          farmerInfoChanged = true;
        }

        if (farmerInfoChanged) {
          nextProduct = {
            ...nextProduct,
            farmerInfo: repairedFarmerInfo,
          };
        }
      }

      if (nextProduct !== product) {
        repairedCount += 1;
      }

      return nextProduct;
    });

    return { products: repairedProducts, repairedCount };
  }

  private isLikelyCorruptedVietnameseText(value: string | undefined): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    const compact = value.trim();
    if (!compact) {
      return false;
    }

    if (compact.includes('�')) {
      return true;
    }

    if (compact.includes('?') && /[a-zA-Z]/.test(compact)) {
      return true;
    }

    const tokens = compact.split(/\s+/).filter(Boolean);
    const singleCharTokenCount = tokens.filter(token => token.length === 1).length;

    return tokens.length >= 3 && (singleCharTokenCount / tokens.length) >= 0.45;
  }

  private applyMarketingContentRules(data: {
    name: string;
    category: string;
    unit: string;
    description: string;
    origin: string;
    image: string;
  }): {
    name: string;
    category: string;
    unit: string;
    description: string;
    origin: string;
    image: string;
  } {
    const name = this.normalizeText(data.name);
    const category = this.normalizeText(data.category);
    const unit = this.normalizeText(data.unit);
    const origin = this.normalizeText(data.origin) || 'Đà Lạt, Lâm Đồng';
    const image = this.normalizeText(data.image) || this.fallbackImage;

    const sourceDescription = this.normalizeText(data.description);
    const description = this.normalizeDescription(
      sourceDescription || this.buildDefaultDescription(name, category, origin)
    );

    return {
      name,
      category,
      unit,
      description,
      origin,
      image,
    };
  }

  private normalizeDescription(text: string): string {
    const compact = this.normalizeText(text);
    const withCapitalized = compact.length > 0
      ? compact.charAt(0).toUpperCase() + compact.slice(1)
      : compact;
    const withEnding = /[.!?]$/.test(withCapitalized) ? withCapitalized : `${withCapitalized}.`;

    if (withEnding.length <= 140) {
      return withEnding;
    }

    return `${withEnding.slice(0, 137).trim()}...`;
  }

  private buildDefaultDescription(name: string, category: string, origin: string): string {
    const phraseByCategory: Record<string, string> = {
      'Trái cây': 'tươi ngon, vị tự nhiên',
      'Rau củ': 'sạch, giòn tươi, dễ chế biến',
      'Cà phê': 'thơm đậm, hậu vị cân bằng',
      'Trà': 'hương thanh, vị dịu',
      'Sữa': 'nguyên chất, giàu dinh dưỡng',
      'Hoa': 'tươi lâu, màu sắc nổi bật',
      'Thực phẩm': 'chất lượng cao, an toàn sử dụng',
    };

    const phrase = phraseByCategory[category] || 'chất lượng ổn định, phù hợp nhu cầu hằng ngày';
    return `${name} từ ${origin}, ${phrase}.`;
  }

  private normalizeText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  private normalizeSearchText(value: string): string {
    return this.normalizeText(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private persistProducts(): void {
    this.productsSubject.next(this.products);
    void this.storage.setItem('products', this.products).then(saved => {
      if (saved) {
        this.productSaveErrorSubject.next(null);
        return;
      }

      const writeError = this.storage.getLastWriteError('products');
      this.productSaveErrorSubject.next(writeError?.message ?? 'Không thể lưu danh sách sản phẩm lên Firebase.');
    });
  }

  private applyStockMovement(
    product: Product,
    quantityDelta: number,
    type: StockMovement['type'],
    note: string,
    batchAllocations?: BatchAllocation[]
  ): Product {
    const actor = this.authService.getCurrentUser();
    const inventory = this.ensureInventory(product);
    const batches = this.ensureBatches(product);
    const updatedBatches = this.applyBatchQuantityDelta(
      batches,
      quantityDelta,
      type,
      product.id,
      batchAllocations
    );
    const beforeStock = inventory.stockQuantity;
    const beforeReserved = inventory.reservedQuantity;
    const afterStock = type === 'reserve' ? beforeStock : Math.max(0, beforeStock + quantityDelta);
    const afterReserved = type === 'reserve'
      ? Math.max(0, beforeReserved + quantityDelta)
      : Math.max(0, beforeReserved);
    const movement: StockMovement = {
      id: `STM_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      quantity: quantityDelta,
      beforeStock,
      afterStock,
      actorUserId: actor?.id,
      actorName: actor?.name || (this.authService.isGuestMode() ? 'Guest' : 'System'),
      note,
      createdAt: new Date(),
    };

    return {
      ...product,
      batches: updatedBatches,
      inventory: {
        ...inventory,
        stockQuantity: afterStock,
        reservedQuantity: afterReserved,
        lastUpdate: new Date(),
      },
      stock: afterStock,
      stockMovements: [movement, ...(product.stockMovements || [])],
    };
  }

  private applyBatchQuantityDelta(
    batches: ProductBatch[],
    quantityDelta: number,
    type: StockMovement['type'],
    productId: number,
    batchAllocations?: BatchAllocation[]
  ): ProductBatch[] {
    if (type === 'reserve' || quantityDelta === 0) {
      return batches;
    }

    const nextBatches = batches.map(batch => ({ ...batch }));

    if (quantityDelta > 0 && type === 'cancel_refund' && batchAllocations && batchAllocations.length > 0) {
      let restoredTotal = 0;

      batchAllocations.forEach(allocation => {
        if (allocation.quantity <= 0) {
          return;
        }

        const targetBatch = nextBatches.find(batch => batch.id === allocation.batchId);
        if (targetBatch) {
          targetBatch.remainingQuantity = Math.min(
            targetBatch.quantity,
            targetBatch.remainingQuantity + allocation.quantity
          );
          restoredTotal += allocation.quantity;
          return;
        }

        const now = new Date();
        const expiryDate = new Date(now);
        expiryDate.setDate(expiryDate.getDate() + 21);
        nextBatches.push({
          id: allocation.batchId,
          batchCode: `DL-${productId}-RB-${now.getTime()}`,
          harvestDate: now,
          expiryDate,
          quantity: allocation.quantity,
          remainingQuantity: allocation.quantity,
        });
        restoredTotal += allocation.quantity;
      });

      const deltaRemainder = quantityDelta - restoredTotal;
      if (deltaRemainder > 0) {
        const now = new Date();
        const expiryDate = new Date(now);
        expiryDate.setDate(expiryDate.getDate() + 21);

        nextBatches.push({
          id: `BATCH_${productId}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          batchCode: `DL-${productId}-${now.getTime()}`,
          harvestDate: now,
          expiryDate,
          quantity: deltaRemainder,
          remainingQuantity: deltaRemainder,
        });
      }

      return nextBatches;
    }

    if (quantityDelta > 0) {
      const now = new Date();
      const expiryDate = new Date(now);
      expiryDate.setDate(expiryDate.getDate() + 21);

      nextBatches.push({
        id: `BATCH_${productId}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        batchCode: `DL-${productId}-${now.getTime()}`,
        harvestDate: now,
        expiryDate,
        quantity: quantityDelta,
        remainingQuantity: quantityDelta,
      });

      return nextBatches;
    }

    let toConsume = Math.abs(quantityDelta);
    const sortedIndexes = nextBatches
      .map((batch, index) => ({ index, harvest: new Date(batch.harvestDate).getTime() }))
      .sort((a, b) => a.harvest - b.harvest)
      .map(item => item.index);

    sortedIndexes.forEach(index => {
      if (toConsume <= 0) {
        return;
      }

      const batch = nextBatches[index];
      if (batch.remainingQuantity <= 0) {
        return;
      }

      const used = Math.min(batch.remainingQuantity, toConsume);
      batch.remainingQuantity -= used;
      toConsume -= used;
    });

    return nextBatches;
  }

  private consumeStockWithFifo(product: Product, quantity: number, note: string): { product: Product; allocations: BatchAllocation[] } {
    const actor = this.authService.getCurrentUser();
    const inventory = this.ensureInventory(product);
    const beforeStock = inventory.stockQuantity;
    const batches = this.ensureBatches(product).map(batch => ({ ...batch }));
    const allocations: BatchAllocation[] = [];

    let remainingToConsume = quantity;
    const sortedIndexes = batches
      .map((batch, index) => ({ index, harvest: new Date(batch.harvestDate).getTime() }))
      .sort((a, b) => a.harvest - b.harvest)
      .map(item => item.index);

    sortedIndexes.forEach(index => {
      if (remainingToConsume <= 0) {
        return;
      }

      const batch = batches[index];
      if (batch.remainingQuantity <= 0) {
        return;
      }

      const used = Math.min(batch.remainingQuantity, remainingToConsume);
      batch.remainingQuantity -= used;
      remainingToConsume -= used;
      allocations.push({
        batchId: batch.id,
        quantity: used,
      });
    });

    if (remainingToConsume > 0) {
      throw new Error(`Không đủ tồn kho theo lô cho sản phẩm ${product.name}`);
    }

    const afterStock = Math.max(0, beforeStock - quantity);
    const afterReserved = Math.max(0, inventory.reservedQuantity - quantity);
    const movement: StockMovement = {
      id: `STM_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: 'sale',
      quantity: -quantity,
      beforeStock,
      afterStock,
      actorUserId: actor?.id,
      actorName: actor?.name || (this.authService.isGuestMode() ? 'Guest' : 'System'),
      note,
      createdAt: new Date(),
    };

    return {
      product: {
        ...product,
        batches,
        inventory: {
          ...inventory,
          stockQuantity: afterStock,
          reservedQuantity: afterReserved,
          lastUpdate: new Date(),
        },
        stock: afterStock,
        stockMovements: [movement, ...(product.stockMovements || [])],
      },
      allocations,
    };
  }

  private ensureInventory(product: Product): ProductInventory {
    if (product.inventory) {
      const fallbackThreshold = this.calculateAdaptiveLowStockThreshold(product);
      return {
        ...product.inventory,
        lowStockThreshold: Math.max(1, Math.floor(product.inventory.lowStockThreshold ?? fallbackThreshold)),
        targetStockLevel: Math.max(
          Math.floor(product.inventory.targetStockLevel ?? 0),
          Math.max((product.inventory.lowStockThreshold ?? fallbackThreshold) * 2, fallbackThreshold + 5)
        ),
        lastUpdate: new Date(product.inventory.lastUpdate),
      };
    }

    const threshold = this.calculateAdaptiveLowStockThreshold(product);

    return {
      stockQuantity: product.stock,
      reservedQuantity: 0,
      lowStockThreshold: threshold,
      targetStockLevel: threshold * 3,
      warehouseLocation: 'Kho Đà Lạt',
      lastUpdate: new Date(),
    };
  }

  private normalizeInventory(product: Product): ProductInventory {
    const base = this.ensureInventory(product);
    const batches = product.batches || this.createInitialBatch(product);
    const batchTotal = batches.reduce((sum, batch) => sum + (batch.remainingQuantity ?? 0), 0);

    return {
      ...base,
      stockQuantity: batchTotal > 0 ? batchTotal : base.stockQuantity,
      reservedQuantity: Math.max(0, base.reservedQuantity),
      lowStockThreshold: Math.max(1, Math.floor(base.lowStockThreshold ?? this.calculateAdaptiveLowStockThreshold(product))),
      targetStockLevel: Math.max(
        Math.floor(base.targetStockLevel ?? 0),
        Math.max((base.lowStockThreshold ?? this.calculateAdaptiveLowStockThreshold(product)) * 2, 8)
      ),
      lastUpdate: new Date(base.lastUpdate),
    };
  }

  private ensureBatches(product: Product): ProductBatch[] {
    return (product.batches || this.createInitialBatch(product)).map(batch => ({
      ...batch,
      harvestDate: new Date(batch.harvestDate),
      expiryDate: batch.expiryDate ? new Date(batch.expiryDate) : undefined,
    }));
  }

  private createInitialBatch(product: Product): ProductBatch[] {
    const harvestDate = product.harvestDate ? new Date(product.harvestDate) : new Date();
    const expiryDate = new Date(harvestDate);
    expiryDate.setDate(expiryDate.getDate() + 21);

    return [
      {
        id: `BATCH_${product.id}_INIT`,
        batchCode: `DL-${product.id}-INIT`,
        harvestDate,
        expiryDate,
        quantity: product.stock,
        remainingQuantity: product.stock,
      },
    ];
  }

  private getAvailableStock(product: Product): number {
    const inventory = this.ensureInventory(product);
    return Math.max(0, inventory.stockQuantity - inventory.reservedQuantity);
  }

  private getSmartLowStockThreshold(product: Product): number {
    const inventory = this.ensureInventory(product);
    return Math.max(1, Math.floor(inventory.lowStockThreshold ?? this.calculateAdaptiveLowStockThreshold(product)));
  }

  private calculateAdaptiveLowStockThreshold(product: Product): number {
    const salesScore = Math.max(0, Math.floor((product.salesCount ?? 0) / 3));
    const base = Math.max(4, Math.floor(product.stock * 0.15));
    return Math.min(30, Math.max(base, 5 + salesScore));
  }

  private resolveTraceabilityIcon(stage: string, preferredIcon?: string): string {
    const allowedIcons = new Set([
      'leaf-outline',
      'water-outline',
      'basket-outline',
      'shield-checkmark-outline',
      'cube-outline',
      'car-outline',
      'location-outline',
      'flask-outline',
      'nutrition-outline',
      'checkmark-done-outline',
    ]);

    if (preferredIcon && allowedIcons.has(preferredIcon)) {
      return preferredIcon;
    }

    const normalizedStage = stage.trim().toLowerCase();
    if (normalizedStage.includes('gieo') || normalizedStage.includes('trồng') || normalizedStage.includes('canh tác')) {
      return 'leaf-outline';
    }
    if (normalizedStage.includes('chăm sóc') || normalizedStage.includes('tưới')) {
      return 'water-outline';
    }
    if (normalizedStage.includes('thu hoạch')) {
      return 'basket-outline';
    }
    if (normalizedStage.includes('kiểm') || normalizedStage.includes('chất lượng')) {
      return 'shield-checkmark-outline';
    }
    if (normalizedStage.includes('đóng gói') || normalizedStage.includes('bao gói')) {
      return 'cube-outline';
    }
    if (normalizedStage.includes('vận chuyển') || normalizedStage.includes('giao')) {
      return 'car-outline';
    }

    return 'location-outline';
  }

  private buildDefaultTraceabilityEvents(product: Product): TraceabilityEvent[] {
    if (!product.harvestDate) {
      return [
        {
          id: `TRC_${product.id}_origin`,
          stage: 'Nguồn gốc sản phẩm',
          icon: 'location-outline',
          description: `Sản phẩm đến từ ${product.origin}`,
          occurredAt: new Date(),
        },
      ];
    }

    const harvestDate = new Date(product.harvestDate);
    const plantingDate = new Date(harvestDate);
    plantingDate.setDate(plantingDate.getDate() - 90);
    const careDate = new Date(harvestDate);
    careDate.setDate(careDate.getDate() - 45);
    const qualityDate = new Date(harvestDate);
    qualityDate.setDate(qualityDate.getDate() + 1);
    const packagingDate = new Date(harvestDate);
    packagingDate.setDate(packagingDate.getDate() + 2);
    const distributionDate = new Date(harvestDate);
    distributionDate.setDate(distributionDate.getDate() + 3);

    return [
      {
        id: `TRC_${product.id}_planting`,
        stage: 'Gieo trồng',
        icon: 'leaf-outline',
        description: `Bắt đầu canh tác tại ${product.farmName || product.origin}`,
        occurredAt: plantingDate,
      },
      {
        id: `TRC_${product.id}_care`,
        stage: 'Chăm sóc',
        icon: 'water-outline',
        description: 'Theo dõi, tưới tiêu và chăm sóc định kỳ',
        occurredAt: careDate,
      },
      {
        id: `TRC_${product.id}_harvest`,
        stage: 'Thu hoạch',
        icon: 'basket-outline',
        description: 'Thu hoạch theo tiêu chuẩn chất lượng nông trại',
        occurredAt: harvestDate,
      },
      {
        id: `TRC_${product.id}_quality`,
        stage: 'Kiểm tra chất lượng',
        icon: 'shield-checkmark-outline',
        description: 'Kiểm định vệ sinh và an toàn thực phẩm',
        occurredAt: qualityDate,
      },
      {
        id: `TRC_${product.id}_packaging`,
        stage: 'Đóng gói',
        icon: 'cube-outline',
        description: 'Đóng gói và bảo quản trước khi giao',
        occurredAt: packagingDate,
      },
      {
        id: `TRC_${product.id}_distribution`,
        stage: 'Phân phối',
        icon: 'car-outline',
        description: 'Vận chuyển tới kho và điểm giao hàng',
        occurredAt: distributionDate,
      },
    ];
  }

  private getStateScope(): string {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      return `user_${currentUser.id}`;
    }

    return 'guest_local';
  }

  private getCartKey(scope: string = this.currentScope || this.getStateScope()): string {
    return `cart_${scope}`;
  }

  private getOrdersKey(scope: string = this.currentScope || this.getStateScope()): string {
    return `orders_${scope}`;
  }
}
