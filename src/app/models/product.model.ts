export interface ProductReview {
  id: string;
  userId?: string;
  userName: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

export interface ProductBatch {
  id: string;
  batchCode: string;
  harvestDate: Date;
  expiryDate?: Date;
  quantity: number;
  remainingQuantity: number;
}

export interface ProductInventory {
  stockQuantity: number;
  reservedQuantity: number;
  lowStockThreshold?: number;
  targetStockLevel?: number;
  warehouseLocation?: string;
  lastUpdate: Date;
}

export interface BatchAllocation {
  batchId: string;
  quantity: number;
}

export interface StockMovement {
  id: string;
  type: 'sale' | 'restock' | 'cancel_refund' | 'manual_adjustment' | 'reserve';
  quantity: number;
  beforeStock: number;
  afterStock: number;
  actorUserId?: string;
  actorName?: string;
  note?: string;
  createdAt: Date;
}

export interface TraceabilityEvent {
  id: string;
  stage: string;
  icon: string;
  description: string;
  occurredAt: Date;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
  unit: string;
  description: string;
  stock: number;
  origin: string;
  rating?: number;
  // Traceability information
  farmName?: string;
  harvestDate?: string;
  certification?: string[];
  farmerInfo?: {
    name: string;
    experience: string;
    avatar?: string;
  };
  images?: string[];
  nutritionInfo?: {
    calories?: string;
    protein?: string;
    carbs?: string;
    vitamins?: string[];
  };
  reviewCount?: number;
  reviews?: ProductReview[];
  batches?: ProductBatch[];
  inventory?: ProductInventory;
  stockMovements?: StockMovement[];
  traceabilityEvents?: TraceabilityEvent[];
  
  // Analytics
  views?: number;
  salesCount?: number;
  revenue?: number;
  status?: 'active' | 'inactive' | 'out-of-stock';
  seller_id?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  batchAllocations?: BatchAllocation[];
}

export interface Order {
  id: string;
  orderCode?: string;
  items: CartItem[];
  total: number;
  status: 'awaiting_payment' | 'confirmed' | 'processing' | 'shipping' | 'delivered' | 'completed' | 'cancelled';
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'refunded' | 'failed';
  paymentMethod?: 'cod' | 'bank_transfer' | 'visa' | 'momo' | 'qr' | 'wallet';
  paymentDate?: Date;
  paymentReference?: string;
  paymentVerifiedAt?: Date;
  paymentVerifiedBy?: string;
  paymentVerificationNote?: string;
  createdAt: Date;
  expectedDeliveryAt?: Date;
  cancelledAt?: Date;
  deliveredAt?: Date;
  completedAt?: Date;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  orderNote?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  avatar?: string;
  role?: 'customer' | 'admin' | 'seller';
}
