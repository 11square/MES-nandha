import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { translations, Language } from '../translations';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { FieldError, validateFields, type ValidationErrors } from '../lib/validation';

interface StaffManagementProps {
  language?: Language;
}
import { 
  UserPlus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Phone, 
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  Eye
} from 'lucide-react';
import { Badge } from './ui/badge';

import { staffService } from '../services/staff.service';
export default function StaffManagement({ language = 'en' }: StaffManagementProps) {
  const t = (key: keyof typeof translations.en) => translations[language][key] || translations.en[key];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [editErrors, setEditErrors] = useState<ValidationErrors>({});
  const [newStaff, setNewStaff] = useState({
    employee_id: '',
    name: '',
    role: '',
    department: '',
    phone: '',
    email: '',
    join_date: '',
    status: 'Active',
    shift: '',
    location: '',
  });
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [editStaff, setEditStaff] = useState({
    id: '',
    employee_id: '',
    name: '',
    role: '',
    department: '',
    phone: '',
    email: '',
    join_date: '',
    status: 'Active',
    shift: '',
    location: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [staffMembers, setStaffMembers] = useState<any[]>([]);

  const refreshStaff = useCallback(() => {
    staffService.getStaff().then(data => {
      const items = Array.isArray(data) ? data : (data as any)?.items || [];
      setStaffMembers(items);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    refreshStaff();
  }, [refreshStaff]);

  const departments = useMemo(() => {
    const base = ['Production', 'Quality', 'Dispatch', 'Inventory', 'HR'];
    const fromData = staffMembers
      .map((staff) => staff.department)
      .filter((dept) => typeof dept === 'string' && dept.trim().length > 0);
    const unique = Array.from(new Set([...base, ...fromData]));
    return ['all', ...unique];
  }, [staffMembers]);
  const roleOptions = ['Supervisor', 'Operator', 'Technician', 'Manager', 'Assistant'];
  const shiftOptions = ['Morning', 'Evening', 'Night'];

  const generateNextEmployeeId = useCallback(() => {
    const existingIds = staffMembers
      .map(s => String(s.employee_id || ''))
      .filter(id => /^EMP-\d+$/.test(id))
      .map(id => parseInt(id.replace('EMP-', ''), 10))
      .sort((a, b) => a - b);
    // Find the first gap in the sequence (reuse deleted IDs)
    let nextId = 1;
    for (const id of existingIds) {
      if (id === nextId) {
        nextId++;
      } else if (id > nextId) {
        break; // Found a gap
      }
    }
    return `EMP-${String(nextId).padStart(3, '0')}`;
  }, [staffMembers]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-100 text-emerald-700';
      case 'On Leave': return 'bg-amber-100 text-amber-700';
      case 'Inactive': return 'bg-slate-100 text-slate-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const filteredStaff = staffMembers.filter(staff => {
    const name = String(staff.name || '').toLowerCase();
    const employeeId = String(staff.employee_id || '').toLowerCase();
    const role = String(staff.role || '').toLowerCase();
    const status = String(staff.status || '').toLowerCase();
    const department = String(staff.department || '');
    const query = searchQuery.toLowerCase();

    const matchesSearch = name.includes(query) || employeeId.includes(query) || role.includes(query);
    const matchesDepartment = selectedDepartment === 'all' || department === selectedDepartment;
    const matchesStatus = selectedStatus === 'all' || status === selectedStatus.toLowerCase();
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDepartment, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredStaff.length);
  const paginatedStaff = filteredStaff.slice(startIndex, endIndex);

  const totalStaff = staffMembers.length;
  const activeStaff = staffMembers.filter((staff) => staff.status === 'Active').length;
  const onLeaveStaff = staffMembers.filter((staff) => staff.status === 'On Leave').length;
  const activeRate = totalStaff ? (activeStaff / totalStaff) * 100 : 0;
  const departmentCount = departments.length > 0 ? departments.length - 1 : 0;

  const handleCreateStaff = async () => {
    const validationErrors = validateFields(newStaff, {
      employee_id: { required: true, label: 'Employee ID' },
      name: { required: true, label: 'Full Name', min: 2 },
      role: { required: true, label: 'Role' },
      department: { required: true, label: 'Department' },
      phone: { required: true, phone: true, label: 'Phone' },
      email: { required: true, email: true, label: 'Email' },
      join_date: { required: true, label: 'Join Date' },
      status: { required: true, label: 'Status' },
      shift: { required: true, label: 'Shift' },
      location: { required: true, label: 'Location' },
    });

    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    try {
      await staffService.createStaff({
        employee_id: newStaff.employee_id,
        name: newStaff.name,
        role: newStaff.role,
        department: newStaff.department,
        phone: newStaff.phone,
        email: newStaff.email,
        join_date: newStaff.join_date,
        status: newStaff.status,
        shift: newStaff.shift,
        location: newStaff.location,
      });
      toast.success('Staff member created successfully');
      setShowAddDialog(false);
      setErrors({});
      setNewStaff({
        employee_id: '',
        name: '',
        role: '',
        department: '',
        phone: '',
        email: '',
        join_date: '',
        status: 'Active',
        shift: '',
        location: '',
      });
      refreshStaff();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create staff member');
    }
  };

  const handleOpenView = (staff: any) => {
    setSelectedStaff(staff);
    setShowViewDialog(true);
  };

  const handleOpenEdit = (staff: any) => {
    setEditStaff({
      id: staff.id,
      employee_id: staff.employee_id || '',
      name: staff.name || '',
      role: staff.role || '',
      department: staff.department || '',
      phone: staff.phone || '',
      email: staff.email || '',
      join_date: staff.join_date || '',
      status: staff.status || 'Active',
      shift: staff.shift || '',
      location: staff.location || '',
    });
    setEditErrors({});
    setShowEditDialog(true);
  };

  const handleUpdateStaff = async () => {
    const validationErrors = validateFields(editStaff, {
      employee_id: { required: true, label: 'Employee ID' },
      name: { required: true, label: 'Full Name', min: 2 },
      role: { required: true, label: 'Role' },
      department: { required: true, label: 'Department' },
      phone: { required: true, phone: true, label: 'Phone' },
      email: { required: true, email: true, label: 'Email' },
      join_date: { required: true, label: 'Join Date' },
      status: { required: true, label: 'Status' },
      shift: { required: true, label: 'Shift' },
      location: { required: true, label: 'Location' },
    });

    if (Object.keys(validationErrors).length) {
      setEditErrors(validationErrors);
      return;
    }

    try {
      await staffService.updateStaff(editStaff.id, {
        employee_id: editStaff.employee_id,
        name: editStaff.name,
        role: editStaff.role,
        department: editStaff.department,
        phone: editStaff.phone,
        email: editStaff.email,
        join_date: editStaff.join_date,
        status: editStaff.status,
        shift: editStaff.shift,
        location: editStaff.location,
      });
      toast.success('Staff member updated successfully');
      setShowEditDialog(false);
      setSelectedStaff(null);
      refreshStaff();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update staff member');
    }
  };

  const handleOpenDelete = (staff: any) => {
    setSelectedStaff(staff);
    setShowDeleteDialog(true);
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaff?.id) {
      return;
    }
    try {
      await staffService.deleteStaff(selectedStaff.id);
      toast.success('Staff member deleted successfully');
      setShowDeleteDialog(false);
      setSelectedStaff(null);
      refreshStaff();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete staff member');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl text-slate-900 font-bold">{t('staffManagement')}</h2>
          <p className="text-sm text-slate-600 mt-1">{t('manageStaff')}</p>
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
            <span className="text-sm text-slate-600 font-medium">{t('totalStaff')}</span>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">{totalStaff}</p>
          <p className="text-xs text-slate-600 mt-1">{t('employees')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">{t('activeToday')}</span>
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">{activeStaff}</p>
          <p className="text-xs text-slate-600 mt-1">{activeRate.toFixed(1)}% {t('active')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">{t('onLeave')}</span>
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">{onLeaveStaff}</p>
          <p className="text-xs text-slate-600 mt-1">{t('onLeave')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">{t('departments')}</span>
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-violet-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">{departmentCount}</p>
          <p className="text-xs text-slate-600 mt-1">{t('activeDepartments')}</p>
        </motion.div>
      </div>

      {/* Search and Filter */}
      <div className='flex items-center justify-between'>
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder={t('searchByNameIdRole')}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="w-48">
            <Briefcase className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {departments.map(dept => (
              <SelectItem key={dept} value={dept}>
                {dept === 'all' ? t('allDepartments') : dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatus')}</SelectItem>
            <SelectItem value="Active">{t('active')}</SelectItem>
            <SelectItem value="Inactive">{t('inactive')}</SelectItem>
            <SelectItem value="On Leave">{t('onLeave')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Dialog open={showAddDialog} onOpenChange={(open: boolean) => { if (open) { setNewStaff(prev => ({ ...prev, employee_id: generateNextEmployeeId() })); } setShowAddDialog(open); setErrors({}); }}>
        <DialogTrigger asChild>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all">
            <UserPlus className="w-4 h-4 mr-2" />
            {t('add')} {t('staff')}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('add')} {t('staff')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee_id">Employee ID *</Label>
              <Input
                id="employee_id"
                value={newStaff.employee_id}
                readOnly
                className="bg-slate-100 cursor-not-allowed"
                placeholder="Auto-generated"
              />
              <p className="text-xs text-slate-500">Auto-generated</p>
              <FieldError message={errors.employee_id} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={newStaff.name}
                onChange={(e) => { setNewStaff({ ...newStaff, name: e.target.value }); setErrors(prev => ({ ...prev, name: '' })); }}
                placeholder="Enter full name"
              />
              <FieldError message={errors.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={newStaff.role}
                onValueChange={(value) => { setNewStaff({ ...newStaff, role: value }); setErrors(prev => ({ ...prev, role: '' })); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.role} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Select
                value={newStaff.department}
                onValueChange={(value) => { setNewStaff({ ...newStaff, department: value }); setErrors(prev => ({ ...prev, department: '' })); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.filter((dept) => dept !== 'all').map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.department} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={newStaff.phone}
                onChange={(e) => { setNewStaff({ ...newStaff, phone: e.target.value }); setErrors(prev => ({ ...prev, phone: '' })); }}
                placeholder="10-digit phone"
              />
              <FieldError message={errors.phone} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newStaff.email}
                onChange={(e) => { setNewStaff({ ...newStaff, email: e.target.value }); setErrors(prev => ({ ...prev, email: '' })); }}
                placeholder="name@company.com"
              />
              <FieldError message={errors.email} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="join_date">Join Date *</Label>
              <Input
                id="join_date"
                type="date"
                value={newStaff.join_date}
                onChange={(e) => { setNewStaff({ ...newStaff, join_date: e.target.value }); setErrors(prev => ({ ...prev, join_date: '' })); }}
              />
              <FieldError message={errors.join_date} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={newStaff.status}
                onValueChange={(value) => { setNewStaff({ ...newStaff, status: value }); setErrors(prev => ({ ...prev, status: '' })); }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="On Leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
              <FieldError message={errors.status} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift">Shift *</Label>
              <Select
                value={newStaff.shift}
                onValueChange={(value) => { setNewStaff({ ...newStaff, shift: value }); setErrors(prev => ({ ...prev, shift: '' })); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  {shiftOptions.map((shift) => (
                    <SelectItem key={shift} value={shift}>
                      {shift}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.shift} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={newStaff.location}
                onChange={(e) => { setNewStaff({ ...newStaff, location: e.target.value }); setErrors(prev => ({ ...prev, location: '' })); }}
                placeholder="Factory 1"
              />
              <FieldError message={errors.location} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {t('cancel')}
            </Button>
            <Button className="bg-blue-600" onClick={handleCreateStaff}>
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">{t('employee')}</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">{t('department')}</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">{t('contact')}</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">{t('location')}</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">{t('status')}</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStaff.map((staff, index) => (
                <motion.tr
                  key={staff.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white font-semibold shadow-sm">
                        {(staff.name || 'NA').split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm text-slate-900 font-semibold">{staff.name}</p>
                        <p className="text-xs text-slate-600">{staff.employee_id || staff.id} • {staff.role || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <Badge variant="outline" className="font-medium">
                      {staff.department}
                    </Badge>
                  </td>
                  <td className="py-4 px-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{staff.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{staff.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{staff.location || '-'}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <Badge className={getStatusColor(staff.status)}>
                      {staff.status}
                    </Badge>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleOpenView(staff)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleOpenEdit(staff)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleOpenDelete(staff)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Staff */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Staff Details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Employee ID</p>
              <p className="text-slate-900 font-medium">{selectedStaff?.employee_id || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500">Name</p>
              <p className="text-slate-900 font-medium">{selectedStaff?.name || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500">Role</p>
              <p className="text-slate-900 font-medium">{selectedStaff?.role || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500">Department</p>
              <p className="text-slate-900 font-medium">{selectedStaff?.department || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500">Phone</p>
              <p className="text-slate-900 font-medium">{selectedStaff?.phone || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500">Email</p>
              <p className="text-slate-900 font-medium">{selectedStaff?.email || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500">Join Date</p>
              <p className="text-slate-900 font-medium">{selectedStaff?.join_date || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500">Status</p>
              <p className="text-slate-900 font-medium">{selectedStaff?.status || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500">Shift</p>
              <p className="text-slate-900 font-medium">{selectedStaff?.shift || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500">Location</p>
              <p className="text-slate-900 font-medium">{selectedStaff?.location || '-'}</p>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Staff */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Staff</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_employee_id">Employee ID *</Label>
              <Input
                id="edit_employee_id"
                value={editStaff.employee_id}
                readOnly
                className="bg-slate-100 cursor-not-allowed"
              />
              <p className="text-xs text-slate-500">Cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_name">Full Name *</Label>
              <Input
                id="edit_name"
                value={editStaff.name}
                onChange={(e) => { setEditStaff({ ...editStaff, name: e.target.value }); setEditErrors(prev => ({ ...prev, name: '' })); }}
              />
              <FieldError message={editErrors.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_role">Role *</Label>
              <Select
                value={editStaff.role}
                onValueChange={(value) => { setEditStaff({ ...editStaff, role: value }); setEditErrors(prev => ({ ...prev, role: '' })); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={editErrors.role} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_department">Department *</Label>
              <Select
                value={editStaff.department}
                onValueChange={(value) => { setEditStaff({ ...editStaff, department: value }); setEditErrors(prev => ({ ...prev, department: '' })); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.filter((dept) => dept !== 'all').map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={editErrors.department} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_phone">Phone *</Label>
              <Input
                id="edit_phone"
                value={editStaff.phone}
                onChange={(e) => { setEditStaff({ ...editStaff, phone: e.target.value }); setEditErrors(prev => ({ ...prev, phone: '' })); }}
              />
              <FieldError message={editErrors.phone} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_email">Email *</Label>
              <Input
                id="edit_email"
                type="email"
                value={editStaff.email}
                onChange={(e) => { setEditStaff({ ...editStaff, email: e.target.value }); setEditErrors(prev => ({ ...prev, email: '' })); }}
              />
              <FieldError message={editErrors.email} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_join_date">Join Date *</Label>
              <Input
                id="edit_join_date"
                type="date"
                value={editStaff.join_date}
                onChange={(e) => { setEditStaff({ ...editStaff, join_date: e.target.value }); setEditErrors(prev => ({ ...prev, join_date: '' })); }}
              />
              <FieldError message={editErrors.join_date} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_status">Status *</Label>
              <Select
                value={editStaff.status}
                onValueChange={(value) => { setEditStaff({ ...editStaff, status: value }); setEditErrors(prev => ({ ...prev, status: '' })); }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="On Leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
              <FieldError message={editErrors.status} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_shift">Shift *</Label>
              <Select
                value={editStaff.shift}
                onValueChange={(value) => { setEditStaff({ ...editStaff, shift: value }); setEditErrors(prev => ({ ...prev, shift: '' })); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  {shiftOptions.map((shift) => (
                    <SelectItem key={shift} value={shift}>
                      {shift}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={editErrors.shift} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_location">Location *</Label>
              <Input
                id="edit_location"
                value={editStaff.location}
                onChange={(e) => { setEditStaff({ ...editStaff, location: e.target.value }); setEditErrors(prev => ({ ...prev, location: '' })); }}
              />
              <FieldError message={editErrors.location} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {t('cancel')}
            </Button>
            <Button className="bg-blue-600" onClick={handleUpdateStaff}>
              {t('update')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Staff</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Are you sure you want to delete {selectedStaff?.name || 'this staff member'}?
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t('cancel')}
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleDeleteStaff}>
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {t('showingOf')} <span className="font-medium">{filteredStaff.length ? startIndex + 1 : 0}-{endIndex}</span> {t('of')} <span className="font-medium">{filteredStaff.length}</span> {t('employees')}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          >
            {t('previous')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
          >
            {t('next')}
          </Button>
        </div>
      </div>
    </div>
  );
}
