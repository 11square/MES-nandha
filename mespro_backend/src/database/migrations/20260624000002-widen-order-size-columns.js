'use strict';

/**
 * `orders.size` and `order_products.size` are free-text fields the user types
 * (e.g. "1200mm x 800mm x 600mm with rounded edges"), but they were defined as
 * VARCHAR(30). Longer values cause "Data too long for column 'size'" on INSERT,
 * surfacing as HTTP 500 when creating an order.
 *
 * Widen both to VARCHAR(100). Widening a column never truncates existing data
 * and is safe to re-run.
 */

async function columnType(queryInterface, table, column) {
  const desc = await queryInterface.describeTable(table);
  return desc[column] ? desc[column].type : null;
}

const TARGETS = [
  { table: 'orders', column: 'size' },
  { table: 'order_products', column: 'size' },
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const { table, column } of TARGETS) {
      const type = await columnType(queryInterface, table, column);
      if (type === null) continue; // column missing — nothing to widen
      await queryInterface.changeColumn(table, column, {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    for (const { table, column } of TARGETS) {
      const type = await columnType(queryInterface, table, column);
      if (type === null) continue;
      await queryInterface.changeColumn(table, column, {
        type: Sequelize.STRING(30),
        allowNull: true,
      });
    }
  },
};
