const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SalesTarget = sequelize.define('SalesTarget', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sales_person_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    sales_person: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    month: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'e.g. December 2024',
    },
    target: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    achieved: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    business_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'businesses', key: 'id' },
    },
  }, {
    tableName: 'sales_targets',
    timestamps: true,
    underscored: true,
  });

  return SalesTarget;
};
