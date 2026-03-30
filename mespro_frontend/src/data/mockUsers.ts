// Mock data for UserManagement

export const mockRoles = [
    { id: 'admin', name: 'Admin', descriptionKey: 'fullAccessAllModules', color: 'bg-purple-100 text-purple-700' },
    { id: 'manager', name: 'Manager', descriptionKey: 'managementAccessReportsApprovals', color: 'bg-blue-100 text-blue-700' },
    { id: 'production', name: 'Production', descriptionKey: 'productionAccessOrdersInventoryDispatch', color: 'bg-emerald-100 text-emerald-700' },
    { id: 'sales', name: 'Sales', descriptionKey: 'salesAccessLeadsClientsBilling', color: 'bg-amber-100 text-amber-700' },
  ];

export const mockUsers = [
    { 
      id: 'USR001', 
      username: 'admin', 
      name: 'System Administrator',
      email: 'admin@mespro.com',
      phone: '+91 98765 43210',
      role: 'Admin',
      permissions: ['All Modules', 'Settings', 'Users'],
      status: 'Active',
      lastLogin: '2024-12-13 09:30 AM',
      createdDate: '2021-01-01'
    },
    { 
      id: 'USR002', 
      username: 'manager1', 
      name: 'Rajesh Kumar',
      email: 'rajesh@mespro.com',
      phone: '+91 98765 43211',
      role: 'Manager',
      permissions: ['Reports', 'Approvals', 'Staff', 'Payroll'],
      status: 'Active',
      lastLogin: '2024-12-13 08:15 AM',
      createdDate: '2022-01-15'
    },
    { 
      id: 'USR003', 
      username: 'production1', 
      name: 'Vikram Singh',
      email: 'vikram@mespro.com',
      phone: '+91 98765 43212',
      role: 'Production',
      permissions: ['Production', 'Inventory', 'Stock', 'Dispatch'],
      status: 'Active',
      lastLogin: '2024-12-13 07:00 AM',
      createdDate: '2021-08-05'
    },
    { 
      id: 'USR004', 
      username: 'production2', 
      name: 'Sneha Reddy',
      email: 'sneha@mespro.com',
      phone: '+91 98765 43213',
      role: 'Production',
      permissions: ['Production', 'Inventory', 'Stock', 'Dispatch'],
      status: 'Active',
      lastLogin: '2024-12-12 06:45 PM',
      createdDate: '2023-02-01'
    },
    { 
      id: 'USR005', 
      username: 'sales1', 
      name: 'Amit Patel',
      email: 'amit@mespro.com',
      phone: '+91 98765 43214',
      role: 'Sales',
      permissions: ['Leads', 'Clients', 'Sales', 'Billing'],
      status: 'Active',
      lastLogin: '2024-12-13 09:00 AM',
      createdDate: '2022-06-12'
    },
    { 
      id: 'USR006', 
      username: 'sales2', 
      name: 'Priya Sharma',
      email: 'priya@mespro.com',
      phone: '+91 98765 43215',
      role: 'Sales',
      permissions: ['Leads', 'Clients', 'Sales', 'Billing'],
      status: 'Active',
      lastLogin: '2024-12-13 08:30 AM',
      createdDate: '2023-03-10'
    },
    { 
      id: 'USR007', 
      username: 'manager2', 
      name: 'Anjali Gupta',
      email: 'anjali@mespro.com',
      phone: '+91 98765 43216',
      role: 'Manager',
      permissions: ['Reports', 'Approvals', 'Staff', 'Payroll'],
      status: 'Inactive',
      lastLogin: '2024-11-28 03:20 PM',
      createdDate: '2023-05-15'
    },
  ];

