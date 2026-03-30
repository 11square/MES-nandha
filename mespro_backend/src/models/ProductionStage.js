const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProductionStage = sequelize.define('ProductionStage', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    production_order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'production_orders', key: 'id' },
    },
    stage_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('completed', 'in-progress', 'pending'),
      allowNull: false,
      defaultValue: 'pending',
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    operator: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    qc_passed: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    photos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    tableName: 'production_stages',
    timestamps: true,
    underscored: true,
  });

  return ProductionStage;
};
