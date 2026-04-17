'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('transactions');

    if (!tableDesc.vendor_name) {
      await queryInterface.addColumn('transactions', 'vendor_name', {
        type: Sequelize.STRING(150),
        allowNull: true,
      });
    }
    if (!tableDesc.vendor_id) {
      await queryInterface.addColumn('transactions', 'vendor_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'vendors', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }
    if (!tableDesc.party_type) {
      await queryInterface.addColumn('transactions', 'party_type', {
        type: Sequelize.STRING(10),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('transactions', 'vendor_name').catch(() => {});
    await queryInterface.removeColumn('transactions', 'vendor_id').catch(() => {});
    await queryInterface.removeColumn('transactions', 'party_type').catch(() => {});
  },
};
