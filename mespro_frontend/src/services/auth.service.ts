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

/**
 * Hardcoded module list. Modules are no longer fetched from the backend or
 * persisted to localStorage — every authenticated user sees this exact set.
 */
const HARDCODED_MODULES: Module[] = [
  { key: 'dashboard', label: 'Dashboard', url: '/dashboard' },
  { key: 'leads', label: 'Leads', url: '/leads' },
  { key: 'orders', label: 'Orders', url: '/orders' },
  { key: 'billing', label: 'Billing', url: '/billing' },
  { key: 'production', label: 'Production', url: '/production' },
  { key: 'sales', label: 'Sales', url: '/sales' },
  { key: 'inventory', label: 'Inventory', url: '/inventory' },
  { key: 'stock', label: 'Stock', url: '/stock' },
  { key: 'purchase_orders', label: 'Purchase Orders', url: '/purchase-orders' },
  { key: 'dispatch', label: 'Dispatch', url: '/dispatch' },
  { key: 'products', label: 'Products', url: '/products' },
  { key: 'clients', label: 'Clients', url: '/clients' },
  { key: 'finance', label: 'Finance', url: '/finance' },
  { key: 'audit', label: 'Audit', url: '/audit' },
  { key: 'payroll', label: 'Payroll', url: '/payroll' },
  { key: 'staff', label: 'Staff', url: '/staff' },
  { key: 'attendance', label: 'Attendance', url: '/attendance' },
  { key: 'vendors', label: 'Vendors', url: '/vendors' },
  { key: 'users', label: 'Users', url: '/users' },
  { key: 'reports', label: 'Reports', url: '/reports' },
  { key: 'settings', label: 'Settings', url: '/settings' },
];

class AuthService {
  async login(email: string, password: string): Promise<any> {
    const response = await apiService.post<any>('/auth/login', { email, password });
    if (response.token) {
      apiService.setToken(response.token);
    }
    // Modules are hardcoded; ignore anything the server returns and clear any stale cache.
    try { localStorage.removeItem('modules'); } catch { /* ignore */ }
    return response;
  }

  async register(data: { name: string; email: string; password: string; role_id?: number }): Promise<any> {
    return apiService.post<any>('/auth/register', data);
  }

  async getProfile(): Promise<any> {
    return apiService.get<any>('/auth/profile');
  }

  /** Returns the hardcoded module list (no network call, no caching). */
  async getModules(): Promise<Module[]> {
    return HARDCODED_MODULES.slice();
  }

  /** Returns the hardcoded module list. */
  getCachedModules(): Module[] {
    return HARDCODED_MODULES.slice();
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
    try { localStorage.removeItem('modules'); } catch { /* ignore */ }
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }
}

export const authService = new AuthService();
export default authService;

