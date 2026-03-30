const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Dispatch = sequelize.define('Dispatch', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'orders', key: 'id' },
    },
    dispatch_type: {
      type: DataTypes.ENUM('stock'),
      allowNull: false,
      defaultValue: 'stock',
    },
    customer: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    product: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    lr_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    transporter: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    vehicle_no: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    driver_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    driver_phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('Ready to Dispatch', 'In Transit', 'Delivered', 'Returned'),
      allowNull: false,
      defaultValue: 'Ready to Dispatch',
    },
    dispatch_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    expected_delivery: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    delivered_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lr_image: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    invoice_no: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    business_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'businesses', key: 'id' },
    },
  }, {
    tableName: 'dispatches',
    timestamps: true,
    underscored: true,
  });

  return Dispatch;
};
