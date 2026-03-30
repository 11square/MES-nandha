const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MaterialRequisition = sequelize.define('MaterialRequisition', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    requisition_number: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    material: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    requested_by: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Approved', 'Rejected', 'Fulfilled'),
      allowNull: false,
      defaultValue: 'Pending',
    },
    priority: {
      type: DataTypes.ENUM('High', 'Medium', 'Low'),
      allowNull: false,
      defaultValue: 'Medium',
    },
    business_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'businesses', key: 'id' },
    },
  }, {
    tableName: 'material_requisitions',
    timestamps: true,
    underscored: true,
  });

  return MaterialRequisition;
};
