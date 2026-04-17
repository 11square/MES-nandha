/**
 * Inventory Service
 * Handles all inventory-related API operations
 */

import { apiService } from './api.service';

class InventoryService {
  // Raw Materials
  async getRawMaterials(): Promise<any[]> {
    return apiService.get<any[]>('/inventory/raw-materials');
  }

  async createRawMaterial(material: any): Promise<any> {
    return apiService.post<any>('/inventory/raw-materials', material);
  }

  async updateRawMaterial(id: string, material: any): Promise<any> {
    return apiService.put<any>(`/inventory/raw-materials/${id}`, material);
  }

  async deleteRawMaterial(id: string): Promise<void> {
    return apiService.delete<void>(`/inventory/raw-materials/${id}`);
  }

  // Finished Goods
  async getFinishedGoods(): Promise<any[]> {
    return apiService.get<any[]>('/inventory/finished-goods');
  }

  async createFinishedGood(item: any): Promise<any> {
    return apiService.post<any>('/inventory/finished-goods', item);
  }

  async updateFinishedGood(id: string, item: any): Promise<any> {
    return apiService.put<any>(`/inventory/finished-goods/${id}`, item);
  }

  async deleteFinishedGood(id: string): Promise<void> {
    return apiService.delete<void>(`/inventory/finished-goods/${id}`);
  }

  // Transactions
  async getTransactions(): Promise<any[]> {
    return apiService.get<any[]>('/inventory/transactions?limit=10000');
  }

  async createTransaction(transaction: any): Promise<any> {
    return apiService.post<any>('/inventory/transactions', transaction);
  }

  // Requisitions
  async getRequisitions(): Promise<any[]> {
    return apiService.get<any[]>('/inventory/requisitions');
  }

  async createRequisition(requisition: any): Promise<any> {
    return apiService.post<any>('/inventory/requisitions', requisition);
  }

  async updateRequisitionStatus(id: string, status: string): Promise<any> {
    return apiService.put<any>(`/inventory/requisitions/${id}/status`, { status });
  }
}

export const inventoryService = new InventoryService();
export default inventoryService;
