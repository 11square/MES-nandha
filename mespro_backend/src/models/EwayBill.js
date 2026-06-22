const { DataTypes } = require('sequelize');

/**
 * EwayBill — persists e-Way Bills generated against bills (invoices) via the
 * NIC / GSP e-Way Bill API. This is a NEW, standalone table; it does not alter
 * any existing tables. Each row is the local record of one generated EWB.
 */
module.exports = (sequelize) => {
  const EwayBill = sequelize.define('EwayBill', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    bill_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'bills', key: 'id' },
    },
    // The official e-Way Bill number returned by the portal.
    eway_bill_no: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    eway_bill_date: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    valid_upto: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    doc_no: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('generated', 'cancelled', 'failed'),
      allowNull: false,
      defaultValue: 'generated',
    },
    // Free-text alert/info returned alongside a successful generation.
    alert: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    // NIC error code(s) + message captured on failure, for support/debugging.
    error_message: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    // Snapshot of the request payload actually sent (without any secrets),
    // useful for audit and re-generation.
    request_snapshot: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    // Decrypted raw response data from the portal.
    response_snapshot: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    cancel_reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    generated_by: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    business_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'businesses', key: 'id' },
    },
  }, {
    tableName: 'eway_bills',
    timestamps: true,
    underscored: true,
  });

  return EwayBill;
};
