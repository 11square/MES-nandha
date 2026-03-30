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
