/**
 * Documents Service
 * Handles document upload, download, list, and management
 */

import { apiService } from './api.service';

export interface DocumentRecord {
  id: number;
  original_name: string;
  stored_name: string;
  mime_type: string;
  size: number;
  storage_type: 'local' | 's3';
  s3_url?: string;
  local_path?: string;
  category: string;
  entity_type?: string;
  entity_id?: number;
  uploaded_by?: number;
  description?: string;
  extracted_data?: Record<string, any>;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  url: string;
  uploader?: { id: number; name: string; email: string };
  created_at: string;
  updated_at: string;
}

class DocumentsService {
  /**
   * Upload a file with optional metadata
   */
  async upload(
    file: File,
    options?: {
      category?: string;
      entity_type?: string;
      entity_id?: number;
      description?: string;
    }
  ): Promise<DocumentRecord> {
    const formData = new FormData();
    formData.append('file', file);

    if (options?.category) formData.append('category', options.category);
    if (options?.entity_type) formData.append('entity_type', options.entity_type);
    if (options?.entity_id) formData.append('entity_id', String(options.entity_id));
    if (options?.description) formData.append('description', options.description);

    return apiService.postFormData<DocumentRecord>('/documents/upload', formData);
  }

  /**
   * List all documents with optional filters
   */
  async getAll(filters?: {
    category?: string;
    entity_type?: string;
    entity_id?: number;
    status?: string;
    search?: string;
  }): Promise<DocumentRecord[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.entity_type) params.append('entity_type', filters.entity_type);
    if (filters?.entity_id) params.append('entity_id', String(filters.entity_id));
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const qs = params.toString();
    return apiService.get<DocumentRecord[]>(`/documents${qs ? `?${qs}` : ''}`);
  }

  /**
   * Get a single document by ID
   */
  async getById(id: number): Promise<DocumentRecord> {
    return apiService.get<DocumentRecord>(`/documents/${id}`);
  }

  /**
   * Get the download URL for a document
   */
  getDownloadUrl(id: number): string {
    const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
    return `${base}/documents/${id}/download`;
  }

  /**
   * Update document metadata
   */
  async update(
    id: number,
    data: Partial<Pick<DocumentRecord, 'category' | 'entity_type' | 'entity_id' | 'description' | 'extracted_data' | 'status'>>
  ): Promise<DocumentRecord> {
    return apiService.put<DocumentRecord>(`/documents/${id}`, data);
  }

  /**
   * Delete a document
   */
  async delete(id: number): Promise<void> {
    return apiService.delete<void>(`/documents/${id}`);
  }
}

export const documentsService = new DocumentsService();
export default documentsService;
