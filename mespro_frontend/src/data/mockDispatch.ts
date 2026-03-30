// Mock data for DispatchManagement

export const mockProductionDispatches = [
    { 
      id: 'PD-001',
      order_id: 'ORD-2024-001',
      customer: 'ABC School',
      product: 'White Board 4x6ft',
      quantity: 12,
      lr_number: 'LR-2024-101',
      transporter: 'ABC Logistics',
      vehicle_no: 'MH-01-AB-1234',
      status: 'In Transit',
      dispatch_date: '2024-12-01',
      expected_delivery: '2024-12-05',
      address: 'Sector 15, Delhi'
    },
    { 
      id: 'PD-002',
      order_id: 'ORD-2024-002',
      customer: 'XYZ Office',
      product: 'Black Board 3x4ft',
      quantity: 8,
      lr_number: 'LR-2024-102',
      transporter: 'XYZ Transport',
      vehicle_no: 'MH-02-CD-5678',
      status: 'Delivered',
      dispatch_date: '2024-11-28',
      expected_delivery: '2024-12-02',
      delivered_date: '2024-12-01',
      address: 'Noida Sector 62'
    },
    { 
      id: 'PD-003',
      order_id: 'ORD-2024-005',
      customer: 'LMN College',
      product: 'White Board 5x8ft',
      quantity: 15,
      lr_number: null,
      transporter: null,
      vehicle_no: null,
      status: 'Ready to Dispatch',
      dispatch_date: null,
      expected_delivery: null,
      address: 'Gurgaon Phase 3'
    },
  ];

export const mockStockDispatches = [
    { 
      id: 'SD-001',
      order_id: 'STK-ORD-001',
      customer: 'Modern School',
      items: 'Marker Pens (Black) x 100, Duster Cloth x 50',
      lr_number: 'LR-2024-201',
      transporter: 'Quick Delivery',
      vehicle_no: 'DL-03-EF-9012',
      status: 'In Transit',
      dispatch_date: '2024-12-02',
      expected_delivery: '2024-12-04',
      address: 'South Delhi'
    },
    { 
      id: 'SD-002',
      order_id: 'STK-ORD-002',
      customer: 'Tech Corp',
      items: 'Wall Brackets x 30, Mounting Screws Kit x 25',
      lr_number: 'LR-2024-202',
      transporter: 'Fast Movers',
      vehicle_no: 'HR-05-GH-3456',
      status: 'Delivered',
      dispatch_date: '2024-11-30',
      expected_delivery: '2024-12-03',
      delivered_date: '2024-12-02',
      address: 'Cyber City, Gurgaon'
    },
  ];

