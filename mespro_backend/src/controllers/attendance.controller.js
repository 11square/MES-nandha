const { AttendanceRecord, StaffMember } = require('../models');
const createCrudController = require('./base.controller');
const ApiResponse = require('../utils/ApiResponse');
const { sequelize } = require('../models');
const { getPagination, getPagingData } = require('../utils/pagination');
const { applyBusinessScope } = require('../middleware/businessScope');

const baseController = createCrudController(AttendanceRecord, {
  resourceName: 'Attendance Record',
  defaultOrder: [['date', 'DESC']],
});

module.exports = {
  ...baseController,

  // GET /attendance?date=&staffId=&status=
  getAll: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const { date, staffId, workerId, status, startDate, endDate } = req.query;
      const { page, limit, offset } = getPagination(req.query);
      const where = {};

      if (date) where.date = date;
      if (staffId) where.staff_id = staffId;
      if (workerId) where.staff_id = workerId; // backward compat
      if (status === 'present') where.present = true;
      else if (status === 'absent') where.present = false;
      if (startDate && endDate) {
        where.date = { [Op.between]: [startDate, endDate] };
      }

      applyBusinessScope(req, where);

      const data = await AttendanceRecord.findAndCountAll({
        where,
        include: [{ model: StaffMember, as: 'staff', attributes: ['id', 'employee_id', 'name', 'role', 'department', 'phone', 'status', 'shift'] }],
        order: [['date', 'DESC']],
        limit,
        offset,
        distinct: true,
      });
      const { items, pagination } = getPagingData(data, page, limit);

      return ApiResponse.paginated(res, items, pagination);
    } catch (error) {
      next(error);
    }
  },

  // GET /attendance/workers — now returns staff_members (kept route name for backward compat)
  getWorkers: async (req, res, next) => {
    try {
      const staffMembers = await StaffMember.findAll({
        where: applyBusinessScope(req),
        attributes: ['id', 'employee_id', 'name', 'role', 'department', 'phone', 'status', 'shift'],
        order: [['name', 'ASC']],
      });
      return ApiResponse.success(res, staffMembers);
    } catch (error) {
      next(error);
    }
  },

  // POST /attendance — create single record
  create: async (req, res, next) => {
    try {
      const { staff_id, worker_id, date, present, check_in, check_out, hours, remarks } = req.body;
      const actualStaffId = staff_id || worker_id;
      if (!actualStaffId || !date) {
        return ApiResponse.badRequest(res, 'staff_id and date are required');
      }
      const record = await AttendanceRecord.create({
        staff_id: actualStaffId,
        date,
        present: present || false,
        check_in: check_in || null,
        check_out: check_out || null,
        hours: hours || 0,
        remarks: remarks || null,
        business_id: req.currentBusiness,
      });
      return ApiResponse.created(res, record, 'Attendance record created');
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        // Record already exists — update instead
        try {
          const { staff_id, worker_id, date, present, check_in, check_out, hours, remarks } = req.body;
          const actualStaffId = staff_id || worker_id;
          const [updated] = await AttendanceRecord.update(
            { present: present || false, check_in: check_in || null, check_out: check_out || null, hours: hours || 0, remarks: remarks || null },
            { where: { staff_id: actualStaffId, date } }
          );
          if (updated) {
            const record = await AttendanceRecord.findOne({ where: { staff_id: actualStaffId, date } });
            return ApiResponse.success(res, record, 'Attendance record updated');
          }
        } catch (updateError) {
          return next(updateError);
        }
      }
      next(error);
    }
  },

  // POST /attendance/bulk — wrapped in transaction
  bulkCreate: async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
      const { records } = req.body;
      if (!Array.isArray(records) || records.length === 0) {
        await t.rollback();
        return ApiResponse.badRequest(res, 'Records array is required');
      }

      const created = await AttendanceRecord.bulkCreate(
        records.map(r => ({
          staff_id: r.staff_id || r.worker_id,
          date: r.date,
          present: r.present || false,
          check_in: r.check_in || null,
          check_out: r.check_out || null,
          hours: r.hours || 0,
          remarks: r.remarks || null,
          business_id: req.currentBusiness,
        })),
        {
          updateOnDuplicate: ['present', 'check_in', 'check_out', 'hours', 'remarks'],
          transaction: t,
        }
      );

      await t.commit();
      return ApiResponse.created(res, created, `${created.length} attendance records saved`);
    } catch (error) {
      await t.rollback();
      next(error);
    }
  },

  // GET /attendance/summary?date= 
  getSummary: async (req, res, next) => {
    try {
      const { date } = req.query;
      const targetDate = date || new Date().toISOString().split('T')[0];

      const summaryWhere = applyBusinessScope(req, { date: targetDate });

      const counts = await AttendanceRecord.findAll({
        where: summaryWhere,
        attributes: [
          'present',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['present'],
        raw: true,
      });

      const totalCount = await AttendanceRecord.count({ where: summaryWhere });
      const summary = { date: targetDate, total: totalCount, present: 0, absent: 0 };
      counts.forEach(row => {
        const count = parseInt(row.count, 10);
        if (row.present === 1 || row.present === true) summary.present = count;
        else summary.absent = count;
      });

      return ApiResponse.success(res, summary);
    } catch (error) {
      next(error);
    }
  },
};
