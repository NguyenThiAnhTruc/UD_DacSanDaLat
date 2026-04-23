import { Injectable, inject } from '@angular/core';
import { Order } from '../models/product.model';
import { GeolocationService, LocationCoordinates } from './geolocation.service';

export interface DeliveryTracking {
  orderId: string;
  orderCode?: string;
  currentStatus: Order['status'];
  currentLocation?: LocationCoordinates;
  deliveryZone?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  statusHistory: DeliveryStatusUpdate[];
  driverName?: string;
  driverPhone?: string;
  notes?: string;
}

export interface DeliveryStatusUpdate {
  status: Order['status'];
  timestamp: Date;
  location?: LocationCoordinates;
  note?: string;
  updatedBy?: string;
}

export interface DeliveryStep {
  step: number;
  status: Order['status'];
  label: string;
  description: string;
  estimatedHours?: number;
  isCompleted: boolean;
  completedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class DeliveryTrackingService {
  private geolocationService = inject(GeolocationService);

  private readonly deliveryFlow: Array<{ status: Order['status']; label: string; description: string; estimatedHours?: number }> = [
    {
      status: 'awaiting_payment',
      label: 'Chờ thanh toán',
      description: 'Chờ khách hàng thanh toán',
      estimatedHours: 0
    },
    {
      status: 'confirmed',
      label: 'Đã xác nhận',
      description: 'Đơn hàng đã được xác nhận bởi cửa hàng',
      estimatedHours: 0.5
    },
    {
      status: 'processing',
      label: 'Đang xử lý',
      description: 'Cửa hàng đang chuẩn bị hàng',
      estimatedHours: 2
    },
    {
      status: 'shipping',
      label: 'Đang giao',
      description: 'Shipper đang giao hàng cho bạn',
      estimatedHours: 4
    },
    {
      status: 'delivered',
      label: 'Đã giao',
      description: 'Hàng đã được giao thành công',
      estimatedHours: 0
    },
    {
      status: 'completed',
      label: 'Hoàn thành',
      description: 'Đơn hàng đã hoàn tất và được xác nhận',
      estimatedHours: 0
    }
  ];

  constructor() { }

  /**
   * Get delivery steps for order
   */
  getDeliverySteps(order: Order): DeliveryStep[] {
    return this.deliveryFlow.map((flow, index) => ({
      step: index + 1,
      status: flow.status,
      label: flow.label,
      description: flow.description,
      estimatedHours: flow.estimatedHours,
      isCompleted: this.isStatusCompleted(order.status, flow.status),
      completedAt: order.status === flow.status ? new Date(order.createdAt) : undefined
    }));
  }

  /**
   * Check if delivery step is completed
   */
  private isStatusCompleted(currentStatus: Order['status'], checkStatus: Order['status']): boolean {
    const statuses: Order['status'][] = ['awaiting_payment', 'confirmed', 'processing', 'shipping', 'delivered', 'completed'];
    const currentIndex = statuses.indexOf(currentStatus);
    const checkIndex = statuses.indexOf(checkStatus);
    return checkIndex <= currentIndex;
  }

  /**
   * Get next delivery step
   */
  getNextDeliveryStep(currentStatus: Order['status']): DeliveryStep | null {
    const steps = this.deliveryFlow;
    const currentIndex = steps.findIndex(s => s.status === currentStatus);

    if (currentIndex === -1 || currentIndex === steps.length - 1) {
      return null;
    }

    const nextFlow = steps[currentIndex + 1];
    return {
      step: currentIndex + 2,
      status: nextFlow.status,
      label: nextFlow.label,
      description: nextFlow.description,
      estimatedHours: nextFlow.estimatedHours,
      isCompleted: false
    };
  }

  /**
   * Get progress percentage
   */
  getProgressPercentage(currentStatus: Order['status']): number {
    const statuses: Order['status'][] = ['awaiting_payment', 'confirmed', 'processing', 'shipping', 'delivered', 'completed'];
    const index = statuses.indexOf(currentStatus);
    if (index === -1) return 0;
    return Math.round(((index + 1) / statuses.length) * 100);
  }

  /**
   * Estimate delivery time
   */
  estimateDeliveryTime(order: Order): Date | null {
    if (order.status === 'completed') {
      return order.completedAt ?? order.deliveredAt ?? null;
    }

    if (order.status === 'delivered') {
      return order.deliveredAt ?? null;
    }

    if (order.status === 'cancelled') {
      return null;
    }

    // Calculate estimated delivery based on current status
    let totalEstimatedHours = 0;
    const statuses: Order['status'][] = ['awaiting_payment', 'confirmed', 'processing', 'shipping', 'delivered', 'completed'];
    const currentIndex = statuses.indexOf(order.status);
    if (currentIndex < 0) {
      return null;
    }

    // Sum remaining hours
    for (let i = currentIndex; i < this.deliveryFlow.length; i++) {
      const step = this.deliveryFlow[i];
      if (step?.estimatedHours) {
        totalEstimatedHours += step.estimatedHours;
      }
    }

    const estimatedDate = new Date(order.createdAt);
    estimatedDate.setHours(estimatedDate.getHours() + totalEstimatedHours);
    return estimatedDate;
  }

  /**
   * Check if delivery is delayed
   */
  isDeliveryDelayed(order: Order): boolean {
    if (order.status === 'delivered' || order.status === 'completed' || order.status === 'cancelled') {
      return false;
    }

    const estimatedTime = this.estimateDeliveryTime(order);
    if (!estimatedTime) return false;

    return new Date() > estimatedTime;
  }

  /**
   * Get delivery zone for location
   */
  getDeliveryZone(latitude: number, longitude: number): string {
    return this.geolocationService.getDeliveryZone(latitude, longitude);
  }

  /**
   * Check if user is at delivery location
   */
  isAtDeliveryLocation(
    currentLat: number,
    currentLon: number,
    deliveryAddressLat: number,
    deliveryAddressLon: number
  ): boolean {
    // Check if within 100 meters
    return this.geolocationService.isNearLocation(
      currentLat,
      currentLon,
      deliveryAddressLat,
      deliveryAddressLon,
      100
    );
  }

  /**
   * Format estimated delivery time
   */
  formatEstimatedTime(date: Date | null): string {
    if (!date) return 'Không xác định';

    const now = new Date();
    const diffHours = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) {
      return 'Trong vài phút nữa';
    } else if (diffHours === 1) {
      return 'Khoảng 1 giờ';
    } else if (diffHours < 24) {
      return `Khoảng ${diffHours} giờ`;
    } else {
      return date.toLocaleDateString('vi-VN');
    }
  }

  /**
   * Get delivery status color for UI
   */
  getStatusColor(status: Order['status']): string {
    const map: Record<Order['status'], string> = {
      'awaiting_payment': 'warning',
      'confirmed': 'primary',
      'processing': 'info',
      'shipping': 'secondary',
      'delivered': 'success',
      'completed': 'success',
      'cancelled': 'danger'
    };
    return map[status] || 'medium';
  }

  /**
   * Get delivery status icon
   */
  getStatusIcon(status: Order['status']): string {
    const map: Record<Order['status'], string> = {
      'awaiting_payment': 'hourglass-outline',
      'confirmed': 'checkmark-circle-outline',
      'processing': 'cube-outline',
      'shipping': 'location-outline',
      'delivered': 'checkmark-done-circles-outline',
      'completed': 'ribbon-outline',
      'cancelled': 'close-circle-outline'
    };
    return map[status] || 'help-circle-outline';
  }

  /**
   * Can cancel order at current status
   */
  canCancelOrder(status: Order['status']): boolean {
    const cancellableStatuses: Order['status'][] = ['awaiting_payment', 'confirmed', 'processing', 'shipping'];
    return cancellableStatuses.includes(status);
  }

  /**
   * Generate tracking summary
   */
  generateTrackingSummary(order: Order): string {
    const steps = this.getDeliverySteps(order);
    const completed = steps.filter(s => s.isCompleted).length;
    const total = steps.length;
    const percentage = this.getProgressPercentage(order.status);
    const currentStep = steps.find(s => s.status === order.status);

    return `Đơn #${order.orderCode ?? order.id}: ${completed}/${total} bước - ${percentage}% - ${currentStep?.label}`;
  }
}
