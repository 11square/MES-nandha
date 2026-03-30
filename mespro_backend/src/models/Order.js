const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    order_number: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    lead_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'leads', key: 'id' },
    },
    lead_number: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'clients', key: 'id' },
    },
    customer: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    contact: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    mobile: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    product: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    size: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    unit_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    discount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    gst_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    tax_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 18,
    },
    grand_total: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    required_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Confirmed', 'In Production', 'Ready', 'Dispatched', 'Delivered', 'Bill', 'Cancelled'),
      allowNull: false,
      defaultValue: 'Pending',
    },
    payment_status: {
      type: DataTypes.ENUM('Unpaid', 'Partial', 'Paid'),
      allowNull: false,
      defaultValue: 'Unpaid',
    },
    priority: {
      type: DataTypes.ENUM('High', 'Medium', 'Low'),
      allowNull: false,
      defaultValue: 'Medium',
    },
    source: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    assigned_to: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    converted_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    converted_by: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    needs_production: {
      type: DataTypes.ENUM('yes', 'no'),
      allowNull: false,
      defaultValue: 'yes',
    },
    sent_to_production: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    gst_number: {
      type: DataTypes.STRING(20),
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
    tableName: 'orders',
    timestamps: true,
    underscored: true,
  });

  return Order;
};
