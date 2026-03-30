const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Worker = sequelize.define('Worker', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    team: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    shift: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    mobile: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    business_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'businesses', key: 'id' },
    },
  }, {
    tableName: 'workers',
    timestamps: true,
    underscored: true,
  });

  return Worker;
};
