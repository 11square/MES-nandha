import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Building2,
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Upload,
  X,
  Check,
  Eye,
  EyeOff,
  Image,
  ArrowLeft,
  Settings2,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import superAdminService, {
  type Business,
  type FeatureSettingData,
  type FeatureSettingValueData,
  type BusinessUserData,
  type RolePermissions,
} from '../services/superadmin.service';

/* ───────────────────────────────────────────────────────────────────── */
/*  Types                                                               */
/* ───────────────────────────────────────────────────────────────────── */

interface BusinessForm {
  name: string;
  status: string;
  logoFile: File | null;
  logoPreview: string | null;
}

interface BusinessUserForm {
  business_id: number | '';
  name: string;
  email: string;
  phone: string;
  password: string;
}

const emptyBusinessForm: BusinessForm = { name: '', status: 'Active', logoFile: null, logoPreview: null };
const emptyUserForm: BusinessUserForm = { business_id: '', name: '', email: '', phone: '', password: '' };

/* ───────────────────────────────────────────────────────────────────── */
/*  Component                                                           */
/* ───────────────────────────────────────────────────────────────────── */

interface SuperAdminManagementProps {
  activeTab: 'business' | 'users';
  onTabChange: (tab: 'business' | 'users') => void;
}

export default function SuperAdminManagement({ activeTab, onTabChange }: SuperAdminManagementProps) {
  const { t } = useI18n();

  // Business list state
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [featureSettings, setFeatureSettings] = useState<FeatureSettingData[]>([]);
  const [searchBiz, setSearchBiz] = useState('');
  const [loadingBiz, setLoadingBiz] = useState(false);

  // Business form state (full-page view)
  const [bizFormView, setBizFormView] = useState<'list' | 'form'>('list');
  const [editingBiz, setEditingBiz] = useState<Business | null>(null);
  const [bizForm, setBizForm] = useState<BusinessForm>(emptyBusinessForm);
  const [bizFeatures, setBizFeatures] = useState<Record<number, { enabled: boolean; roles: RolePermissions }>>({});
  const [savingBiz, setSavingBiz] = useState(false);

  // Business Users state
  const [businessUsers, setBusinessUsers] = useState<BusinessUserData[]>([]);
  const [searchUsers, setSearchUsers] = useState('');
  const [filterBizId, setFilterBizId] = useState<number | ''>('');
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<BusinessUserData | null>(null);
  const [userForm, setUserForm] = useState<BusinessUserForm>(emptyUserForm);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* ───── Data loading ───── */

  const loadBusinesses = useCallback(async () => {
    setLoadingBiz(true);
    try {
      const res = await superAdminService.getBusinesses({ search: searchBiz });
      setBusinesses(Array.isArray(res) ? res : (res as any) || []);
    } catch {
      // Silently fail
    } finally {
      setLoadingBiz(false);
    }
  }, [searchBiz]);

  const loadFeatureSettings = useCallback(async () => {
    try {
      const res = await superAdminService.getFeatureSettings();
      setFeatureSettings(Array.isArray(res) ? res : []);
    } catch {
      // Silently fail
    }
  }, []);

  const loadBusinessUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const params: any = { search: searchUsers };
      if (filterBizId) params.business_id = filterBizId;
      const res = await superAdminService.getBusinessUsers(params);
      setBusinessUsers(Array.isArray(res) ? res : (res as any) || []);
    } catch {
      // Silently fail
    } finally {
      setLoadingUsers(false);
    }
  }, [searchUsers, filterBizId]);

  useEffect(() => {
    loadBusinesses();
    loadFeatureSettings();
  }, [loadBusinesses, loadFeatureSettings]);

  useEffect(() => {
    if (activeTab === 'users') loadBusinessUsers();
  }, [activeTab, loadBusinessUsers]);

  /* ───── Business form helpers ───── */

  const defaultRolePerms: RolePermissions = { admin: true, manager: true, staff: true, viewer: true };

  const openCreateBiz = () => {
    setEditingBiz(null);
    setBizForm(emptyBusinessForm);
    const map: Record<number, { enabled: boolean; roles: RolePermissions }> = {};
    featureSettings.forEach((f) => (map[f.id] = { enabled: false, roles: { ...defaultRolePerms } }));
    setBizFeatures(map);
    setBizFormView('form');
  };

  const openEditBiz = async (biz: Business) => {
    setEditingBiz(biz);
    setBizForm({
      name: biz.name,
      status: biz.status,
      logoFile: null,
      logoPreview: biz.logo_url,
    });
    try {
      const vals: FeatureSettingValueData[] = await superAdminService.getBusinessFeatures(biz.id);
      const map: Record<number, { enabled: boolean; roles: RolePermissions }> = {};
      featureSettings.forEach((f) => {
        const match = vals.find((v) => v.feature_setting_id === f.id);
        map[f.id] = {
          enabled: match ? match.is_enabled : false,
          roles: match?.role_permissions || { ...defaultRolePerms },
        };
      });
      setBizFeatures(map);
    } catch {
      const map: Record<number, { enabled: boolean; roles: RolePermissions }> = {};
      featureSettings.forEach((f) => (map[f.id] = { enabled: false, roles: { ...defaultRolePerms } }));
      setBizFeatures(map);
    }
    setBizFormView('form');
  };

  const closeBizForm = () => {
    setBizFormView('list');
    setEditingBiz(null);
    setBizForm(emptyBusinessForm);
    setBizFeatures({});
  };

  const ROLE_KEYS: (keyof RolePermissions)[] = ['admin', 'manager', 'staff', 'viewer'];
  const ROLE_LABELS: Record<keyof RolePermissions, string> = { admin: 'Admin', manager: 'Manager', staff: 'Staff', viewer: 'Viewer' };
  const ROLE_COLORS: Record<keyof RolePermissions, { bg: string; text: string; border: string }> = {
    admin: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    manager: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    staff: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    viewer: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  };

  const handleBizLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBizForm((prev) => ({
      ...prev,
      logoFile: file,
      logoPreview: URL.createObjectURL(file),
    }));
  };

  const handleToggleFeature = (featureId: number) => {
    setBizFeatures((prev) => {
      const cur = prev[featureId] || { enabled: false, roles: { ...defaultRolePerms } };
      return {
        ...prev,
        [featureId]: {
          ...cur,
          enabled: !cur.enabled,
          // When enabling, ensure all roles are true by default
          roles: !cur.enabled ? { ...defaultRolePerms } : cur.roles,
        },
      };
    });
  };

  const handleToggleRole = (featureId: number, role: keyof RolePermissions) => {
    setBizFeatures((prev) => {
      const cur = prev[featureId] || { enabled: true, roles: { ...defaultRolePerms } };
      return {
        ...prev,
        [featureId]: {
          ...cur,
          roles: { ...cur.roles, [role]: !cur.roles[role] },
        },
      };
    });
  };

  const handleSelectAllFeatures = (select: boolean) => {
    const map: Record<number, { enabled: boolean; roles: RolePermissions }> = {};
    featureSettings.forEach((f) => {
      map[f.id] = { enabled: select, roles: { ...defaultRolePerms } };
    });
    setBizFeatures(map);
  };

  const handleSelectAllRoleForAll = (role: keyof RolePermissions, checked: boolean) => {
    setBizFeatures((prev) => {
      const next = { ...prev };
      featureSettings.forEach((f) => {
        if (next[f.id]?.enabled) {
          next[f.id] = { ...next[f.id], roles: { ...next[f.id].roles, [role]: checked } };
        }
      });
      return next;
    });
  };

  const handleSaveBiz = async () => {
    if (!bizForm.name.trim()) {
      toast.error('Business name is required');
      return;
    }
    setSavingBiz(true);
    try {
      const fd = new FormData();
      fd.append('name', bizForm.name.trim());
      fd.append('status', bizForm.status);
      if (bizForm.logoFile) fd.append('logo', bizForm.logoFile);

      let savedBizId: number;

      if (editingBiz) {
        await superAdminService.updateBusiness(editingBiz.id, fd);
        savedBizId = editingBiz.id;
        toast.success('Business updated');
      } else {
        const created = await superAdminService.createBusiness(fd);
        savedBizId = (created as any)?.id || (created as any)?.data?.id;
        toast.success('Business created');
      }

      // Save feature settings with role permissions
      if (savedBizId) {
        const features = Object.entries(bizFeatures).map(([fid, val]) => ({
          feature_setting_id: Number(fid),
          is_enabled: val.enabled,
          role_permissions: val.enabled ? val.roles : null,
        }));
        await superAdminService.saveBusinessFeatures(savedBizId, features);
      }

      closeBizForm();
      loadBusinesses();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save business');
    } finally {
      setSavingBiz(false);
    }
  };

  const handleDeleteBiz = async (biz: Business) => {
    if (!confirm(`Delete business "${biz.name}"? This will also delete all associated users and feature settings.`)) return;
    try {
      await superAdminService.deleteBusiness(biz.id);
      toast.success('Business deleted');
      loadBusinesses();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete');
    }
  };

  /* ───── Business Users CRUD ───── */

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm(emptyUserForm);
    setShowPassword(false);
    setShowUserDialog(true);
  };

  const openEditUser = (user: BusinessUserData) => {
    setEditingUser(user);
    setUserForm({
      business_id: user.business_id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      password: '',
    });
    setShowPassword(false);
    setShowUserDialog(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.business_id || !userForm.name.trim() || !userForm.email.trim()) {
      toast.error('Business, name and email are required');
      return;
    }
    if (!editingUser && !userForm.password) {
      toast.error('Password is required for new users');
      return;
    }
    setSubmitting(true);
    try {
      if (editingUser) {
        const data: any = {
          name: userForm.name.trim(),
          email: userForm.email.trim(),
          phone: userForm.phone.trim() || null,
          business_id: userForm.business_id,
        };
        if (userForm.password) data.password = userForm.password;
        await superAdminService.updateBusinessUser(editingUser.id, data);
        toast.success('User updated');
      } else {
        await superAdminService.createBusinessUser({
          business_id: Number(userForm.business_id),
          name: userForm.name.trim(),
          email: userForm.email.trim(),
          phone: userForm.phone.trim() || undefined,
          password: userForm.password,
        });
        toast.success('User created');
      }
      setShowUserDialog(false);
      loadBusinessUsers();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: BusinessUserData) => {
    if (!confirm(`Delete user "${user.name}" (${user.email})?`)) return;
    try {
      await superAdminService.deleteBusinessUser(user.id);
      toast.success('User deleted');
      loadBusinessUsers();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete');
    }
  };

  /* ───── Grouped features by category ───── */

  const groupedFeatures = featureSettings.reduce<Record<string, FeatureSettingData[]>>((acc, f) => {
    const cat = f.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    core: 'Core',
    sales: 'Sales & CRM',
    operations: 'Operations',
    finance: 'Finance',
    hr: 'Human Resources',
    general: 'General',
  };

  const enabledCount = Object.values(bizFeatures).filter((v) => v.enabled).length;

  /* ───────────────────────────────────────────────────────────────── */
  /*  RENDER                                                          */
  /* ───────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {/* ═══════════ BUSINESS LIST ═══════════ */}
        {activeTab === 'business' && bizFormView === 'list' && (
          <motion.div
            key="business-list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Actions bar */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={searchBiz}
                  onChange={(e) => setSearchBiz(e.target.value)}
                  placeholder="Search businesses..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none transition-all"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => loadBusinesses()}
                  className="p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-500 ${loadingBiz ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={openCreateBiz}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Business
                </button>
              </div>
            </div>

            {/* Business Cards */}
            {loadingBiz ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-3 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
              </div>
            ) : businesses.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No businesses yet. Click &quot;Add Business&quot; to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {businesses.map((biz) => (
                  <div key={biz.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-4 p-4">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200">
                        {biz.logo_url ? (
                          <img src={biz.logo_url} alt={biz.name} className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 truncate">{biz.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              biz.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                            }`}
                          >
                            {biz.status}
                          </span>
                          {biz.businessUsers && (
                            <span className="text-xs text-gray-400">
                              {biz.businessUsers.length} user{biz.businessUsers.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditBiz(biz)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 text-gray-500 transition-all"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteBiz(biz)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ═══════════ BUSINESS FORM (full page) ═══════════ */}
        {activeTab === 'business' && bizFormView === 'form' && (
          <motion.div
            key="business-form"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Back + Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={closeBizForm}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  {editingBiz ? 'Edit Business' : 'Add New Business'}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {editingBiz ? `Editing "${editingBiz.name}"` : 'Configure business details and enabled modules'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* ── Left column: Business details ── */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-500" />
                    Business Details
                  </h3>

                  {/* Logo upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                        {bizForm.logoPreview ? (
                          <img src={bizForm.logoPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Image className="w-8 h-8 text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1">
                        <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors text-sm text-gray-600">
                          <Upload className="w-4 h-4" />
                          Choose Image
                          <input type="file" accept="image/*" onChange={handleBizLogoChange} className="hidden" />
                        </label>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                      </div>
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name *</label>
                    <input
                      value={bizForm.name}
                      onChange={(e) => setBizForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Enter business name"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none transition-all"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                    <select
                      value={bizForm.status}
                      onChange={(e) => setBizForm((p) => ({ ...p, status: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-indigo-400 outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Save / Cancel buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={closeBizForm}
                    className="flex-1 px-4 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveBiz}
                    disabled={savingBiz}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm font-medium shadow-sm"
                  >
                    {savingBiz ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {editingBiz ? 'Update Business' : 'Create Business'}
                  </button>
                </div>
              </div>

              {/* ── Right column: Feature settings with role permissions ── */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-indigo-500" />
                      Module Permissions
                      <span className="ml-2 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium normal-case">
                        {enabledCount} / {featureSettings.length}
                      </span>
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSelectAllFeatures(true)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Enable All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => handleSelectAllFeatures(false)}
                        className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                      >
                        Disable All
                      </button>
                    </div>
                  </div>

                  {/* Role legend */}
                  <div className="flex items-center gap-3 flex-wrap pb-2 border-b border-gray-100">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500 font-medium">Role Access:</span>
                    {ROLE_KEYS.map((role) => (
                      <span
                        key={role}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[role].bg} ${ROLE_COLORS[role].text}`}
                      >
                        {ROLE_LABELS[role]}
                      </span>
                    ))}
                  </div>

                  {featureSettings.length === 0 ? (
                    <div className="text-center py-10">
                      <Settings2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No feature settings found. Please check the backend seed data.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(groupedFeatures).map(([cat, features]) => (
                        <div key={cat}>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                            {categoryLabels[cat] || cat}
                          </p>
                          <div className="space-y-2">
                            {features.map((f) => {
                              const feat = bizFeatures[f.id] || { enabled: false, roles: { ...defaultRolePerms } };
                              return (
                                <div
                                  key={f.id}
                                  className={`rounded-lg border transition-all ${
                                    feat.enabled
                                      ? 'border-indigo-200 bg-indigo-50/30'
                                      : 'border-gray-200 bg-white'
                                  }`}
                                >
                                  {/* Module header row */}
                                  <div className="flex items-center gap-3 px-4 py-3">
                                    <label className="flex items-center gap-3 flex-1 cursor-pointer min-w-0">
                                      <input
                                        type="checkbox"
                                        checked={feat.enabled}
                                        onChange={() => handleToggleFeature(f.id)}
                                        className="rounded text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 w-4 h-4"
                                      />
                                      <div className="min-w-0">
                                        <span className={`font-medium text-sm truncate block ${feat.enabled ? 'text-indigo-700' : 'text-gray-600'}`}>
                                          {f.feature_name}
                                        </span>
                                        {f.description && (
                                          <span className="text-xs text-gray-400 truncate block">{f.description}</span>
                                        )}
                                      </div>
                                    </label>

                                    {/* Role chips - only show when module is enabled */}
                                    {feat.enabled && (
                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {ROLE_KEYS.map((role) => (
                                          <button
                                            key={role}
                                            type="button"
                                            onClick={() => handleToggleRole(f.id, role)}
                                            className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-all ${
                                              feat.roles[role]
                                                ? `${ROLE_COLORS[role].bg} ${ROLE_COLORS[role].text} ${ROLE_COLORS[role].border}`
                                                : 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                                            }`}
                                            title={`${feat.roles[role] ? 'Disable' : 'Enable'} ${ROLE_LABELS[role]} access for ${f.feature_name}`}
                                          >
                                            {ROLE_LABELS[role]}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bulk role toggles */}
                  {enabledCount > 0 && (
                    <div className="pt-4 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-2">Quick: Set role for all enabled modules</p>
                      <div className="flex gap-2 flex-wrap">
                        {ROLE_KEYS.map((role) => {
                          const allHaveRole = Object.values(bizFeatures).filter((v) => v.enabled).every((v) => v.roles[role]);
                          return (
                            <button
                              key={role}
                              type="button"
                              onClick={() => handleSelectAllRoleForAll(role, !allHaveRole)}
                              className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-all ${
                                allHaveRole
                                  ? `${ROLE_COLORS[role].bg} ${ROLE_COLORS[role].text} ${ROLE_COLORS[role].border}`
                                  : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              {allHaveRole ? '✓' : '○'} All {ROLE_LABELS[role]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════ BUSINESS USERS TAB ═══════════ */}
        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Actions bar */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex gap-3 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={searchUsers}
                    onChange={(e) => setSearchUsers(e.target.value)}
                    placeholder="Search users..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>
                <select
                  value={filterBizId}
                  onChange={(e) => setFilterBizId(e.target.value ? Number(e.target.value) : '')}
                  className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-indigo-400 outline-none"
                >
                  <option value="">All Businesses</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => loadBusinessUsers()}
                  className="p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-500 ${loadingUsers ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={openCreateUser}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add User
                </button>
              </div>
            </div>

            {/* Users table */}
            {loadingUsers ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-3 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
              </div>
            ) : businessUsers.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No business users yet. Click &quot;Add User&quot; to create one.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Name</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Email</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Phone</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Business</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                        <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {businessUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
                                {user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <span className="text-sm font-medium text-gray-800">{user.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{user.phone || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">{user.business?.name || `#${user.business_id}`}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                user.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                              }`}
                            >
                              {user.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditUser(user)}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4 text-gray-500" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────── BUSINESS USER DIALOG ─────── */}
      <AnimatePresence>
        {showUserDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowUserDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800">
                  {editingUser ? 'Edit Business User' : 'Add Business User'}
                </h3>
                <button
                  onClick={() => setShowUserDialog(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Business *</label>
                  <select
                    value={userForm.business_id}
                    onChange={(e) =>
                      setUserForm((p) => ({ ...p, business_id: e.target.value ? Number(e.target.value) : '' }))
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-indigo-400 outline-none"
                  >
                    <option value="">Select business</option>
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
                  <input
                    value={userForm.name}
                    onChange={(e) => setUserForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Full name"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="user@company.com"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                  <input
                    value={userForm.phone}
                    onChange={(e) => setUserForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="Phone number"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Password {editingUser ? '(leave blank to keep)' : '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={userForm.password}
                      onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder={editingUser ? '••••••••' : 'Set password'}
                      className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-lg text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={() => setShowUserDialog(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUser}
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
