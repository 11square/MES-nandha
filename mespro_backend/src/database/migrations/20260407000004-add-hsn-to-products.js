'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('products', 'hsn_code', {
      type: Sequelize.STRING(20),
      allowNull: true,
      after: 'sku',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('products', 'hsn_code');
  },
};
