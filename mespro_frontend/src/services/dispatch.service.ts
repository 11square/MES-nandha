/**
 * Dispatch Service
 * Handles all dispatch-related API operations
 */

import { apiService } from './api.service';

class DispatchService {
  async getDispatches(): Promise<any[]> {
    return apiService.get<any[]>('/dispatch');
  }

  async getDispatchById(id: string): Promise<any> {
    return apiService.get<any>(`/dispatch/${id}`);
  }

  async createDispatch(dispatch: any, lrImageFile?: File): Promise<any> {
    if (lrImageFile) {
      const formData = new FormData();
      Object.entries(dispatch).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          formData.append(key, String(value));
        }
      });
      formData.append('lr_image', lrImageFile);
      return apiService.postFormData<any>('/dispatch', formData);
    }
    return apiService.post<any>('/dispatch', dispatch);
  }

  async updateDispatch(id: string, dispatch: any, lrImageFile?: File): Promise<any> {
    if (lrImageFile) {
      const formData = new FormData();
      Object.entries(dispatch).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });
      formData.append('lr_image', lrImageFile);
      return apiService.putFormData<any>(`/dispatch/${id}`, formData);
    }
    return apiService.put<any>(`/dispatch/${id}`, dispatch);
  }

  async deleteDispatch(id: string): Promise<void> {
    return apiService.delete<void>(`/dispatch/${id}`);
  }

  async updateDispatchStatus(id: string, status: string, notes?: string): Promise<any> {
    return apiService.put<any>(`/dispatch/${id}/status`, { status, notes });
  }

  async getTransporters(): Promise<any[]> {
    return apiService.get<any[]>('/dispatch/transporters');
  }

  async createTransporter(data: { name: string; phone?: string; vehicle_no?: string }): Promise<any> {
    return apiService.post<any>('/dispatch/transporters', data);
  }
}

export const dispatchService = new DispatchService();
export default dispatchService;
