// Shared types used across the application
// Keys match backend snake_case columns directly — no mapping needed

export interface ProductCategory {
  id: string;
  name: string;
  subcategories: string[];
  items?: string[];
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  hsn_code: string;
  category: string;
  subcategory?: string;
  unit: string;
  unit_price?: number;
  selling_price?: number;
  base_price?: number;
  stock?: number;
  min_stock?: number;
}

export interface FollowUp {
  id: string;
  date: string;
  scheduled_time?: string;
  note: string;
  by: string;
  status: 'upcoming' | 'completed';
  activity_type?: string;
  priority?: string;
}

export interface LeadProduct {
  id: number;
  product: string;
  category: string;
  subcategory: string;
  size: string;
  quantity: number;
  unit: string;
}

export interface Lead {
  id: string;
  lead_number: string;
  source: string;
  customer: string;
  contact: string;
  mobile: string;
  email: string;
  address: string;
  category: string;
  product: string;
  size: string;
  quantity: number;
  unit?: string;
  date?: string;
  notes?: string;
  description?: string;
  assigned_to?: string;
  status: string;
  conversion_status: string;
  products?: LeadProduct[];
  follow_ups: FollowUp[];
}

export interface OrderProduct {
  id: number;
  product: string;
  category: string;
  subcategory: string;
  size: string;
  quantity: number;
  unit: string;
  rate?: number;
  amount?: number;
}

export interface TimelineItem {
  date: string;
  event?: string;
  action?: string;
  by: string;
}

export interface Order {
  id: string;
  order_number: string;
  date: string;
  customer: string;
  contact: string;
  mobile: string;
  email: string;
  address: string;
  category: string;
  product: string;
  size: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  total_amount: number;
  discount: number;
  tax_rate: number;
  gst_amount: number;
  grand_total: number;
  status: string;
  payment_status: string;
  priority: string;
  source: string;
  assigned_to?: string;
  required_date?: string;
  converted_date?: string;
  needs_production?: string;
  sent_to_production?: boolean;
  products?: OrderProduct[];
  notes?: string;
  timeline: TimelineItem[];
}

export interface Dispatch {
  id: string;
  order_id: string;
  invoice_no?: string;
  dispatch_type?: string;
  customer: string;
  contact?: string;
  product?: string;
  items?: string;
  quantity?: string;
  lr_number?: string | null;
  transporter?: string | null;
  vehicle_no?: string | null;
  driver_name?: string;
  driver_phone?: string;
  dispatch_date?: string | null;
  expected_delivery?: string | null;
  delivered_date?: string | null;
  status: string;
  address: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_name: string;
  vendor_contact: string;
  vendor_email?: string;
  vendor_address?: string;
  vendor_gst?: string;
  items: PurchaseOrderItem[] | string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: string;
  date: string;
  expected_delivery: string;
  is_gst: boolean;
  created_by: string;
  notes?: string;
  payment_terms?: string;
}

export interface PurchaseOrderItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  reference: string;
  status: string;
}

export interface StageInfo {
  id: number;
  name: string;
  description: string;
  status: 'completed' | 'in-progress' | 'pending';
  start_date?: string;
  completed_date?: string;
  assigned_to?: string;
}

export interface ProductionOrder {
  id: string;
  order_id: string;
  customer: string;
  product: string;
  size: string;
  quantity: number;
  current_stage: number;
  priority: string;
  assigned_to: string;
  start_date: string;
  target_date: string;
  progress: number;
  delay_risk: boolean;
  status: string;
}

export interface User {
  name: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  password?: string;
}

export interface BillItem {
  id: number;
  product: string;
  category?: string;
  subcategory?: string;
  size?: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface OrderForBilling {
  order_id?: string | number;
  order_number: string;
  customer: string;
  contact: string;
  mobile: string;
  email: string;
  address: string;
  products: BillItem[];
  subtotal: number;
  discount: number;
  tax_rate: number;
  gst_amount: number;
  grand_total: number;
}

export interface OrderForProduction {
  order_id?: string;
  order_number: string;
  customer: string;
  product: string;
  size: string;
  quantity: number;
  priority: string;
  required_date?: string;
  notes?: string;
}

export interface BillForDispatch {
  bill_no: string;
  order_id?: string | number;
  order_number: string;
  client_name: string;
  client_address: string;
  items: { name: string; quantity: number }[];
  grand_total: number;
}

// Billing types
export interface BillingClient {
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

// Client management types
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

// Finance types
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

// Sales types
export interface SalesFollowup {
  id: string;
  client_name: string;
  client_contact: string;
  last_contact: string;
  next_followup: string;
  status: 'hot' | 'warm' | 'cold';
  sales_person: string;
  notes: string;
  potential_value: number;
}

export interface SalesTarget {
  id: string;
  sales_person: string;
  month: string;
  target: number;
  achieved: number;
  percentage: number;
}

export interface SalesStaffProductivity {
  id: string;
  name: string;
  email: string;
  phone: string;
  login_time: string;
  logout_time: string | null;
  status: 'online' | 'offline' | 'break';
  today_calls: number;
  today_meetings: number;
  today_sales: number;
  today_revenue: number;
  weekly_target: number;
  weekly_achieved: number;
  monthly_target: number;
  monthly_achieved: number;
  rating: number;
  conversion_rate: number;
  avg_response_time: string;
}

export interface LeadSale {
  id: string;
  lead_number: string;
  converted_date: string;
  client_name: string;
  client_contact: string;
  client_email: string;
  client_address: string;
  source: string;
  products: { product: string; size: string; quantity: number }[];
  total_amount: number;
  status: 'pending' | 'in-production' | 'completed' | 'delivered';
  payment_status: 'unpaid' | 'partial' | 'paid';
  assigned_to: string;
  converted_by: string;
  notes?: string;
}

export interface Sale {
  id: string;
  date: string;
  client_name: string;
  client_contact: string;
  product_details: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  payment_status: 'unpaid' | 'partial' | 'paid';
  sales_person: string;
  notes?: string;
}

// Vendor types
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
