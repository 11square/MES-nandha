/**
 * API Service
 * Centralized service for all API calls
 * Connects to mespro_backend Node.js server
 */

// Base API configuration — points to the backend server
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1';

class ApiService {
  private baseUrl: string;
  private isRedirecting = false;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /** Get stored auth token */
  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  /** Set auth token after login */
  setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  /** Remove auth token on logout */
  clearToken(): void {
    localStorage.removeItem('token');
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options?.headers,
        },
      });

      if (response.status === 401) {
        this.clearToken();
        if (!this.isRedirecting) {
          this.isRedirecting = true;
          window.location.href = '/login';
        }
        throw new Error('Unauthorized — session expired');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${response.statusText}`);
      }

      const json = await response.json();
      // Backend wraps data in { success, data } — unwrap it
      return json.data !== undefined ? json.data : json;
    } catch (error) {
      if (!(error instanceof Error && error.message === 'Unauthorized — session expired')) {
        console.error('API Request failed:', error);
      }
      throw error;
    }
  }

  // GET request
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST  request
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // PATCH request
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // POST multipart/form-data (for file uploads — no JSON content-type header)
  async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (response.status === 401) {
      this.clearToken();
      if (!this.isRedirecting) {
        this.isRedirecting = true;
        window.location.href = '/login';
      }
      throw new Error('Unauthorized — session expired');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.statusText}`);
    }

    const json = await response.json();
    return json.data !== undefined ? json.data : json;
  }

  // PUT multipart/form-data (for file uploads — no JSON content-type header)
  async putFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (response.status === 401) {
      this.clearToken();
      if (!this.isRedirecting) {
        this.isRedirecting = true;
        window.location.href = '/login';
      }
      throw new Error('Unauthorized — session expired');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.statusText}`);
    }

    const json = await response.json();
    return json.data !== undefined ? json.data : json;
  }
}

export const apiService = new ApiService();
export default apiService;
