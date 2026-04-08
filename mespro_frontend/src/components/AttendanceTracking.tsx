import { toast } from 'sonner';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useI18n } from '../contexts/I18nContext';
import { attendanceService } from '../services/attendance.service';
import { staffService } from '../services/staff.service';
import {
  Search,
  Download,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface AttendanceTrackingProps {
  userRole: string;
}

interface StaffMember {
  id: number;
  name: string;
  employee_id?: string;
  department?: string;
  role?: string;
  phone?: string;
  status?: string;
  shift?: string;
  [key: string]: any;
}

interface AttendanceRecord {
  id?: number;
  staff_id?: number;
  date?: string;
  present?: boolean;
  check_in?: string | null;
  check_out?: string | null;
  hours?: number;
  remarks?: string;
  [key: string]: any;
}

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'half-day', label: 'Half Day' },
  { value: 'paid-leave', label: 'Paid Leave' },
  { value: 'unpaid-leave', label: 'Unpaid Leave' },
];

const STATUS_BADGE: Record<string, string> = {
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-orange-100 text-orange-700',
  'half-day': 'bg-yellow-100 text-yellow-700',
  'paid-leave': 'bg-blue-100 text-blue-700',
  'unpaid-leave': 'bg-purple-100 text-purple-700',
};

function getAttendanceStatus(att: AttendanceRecord | undefined): string {
  if (!att) return '';
  if (att.remarks && ['late', 'half-day', 'paid-leave', 'unpaid-leave'].includes(att.remarks)) return att.remarks;
  return att.present ? 'present' : 'absent';
}

function formatTime(time: string | null | undefined): string {
  if (!time) return '-';
  const parts = time.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

export default function AttendanceTracking({ userRole }: AttendanceTrackingProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('daily');

  // Data
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Daily state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Monthly state
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffData, attData] = await Promise.all([
        staffService.getStaff().catch(() => []),
        attendanceService.getAttendance().catch(() => []),
      ]);
      const staffItems = Array.isArray(staffData) ? staffData : (staffData as any)?.items || [];
      const attItems = Array.isArray(attData) ? attData : (attData as any)?.items || [];
      setStaff(staffItems);
      setAttendanceData(attItems);
      if (staffItems.length > 0 && !selectedEmployee) {
        setSelectedEmployee(String(staffItems[0]?.id || ''));
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Derived stats for selected date
  const dateStr = selectedDate.toISOString().split('T')[0];
  const todayAttendance = attendanceData.filter(a => a.date === dateStr);
  const presentCount = todayAttendance.filter(a => a.present === true).length;
  const absentCount = todayAttendance.filter(a => a.present === false).length;
  const lateCount = todayAttendance.filter(a => a.remarks === 'late').length;
  const attendanceRate = staff.length > 0 ? (presentCount / staff.length * 100) : 0;

  const departments = useMemo(() => {
    const depts = new Set(staff.map(s => s.department).filter(Boolean));
    return Array.from(depts) as string[];
  }, [staff]);

  const filteredStaff = staff.filter(s => {
    const matchSearch = !searchQuery ||
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.employee_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDept = departmentFilter === 'all' || s.department === departmentFilter;
    if (!matchSearch || !matchDept) return false;
    if (statusFilter !== 'all') {
      const att = todayAttendance.find(a => a.staff_id === s.id);
      return getAttendanceStatus(att) === statusFilter;
    }
    return true;
  });

  const isToday = dateStr === new Date().toISOString().split('T')[0];
  const formatDateStr = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

  const navigateDate = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(d);
  };

  const handleStatusChange = async (staffMember: StaffMember, newStatus: string) => {
    const isPresent = ['present', 'late', 'half-day'].includes(newStatus);
    let checkIn: string | null = null;
    let checkOut: string | null = null;
    let hours = 0;

    if (newStatus === 'present') { checkIn = '09:30'; checkOut = '18:30'; hours = 8; }
    else if (newStatus === 'late') { checkIn = '10:30'; checkOut = '18:30'; hours = 7; }
    else if (newStatus === 'half-day') { checkIn = '09:30'; checkOut = '13:30'; hours = 4; }

    try {
      await attendanceService.createAttendance({
        staff_id: staffMember.id,
        date: dateStr,
        present: isPresent,
        check_in: checkIn,
        check_out: checkOut,
        hours,
        remarks: newStatus !== 'present' ? newStatus : '',
      });
      toast.success(`${staffMember.name} marked as ${newStatus}`);
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update');
    }
  };

  const handleMarkAllPresent = async () => {
    try {
      const records = staff.map(s => ({
        staff_id: s.id, date: dateStr, present: true,
        check_in: '09:30', check_out: '18:30', hours: 8, remarks: '',
      }));
      await attendanceService.bulkCreateAttendance(records);
      toast.success('All staff marked as present');
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed');
    }
  };

  // Monthly view
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const empAttendance = attendanceData.filter(a => {
    if (String(a.staff_id) !== selectedEmployee || !a.date) return false;
    const d = new Date(a.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const getStatusForDay = (day: number): string | null => {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const att = empAttendance.find(a => a.date === ds);
    if (!att) return null;
    return getAttendanceStatus(att);
  };

  const presentDays = empAttendance.filter(a => a.present && a.remarks !== 'late' && a.remarks !== 'half-day').length;
  const absentDays = empAttendance.filter(a => !a.present && a.remarks !== 'paid-leave' && a.remarks !== 'unpaid-leave').length;
  const lateDays = empAttendance.filter(a => a.remarks === 'late').length;
  const halfDays = empAttendance.filter(a => a.remarks === 'half-day').length;
  const paidLeaveDays = empAttendance.filter(a => a.remarks === 'paid-leave').length;
  const unpaidLeaveDays = empAttendance.filter(a => a.remarks === 'unpaid-leave').length;
  const workingDays = empAttendance.length;
  const monthlyRate = workingDays > 0 ? ((presentDays + lateDays + halfDays) / workingDays * 100) : 0;

  const todayDay = new Date().getDate();
  const isCurrentMonth = new Date().getFullYear() === year && new Date().getMonth() === month;

  const exportCSV = () => {
    const rows = [['Employee', 'Employee ID', 'Department', 'Date', 'Status', 'Check In', 'Check Out', 'Hours'].join(',')];
    filteredStaff.forEach(s => {
      const att = todayAttendance.find(a => a.staff_id === s.id);
      rows.push([
        s.name, s.employee_id || '', s.department || '', dateStr,
        getAttendanceStatus(att) || 'Not Marked',
        att?.check_in || '', att?.check_out || '', att?.hours || '0',
      ].join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `attendance-${dateStr}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Attendance exported');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-500/10 backdrop-blur-sm border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{staff.length}</div>
            <p className="text-xs text-blue-600">Active employees</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/10 backdrop-blur-sm border-emerald-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('present') || 'Present'}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{presentCount}</div>
            <p className="text-xs text-emerald-600">{isToday ? 'Today' : formatDateStr(selectedDate)}</p>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 backdrop-blur-sm border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('absent') || 'Absent'}</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{absentCount}</div>
            <p className="text-xs text-red-600">{lateCount > 0 ? `${lateCount} Late` : 'Today'}</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/10 backdrop-blur-sm border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{attendanceRate.toFixed(0)}%</div>
            <p className="text-xs text-amber-600">{isToday ? 'Today' : formatDateStr(selectedDate)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="daily">Daily Attendance</TabsTrigger>
            <TabsTrigger value="monthly">Monthly View</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button className="text-white bg-green-600 hover:bg-green-700" size="sm" onClick={handleMarkAllPresent}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Mark All Present
            </Button>
          </div>
        </div>

        {/* ===== DAILY ATTENDANCE TAB ===== */}
        <TabsContent value="daily" className="space-y-4">
          {/* Date Navigator */}
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigateDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="font-medium">{isToday ? 'Today — ' : ''}{formatDateStr(selectedDate)}</span>
            </div>
            <Button variant="outline" size="icon" onClick={() => navigateDate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Input
              type="date"
              value={dateStr}
              onChange={e => { if (e.target.value) setSelectedDate(new Date(e.target.value + 'T00:00:00')); }}
              className="w-[160px] h-9"
            />
          </div>

          {/* Search + Filters */}
          <Card>
            <CardHeader>
              <div className="flex gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or ID..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={exportCSV}>
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
              </div>
            </CardHeader>

            {/* Attendance Table */}
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                        {staff.length === 0 ? 'No staff members found. Add staff first.' : 'No matching records'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStaff.map((s, idx) => {
                      const att = todayAttendance.find(a => a.staff_id === s.id);
                      const status = getAttendanceStatus(att);
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="text-gray-400">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-xs">
                                {(s.name || 'U')[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{s.name}</p>
                                <p className="text-xs text-gray-400">{s.employee_id || `#${s.id}`}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-500">{s.department || '-'}</TableCell>
                          <TableCell className="font-mono text-sm">{formatTime(att?.check_in)}</TableCell>
                          <TableCell className="font-mono text-sm">{formatTime(att?.check_out)}</TableCell>
                          <TableCell>
                            {att?.hours ? (
                              <span className={`font-medium ${Number(att.hours) >= 8 ? 'text-green-600' : 'text-amber-600'}`}>
                                {Number(att.hours).toFixed(1)}h
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {status ? (
                              <Badge className={STATUS_BADGE[status] || 'bg-gray-100 text-gray-700'}>
                                {STATUS_OPTIONS.find(o => o.value === status)?.label || status}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-xs">Not marked</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <select
                              className="border rounded-md px-2 py-1.5 text-xs bg-white outline-none cursor-pointer focus:ring-2 focus:ring-blue-500"
                              value={status || ''}
                              onChange={e => { if (e.target.value) handleStatusChange(s, e.target.value); }}
                            >
                              <option value="">Set Status</option>
                              {STATUS_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== MONTHLY VIEW TAB ===== */}
        <TabsContent value="monthly" className="space-y-4">
          {/* Month Nav + Employee Selector */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => { const d = new Date(monthDate); d.setMonth(d.getMonth() - 1); setMonthDate(d); }}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-lg font-semibold">{monthName}</h2>
                <p className="text-xs text-gray-500">Monthly Attendance Overview</p>
              </div>
              <Button variant="outline" size="icon" onClick={() => { const d = new Date(monthDate); d.setMonth(d.getMonth() + 1); setMonthDate(d); }}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select Employee" />
              </SelectTrigger>
              <SelectContent>
                {staff.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name} ({s.employee_id || s.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <Card className="lg:col-span-2">
              <CardContent className="p-6">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="text-center text-xs text-gray-400 font-medium py-2">{d}</div>
                  ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const status = getStatusForDay(day);
                    const isTodayCell = isCurrentMonth && day === todayDay;
                    return (
                      <div
                        key={day}
                        className={`text-center py-2.5 rounded-lg text-sm transition-colors ${
                          isTodayCell ? 'ring-2 ring-blue-600 font-bold' : ''
                        } ${status ? (STATUS_BADGE[status] || 'bg-gray-50') : 'text-gray-600 hover:bg-gray-50'}`}
                        title={status ? `${day}: ${status}` : `${day}`}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t">
                  {STATUS_OPTIONS.map(s => (
                    <div key={s.value} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className={`w-3 h-3 rounded ${STATUS_BADGE[s.value]?.split(' ')[0] || 'bg-gray-100'}`} />
                      {s.label}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sidebar Stats */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Monthly Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: 'Present', value: presentDays, color: 'bg-green-500' },
                    { label: 'Absent', value: absentDays, color: 'bg-red-500' },
                    { label: 'Late', value: lateDays, color: 'bg-orange-500' },
                    { label: 'Half Day', value: halfDays, color: 'bg-yellow-500' },
                    { label: 'Paid Leave', value: paidLeaveDays, color: 'bg-blue-500' },
                    { label: 'Unpaid Leave', value: unpaidLeaveDays, color: 'bg-purple-500' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                        <span className="text-gray-600">{item.label}</span>
                      </div>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                  ))}
                  <hr />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Working Days</span>
                    <span className="font-semibold">{workingDays}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Attendance Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-700 mb-3">{monthlyRate.toFixed(1)}%</div>
                  <Progress value={monthlyRate} className="h-3" />
                  <p className="text-xs text-gray-500 mt-2">
                    {presentDays + lateDays + halfDays} of {workingDays} days present
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
