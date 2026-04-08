import { toast } from 'sonner';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { translations, Language } from '../translations';
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
  BarChart3,
  FileText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Zap,
  Eye,
  EyeOff,
  Timer,
  Sun,
  Shield,
  ArrowRightLeft,
  Building,
  MapPin,
} from 'lucide-react';

interface AttendanceTrackingProps {
  userRole: string;
  language?: Language;
}

type TabKey = 'dashboard' | 'daily' | 'monthly' | 'reports';

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

export default function AttendanceTracking({ userRole, language = 'en' }: AttendanceTrackingProps) {
  const t = (key: keyof typeof translations.en) => translations[language]?.[key] || translations.en[key];
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [privacyMode, setPrivacyMode] = useState(false);

  // Data
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Daily Attendance state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Monthly View state
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');

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

  // Derived stats
  const todayStr = selectedDate.toISOString().split('T')[0];
  const todayAttendance = attendanceData.filter(a => a.date === todayStr);

  const presentCount = todayAttendance.filter(a => a.present === true).length;
  const absentCount = todayAttendance.filter(a => a.present === false).length;
  const lateCount = todayAttendance.filter(a => a.remarks === 'late').length;
  const halfDayCount = todayAttendance.filter(a => a.remarks === 'half-day').length;
  const paidLeaveCount = todayAttendance.filter(a => a.remarks === 'paid-leave').length;
  const unpaidLeaveCount = todayAttendance.filter(a => a.remarks === 'unpaid-leave').length;
  const totalHours = todayAttendance.reduce((sum, a) => sum + (Number(a.hours) || 0), 0);
  const overtime = todayAttendance.reduce((sum, a) => {
    const hrs = Number(a.hours) || 0;
    return sum + (hrs > 8 ? hrs - 8 : 0);
  }, 0);
  const attendanceRate = staff.length > 0 ? ((presentCount + lateCount + halfDayCount) / staff.length * 100) : 0;
  const onSiteNow = todayAttendance.filter(a => a.check_in && !a.check_out && a.present).length;

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'daily', label: 'Daily Attendance', icon: <Users className="w-4 h-4" /> },
    { key: 'monthly', label: 'Monthly View', icon: <Calendar className="w-4 h-4" /> },
    { key: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-sm text-gray-500">Track attendance, check-ins, and field operations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPrivacyMode(!privacyMode)}>
            {privacyMode ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
            Privacy
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <nav className="flex items-center gap-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <DashboardTab
          staff={staff}
          attendanceData={todayAttendance}
          presentCount={presentCount}
          absentCount={absentCount}
          lateCount={lateCount}
          halfDayCount={halfDayCount}
          paidLeaveCount={paidLeaveCount}
          unpaidLeaveCount={unpaidLeaveCount}
          totalHours={totalHours}
          overtime={overtime}
          attendanceRate={attendanceRate}
          onSiteNow={onSiteNow}
          privacyMode={privacyMode}
          onMarkAllPresent={() => toast.success('All staff marked as present')}
          onMarkAllAbsent={() => toast.success('All staff marked as absent')}
        />
      )}

      {activeTab === 'daily' && (
        <DailyAttendanceTab
          staff={staff}
          attendanceData={attendanceData}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          departmentFilter={departmentFilter}
          setDepartmentFilter={setDepartmentFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          presentCount={presentCount}
          absentCount={absentCount}
          lateCount={lateCount}
          halfDayCount={halfDayCount}
          paidLeaveCount={paidLeaveCount}
          unpaidLeaveCount={unpaidLeaveCount}
          totalHours={totalHours}
          overtime={overtime}
          privacyMode={privacyMode}
          onRefresh={fetchData}
          userRole={userRole}
        />
      )}

      {activeTab === 'monthly' && (
        <MonthlyViewTab
          staff={staff}
          attendanceData={attendanceData}
          monthDate={monthDate}
          setMonthDate={setMonthDate}
          selectedEmployee={selectedEmployee}
          setSelectedEmployee={setSelectedEmployee}
          privacyMode={privacyMode}
        />
      )}

      {activeTab === 'reports' && (
        <ReportsTab
          staff={staff}
          attendanceData={attendanceData}
          privacyMode={privacyMode}
        />
      )}
    </div>
  );
}

/* ============================================================
   DASHBOARD TAB
   ============================================================ */
interface DashboardTabProps {
  staff: StaffMember[];
  attendanceData: AttendanceRecord[];
  presentCount: number;
  absentCount: number;
  lateCount: number;
  halfDayCount: number;
  paidLeaveCount: number;
  unpaidLeaveCount: number;
  totalHours: number;
  overtime: number;
  attendanceRate: number;
  onSiteNow: number;
  privacyMode: boolean;
  onMarkAllPresent: () => void;
  onMarkAllAbsent: () => void;
}

function DashboardTab({
  staff, presentCount, absentCount, lateCount,
  halfDayCount, paidLeaveCount, unpaidLeaveCount, totalHours,
  overtime, attendanceRate, onSiteNow, privacyMode,
  onMarkAllPresent, onMarkAllAbsent, attendanceData,
}: DashboardTabProps) {
  const avgHoursPerPerson = presentCount > 0 ? totalHours / presentCount : 0;

  const statCards = [
    { label: 'TOTAL STAFF', value: staff.length, icon: <Users className="w-5 h-5 text-gray-500" />, color: 'text-gray-900' },
    { label: 'PRESENT', value: presentCount, icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, color: 'text-green-600' },
    { label: 'ABSENT', value: absentCount, icon: <XCircle className="w-5 h-5 text-red-500" />, color: 'text-red-600' },
    { label: 'LATE', value: lateCount, icon: <Clock className="w-5 h-5 text-orange-500" />, color: 'text-orange-600' },
    { label: 'HALF DAY', value: halfDayCount, icon: <Sun className="w-5 h-5 text-yellow-500" />, color: 'text-yellow-600' },
    { label: 'PAID LEAVE', value: paidLeaveCount, icon: <Shield className="w-5 h-5 text-blue-500" />, color: 'text-blue-600' },
    { label: 'UNPAID LEAVE', value: unpaidLeaveCount, icon: <Calendar className="w-5 h-5 text-purple-500" />, color: 'text-purple-600' },
    { label: 'ATTENDANCE RATE', value: `${attendanceRate.toFixed(0)}%`, icon: <TrendingUp className="w-5 h-5 text-indigo-500" />, color: attendanceRate > 0 ? 'text-green-600' : 'text-red-600' },
    { label: 'ON-SITE NOW', value: onSiteNow, icon: <MapPin className="w-5 h-5 text-teal-500" />, color: 'text-gray-900' },
  ];

  const statusBreakdown = [
    { label: 'Present', count: presentCount, color: 'bg-green-500' },
    { label: 'Late', count: lateCount, color: 'bg-orange-500' },
    { label: 'Half Day', count: halfDayCount, color: 'bg-yellow-500' },
    { label: 'Absent', count: absentCount, color: 'bg-red-500' },
    { label: 'Paid Leave', count: paidLeaveCount, color: 'bg-blue-500' },
    { label: 'Unpaid Leave', count: unpaidLeaveCount, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-4">
        {statCards.map(card => (
          <Card key={card.label} className="p-4">
            <div className="flex flex-col gap-2">
              {card.icon}
              <span className={`text-2xl font-bold ${card.color}`}>
                {privacyMode ? '•••' : card.value}
              </span>
              <span className="text-xs text-gray-500 uppercase tracking-wide">{card.label}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Hours Overview + Status Breakdown + Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Hours Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Timer className="w-5 h-5 text-gray-500" />
              Hours Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Hours Today</span>
              <span className="font-medium">{privacyMode ? '•••' : `${totalHours.toFixed(0)}h`}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Overtime</span>
              <span className="font-medium">{privacyMode ? '•••' : `${overtime.toFixed(0)}h`}</span>
            </div>
            <hr />
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Avg Hours/Person</span>
              <span className="font-medium">{privacyMode ? '•••' : `${avgHoursPerPerson.toFixed(0)}h`}</span>
            </div>
            <hr />
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Standard Hours</span>
              <span className="text-gray-400">8h per day</span>
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-5 h-5 text-gray-500" />
              Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusBreakdown.map(item => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                  <span className="text-gray-600">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{privacyMode ? '•' : item.count}</span>
                  <div className="w-16 bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${item.color}`}
                      style={{ width: `${staff.length > 0 ? (item.count / staff.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-5 h-5 text-yellow-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={onMarkAllPresent}>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Mark All Present
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={onMarkAllAbsent}>
              <XCircle className="w-4 h-4 text-red-500" />
              Mark All Absent
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => toast.info('Manage Check-ins')}>
              <ArrowRightLeft className="w-4 h-4 text-blue-500" />
              Manage Check-ins
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => toast.info('Opening site monitor...')}>
              <Building className="w-4 h-4 text-purple-500" />
              Live Site Monitor
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => toast.info('Privacy Settings')}>
              <Eye className="w-4 h-4 text-gray-500" />
              Privacy Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Today's Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-5 h-5 text-yellow-500" />
            Today&apos;s Activity
          </CardTitle>
          <Button variant="link" size="sm" className="text-blue-600">View All</Button>
        </CardHeader>
        <CardContent>
          {attendanceData.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No attendance marked yet today</p>
          ) : (
            <div className="space-y-2">
              {attendanceData.slice(0, 5).map((record, idx) => {
                const emp = staff.find(s => s.id === record.staff_id);
                return (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-xs">
                        {(emp?.name || 'U')[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{privacyMode ? '•••••' : (emp?.name || `Employee #${record.worker_id}`)}</p>
                        <p className="text-gray-500 text-xs">
                          {record.check_in ? `Checked in at ${record.check_in}` : 'No check-in'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={record.present ? 'default' : 'destructive'}>
                      {record.present ? 'Present' : 'Absent'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================
   DAILY ATTENDANCE TAB
   ============================================================ */
interface DailyAttendanceTabProps {
  staff: StaffMember[];
  attendanceData: AttendanceRecord[];
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  departmentFilter: string;
  setDepartmentFilter: (d: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  halfDayCount: number;
  paidLeaveCount: number;
  unpaidLeaveCount: number;
  totalHours: number;
  overtime: number;
  privacyMode: boolean;
  onRefresh: () => void;
  userRole: string;
}

function DailyAttendanceTab({
  staff, attendanceData, selectedDate, setSelectedDate,
  searchQuery, setSearchQuery, departmentFilter, setDepartmentFilter,
  statusFilter, setStatusFilter, presentCount, absentCount, lateCount,
  halfDayCount, paidLeaveCount, unpaidLeaveCount, totalHours, overtime,
  privacyMode, onRefresh,
}: DailyAttendanceTabProps) {
  const dateStr = selectedDate.toISOString().split('T')[0];
  const todayAttendance = attendanceData.filter(a => a.date === dateStr);
  const isToday = dateStr === new Date().toISOString().split('T')[0];

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
      const derivedStatus = att ? (att.remarks && ['late','half-day','paid-leave','unpaid-leave'].includes(att.remarks) ? att.remarks : (att.present ? 'present' : 'absent')) : '';
      return derivedStatus === statusFilter;
    }
    return true;
  });

  const formatTime = (time: string | null | undefined): string => {
    if (!time) return '--:-- --';
    // time comes as "HH:MM:SS" from DB, convert to "hh:mm AM/PM"
    const parts = time.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1] || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
  };

  const navigateDate = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(d);
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const summaryStats = [
    { label: 'Present', value: presentCount, bg: 'bg-green-50', color: 'text-green-600' },
    { label: 'Absent', value: absentCount, bg: 'bg-red-50', color: 'text-red-600' },
    { label: 'Late', value: lateCount, bg: 'bg-orange-50', color: 'text-orange-600' },
    { label: 'Half Day', value: halfDayCount, bg: 'bg-yellow-50', color: 'text-yellow-600' },
    { label: 'Paid Leave', value: paidLeaveCount, bg: 'bg-blue-50', color: 'text-blue-600' },
    { label: 'Unpaid Leave', value: unpaidLeaveCount, bg: 'bg-purple-50', color: 'text-purple-600' },
    { label: 'Hours', value: `${totalHours.toFixed(0)}h`, bg: 'bg-gray-50', color: 'text-gray-900' },
    { label: 'Overtime', value: `${overtime.toFixed(0)}h`, bg: 'bg-red-50', color: 'text-red-600' },
  ];

  const handleStatusChange = async (staffMember: StaffMember, newStatus: string) => {
    const isPresent = ['present', 'late', 'half-day'].includes(newStatus);

    // Late: check-in 1h or 1.5h late → 10:30, checkout 18:30, hours reduced
    // Half Day: 09:30 to 13:30, 4h
    // Present: 09:30 to 18:30, 8h
    let checkIn: string | null = null;
    let checkOut: string | null = null;
    let hours = 0;

    if (newStatus === 'present') {
      checkIn = '09:30';
      checkOut = '18:30';
      hours = 8;
    } else if (newStatus === 'late') {
      checkIn = '10:30';   // 1h late
      checkOut = '18:30';
      hours = 7;           // 8h - 1h late
    } else if (newStatus === 'half-day') {
      checkIn = '09:30';
      checkOut = '13:30';
      hours = 4;           // half day
    }

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
      toast.success(`Status updated for ${staffMember.name}`);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update status');
    }
  };

  const handleMarkAllPresent = async () => {
    try {
      const records = staff.map(s => ({
        staff_id: s.id,
        date: dateStr,
        present: true,
        check_in: '09:30',
        check_out: '18:30',
        hours: 8,
        remarks: '',
      }));
      await attendanceService.bulkCreateAttendance(records);
      toast.success('All staff marked as present');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to mark all present');
    }
  };

  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              <span className="text-lg font-semibold">{isToday ? 'Today' : formatDate(selectedDate)}</span>
            </div>
            <p className="text-sm text-gray-500">{formatDate(selectedDate)}</p>
          </div>
          <button onClick={() => navigateDate(1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </Card>

      {/* Summary Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {summaryStats.map(stat => (
          <div key={stat.label} className={`${stat.bg} rounded-lg p-3 text-center`}>
            <p className={`text-lg font-bold ${stat.color}`}>{privacyMode ? '•' : stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search / Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by name or ID..."
            className="pl-9"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="present">Present</SelectItem>
            <SelectItem value="absent">Absent</SelectItem>
            <SelectItem value="late">Late</SelectItem>
            <SelectItem value="half-day">Half Day</SelectItem>
            <SelectItem value="paid-leave">Paid Leave</SelectItem>
            <SelectItem value="unpaid-leave">Unpaid Leave</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleMarkAllPresent}>
          <CheckCircle2 className="w-4 h-4 mr-1" /> All Present
        </Button>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 text-gray-500 font-medium">#</th>
                  <th className="text-left p-3 text-gray-500 font-medium">Employee</th>
                  <th className="text-left p-3 text-gray-500 font-medium">Department</th>
                  <th className="text-left p-3 text-gray-500 font-medium">Check In</th>
                  <th className="text-left p-3 text-gray-500 font-medium">Check Out</th>
                  <th className="text-left p-3 text-gray-500 font-medium">Hours</th>
                  <th className="text-left p-3 text-gray-500 font-medium">Status</th>
                  <th className="text-left p-3 text-gray-500 font-medium">Late</th>
                  <th className="text-left p-3 text-gray-500 font-medium">OT</th>
                  <th className="text-left p-3 text-gray-500 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-gray-400">
                      No staff found
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((s, idx) => {
                    const att = todayAttendance.find(a => a.staff_id === s.id);
                    return (
                      <tr key={s.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-gray-400">{idx + 1}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-xs">
                              {(s.name || 'U')[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{privacyMode ? '•••••' : s.name}</p>
                              <p className="text-xs text-gray-400">{s.employee_id || s.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-gray-500">{s.department || '-'}</td>
                        <td className="p-3">
                          <span className="text-sm font-medium text-gray-700">{formatTime(att?.check_in)}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-sm font-medium text-gray-700">{formatTime(att?.check_out)}</span>
                        </td>
                        <td className="p-3 text-gray-500">{att?.hours ? `${Number(att.hours).toFixed(2)}h` : '-'}</td>
                        <td className="p-3">
                          <select
                            className="border rounded px-2 py-1 text-xs bg-white"
                            defaultValue={att ? (att.remarks && ['late','half-day','paid-leave','unpaid-leave'].includes(att.remarks) ? att.remarks : (att.present ? 'present' : 'absent')) : ''}
                            onChange={e => {
                              if (e.target.value) handleStatusChange(s, e.target.value);
                            }}
                          >
                            <option value="">Set Status</option>
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                            <option value="half-day">Half Day</option>
                            <option value="paid-leave">Paid Leave</option>
                            <option value="unpaid-leave">Unpaid Leave</option>
                          </select>
                        </td>
                        <td className="p-3 text-gray-500">{att?.remarks === 'late' ? 'Yes' : '-'}</td>
                        <td className="p-3 text-gray-500">{att?.hours && Number(att.hours) > 8 ? `${(Number(att.hours) - 8).toFixed(1)}h` : '-'}</td>
                        <td className="p-3">
                          <Input
                            defaultValue={att?.remarks || ''}
                            className="h-8 text-xs"
                            placeholder="Notes..."
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================
   MONTHLY VIEW TAB
   ============================================================ */
interface MonthlyViewTabProps {
  staff: StaffMember[];
  attendanceData: AttendanceRecord[];
  monthDate: Date;
  setMonthDate: (d: Date) => void;
  selectedEmployee: string;
  setSelectedEmployee: (id: string) => void;
  privacyMode: boolean;
}

function MonthlyViewTab({
  staff, attendanceData, monthDate, setMonthDate,
  selectedEmployee, setSelectedEmployee, privacyMode,
}: MonthlyViewTabProps) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const navigateMonth = (dir: number) => {
    const d = new Date(monthDate);
    d.setMonth(d.getMonth() + dir);
    setMonthDate(d);
  };

  // Get attendance for selected employee this month
  const empAttendance = attendanceData.filter(a => {
    const staffMatch = String(a.staff_id) === selectedEmployee;
    if (!staffMatch) return false;
    if (!a.date) return false;
    const d = new Date(a.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const getStatusForDay = (day: number): string | null => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const att = empAttendance.find(a => a.date === dateStr);
    if (!att) return null;
    if (att.remarks && ['late', 'half-day', 'paid-leave', 'unpaid-leave'].includes(att.remarks)) return att.remarks;
    return att.present ? 'present' : 'absent';
  };

  const statusColors: Record<string, string> = {
    'present': 'bg-green-100 text-green-700',
    'absent': 'bg-red-100 text-red-700',
    'late': 'bg-orange-100 text-orange-700',
    'half-day': 'bg-yellow-100 text-yellow-700',
    'paid-leave': 'bg-blue-100 text-blue-700',
    'unpaid-leave': 'bg-purple-100 text-purple-700',
  };

  // Monthly statistics
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

  return (
    <div className="space-y-4">
      {/* Month Navigation + Employee Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold">{monthName}</h2>
            <p className="text-sm text-gray-500">Monthly Attendance Overview</p>
          </div>
          <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select Employee" />
          </SelectTrigger>
          <SelectContent>
            {staff.map(s => (
              <SelectItem key={s.id} value={String(s.id)}>
                {privacyMode ? '•••••' : s.name} ({s.employee_id || s.id})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => navigateMonth(-1)} className="p-1 hover:bg-gray-100 rounded">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="font-semibold">{monthName}</h3>
                <button onClick={() => navigateMonth(1)} className="p-1 hover:bg-gray-100 rounded">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const status = getStatusForDay(day);
                  const isTodayCell = isCurrentMonth && day === todayDay;
                  return (
                    <div
                      key={day}
                      className={`text-center py-2 rounded-lg text-sm cursor-default transition-colors ${
                        isTodayCell ? 'ring-2 ring-gray-900 font-bold' : ''
                      } ${status ? statusColors[status] || 'bg-gray-50' : 'text-gray-600 hover:bg-gray-50'}`}
                      title={status ? `${day}: ${status}` : `${day}`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
                {[
                  { label: 'Present', color: 'bg-green-100' },
                  { label: 'Absent', color: 'bg-red-100' },
                  { label: 'Late', color: 'bg-orange-100' },
                  { label: 'Half Day', color: 'bg-yellow-100' },
                  { label: 'Paid Leave', color: 'bg-blue-100' },
                  { label: 'Unpaid Leave', color: 'bg-purple-100' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className={`w-3 h-3 rounded ${item.color}`} />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Stats */}
        <div className="space-y-4">
          {/* Monthly Statistics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-purple-700">Monthly Statistics</CardTitle>
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
                  <span className="font-medium">{privacyMode ? '•' : item.value}</span>
                </div>
              ))}
              <hr />
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Working Days</span>
                <span className="font-medium">{privacyMode ? '•' : workingDays}</span>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Rate */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-purple-700">Attendance Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold mb-3">
                {privacyMode ? '•••' : `${monthlyRate.toFixed(1)}%`}
              </p>
              <Progress value={monthlyRate} className="h-3" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   REPORTS TAB
   ============================================================ */
interface ReportsTabProps {
  staff: StaffMember[];
  attendanceData: AttendanceRecord[];
  privacyMode: boolean;
}

function ReportsTab({ staff, attendanceData, privacyMode }: ReportsTabProps) {
  const today = new Date();
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const weeklyData = weekDays.map((day, idx) => {
    const d = new Date(today);
    const currentDayOfWeek = d.getDay();
    const targetDayOfWeek = idx + 1;
    d.setDate(d.getDate() - (currentDayOfWeek - targetDayOfWeek));
    const dateStr = d.toISOString().split('T')[0];
    const dayAtt = attendanceData.filter(a => a.date === dateStr);
    const pres = dayAtt.filter(a => a.present === true).length;
    const abs = dayAtt.filter(a => a.present === false).length;
    return { day, present: pres, absent: abs, total: staff.length };
  });

  const maxVal = Math.max(...weeklyData.map(d => d.present + d.absent), 1);

  // Week stats
  const weekAttendance = attendanceData.filter(a => {
    if (!a.date) return false;
    const d = new Date(a.date);
    const diffMs = today.getTime() - d.getTime();
    return diffMs >= 0 && diffMs <= 7 * 24 * 60 * 60 * 1000;
  });
  const weekPresent = weekAttendance.filter(a => a.present === true).length;
  const weekTotal = staff.length * 6;
  const avgAttendanceRate = weekTotal > 0 ? (weekPresent / weekTotal * 100) : 0;
  const totalWeekHours = weekAttendance.reduce((sum, a) => sum + (Number(a.hours) || 0), 0);
  const weekOvertime = weekAttendance.reduce((sum, a) => {
    const hrs = Number(a.hours) || 0;
    return sum + (hrs > 8 ? hrs - 8 : 0);
  }, 0);

  // Department breakdown
  const departments = useMemo(() => {
    const deptMap: Record<string, { present: number; total: number }> = {};
    staff.forEach(s => {
      const dept = s.department || 'Unassigned';
      if (!deptMap[dept]) deptMap[dept] = { present: 0, total: 0 };
      deptMap[dept].total++;
    });
    return deptMap;
  }, [staff]);

  const exportReports = [
    { title: 'Daily Attendance Report', desc: 'CSV with all staff check-in/out data', icon: <FileText className="w-5 h-5 text-blue-500" /> },
    { title: 'Monthly Summary', desc: 'PDF with stats and charts', icon: <BarChart3 className="w-5 h-5 text-purple-500" /> },
    { title: 'Overtime Report', desc: 'All OT hours with breakdown', icon: <Clock className="w-5 h-5 text-orange-500" /> },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            AVG ATTENDANCE RATE
          </div>
          <p className={`text-2xl font-bold ${avgAttendanceRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {privacyMode ? '•••' : `${avgAttendanceRate.toFixed(0)}%`}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Timer className="w-4 h-4 text-blue-500" />
            TOTAL HOURS THIS WEEK
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {privacyMode ? '•••' : `${totalWeekHours.toFixed(0)}h`}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Zap className="w-4 h-4 text-red-500" />
            OVERTIME THIS WEEK
          </div>
          <p className="text-2xl font-bold text-red-600">
            {privacyMode ? '•••' : `${weekOvertime.toFixed(0)}h`}
          </p>
        </Card>
      </div>

      {/* Weekly Chart + Department Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Attendance Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Weekly Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-48">
              {weeklyData.map(d => {
                const absentHeight = maxVal > 0 ? (d.absent / maxVal) * 100 : 0;
                const presentHeight = maxVal > 0 ? (d.present / maxVal) * 100 : 0;
                return (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col justify-end h-40">
                      <div
                        className="w-full bg-red-200 rounded-t"
                        style={{ height: `${absentHeight}%`, minHeight: d.absent > 0 ? '4px' : '0' }}
                      />
                      <div
                        className="w-full bg-green-400 rounded-b"
                        style={{ height: `${presentHeight}%`, minHeight: d.present > 0 ? '4px' : '0' }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{d.day}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-3 h-3 rounded bg-green-400" />
                Present
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-3 h-3 rounded bg-red-200" />
                Absent
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Department Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-purple-500" />
              Department Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(departments).length === 0 ? (
              <p className="text-center text-gray-400 py-8">No department data</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(departments).map(([dept, data]) => (
                  <div key={dept} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{dept}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{privacyMode ? '•' : `${data.present}/${data.total}`}</span>
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-blue-500"
                          style={{ width: `${data.total > 0 ? (data.present / data.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Export Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="w-5 h-5 text-blue-500" />
              Export Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {exportReports.map(report => (
                <div
                  key={report.title}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  onClick={() => toast.info(`Downloading ${report.title}...`)}
                >
                  <div className="flex items-center gap-3">
                    {report.icon}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{report.title}</p>
                      <p className="text-xs text-gray-500">{report.desc}</p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
