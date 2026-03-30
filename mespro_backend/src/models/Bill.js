const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Bill = sequelize.define('Bill', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    bill_no: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'clients', key: 'id' },
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'orders', key: 'id' },
    },
    client_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    client_address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    client_gst: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    subtotal: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total_discount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    gst_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 18,
    },
    total_tax: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    grand_total: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    payment_status: {
      type: DataTypes.ENUM('paid', 'partial', 'pending', 'overdue'),
      allowNull: false,
      defaultValue: 'pending',
    },
    payment_type: {
      type: DataTypes.ENUM('cash', 'credit'),
      allowNull: false,
      defaultValue: 'cash',
    },
    payment_method: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    paid_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    district: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    business_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'businesses', key: 'id' },
    },
  }, {
    tableName: 'bills',
    timestamps: true,
    underscored: true,
  });

  return Bill;
};
