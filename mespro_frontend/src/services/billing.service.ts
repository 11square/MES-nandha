/**
 * Billing Service
 * Handles all billing-related API operations
 */

import { apiService } from './api.service';

class BillingService {
  async getBills(params?: { customerType?: string }): Promise<any[]> {
    const query = new URLSearchParams();
    if (params?.customerType && params.customerType !== 'all') query.set('customerType', params.customerType);
    const qs = query.toString();
    return apiService.get<any[]>(`/billing${qs ? `?${qs}` : ''}`);
  }

  async getAllBills(): Promise<any[]> {
    return apiService.get<any[]>('/billing?limit=1000');
  }

  async getBillById(id: string): Promise<any> {
    return apiService.get<any>(`/billing/${id}`);
  }

  async createBill(bill: any): Promise<any> {
    return apiService.post<any>('/billing', bill);
  }

  async updateBill(id: string, bill: any): Promise<any> {
    return apiService.put<any>(`/billing/${id}`, bill);
  }

  async deleteBill(id: string): Promise<void> {
    return apiService.delete<void>(`/billing/${id}`);
  }

  async getBillPayments(billId: string): Promise<any[]> {
    return apiService.get<any[]>(`/billing/${billId}/payments`);
  }

  async createPayment(billId: string, payment: any): Promise<any> {
    return apiService.post<any>(`/billing/${billId}/payments`, payment);
  }

  async getBillingClients(): Promise<any[]> {
    return apiService.get<any[]>('/billing/clients');
  }

  async getStockItems(): Promise<any[]> {
    return apiService.get<any[]>('/billing/stock-items');
  }
}

export const billingService = new BillingService();
export default billingService;
