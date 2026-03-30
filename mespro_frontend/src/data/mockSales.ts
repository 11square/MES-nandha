// Mock data for SalesManagement


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

export const initialSales: Sale[] = [
    {
      id: 'SAL-001',
      date: '2024-12-01',
      client_name: 'ABC Corporation',
      client_contact: '+91 98765 43210',
      product_details: 'White Board 4x6ft',
      quantity: 10,
      unit_price: 5500,
      total_amount: 55000,
      status: 'confirmed',
      payment_status: 'paid',
      sales_person: 'Rajesh Kumar',
    },
    {
      id: 'SAL-002',
      date: '2024-12-03',
      client_name: 'XYZ School',
      client_contact: '+91 98765 43211',
      product_details: 'Black Board 3x4ft',
      quantity: 15,
      unit_price: 3500,
      total_amount: 52500,
      status: 'pending',
      payment_status: 'unpaid',
      sales_person: 'Priya Sharma',
    },
    {
      id: 'SAL-003',
      date: '2024-12-04',
      client_name: 'Modern Office',
      client_contact: '+91 98765 43212',
      product_details: 'White Board 5x8ft',
      quantity: 8,
      unit_price: 7500,
      total_amount: 60000,
      status: 'delivered',
      payment_status: 'partial',
      sales_person: 'Amit Patel',
    },
  ];

export const initialLeadSales: LeadSale[] = [
    {
      id: 'LS-001',
      lead_number: 'LEAD-2024-004',
      converted_date: '2024-11-12',
      client_name: 'ABC Corporation',
      client_contact: '+91 98765 43213',
      client_email: 'emma@abccorp.com',
      client_address: '321 Corporate Rd, Delhi',
      source: 'Walk-in',
      products: [
        { product: 'White Board', size: '4x6 ft', quantity: 15 },
        { product: 'Notice Board', size: '3x4 ft', quantity: 8 },
        { product: 'Office Supplies', size: 'Assorted', quantity: 50 }
      ],
      total_amount: 187500,
      status: 'completed',
      payment_status: 'paid',
      assigned_to: 'Mike Johnson',
      converted_by: 'Sarah Smith',
      notes: 'Large corporate order for new office setup',
    },
    {
      id: 'LS-002',
      lead_number: 'LEAD-2024-001',
      converted_date: '2024-11-20',
      client_name: 'Modern School',
      client_contact: '+91 98765 43210',
      client_email: 'john@modernschool.com',
      client_address: '123 Education St, Mumbai',
      source: 'Website',
      products: [
        { product: 'White Board', size: '4x6 ft', quantity: 10 },
        { product: 'Black Board', size: '4x4 ft', quantity: 5 }
      ],
      total_amount: 85000,
      status: 'in-production',
      payment_status: 'partial',
      assigned_to: 'Mike Johnson',
      converted_by: 'Admin',
      notes: 'School reopening order - 50% advance received',
    },
    {
      id: 'LS-003',
      lead_number: 'LEAD-2024-006',
      converted_date: '2024-11-25',
      client_name: 'Tech Solutions Pvt Ltd',
      client_contact: '+91 98765 43220',
      client_email: 'procurement@techsolutions.com',
      client_address: '789 Tech Park, Bangalore',
      source: 'Referral',
      products: [
        { product: 'White Board', size: '5x8 ft', quantity: 20 },
        { product: 'Glass Board', size: '4x6 ft', quantity: 10 }
      ],
      total_amount: 325000,
      status: 'pending',
      payment_status: 'unpaid',
      assigned_to: 'Priya Sharma',
      converted_by: 'Rajesh Kumar',
      notes: 'Large IT company order - awaiting PO confirmation',
    },
    {
      id: 'LS-004',
      lead_number: 'LEAD-2024-008',
      converted_date: '2024-12-01',
      client_name: 'City Hospital',
      client_contact: '+91 98765 43212',
      client_email: 'david@cityhospital.com',
      client_address: '789 Health Ave, Bangalore',
      source: 'Google Ads',
      products: [
        { product: 'Custom Board', size: '5x8 ft', quantity: 8 }
      ],
      total_amount: 112000,
      status: 'delivered',
      payment_status: 'paid',
      assigned_to: 'Mike Johnson',
      converted_by: 'Sarah Smith',
      notes: 'Custom size with special mica - Delivered successfully',
    },
    {
      id: 'LS-005',
      lead_number: 'LEAD-2024-010',
      converted_date: '2024-12-05',
      client_name: 'Global Institute',
      client_contact: '+91 98765 43225',
      client_email: 'kumar@globalinstitute.com',
      client_address: '100 Knowledge Park, Hyderabad',
      source: 'Exhibition',
      products: [
        { product: 'White Board', size: '4x6 ft', quantity: 25 },
        { product: 'Notice Board', size: '3x4 ft', quantity: 15 },
        { product: 'Marker Pens', size: 'Pack of 10', quantity: 100 }
      ],
      total_amount: 275000,
      status: 'in-production',
      payment_status: 'partial',
      assigned_to: 'Amit Patel',
      converted_by: 'Admin',
      notes: 'Large order for new campus building - 30% advance',
    },
  ];

export const initialTargets: SalesTarget[] = [
    {
      id: 'TGT-001',
      sales_person: 'Rajesh Kumar',
      month: 'December 2024',
      target: 500000,
      achieved: 355000,
      percentage: 71,
    },
    {
      id: 'TGT-002',
      sales_person: 'Priya Sharma',
      month: 'December 2024',
      target: 400000,
      achieved: 252500,
      percentage: 63,
    },
    {
      id: 'TGT-003',
      sales_person: 'Amit Patel',
      month: 'December 2024',
      target: 450000,
      achieved: 360000,
      percentage: 80,
    },
  ];

export const initialStaffProductivity: SalesStaffProductivity[] = [
    {
      id: 'SP-001',
      name: 'Rajesh Kumar',
      email: 'rajesh@mespro.com',
      phone: '+91 98765 43210',
      login_time: '09:00 AM',
      logout_time: null,
      status: 'online',
      today_calls: 24,
      today_meetings: 3,
      today_sales: 2,
      today_revenue: 55000,
      weekly_target: 125000,
      weekly_achieved: 98000,
      monthly_target: 500000,
      monthly_achieved: 355000,
      rating: 4.5,
      conversion_rate: 32,
      avg_response_time: '15 mins',
    },
    {
      id: 'SP-002',
      name: 'Priya Sharma',
      email: 'priya@mespro.com',
      phone: '+91 98765 43211',
      login_time: '09:15 AM',
      logout_time: null,
      status: 'online',
      today_calls: 18,
      today_meetings: 2,
      today_sales: 1,
      today_revenue: 52500,
      weekly_target: 100000,
      weekly_achieved: 72000,
      monthly_target: 400000,
      monthly_achieved: 252500,
      rating: 4.2,
      conversion_rate: 28,
      avg_response_time: '20 mins',
    },
    {
      id: 'SP-003',
      name: 'Amit Patel',
      email: 'amit@mespro.com',
      phone: '+91 98765 43212',
      login_time: '08:45 AM',
      logout_time: null,
      status: 'break',
      today_calls: 22,
      today_meetings: 4,
      today_sales: 3,
      today_revenue: 60000,
      weekly_target: 112500,
      weekly_achieved: 105000,
      monthly_target: 450000,
      monthly_achieved: 360000,
      rating: 4.8,
      conversion_rate: 38,
      avg_response_time: '12 mins',
    },
    {
      id: 'SP-004',
      name: 'Sneha Reddy',
      email: 'sneha@mespro.com',
      phone: '+91 98765 43213',
      login_time: '09:30 AM',
      logout_time: '06:30 PM',
      status: 'offline',
      today_calls: 15,
      today_meetings: 1,
      today_sales: 0,
      today_revenue: 0,
      weekly_target: 80000,
      weekly_achieved: 45000,
      monthly_target: 320000,
      monthly_achieved: 180000,
      rating: 3.8,
      conversion_rate: 22,
      avg_response_time: '25 mins',
    },
  ];

export const initialFollowups: SalesFollowup[] = [
    {
      id: 'FU-001',
      client_name: 'Tech Solutions Ltd',
      client_contact: '+91 98765 43213',
      last_contact: '2024-12-01',
      next_followup: '2024-12-08',
      status: 'hot',
      sales_person: 'Rajesh Kumar',
      notes: 'Interested in bulk order, awaiting budget approval',
      potential_value: 150000,
    },
    {
      id: 'FU-002',
      client_name: 'Global Enterprises',
      client_contact: '+91 98765 43214',
      last_contact: '2024-11-28',
      next_followup: '2024-12-10',
      status: 'warm',
      sales_person: 'Priya Sharma',
      notes: 'Requested product samples and quotation',
      potential_value: 85000,
    },
    {
      id: 'FU-003',
      client_name: 'Prime Industries',
      client_contact: '+91 98765 43215',
      last_contact: '2024-11-20',
      next_followup: '2024-12-15',
      status: 'cold',
      sales_person: 'Amit Patel',
      notes: 'Initial contact made, not showing much interest',
      potential_value: 45000,
    },
  ];

