/**
 * SuperAdmin Service
 * Handles API calls for business management, feature settings, and business users.
 */
import apiService from './api.service';

export interface Business {
  id: number;
  name: string;
  logo_url: string | null;
  logo_storage_type: string | null;
  status: 'Active' | 'Inactive';
  created_at: string;
  updated_at: string;
  businessUsers?: BusinessUserData[];
  featureValues?: FeatureSettingValueData[];
}

export interface FeatureSettingData {
  id: number;
  feature_key: string;
  feature_name: string;
  description: string | null;
  category: string;
  is_active: boolean;
  display_order: number;
}

export interface RolePermissions {
  admin: boolean;
  manager: boolean;
  staff: boolean;
  viewer: boolean;
}

export interface FeatureSettingValueData {
  id: number;
  business_id: number;
  feature_setting_id: number;
  is_enabled: boolean;
  role_permissions: RolePermissions | null;
  featureSetting?: FeatureSettingData;
}

export interface BusinessUserData {
  id: number;
  business_id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: 'Active' | 'Inactive';
  last_login: string | null;
  created_at: string;
  business?: { id: number; name: string };
}

class SuperAdminService {
  // ─── Businesses ──────────────────────────────────────────────────────
  async getBusinesses(params?: { search?: string; status?: string }): Promise<any> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    query.set('limit', '100');
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiService.get(`/superadmin/businesses${qs}`);
  }

  async getBusinessById(id: number): Promise<Business> {
    return apiService.get(`/superadmin/businesses/${id}`);
  }

  async createBusiness(formData: FormData): Promise<Business> {
    return apiService.postFormData('/superadmin/businesses', formData);
  }

  async updateBusiness(id: number, formData: FormData): Promise<Business> {
    // postFormData uses POST, but we need PUT — use a custom method
    const url = `/superadmin/businesses/${id}`;
    const baseUrl = (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1';
    const token = localStorage.getItem('token');

    const response = await fetch(`${baseUrl}${url}`, {
      method: 'PUT',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to update business');
    }

    const json = await response.json();
    return json.data !== undefined ? json.data : json;
  }

  async deleteBusiness(id: number): Promise<void> {
    return apiService.delete(`/superadmin/businesses/${id}`);
  }

  // ─── Feature Settings ────────────────────────────────────────────────
  async getFeatureSettings(): Promise<FeatureSettingData[]> {
    return apiService.get('/superadmin/feature-settings');
  }

  // ─── Business Feature Values ─────────────────────────────────────────
  async getBusinessFeatures(businessId: number): Promise<FeatureSettingValueData[]> {
    return apiService.get(`/superadmin/businesses/${businessId}/features`);
  }

  async saveBusinessFeatures(
    businessId: number,
    features: { feature_setting_id: number; is_enabled: boolean; role_permissions?: RolePermissions | null }[]
  ): Promise<FeatureSettingValueData[]> {
    return apiService.put(`/superadmin/businesses/${businessId}/features`, { features });
  }

  // ─── Business Users ──────────────────────────────────────────────────
  async getBusinessUsers(params?: { search?: string; business_id?: number }): Promise<any> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.business_id) query.set('business_id', String(params.business_id));
    query.set('limit', '100');
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiService.get(`/superadmin/business-users${qs}`);
  }

  async createBusinessUser(data: {
    business_id: number;
    name: string;
    email: string;
    phone?: string;
    password: string;
    role?: string;
  }): Promise<BusinessUserData> {
    return apiService.post('/superadmin/business-users', data);
  }

  async updateBusinessUser(
    id: number,
    data: Partial<{
      name: string;
      email: string;
      phone: string;
      password: string;
      status: string;
      role: string;
      business_id: number;
    }>
  ): Promise<BusinessUserData> {
    return apiService.put(`/superadmin/business-users/${id}`, data);
  }

  async deleteBusinessUser(id: number): Promise<void> {
    return apiService.delete(`/superadmin/business-users/${id}`);
  }
}

export const superAdminService = new SuperAdminService();
export default superAdminService;
