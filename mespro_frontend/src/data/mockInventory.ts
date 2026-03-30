// Mock data for InventoryManagement

export const mockRawMaterials = [
    { 
      id: 1, 
      name: '9.5mm MDF Sheet', 
      stock: 45, 
      reorder_point: 100, 
      unit: 'sheets',
      location: 'Raw Material Store',
      last_received: '2024-11-15',
      supplier: 'MDF Suppliers Ltd',
      cost_per_unit: 850,
      status: 'critical'
    },
    { 
      id: 2, 
      name: 'White Mica Sheet', 
      stock: 78, 
      reorder_point: 150, 
      unit: 'sheets',
      location: 'Raw Material Store',
      last_received: '2024-11-18',
      supplier: 'Mica Industries',
      cost_per_unit: 320,
      status: 'low'
    },
    { 
      id: 3, 
      name: 'Black Mica Sheet', 
      stock: 92, 
      reorder_point: 150, 
      unit: 'sheets',
      location: 'Raw Material Store',
      last_received: '2024-11-17',
      supplier: 'Mica Industries',
      cost_per_unit: 340,
      status: 'low'
    },
    { 
      id: 4, 
      name: 'Industrial Glue', 
      stock: 25, 
      reorder_point: 50, 
      unit: 'kg',
      location: 'Raw Material Store',
      last_received: '2024-11-20',
      supplier: 'Adhesive Corp',
      cost_per_unit: 450,
      status: 'low'
    },
    { 
      id: 5, 
      name: 'Aluminium Edge (6ft)', 
      stock: 120, 
      reorder_point: 200, 
      unit: 'pieces',
      location: 'Raw Material Store',
      last_received: '2024-11-12',
      supplier: 'Metal Works',
      cost_per_unit: 180,
      status: 'low'
    },
    { 
      id: 6, 
      name: 'Corner Bush (Plastic)', 
      stock: 580, 
      reorder_point: 500, 
      unit: 'pieces',
      location: 'Raw Material Store',
      last_received: '2024-11-22',
      supplier: 'Hardware Supplies',
      cost_per_unit: 5,
      status: 'ok'
    },
    { 
      id: 7, 
      name: 'Hanging Rings', 
      stock: 350, 
      reorder_point: 300, 
      unit: 'pieces',
      location: 'Raw Material Store',
      last_received: '2024-11-19',
      supplier: 'Hardware Supplies',
      cost_per_unit: 8,
      status: 'ok'
    },
    { 
      id: 8, 
      name: 'PVC Sheet', 
      stock: 65, 
      reorder_point: 100, 
      unit: 'sheets',
      location: 'Raw Material Store',
      last_received: '2024-11-21',
      supplier: 'Plastic Industries',
      cost_per_unit: 250,
      status: 'low'
    },
    { 
      id: 9, 
      name: 'Packing Material Set', 
      stock: 88, 
      reorder_point: 150, 
      unit: 'sets',
      location: 'Raw Material Store',
      last_received: '2024-11-16',
      supplier: 'Packaging Solutions',
      cost_per_unit: 120,
      status: 'low'
    },
  ];

export const mockFinishedGoods = [
    { id: 1, product: 'White Board 3x4 ft', stock: 15, unit: 'units', location: 'Finished Goods' },
    { id: 2, product: 'White Board 4x6 ft', stock: 8, unit: 'units', location: 'Finished Goods' },
    { id: 3, product: 'Black Board 3x4 ft', stock: 12, unit: 'units', location: 'Finished Goods' },
    { id: 4, product: 'Black Board 4x6 ft', stock: 5, unit: 'units', location: 'Finished Goods' },
  ];

export const mockRecentTransactions = [
    { id: 1, type: 'in', material: '9.5mm MDF Sheet', quantity: 50, date: '2024-11-15', reference: 'PO-2024-045', user: 'Emma Wilson' },
    { id: 2, type: 'out', material: '9.5mm MDF Sheet', quantity: 10, date: '2024-11-20', reference: 'ORD-2024-001', user: 'David Brown' },
    { id: 3, type: 'in', material: 'White Mica Sheet', quantity: 100, date: '2024-11-18', reference: 'PO-2024-046', user: 'Emma Wilson' },
    { id: 4, type: 'out', material: 'White Mica Sheet', quantity: 20, date: '2024-11-20', reference: 'ORD-2024-001', user: 'David Brown' },
    { id: 5, type: 'out', material: 'Aluminium Edge (6ft)', quantity: 10, date: '2024-11-21', reference: 'ORD-2024-001', user: 'David Brown' },
  ];

export const mockPendingRequisitions = [
    { id: 'PR-001', material: '9.5mm MDF Sheet', quantity: 100, requested_by: 'David Brown', date: '2024-11-21', status: 'Pending Approval', priority: 'High' },
    { id: 'PR-002', material: 'White Mica Sheet', quantity: 150, requested_by: 'David Brown', date: '2024-11-21', status: 'Pending Approval', priority: 'High' },
    { id: 'PR-003', material: 'Aluminium Edge (6ft)', quantity: 200, requested_by: 'David Brown', date: '2024-11-22', status: 'Pending Approval', priority: 'Medium' },
  ];

