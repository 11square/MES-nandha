// Mock data for AuditModule

export const mockAuditPurchaseOrders = [
    // 2024 - January
    { id: 'PO-2024-001', vendor: 'MDF Suppliers Ltd', date: '2024-01-05', amount: 78000, gst: 14040, total_amount: 92040, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2024-002', vendor: 'Mica Industries', date: '2024-01-12', amount: 45000, gst: 8100, total_amount: 53100, status: 'Received', gst_type: 'CGST+SGST' },
    // 2024 - February
    { id: 'PO-2024-003', vendor: 'Adhesive Corp', date: '2024-02-08', amount: 32000, gst: 5760, total_amount: 37760, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2024-004', vendor: 'Hardware Supplies', date: '2024-02-15', amount: 28000, gst: 5040, total_amount: 33040, status: 'Received', gst_type: 'IGST' },
    // 2024 - March
    { id: 'PO-2024-005', vendor: 'MDF Suppliers Ltd', date: '2024-03-03', amount: 92000, gst: 16560, total_amount: 108560, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2024-006', vendor: 'Aluminium Works', date: '2024-03-18', amount: 55000, gst: 9900, total_amount: 64900, status: 'Received', gst_type: 'CGST+SGST' },
    // 2024 - April
    { id: 'PO-2024-007', vendor: 'Mica Industries', date: '2024-04-05', amount: 48000, gst: 8640, total_amount: 56640, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2024-008', vendor: 'Steel Works', date: '2024-04-22', amount: 67000, gst: 12060, total_amount: 79060, status: 'Received', gst_type: 'IGST' },
    // 2024 - May
    { id: 'PO-2024-009', vendor: 'Hardware Plus', date: '2024-05-10', amount: 38000, gst: 6840, total_amount: 44840, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2024-010', vendor: 'MDF Suppliers Ltd', date: '2024-05-25', amount: 85000, gst: 15300, total_amount: 100300, status: 'Received', gst_type: 'CGST+SGST' },
    // 2024 - June
    { id: 'PO-2024-011', vendor: 'Adhesive Corp', date: '2024-06-07', amount: 29000, gst: 5220, total_amount: 34220, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2024-012', vendor: 'Mica Industries', date: '2024-06-20', amount: 52000, gst: 9360, total_amount: 61360, status: 'Received', gst_type: 'CGST+SGST' },
    // 2024 - July
    { id: 'PO-2024-013', vendor: 'Aluminium Works', date: '2024-07-04', amount: 72000, gst: 12960, total_amount: 84960, status: 'Received', gst_type: 'IGST' },
    { id: 'PO-2024-014', vendor: 'Hardware Supplies', date: '2024-07-18', amount: 41000, gst: 7380, total_amount: 48380, status: 'Received', gst_type: 'CGST+SGST' },
    // 2024 - August
    { id: 'PO-2024-015', vendor: 'MDF Suppliers Ltd', date: '2024-08-02', amount: 98000, gst: 17640, total_amount: 115640, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2024-016', vendor: 'Steel Works', date: '2024-08-15', amount: 63000, gst: 11340, total_amount: 74340, status: 'Received', gst_type: 'CGST+SGST' },
    // 2024 - September
    { id: 'PO-2024-017', vendor: 'Mica Industries', date: '2024-09-08', amount: 47000, gst: 8460, total_amount: 55460, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2024-018', vendor: 'Hardware Plus', date: '2024-09-22', amount: 35000, gst: 6300, total_amount: 41300, status: 'Received', gst_type: 'IGST' },
    // 2024 - October
    { id: 'PO-2024-019', vendor: 'Adhesive Corp', date: '2024-10-05', amount: 31000, gst: 5580, total_amount: 36580, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2024-020', vendor: 'MDF Suppliers Ltd', date: '2024-10-18', amount: 88000, gst: 15840, total_amount: 103840, status: 'Received', gst_type: 'CGST+SGST' },
    // 2024 - November
    { id: 'PO-2024-021', vendor: 'Aluminium Works', date: '2024-11-03', amount: 58000, gst: 10440, total_amount: 68440, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2024-022', vendor: 'Mica Industries', date: '2024-11-20', amount: 49000, gst: 8820, total_amount: 57820, status: 'Received', gst_type: 'CGST+SGST' },
    // 2024 - December
    { id: 'PO-2024-023', vendor: 'MDF Suppliers Ltd', date: '2024-12-01', amount: 85000, gst: 15300, total_amount: 100300, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2024-024', vendor: 'Hardware Supplies', date: '2024-12-10', amount: 42000, gst: 7560, total_amount: 49560, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2024-025', vendor: 'Steel Works', date: '2024-12-18', amount: 65000, gst: 11700, total_amount: 76700, status: 'Pending', gst_type: 'IGST' },
    // 2025 - January
    { id: 'PO-2025-001', vendor: 'MDF Suppliers Ltd', date: '2025-01-05', amount: 92000, gst: 16560, total_amount: 108560, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2025-002', vendor: 'Mica Industries', date: '2025-01-12', amount: 55000, gst: 9900, total_amount: 64900, status: 'Received', gst_type: 'CGST+SGST' },
    // 2025 - February
    { id: 'PO-2025-003', vendor: 'Adhesive Corp', date: '2025-02-06', amount: 34000, gst: 6120, total_amount: 40120, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2025-004', vendor: 'Hardware Plus', date: '2025-02-18', amount: 46000, gst: 8280, total_amount: 54280, status: 'Received', gst_type: 'IGST' },
    // 2025 - March
    { id: 'PO-2025-005', vendor: 'MDF Suppliers Ltd', date: '2025-03-04', amount: 95000, gst: 17100, total_amount: 112100, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2025-006', vendor: 'Steel Works', date: '2025-03-20', amount: 68000, gst: 12240, total_amount: 80240, status: 'Received', gst_type: 'CGST+SGST' },
    // 2025 - April
    { id: 'PO-2025-007', vendor: 'Mica Industries', date: '2025-04-08', amount: 51000, gst: 9180, total_amount: 60180, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2025-008', vendor: 'Aluminium Works', date: '2025-04-22', amount: 73000, gst: 13140, total_amount: 86140, status: 'Received', gst_type: 'IGST' },
    // 2025 - May
    { id: 'PO-2025-009', vendor: 'Hardware Supplies', date: '2025-05-10', amount: 39000, gst: 7020, total_amount: 46020, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2025-010', vendor: 'MDF Suppliers Ltd', date: '2025-05-25', amount: 87000, gst: 15660, total_amount: 102660, status: 'Received', gst_type: 'CGST+SGST' },
    // 2025 - June
    { id: 'PO-2025-011', vendor: 'Adhesive Corp', date: '2025-06-05', amount: 33000, gst: 5940, total_amount: 38940, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2025-012', vendor: 'Mica Industries', date: '2025-06-18', amount: 54000, gst: 9720, total_amount: 63720, status: 'Received', gst_type: 'CGST+SGST' },
    // 2025 - July
    { id: 'PO-2025-013', vendor: 'Steel Works', date: '2025-07-07', amount: 71000, gst: 12780, total_amount: 83780, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2025-014', vendor: 'Hardware Plus', date: '2025-07-21', amount: 44000, gst: 7920, total_amount: 51920, status: 'Received', gst_type: 'IGST' },
    // 2025 - August
    { id: 'PO-2025-015', vendor: 'MDF Suppliers Ltd', date: '2025-08-04', amount: 99000, gst: 17820, total_amount: 116820, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2025-016', vendor: 'Aluminium Works', date: '2025-08-19', amount: 62000, gst: 11160, total_amount: 73160, status: 'Received', gst_type: 'CGST+SGST' },
    // 2025 - September
    { id: 'PO-2025-017', vendor: 'Mica Industries', date: '2025-09-08', amount: 50000, gst: 9000, total_amount: 59000, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2025-018', vendor: 'Hardware Supplies', date: '2025-09-23', amount: 37000, gst: 6660, total_amount: 43660, status: 'Received', gst_type: 'CGST+SGST' },
    // 2025 - October
    { id: 'PO-2025-019', vendor: 'Adhesive Corp', date: '2025-10-06', amount: 36000, gst: 6480, total_amount: 42480, status: 'Received', gst_type: 'IGST' },
    { id: 'PO-2025-020', vendor: 'MDF Suppliers Ltd', date: '2025-10-20', amount: 91000, gst: 16380, total_amount: 107380, status: 'Received', gst_type: 'CGST+SGST' },
    // 2025 - November
    { id: 'PO-2025-021', vendor: 'Steel Works', date: '2025-11-05', amount: 66000, gst: 11880, total_amount: 77880, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2025-022', vendor: 'Mica Industries', date: '2025-11-18', amount: 53000, gst: 9540, total_amount: 62540, status: 'Received', gst_type: 'CGST+SGST' },
    // 2025 - December
    { id: 'PO-2025-023', vendor: 'MDF Suppliers Ltd', date: '2025-12-03', amount: 94000, gst: 16920, total_amount: 110920, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2025-024', vendor: 'Hardware Plus', date: '2025-12-15', amount: 48000, gst: 8640, total_amount: 56640, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2025-025', vendor: 'Aluminium Works', date: '2025-12-22', amount: 70000, gst: 12600, total_amount: 82600, status: 'Pending', gst_type: 'IGST' },
    // 2026 - January
    { id: 'PO-2026-001', vendor: 'Hardware Plus', date: '2026-01-03', amount: 48000, gst: 8640, total_amount: 56640, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2026-002', vendor: 'Steel Works', date: '2026-01-07', amount: 72000, gst: 12960, total_amount: 84960, status: 'Pending', gst_type: 'IGST' },
    // 2026 - February
    { id: 'PO-2026-003', vendor: 'MDF Suppliers Ltd', date: '2026-02-03', amount: 96000, gst: 17280, total_amount: 113280, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2026-004', vendor: 'Mica Industries', date: '2026-02-10', amount: 58000, gst: 10440, total_amount: 68440, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2026-005', vendor: 'Adhesive Corp', date: '2026-02-14', amount: 35000, gst: 6300, total_amount: 41300, status: 'Received', gst_type: 'IGST' },
    { id: 'PO-2026-006', vendor: 'Aluminium Works', date: '2026-02-19', amount: 74000, gst: 13320, total_amount: 87320, status: 'Received', gst_type: 'CGST+SGST' },
    { id: 'PO-2026-007', vendor: 'Hardware Supplies', date: '2026-02-22', amount: 41000, gst: 7380, total_amount: 48380, status: 'Pending', gst_type: 'CGST+SGST' },
  ];

export const mockAuditSalesBills = [
    // 2024 - January
    { id: 'INV-2024-001', customer: 'ABC School', date: '2024-01-08', amount: 115000, gst: 20700, total_amount: 135700, status: 'Paid', gst_type: 'CGST+SGST' },
    { id: 'INV-2024-002', customer: 'XYZ Office', date: '2024-01-18', amount: 68000, gst: 12240, total_amount: 80240, status: 'Paid', gst_type: 'CGST+SGST' },
    // 2024 - February
    { id: 'INV-2024-003', customer: 'LMN College', date: '2024-02-05', amount: 145000, gst: 26100, total_amount: 171100, status: 'Paid', gst_type: 'IGST' },
    { id: 'INV-2024-004', customer: 'Tech Corp', date: '2024-02-20', amount: 52000, gst: 9360, total_amount: 61360, status: 'Paid', gst_type: 'CGST+SGST' },
    // 2024 - March
    { id: 'INV-2024-005', customer: 'Modern School', date: '2024-03-10', amount: 178000, gst: 32040, total_amount: 210040, status: 'Paid', gst_type: 'CGST+SGST' },
    { id: 'INV-2024-006', customer: 'City Hospital', date: '2024-03-22', amount: 92000, gst: 16560, total_amount: 108560, status: 'Paid', gst_type: 'CGST+SGST' },
    // 2024 - April
    { id: 'INV-2024-007', customer: 'Prime Academy', date: '2024-04-08', amount: 135000, gst: 24300, total_amount: 159300, status: 'Paid', gst_type: 'CGST+SGST' },
    { id: 'INV-2024-008', customer: 'Metro Office', date: '2024-04-25', amount: 78000, gst: 14040, total_amount: 92040, status: 'Paid', gst_type: 'IGST' },
    // 2024 - May
    { id: 'INV-2024-009', customer: 'New Tech School', date: '2024-05-12', amount: 165000, gst: 29700, total_amount: 194700, status: 'Paid', gst_type: 'CGST+SGST' },
    { id: 'INV-2024-010', customer: 'ABC School', date: '2024-05-28', amount: 88000, gst: 15840, total_amount: 103840, status: 'Paid', gst_type: 'CGST+SGST' },
    // 2024 - June
    { id: 'INV-2024-011', customer: 'XYZ Office', date: '2024-06-10', amount: 72000, gst: 12960, total_amount: 84960, status: 'Paid', gst_type: 'CGST+SGST' },
    { id: 'INV-2024-012', customer: 'LMN College', date: '2024-06-22', amount: 155000, gst: 27900, total_amount: 182900, status: 'Paid', gst_type: 'IGST' },
    // 2024 - July
    { id: 'INV-2024-013', customer: 'Tech Corp', date: '2024-07-05', amount: 95000, gst: 17100, total_amount: 112100, status: 'Paid', gst_type: 'CGST+SGST' },
    { id: 'INV-2024-014', customer: 'Modern School', date: '2024-07-18', amount: 128000, gst: 23040, total_amount: 151040, status: 'Paid', gst_type: 'CGST+SGST' },
    // 2024 - August
    { id: 'INV-2024-015', customer: 'City Hospital', date: '2024-08-08', amount: 185000, gst: 33300, total_amount: 218300, status: 'Paid', gst_type: 'CGST+SGST' },
    { id: 'INV-2024-016', customer: 'Prime Academy', date: '2024-08-22', amount: 112000, gst: 20160, total_amount: 132160, status: 'Paid', gst_type: 'CGST+SGST' },
    // 2024 - September
    { id: 'INV-2024-017', customer: 'Metro Office', date: '2024-09-10', amount: 98000, gst: 17640, total_amount: 115640, status: 'Paid', gst_type: 'IGST' },
    { id: 'INV-2024-018', customer: 'New Tech School', date: '2024-09-25', amount: 142000, gst: 25560, total_amount: 167560, status: 'Paid', gst_type: 'CGST+SGST' },
    // 2024 - October
    { id: 'INV-2024-019', customer: 'ABC School', date: '2024-10-07', amount: 168000, gst: 30240, total_amount: 198240, status: 'Paid', gst_type: 'CGST+SGST' },
    { id: 'INV-2024-020', customer: 'XYZ Office', date: '2024-10-20', amount: 85000, gst: 15300, total_amount: 100300, status: 'Paid', gst_type: 'CGST+SGST' },
    // 2024 - November
    { id: 'INV-2024-021', customer: 'LMN College', date: '2024-11-05', amount: 175000, gst: 31500, total_amount: 206500, status: 'Paid', gst_type: 'IGST' },
    { id: 'INV-2024-022', customer: 'Tech Corp', date: '2024-11-18', amount: 62000, gst: 11160, total_amount: 73160, status: 'Paid', gst_type: 'CGST+SGST' },
    // 2024 - December
    { id: 'INV-2024-023', customer: 'ABC School', date: '2024-12-02', amount: 125000, gst: 22500, total_amount: 147500, status: 'Paid', gst_type: 'CGST+SGST' },
    { id: 'INV-2024-024', customer: 'Modern School', date: '2024-12-11', amount: 88000, gst: 15840, total_amount: 103840, status: 'Pending', gst_type: 'CGST+SGST' },
    { id: 'INV-2024-025', customer: 'City Hospital', date: '2024-12-20', amount: 195000, gst: 35100, total_amount: 230100, status: 'Pending', gst_type: 'IGST' },
    // 2025 - January
    { id: 'INV-2025-001', customer: 'City Hospital', date: '2025-01-08', amount: 156000, gst: 28080, total_amount: 184080, status: 'Paid', gst_type: 'CGST+SGST' },
    { id: 'INV-2025-002', customer: 'Prime Academy', date: '2025-01-15', amount: 98000, gst: 17640, total_amount: 115640, status: 'Pending', gst_type: 'CGST+SGST' },
    // 2025 - February
    { id: 'INV-2025-003', customer: 'Metro Office', date: '2025-02-10', amount: 82000, gst: 14760, total_amount: 96760, status: 'Paid', gst_type: 'CGST+SGST' },
    { id: 'INV-2025-004', customer: 'New Tech School', date: '2025-02-22', amount: 148000, gst: 26640, total_amount: 174640, status: 'Paid', gst_type: 'IGST' },
    // 2025 - March
    { id: 'INV-2025-005', customer: 'ABC School', date: '2025-03-08', amount: 172000, gst: 30960, total_amount: 202960, status: 'Paid', gst_type: 'CGST+SGST' },
    { id: 'INV-2025-006', customer: 'XYZ Office', date: '2025-03-20', amount: 95000, gst: 17100, total_amount: 112100, status: 'Paid', gst_type: 'CGST+SGST' },
    // 2025 - April
    { id: 'INV-2025-007', customer: 'LMN College', date: '2025-04-05', amount: 188000, gst: 33840, total_amount: 221840, status: 'Paid', gst_type: 'IGST' },
    { id: 'INV-2025-008', customer: 'Tech Corp', date: '2025-04-18', amount: 75000, gst: 13500, total_amount: 88500, status: 'Paid', gst_type: 'CGST+SGST' },
    // 2025 - May
    { id: 'INV-2025-009', customer: 'Modern School', date: '2025-05-12', amount: 138000, gst: 24840, total_amount: 162840, status: 'Paid', gst_type: 'CGST+SGST' },
    { id: 'INV-2025-010', customer: 'City Hospital', date: '2025-05-25', amount: 165000, gst: 29700, total_amount: 194700, status: 'Paid', gst_type: 'CGST+SGST' },
    // 2025 - June
    { id: 'INV-2025-011', customer: 'Prime Academy', date: '2025-06-08', amount: 108000, gst: 19440, total_amount: 127440, status: 'Paid', gst_type: 'CGST+SGST' },
    { id: 'INV-2025-012', customer: 'Metro Office', date: '2025-06-22', amount: 92000, gst: 16560, total_amount: 108560, status: 'Paid', gst_type: 'IGST' },
    // 2025 - July
    { id: 'INV-2025-013', customer: 'New Tech School', date: '2025-07-10', amount: 158000, gst: 28440, total_amount: 186440, status: 'Paid', gst_type: 'CGST+SGST' },
    { id: 'INV-2025-014', customer: 'ABC School', date: '2025-07-24', amount: 118000, gst: 21240, total_amount: 139240, status: 'Paid', gst_type: 'CGST+SGST' },
    // 2025 - August
    { id: 'INV-2025-015', customer: 'XYZ Office', date: '2025-08-05', amount: 88000, gst: 15840, total_amount: 103840, status: 'Paid', gst_type: 'CGST+SGST' },
    { id: 'INV-2025-016', customer: 'LMN College', date: '2025-08-18', amount: 198000, gst: 35640, total_amount: 233640, status: 'Paid', gst_type: 'IGST' },
    // 2025 - September
    { id: 'INV-2025-017', customer: 'Tech Corp', date: '2025-09-08', amount: 72000, gst: 12960, total_amount: 84960, status: 'Paid', gst_type: 'CGST+SGST' },
    { id: 'INV-2025-018', customer: 'Modern School', date: '2025-09-22', amount: 145000, gst: 26100, total_amount: 171100, status: 'Paid', gst_type: 'CGST+SGST' },
    // 2025 - October
    { id: 'INV-2025-019', customer: 'City Hospital', date: '2025-10-10', amount: 178000, gst: 32040, total_amount: 210040, status: 'Paid', gst_type: 'CGST+SGST' },
    { id: 'INV-2025-020', customer: 'Prime Academy', date: '2025-10-25', amount: 102000, gst: 18360, total_amount: 120360, status: 'Paid', gst_type: 'IGST' },
    // 2025 - November
    { id: 'INV-2025-021', customer: 'Metro Office', date: '2025-11-07', amount: 95000, gst: 17100, total_amount: 112100, status: 'Paid', gst_type: 'CGST+SGST' },
    { id: 'INV-2025-022', customer: 'New Tech School', date: '2025-11-20', amount: 162000, gst: 29160, total_amount: 191160, status: 'Paid', gst_type: 'CGST+SGST' },
    // 2025 - December
    { id: 'INV-2025-023', customer: 'ABC School', date: '2025-12-05', amount: 185000, gst: 33300, total_amount: 218300, status: 'Paid', gst_type: 'CGST+SGST' },
    { id: 'INV-2025-024', customer: 'XYZ Office', date: '2025-12-15', amount: 98000, gst: 17640, total_amount: 115640, status: 'Pending', gst_type: 'CGST+SGST' },
    { id: 'INV-2025-025', customer: 'LMN College', date: '2025-12-22', amount: 205000, gst: 36900, total_amount: 241900, status: 'Pending', gst_type: 'IGST' },
    // 2026 - January
    { id: 'INV-2026-001', customer: 'New Tech School', date: '2026-01-04', amount: 135000, gst: 24300, total_amount: 159300, status: 'Paid', gst_type: 'CGST+SGST' },
    { id: 'INV-2026-002', customer: 'Metro Office', date: '2026-01-08', amount: 112000, gst: 20160, total_amount: 132160, status: 'Pending', gst_type: 'IGST' },
    // 2026 - February
    { id: 'INV-2026-003', customer: 'ABC School', date: '2026-02-02', amount: 168000, gst: 30240, total_amount: 198240, status: 'Paid', gst_type: 'CGST+SGST' },
    { id: 'INV-2026-004', customer: 'LMN College', date: '2026-02-08', amount: 192000, gst: 34560, total_amount: 226560, status: 'Paid', gst_type: 'IGST' },
    { id: 'INV-2026-005', customer: 'City Hospital', date: '2026-02-12', amount: 145000, gst: 26100, total_amount: 171100, status: 'Paid', gst_type: 'CGST+SGST' },
    { id: 'INV-2026-006', customer: 'Prime Academy', date: '2026-02-17', amount: 118000, gst: 21240, total_amount: 139240, status: 'Paid', gst_type: 'CGST+SGST' },
    { id: 'INV-2026-007', customer: 'Tech Corp', date: '2026-02-21', amount: 85000, gst: 15300, total_amount: 100300, status: 'Pending', gst_type: 'CGST+SGST' },
  ];

export const mockStockReconciliation = [
    // 2024 - All months
    { item: '9.5mm MDF Sheet', purchased: 150, used: 110, in_stock: 40, po_value: 127500, bill_value: 220000, variance: 0, month: 0, year: 2024 },
    { item: 'White Mica Sheet', purchased: 220, used: 180, in_stock: 40, po_value: 70400, bill_value: 144000, variance: 0, month: 0, year: 2024 },
    { item: '9.5mm MDF Sheet', purchased: 140, used: 100, in_stock: 40, po_value: 119000, bill_value: 200000, variance: 0, month: 1, year: 2024 },
    { item: 'White Mica Sheet', purchased: 200, used: 160, in_stock: 40, po_value: 64000, bill_value: 128000, variance: 1, month: 1, year: 2024 },
    { item: '9.5mm MDF Sheet', purchased: 180, used: 130, in_stock: 50, po_value: 153000, bill_value: 260000, variance: 0, month: 2, year: 2024 },
    { item: 'White Mica Sheet', purchased: 250, used: 190, in_stock: 60, po_value: 80000, bill_value: 152000, variance: 0, month: 2, year: 2024 },
    { item: '9.5mm MDF Sheet', purchased: 160, used: 120, in_stock: 40, po_value: 136000, bill_value: 240000, variance: 0, month: 3, year: 2024 },
    { item: 'White Mica Sheet', purchased: 230, used: 175, in_stock: 55, po_value: 73600, bill_value: 140000, variance: 0, month: 3, year: 2024 },
    { item: '9.5mm MDF Sheet', purchased: 175, used: 125, in_stock: 50, po_value: 148750, bill_value: 250000, variance: 0, month: 4, year: 2024 },
    { item: 'White Mica Sheet', purchased: 240, used: 185, in_stock: 55, po_value: 76800, bill_value: 148000, variance: 0, month: 4, year: 2024 },
    { item: '9.5mm MDF Sheet', purchased: 155, used: 115, in_stock: 40, po_value: 131750, bill_value: 230000, variance: 0, month: 5, year: 2024 },
    { item: 'White Mica Sheet', purchased: 210, used: 165, in_stock: 45, po_value: 67200, bill_value: 132000, variance: 0, month: 5, year: 2024 },
    { item: '9.5mm MDF Sheet', purchased: 190, used: 140, in_stock: 50, po_value: 161500, bill_value: 280000, variance: 0, month: 6, year: 2024 },
    { item: 'White Mica Sheet', purchased: 270, used: 210, in_stock: 60, po_value: 86400, bill_value: 168000, variance: 0, month: 6, year: 2024 },
    { item: '9.5mm MDF Sheet', purchased: 200, used: 150, in_stock: 50, po_value: 170000, bill_value: 300000, variance: 0, month: 7, year: 2024 },
    { item: 'White Mica Sheet', purchased: 280, used: 220, in_stock: 60, po_value: 89600, bill_value: 176000, variance: 0, month: 7, year: 2024 },
    { item: 'Industrial Glue', purchased: 90, used: 65, in_stock: 25, po_value: 40500, bill_value: 0, variance: 0, month: 7, year: 2024 },
    { item: '9.5mm MDF Sheet', purchased: 165, used: 125, in_stock: 40, po_value: 140250, bill_value: 250000, variance: 0, month: 8, year: 2024 },
    { item: 'White Mica Sheet', purchased: 235, used: 180, in_stock: 55, po_value: 75200, bill_value: 144000, variance: 1, month: 8, year: 2024 },
    { item: '9.5mm MDF Sheet', purchased: 185, used: 135, in_stock: 50, po_value: 157250, bill_value: 270000, variance: 0, month: 9, year: 2024 },
    { item: 'White Mica Sheet', purchased: 260, used: 200, in_stock: 60, po_value: 83200, bill_value: 160000, variance: 0, month: 9, year: 2024 },
    { item: '9.5mm MDF Sheet', purchased: 170, used: 130, in_stock: 40, po_value: 144500, bill_value: 260000, variance: 0, month: 10, year: 2024 },
    { item: 'White Mica Sheet', purchased: 245, used: 190, in_stock: 55, po_value: 78400, bill_value: 152000, variance: 0, month: 10, year: 2024 },
    { item: 'Industrial Glue', purchased: 85, used: 60, in_stock: 25, po_value: 38250, bill_value: 0, variance: 0, month: 10, year: 2024 },
    { item: '9.5mm MDF Sheet', purchased: 200, used: 145, in_stock: 55, po_value: 170000, bill_value: 290000, variance: 0, month: 11, year: 2024 },
    { item: 'White Mica Sheet', purchased: 300, used: 220, in_stock: 78, po_value: 96000, bill_value: 176000, variance: 2, month: 11, year: 2024 },
    { item: 'Black Mica Sheet', purchased: 250, used: 158, in_stock: 92, po_value: 85000, bill_value: 142200, variance: 0, month: 11, year: 2024 },
    { item: 'Industrial Glue', purchased: 100, used: 75, in_stock: 25, po_value: 45000, bill_value: 0, variance: 0, month: 11, year: 2024 },
    { item: 'Aluminium Edge (6ft)', purchased: 500, used: 380, in_stock: 120, po_value: 75000, bill_value: 0, variance: 0, month: 11, year: 2024 },
    { item: 'Corner Pieces', purchased: 1000, used: 760, in_stock: 240, po_value: 30000, bill_value: 0, variance: 0, month: 11, year: 2024 },
    // 2025 - All months
    { item: '9.5mm MDF Sheet', purchased: 180, used: 120, in_stock: 60, po_value: 153000, bill_value: 240000, variance: 0, month: 0, year: 2025 },
    { item: 'White Mica Sheet', purchased: 280, used: 200, in_stock: 80, po_value: 89600, bill_value: 160000, variance: 0, month: 0, year: 2025 },
    { item: '9.5mm MDF Sheet', purchased: 160, used: 110, in_stock: 50, po_value: 136000, bill_value: 220000, variance: 0, month: 1, year: 2025 },
    { item: 'White Mica Sheet', purchased: 240, used: 180, in_stock: 60, po_value: 76800, bill_value: 144000, variance: 0, month: 1, year: 2025 },
    { item: '9.5mm MDF Sheet', purchased: 190, used: 135, in_stock: 55, po_value: 161500, bill_value: 270000, variance: 0, month: 2, year: 2025 },
    { item: 'White Mica Sheet', purchased: 270, used: 205, in_stock: 65, po_value: 86400, bill_value: 164000, variance: 0, month: 2, year: 2025 },
    { item: '9.5mm MDF Sheet', purchased: 175, used: 125, in_stock: 50, po_value: 148750, bill_value: 250000, variance: 0, month: 3, year: 2025 },
    { item: 'White Mica Sheet', purchased: 255, used: 195, in_stock: 60, po_value: 81600, bill_value: 156000, variance: 0, month: 3, year: 2025 },
    { item: 'Industrial Glue', purchased: 95, used: 70, in_stock: 25, po_value: 42750, bill_value: 0, variance: 0, month: 3, year: 2025 },
    { item: '9.5mm MDF Sheet', purchased: 185, used: 130, in_stock: 55, po_value: 157250, bill_value: 260000, variance: 0, month: 4, year: 2025 },
    { item: 'White Mica Sheet', purchased: 265, used: 200, in_stock: 65, po_value: 84800, bill_value: 160000, variance: 0, month: 4, year: 2025 },
    { item: '9.5mm MDF Sheet', purchased: 170, used: 120, in_stock: 50, po_value: 144500, bill_value: 240000, variance: 0, month: 5, year: 2025 },
    { item: 'White Mica Sheet', purchased: 250, used: 190, in_stock: 60, po_value: 80000, bill_value: 152000, variance: 0, month: 5, year: 2025 },
    { item: '9.5mm MDF Sheet', purchased: 195, used: 140, in_stock: 55, po_value: 165750, bill_value: 280000, variance: 0, month: 6, year: 2025 },
    { item: 'White Mica Sheet', purchased: 275, used: 210, in_stock: 65, po_value: 88000, bill_value: 168000, variance: 0, month: 6, year: 2025 },
    { item: 'Industrial Glue', purchased: 88, used: 63, in_stock: 25, po_value: 39600, bill_value: 0, variance: 0, month: 6, year: 2025 },
    { item: '9.5mm MDF Sheet', purchased: 205, used: 150, in_stock: 55, po_value: 174250, bill_value: 300000, variance: 0, month: 7, year: 2025 },
    { item: 'White Mica Sheet', purchased: 290, used: 225, in_stock: 65, po_value: 92800, bill_value: 180000, variance: 0, month: 7, year: 2025 },
    { item: '9.5mm MDF Sheet', purchased: 175, used: 125, in_stock: 50, po_value: 148750, bill_value: 250000, variance: 0, month: 8, year: 2025 },
    { item: 'White Mica Sheet', purchased: 260, used: 200, in_stock: 60, po_value: 83200, bill_value: 160000, variance: 1, month: 8, year: 2025 },
    { item: '9.5mm MDF Sheet', purchased: 190, used: 135, in_stock: 55, po_value: 161500, bill_value: 270000, variance: 0, month: 9, year: 2025 },
    { item: 'White Mica Sheet', purchased: 270, used: 205, in_stock: 65, po_value: 86400, bill_value: 164000, variance: 0, month: 9, year: 2025 },
    { item: 'Industrial Glue', purchased: 92, used: 67, in_stock: 25, po_value: 41400, bill_value: 0, variance: 0, month: 9, year: 2025 },
    { item: '9.5mm MDF Sheet', purchased: 180, used: 130, in_stock: 50, po_value: 153000, bill_value: 260000, variance: 0, month: 10, year: 2025 },
    { item: 'White Mica Sheet', purchased: 265, used: 200, in_stock: 65, po_value: 84800, bill_value: 160000, variance: 0, month: 10, year: 2025 },
    { item: '9.5mm MDF Sheet', purchased: 200, used: 145, in_stock: 55, po_value: 170000, bill_value: 290000, variance: 0, month: 11, year: 2025 },
    { item: 'White Mica Sheet', purchased: 285, used: 215, in_stock: 70, po_value: 91200, bill_value: 172000, variance: 0, month: 11, year: 2025 },
    { item: 'Industrial Glue', purchased: 98, used: 73, in_stock: 25, po_value: 44100, bill_value: 0, variance: 0, month: 11, year: 2025 },
    // 2026 - January
    { item: '9.5mm MDF Sheet', purchased: 150, used: 90, in_stock: 60, po_value: 127500, bill_value: 180000, variance: 0, month: 0, year: 2026 },
    { item: 'White Mica Sheet', purchased: 220, used: 150, in_stock: 70, po_value: 70400, bill_value: 120000, variance: 1, month: 0, year: 2026 },
    { item: 'Industrial Glue', purchased: 80, used: 55, in_stock: 25, po_value: 36000, bill_value: 0, variance: 0, month: 0, year: 2026 },
    // 2026 - February
    { item: '9.5mm MDF Sheet', purchased: 185, used: 130, in_stock: 55, po_value: 157250, bill_value: 260000, variance: 0, month: 1, year: 2026 },
    { item: 'White Mica Sheet', purchased: 260, used: 195, in_stock: 65, po_value: 83200, bill_value: 156000, variance: 0, month: 1, year: 2026 },
    { item: 'Black Mica Sheet', purchased: 200, used: 145, in_stock: 55, po_value: 68000, bill_value: 130500, variance: 0, month: 1, year: 2026 },
    { item: 'Industrial Glue', purchased: 95, used: 72, in_stock: 23, po_value: 42750, bill_value: 0, variance: 0, month: 1, year: 2026 },
    { item: 'Aluminium Edge (6ft)', purchased: 450, used: 340, in_stock: 110, po_value: 67500, bill_value: 0, variance: 0, month: 1, year: 2026 },
    { item: 'Corner Pieces', purchased: 900, used: 720, in_stock: 180, po_value: 27000, bill_value: 0, variance: 1, month: 1, year: 2026 },
  ];

