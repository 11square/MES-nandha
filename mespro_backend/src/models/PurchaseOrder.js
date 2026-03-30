const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PurchaseOrder = sequelize.define('PurchaseOrder', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    po_number: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    vendor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'vendors', key: 'id' },
    },
    vendor_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    vendor_contact: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    vendor_email: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    vendor_address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    vendor_gst: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    expected_delivery: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    total_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('draft', 'pending', 'approved', 'ordered', 'received', 'cancelled'),
      allowNull: false,
      defaultValue: 'draft',
    },
    is_gst: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    payment_terms: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    business_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'businesses', key: 'id' },
    },
  }, {
    tableName: 'purchase_orders',
    timestamps: true,
    underscored: true,
  });

  return PurchaseOrder;
};
