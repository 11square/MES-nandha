'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ──────────────────────────────────────────────────────────────────────────
    // 1. businesses
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('businesses', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      logo_url: { type: Sequelize.STRING(500), allowNull: true },
      logo_storage_type: { type: Sequelize.ENUM('local', 's3'), allowNull: true },
      logo_s3_key: { type: Sequelize.STRING(500), allowNull: true },
      logo_local_path: { type: Sequelize.STRING(500), allowNull: true },
      status: { type: Sequelize.ENUM('Active', 'Inactive'), allowNull: false, defaultValue: 'Active' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 2. feature_settings
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('feature_settings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      feature_key: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      feature_name: { type: Sequelize.STRING(150), allowNull: false },
      url: { type: Sequelize.STRING(200), allowNull: true },
      description: { type: Sequelize.STRING(500), allowNull: true },
      category: { type: Sequelize.STRING(100), allowNull: true, defaultValue: 'general' },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      display_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 3. feature_setting_values
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('feature_setting_values', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      business_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      feature_setting_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'feature_settings', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      is_enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      role_permissions: { type: Sequelize.JSON, allowNull: true, defaultValue: null },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('feature_setting_values', ['business_id', 'feature_setting_id'], {
      unique: true,
      name: 'idx_fsv_business_feature_unique',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 4. roles
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('roles', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      description: { type: Sequelize.STRING(255), allowNull: true },
      color: { type: Sequelize.STRING(100), allowNull: true },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 5. users
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('users', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      username: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      phone: { type: Sequelize.STRING(20), allowNull: true },
      password: { type: Sequelize.STRING(255), allowNull: false },
      role: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'Sales' },
      role_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'roles', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      permissions: { type: Sequelize.JSON, allowNull: true, defaultValue: '[]' },
      status: { type: Sequelize.ENUM('Active', 'Inactive'), allowNull: false, defaultValue: 'Active' },
      last_login: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 6. clients
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('clients', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      contact_person: { type: Sequelize.STRING(100), allowNull: true },
      phone: { type: Sequelize.STRING(20), allowNull: true },
      email: { type: Sequelize.STRING(100), allowNull: true },
      address: { type: Sequelize.TEXT, allowNull: true },
      gst_number: { type: Sequelize.STRING(20), allowNull: true },
      state: { type: Sequelize.STRING(50), allowNull: true },
      district: { type: Sequelize.STRING(50), allowNull: true },
      total_orders: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      total_value: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      status: { type: Sequelize.ENUM('Active', 'Inactive'), allowNull: false, defaultValue: 'Active' },
      last_order: { type: Sequelize.DATEONLY, allowNull: true },
      join_date: { type: Sequelize.DATEONLY, allowNull: true },
      rating: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 1 },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 7. vendors
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('vendors', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      contact_person: { type: Sequelize.STRING(100), allowNull: true },
      email: { type: Sequelize.STRING(100), allowNull: true },
      phone: { type: Sequelize.STRING(20), allowNull: true },
      address: { type: Sequelize.TEXT, allowNull: true },
      category: { type: Sequelize.STRING(50), allowNull: true },
      gst_number: { type: Sequelize.STRING(20), allowNull: true },
      total_purchases: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      total_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      outstanding_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      last_purchase_date: { type: Sequelize.DATEONLY, allowNull: true },
      status: { type: Sequelize.ENUM('Active', 'Inactive'), allowNull: false, defaultValue: 'Active' },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 8. products
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('products', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(200), allowNull: false },
      sku: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      category: { type: Sequelize.STRING(50), allowNull: true },
      subcategory: { type: Sequelize.STRING(50), allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      base_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      selling_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      stock: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      min_stock: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      unit: { type: Sequelize.STRING(20), allowNull: true, defaultValue: 'pcs' },
      production_time: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      labor_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: true, defaultValue: 0 },
      overhead_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: true, defaultValue: 0 },
      status: { type: Sequelize.ENUM('active', 'inactive', 'discontinued'), allowNull: false, defaultValue: 'active' },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 9. product_materials
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('product_materials', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      product_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'products', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      material_name: { type: Sequelize.STRING(150), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 10. leads
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('leads', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      lead_number: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      source: { type: Sequelize.STRING(30), allowNull: true },
      customer: { type: Sequelize.STRING(150), allowNull: false },
      contact: { type: Sequelize.STRING(100), allowNull: true },
      mobile: { type: Sequelize.STRING(20), allowNull: true },
      email: { type: Sequelize.STRING(100), allowNull: true },
      address: { type: Sequelize.TEXT, allowNull: true },
      category: { type: Sequelize.STRING(50), allowNull: true },
      product: { type: Sequelize.STRING(100), allowNull: true },
      size: { type: Sequelize.STRING(30), allowNull: true },
      quantity: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      required_date: { type: Sequelize.DATEONLY, allowNull: true },
      status: { type: Sequelize.ENUM('New', 'Contacted', 'Qualified', 'Negotiation', 'Converted', 'Rejected', 'Lost'), allowNull: false, defaultValue: 'New' },
      conversion_status: { type: Sequelize.ENUM('None', 'Converted', 'Not Converted'), allowNull: false, defaultValue: 'None' },
      description: { type: Sequelize.TEXT, allowNull: true },
      assigned_to: { type: Sequelize.STRING(100), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      gst_number: { type: Sequelize.STRING(20), allowNull: true },
      state: { type: Sequelize.STRING(50), allowNull: true },
      district: { type: Sequelize.STRING(50), allowNull: true },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 11. lead_products
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('lead_products', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      lead_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'leads', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      product: { type: Sequelize.STRING(100), allowNull: false },
      category: { type: Sequelize.STRING(50), allowNull: true },
      subcategory: { type: Sequelize.STRING(50), allowNull: true },
      size: { type: Sequelize.STRING(30), allowNull: true },
      quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      unit: { type: Sequelize.STRING(20), allowNull: true, defaultValue: 'pcs' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 12. lead_follow_ups
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('lead_follow_ups', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      lead_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'leads', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      scheduled_time: { type: Sequelize.STRING(10), allowNull: true },
      note: { type: Sequelize.TEXT, allowNull: true },
      done_by: { type: Sequelize.STRING(100), allowNull: true },
      status: { type: Sequelize.ENUM('upcoming', 'completed'), allowNull: false, defaultValue: 'upcoming' },
      activity_type: { type: Sequelize.STRING(30), allowNull: true },
      priority: { type: Sequelize.STRING(20), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 13. orders
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('orders', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      order_number: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      lead_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'leads', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      lead_number: { type: Sequelize.STRING(30), allowNull: true },
      client_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'clients', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      customer: { type: Sequelize.STRING(150), allowNull: false },
      contact: { type: Sequelize.STRING(100), allowNull: true },
      mobile: { type: Sequelize.STRING(20), allowNull: true },
      email: { type: Sequelize.STRING(100), allowNull: true },
      address: { type: Sequelize.TEXT, allowNull: true },
      product: { type: Sequelize.STRING(100), allowNull: true },
      size: { type: Sequelize.STRING(30), allowNull: true },
      quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      unit_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      discount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      gst_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      tax_rate: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 18 },
      grand_total: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      required_date: { type: Sequelize.DATEONLY, allowNull: true },
      status: { type: Sequelize.ENUM('Pending', 'Confirmed', 'In Production', 'Ready', 'Dispatched', 'Delivered', 'Bill', 'Cancelled'), allowNull: false, defaultValue: 'Pending' },
      payment_status: { type: Sequelize.ENUM('Unpaid', 'Partial', 'Paid'), allowNull: false, defaultValue: 'Unpaid' },
      priority: { type: Sequelize.ENUM('High', 'Medium', 'Low'), allowNull: false, defaultValue: 'Medium' },
      source: { type: Sequelize.STRING(30), allowNull: true },
      assigned_to: { type: Sequelize.STRING(100), allowNull: true },
      converted_date: { type: Sequelize.DATEONLY, allowNull: true },
      converted_by: { type: Sequelize.STRING(100), allowNull: true },
      needs_production: { type: Sequelize.ENUM('yes', 'no'), allowNull: false, defaultValue: 'yes' },
      sent_to_production: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      notes: { type: Sequelize.TEXT, allowNull: true },
      gst_number: { type: Sequelize.STRING(20), allowNull: true },
      state: { type: Sequelize.STRING(50), allowNull: true },
      district: { type: Sequelize.STRING(50), allowNull: true },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 14. order_products
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('order_products', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      order_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      product: { type: Sequelize.STRING(100), allowNull: false },
      category: { type: Sequelize.STRING(50), allowNull: true },
      subcategory: { type: Sequelize.STRING(50), allowNull: true },
      size: { type: Sequelize.STRING(30), allowNull: true },
      quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      unit: { type: Sequelize.STRING(20), allowNull: true, defaultValue: 'pcs' },
      rate: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 15. order_timeline
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('order_timeline', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      order_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      action: { type: Sequelize.STRING(255), allowNull: false },
      done_by: { type: Sequelize.STRING(100), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 16. production_stage_definitions
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('production_stage_definitions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      sequence: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 17. production_orders
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('production_orders', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      order_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      order_number: { type: Sequelize.STRING(30), allowNull: true },
      customer: { type: Sequelize.STRING(150), allowNull: true },
      product: { type: Sequelize.STRING(100), allowNull: true },
      size: { type: Sequelize.STRING(30), allowNull: true },
      quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      current_stage: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      stage_name: { type: Sequelize.STRING(100), allowNull: true },
      progress: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      priority: { type: Sequelize.ENUM('High', 'Medium', 'Low'), allowNull: false, defaultValue: 'Medium' },
      due_date: { type: Sequelize.DATEONLY, allowNull: true },
      started_at: { type: Sequelize.DATEONLY, allowNull: true },
      assigned_to: { type: Sequelize.STRING(100), allowNull: true },
      estimated_completion: { type: Sequelize.DATEONLY, allowNull: true },
      qc_status: { type: Sequelize.ENUM('Pass', 'Fail', 'Pending'), allowNull: false, defaultValue: 'Pending' },
      delay_risk: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      status: { type: Sequelize.ENUM('Pending', 'In Progress', 'Completed', 'On Hold'), allowNull: false, defaultValue: 'Pending' },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 18. production_stages
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('production_stages', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      production_order_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'production_orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      stage_number: { type: Sequelize.INTEGER, allowNull: false },
      name: { type: Sequelize.STRING(100), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.ENUM('completed', 'in-progress', 'pending'), allowNull: false, defaultValue: 'pending' },
      started_at: { type: Sequelize.DATE, allowNull: true },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      operator: { type: Sequelize.STRING(100), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      qc_passed: { type: Sequelize.BOOLEAN, allowNull: true },
      photos: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 19. stage_materials_used
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('stage_materials_used', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      stage_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'production_stages', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      material: { type: Sequelize.STRING(150), allowNull: false },
      quantity: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 20. bill_of_materials
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('bill_of_materials', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      order_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      material: { type: Sequelize.STRING(150), allowNull: false },
      quantity_per_unit: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 1 },
      total_required: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      unit: { type: Sequelize.STRING(20), allowNull: true },
      in_stock: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      status: { type: Sequelize.ENUM('available', 'low', 'unavailable'), allowNull: false, defaultValue: 'available' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 21. purchase_orders
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('purchase_orders', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      po_number: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      vendor_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'vendors', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      vendor_name: { type: Sequelize.STRING(150), allowNull: false },
      vendor_contact: { type: Sequelize.STRING(20), allowNull: true },
      vendor_email: { type: Sequelize.STRING(100), allowNull: true },
      vendor_address: { type: Sequelize.TEXT, allowNull: true },
      vendor_gst: { type: Sequelize.STRING(20), allowNull: true },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      expected_delivery: { type: Sequelize.DATEONLY, allowNull: true },
      total_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      status: { type: Sequelize.ENUM('draft', 'pending', 'approved', 'ordered', 'received', 'cancelled'), allowNull: false, defaultValue: 'draft' },
      is_gst: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      payment_terms: { type: Sequelize.STRING(100), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_by: { type: Sequelize.STRING(100), allowNull: true },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 22. purchase_order_items
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('purchase_order_items', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      purchase_order_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'purchase_orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      name: { type: Sequelize.STRING(150), allowNull: false },
      quantity: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 1 },
      unit: { type: Sequelize.STRING(20), allowNull: true },
      rate: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 23. raw_materials
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('raw_materials', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      stock: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      reorder_point: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      unit: { type: Sequelize.STRING(20), allowNull: true },
      location: { type: Sequelize.STRING(100), allowNull: true },
      last_received: { type: Sequelize.DATEONLY, allowNull: true },
      supplier: { type: Sequelize.STRING(150), allowNull: true },
      cost_per_unit: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      status: { type: Sequelize.ENUM('ok', 'low', 'critical'), allowNull: false, defaultValue: 'ok' },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 24. finished_goods
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('finished_goods', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      product: { type: Sequelize.STRING(150), allowNull: false },
      stock: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      unit: { type: Sequelize.STRING(20), allowNull: true },
      location: { type: Sequelize.STRING(100), allowNull: true },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 25. inventory_transactions
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('inventory_transactions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      type: { type: Sequelize.ENUM('in', 'out'), allowNull: false },
      material: { type: Sequelize.STRING(150), allowNull: false },
      quantity: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      reference: { type: Sequelize.STRING(100), allowNull: true },
      done_by: { type: Sequelize.STRING(100), allowNull: true },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 26. material_requisitions
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('material_requisitions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      requisition_number: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      material: { type: Sequelize.STRING(150), allowNull: false },
      quantity: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      requested_by: { type: Sequelize.STRING(100), allowNull: true },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      status: { type: Sequelize.ENUM('Pending', 'Approved', 'Rejected', 'Fulfilled'), allowNull: false, defaultValue: 'Pending' },
      priority: { type: Sequelize.ENUM('High', 'Medium', 'Low'), allowNull: false, defaultValue: 'Medium' },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 27. stock_items
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('stock_items', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      category: { type: Sequelize.STRING(50), allowNull: true },
      subcategory: { type: Sequelize.STRING(50), allowNull: true },
      sku: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      current_stock: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      reorder_level: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      unit: { type: Sequelize.STRING(20), allowNull: true },
      unit_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      buying_price: { type: Sequelize.DECIMAL(12, 2), allowNull: true, defaultValue: 0 },
      selling_price: { type: Sequelize.DECIMAL(12, 2), allowNull: true, defaultValue: 0 },
      supplier: { type: Sequelize.STRING(150), allowNull: true },
      last_restocked: { type: Sequelize.DATEONLY, allowNull: true },
      status: { type: Sequelize.ENUM('In Stock', 'Low Stock', 'Critical', 'Out of Stock'), allowNull: false, defaultValue: 'In Stock' },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 28. bills
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('bills', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      bill_no: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      client_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'clients', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      order_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      client_name: { type: Sequelize.STRING(150), allowNull: false },
      client_address: { type: Sequelize.TEXT, allowNull: true },
      client_gst: { type: Sequelize.STRING(20), allowNull: true },
      subtotal: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      total_discount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      gst_rate: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 18 },
      total_tax: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      grand_total: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      payment_status: { type: Sequelize.ENUM('paid', 'partial', 'pending', 'overdue'), allowNull: false, defaultValue: 'pending' },
      payment_type: { type: Sequelize.ENUM('cash', 'credit'), allowNull: false, defaultValue: 'cash' },
      payment_method: { type: Sequelize.STRING(30), allowNull: true },
      paid_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      due_date: { type: Sequelize.DATEONLY, allowNull: true },
      created_by: { type: Sequelize.STRING(100), allowNull: true },
      state: { type: Sequelize.STRING(50), allowNull: true },
      district: { type: Sequelize.STRING(50), allowNull: true },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 29. bill_items
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('bill_items', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      bill_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'bills', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      item_id: { type: Sequelize.STRING(30), allowNull: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      category: { type: Sequelize.STRING(50), allowNull: true },
      subcategory: { type: Sequelize.STRING(50), allowNull: true },
      size: { type: Sequelize.STRING(30), allowNull: true },
      quantity: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 1 },
      unit: { type: Sequelize.STRING(20), allowNull: true },
      unit_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      discount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      tax: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 30. payments
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('payments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      bill_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'bills', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      bill_no: { type: Sequelize.STRING(30), allowNull: true },
      client_name: { type: Sequelize.STRING(150), allowNull: true },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      method: { type: Sequelize.ENUM('cash', 'upi', 'card', 'bank', 'cheque'), allowNull: false, defaultValue: 'cash' },
      reference: { type: Sequelize.STRING(100), allowNull: true },
      received_by: { type: Sequelize.STRING(100), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.ENUM('completed', 'pending', 'cancelled'), allowNull: false, defaultValue: 'completed' },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 31. transactions
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('transactions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      type: { type: Sequelize.ENUM('income', 'expense'), allowNull: false },
      category: { type: Sequelize.STRING(50), allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      payment_method: { type: Sequelize.STRING(30), allowNull: true },
      reference: { type: Sequelize.STRING(100), allowNull: true },
      client_name: { type: Sequelize.STRING(150), allowNull: true },
      client_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'clients', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      gst_number: { type: Sequelize.STRING(20), allowNull: true },
      mobile_number: { type: Sequelize.STRING(20), allowNull: true },
      address: { type: Sequelize.TEXT, allowNull: true },
      payment_type: { type: Sequelize.STRING(20), allowNull: true },
      status: { type: Sequelize.ENUM('completed', 'pending', 'cancelled'), allowNull: false, defaultValue: 'completed' },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 32. credit_outstandings
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('credit_outstandings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      bill_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'bills', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      bill_no: { type: Sequelize.STRING(30), allowNull: true },
      client_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'clients', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      client_name: { type: Sequelize.STRING(150), allowNull: true },
      date: { type: Sequelize.DATEONLY, allowNull: true },
      grand_total: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      paid_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      balance: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      due_date: { type: Sequelize.DATEONLY, allowNull: true },
      days_overdue: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      status: { type: Sequelize.ENUM('partial', 'overdue', 'pending', 'cleared'), allowNull: false, defaultValue: 'pending' },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 33. dispatches
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('dispatches', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      order_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      dispatch_type: { type: Sequelize.ENUM('stock'), allowNull: false, defaultValue: 'stock' },
      customer: { type: Sequelize.STRING(150), allowNull: true },
      product: { type: Sequelize.STRING(200), allowNull: true },
      quantity: { type: Sequelize.INTEGER, allowNull: true },
      lr_number: { type: Sequelize.STRING(50), allowNull: true },
      transporter: { type: Sequelize.STRING(100), allowNull: true },
      vehicle_no: { type: Sequelize.STRING(30), allowNull: true },
      driver_name: { type: Sequelize.STRING(100), allowNull: true },
      driver_phone: { type: Sequelize.STRING(20), allowNull: true },
      status: { type: Sequelize.ENUM('Ready to Dispatch', 'In Transit', 'Delivered', 'Returned'), allowNull: false, defaultValue: 'Ready to Dispatch' },
      dispatch_date: { type: Sequelize.DATEONLY, allowNull: true },
      expected_delivery: { type: Sequelize.DATEONLY, allowNull: true },
      delivered_date: { type: Sequelize.DATEONLY, allowNull: true },
      address: { type: Sequelize.TEXT, allowNull: true },
      lr_image: { type: Sequelize.STRING(255), allowNull: true },
      invoice_no: { type: Sequelize.STRING(50), allowNull: true },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 34. staff_members
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('staff_members', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      role: { type: Sequelize.STRING(50), allowNull: true },
      department: { type: Sequelize.STRING(50), allowNull: true },
      phone: { type: Sequelize.STRING(20), allowNull: true },
      email: { type: Sequelize.STRING(100), allowNull: true },
      join_date: { type: Sequelize.DATEONLY, allowNull: true },
      status: { type: Sequelize.ENUM('Active', 'Inactive', 'On Leave'), allowNull: false, defaultValue: 'Active' },
      shift: { type: Sequelize.STRING(20), allowNull: true },
      location: { type: Sequelize.STRING(100), allowNull: true },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 35. workers
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('workers', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      role: { type: Sequelize.STRING(50), allowNull: true },
      team: { type: Sequelize.STRING(30), allowNull: true },
      shift: { type: Sequelize.STRING(20), allowNull: true },
      mobile: { type: Sequelize.STRING(20), allowNull: true },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 36. attendance_records
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('attendance_records', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      staff_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'staff_members', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      present: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      check_in: { type: Sequelize.TIME, allowNull: true },
      check_out: { type: Sequelize.TIME, allowNull: true },
      hours: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('attendance_records', ['staff_id', 'date'], {
      unique: true,
      name: 'attendance_records_staff_id_date',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 37. payroll_records
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('payroll_records', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      staff_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'staff_members', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      employee_name: { type: Sequelize.STRING(100), allowNull: true },
      department: { type: Sequelize.STRING(50), allowNull: true },
      pay_period: { type: Sequelize.STRING(20), allowNull: true },
      basic_salary: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      allowances: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      deductions: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      net_salary: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      status: { type: Sequelize.ENUM('Paid', 'Pending', 'Processing'), allowNull: false, defaultValue: 'Pending' },
      payment_date: { type: Sequelize.DATEONLY, allowNull: true },
      payment_method: { type: Sequelize.STRING(30), allowNull: true, defaultValue: 'Bank Transfer' },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 38. sales
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('sales', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      client_name: { type: Sequelize.STRING(150), allowNull: true },
      client_contact: { type: Sequelize.STRING(20), allowNull: true },
      product_details: { type: Sequelize.STRING(200), allowNull: true },
      quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      unit_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      status: { type: Sequelize.ENUM('pending', 'confirmed', 'delivered', 'cancelled'), allowNull: false, defaultValue: 'pending' },
      payment_status: { type: Sequelize.ENUM('unpaid', 'partial', 'paid'), allowNull: false, defaultValue: 'unpaid' },
      sales_person_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      sales_person: { type: Sequelize.STRING(100), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 39. sales_targets
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('sales_targets', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      sales_person_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      sales_person: { type: Sequelize.STRING(100), allowNull: true },
      month: { type: Sequelize.STRING(20), allowNull: false },
      target: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      achieved: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      percentage: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 40. sales_followups
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('sales_followups', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      client_name: { type: Sequelize.STRING(150), allowNull: true },
      client_contact: { type: Sequelize.STRING(20), allowNull: true },
      last_contact: { type: Sequelize.DATEONLY, allowNull: true },
      next_followup: { type: Sequelize.DATEONLY, allowNull: true },
      status: { type: Sequelize.ENUM('hot', 'warm', 'cold'), allowNull: false, defaultValue: 'warm' },
      sales_person: { type: Sequelize.STRING(100), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      potential_value: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 41. client_followups
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('client_followups', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      client_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'clients', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      type: { type: Sequelize.ENUM('Call', 'Email', 'Meeting', 'Visit'), allowNull: false, defaultValue: 'Call' },
      subject: { type: Sequelize.STRING(200), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      priority: { type: Sequelize.ENUM('High', 'Medium', 'Low'), allowNull: false, defaultValue: 'Medium' },
      status: { type: Sequelize.ENUM('Pending', 'Completed', 'Cancelled'), allowNull: false, defaultValue: 'Pending' },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 42. documents
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('documents', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      original_name: { type: Sequelize.STRING(255), allowNull: false },
      stored_name: { type: Sequelize.STRING(255), allowNull: false },
      mime_type: { type: Sequelize.STRING(100), allowNull: false },
      size: { type: Sequelize.INTEGER, allowNull: false },
      storage_type: { type: Sequelize.ENUM('local', 's3'), allowNull: false, defaultValue: 'local' },
      s3_bucket: { type: Sequelize.STRING(255), allowNull: true },
      s3_key: { type: Sequelize.STRING(500), allowNull: true },
      s3_url: { type: Sequelize.STRING(1000), allowNull: true },
      local_path: { type: Sequelize.STRING(500), allowNull: true },
      category: { type: Sequelize.ENUM('invoice', 'purchase_order', 'quotation', 'delivery_note', 'contract', 'other'), allowNull: false, defaultValue: 'other' },
      entity_type: { type: Sequelize.STRING(50), allowNull: true },
      entity_id: { type: Sequelize.INTEGER, allowNull: true },
      uploaded_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      description: { type: Sequelize.TEXT, allowNull: true },
      extracted_data: { type: Sequelize.JSON, allowNull: true },
      status: { type: Sequelize.ENUM('uploaded', 'processing', 'processed', 'failed'), allowNull: false, defaultValue: 'uploaded' },
      business_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Indexes for performance
    // ──────────────────────────────────────────────────────────────────────────
    await queryInterface.addIndex('users', ['business_id'], { name: 'idx_users_business_id' });
    await queryInterface.addIndex('users', ['role_id'], { name: 'idx_users_role_id' });
    await queryInterface.addIndex('clients', ['business_id'], { name: 'idx_clients_business_id' });
    await queryInterface.addIndex('vendors', ['business_id'], { name: 'idx_vendors_business_id' });
    await queryInterface.addIndex('products', ['business_id'], { name: 'idx_products_business_id' });
    await queryInterface.addIndex('leads', ['business_id'], { name: 'idx_leads_business_id' });
    await queryInterface.addIndex('leads', ['status'], { name: 'idx_leads_status' });
    await queryInterface.addIndex('orders', ['business_id'], { name: 'idx_orders_business_id' });
    await queryInterface.addIndex('orders', ['client_id'], { name: 'idx_orders_client_id' });
    await queryInterface.addIndex('orders', ['status'], { name: 'idx_orders_status' });
    await queryInterface.addIndex('bills', ['business_id'], { name: 'idx_bills_business_id' });
    await queryInterface.addIndex('bills', ['client_id'], { name: 'idx_bills_client_id' });
    await queryInterface.addIndex('bills', ['order_id'], { name: 'idx_bills_order_id' });
    await queryInterface.addIndex('production_orders', ['business_id'], { name: 'idx_production_orders_business_id' });
    await queryInterface.addIndex('production_orders', ['order_id'], { name: 'idx_production_orders_order_id' });
    await queryInterface.addIndex('purchase_orders', ['business_id'], { name: 'idx_purchase_orders_business_id' });
    await queryInterface.addIndex('purchase_orders', ['vendor_id'], { name: 'idx_purchase_orders_vendor_id' });
    await queryInterface.addIndex('dispatches', ['business_id'], { name: 'idx_dispatches_business_id' });
    await queryInterface.addIndex('dispatches', ['order_id'], { name: 'idx_dispatches_order_id' });
    await queryInterface.addIndex('staff_members', ['business_id'], { name: 'idx_staff_members_business_id' });
    await queryInterface.addIndex('sales', ['business_id'], { name: 'idx_sales_business_id' });
    await queryInterface.addIndex('transactions', ['business_id'], { name: 'idx_transactions_business_id' });
    await queryInterface.addIndex('documents', ['business_id'], { name: 'idx_documents_business_id' });
    await queryInterface.addIndex('documents', ['uploaded_by'], { name: 'idx_documents_uploaded_by' });
    await queryInterface.addIndex('payments', ['bill_id'], { name: 'idx_payments_bill_id' });
    await queryInterface.addIndex('credit_outstandings', ['client_id'], { name: 'idx_credit_outstandings_client_id' });
    await queryInterface.addIndex('credit_outstandings', ['bill_id'], { name: 'idx_credit_outstandings_bill_id' });
  },

  down: async (queryInterface) => {
    // Drop in reverse order to respect foreign key dependencies
    const tables = [
      'documents',
      'client_followups',
      'sales_followups',
      'sales_targets',
      'sales',
      'payroll_records',
      'attendance_records',
      'workers',
      'staff_members',
      'dispatches',
      'credit_outstandings',
      'transactions',
      'payments',
      'bill_items',
      'bills',
      'stock_items',
      'material_requisitions',
      'inventory_transactions',
      'finished_goods',
      'raw_materials',
      'purchase_order_items',
      'purchase_orders',
      'bill_of_materials',
      'stage_materials_used',
      'production_stages',
      'production_orders',
      'production_stage_definitions',
      'order_timeline',
      'order_products',
      'orders',
      'lead_follow_ups',
      'lead_products',
      'leads',
      'product_materials',
      'products',
      'vendors',
      'clients',
      'users',
      'roles',
      'feature_setting_values',
      'feature_settings',
      'businesses',
    ];

    for (const table of tables) {
      await queryInterface.dropTable(table, { cascade: true });
    }
  },
};
