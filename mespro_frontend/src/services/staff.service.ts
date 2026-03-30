/**
 * Staff Service
 * Handles all staff-related API operations
 */

import { apiService } from './api.service';

class StaffService {
  async getStaff(): Promise<any[]> {
    return apiService.get<any[]>('/staff');
  }

  async getStaffById(id: string): Promise<any> {
    return apiService.get<any>(`/staff/${id}`);
  }

  async createStaff(staff: any): Promise<any> {
    return apiService.post<any>('/staff', staff);
  }

  async updateStaff(id: string, staff: any): Promise<any> {
    return apiService.put<any>(`/staff/${id}`, staff);
  }

  async deleteStaff(id: string): Promise<void> {
    return apiService.delete<void>(`/staff/${id}`);
  }
}

export const staffService = new StaffService();
export default staffService;
