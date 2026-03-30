const { PayrollRecord, StaffMember } = require('../models');
const createCrudController = require('./base.controller');
const ApiResponse = require('../utils/ApiResponse');
const { sequelize } = require('../models');
const { getPagination, getPagingData } = require('../utils/pagination');
const { applyBusinessScope } = require('../middleware/businessScope');

const baseController = createCrudController(PayrollRecord, {
  resourceName: 'Payroll Record',
  defaultOrder: [['pay_period', 'DESC']],
});

module.exports = {
  ...baseController,

  // GET /payroll?month=&status=
  getAll: async (req, res, next) => {
    try {
      const { Op } = require('sequelize');
      const { month, status, search } = req.query;
      const { page, limit, offset } = getPagination(req.query);
      const where = {};

      if (month) where.pay_period = month;
      if (status) where.status = status;

      applyBusinessScope(req, where);

      const includeWhere = {};
      if (search) {
        includeWhere[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { employee_id: { [Op.like]: `%${search}%` } },
        ];
      }

      const data = await PayrollRecord.findAndCountAll({
        where,
        include: [{
          model: StaffMember,
          as: 'staff',
          attributes: ['id', 'name', 'employee_id', 'department', 'role'],
          where: Object.keys(includeWhere).length > 0 ? includeWhere : undefined,
        }],
        order: [['pay_period', 'DESC']],
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

  // POST /payroll/generate — wrapped in transaction
  generate: async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
      const { month } = req.body;
      if (!month) {
        await t.rollback();
        return ApiResponse.badRequest(res, 'Month is required');
      }

      const staff = await StaffMember.findAll({ where: applyBusinessScope(req, { status: 'active' }), transaction: t });

      const records = staff.map(s => ({
        staff_id: s.id,
        employee_name: s.name,
        department: s.department,
        pay_period: month,
        basic_salary: s.salary || 0,
        allowances: 0,
        deductions: 0,
        net_salary: s.salary || 0,
        status: 'Pending',
        business_id: req.currentBusiness,
      }));

      const created = await PayrollRecord.bulkCreate(records, {
        ignoreDuplicates: true,
        transaction: t,
      });

      await t.commit();
      return ApiResponse.created(res, created, `Payroll generated for ${created.length} staff members`);
    } catch (error) {
      await t.rollback();
      next(error);
    }
  },

  // PUT /payroll/:id/process
  process: async (req, res, next) => {
    try {
      const record = await PayrollRecord.findOne({ where: { id: req.params.id, ...applyBusinessScope(req) } });
      if (!record) return ApiResponse.notFound(res, 'Payroll record not found');

      const netSalary = (record.basic_salary || 0) +
        (record.allowances || 0) +
        (record.overtime_pay || 0) +
        (record.bonus || 0) -
        (record.deductions || 0);

      await record.update({
        net_salary: netSalary,
        status: 'processed',
        processed_date: new Date(),
      });

      return ApiResponse.success(res, record, 'Payroll processed');
    } catch (error) {
      next(error);
    }
  },

  // PUT /payroll/:id/pay
  markPaid: async (req, res, next) => {
    try {
      const record = await PayrollRecord.findOne({ where: { id: req.params.id, ...applyBusinessScope(req) } });
      if (!record) return ApiResponse.notFound(res, 'Payroll record not found');

      await record.update({ status: 'paid', payment_date: new Date() });
      return ApiResponse.success(res, record, 'Payroll marked as paid');
    } catch (error) {
      next(error);
    }
  },
};
