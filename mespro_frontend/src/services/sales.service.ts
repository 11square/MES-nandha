/**
 * Sales Service
 * Handles all sales-related API operations
 */

import { apiService } from './api.service';

class SalesService {
  async getSales(): Promise<any[]> {
    return apiService.get<any[]>('/sales');
  }

  async getSaleById(id: string): Promise<any> {
    return apiService.get<any>(`/sales/${id}`);
  }

  async createSale(sale: any): Promise<any> {
    return apiService.post<any>('/sales', sale);
  }

  async updateSale(id: string, sale: any): Promise<any> {
    return apiService.put<any>(`/sales/${id}`, sale);
  }

  async deleteSale(id: string): Promise<void> {
    return apiService.delete<void>(`/sales/${id}`);
  }

  // Targets
  async getTargets(): Promise<any[]> {
    return apiService.get<any[]>('/sales/targets');
  }

  async createTarget(target: any): Promise<any> {
    return apiService.post<any>('/sales/targets', target);
  }

  async updateTarget(id: string, target: any): Promise<any> {
    return apiService.put<any>(`/sales/targets/${id}`, target);
  }

  // Followups
  async getFollowups(): Promise<any[]> {
    return apiService.get<any[]>('/sales/followups');
  }

  async createFollowup(followup: any): Promise<any> {
    return apiService.post<any>('/sales/followups', followup);
  }

  async updateFollowup(id: string, followup: any): Promise<any> {
    return apiService.put<any>(`/sales/followups/${id}`, followup);
  }
}

export const salesService = new SalesService();
export default salesService;
