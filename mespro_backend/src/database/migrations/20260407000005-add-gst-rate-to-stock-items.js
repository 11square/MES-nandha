'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('stock_items');
    if (!tableDesc.gst_rate) {
      await queryInterface.addColumn('stock_items', 'gst_rate', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 18,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('stock_items', 'gst_rate');
  },
};
