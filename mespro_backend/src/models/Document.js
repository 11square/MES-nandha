const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Document = sequelize.define('Document', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    original_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    stored_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'UUID-based filename on disk or S3 key',
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'File size in bytes',
    },
    storage_type: {
      type: DataTypes.ENUM('local', 's3'),
      allowNull: false,
      defaultValue: 'local',
    },
    s3_bucket: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'S3 bucket name (null if local)',
    },
    s3_key: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Full S3 object key (null if local)',
    },
    s3_url: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      comment: 'Public or pre-signed S3 URL (null if local)',
    },
    local_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Relative path under public/uploads (null if S3)',
    },
    category: {
      type: DataTypes.ENUM('invoice', 'purchase_order', 'quotation', 'delivery_note', 'contract', 'other'),
      allowNull: false,
      defaultValue: 'other',
    },
    entity_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Related entity type e.g. order, client, lead',
    },
    entity_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Related entity ID',
    },
    uploaded_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    extracted_data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'AI-extracted data from document (JSON)',
    },
    status: {
      type: DataTypes.ENUM('uploaded', 'processing', 'processed', 'failed'),
      allowNull: false,
      defaultValue: 'uploaded',
    },
    business_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'businesses', key: 'id' },
    },
  }, {
    tableName: 'documents',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Document;
};
