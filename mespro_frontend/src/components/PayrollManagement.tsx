import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { translations, Language } from '../translations';

interface PayrollManagementProps {
  language?: Language;
}
import { 
  DollarSign, 
  Search, 
  Download, 
  Eye,
  Calendar,
  TrendingUp,
  Users,
  CreditCard,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  Banknote,
  IndianRupee,
  X,
  Send
} from 'lucide-react';
import { Badge } from './ui/badge';

import { payrollService } from '../services/payroll.service';
export default function PayrollManagement({ language = 'en' }: PayrollManagementProps) {
  const t = (key: keyof typeof translations.en) => translations[language][key] || translations.en[key];
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showManageForm, setShowManageForm] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    basic_salary: 0,
    allowances: 0,
    deductions: 0,
    status: 'Pending' as 'Paid' | 'Pending' | 'Processing',
    payment_method: 'Bank Transfer',
    payment_date: '',
  });

  // Generate last 12 months dynamically from current date
  const monthOptions = useMemo(() => {
    const now = new Date();
    const options: { value: string; label: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || '');
  const [loading, setLoading] = useState(true);
  const [payrollRecords, setPayrollRecords] = useState<any[]>([]);

  const fetchPayroll = (month?: string) => {
    setLoading(true);
    payrollService.getPayrollRecords(month ? { month } : undefined).then(data => {
      const records = Array.isArray(data) ? data : [];
      // Normalize: DB may return salary fields as strings — parse to numbers
      const normalized = records.map(r => ({
        ...r,
        basic_salary: Number(r.basic_salary) || 0,
        allowances: Number(r.allowances) || 0,
        deductions: Number(r.deductions) || 0,
        net_salary: Number(r.net_salary) || 0,
      }));
      // Deduplicate by staff_id — keep the latest record per staff
      const seen = new Map<string, any>();
      for (const r of normalized) {
        const key = String(r.staff_id || r.employee_id || r.employee_name);
        if (!seen.has(key) || (r.id > (seen.get(key)?.id || 0))) {
          seen.set(key, r);
        }
      }
      setPayrollRecords(Array.from(seen.values()));
    }).catch(() => setPayrollRecords([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPayroll(selectedMonth);
  }, [selectedMonth]);

  // Process Salary — only generates if no records exist, otherwise just refreshes
  const handleProcessSalary = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      if (payrollRecords.length === 0) {
        // No records yet for this month — generate payroll
        await payrollService.generatePayroll(selectedMonth);
        toast.success('Payroll generated for ' + monthOptions.find(m => m.value === selectedMonth)?.label);
      } else {
        toast.success('Payroll data refreshed');
      }
      fetchPayroll(selectedMonth);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to process payroll');
    } finally {
      setProcessing(false);
    }
  };

  // Export payroll records as CSV
  const handleExportCSV = () => {
    if (payrollRecords.length === 0) {
      toast.error('No payroll records to export');
      return;
    }
    const headers = ['Employee ID', 'Employee Name', 'Department', 'Basic Salary', 'Allowances', 'Deductions', 'Net Salary', 'Status', 'Payment Date', 'Payment Method'];
    const rows = payrollRecords.map(r => [
      r.employee_id,
      r.employee_name,
      r.department,
      r.basic_salary,
      r.allowances,
      r.deductions,
      r.net_salary,
      r.status,
      r.payment_date || '',
      r.payment_method || '',
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Payroll report exported successfully!');
  };

  // Select a staff member in the manage form
  const formatDateForInput = (date: string | null | undefined) => {
    if (!date) return '';
    try {
      return new Date(date).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const selectStaffForManage = (staffId: string) => {
    const record = payrollRecords.find(r => String(r.id || r._id) === staffId);
    if (!record) return;
    setSelectedRecord(record);
    setEditForm({
      basic_salary: record.basic_salary,
      allowances: record.allowances,
      deductions: record.deductions,
      status: record.status || 'Pending',
      payment_method: record.payment_method || 'Bank Transfer',
      payment_date: formatDateForInput(record.payment_date),
    });
  };

  // Open Manage Form
  const openManageForm = (record?: any) => {
    if (record) {
      setSelectedRecord(record);
      setEditForm({
        basic_salary: record.basic_salary,
        allowances: record.allowances,
        deductions: record.deductions,
        status: record.status || 'Pending',
        payment_method: record.payment_method || 'Bank Transfer',
        payment_date: formatDateForInput(record.payment_date),
      });
    } else {
      // No pre-selection — user picks from dropdown
      setSelectedRecord(null);
      setEditForm({
        basic_salary: 0,
        allowances: 0,
        deductions: 0,
        status: 'Pending',
        payment_method: 'Bank Transfer',
        payment_date: '',
      });
    }
    setShowManageForm(true);
  };

  // Download salary slip for a staff member
  const downloadSlip = (record: any) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      toast.error('Please allow popups to generate salary slip');
      return;
    }

    const basicSalary = Number(record.basic_salary);
    const allowances = Number(record.allowances);
    const deductions = Number(record.deductions);
    const netSalary = basicSalary + allowances - deductions;
    const month = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;
    const statusColor = record.status === 'Paid' ? '#16a34a' : record.status === 'Processing' ? '#2563eb' : '#f59e0b';
    const initials = record.employee_name.split(' ').map((n: string) => n[0]).join('').toUpperCase();

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Salary Slip - ${record.employee_name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
          .company-name { font-size: 24px; font-weight: 700; color: #1e40af; }
          .company-sub { font-size: 12px; color: #6b7280; margin-top: 4px; }
          .slip-title { font-size: 28px; font-weight: 700; color: #1e40af; text-align: right; }
          .slip-period { font-size: 14px; color: #6b7280; text-align: right; margin-top: 4px; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; color: white; background: ${statusColor}; margin-top: 8px; float: right; }
          .employee-section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 30px; display: flex; align-items: center; gap: 16px; }
          .avatar { width: 48px; height: 48px; background: linear-gradient(135deg, #2563eb, #1d4ed8); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 18px; }
          .emp-info h3 { font-size: 16px; font-weight: 600; color: #1e293b; }
          .emp-info p { font-size: 13px; color: #6b7280; margin-top: 2px; }
          .section-title { font-size: 12px; text-transform: uppercase; color: #6b7280; letter-spacing: 1px; margin-bottom: 12px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          thead th { background: #f8fafc; padding: 10px 16px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e2e8f0; letter-spacing: 0.5px; }
          thead th:last-child { text-align: right; }
          tbody td { padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
          tbody td:last-child { text-align: right; font-weight: 500; }
          .earnings td:last-child { color: #16a34a; }
          .deductions td:last-child { color: #dc2626; }
          .net-salary-box { background: linear-gradient(135deg, #eff6ff, #dbeafe); border: 2px solid #2563eb; border-radius: 10px; padding: 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
          .net-salary-box .label { font-size: 16px; font-weight: 600; color: #1e40af; }
          .net-salary-box .amount { font-size: 28px; font-weight: 700; color: #1e40af; }
          .payment-info { display: flex; gap: 16px; margin-bottom: 30px; }
          .payment-card { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; }
          .payment-card .label { font-size: 11px; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.5px; }
          .payment-card .value { font-size: 14px; font-weight: 600; color: #1e293b; margin-top: 4px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #9ca3af; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company-name">MES Pro</div>
            <div class="company-sub">Manufacturing Execution System</div>
          </div>
          <div>
            <div class="slip-title">SALARY SLIP</div>
            <div class="slip-period">${month}</div>
            <div class="status-badge">${record.status}</div>
          </div>
        </div>

        <div class="employee-section">
          <div class="avatar">${initials}</div>
          <div class="emp-info">
            <h3>${record.employee_name}</h3>
            <p>${record.employee_id || record.staff_id || 'N/A'} · ${record.department}</p>
          </div>
        </div>

        <div class="section-title">Earnings & Deductions</div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr class="earnings">
              <td>Basic Salary</td>
              <td>₹${basicSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr class="earnings">
              <td>Allowances</td>
              <td>+₹${allowances.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr class="deductions">
              <td>Deductions</td>
              <td>-₹${deductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div class="net-salary-box">
          <div class="label">Net Salary</div>
          <div class="amount">₹${netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>

        <div class="section-title">Payment Details</div>
        <div class="payment-info">
          <div class="payment-card">
            <div class="label">Payment Method</div>
            <div class="value">${record.payment_method || 'N/A'}</div>
          </div>
          <div class="payment-card">
            <div class="label">Payment Date</div>
            <div class="value">${record.payment_date ? new Date(record.payment_date).toLocaleDateString() : 'Not paid yet'}</div>
          </div>
          <div class="payment-card">
            <div class="label">Status</div>
            <div class="value" style="color:${statusColor}">${record.status}</div>
          </div>
        </div>

        <div class="footer">
          <p>This is a system-generated salary slip and does not require a signature.</p>
          <p style="margin-top:4px;">Generated by MES Pro | ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
    toast.success(`Salary slip generated for ${record.employee_name}`);
  };

  // Open View dialog for a staff member
  const openViewDialog = (record: any) => {
    setSelectedRecord(record);
    setShowViewDialog(true);
  };

  // Save payroll record
  const handleSavePayroll = async () => {
    if (!selectedRecord) return;
    // Validate required fields
    if (editForm.basic_salary <= 0) {
      toast.error('Basic Salary must be greater than 0');
      return;
    }
    if (editForm.allowances < 0) {
      toast.error('Allowances cannot be negative');
      return;
    }
    if (editForm.deductions < 0) {
      toast.error('Deductions cannot be negative');
      return;
    }
    const netSalary = editForm.basic_salary + editForm.allowances - editForm.deductions;
    if (netSalary < 0) {
      toast.error('Net Salary cannot be negative. Deductions exceed salary + allowances.');
      return;
    }
    if (!editForm.status) {
      toast.error('Status is required');
      return;
    }
    if (!editForm.payment_method) {
      toast.error('Payment Method is required');
      return;
    }
    setSaving(true);
    try {
      const id = selectedRecord.id || selectedRecord._id;
      await payrollService.updatePayroll(id, {
        basic_salary: editForm.basic_salary,
        allowances: editForm.allowances,
        deductions: editForm.deductions,
        net_salary: netSalary,
        status: editForm.status,
        payment_method: editForm.payment_method,
        payment_date: editForm.payment_date || null,
      });
      toast.success(`Payroll updated for ${selectedRecord.employee_name}`);
      setShowManageForm(false);
      setSelectedRecord(null);
      fetchPayroll(selectedMonth);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update payroll');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-emerald-100 text-emerald-700';
      case 'Processing': return 'bg-blue-100 text-blue-700';
      case 'Pending': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const formatCurrency = (amount: number) => {
    const num = Number(amount) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const filteredRecords = payrollRecords.filter(record => 
    record.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPayroll = payrollRecords.reduce((sum, record) => sum + record.net_salary, 0);
  const paidAmount = payrollRecords.filter(r => r.status === 'Paid').reduce((sum, record) => sum + record.net_salary, 0);
  const pendingAmount = payrollRecords.filter(r => r.status !== 'Paid').reduce((sum, record) => sum + record.net_salary, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl text-slate-900 font-bold">{t('payrollManagement')}</h2>
          <p className="text-sm text-slate-600 mt-1">{t('managePayroll')}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">{t('payroll')}</span>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl text-slate-900 font-bold">{formatCurrency(totalPayroll)}</p>
          <p className="text-xs text-slate-600 mt-1">{t('thisMonth')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">{t('paid')}</span>
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl text-slate-900 font-bold">{formatCurrency(paidAmount)}</p>
          <p className="text-xs text-emerald-600 mt-1">{payrollRecords.filter(r => r.status === 'Paid').length} employees paid</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">{t('pending')}</span>
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl text-slate-900 font-bold">{formatCurrency(pendingAmount)}</p>
          <p className="text-xs text-amber-600 mt-1">{payrollRecords.filter(r => r.status !== 'Paid').length} {t('staff')} {t('pending')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">{t('staff')}</span>
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-violet-600" />
            </div>
          </div>
          <p className="text-2xl text-slate-900 font-bold">{payrollRecords.length}</p>
          <p className="text-xs text-slate-600 mt-1">{t('active')} {t('payroll')}</p>
        </motion.div>
      </div>

      {/* Search and Filter */}
      <div className='flex items-center justify-between '>
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder={t('searchByEmployeeNameOrId')}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* <Select defaultValue="all">
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatus')}</SelectItem>
            <SelectItem value="paid">{t('paid')}</SelectItem>
            <SelectItem value="pending">{t('pending')}</SelectItem>
            <SelectItem value="processing">{t('processing')}</SelectItem>
          </SelectContent>
        </Select> */}
      </div>
      <div className="flex gap-2">
          <Button variant="outline" className="shadow-sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            {t('export')} {t('reports')}
          </Button>
          <Button
            variant="outline"
            className="shadow-sm"
            onClick={() => openManageForm()}
            disabled={payrollRecords.length === 0}
          >
            <Banknote className="w-4 h-4 mr-2" />
            Manage Payroll
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
            onClick={handleProcessSalary}
            disabled={processing}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {processing ? 'Processing...' : t('processSalary')}
          </Button>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">Employee</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">Department</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-slate-900">Basic Salary</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-slate-900">Allowances</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-slate-900">Deductions</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-slate-900">Net Salary</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">Status</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                      <p className="text-sm text-slate-500">Loading payroll data...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <DollarSign className="w-10 h-10 text-slate-300" />
                      <p className="text-sm text-slate-500">No payroll records found</p>
                    </div>
                  </td>
                </tr>
              ) : (
              filteredRecords.map((record, index) => (
                <motion.tr
                  key={record.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white font-semibold shadow-sm">
                        {record.employee_name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm text-slate-900 font-semibold">{record.employee_name}</p>
                        <p className="text-xs text-slate-600">{record.employee_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <Badge variant="outline">{record.department}</Badge>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <p className="text-sm text-slate-700 font-medium">{formatCurrency(record.basic_salary)}</p>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <p className="text-sm text-emerald-600 font-medium">+{formatCurrency(record.allowances)}</p>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <p className="text-sm text-red-600 font-medium">-{formatCurrency(record.deductions)}</p>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <p className="text-sm text-slate-900 font-bold">{formatCurrency(record.net_salary)}</p>
                  </td>
                  <td className="py-4 px-6">
                    <Badge className={getStatusColor(record.status)}>
                      {record.status}
                    </Badge>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View Details" onClick={() => openViewDialog(record)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Manage"
                        onClick={() => openManageForm(record)}
                      >
                        <Banknote className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Download Slip" onClick={() => downloadSlip(record)}>
                        <FileText className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-blue-500/10 backdrop-blur-sm rounded-xl p-6 border border-blue-200/50 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-700/80 mb-1 font-medium">Avg. Salary</p>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(payrollRecords.length > 0 ? Math.round(totalPayroll / payrollRecords.length) : 0)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-emerald-500/10 backdrop-blur-sm rounded-xl p-6 border border-emerald-200/50 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-emerald-700/80 mb-1 font-medium">Total Allowances</p>
              <p className="text-2xl font-bold text-emerald-700">{formatCurrency(payrollRecords.reduce((sum, r) => sum + r.allowances, 0))}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-amber-500/10 backdrop-blur-sm rounded-xl p-6 border border-amber-200/50 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-amber-700/80 mb-1 font-medium">Total Deductions</p>
              <p className="text-2xl font-bold text-amber-700">{formatCurrency(payrollRecords.reduce((sum, r) => sum + r.deductions, 0))}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Manage Payroll Dialog */}
      <Dialog open={showManageForm} onOpenChange={setShowManageForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Payroll</DialogTitle>
            <DialogDescription>Select a staff member and update their payroll details.</DialogDescription>
          </DialogHeader>

          <div className="border rounded-lg p-4 space-y-4 bg-slate-50/50">
            {/* Staff */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Staff</label>
              <Select
                value={selectedRecord ? String(selectedRecord.id || selectedRecord._id) : ''}
                onValueChange={selectStaffForManage}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {payrollRecords.map(r => (
                    <SelectItem key={r.id || r._id} value={String(r.id || r._id)}>
                      {r.employee_name} — {r.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Basic Salary */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Basic Salary</label>
                <Input
                  type="number"
                  className="bg-white"
                  value={editForm.basic_salary}
                  onChange={(e) => setEditForm(f => ({ ...f, basic_salary: Number(e.target.value) || 0 }))}
                />
              </div>

              {/* Allowances */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Allowances</label>
                <Input
                  type="number"
                  className="bg-white"
                  value={editForm.allowances}
                  onChange={(e) => setEditForm(f => ({ ...f, allowances: Number(e.target.value) || 0 }))}
                />
              </div>

              {/* Deductions */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Deductions</label>
                <Input
                  type="number"
                  className="bg-white"
                  value={editForm.deductions}
                  onChange={(e) => setEditForm(f => ({ ...f, deductions: Number(e.target.value) || 0 }))}
                />
              </div>

              {/* Net Salary (read-only) */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Net Salary</label>
                <Input
                  type="text"
                  readOnly
                  value={formatCurrency(editForm.basic_salary + editForm.allowances - editForm.deductions)}
                  className="bg-white font-semibold"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Status</label>
                <Select value={editForm.status} onValueChange={(v: string) => setEditForm(f => ({ ...f, status: v as 'Pending' | 'Processing' | 'Paid' }))}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Processing">Processing</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Payment Method</label>
                <Select value={editForm.payment_method} onValueChange={(v: string) => setEditForm(f => ({ ...f, payment_method: v }))}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Payment Date - full width */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Payment Date</label>
              <Input
                type="date"
                className="bg-white"
                value={editForm.payment_date}
                onChange={(e) => setEditForm(f => ({ ...f, payment_date: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowManageForm(false)}>Cancel</Button>
            <Button
              onClick={handleSavePayroll}
              disabled={saving || !selectedRecord}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Payroll Details
            </DialogTitle>
            <DialogDescription>
              Salary details for {selectedRecord?.employee_name}
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold">
                  {selectedRecord.employee_name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{selectedRecord.employee_name}</p>
                  <p className="text-sm text-slate-500">{selectedRecord.employee_id} · {selectedRecord.department}</p>
                </div>
                <Badge className={`ml-auto ${getStatusColor(selectedRecord.status)}`}>{selectedRecord.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-xs text-slate-500">Basic Salary</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(selectedRecord.basic_salary)}</p>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-xs text-emerald-500">Allowances</p>
                  <p className="text-lg font-bold text-emerald-600">+{formatCurrency(selectedRecord.allowances)}</p>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-xs text-red-500">Deductions</p>
                  <p className="text-lg font-bold text-red-600">-{formatCurrency(selectedRecord.deductions)}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-500">Net Salary</p>
                  <p className="text-lg font-bold text-blue-700">{formatCurrency(selectedRecord.net_salary)}</p>
                </div>
              </div>

              <div className="p-3 bg-white rounded-lg border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Payment Method</span>
                  <span className="font-medium text-slate-900">{selectedRecord.payment_method || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Payment Date</span>
                  <span className="font-medium text-slate-900">{selectedRecord.payment_date ? new Date(selectedRecord.payment_date).toLocaleDateString() : 'Not paid yet'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Month</span>
                  <span className="font-medium text-slate-900">{monthOptions.find(m => m.value === selectedMonth)?.label}</span>
                </div>
              </div>

              {selectedRecord.status !== 'Paid' && (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => { setShowViewDialog(false); openManageForm(selectedRecord); }}
                >
                  <Banknote className="w-4 h-4 mr-2" />
                  Manage Payroll
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
