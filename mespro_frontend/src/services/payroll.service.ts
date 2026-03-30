/**
 * Payroll Service
 * Handles all payroll-related API operations
 */

import { apiService } from './api.service';

class PayrollService {
  async getPayrollRecords(params?: { month?: string; status?: string }): Promise<any[]> {
    const query = new URLSearchParams(params as any).toString();
    const data = await apiService.get<any>(`/payroll${query ? `?${query}` : ''}`);
    const items = Array.isArray(data) ? data : data?.items || data?.records || [];
    return items;
  }

  async getPayrollById(id: string): Promise<any> {
    return apiService.get<any>(`/payroll/${id}`);
  }

  async createPayroll(record: any): Promise<any> {
    return apiService.post<any>('/payroll', record);
  }

  async generatePayroll(month: string): Promise<any> {
    return apiService.post<any>('/payroll/generate', { month });
  }

  async updatePayroll(id: string, record: any): Promise<any> {
    return apiService.put<any>(`/payroll/${id}`, record);
  }

  async processPayroll(id: string): Promise<any> {
    return apiService.put<any>(`/payroll/${id}/process`, {});
  }

  async markPayrollPaid(id: string): Promise<any> {
    return apiService.put<any>(`/payroll/${id}/pay`, {});
  }

  async deletePayroll(id: string): Promise<void> {
    return apiService.delete<void>(`/payroll/${id}`);
  }
}

export const payrollService = new PayrollService();
export default payrollService;
