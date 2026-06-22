'use strict';

/**
 * Fills the billing data gaps required for e-Way Bill generation:
 *  - bills.client_pincode        (buyer/consignee pincode — mandatory for EWB)
 *  - bills transport fields      (transporter, distance, vehicle, mode, doc)
 *  - clients.pincode             (so bills can prefill the buyer pincode)
 *
 * Each column is added independently and guarded so the migration is safe to
 * re-run and never touches existing data.
 */

const BILL_COLUMNS = {
  client_pincode: { type: 'STRING', args: [10] },
  transporter_id: { type: 'STRING', args: [20] },
  transporter_name: { type: 'STRING', args: [100] },
  transport_distance: { type: 'INTEGER', args: [] },
  transport_mode: { type: 'STRING', args: [5] },
  vehicle_no: { type: 'STRING', args: [20] },
  vehicle_type: { type: 'STRING', args: [5] },
  transport_doc_no: { type: 'STRING', args: [30] },
  transport_doc_date: { type: 'DATEONLY', args: [] },
};

async function columnExists(queryInterface, table, column) {
  const desc = await queryInterface.describeTable(table);
  return Object.prototype.hasOwnProperty.call(desc, column);
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const [name, def] of Object.entries(BILL_COLUMNS)) {
      if (!(await columnExists(queryInterface, 'bills', name))) {
        const type = def.args.length ? Sequelize[def.type](...def.args) : Sequelize[def.type];
        await queryInterface.addColumn('bills', name, { type, allowNull: true });
      }
    }

    if (!(await columnExists(queryInterface, 'clients', 'pincode'))) {
      await queryInterface.addColumn('clients', 'pincode', {
        type: Sequelize.STRING(10),
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    for (const name of Object.keys(BILL_COLUMNS)) {
      if (await columnExists(queryInterface, 'bills', name)) {
        await queryInterface.removeColumn('bills', name);
      }
    }
    if (await columnExists(queryInterface, 'clients', 'pincode')) {
      await queryInterface.removeColumn('clients', 'pincode');
    }
  },
};
