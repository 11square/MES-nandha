/**
 * Settings Service
 * Handles all settings-related API operations
 */

import { apiService } from './api.service';

class SettingsService {
  async getCompanySettings(): Promise<any> {
    return apiService.get<any>('/settings/company');
  }

  async updateCompanySettings(data: any): Promise<any> {
    return apiService.put<any>('/settings/company', data);
  }

  async getTaxSettings(): Promise<any> {
    return apiService.get<any>('/settings/tax');
  }

  async updateTaxSettings(data: any): Promise<any> {
    return apiService.put<any>('/settings/tax', data);
  }

  async getInvoiceSettings(): Promise<any> {
    return apiService.get<any>('/settings/invoice');
  }

  async updateInvoiceSettings(data: any): Promise<any> {
    return apiService.put<any>('/settings/invoice', data);
  }

  async getNotificationSettings(): Promise<any> {
    return apiService.get<any>('/settings/notification');
  }

  async updateNotificationSettings(data: any): Promise<any> {
    return apiService.put<any>('/settings/notification', data);
  }

  async getSystemSettings(): Promise<any> {
    return apiService.get<any>('/settings/system');
  }

  async updateSystemSettings(data: any): Promise<any> {
    return apiService.put<any>('/settings/system', data);
  }

  async getSecuritySettings(): Promise<any> {
    return apiService.get<any>('/settings/security');
  }

  async updateSecuritySettings(data: any): Promise<any> {
    return apiService.put<any>('/settings/security', data);
  }

  async getAllSettings(): Promise<any> {
    return apiService.get<any>('/settings');
  }
}

export const settingsService = new SettingsService();
export default settingsService;
