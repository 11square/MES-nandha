const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProductionStageDef = sequelize.define('ProductionStageDef', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sequence: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    tableName: 'production_stage_definitions',
    timestamps: true,
    underscored: true,
  });

  return ProductionStageDef;
};
