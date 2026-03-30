const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    bill_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'bills', key: 'id' },
    },
    bill_no: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    client_name: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    method: {
      type: DataTypes.ENUM('cash', 'upi', 'card', 'bank', 'cheque'),
      allowNull: false,
      defaultValue: 'cash',
    },
    reference: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    received_by: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('completed', 'pending', 'cancelled'),
      allowNull: false,
      defaultValue: 'completed',
    },
    business_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'businesses', key: 'id' },
    },
  }, {
    tableName: 'payments',
    timestamps: true,
    underscored: true,
  });

  return Payment;
};
