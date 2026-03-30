const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SalesFollowup = sequelize.define('SalesFollowup', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    client_name: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    client_contact: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    last_contact: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    next_followup: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('hot', 'warm', 'cold'),
      allowNull: false,
      defaultValue: 'warm',
    },
    sales_person: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    potential_value: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    business_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'businesses', key: 'id' },
    },
  }, {
    tableName: 'sales_followups',
    timestamps: true,
    underscored: true,
  });

  return SalesFollowup;
};
