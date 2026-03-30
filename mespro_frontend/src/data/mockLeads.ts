// Mock data for LeadsManagement

export const mockLeads = [
    {
      id: 'LEAD-001',
      lead_number: 'LEAD-2024-001',
      source: 'Website',
      customer: 'Modern School',
      contact: 'John Principal',
      mobile: '+91 98765 43210',
      email: 'john@modernschool.com',
      address: '123 Education St, Mumbai',
      category: 'Boards',
      product: 'White Board',
      size: '4x6 ft',
      quantity: 10,
      products: [
        { id: 1, category: 'boards', product: 'White Board', size: '4x6 ft', quantity: 10 },
        { id: 2, category: 'boards', product: 'Green Board', size: '3x4 ft', quantity: 5 }
      ],
      required_date: '2024-12-15',
      status: 'New',
      conversion_status: 'None',
      description: 'New inquiry for classroom whiteboards. School is expanding with 10 new classrooms.',
      assigned_to: 'Mike Johnson',
      created_at: '2024-11-20',
      notes: 'School urgently needs whiteboards for new classrooms',
      follow_ups: [
        { id: 'FU-001', date: '2024-11-20', scheduled_time: '10:00 AM', note: 'Initial inquiry received', by: 'System', status: 'completed', activity_type: 'Call', priority: 'Medium' },
        { id: 'FU-002', date: '2024-12-18', scheduled_time: '02:30 PM', note: 'Follow up call scheduled', by: 'Mike Johnson', status: 'upcoming', activity_type: 'Call', priority: 'High' }
      ]
    },
    {
      id: 'LEAD-002',
      lead_number: 'LEAD-2024-002',
      source: 'Phone',
      customer: 'Tech Corp',
      contact: 'Sarah Manager',
      mobile: '+91 98765 43211',
      email: 'sarah@techcorp.com',
      address: '456 Business Park, Pune',
      category: 'Covers',
      product: 'File Cover',
      size: 'A4',
      quantity: 500,
      products: [
        { id: 1, category: 'covers', product: 'File Cover', size: 'A4', quantity: 500 },
        { id: 2, category: 'stationery', product: 'Folders', size: 'A4', quantity: 200 }
      ],
      required_date: '2024-12-10',
      status: 'Contacted',
      conversion_status: 'None',
      description: 'Corporate client needs file covers for annual reports. Bulk order expected.',
      assigned_to: 'Mike Johnson',
      created_at: '2024-11-18',
      notes: 'Office file organization project',
      follow_ups: [
        { id: 'FU-003', date: '2024-11-18', scheduled_time: '11:00 AM', note: 'Called and discussed requirements', by: 'Mike Johnson', status: 'completed', activity_type: 'Call', priority: 'Medium' },
        { id: 'FU-004', date: '2024-11-19', scheduled_time: '09:00 AM', note: 'Sent quotation via email', by: 'Mike Johnson', status: 'completed', activity_type: 'Email', priority: 'Medium' },
        { id: 'FU-005', date: '2024-12-16', scheduled_time: '03:00 PM', note: 'Price negotiation meeting', by: 'Mike Johnson', status: 'upcoming', activity_type: 'Meeting', priority: 'High' }
      ]
    },
    {
      id: 'LEAD-003',
      lead_number: 'LEAD-2024-003',
      source: 'Referral',
      customer: 'City Hospital',
      contact: 'Dr. David',
      mobile: '+91 98765 43212',
      email: 'david@cityhospital.com',
      address: '789 Health Ave, Bangalore',
      products: [
        { id: 1, category: 'stationery', product: 'Notebooks', size: 'A5', quantity: 1000 },
        { id: 2, category: 'stationery', product: 'Pens', size: 'Standard', quantity: 500 },
        { id: 3, category: 'stationery', product: 'Files', size: 'A4', quantity: 300 }
      ],
      category: 'Stationery',
      product: 'Notebooks',
      size: 'A5',
      quantity: 1000,
      required_date: '2024-12-20',
      status: 'Qualified',
      conversion_status: 'None',
      description: 'Hospital requires notebooks for patient records. Monthly recurring order potential.',
      assigned_to: 'Mike Johnson',
      created_at: '2024-11-15',
      notes: 'Referred by ABC School. Recurring monthly requirement',
      follow_ups: [
        { id: 'FU-006', date: '2024-11-15', scheduled_time: '10:30 AM', note: 'Referral received from ABC School', by: 'System', status: 'completed', activity_type: 'Follow-up', priority: 'Medium' },
        { id: 'FU-007', date: '2024-11-16', scheduled_time: '02:00 PM', note: 'Site visit completed', by: 'Mike Johnson', status: 'completed', activity_type: 'Site Visit', priority: 'High' },
        { id: 'FU-008', date: '2024-11-17', scheduled_time: '11:00 AM', note: 'Quotation approved by client', by: 'Mike Johnson', status: 'completed', activity_type: 'Call', priority: 'Medium' },
        { id: 'FU-009', date: '2024-12-20', scheduled_time: '10:00 AM', note: 'Contract signing scheduled', by: 'Sarah Smith', status: 'upcoming', activity_type: 'Meeting', priority: 'High' }
      ]
    },
    {
      id: 'LEAD-004',
      lead_number: 'LEAD-2024-004',
      source: 'Walk-in',
      customer: 'ABC Corporation',
      contact: 'Emma Director',
      mobile: '+91 98765 43213',
      email: 'emma@abccorp.com',
      address: '321 Corporate Rd, Delhi',
      category: 'Boards',
      product: 'White Board',
      size: '4x6 ft',
      quantity: 15,
      products: [
        { id: 1, category: 'boards', product: 'White Board', size: '4x6 ft', quantity: 15 },
        { id: 2, category: 'boards', product: 'Notice Board', size: '3x4 ft', quantity: 8 },
        { id: 3, category: 'goods', product: 'Office Supplies', size: 'Assorted', quantity: 50 }
      ],
      required_date: '2024-12-25',
      status: 'Converted',
      conversion_status: 'Converted',
      description: 'Large corporate order for new office setup. Customer walked in directly.',
      assigned_to: 'Mike Johnson',
      created_at: '2024-11-10',
      notes: 'Walk-in customer. Order created successfully',
      follow_ups: [
        { id: 'FU-010', date: '2024-11-10', scheduled_time: '09:30 AM', note: 'Customer visited office', by: 'Mike Johnson', status: 'completed', activity_type: 'Meeting', priority: 'High' },
        { id: 'FU-011', date: '2024-11-11', scheduled_time: '10:00 AM', note: 'Quotation sent', by: 'Mike Johnson', status: 'completed', activity_type: 'Email', priority: 'Medium' },
        { id: 'FU-012', date: '2024-11-12', scheduled_time: '11:30 AM', note: 'Converted to Order', by: 'Sarah Smith', status: 'completed', activity_type: 'Follow-up', priority: 'High' }
      ]
    },
      
    {
      id: 'LEAD-005',
      lead_number: 'LEAD-2024-005',
      source: 'Advertisement',
      customer: 'XYZ Institute',
      contact: 'Robert Admin',
      mobile: '+91 98765 43214',
      email: 'robert@xyzinstitute.com',
      address: '654 Learning Blvd, Chennai',
      category: 'Goods',
      product: 'Office Supplies',
      size: 'Assorted',
      quantity: 50,
      products: [
        { id: 1, category: 'goods', product: 'Office Supplies', size: 'Assorted', quantity: 50 }
      ],
      required_date: '2024-12-30',
      status: 'Rejected',
      conversion_status: 'Not Converted',
      description: 'Educational institute inquiry from Google Ads. Budget constraints prevented order.',
      assigned_to: 'Mike Johnson',
      created_at: '2024-11-05',
      notes: 'Budget constraints. May revisit next quarter',
      follow_ups: [
        { id: 'FU-013', date: '2024-11-05', scheduled_time: '09:00 AM', note: 'Lead from Google Ads campaign', by: 'System', status: 'completed', activity_type: 'Follow-up', priority: 'Medium' },
        { id: 'FU-014', date: '2024-11-06', scheduled_time: '11:00 AM', note: 'Called client - budget issue', by: 'Mike Johnson', status: 'completed', activity_type: 'Call', priority: 'Medium' },
        { id: 'FU-015', date: '2024-11-07', scheduled_time: '10:30 AM', note: 'Rejected due to budget', by: 'Sarah Smith', status: 'completed', activity_type: 'Follow-up', priority: 'Low' }
      ]
    },
    {
      
      id: 'LEAD-006',
      lead_number: 'LEAD-2024-006',
      source: 'Phone',
      customer: 'Green Valley School',
      contact: 'Mrs. Priya',
      mobile: '+91 98765 43215',
      email: 'priya@greenvalley.edu',
      address: '100 Garden Road, Coimbatore',
      category: 'Boards',
      product: 'Green Board',
      size: '4x6 ft',
      quantity: 12,
      products: [
        { id: 1, category: 'boards', product: 'Green Board', size: '4x6 ft', quantity: 12 },
        { id: 2, category: 'boards', product: 'White Board', size: '3x4 ft', quantity: 8 }
      ],
      required_date: '2025-01-10',
      status: 'New',
      conversion_status: 'None',
      description: 'School expansion project. Need green boards for science labs.',
      assigned_to: 'Sarah Smith',
      created_at: '2024-12-10',
      notes: 'New school building under construction',
      follow_ups: [
        { id: 'FU-016', date: '2024-12-10', scheduled_time: '10:00 AM', note: 'Initial call received', by: 'System', status: 'completed', activity_type: 'Call', priority: 'Medium' },
        { id: 'FU-017', date: '2024-12-17', scheduled_time: '02:00 PM', note: 'Site visit scheduled', by: 'Sarah Smith', status: 'upcoming', activity_type: 'Site Visit', priority: 'High' }
      ]
    },
    {
      id: 'LEAD-007',
      lead_number: 'LEAD-2024-007',
      source: 'Website',
      customer: 'Prime Bookstore',
      contact: 'Mr. Kumar',
      mobile: '+91 98765 43216',
      email: 'kumar@primebooks.com',
      address: '200 Book Street, Madurai',
      category: 'Covers',
      product: 'Book Cover',
      size: 'Various',
      quantity: 2000,
      products: [
        { id: 1, category: 'covers', product: 'Book Cover', size: 'A4', quantity: 1000 },
        { id: 2, category: 'covers', product: 'Book Cover', size: 'A5', quantity: 800 },
        { id: 3, category: 'covers', product: 'Plastic Cover', size: 'Various', quantity: 200 }
      ],
      required_date: '2025-01-05',
      status: 'Contacted',
      conversion_status: 'None',
      description: 'Bookstore needs covers for textbooks. Bulk order for school season.',
      assigned_to: 'David Brown',
      created_at: '2024-12-08',
      notes: 'Seasonal bulk order - school opening',
      follow_ups: [
        { id: 'FU-018', date: '2024-12-08', scheduled_time: '10:00 AM', note: 'Online inquiry received', by: 'System', status: 'completed', activity_type: 'Follow-up', priority: 'Medium' },
        { id: 'FU-019', date: '2024-12-09', scheduled_time: '03:00 PM', note: 'Called and discussed bulk pricing', by: 'David Brown', status: 'completed', activity_type: 'Call', priority: 'High' },
        { id: 'FU-020', date: '2024-12-19', scheduled_time: '11:00 AM', note: 'Sample delivery scheduled', by: 'David Brown', status: 'upcoming', activity_type: 'Site Visit', priority: 'High' }
      ]
    },
    {
      id: 'LEAD-008',
      lead_number: 'LEAD-2024-008',
      source: 'Referral',
      customer: 'Metro Office Solutions',
      contact: 'Ms. Lakshmi',
      mobile: '+91 98765 43217',
      email: 'lakshmi@metrooffice.com',
      address: '50 Business Hub, Hyderabad',
      category: 'Stationery',
      product: 'Files',
      size: 'A4',
      quantity: 300,
      products: [
        { id: 1, category: 'stationery', product: 'Files', size: 'A4', quantity: 300 },
        { id: 2, category: 'stationery', product: 'Folders', size: 'A4', quantity: 200 },
        { id: 3, category: 'stationery', product: 'Notebooks', size: 'A5', quantity: 500 },
        { id: 4, category: 'stationery', product: 'Pens', size: 'Standard', quantity: 1000 }
      ],
      required_date: '2024-12-22',
      status: 'Qualified',
      conversion_status: 'None',
      description: 'Office supplies dealer looking for wholesale partnership. High volume potential.',
      assigned_to: 'Sarah Smith',
      created_at: '2024-12-05',
      notes: 'Potential dealer partnership',
      follow_ups: [
        { id: 'FU-021', date: '2024-12-05', scheduled_time: '09:30 AM', note: 'Referral from existing dealer', by: 'System', status: 'completed', activity_type: 'Follow-up', priority: 'Medium' },
        { id: 'FU-022', date: '2024-12-06', scheduled_time: '02:30 PM', note: 'Met at their office', by: 'Sarah Smith', status: 'completed', activity_type: 'Meeting', priority: 'High' },
        { id: 'FU-023', date: '2024-12-18', scheduled_time: '04:00 PM', note: 'Partnership proposal meeting', by: 'Sarah Smith', status: 'upcoming', activity_type: 'Meeting', priority: 'High' }
      ]
    },
    {
      id: 'LEAD-009',
      lead_number: 'LEAD-2024-009',
      source: 'Walk-in',
      customer: 'Sunshine Packaging',
      contact: 'Mr. Rajan',
      mobile: '+91 98765 43218',
      email: 'rajan@sunshinepkg.com',
      address: '75 Industrial Area, Sivakasi',
      category: 'Goods',
      product: 'Packaging Materials',
      size: 'Custom',
      quantity: 5000,
      products: [
        { id: 1, category: 'goods', product: 'Packaging Materials', size: 'Large', quantity: 2000 },
        { id: 2, category: 'goods', product: 'Packaging Materials', size: 'Medium', quantity: 2000 },
        { id: 3, category: 'goods', product: 'Packaging Materials', size: 'Small', quantity: 1000 },
        { id: 4, category: 'covers', product: 'Plastic Cover', size: 'Custom', quantity: 500 }
      ],
      required_date: '2025-01-15',
      status: 'New',
      conversion_status: 'None',
      description: 'Packaging company needs materials for their production. Large recurring order.',
      assigned_to: 'Mike Johnson',
      created_at: '2024-12-12',
      notes: 'B2B customer - manufacturing sector',
      follow_ups: [
        { id: 'FU-024', date: '2024-12-12', scheduled_time: '10:00 AM', note: 'Customer visited with samples', by: 'Mike Johnson', status: 'completed', activity_type: 'Meeting', priority: 'High' },
        { id: 'FU-025', date: '2024-12-20', scheduled_time: '11:30 AM', note: 'Factory visit scheduled', by: 'Mike Johnson', status: 'upcoming', activity_type: 'Site Visit', priority: 'High' },
        { id: 'FU-026', date: '2024-12-25', scheduled_time: '03:00 PM', note: 'Final quotation presentation', by: 'Mike Johnson', status: 'upcoming', activity_type: 'Meeting', priority: 'High' }
      ]
    },
  ];

