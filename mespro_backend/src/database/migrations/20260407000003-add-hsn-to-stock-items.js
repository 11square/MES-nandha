'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('stock_items', 'hsn_sac', {
      type: Sequelize.STRING(20),
      allowNull: true,
      after: 'sku',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('stock_items', 'hsn_sac');
  },
};
