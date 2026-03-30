// Mock data for AdminDashboard

export const dashboardStats = [
    {
      title_key: 'newLeads',
      value: '24',
      change: '+12%',
      trend: 'up' as const,
      icon_type: 'users' as const,
      bg_color: 'bg-blue-500',
      light_bg: 'bg-blue-50',
      text_color: 'text-blue-600',
      navigate_to: 'leads' as const
    },
    {
      title_key: 'inProduction',
      value: '18',
      change: '+5',
      trend: 'up' as const,
      icon_type: 'clipboard' as const,
      bg_color: 'bg-emerald-500',
      light_bg: 'bg-emerald-50',
      text_color: 'text-emerald-600',
      navigate_to: 'production' as const
    },
    {
      title_key: 'stockAlerts',
      value: '7',
      change: '-3',
      trend: 'down' as const,
      icon_type: 'alert' as const,
      bg_color: 'bg-amber-500',
      light_bg: 'bg-amber-50',
      text_color: 'text-amber-600',
      navigate_to: 'inventory' as const
    },
    {
      title_key: 'dispatches',
      value: '12',
      change: '+8%',
      trend: 'up' as const,
      icon_type: 'truck' as const,
      bg_color: 'bg-violet-500',
      light_bg: 'bg-violet-50',
      text_color: 'text-violet-600',
      navigate_to: 'dispatch' as const
    },
  ];

export const dashboardRecentOrders = [
    { order_number: 'ORD-2024-001', customer: 'ABC School', product: 'White Board 4x6ft', status: 'Stage 5: Aluminium Edge', progress: 50, priority_key: 'high', priority_color: 'bg-red-100 text-red-700', bar_color: 'bg-blue-600' },
    { order_number: 'ORD-2024-002', customer: 'XYZ Office', product: 'Black Board 3x4ft', status: 'Stage 8: Advertising Material', progress: 80, priority_key: 'medium', priority_color: 'bg-amber-100 text-amber-700', bar_color: 'bg-blue-600' },
    { order_number: 'ORD-2024-003', customer: 'LMN College', product: 'White Board 5x8ft', status: 'Stage 3: Curing', progress: 30, priority_key: 'high', priority_color: 'bg-red-100 text-red-700', bar_color: 'bg-blue-600' },
    { order_number: 'ORD-2024-004', customer: 'PQR Hospital', product: 'White Board 4x6ft', status: 'Stage 9: PVC Cover', progress: 90, priority_key: 'low', priority_color: 'bg-slate-100 text-slate-600', bar_color: 'bg-blue-600' },
  ];

export const dashboardLowStockItems = [
    { material: '9.5mm MDF Sheet', current: 45, reorder: 100, status: 'critical', percentage: 45 },
    { material: 'White Mica Sheet', current: 78, reorder: 150, status: 'low', percentage: 52 },
    { material: 'Aluminium Edge (6ft)', current: 120, reorder: 200, status: 'low', percentage: 60 },
  ];

export const dashboardPendingLeads = [
    { id: 'LEAD-001', source: 'Website', customer: 'Modern School', product: 'White Board 4x6ft', status: 'New' },
    { id: 'LEAD-002', source: 'Phone', customer: 'Tech Corp', product: 'Black Board 3x4ft', status: 'Contacted' },
    { id: 'LEAD-003', source: 'Referral', customer: 'City Hospital', product: 'Custom Board', status: 'Qualified' },
  ];

