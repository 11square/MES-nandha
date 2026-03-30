const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProductionOrder = sequelize.define('ProductionOrder', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'orders', key: 'id' },
    },
    order_number: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    customer: {
      type: DataTypes.STRING(150),
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
    current_stage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    stage_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    progress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
    },
    priority: {
      type: DataTypes.ENUM('High', 'Medium', 'Low'),
      allowNull: false,
      defaultValue: 'Medium',
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    started_at: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    assigned_to: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    estimated_completion: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    qc_status: {
      type: DataTypes.ENUM('Pass', 'Fail', 'Pending'),
      allowNull: false,
      defaultValue: 'Pending',
    },
    delay_risk: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM('Pending', 'In Progress', 'Completed', 'On Hold'),
      allowNull: false,
      defaultValue: 'Pending',
    },
    business_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'businesses', key: 'id' },
    },
  }, {
    tableName: 'production_orders',
    timestamps: true,
    underscored: true,
  });

  return ProductionOrder;
};
