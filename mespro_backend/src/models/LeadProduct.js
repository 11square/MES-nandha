const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LeadProduct = sequelize.define('LeadProduct', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    lead_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'leads', key: 'id' },
    },
    product: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    subcategory: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    size: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: 'pcs',
    },
  }, {
    tableName: 'lead_products',
    timestamps: true,
    underscored: true,
  });

  return LeadProduct;
};
