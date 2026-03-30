/**
 * Leads Service
 * Handles all lead-related API operations
 */

import { apiService } from './api.service';

class LeadsService {
  async getLeads(): Promise<any[]> {
    const response = await apiService.get<any>('/leads');
    return Array.isArray(response) ? response : (response?.items ?? []);
  }

  async getLeadById(id: string): Promise<any | undefined> {
    return apiService.get<any>(`/leads/${id}`);
  }

  async createLead(lead: any): Promise<any> {
    return apiService.post<any>('/leads', lead);
  }

  async updateLead(id: string, lead: any): Promise<any> {
    return apiService.put<any>(`/leads/${id}`, lead);
  }

  async deleteLead(id: string): Promise<void> {
    return apiService.delete<void>(`/leads/${id}`);
  }

  async addFollowUp(leadId: string, followUp: any): Promise<any> {
    return apiService.post<any>(`/leads/${leadId}/followups`, followUp);
  }

  async updateFollowUp(leadId: string, followUpId: string, followUp: any): Promise<any> {
    return apiService.put<any>(`/leads/${leadId}/followups/${followUpId}`, followUp);
  }

  async deleteFollowUp(leadId: string, followUpId: string): Promise<void> {
    return apiService.delete<void>(`/leads/${leadId}/followups/${followUpId}`);
  }

  async convertLeadToOrder(leadId: string): Promise<any> {
    return apiService.post(`/leads/${leadId}/convert`, {});
  }
}

export const leadsService = new LeadsService();
export default leadsService;
