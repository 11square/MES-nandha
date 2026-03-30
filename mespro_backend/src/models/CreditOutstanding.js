const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CreditOutstanding = sequelize.define('CreditOutstanding', {
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
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'clients', key: 'id' },
    },
    client_name: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    grand_total: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    paid_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    balance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    days_overdue: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('partial', 'overdue', 'pending', 'cleared'),
      allowNull: false,
      defaultValue: 'pending',
    },
    business_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'businesses', key: 'id' },
    },
  }, {
    tableName: 'credit_outstandings',
    timestamps: true,
    underscored: true,
  });

  return CreditOutstanding;
};
