const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AttendanceRecord = sequelize.define('AttendanceRecord', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    staff_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'staff_members', key: 'id' },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    present: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    check_in: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    check_out: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    hours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    business_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'businesses', key: 'id' },
    },
  }, {
    tableName: 'attendance_records',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['staff_id', 'date'],
      },
    ],
  });

  return AttendanceRecord;
};
