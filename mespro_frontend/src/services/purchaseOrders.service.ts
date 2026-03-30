/**
 * Purchase Orders Service
 * Handles all purchase order-related API operations
 */

import { apiService } from './api.service';

class PurchaseOrdersService {
  async getPurchaseOrders(): Promise<any[]> {
    return apiService.get<any[]>('/purchase-orders');
  }

  async getAllPurchaseOrders(): Promise<any[]> {
    return apiService.get<any[]>('/purchase-orders?limit=1000');
  }

  async getPurchaseOrderById(id: string): Promise<any> {
    return apiService.get<any>(`/purchase-orders/${id}`);
  }

  async createPurchaseOrder(po: any): Promise<any> {
    return apiService.post<any>('/purchase-orders', po);
  }

  async updatePurchaseOrder(id: string, po: any): Promise<any> {
    return apiService.put<any>(`/purchase-orders/${id}`, po);
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    return apiService.delete<void>(`/purchase-orders/${id}`);
  }

  async updatePurchaseOrderStatus(id: string, status: string): Promise<any> {
    return apiService.put<any>(`/purchase-orders/${id}/status`, { status });
  }
}

export const purchaseOrdersService = new PurchaseOrdersService();
export default purchaseOrdersService;
