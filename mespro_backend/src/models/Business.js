const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Business = sequelize.define('Business', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    logo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    logo_storage_type: {
      type: DataTypes.ENUM('local', 's3'),
      allowNull: true,
    },
    logo_s3_key: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    logo_local_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('Active', 'Inactive'),
      allowNull: false,
      defaultValue: 'Active',
    },
  }, {
    tableName: 'businesses',
    timestamps: true,
    underscored: true,
  });

  return Business;
};
