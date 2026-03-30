/**
 * Auth Service
 * Handles authentication-related API operations
 */

import { apiService } from './api.service';
import { productsService } from './products.service';

export interface Module {
  key: string;
  label: string;
  url: string;
}

class AuthService {
  async login(email: string, password: string): Promise<any> {
    const response = await apiService.post<any>('/auth/login', { email, password });
    if (response.token) {
      apiService.setToken(response.token);
    }
    // Store modules from login response
    if (response.modules) {
      localStorage.setItem('modules', JSON.stringify(response.modules));
    }
    return response;
  }

  async register(data: { name: string; email: string; password: string; role_id?: number }): Promise<any> {
    return apiService.post<any>('/auth/register', data);
  }

  async getProfile(): Promise<any> {
    return apiService.get<any>('/auth/profile');
  }

  /** Fetch enabled modules for the current user's business */
  async getModules(): Promise<Module[]> {
    const response = await apiService.get<{ modules: Module[] }>('/auth/modules');
    const modules = (response as any).modules || response || [];
    localStorage.setItem('modules', JSON.stringify(modules));
    return modules;
  }

  /** Get cached modules from localStorage */
  getCachedModules(): Module[] {
    try {
      const stored = localStorage.getItem('modules');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<any> {
    return apiService.put<any>('/auth/change-password', { currentPassword, newPassword });
  }

  logout(): void {
    // Clear business-scoped product categories before token is removed
    try {
      productsService.clearCategories();
    } catch { /* ignore */ }
    apiService.clearToken();
    localStorage.removeItem('modules');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }
}

export const authService = new AuthService();
export default authService;
