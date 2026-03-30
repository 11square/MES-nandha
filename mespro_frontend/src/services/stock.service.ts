/**
 * Stock Service
 * Handles all stock-related API operations
 */

import { apiService } from './api.service';

class StockService {
  async getStockItems(): Promise<any[]> {
    return apiService.get<any[]>('/stock');
  }

  async getAllStockItems(): Promise<any[]> {
    return apiService.get<any[]>('/stock?limit=1000');
  }

  async getStockItemById(id: string): Promise<any> {
    return apiService.get<any>(`/stock/${id}`);
  }

  async createStockItem(item: any): Promise<any> {
    return apiService.post<any>('/stock', item);
  }

  async updateStockItem(id: string, item: any): Promise<any> {
    return apiService.put<any>(`/stock/${id}`, item);
  }

  async deleteStockItem(id: string): Promise<void> {
    return apiService.delete<void>(`/stock/${id}`);
  }
}

export const stockService = new StockService();
export default stockService;
