/**
 * Attendance Service
 * Handles all attendance-related API operations
 */

import { apiService } from './api.service';

class AttendanceService {
  async getAttendance(params?: { date?: string; staffId?: string; status?: string }): Promise<any[]> {
    const query = new URLSearchParams(params as any).toString();
    return apiService.get<any[]>(`/attendance${query ? `?${query}` : ''}`);
  }

  async getStaff(): Promise<any[]> {
    return apiService.get<any[]>('/attendance/workers');
  }

  async getSummary(date?: string): Promise<any> {
    return apiService.get<any>(`/attendance/summary${date ? `?date=${date}` : ''}`);
  }

  async createAttendance(record: any): Promise<any> {
    return apiService.post<any>('/attendance', record);
  }

  async bulkCreateAttendance(records: any[]): Promise<any> {
    return apiService.post<any>('/attendance/bulk', { records });
  }

  async updateAttendance(id: string, record: any): Promise<any> {
    return apiService.put<any>(`/attendance/${id}`, record);
  }

  async deleteAttendance(id: string): Promise<void> {
    return apiService.delete<void>(`/attendance/${id}`);
  }
}

export const attendanceService = new AttendanceService();
export default attendanceService;
