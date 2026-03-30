/**
 * Finance Service
 * Handles all finance/transaction-related API operations
 */

import { apiService } from './api.service';

class FinanceService {
  async getTransactions(): Promise<any[]> {
    return apiService.get<any[]>('/finance/transactions');
  }

  async getTransactionById(id: string): Promise<any> {
    return apiService.get<any>(`/finance/transactions/${id}`);
  }

  async createTransaction(transaction: any): Promise<any> {
    return apiService.post<any>('/finance/transactions', transaction);
  }

  async updateTransaction(id: string, transaction: any): Promise<any> {
    return apiService.put<any>(`/finance/transactions/${id}`, transaction);
  }

  async deleteTransaction(id: string): Promise<void> {
    return apiService.delete<void>(`/finance/transactions/${id}`);
  }

  async getReceipts(): Promise<any[]> {
    return apiService.get<any[]>('/finance/receipts');
  }

  async createReceipt(receipt: any): Promise<any> {
    return apiService.post<any>('/finance/receipts', receipt);
  }

  async getSummary(): Promise<any> {
    return apiService.get<any>('/finance/summary');
  }
}

export const financeService = new FinanceService();
export default financeService;
