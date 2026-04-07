'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add missing columns to bills table
    await queryInterface.addColumn('bills', 'status', {
      type: Sequelize.ENUM('draft', 'final'),
      allowNull: false,
      defaultValue: 'final',
      after: 'grand_total',
    });
    await queryInterface.addColumn('bills', 'state', {
      type: Sequelize.STRING(50),
      allowNull: true,
      after: 'created_by',
    });
    await queryInterface.addColumn('bills', 'district', {
      type: Sequelize.STRING(50),
      allowNull: true,
      after: 'state',
    });

    // Add missing columns to orders table
    await queryInterface.addColumn('orders', 'gst_number', {
      type: Sequelize.STRING(20),
      allowNull: true,
      after: 'notes',
    });
    await queryInterface.addColumn('orders', 'state', {
      type: Sequelize.STRING(50),
      allowNull: true,
      after: 'gst_number',
    });
    await queryInterface.addColumn('orders', 'district', {
      type: Sequelize.STRING(50),
      allowNull: true,
      after: 'state',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('bills', 'status');
    await queryInterface.removeColumn('bills', 'state');
    await queryInterface.removeColumn('bills', 'district');
    await queryInterface.removeColumn('orders', 'gst_number');
    await queryInterface.removeColumn('orders', 'state');
    await queryInterface.removeColumn('orders', 'district');
  },
};
