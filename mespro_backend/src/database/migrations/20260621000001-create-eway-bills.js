'use strict';

/**
 * Creates the eway_bills table used to persist e-Way Bills generated through
 * the NIC / GSP e-Way Bill API. Standalone table — does not touch existing data.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('eway_bills', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      bill_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'bills', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      eway_bill_no: { type: Sequelize.STRING(20), allowNull: true },
      eway_bill_date: { type: Sequelize.STRING(30), allowNull: true },
      valid_upto: { type: Sequelize.STRING(30), allowNull: true },
      doc_no: { type: Sequelize.STRING(20), allowNull: true },
      status: { type: Sequelize.ENUM('generated', 'cancelled', 'failed'), allowNull: false, defaultValue: 'generated' },
      alert: { type: Sequelize.STRING(500), allowNull: true },
      error_message: { type: Sequelize.STRING(1000), allowNull: true },
      request_snapshot: { type: Sequelize.JSON, allowNull: true },
      response_snapshot: { type: Sequelize.JSON, allowNull: true },
      cancel_reason: { type: Sequelize.STRING(255), allowNull: true },
      cancelled_at: { type: Sequelize.DATE, allowNull: true },
      generated_by: { type: Sequelize.STRING(100), allowNull: true },
      business_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'businesses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('eway_bills', ['bill_id'], { name: 'idx_eway_bills_bill_id' });
    await queryInterface.addIndex('eway_bills', ['business_id'], { name: 'idx_eway_bills_business_id' });
    await queryInterface.addIndex('eway_bills', ['eway_bill_no'], { name: 'idx_eway_bills_ewb_no' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('eway_bills');
  },
};
