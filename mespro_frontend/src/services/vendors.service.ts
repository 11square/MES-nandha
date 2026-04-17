/**
 * Vendors Service
 * Handles all vendor-related API operations
 */

import { apiService } from './api.service';

class VendorsService {
  async getVendors(): Promise<any[]> {
    return apiService.get<any[]>('/vendors');
  }

  async getVendorById(id: string): Promise<any> {
    return apiService.get<any>(`/vendors/${id}`);
  }

  async getVendorPurchases(vendorId: string): Promise<any[]> {
    return apiService.get<any[]>(`/vendors/${vendorId}/purchases?limit=100`);
  }

  async getVendorTransactions(vendorId: string): Promise<any[]> {
    return apiService.get<any[]>(`/vendors/${vendorId}/transactions?limit=100`);
  }

  async getVendorDispatches(vendorId: string): Promise<any[]> {
    return apiService.get<any[]>(`/vendors/${vendorId}/dispatches?limit=100`);
  }

  async getVendorFollowups(vendorId?: string): Promise<any[]> {
    const endpoint = vendorId ? `/vendors/${vendorId}/followups` : '/vendors/followups';
    return apiService.get<any[]>(endpoint);
  }

  async createVendorFollowup(vendorId: string, data: any): Promise<any> {
    return apiService.post<any>(`/vendors/${vendorId}/followups`, data);
  }

  async createVendor(vendor: any): Promise<any> {
    return apiService.post<any>('/vendors', vendor);
  }

  async updateVendor(id: string, vendor: any): Promise<any> {
    return apiService.put<any>(`/vendors/${id}`, vendor);
  }

  async deleteVendor(id: string): Promise<void> {
    return apiService.delete<void>(`/vendors/${id}`);
  }
}

export const vendorsService = new VendorsService();
export default vendorsService;
