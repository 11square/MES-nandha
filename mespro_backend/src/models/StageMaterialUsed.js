const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StageMaterialUsed = sequelize.define('StageMaterialUsed', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    stage_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'production_stages', key: 'id' },
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
  }, {
    tableName: 'stage_materials_used',
    timestamps: true,
    underscored: true,
  });

  return StageMaterialUsed;
};
