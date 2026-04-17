/**
 * Products Service
 * Handles all product-related API operations
 */

import { apiService } from './api.service';

interface CategoryFromAPI {
  id: number;
  slug: string;
  name: string;
  subcategories?: { id: number; slug: string; name: string }[];
}

export interface CategoryLocal {
  id: string;
  name: string;
  dbId?: number;
  subcategories: string[];
  subDbIds?: Record<string, number>;
}

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

  // ── Category persistence (Database-backed via API) ──

  /** Fetch categories from the API and return in the local format */
  async getCategories(): Promise<CategoryLocal[]> {
    try {
      const data = await apiService.get<CategoryFromAPI[]>('/products/categories');
      const rows = Array.isArray(data) ? data : [];
      return rows.map(cat => {
        const subDbIds: Record<string, number> = {};
        const subcategories = (cat.subcategories || []).map(s => {
          subDbIds[s.name] = s.id;
          return s.name;
        });
        return {
          id: cat.slug,
          name: cat.name,
          dbId: cat.id,
          subcategories,
          subDbIds,
        };
      });
    } catch {
      return [];
    }
  }

  /** Create a new category via API */
  async createCategory(name: string): Promise<CategoryLocal> {
    const data = await apiService.post<any>('/products/categories', { name });
    return { id: data.slug, name: data.name, dbId: data.id, subcategories: [], subDbIds: {} };
  }

  /** Rename a category via API */
  async updateCategory(dbId: number, name: string): Promise<void> {
    await apiService.put<any>(`/products/categories/${dbId}`, { name });
  }

  /** Delete a category (or subcategory) via API */
  async deleteCategory(dbId: number): Promise<void> {
    await apiService.delete<void>(`/products/categories/${dbId}`);
  }

  /** Add subcategories to a parent via API */
  async addSubcategories(parentDbId: number, names: string[]): Promise<any[]> {
    const data = await apiService.post<any[]>('/products/categories/bulk-subcategories', {
      parent_id: parentDbId,
      names,
    });
    return Array.isArray(data) ? data : [];
  }

  // ── Legacy localStorage helpers (kept for one-time migration, then removed) ──

  private readonly CATEGORIES_PREFIX = 'mespro_product_categories';

  private getCategoriesKey(businessId?: number | string | null): string {
    if (businessId) return `${this.CATEGORIES_PREFIX}_${businessId}`;
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.business_id) return `${this.CATEGORIES_PREFIX}_${payload.business_id}`;
      }
    } catch { /* ignore */ }
    return this.CATEGORIES_PREFIX;
  }

  getLegacyCategories(businessId?: number | string | null): { id: string; name: string; subcategories: string[] }[] {
    try {
      const scopedKey = this.getCategoriesKey(businessId);
      let raw = localStorage.getItem(scopedKey);
      if (!raw && scopedKey !== this.CATEGORIES_PREFIX) {
        const legacyRaw = localStorage.getItem(this.CATEGORIES_PREFIX);
        if (legacyRaw) {
          raw = legacyRaw;
        }
      }
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  clearLegacyCategories(businessId?: number | string | null): void {
    localStorage.removeItem(this.getCategoriesKey(businessId));
    localStorage.removeItem(this.CATEGORIES_PREFIX);
  }

  /** @deprecated — use getCategories() instead */
  saveCategories(): void {
    // no-op: categories are now saved via API
  }

  /** @deprecated — use clearLegacyCategories for cleanup */
  clearCategories(businessId?: number | string | null): void {
    this.clearLegacyCategories(businessId);
  }
}

export const productsService = new ProductsService();
export default productsService;
