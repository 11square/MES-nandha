const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FeatureSetting = sequelize.define('FeatureSetting', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    feature_key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    feature_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'general',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    tableName: 'feature_settings',
    timestamps: true,
    underscored: true,
  });

  return FeatureSetting;
};
