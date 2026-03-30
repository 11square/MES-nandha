const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BillOfMaterial = sequelize.define('BillOfMaterial', {
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
    material: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    quantity_per_unit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1,
    },
    total_required: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    in_stock: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('available', 'low', 'unavailable'),
      allowNull: false,
      defaultValue: 'available',
    },
  }, {
    tableName: 'bill_of_materials',
    timestamps: true,
    underscored: true,
  });

  return BillOfMaterial;
};
