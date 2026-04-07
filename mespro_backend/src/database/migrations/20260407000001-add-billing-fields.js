'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add notes, terms_conditions, place_of_supply to bills
    await queryInterface.addColumn('bills', 'notes', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('bills', 'terms_conditions', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('bills', 'place_of_supply', {
      type: Sequelize.STRING(60),
      allowNull: true,
    });

    // Add hsn_sac to bill_items
    await queryInterface.addColumn('bill_items', 'hsn_sac', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('bills', 'notes');
    await queryInterface.removeColumn('bills', 'terms_conditions');
    await queryInterface.removeColumn('bills', 'place_of_supply');
    await queryInterface.removeColumn('bill_items', 'hsn_sac');
  },
};
