/**
 * Reports Service
 * Handles all report-related API operations
 * Covers 8 report tabs: Overview, Sales, Production, Finance, Orders, Supply Chain, HR, Audit
 */

import { apiService } from './api.service';

class ReportsService {
  private buildQuery(params?: Record<string, any>): string {
    if (!params) return '';
    const filtered = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null));
    const query = new URLSearchParams(filtered as any).toString();
    return query ? `?${query}` : '';
  }

  // ─── 1. Overview ───────────────────────────────────────────
  async getOverviewReport(): Promise<any> {
    return apiService.get<any>('/reports/overview');
  }

  // ─── 2. Sales & Leads ─────────────────────────────────────
  async getSalesReport(params?: { startDate?: string; endDate?: string }): Promise<any> {
    return apiService.get<any>(`/reports/sales${this.buildQuery(params)}`);
  }

  // ─── 3. Production ────────────────────────────────────────
  async getProductionReport(params?: { status?: string }): Promise<any> {
    return apiService.get<any>(`/reports/production${this.buildQuery(params)}`);
  }

  // ─── 4. Finance (Finance + Billing + Payroll) ─────────────
  async getFinancialReport(params?: { startDate?: string; endDate?: string }): Promise<any> {
    return apiService.get<any>(`/reports/financial${this.buildQuery(params)}`);
  }

  async getBillingReport(params?: { startDate?: string; endDate?: string }): Promise<any> {
    return apiService.get<any>(`/reports/billing${this.buildQuery(params)}`);
  }

  // ─── 5. Orders & Dispatch ─────────────────────────────────
  async getOrdersReport(params?: { status?: string; startDate?: string; endDate?: string }): Promise<any> {
    return apiService.get<any>(`/reports/orders${this.buildQuery(params)}`);
  }

  async getDispatchReport(params?: { status?: string; startDate?: string; endDate?: string }): Promise<any> {
    return apiService.get<any>(`/reports/dispatch${this.buildQuery(params)}`);
  }

  // ─── 6. Supply Chain (Inventory + Stock + PO + Vendors) ───
  async getInventoryReport(): Promise<any> {
    return apiService.get<any>('/reports/inventory');
  }

  async getStockReport(): Promise<any> {
    return apiService.get<any>('/reports/stock');
  }

  async getPurchaseOrderReport(params?: { status?: string }): Promise<any> {
    return apiService.get<any>(`/reports/purchase-orders${this.buildQuery(params)}`);
  }

  async getVendorReport(): Promise<any> {
    return apiService.get<any>('/reports/vendors');
  }

  // ─── 7. HR (Staff + Attendance + Payroll) ─────────────────
  async getAttendanceReport(params?: { startDate?: string; endDate?: string; workerId?: string }): Promise<any> {
    return apiService.get<any>(`/reports/attendance${this.buildQuery(params)}`);
  }

  async getStaffReport(): Promise<any> {
    return apiService.get<any>('/reports/staff');
  }

  async getPayrollReport(params?: { month?: string; year?: string }): Promise<any> {
    return apiService.get<any>(`/reports/payroll${this.buildQuery(params)}`);
  }

}

export const reportsService = new ReportsService();
export default reportsService;
