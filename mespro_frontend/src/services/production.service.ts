/**
 * Production Service
 * Handles all production-related API operations
 */

import { apiService } from './api.service';

class ProductionService {
  async getProductionOrders(): Promise<any[]> {
    return apiService.get<any[]>('/production');
  }

  async createProductionOrder(order: any): Promise<any> {
    return apiService.post<any>('/production', order);
  }

  async getProductionOrderById(id: string): Promise<any> {
    return apiService.get<any>(`/production/${id}`);
  }

  async updateProductionStage(orderId: string, stage: number): Promise<any> {
    return apiService.patch(`/production/${orderId}/stage`, { stage });
  }

  async assignWorker(orderId: string, workerId: string): Promise<any> {
    return apiService.patch(`/production/${orderId}/assign`, { workerId });
  }

  async updateProgress(orderId: string, progress: number): Promise<any> {
    return apiService.patch(`/production/${orderId}/progress`, { progress });
  }
}

export const productionService = new ProductionService();
export default productionService;
