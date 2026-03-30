/**
 * Orders Service
 * Handles all order-related API operations
 */

import { apiService } from './api.service';

class OrdersService {
  async getOrders(params?: { customerType?: string }): Promise<any[]> {
    const query = new URLSearchParams();
    if (params?.customerType && params.customerType !== 'all') query.set('customerType', params.customerType);
    const qs = query.toString();
    return apiService.get<any[]>(`/orders${qs ? `?${qs}` : ''}`);
  }

  async getOrderById(id: string): Promise<any> {
    return apiService.get<any>(`/orders/${id}`);
  }

  async createOrder(order: any): Promise<any> {
    return apiService.post<any>('/orders', order);
  }

  async updateOrder(id: string, order: any): Promise<any> {
    return apiService.put<any>(`/orders/${id}`, order);
  }

  async deleteOrder(id: string): Promise<void> {
    return apiService.delete<void>(`/orders/${id}`);
  }

  async updateOrderStatus(id: string, status: string): Promise<any> {
    return apiService.put<any>(`/orders/${id}/status`, { status });
  }
}

export const ordersService = new OrdersService();
export default ordersService;
