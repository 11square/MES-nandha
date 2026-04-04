const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Lead = sequelize.define('Lead', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    lead_number: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    source: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    customer: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    contact: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    mobile: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    product: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    size: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    required_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('Draft', 'New', 'Contacted', 'Qualified', 'Negotiation', 'Converted', 'Rejected', 'Lost'),
      allowNull: false,
      defaultValue: 'New',
    },
    conversion_status: {
      type: DataTypes.ENUM('None', 'Converted', 'Not Converted'),
      allowNull: false,
      defaultValue: 'None',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    assigned_to: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    gst_number: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    district: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    business_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'businesses', key: 'id' },
    },
  }, {
    tableName: 'leads',
    timestamps: true,
    underscored: true,
  });

  return Lead;
};
