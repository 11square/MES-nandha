const { Sequelize } = require('sequelize');
const dbConfig = require('../config/database');
const logger = require('../utils/logger');

const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging === false ? false : (msg) => logger.debug(msg),
    define: config.define,
    pool: config.pool || {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000,
    },
  }
);

// Import models
const Role = require('./Role')(sequelize);
const User = require('./User')(sequelize);
const Client = require('./Client')(sequelize);
const Vendor = require('./Vendor')(sequelize);
const Product = require('./Product')(sequelize);
const ProductCategory = require('./ProductCategory')(sequelize);
const ProductMaterial = require('./ProductMaterial')(sequelize);
const Lead = require('./Lead')(sequelize);
const LeadProduct = require('./LeadProduct')(sequelize);
const LeadFollowUp = require('./LeadFollowUp')(sequelize);
const Order = require('./Order')(sequelize);
const OrderProduct = require('./OrderProduct')(sequelize);
const OrderTimeline = require('./OrderTimeline')(sequelize);
const ProductionStageDef = require('./ProductionStageDef')(sequelize);
const ProductionOrder = require('./ProductionOrder')(sequelize);
const ProductionStage = require('./ProductionStage')(sequelize);
const StageMaterialUsed = require('./StageMaterialUsed')(sequelize);
const BillOfMaterial = require('./BillOfMaterial')(sequelize);
const PurchaseOrder = require('./PurchaseOrder')(sequelize);
const PurchaseOrderItem = require('./PurchaseOrderItem')(sequelize);
const RawMaterial = require('./RawMaterial')(sequelize);
const FinishedGood = require('./FinishedGood')(sequelize);
const InventoryTransaction = require('./InventoryTransaction')(sequelize);
const MaterialRequisition = require('./MaterialRequisition')(sequelize);
const StockItem = require('./StockItem')(sequelize);
const Bill = require('./Bill')(sequelize);
const BillItem = require('./BillItem')(sequelize);
const Payment = require('./Payment')(sequelize);
const Transaction = require('./Transaction')(sequelize);
const Dispatch = require('./Dispatch')(sequelize);
const StaffMember = require('./StaffMember')(sequelize);
const Worker = require('./Worker')(sequelize);
const AttendanceRecord = require('./AttendanceRecord')(sequelize);
const PayrollRecord = require('./PayrollRecord')(sequelize);
const Sale = require('./Sale')(sequelize);
const SalesTarget = require('./SalesTarget')(sequelize);
const SalesFollowup = require('./SalesFollowup')(sequelize);
const ClientFollowup = require('./ClientFollowup')(sequelize);
const VendorFollowup = require('./VendorFollowup')(sequelize);
const CreditOutstanding = require('./CreditOutstanding')(sequelize);
const Document = require('./Document')(sequelize);
const Business = require('./Business')(sequelize);
const FeatureSetting = require('./FeatureSetting')(sequelize);
const FeatureSettingValue = require('./FeatureSettingValue')(sequelize);

// ─── Associations ────────────────────────────────────────────────────────────

// Role - User
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role_info' });

// Client - Orders
Client.hasMany(Order, { foreignKey: 'client_id', as: 'orders' });
Order.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

// Client - Bills
Client.hasMany(Bill, { foreignKey: 'client_id', as: 'bills' });
Bill.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

// Client - Followups
Client.hasMany(ClientFollowup, { foreignKey: 'client_id', as: 'followups' });
ClientFollowup.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

// Client - CreditOutstanding
Client.hasMany(CreditOutstanding, { foreignKey: 'client_id', as: 'outstandings' });
CreditOutstanding.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

// Vendor - VendorFollowup
Vendor.hasMany(VendorFollowup, { foreignKey: 'vendor_id', as: 'followups' });
VendorFollowup.belongsTo(Vendor, { foreignKey: 'vendor_id', as: 'vendor' });

// ProductCategory self-referencing (parent/subcategories)
ProductCategory.hasMany(ProductCategory, { foreignKey: 'parent_id', as: 'subcategories' });
ProductCategory.belongsTo(ProductCategory, { foreignKey: 'parent_id', as: 'parent' });

// Product - ProductMaterial
Product.hasMany(ProductMaterial, { foreignKey: 'product_id', as: 'materials' });
ProductMaterial.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Lead - LeadProduct
Lead.hasMany(LeadProduct, { foreignKey: 'lead_id', as: 'products' });
LeadProduct.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });

// Lead - LeadFollowUp
Lead.hasMany(LeadFollowUp, { foreignKey: 'lead_id', as: 'followUps' });
LeadFollowUp.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });

// Lead - Order (conversion)
Lead.hasOne(Order, { foreignKey: 'lead_id', as: 'convertedOrder' });
Order.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });

// Order - OrderProduct
Order.hasMany(OrderProduct, { foreignKey: 'order_id', as: 'products' });
OrderProduct.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// Order - OrderTimeline
Order.hasMany(OrderTimeline, { foreignKey: 'order_id', as: 'timeline' });
OrderTimeline.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// Order - ProductionOrder
Order.hasOne(ProductionOrder, { foreignKey: 'order_id', as: 'productionOrder' });
ProductionOrder.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// Order - BillOfMaterial
Order.hasMany(BillOfMaterial, { foreignKey: 'order_id', as: 'bom' });
BillOfMaterial.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// Order - Dispatch
Order.hasMany(Dispatch, { foreignKey: 'order_id', as: 'dispatches' });
Dispatch.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// Order - Bill
Order.hasOne(Bill, { foreignKey: 'order_id', as: 'bill' });
Bill.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// ProductionOrder - ProductionStage
ProductionOrder.hasMany(ProductionStage, { foreignKey: 'production_order_id', as: 'stages' });
ProductionStage.belongsTo(ProductionOrder, { foreignKey: 'production_order_id', as: 'productionOrder' });

// ProductionStage - StageMaterialUsed
ProductionStage.hasMany(StageMaterialUsed, { foreignKey: 'stage_id', as: 'materialsUsed' });
StageMaterialUsed.belongsTo(ProductionStage, { foreignKey: 'stage_id', as: 'stage' });

// Vendor - PurchaseOrder
Vendor.hasMany(PurchaseOrder, { foreignKey: 'vendor_id', as: 'purchaseOrders' });
PurchaseOrder.belongsTo(Vendor, { foreignKey: 'vendor_id', as: 'vendor' });

// PurchaseOrder - PurchaseOrderItem
PurchaseOrder.hasMany(PurchaseOrderItem, { foreignKey: 'purchase_order_id', as: 'items' });
PurchaseOrderItem.belongsTo(PurchaseOrder, { foreignKey: 'purchase_order_id', as: 'purchaseOrder' });

// Bill - BillItem
Bill.hasMany(BillItem, { foreignKey: 'bill_id', as: 'items' });
BillItem.belongsTo(Bill, { foreignKey: 'bill_id', as: 'bill' });

// Bill - Payment
Bill.hasMany(Payment, { foreignKey: 'bill_id', as: 'payments' });
Payment.belongsTo(Bill, { foreignKey: 'bill_id', as: 'bill' });

// StaffMember - PayrollRecord
StaffMember.hasMany(PayrollRecord, { foreignKey: 'staff_id', as: 'payrollRecords' });
PayrollRecord.belongsTo(StaffMember, { foreignKey: 'staff_id', as: 'staff' });

// Worker - AttendanceRecord
StaffMember.hasMany(AttendanceRecord, { foreignKey: 'staff_id', as: 'attendanceRecords' });
AttendanceRecord.belongsTo(StaffMember, { foreignKey: 'staff_id', as: 'staff' });

// User - Sale
User.hasMany(Sale, { foreignKey: 'sales_person_id', as: 'sales' });
Sale.belongsTo(User, { foreignKey: 'sales_person_id', as: 'salesPerson' });

// User - SalesTarget
User.hasMany(SalesTarget, { foreignKey: 'sales_person_id', as: 'salesTargets' });
SalesTarget.belongsTo(User, { foreignKey: 'sales_person_id', as: 'salesPerson' });

// Bill - CreditOutstanding
Bill.hasOne(CreditOutstanding, { foreignKey: 'bill_id', as: 'outstanding' });
CreditOutstanding.belongsTo(Bill, { foreignKey: 'bill_id', as: 'bill' });

// User - Document
User.hasMany(Document, { foreignKey: 'uploaded_by', as: 'documents' });
Document.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

// Business - User
Business.hasMany(User, { foreignKey: 'business_id', as: 'businessUsers' });
User.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// Business - FeatureSettingValue
Business.hasMany(FeatureSettingValue, { foreignKey: 'business_id', as: 'featureValues' });
FeatureSettingValue.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// FeatureSetting - FeatureSettingValue
FeatureSetting.hasMany(FeatureSettingValue, { foreignKey: 'feature_setting_id', as: 'values' });
FeatureSettingValue.belongsTo(FeatureSetting, { foreignKey: 'feature_setting_id', as: 'featureSetting' });

// Business - All module tables (multi-tenancy)
Business.hasMany(Client, { foreignKey: 'business_id', as: 'clients' });
Client.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(Vendor, { foreignKey: 'business_id', as: 'vendors' });
Vendor.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(Product, { foreignKey: 'business_id', as: 'products' });
Product.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(ProductCategory, { foreignKey: 'business_id', as: 'productCategories' });
ProductCategory.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(Lead, { foreignKey: 'business_id', as: 'leads' });
Lead.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(Order, { foreignKey: 'business_id', as: 'orders' });
Order.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(Bill, { foreignKey: 'business_id', as: 'bills' });
Bill.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(Dispatch, { foreignKey: 'business_id', as: 'dispatches' });
Dispatch.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(StaffMember, { foreignKey: 'business_id', as: 'staffMembers' });
StaffMember.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(Worker, { foreignKey: 'business_id', as: 'workers' });
Worker.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(ProductionOrder, { foreignKey: 'business_id', as: 'productionOrders' });
ProductionOrder.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(PurchaseOrder, { foreignKey: 'business_id', as: 'purchaseOrders' });
PurchaseOrder.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(RawMaterial, { foreignKey: 'business_id', as: 'rawMaterials' });
RawMaterial.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(FinishedGood, { foreignKey: 'business_id', as: 'finishedGoods' });
FinishedGood.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(StockItem, { foreignKey: 'business_id', as: 'stockItems' });
StockItem.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(Sale, { foreignKey: 'business_id', as: 'sales' });
Sale.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(SalesTarget, { foreignKey: 'business_id', as: 'salesTargets' });
SalesTarget.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(SalesFollowup, { foreignKey: 'business_id', as: 'salesFollowups' });
SalesFollowup.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(Transaction, { foreignKey: 'business_id', as: 'transactions' });
Transaction.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(Document, { foreignKey: 'business_id', as: 'documents' });
Document.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(MaterialRequisition, { foreignKey: 'business_id', as: 'materialRequisitions' });
MaterialRequisition.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(InventoryTransaction, { foreignKey: 'business_id', as: 'inventoryTransactions' });
InventoryTransaction.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(PayrollRecord, { foreignKey: 'business_id', as: 'payrollRecords' });
PayrollRecord.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

Business.hasMany(AttendanceRecord, { foreignKey: 'business_id', as: 'attendanceRecords' });
AttendanceRecord.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

// ─── Export ──────────────────────────────────────────────────────────────────

const db = {
  sequelize,
  Sequelize,
  Role,
  User,
  Client,
  Vendor,
  Product,
  ProductCategory,
  ProductMaterial,
  Lead,
  LeadProduct,
  LeadFollowUp,
  Order,
  OrderProduct,
  OrderTimeline,
  ProductionStageDef,
  ProductionOrder,
  ProductionStage,
  StageMaterialUsed,
  BillOfMaterial,
  PurchaseOrder,
  PurchaseOrderItem,
  RawMaterial,
  FinishedGood,
  InventoryTransaction,
  MaterialRequisition,
  StockItem,
  Bill,
  BillItem,
  Payment,
  Transaction,
  Dispatch,
  StaffMember,
  Worker,
  AttendanceRecord,
  PayrollRecord,
  Sale,
  SalesTarget,
  SalesFollowup,
  ClientFollowup,
  VendorFollowup,
  CreditOutstanding,
  Document,
  Business,
  FeatureSetting,
  FeatureSettingValue,
};

module.exports = db;
