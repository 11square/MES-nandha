const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LeadFollowUp = sequelize.define('LeadFollowUp', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    lead_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'leads', key: 'id' },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    scheduled_time: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    done_by: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('upcoming', 'completed'),
      allowNull: false,
      defaultValue: 'upcoming',
    },
    activity_type: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    priority: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
  }, {
    tableName: 'lead_follow_ups',
    timestamps: true,
    underscored: true,
  });

  return LeadFollowUp;
};
