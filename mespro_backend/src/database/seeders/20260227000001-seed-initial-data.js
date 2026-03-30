'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Seed default feature settings (modules)
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.bulkInsert('feature_settings', [
      { feature_key: 'dashboard', feature_name: 'Dashboard', url: '/dashboard', description: 'Main dashboard and analytics', category: 'core', display_order: 1, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'leads', feature_name: 'Leads', url: '/leads', description: 'Lead management and tracking', category: 'sales', display_order: 2, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'orders', feature_name: 'Orders', url: '/orders', description: 'Order management', category: 'sales', display_order: 3, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'billing', feature_name: 'Billing', url: '/billing', description: 'Invoice and billing management', category: 'finance', display_order: 4, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'production', feature_name: 'Production', url: '/production', description: 'Production board and tracking', category: 'operations', display_order: 5, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'sales', feature_name: 'Sales', url: '/sales', description: 'Sales tracking and targets', category: 'sales', display_order: 6, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'inventory', feature_name: 'Inventory', url: '/inventory', description: 'Inventory management', category: 'operations', display_order: 7, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'stock', feature_name: 'Stock', url: '/stock', description: 'Stock management', category: 'operations', display_order: 8, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'purchase_orders', feature_name: 'Purchase Orders', url: '/purchase-orders', description: 'Purchase order management', category: 'operations', display_order: 9, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'dispatch', feature_name: 'Dispatch', url: '/dispatch', description: 'Dispatch and delivery management', category: 'operations', display_order: 10, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'products', feature_name: 'Products', url: '/products', description: 'Product catalogue management', category: 'core', display_order: 11, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'clients', feature_name: 'Clients', url: '/clients', description: 'Client management', category: 'sales', display_order: 12, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'finance', feature_name: 'Finance', url: '/finance', description: 'Financial management and transactions', category: 'finance', display_order: 13, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'audit', feature_name: 'Audit', url: '/audit', description: 'Audit trail and logging', category: 'core', display_order: 14, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'payroll', feature_name: 'Payroll', url: '/payroll', description: 'Payroll management', category: 'hr', display_order: 15, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'staff', feature_name: 'Staff', url: '/staff', description: 'Staff management', category: 'hr', display_order: 16, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'attendance', feature_name: 'Attendance', url: '/attendance', description: 'Attendance tracking', category: 'hr', display_order: 17, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'vendors', feature_name: 'Vendors', url: '/vendors', description: 'Vendor management', category: 'operations', display_order: 18, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'users', feature_name: 'Users', url: '/users', description: 'User management', category: 'core', display_order: 19, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'reports', feature_name: 'Reports', url: '/reports', description: 'Reports and analytics', category: 'core', display_order: 20, is_active: true, created_at: now, updated_at: now },
      { feature_key: 'settings', feature_name: 'Settings', url: '/settings', description: 'System settings', category: 'core', display_order: 21, is_active: true, created_at: now, updated_at: now },
    ]);

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Seed roles
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.bulkInsert('roles', [
      { id: 1, name: 'admin', description: 'Full system access', color: '#FF6B6B', created_at: now, updated_at: now },
      { id: 2, name: 'manager', description: 'Management access', color: '#4ECDC4', created_at: now, updated_at: now },
      { id: 3, name: 'staff', description: 'Staff access', color: '#45B7D1', created_at: now, updated_at: now },
      { id: 4, name: 'viewer', description: 'Read-only access', color: '#96CEB4', created_at: now, updated_at: now },
      { id: 5, name: 'superadmin', description: 'Full platform access across all businesses', color: '#9B59B6', created_at: now, updated_at: now },
    ]);

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Seed a default business
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.bulkInsert('businesses', [
      {
        id: 1,
        name: 'MES Pro Default',
        logo_url: null,
        logo_storage_type: null,
        logo_s3_key: null,
        logo_local_path: null,
        status: 'Active',
        created_at: now,
        updated_at: now,
      },
    ]);

    // ──────────────────────────────────────────────────────────────────────────
    // 4. Seed Super Admin user (business_id = null)
    // ──────────────────────────────────────────────────────────────────────────
    const superAdminPassword = await bcrypt.hash('super@123', 12);
    await queryInterface.bulkInsert('users', [
      {
        username: 'superadmin',
        name: 'Super Admin',
        email: 'superadmin@mespro.com',
        phone: null,
        password: superAdminPassword,
        role: 'SuperAdmin',
        role_id: 5,
        business_id: null,
        permissions: JSON.stringify([]),
        status: 'Active',
        last_login: null,
        created_at: now,
        updated_at: now,
      },
    ]);

    // ──────────────────────────────────────────────────────────────────────────
    // 5. Seed Admin user (business_id = 1)
    // ──────────────────────────────────────────────────────────────────────────
    const adminPassword = await bcrypt.hash('admin@123', 12);
    await queryInterface.bulkInsert('users', [
      {
        username: 'admin',
        name: 'Admin User',
        email: 'admin@mespro.com',
        phone: null,
        password: adminPassword,
        role: 'Admin',
        role_id: 1,
        business_id: 1,
        permissions: JSON.stringify([]),
        status: 'Active',
        last_login: null,
        created_at: now,
        updated_at: now,
      },
    ]);

    // ──────────────────────────────────────────────────────────────────────────
    // 6. Seed feature setting values for the default business (all enabled)
    // ──────────────────────────────────────────────────────────────────────────
    const featureSettings = await queryInterface.sequelize.query(
      'SELECT id FROM feature_settings ORDER BY id',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const defaultRolePermissions = JSON.stringify({
      admin: true,
      manager: true,
      staff: true,
      viewer: true,
    });

    await queryInterface.bulkInsert('feature_setting_values',
      featureSettings.map((fs) => ({
        business_id: 1,
        feature_setting_id: fs.id,
        is_enabled: true,
        role_permissions: defaultRolePermissions,
        created_at: now,
        updated_at: now,
      }))
    );

    // ──────────────────────────────────────────────────────────────────────────
    // 7. Seed production stage definitions
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.bulkInsert('production_stage_definitions', [
      { id: 1, name: 'Design', sequence: 1, description: 'Design and planning phase', created_at: now, updated_at: now },
      { id: 2, name: 'Material Prep', sequence: 2, description: 'Material preparation and cutting', created_at: now, updated_at: now },
      { id: 3, name: 'Fabrication', sequence: 3, description: 'Main fabrication process', created_at: now, updated_at: now },
      { id: 4, name: 'Welding', sequence: 4, description: 'Welding and joining', created_at: now, updated_at: now },
      { id: 5, name: 'Surface Treatment', sequence: 5, description: 'Surface treatment and coating', created_at: now, updated_at: now },
      { id: 6, name: 'Assembly', sequence: 6, description: 'Final assembly', created_at: now, updated_at: now },
      { id: 7, name: 'Quality Check', sequence: 7, description: 'Quality inspection', created_at: now, updated_at: now },
      { id: 8, name: 'Packaging', sequence: 8, description: 'Packaging for dispatch', created_at: now, updated_at: now },
    ]);
  },

  down: async (queryInterface) => {
    // Reverse order cleanup
    await queryInterface.bulkDelete('production_stage_definitions', null, {});
    await queryInterface.bulkDelete('feature_setting_values', null, {});
    await queryInterface.bulkDelete('users', null, {});
    await queryInterface.bulkDelete('businesses', null, {});
    await queryInterface.bulkDelete('roles', null, {});
    await queryInterface.bulkDelete('feature_settings', null, {});
  },
};
