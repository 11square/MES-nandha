import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useI18n } from '../contexts/I18nContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Label } from './ui/label';
import { validateFields, FieldError, blockInvalidNumberKeys, type ValidationErrors } from '../lib/validation';

interface UserManagementProps {}

import { 
  UserPlus, 
  Search, 
  Shield, 
  Edit, 
  Trash2, 
  Lock,
  Unlock,
  Key,
  Eye,
  ShieldCheck,
  ShieldAlert,
  Filter
} from 'lucide-react';
import { Badge } from './ui/badge';

import { usersService } from '../services/users.service';
export default function UserManagement({}: UserManagementProps) {
  const { t } = useI18n();
  const defaultRoles = ['Admin', 'Manager', 'Production', 'Sales'];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    role: '',
    password: '',
  });
  const [viewUser, setViewUser] = useState<any | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<any | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [editUser, setEditUser] = useState({
    id: '',
    name: '',
    username: '',
    email: '',
    phone: '',
    role: '',
    status: 'Active',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Only 4 roles: Admin, Manager, Production, Sales
  const [roles, setRoles] = useState<any[]>([]);

  const [users, setUsers] = useState<any[]>([]);

  const refreshUsers = useCallback(async () => {
    try {
      const data = await usersService.getUsers();
      const items = Array.isArray(data) ? data : (data as any)?.items || [];
      setUsers(items);
      const rolesData = await usersService.getRoles();
      const roleItems = Array.isArray(rolesData) ? rolesData : (rolesData as any)?.items || [];
      if (roleItems.length) setRoles(roleItems);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { refreshUsers(); }, [refreshUsers]);

  const getRoleColor = (role: string) => {
    switch ((role || '').toLowerCase()) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'manager': return 'bg-blue-100 text-blue-700';
      case 'production': return 'bg-emerald-100 text-emerald-700';
      case 'sales': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'Active' 
      ? 'bg-emerald-100 text-emerald-700' 
      : 'bg-slate-100 text-slate-600';
  };

  const getRoleName = (role: any) => role?.name || role?.role || role?.label || role?.title || '';

  const toCapitalizedWords = (value: string) =>
    (value || '')
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

  const formatLastLogin = (user: any) => {
    const rawValue = user?.last_login || user?.lastLogin;
    if (!rawValue) return '—';

    const date = new Date(rawValue);
    if (Number.isNaN(date.getTime())) return '—';

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const roleOptions = (roles || [])
    .map((role) => getRoleName(role))
    .filter((name, index, arr) => name && arr.indexOf(name) === index);

  const effectiveRoleOptions = roleOptions.length ? roleOptions : defaultRoles;

  const handleViewUser = async (user: any) => {
    try {
      const details = await usersService.getUserById(String(user.id));
      setViewUser(details || user);
      setShowViewDialog(true);
    } catch {
      setViewUser(user);
      setShowViewDialog(true);
    }
  };

  const handleEditUserOpen = (user: any) => {
    setEditUser({
      id: String(user.id || ''),
      name: user.name || '',
      username: user.username || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || '',
      status: user.status || 'Active',
    });
    setErrors({});
    setShowEditDialog(true);
  };

  const handleSaveEditedUser = async () => {
    const validationErrors = validateFields(editUser, {
      name: { required: true, min: 2 },
      username: { required: true, min: 3 },
      email: { required: true, email: true },
      phone: { phone: true },
      role: { required: true },
      status: { required: true },
    });

    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    try {
      await usersService.updateUser(editUser.id, {
        name: editUser.name,
        username: editUser.username,
        email: editUser.email,
        phone: editUser.phone,
        role: editUser.role,
        status: editUser.status,
      });
      toast.success('User updated successfully');
      await refreshUsers();
      setShowEditDialog(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update user');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUserForReset?.id) return;

    if (!resetPassword || resetPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      await usersService.updateUser(String(selectedUserForReset.id), { password: resetPassword });
      toast.success('Password reset successfully');
      setShowResetDialog(false);
      setSelectedUserForReset(null);
      setResetPassword('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reset password');
    }
  };

  const handleToggleStatus = async (user: any) => {
    const nextStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await usersService.updateUser(String(user.id), { status: nextStatus });
      toast.success(`User ${nextStatus === 'Active' ? 'activated' : 'deactivated'} successfully`);
      await refreshUsers();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update user status');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role.toLowerCase() === selectedRole.toLowerCase();
    const matchesStatus = selectedStatus === 'all' || user.status.toLowerCase() === selectedStatus.toLowerCase();
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl text-slate-900 font-bold">{t('userManagement')}</h2>
          <p className="text-sm text-slate-600 mt-1">{t('manageSystemUsersRolesAndPermissions')}</p>
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
            <span className="text-sm text-slate-600 font-medium">{t('totalUsers')}</span>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">{users.length}</p>
          <p className="text-xs text-slate-500 mt-1">{t('totalUsers')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">{t('activeUsers')}</span>
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">{users.filter(u => u.status === 'Active').length}</p>
          <p className="text-xs text-slate-600 mt-1">{Math.round((users.filter(u => u.status === 'Active').length / users.length) * 100)}% {t('activeRate')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">{t('admins')}</span>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">{users.filter(u => u.role === 'Admin').length}</p>
          <p className="text-xs text-slate-600 mt-1">{t('fullAccess')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">{t('roles')}</span>
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">4</p>
          <p className="text-xs text-slate-600 mt-1">{t('adminManagerProductionSales')}</p>
        </motion.div>
      </div>

      {/* Search and Filter */}
      <div className='flex items-center justify-between'>
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder={t('searchByNameUsernameEmailOrRole')}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="w-48">
            <Shield className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allRoles')}</SelectItem>
            <SelectItem value="admin">{t('admin')}</SelectItem>
            <SelectItem value="manager">{t('manager')}</SelectItem>
            <SelectItem value="production">{t('production')}</SelectItem>
            <SelectItem value="sales">{t('sales')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatus')}</SelectItem>
            <SelectItem value="active">{t('active')}</SelectItem>
            <SelectItem value="inactive">{t('inactive')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
       <Dialog open={showAddDialog} onOpenChange={(open: boolean) => { setShowAddDialog(open); setErrors({}); }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all">
              <UserPlus className="w-4 h-4 mr-2" />
              {t('addNewUser')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t('addNewUser')}</DialogTitle>
              <DialogDescription>
                {t('createANewUserAccountAndAssignARole')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('fullName')} *</Label>
                  <Input
                    id="name"
                    autoComplete="off"
                    placeholder={t('enterFullName')}
                    value={newUser.name}
                    onChange={(e) => { setNewUser({ ...newUser, name: e.target.value }); setErrors(prev => ({...prev, name: ''})); }}
                  />
                  <FieldError message={errors.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">{t('username')} *</Label>
                  <Input
                    id="username"
                    autoComplete="off"
                    placeholder={t('enterUsername')}
                    value={newUser.username}
                    onChange={(e) => { setNewUser({ ...newUser, username: e.target.value }); setErrors(prev => ({...prev, username: ''})); }}
                  />
                  <FieldError message={errors.username} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('email')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="off"
                    placeholder={t('enterEmail')}
                    value={newUser.email}
                    onChange={(e) => { setNewUser({ ...newUser, email: e.target.value }); setErrors(prev => ({...prev, email: ''})); }}
                  />
                  <FieldError message={errors.email} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('phone')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="off"
                    placeholder={t('enterPhone')}
                    value={newUser.phone}
                    onChange={(e) => { setNewUser({ ...newUser, phone: e.target.value }); setErrors(prev => ({...prev, phone: ''})); }}
                  />
                  <FieldError message={errors.phone} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">{t('role')} *</Label>
                <Select value={newUser.role} onValueChange={(value) => { setNewUser({ ...newUser, role: value }); setErrors(prev => ({...prev, role: ''})); }}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectARole')} />
                  </SelectTrigger>
                  <SelectContent>
                    {effectiveRoleOptions.map((roleName) => (
                      <SelectItem key={roleName} value={roleName}>
                        {toCapitalizedWords(roleName)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.role} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('password')} *</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('enterPassword')}
                  value={newUser.password}
                  onChange={(e) => { setNewUser({ ...newUser, password: e.target.value }); setErrors(prev => ({...prev, password: ''})); }}
                />
                <FieldError message={errors.password} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                {t('cancel')}
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={async () => {
                  const validationErrors = validateFields(newUser, {
                    name: { required: true, min: 2 },
                    username: { required: true, min: 3 },
                    email: { required: true, email: true },
                    phone: { phone: true },
                    role: { required: true },
                    password: { required: true, min: 6 },
                  });
                  if (Object.keys(validationErrors).length) { setErrors(validationErrors); return; }
                  try {
                    await usersService.createUser({
                      name: newUser.name,
                      username: newUser.username,
                      email: newUser.email,
                      phone: newUser.phone,
                      role: newUser.role,
                      password: newUser.password,
                    });
                    toast.success('User added successfully');
                    await refreshUsers();
                    setShowAddDialog(false);
                    setNewUser({ name: '', username: '', email: '', phone: '', role: '', password: '' });
                  } catch (err: any) {
                    toast.error(err?.message || 'Failed to add user');
                  }
                }}
              >
                {t('addUser')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">User</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">Role</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">Last Login</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">Status</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white font-semibold shadow-sm">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm text-slate-900 font-semibold">{user.name}</p>
                        <p className="text-xs text-slate-600">{user.email || '—'}</p>
                        <p className="text-xs text-slate-500">@{user.username || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <Badge className={getRoleColor(user.role)}>
                      {toCapitalizedWords(user.role || '')}
                    </Badge>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm text-slate-700">{formatLastLogin(user)}</p>
                  </td>
                  <td className="py-4 px-6">
                    <Badge className={getStatusColor(user.status)}>
                      {user.status}
                    </Badge>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View Details" onClick={() => handleViewUser(user)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit User" onClick={() => handleEditUserOpen(user)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Reset Password"
                        onClick={() => {
                          setSelectedUserForReset(user);
                          setResetPassword('');
                          setShowResetDialog(true);
                        }}
                      >
                        <Key className="w-4 h-4" />
                      </Button>
                      {user.status === 'Active' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700"
                          title="Deactivate"
                          onClick={() => handleToggleStatus(user)}
                        >
                          <Lock className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700"
                          title="Activate"
                          onClick={() => handleToggleStatus(user)}
                        >
                          <Unlock className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Showing <span className="font-medium">{filteredUsers.length}</span> of <span className="font-medium">{users.length}</span> users
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>View selected user information</DialogDescription>
          </DialogHeader>
          {viewUser && (
            <div className="grid grid-cols-2 gap-4 py-2">
              <div>
                <p className="text-xs text-slate-500">Full Name</p>
                <p className="text-sm font-medium text-slate-900">{viewUser.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Username</p>
                <p className="text-sm font-medium text-slate-900">{viewUser.username || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-sm font-medium text-slate-900">{viewUser.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Phone</p>
                <p className="text-sm font-medium text-slate-900">{viewUser.phone || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Role</p>
                <p className="text-sm font-medium text-slate-900">{toCapitalizedWords(viewUser.role || '') || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <p className="text-sm font-medium text-slate-900">{viewUser.status || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-500">Last Login</p>
                <p className="text-sm font-medium text-slate-900">{formatLastLogin(viewUser)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={(open: boolean) => { setShowEditDialog(open); setErrors({}); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update selected user details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  autoComplete="off"
                  value={editUser.name}
                  onChange={(e) => { setEditUser({ ...editUser, name: e.target.value }); setErrors(prev => ({ ...prev, name: '' })); }}
                />
                <FieldError message={errors.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-username">Username *</Label>
                <Input
                  id="edit-username"
                  autoComplete="off"
                  value={editUser.username}
                  onChange={(e) => { setEditUser({ ...editUser, username: e.target.value }); setErrors(prev => ({ ...prev, username: '' })); }}
                />
                <FieldError message={errors.username} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  autoComplete="off"
                  value={editUser.email}
                  onChange={(e) => { setEditUser({ ...editUser, email: e.target.value }); setErrors(prev => ({ ...prev, email: '' })); }}
                />
                <FieldError message={errors.email} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  autoComplete="off"
                  value={editUser.phone}
                  onChange={(e) => { setEditUser({ ...editUser, phone: e.target.value }); setErrors(prev => ({ ...prev, phone: '' })); }}
                />
                <FieldError message={errors.phone} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role *</Label>
                <Select value={editUser.role} onValueChange={(value) => { setEditUser({ ...editUser, role: value }); setErrors(prev => ({ ...prev, role: '' })); }}>
                  <SelectTrigger id="edit-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {effectiveRoleOptions.map((roleName) => (
                      <SelectItem key={`edit-${roleName}`} value={roleName}>
                        {toCapitalizedWords(roleName)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.role} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status *</Label>
                <Select value={editUser.status} onValueChange={(value) => setEditUser({ ...editUser, status: value })}>
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveEditedUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Set a new password for {selectedUserForReset?.name || 'this user'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reset-password">New Password *</Label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleResetPassword}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
