'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('clients', 'opening_outstanding', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('clients', 'opening_outstanding');
  },
};
