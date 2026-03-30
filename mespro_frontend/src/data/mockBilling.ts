// Mock data for BillingManagement

import { Bill } from '../types';

export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstNo?: string;
}

export interface StockItem {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  sku: string;
  currentStock: number;
  unit: string;
  unitPrice: number;
}

export interface Payment {
  id: string;
  billId: string;
  billNo: string;
  clientName: string;
  date: string;
  amount: number;
  method: 'cash' | 'upi' | 'card' | 'bank';
  reference?: string;
  receivedBy: string;
  notes?: string;
}

export const initialStockItems: StockItem[] = [
    { id: 'STK-001', name: 'Marker Pens (Black)', category: 'Accessories', subcategory: 'Writing', sku: 'ACC-MRK-BLK-001', currentStock: 450, unit: 'pieces', unitPrice: 25 },
    { id: 'STK-002', name: 'Duster Cloth', category: 'Accessories', subcategory: 'Cleaning', sku: 'ACC-DST-001', currentStock: 180, unit: 'pieces', unitPrice: 15 },
    { id: 'STK-003', name: 'Mounting Screws Kit', category: 'Hardware', subcategory: 'Fasteners', sku: 'HRD-SCR-KIT-001', currentStock: 95, unit: 'kits', unitPrice: 45 },
    { id: 'STK-004', name: 'Wall Mounting Brackets', category: 'Hardware', subcategory: 'Mounting', sku: 'HRD-BRK-001', currentStock: 320, unit: 'pieces', unitPrice: 65 },
    { id: 'STK-005', name: 'White Board 4x6ft', category: 'Products', subcategory: 'White Boards', sku: 'PRD-WB-4X6', currentStock: 50, unit: 'pieces', unitPrice: 7000 },
    { id: 'STK-006', name: 'White Board 5x8ft', category: 'Products', subcategory: 'White Boards', sku: 'PRD-WB-5X8', currentStock: 35, unit: 'pieces', unitPrice: 9000 },
    { id: 'STK-007', name: 'Black Board 3x4ft', category: 'Products', subcategory: 'Black Boards', sku: 'PRD-BB-3X4', currentStock: 40, unit: 'pieces', unitPrice: 6500 },
    { id: 'STK-008', name: 'Green Board 4x6ft', category: 'Products', subcategory: 'Green Boards', sku: 'PRD-GB-4X6', currentStock: 25, unit: 'pieces', unitPrice: 7500 },
  ];

export const initialClients: Client[] = [
    { id: 'CLT-001', name: 'ABC School', contactPerson: 'Mr. Ramesh Verma', phone: '+91 98765 43210', email: 'ramesh@abcschool.edu', address: 'Sector 15, Delhi', gstNo: '07AABCA1234D1ZD' },
    { id: 'CLT-002', name: 'XYZ Office Solutions', contactPerson: 'Ms. Priya Kapoor', phone: '+91 98765 43211', email: 'priya@xyzoffice.com', address: 'Noida Sector 62', gstNo: '09AABCX5678E1ZE' },
    { id: 'CLT-003', name: 'LMN College', contactPerson: 'Dr. Suresh Patel', phone: '+91 98765 43212', email: 'suresh@lmncollege.edu', address: 'Gurgaon Phase 3', gstNo: '06AABCL9012F1ZF' },
    { id: 'CLT-004', name: 'PQR Hospital', contactPerson: 'Mr. Anil Kumar', phone: '+91 98765 43213', email: 'anil@pqrhospital.com', address: 'South Delhi', gstNo: '07AABCP3456G1ZG' },
    { id: 'CLT-005', name: 'Modern Tech Corp', contactPerson: 'Ms. Sneha Malhotra', phone: '+91 98765 43214', email: 'sneha@moderntech.com', address: 'Cyber City, Gurgaon', gstNo: '06AABCM7890H1ZH' },
  ];

export const initialBills: Bill[] = [
    {
      id: 'BILL-001',
      billNo: 'INV-2024-001',
      date: '2024-12-01',
      clientId: 'CLT-001',
      clientName: 'ABC School',
      clientAddress: 'Sector 15, Delhi',
      clientGST: '07AABCA1234D1ZD',
      items: [
        { itemId: 'STK-005', name: 'White Board 4x6ft', quantity: 10, unitPrice: 7000, discount: 5, tax: 18, total: 78470 },
        { itemId: 'STK-001', name: 'Marker Pens (Black)', quantity: 50, unitPrice: 25, discount: 0, tax: 18, total: 1475 },
      ],
      subtotal: 71250,
      totalDiscount: 3500,
      totalTax: 12195,
      grandTotal: 79945,
      paymentStatus: 'paid',
      paymentType: 'cash',
      paymentMethod: 'bank',
      paidAmount: 79945,
      dueDate: '2024-12-15',
      createdBy: 'Admin',
      gst: 18,
    },
    {
      id: 'BILL-002',
      billNo: 'INV-2024-002',
      date: '2024-12-03',
      clientId: 'CLT-003',
      clientName: 'LMN College',
      clientAddress: 'Gurgaon Phase 3',
      clientGST: '06AABCL9012F1ZF',
      items: [
        { itemId: 'STK-006', name: 'White Board 5x8ft', quantity: 15, unitPrice: 9000, discount: 10, tax: 18, total: 143370 },
        { itemId: 'STK-004', name: 'Wall Mounting Brackets', quantity: 15, unitPrice: 65, discount: 0, tax: 18, total: 1150 },
      ],
      subtotal: 135975,
      totalDiscount: 13500,
      totalTax: 22045,
      grandTotal: 144520,
      paymentStatus: 'partial',
      paymentType: 'credit',
      paymentMethod: 'bank',
      paidAmount: 100000,
      dueDate: '2024-12-20',
      createdBy: 'Admin',
      gst: 18,
    },
    {
      id: 'BILL-003',
      billNo: 'INV-2024-003',
      date: '2024-12-05',
      clientId: 'CLT-002',
      clientName: 'XYZ Office Solutions',
      clientAddress: 'Noida Sector 62',
      clientGST: '09AABCX5678E1ZE',
      items: [
        { itemId: 'STK-007', name: 'Black Board 3x4ft', quantity: 8, unitPrice: 6500, discount: 0, tax: 18, total: 61360 },
      ],
      subtotal: 52000,
      totalDiscount: 0,
      totalTax: 9360,
      grandTotal: 61360,
      paymentStatus: 'pending',
      paymentType: 'cash',
      paidAmount: 0,
      dueDate: '2024-12-25',
      createdBy: 'Admin',
      gst: 18,
    },
    {
      id: 'BILL-004',
      billNo: 'INV-2024-004',
      date: '2024-12-08',
      clientId: 'CLT-004',
      clientName: 'PQR Hospital',
      clientAddress: 'South Delhi',
      clientGST: '07AABCP3456G1ZG',
      items: [
        { itemId: 'STK-005', name: 'White Board 4x6ft', quantity: 20, unitPrice: 7000, discount: 8, tax: 18, total: 152096 },
        { itemId: 'STK-003', name: 'Board Duster Set', quantity: 20, unitPrice: 150, discount: 0, tax: 18, total: 3540 },
        { itemId: 'STK-001', name: 'Marker Pens (Black)', quantity: 100, unitPrice: 25, discount: 5, tax: 18, total: 2803 },
      ],
      subtotal: 143000,
      totalDiscount: 11440,
      totalTax: 23679,
      grandTotal: 158439,
      paymentStatus: 'paid',
      paymentType: 'cash',
      paymentMethod: 'upi',
      paidAmount: 158439,
      dueDate: '2024-12-22',
      createdBy: 'Admin',
      gst: 18,
    },
    {
      id: 'BILL-005',
      billNo: 'INV-2024-005',
      date: '2024-12-10',
      clientId: 'CLT-005',
      clientName: 'Modern Tech Corp',
      clientAddress: 'Cyber City, Gurgaon',
      clientGST: '06AABCM7890H1ZH',
      items: [
        { itemId: 'STK-006', name: 'White Board 5x8ft', quantity: 5, unitPrice: 9000, discount: 5, tax: 18, total: 50445 },
        { itemId: 'STK-004', name: 'Wall Mounting Brackets', quantity: 5, unitPrice: 65, discount: 0, tax: 18, total: 384 },
      ],
      subtotal: 45325,
      totalDiscount: 2250,
      totalTax: 7754,
      grandTotal: 50829,
      paymentStatus: 'overdue',
      paymentType: 'credit',
      paidAmount: 0,
      dueDate: '2024-12-01',
      createdBy: 'Admin',
      gst: 18,
    },
    {
      id: 'BILL-006',
      billNo: 'INV-2024-006',
      date: '2024-12-12',
      clientId: 'CLT-001',
      clientName: 'ABC School',
      clientAddress: 'Sector 15, Delhi',
      clientGST: '07AABCA1234D1ZD',
      items: [
        { itemId: 'STK-007', name: 'Black Board 3x4ft', quantity: 12, unitPrice: 6500, discount: 10, tax: 18, total: 82836 },
        { itemId: 'STK-002', name: 'Chalk Box (100pcs)', quantity: 24, unitPrice: 120, discount: 0, tax: 18, total: 3398 },
      ],
      subtotal: 80880,
      totalDiscount: 7800,
      totalTax: 13154,
      grandTotal: 86234,
      paymentStatus: 'partial',
      paymentType: 'credit',
      paymentMethod: 'bank',
      paidAmount: 50000,
      dueDate: '2024-12-28',
      createdBy: 'Admin',
      gst: 18,
    },
    {
      id: 'BILL-007',
      billNo: 'INV-2024-007',
      date: '2024-12-15',
      clientId: 'CLT-003',
      clientName: 'LMN College',
      clientAddress: 'Gurgaon Phase 3',
      items: [
        { itemId: 'STK-005', name: 'White Board 4x6ft', quantity: 8, unitPrice: 7000, discount: 0, tax: 0, total: 56000 },
        { itemId: 'STK-001', name: 'Marker Pens (Black)', quantity: 40, unitPrice: 25, discount: 0, tax: 0, total: 1000 },
      ],
      subtotal: 57000,
      totalDiscount: 0,
      totalTax: 0,
      grandTotal: 57000,
      paymentStatus: 'paid',
      paymentType: 'cash',
      paymentMethod: 'cash',
      paidAmount: 57000,
      dueDate: '2024-12-15',
      createdBy: 'Admin',
      gst: 0,
    },
    {
      id: 'BILL-008',
      billNo: 'INV-2024-008',
      date: '2024-12-18',
      clientId: 'CLT-002',
      clientName: 'XYZ Office Solutions',
      clientAddress: 'Noida Sector 62',
      items: [
        { itemId: 'STK-006', name: 'White Board 5x8ft', quantity: 3, unitPrice: 9000, discount: 0, tax: 0, total: 27000 },
        { itemId: 'STK-003', name: 'Board Duster Set', quantity: 6, unitPrice: 150, discount: 0, tax: 0, total: 900 },
      ],
      subtotal: 27900,
      totalDiscount: 0,
      totalTax: 0,
      grandTotal: 27900,
      paymentStatus: 'pending',
      paymentType: 'cash',
      paidAmount: 0,
      dueDate: '2024-12-30',
      createdBy: 'Admin',
      gst: 0,
    },
  ];

export const initialPayments: Payment[] = [
    { id: 'PAY-001', billId: 'BILL-001', billNo: 'INV-2024-001', clientName: 'ABC School', date: '2024-12-05', amount: 79945, method: 'bank', reference: 'NEFT-123456', receivedBy: 'Admin' },
    { id: 'PAY-002', billId: 'BILL-002', billNo: 'INV-2024-002', clientName: 'LMN College', date: '2024-12-08', amount: 100000, method: 'bank', reference: 'NEFT-789012', receivedBy: 'Admin' },
    { id: 'PAY-003', billId: 'BILL-004', billNo: 'INV-2024-004', clientName: 'PQR Hospital', date: '2024-12-10', amount: 158439, method: 'upi', reference: 'UPI-456789', receivedBy: 'Admin' },
    { id: 'PAY-004', billId: 'BILL-006', billNo: 'INV-2024-006', clientName: 'ABC School', date: '2024-12-14', amount: 50000, method: 'bank', reference: 'NEFT-345678', receivedBy: 'Admin' },
    { id: 'PAY-005', billId: 'BILL-007', billNo: 'INV-2024-007', clientName: 'LMN College', date: '2024-12-15', amount: 57000, method: 'cash', reference: 'CASH-001', receivedBy: 'Admin' },
  ];

