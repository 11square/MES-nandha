const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RawMaterial = sequelize.define('RawMaterial', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    stock: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    reorder_point: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    last_received: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    supplier: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    cost_per_unit: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('ok', 'low', 'critical'),
      allowNull: false,
      defaultValue: 'ok',
    },
    business_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'businesses', key: 'id' },
    },
  }, {
    tableName: 'raw_materials',
    timestamps: true,
    underscored: true,
  });

  return RawMaterial;
};
