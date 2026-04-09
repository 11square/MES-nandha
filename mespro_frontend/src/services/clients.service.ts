/**
 * Clients Service
 * Handles all client-related API operations
 */

import { apiService } from './api.service';

class ClientsService {
  async getClients(params?: { customerType?: string }): Promise<any[]> {
    const query = new URLSearchParams();
    if (params?.customerType && params.customerType !== 'all') query.set('customerType', params.customerType);
    const qs = query.toString();
    return apiService.get<any[]>(`/clients${qs ? `?${qs}` : ''}`);
  }

  async getClientById(id: string): Promise<any> {
    return apiService.get<any>(`/clients/${id}`);
  }

  async getClientPayments(clientId?: string): Promise<any[]> {
    const endpoint = clientId ? `/clients/${clientId}/payments` : '/billing/payments';
    return apiService.get<any[]>(endpoint);
  }

  async getClientSales(clientId?: string): Promise<any[]> {
    const endpoint = clientId ? `/clients/${clientId}/sales` : '/orders';
    return apiService.get<any[]>(endpoint);
  }

  async getClientBills(clientId: string): Promise<any[]> {
    return apiService.get<any[]>(`/clients/${clientId}/bills`);
  }

  async getCreditOutstandings(params?: { page?: number; limit?: number }): Promise<any[]> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiService.get<any[]>(`/clients/outstandings${suffix}`);
  }

  async getClientFollowups(clientId?: string): Promise<any[]> {
    const endpoint = clientId ? `/clients/${clientId}/followups` : '/clients/followups';
    return apiService.get<any[]>(endpoint);
  }

  async createClientFollowup(clientId: string, data: any): Promise<any> {
    return apiService.post<any>(`/clients/${clientId}/followups`, data);
  }

  async getClientOutstandings(clientId: string): Promise<any[]> {
    return apiService.get<any[]>(`/clients/${clientId}/outstandings`);
  }

  async getSalesHistory(): Promise<any[]> {
    return apiService.get<any[]>('/sales/history');
  }

  async createClient(client: any): Promise<any> {
    return apiService.post<any>('/clients', client);
  }

  async updateClient(id: string, client: any): Promise<any> {
    return apiService.put<any>(`/clients/${id}`, client);
  }

  async deleteClient(id: string): Promise<void> {
    return apiService.delete<void>(`/clients/${id}`);
  }
}

export const clientsService = new ClientsService();
export default clientsService;
