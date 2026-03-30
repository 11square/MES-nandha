const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PayrollRecord = sequelize.define('PayrollRecord', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    staff_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'staff_members', key: 'id' },
    },
    employee_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    department: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    pay_period: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'e.g. 2024-12',
    },
    basic_salary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    allowances: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    deductions: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    net_salary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('Paid', 'Pending', 'Processing'),
      allowNull: false,
      defaultValue: 'Pending',
    },
    payment_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    payment_method: {
      type: DataTypes.STRING(30),
      allowNull: true,
      defaultValue: 'Bank Transfer',
    },
    business_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'businesses', key: 'id' },
    },
  }, {
    tableName: 'payroll_records',
    timestamps: true,
    underscored: true,
  });

  return PayrollRecord;
};
