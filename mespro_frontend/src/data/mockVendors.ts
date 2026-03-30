// Mock data for VendorManagement


export interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  gstNumber?: string;
  totalPurchases: number;
  totalAmount: number;
  outstandingAmount: number;
  lastPurchaseDate: string;
  status: 'Active' | 'Inactive';
}

export const initialVendors: Vendor[] = [
    {
      id: 'VEN-001',
      name: 'ABC Suppliers Ltd.',
      contactPerson: 'Mr. Rajesh Kumar',
      email: 'rajesh@abcsuppliers.com',
      phone: '+91 98765 43210',
      address: 'Plot No. 45, Industrial Area, Phase 2, Delhi - 110020',
      category: 'Raw Materials',
      gstNumber: '07AABCU9603R1Z5',
      totalPurchases: 45,
      totalAmount: 2500000,
      outstandingAmount: 150000,
      lastPurchaseDate: '2024-12-20',
      status: 'Active'
    },
    {
      id: 'VEN-002',
      name: 'XYZ Equipment Co.',
      contactPerson: 'Ms. Priya Sharma',
      email: 'priya@xyzequipment.com',
      phone: '+91 98765 43211',
      address: 'Sector 18, Noida, UP - 201301',
      category: 'Equipment',
      gstNumber: '09AABCX1234P1Z6',
      totalPurchases: 28,
      totalAmount: 1800000,
      outstandingAmount: 0,
      lastPurchaseDate: '2024-12-15',
      status: 'Active'
    },
    {
      id: 'VEN-003',
      name: 'Modern Services Pvt. Ltd.',
      contactPerson: 'Mr. Amit Patel',
      email: 'amit@modernservices.com',
      phone: '+91 98765 43212',
      address: 'Gurgaon Cyber Hub, Haryana - 122002',
      category: 'Services',
      gstNumber: '06AABCM5678Q1Z7',
      totalPurchases: 12,
      totalAmount: 650000,
      outstandingAmount: 50000,
      lastPurchaseDate: '2024-12-10',
      status: 'Active'
    },
  ];

