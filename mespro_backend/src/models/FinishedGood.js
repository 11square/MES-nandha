const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FinishedGood = sequelize.define('FinishedGood', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    product: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    stock: {
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
    business_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'businesses', key: 'id' },
    },
  }, {
    tableName: 'finished_goods',
    timestamps: true,
    underscored: true,
  });

  return FinishedGood;
};
