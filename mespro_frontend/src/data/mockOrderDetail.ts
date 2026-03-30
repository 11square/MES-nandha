// Mock data for OrderDetail

export const mockBom = [
    { material: '9.5mm MDF Sheet', quantityPerUnit: 1, totalRequired: 10, unit: 'sheets', inStock: 45, status: 'available' },
    { material: 'White Mica Sheet', quantityPerUnit: 2, totalRequired: 20, unit: 'sheets', inStock: 78, status: 'available' },
    { material: 'Industrial Glue', quantityPerUnit: 0.5, totalRequired: 5, unit: 'kg', inStock: 25, status: 'available' },
    { material: 'Aluminium Edge (6ft)', quantityPerUnit: 2, totalRequired: 20, unit: 'pieces', inStock: 120, status: 'available' },
    { material: 'Corner Bush', quantityPerUnit: 4, totalRequired: 40, unit: 'pieces', inStock: 180, status: 'available' },
    { material: 'Hanging Rings', quantityPerUnit: 2, totalRequired: 20, unit: 'pieces', inStock: 350, status: 'available' },
    { material: 'PVC Sheet', quantityPerUnit: 1, totalRequired: 10, unit: 'sheets', inStock: 65, status: 'available' },
    { material: 'Packing Material', quantityPerUnit: 1, totalRequired: 10, unit: 'sets', inStock: 88, status: 'available' },
  ];

export const mockProductionStages = [
    {
      id: 1,
      name: 'Material Pasting',
      description: 'Apply glue to MDF',
      status: 'completed',
      startedAt: '2024-11-20 09:00',
      completedAt: '2024-11-20 10:30',
      operator: 'Ramesh Kumar',
      notes: 'Glue applied evenly on all 10 boards',
      qcPassed: true,
      photos: 2,
      materialsUsed: [
        { material: '9.5mm MDF Sheet', quantity: 10 },
        { material: 'Industrial Glue', quantity: 5 }
      ]
    },
    {
      id: 2,
      name: 'Mica Pasting',
      description: 'Apply mica on both sides',
      status: 'completed',
      startedAt: '2024-11-20 10:45',
      completedAt: '2024-11-20 14:00',
      operator: 'Suresh Patel',
      notes: 'White mica applied on both sides. No air bubbles.',
      qcPassed: true,
      photos: 3,
      materialsUsed: [
        { material: 'White Mica Sheet', quantity: 20 }
      ]
    },
    {
      id: 3,
      name: 'Curing/Binding',
      description: 'Wait for binding',
      status: 'completed',
      startedAt: '2024-11-20 14:00',
      completedAt: '2024-11-21 09:00',
      operator: 'Auto',
      notes: '18-hour curing period completed. Bonds are strong.',
      qcPassed: true,
      photos: 1,
      materialsUsed: []
    },
    {
      id: 4,
      name: 'Cutting',
      description: 'Cut to required size',
      status: 'completed',
      startedAt: '2024-11-21 09:15',
      completedAt: '2024-11-21 11:00',
      operator: 'Vijay Singh',
      notes: 'All boards cut to exact 4x6 ft dimensions',
      qcPassed: true,
      photos: 2,
      materialsUsed: []
    },
    {
      id: 5,
      name: 'Aluminium Edge',
      description: 'Insert aluminium edge & screw',
      status: 'in-progress',
      startedAt: '2024-11-21 11:30',
      completedAt: null,
      operator: 'Prakash Reddy',
      notes: '5 out of 10 boards completed. Edges fitted perfectly.',
      qcPassed: null,
      photos: 1,
      materialsUsed: [
        { material: 'Aluminium Edge (6ft)', quantity: 10 }
      ]
    },
    {
      id: 6,
      name: 'Corner Pieces',
      description: 'Place corner pieces & screw',
      status: 'pending',
      startedAt: null,
      completedAt: null,
      operator: null,
      notes: null,
      qcPassed: null,
      photos: 0,
      materialsUsed: []
    },
    {
      id: 7,
      name: 'Hanging Rings',
      description: 'Attach hanging rings',
      status: 'pending',
      startedAt: null,
      completedAt: null,
      operator: null,
      notes: null,
      qcPassed: null,
      photos: 0,
      materialsUsed: []
    },
    {
      id: 8,
      name: 'Advertising Material',
      description: 'Place advertising materials',
      status: 'pending',
      startedAt: null,
      completedAt: null,
      operator: null,
      notes: null,
      qcPassed: null,
      photos: 0,
      materialsUsed: []
    },
    {
      id: 9,
      name: 'PVC Cover',
      description: 'Cover with PVC sheet',
      status: 'pending',
      startedAt: null,
      completedAt: null,
      operator: null,
      notes: null,
      qcPassed: null,
      photos: 0,
      materialsUsed: []
    },
    {
      id: 10,
      name: 'Packing',
      description: 'Pack & mark ready for dispatch',
      status: 'pending',
      startedAt: null,
      completedAt: null,
      operator: null,
      notes: null,
      qcPassed: null,
      photos: 0,
      materialsUsed: []
    },
  ];

