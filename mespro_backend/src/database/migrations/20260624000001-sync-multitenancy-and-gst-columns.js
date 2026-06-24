'use strict';

/**
 * Schema-sync migration.
 *
 * Several feature commits (multi-tenancy `business_id`, and the
 * gst_number/state/district fields) were added by EDITING the original
 * `20260227000001-create-all-tables` migration in place instead of adding new
 * migrations. Any database that had already run the original migration never
 * received those columns — so the application code (which now writes them)
 * fails on INSERT with "Unknown column ...", surfacing as HTTP 500 on create.
 *
 * This migration brings such databases up to date. Every column is added only
 * if missing, so it is safe to run on a fresh DB (where the columns already
 * exist — it becomes a no-op) and on a stale production DB alike.
 *
 * `business_id` is added as a plain nullable INTEGER (no FK constraint) to keep
 * the migration robust against pre-existing rows; the association is enforced at
 * the application layer via businessScope.
 */

// Tables that carry a business_id (multi-tenancy scope column).
const BUSINESS_ID_TABLES = [
  'roles', 'users', 'clients', 'vendors', 'products', 'product_categories',
  'leads', 'orders', 'production_orders', 'purchase_orders', 'raw_materials',
  'finished_goods', 'inventory_transactions', 'material_requisitions',
  'stock_items', 'bills', 'payments', 'transactions', 'dispatches',
  'staff_members', 'workers', 'attendance_records', 'payroll_records',
  'sales', 'sales_targets', 'sales_followups', 'client_followups',
  'vendor_followups', 'credit_outstandings', 'documents',
  'feature_setting_values',
];

// gst_number / state / district were added to these tables.
const GST_TABLES = ['orders', 'leads', 'bills'];

const GST_COLUMNS = {
  gst_number: (Sequelize) => ({ type: Sequelize.STRING(20), allowNull: true }),
  state: (Sequelize) => ({ type: Sequelize.STRING(50), allowNull: true }),
  district: (Sequelize) => ({ type: Sequelize.STRING(50), allowNull: true }),
};

async function tableExists(queryInterface, table) {
  try {
    await queryInterface.describeTable(table);
    return true;
  } catch (e) {
    return false;
  }
}

async function columnExists(queryInterface, table, column) {
  const desc = await queryInterface.describeTable(table);
  return Object.prototype.hasOwnProperty.call(desc, column);
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. business_id on every multi-tenant table.
    for (const table of BUSINESS_ID_TABLES) {
      if (!(await tableExists(queryInterface, table))) continue;
      if (!(await columnExists(queryInterface, table, 'business_id'))) {
        await queryInterface.addColumn(table, 'business_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
        });
      }
    }

    // 2. gst_number / state / district on orders, leads, bills.
    for (const table of GST_TABLES) {
      if (!(await tableExists(queryInterface, table))) continue;
      for (const [name, build] of Object.entries(GST_COLUMNS)) {
        if (!(await columnExists(queryInterface, table, name))) {
          await queryInterface.addColumn(table, name, build(Sequelize));
        }
      }
    }
  },

  down: async (queryInterface) => {
    for (const table of GST_TABLES) {
      if (!(await tableExists(queryInterface, table))) continue;
      for (const name of Object.keys(GST_COLUMNS)) {
        if (await columnExists(queryInterface, table, name)) {
          await queryInterface.removeColumn(table, name);
        }
      }
    }
    for (const table of BUSINESS_ID_TABLES) {
      if (!(await tableExists(queryInterface, table))) continue;
      if (await columnExists(queryInterface, table, 'business_id')) {
        await queryInterface.removeColumn(table, 'business_id');
      }
    }
  },
};
