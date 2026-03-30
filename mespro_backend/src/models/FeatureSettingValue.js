const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FeatureSettingValue = sequelize.define('FeatureSettingValue', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    business_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'businesses', key: 'id' },
    },
    feature_setting_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'feature_settings', key: 'id' },
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    role_permissions: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: 'JSON object: { admin: bool, manager: bool, staff: bool, viewer: bool }',
    },
  }, {
    tableName: 'feature_setting_values',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['business_id', 'feature_setting_id'],
        name: 'idx_fsv_business_feature_unique',
      },
    ],
  });

  return FeatureSettingValue;
};
