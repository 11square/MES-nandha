// Mock data for FinanceManagement

import { Transaction } from '../types';

export interface CashReceipt {
    id: string;
    bill_id: string;
    bill_no: string;
    client_name: string;
    date: string;
    amount: number;
    method: 'cash' | 'upi' | 'card' | 'bank';
    reference?: string;
    received_by: string;
    notes?: string;
  }

export const initialTransactions: Transaction[] = [
    {
      id: 'TXN-001',
      date: '2024-12-06',
      type: 'income',
      category: 'Product Sale',
      description: 'Payment received for Order #ORD-2024-004',
      amount: 95000,
      payment_method: 'Bank Transfer',
      reference: 'REF-BT-001234',
      status: 'completed'
    },
    {
      id: 'TXN-002',
      date: '2024-12-05',
      type: 'expense',
      category: 'Raw Materials',
      description: 'MDF boards purchase - 500 units',
      amount: 45000,
      payment_method: 'Cash',
      reference: 'PO-2024-156',
      status: 'completed'
    },
    {
      id: 'TXN-003',
      date: '2024-12-04',
      type: 'income',
      category: 'Partial Payment',
      description: 'Advance payment for Order #ORD-2024-001',
      amount: 50000,
      payment_method: 'Cheque',
      reference: 'CHQ-789456',
      status: 'pending'
    },
    {
      id: 'TXN-004',
      date: '2024-12-03',
      type: 'expense',
      category: 'Utilities',
      description: 'Electricity bill - November 2024',
      amount: 12500,
      payment_method: 'Online',
      reference: 'UTIL-NOV-2024',
      status: 'completed'
    },
    {
      id: 'TXN-005',
      date: '2024-12-02',
      type: 'expense',
      category: 'Salary',
      description: 'Monthly payroll - November 2024',
      amount: 185000,
      payment_method: 'Bank Transfer',
      reference: 'PAYROLL-NOV-2024',
      status: 'completed'
    }
  ];

export const initialReceipts: CashReceipt[] = [
    { id: 'PAY-001', bill_id: 'BILL-001', bill_no: 'INV-2024-001', client_name: 'ABC School', date: '2024-12-05', amount: 79945, method: 'bank', reference: 'NEFT-123456', received_by: 'Admin' },
    { id: 'PAY-002', bill_id: 'BILL-002', bill_no: 'INV-2024-002', client_name: 'LMN College', date: '2024-12-08', amount: 100000, method: 'bank', reference: 'NEFT-789012', received_by: 'Admin' },
    { id: 'PAY-003', bill_id: 'BILL-004', bill_no: 'INV-2024-004', client_name: 'PQR Hospital', date: '2024-12-10', amount: 158439, method: 'upi', reference: 'UPI-456789', received_by: 'Admin' },
    { id: 'PAY-004', bill_id: 'BILL-006', bill_no: 'INV-2024-006', client_name: 'ABC School', date: '2024-12-14', amount: 50000, method: 'bank', reference: 'NEFT-345678', received_by: 'Admin' },
    { id: 'PAY-005', bill_id: 'BILL-007', bill_no: 'INV-2024-007', client_name: 'LMN College', date: '2024-12-15', amount: 57000, method: 'cash', reference: 'CASH-001', received_by: 'Admin' },
  ];

