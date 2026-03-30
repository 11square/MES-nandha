// Mock data for ClientManagement


export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  totalOrders: number;
  totalValue: number;
  status: string;
  lastOrder: string;
  joinDate: string;
  rating: 1 | 2 | 3;
}

export const initialClientsData: Client[] = [
    { 
      id: 'CLT-001',
      name: 'ABC School',
      contactPerson: 'Mr. Ramesh Verma',
      phone: '+91 98765 43210',
      email: 'ramesh@abcschool.edu',
      address: 'Sector 15, Delhi',
      totalOrders: 24,
      totalValue: 1250000,
      status: 'Active',
      lastOrder: '2024-11-28',
      joinDate: '2022-03-15',
      rating: 2
    },
    { 
      id: 'CLT-002',
      name: 'XYZ Office Solutions',
      contactPerson: 'Ms. Priya Kapoor',
      phone: '+91 98765 43211',
      email: 'priya@xyzoffice.com',
      address: 'Noida Sector 62',
      totalOrders: 18,
      totalValue: 890000,
      status: 'Active',
      lastOrder: '2024-12-02',
      joinDate: '2021-08-20',
      rating: 1
    },
    { 
      id: 'CLT-003',
      name: 'LMN College',
      contactPerson: 'Dr. Suresh Patel',
      phone: '+91 98765 43212',
      email: 'suresh@lmncollege.edu',
      address: 'Gurgaon Phase 3',
      totalOrders: 32,
      totalValue: 1650000,
      status: 'Active',
      lastOrder: '2024-12-05',
      joinDate: '2020-11-10',
      rating: 3
    },
    { 
      id: 'CLT-004',
      name: 'PQR Hospital',
      contactPerson: 'Mr. Anil Kumar',
      phone: '+91 98765 43213',
      email: 'anil@pqrhospital.com',
      address: 'South Delhi',
      totalOrders: 15,
      totalValue: 720000,
      status: 'Active',
      lastOrder: '2024-11-15',
      joinDate: '2023-01-05',
      rating: 1
    },
    { 
      id: 'CLT-005',
      name: 'Modern Tech Corp',
      contactPerson: 'Ms. Sneha Malhotra',
      phone: '+91 98765 43214',
      email: 'sneha@moderntech.com',
      address: 'Cyber City, Gurgaon',
      totalOrders: 42,
      totalValue: 2100000,
      status: 'Active',
      lastOrder: '2024-12-01',
      joinDate: '2019-06-22',
      rating: 3
    },
  ];

export const salesHistory = [
    { orderId: 'ORD-2024-001', date: '2024-11-28', product: 'White Board 4x6ft', quantity: 12, amount: 84000, status: 'Completed' },
    { orderId: 'ORD-2024-045', date: '2024-10-15', product: 'Black Board 3x4ft', quantity: 8, amount: 52000, status: 'Completed' },
    { orderId: 'ORD-2024-087', date: '2024-09-20', product: 'White Board 5x8ft', quantity: 15, amount: 135000, status: 'Completed' },
    { orderId: 'ORD-2023-234', date: '2023-12-10', product: 'Custom Board', quantity: 20, amount: 180000, status: 'Completed' },
  ];

export const allClientSales = [
    { orderId: 'ORD-2024-001', clientId: 'CLT-001', clientName: 'ABC School', date: '2024-11-28', product: 'White Board 4x6ft', quantity: 12, amount: 84000, status: 'Completed' },
    { orderId: 'ORD-2024-002', clientId: 'CLT-002', clientName: 'XYZ Office Solutions', date: '2024-12-02', product: 'Green Board 4x6ft', quantity: 6, amount: 45000, status: 'Completed' },
    { orderId: 'ORD-2024-003', clientId: 'CLT-003', clientName: 'LMN College', date: '2024-12-05', product: 'White Board 5x8ft', quantity: 20, amount: 180000, status: 'Completed' },
    { orderId: 'ORD-2024-004', clientId: 'CLT-004', clientName: 'PQR Hospital', date: '2024-11-20', product: 'Black Board 3x4ft', quantity: 10, amount: 65000, status: 'Completed' },
    { orderId: 'ORD-2024-005', clientId: 'CLT-005', clientName: 'Modern Tech Corp', date: '2024-12-08', product: 'Custom Board', quantity: 15, amount: 210000, status: 'In Progress' },
    { orderId: 'ORD-2024-006', clientId: 'CLT-001', clientName: 'ABC School', date: '2024-10-15', product: 'Black Board 3x4ft', quantity: 8, amount: 52000, status: 'Completed' },
    { orderId: 'ORD-2024-007', clientId: 'CLT-003', clientName: 'LMN College', date: '2024-09-20', product: 'White Board 5x8ft', quantity: 15, amount: 135000, status: 'Completed' },
    { orderId: 'ORD-2024-008', clientId: 'CLT-002', clientName: 'XYZ Office Solutions', date: '2024-11-10', product: 'Marker Pens Set', quantity: 50, amount: 12500, status: 'Completed' },
    { orderId: 'ORD-2024-009', clientId: 'CLT-004', clientName: 'PQR Hospital', date: '2024-12-01', product: 'White Board 4x6ft', quantity: 8, amount: 56000, status: 'Completed' },
    { orderId: 'ORD-2024-010', clientId: 'CLT-005', clientName: 'Modern Tech Corp', date: '2024-10-25', product: 'Green Board 4x6ft', quantity: 12, amount: 90000, status: 'Completed' },
  ];

export const allClientPayments = [
    { paymentId: 'PAY-2024-001', clientId: 'CLT-001', clientName: 'ABC School', date: '2024-12-05', billNo: 'INV-2024-001', amount: 79945, method: 'Bank Transfer', reference: 'NEFT-123456', status: 'Received' },
    { paymentId: 'PAY-2024-002', clientId: 'CLT-003', clientName: 'LMN College', date: '2024-12-08', billNo: 'INV-2024-002', amount: 100000, method: 'Bank Transfer', reference: 'NEFT-789012', status: 'Received' },
    { paymentId: 'PAY-2024-003', clientId: 'CLT-002', clientName: 'XYZ Office Solutions', date: '2024-11-15', billNo: 'INV-2024-003', amount: 45000, method: 'UPI', reference: 'UPI-345678', status: 'Received' },
    { paymentId: 'PAY-2024-004', clientId: 'CLT-004', clientName: 'PQR Hospital', date: '2024-11-25', billNo: 'INV-2024-006', amount: 50000, method: 'Cheque', reference: 'CHQ-901234', status: 'Received' },
    { paymentId: 'PAY-2024-005', clientId: 'CLT-005', clientName: 'Modern Tech Corp', date: '2024-12-10', billNo: 'INV-2024-007', amount: 100000, method: 'Bank Transfer', reference: 'NEFT-567890', status: 'Received' },
    { paymentId: 'PAY-2024-006', clientId: 'CLT-001', clientName: 'ABC School', date: '2024-11-20', billNo: 'INV-2024-004', amount: 30000, method: 'Cash', reference: 'CASH-001', status: 'Received' },
    { paymentId: 'PAY-2024-007', clientId: 'CLT-003', clientName: 'LMN College', date: '2024-10-05', billNo: 'INV-2024-005', amount: 85000, method: 'Bank Transfer', reference: 'NEFT-234567', status: 'Received' },
    { paymentId: 'PAY-2024-008', clientId: 'CLT-002', clientName: 'XYZ Office Solutions', date: '2024-12-01', billNo: 'INV-2024-008', amount: 12500, method: 'UPI', reference: 'UPI-678901', status: 'Received' },
  ];

export const clientFollowups = [
    { id: 'FU-001', date: '2024-12-10', type: 'Call', subject: 'New Order Discussion', notes: 'Interested in 20 white boards for new campus', priority: 'High', status: 'Scheduled' },
    { id: 'FU-002', date: '2024-11-25', type: 'Email', subject: 'Quote Request Follow-up', notes: 'Sent quote for bulk order, awaiting response', priority: 'Medium', status: 'Completed' },
    { id: 'FU-003', date: '2024-11-15', type: 'Meeting', subject: 'Delivery Feedback', notes: 'Discussed recent delivery and quality', priority: 'Low', status: 'Completed' },
  ];

export const creditOutstandings = [
    { 
      id: 'BILL-002', 
      billNo: 'INV-2024-002', 
      clientId: 'CLT-003',
      clientName: 'LMN College', 
      date: '2024-12-03', 
      grandTotal: 144520, 
      paidAmount: 100000, 
      balance: 44520,
      dueDate: '2024-12-20',
      daysOverdue: 0,
      status: 'partial'
    },
    { 
      id: 'BILL-004', 
      billNo: 'INV-2024-004', 
      clientId: 'CLT-001',
      clientName: 'ABC School', 
      date: '2024-11-15', 
      grandTotal: 95000, 
      paidAmount: 30000, 
      balance: 65000,
      dueDate: '2024-12-01',
      daysOverdue: 14,
      status: 'overdue'
    },
    { 
      id: 'BILL-005', 
      billNo: 'INV-2024-005', 
      clientId: 'CLT-002',
      clientName: 'XYZ Office Solutions', 
      date: '2024-12-05', 
      grandTotal: 78500, 
      paidAmount: 0, 
      balance: 78500,
      dueDate: '2024-12-25',
      daysOverdue: 0,
      status: 'pending'
    },
    { 
      id: 'BILL-006', 
      billNo: 'INV-2024-006', 
      clientId: 'CLT-004',
      clientName: 'PQR Hospital', 
      date: '2024-11-20', 
      grandTotal: 125000, 
      paidAmount: 50000, 
      balance: 75000,
      dueDate: '2024-12-10',
      daysOverdue: 5,
      status: 'overdue'
    },
    { 
      id: 'BILL-007', 
      billNo: 'INV-2024-007', 
      clientId: 'CLT-005',
      clientName: 'Modern Tech Corp', 
      date: '2024-12-08', 
      grandTotal: 210000, 
      paidAmount: 100000, 
      balance: 110000,
      dueDate: '2024-12-30',
      daysOverdue: 0,
      status: 'partial'
    },
  ];

