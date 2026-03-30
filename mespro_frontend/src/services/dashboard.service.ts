/**
 * Dashboard Service
 * Handles all dashboard-related API operations
 */

import { apiService } from './api.service';

class DashboardService {
  async getSummary(): Promise<any> {
    return apiService.get<any>('/dashboard/summary');
  }

  async getRecentOrders(): Promise<any[]> {
    return apiService.get<any[]>('/dashboard/recent-orders');
  }

  async getProductionStatus(): Promise<any[]> {
    return apiService.get<any[]>('/dashboard/production-status');
  }

  async getAttendanceToday(): Promise<any> {
    return apiService.get<any>('/dashboard/attendance-today');
  }

  async getLowStock(): Promise<any[]> {
    return apiService.get<any[]>('/dashboard/low-stock');
  }

  async getPendingLeads(): Promise<any[]> {
    return apiService.get<any[]>('/dashboard/pending-leads');
  }

  async getRevenueTrend(): Promise<any[]> {
    return apiService.get<any[]>('/dashboard/revenue-trend');
  }

  async getOrderStats(): Promise<any[]> {
    return apiService.get<any[]>('/dashboard/order-stats');
  }

  async getMonthlyOrders(): Promise<any[]> {
    return apiService.get<any[]>('/dashboard/monthly-orders');
  }

  async getPaymentOverview(): Promise<any[]> {
    return apiService.get<any[]>('/dashboard/payment-overview');
  }

  async getTopClients(): Promise<any[]> {
    return apiService.get<any[]>('/dashboard/top-clients');
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
