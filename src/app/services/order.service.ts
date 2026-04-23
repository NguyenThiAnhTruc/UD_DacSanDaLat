import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Order } from '../models/product.model';
import { ProductService } from './product.service';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private productService = inject(ProductService);

  public orders$: Observable<Order[]>;

  constructor() {
    this.orders$ = this.productService.orders$;
  }

  getOrders(): Order[] {
    return this.productService.getOrders();
  }

  getOrderById(id: string): Order | undefined {
    return this.productService.getOrderById(id);
  }

  addOrder(order: Order): void {
    this.productService.addOrder(order);
  }

  updateOrderStatus(orderId: string, status: Order['status']): boolean {
    return this.productService.updateOrderStatus(orderId, status);
  }

  verifyOrderPayment(orderId: string, referenceCode: string, verifierName?: string, note?: string): boolean {
    return this.productService.verifyOrderPayment(orderId, referenceCode, verifierName, note);
  }

  cancelOrder(orderId: string): boolean {
    return this.productService.cancelOrder(orderId);
  }

  getOrdersByStatus(status: Order['status']): Order[] {
    return this.productService.getOrders().filter(order => order.status === status);
  }

  getRecentOrders(limit: number = 5): Order[] {
    return [...this.productService.getOrders()]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  getTotalSpent(): number {
    return this.productService.getOrders()
      .filter(order => order.status !== 'cancelled')
      .reduce((sum, order) => sum + order.total, 0);
  }

  getOrderCount(): number {
    return this.productService.getOrders().length;
  }

  getPendingOrderCount(): number {
    return this.productService.getOrders().filter(order => order.status === 'awaiting_payment').length;
  }
}
