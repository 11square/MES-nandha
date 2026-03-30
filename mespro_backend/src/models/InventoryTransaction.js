const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InventoryTransaction = sequelize.define('InventoryTransaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    type: {
      type: DataTypes.ENUM('in', 'out'),
      allowNull: false,
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
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    reference: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    done_by: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    business_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'businesses', key: 'id' },
    },
  }, {
    tableName: 'inventory_transactions',
    timestamps: true,
    underscored: true,
  });

  return InventoryTransaction;
};
