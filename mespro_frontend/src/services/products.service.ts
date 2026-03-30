/**
 * Products Service
 * Handles all product-related API operations
 */

import { apiService } from './api.service';

class ProductsService {
  async getProducts(): Promise<any[]> {
    return apiService.get<any[]>('/products?limit=500');
  }

  async getProductById(id: string): Promise<any> {
    return apiService.get<any>(`/products/${id}`);
  }

  async createProduct(product: any): Promise<any> {
    return apiService.post<any>('/products', product);
  }

  async updateProduct(id: string, product: any): Promise<any> {
    return apiService.put<any>(`/products/${id}`, product);
  }

  async deleteProduct(id: string): Promise<void> {
    return apiService.delete<void>(`/products/${id}`);
  }

  // ── Category persistence (localStorage, scoped per business) ──

  private readonly CATEGORIES_PREFIX = 'mespro_product_categories';

  /** Get the business-scoped localStorage key */
  private getCategoriesKey(businessId?: number | string | null): string {
    if (businessId) return `${this.CATEGORIES_PREFIX}_${businessId}`;
    // Fallback: try to read business_id from the stored user profile
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.business_id) return `${this.CATEGORIES_PREFIX}_${payload.business_id}`;
      }
    } catch { /* ignore */ }
    return this.CATEGORIES_PREFIX;
  }

  getCategories(businessId?: number | string | null): { id: string; name: string; subcategories: string[] }[] {
    try {
      const scopedKey = this.getCategoriesKey(businessId);
      let raw = localStorage.getItem(scopedKey);

      // Migration: if scoped key is empty, check the old global key and migrate
      if (!raw && scopedKey !== this.CATEGORIES_PREFIX) {
        const legacyRaw = localStorage.getItem(this.CATEGORIES_PREFIX);
        if (legacyRaw) {
          // Copy legacy data into the new business-scoped key
          localStorage.setItem(scopedKey, legacyRaw);
          // Remove the legacy key so it won't leak to other businesses
          localStorage.removeItem(this.CATEGORIES_PREFIX);
          raw = legacyRaw;
        }
      }

      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveCategories(categories: { id: string; name: string; subcategories: string[] }[], businessId?: number | string | null): void {
    localStorage.setItem(this.getCategoriesKey(businessId), JSON.stringify(categories));
  }

  /** Remove categories for a specific business (called on logout) */
  clearCategories(businessId?: number | string | null): void {
    // Clear specific key and also the legacy un-scoped key
    localStorage.removeItem(this.getCategoriesKey(businessId));
    localStorage.removeItem(this.CATEGORIES_PREFIX);
  }
}

export const productsService = new ProductsService();
export default productsService;
