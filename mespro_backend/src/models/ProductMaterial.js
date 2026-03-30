const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProductMaterial = sequelize.define('ProductMaterial', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'products', key: 'id' },
    },
    material_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
  }, {
    tableName: 'product_materials',
    timestamps: true,
    underscored: true,
  });

  return ProductMaterial;
};
