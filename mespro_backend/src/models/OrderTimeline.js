const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrderTimeline = sequelize.define('OrderTimeline', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'orders', key: 'id' },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    done_by: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  }, {
    tableName: 'order_timeline',
    timestamps: true,
    underscored: true,
  });

  return OrderTimeline;
};
