import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { validateFields, FieldError, blockInvalidNumberKeys, type ValidationErrors } from '../lib/validation';
import { ConfirmDialog } from './ui/confirm-dialog';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Trash2, Plus, Building2, Mail, Phone, MapPin, Package, IndianRupee, Search, Eye, Edit, LayoutGrid, List } from 'lucide-react';
import { translations, Language } from '../translations';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

import { vendorsService } from '../services/vendors.service';
interface VendorManagementProps {
  language?: Language;
}

interface Vendor {
  id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  gst_number?: string;
  total_purchases: number;
  total_amount: number;
  outstanding_amount: number;
  last_purchase_date: string;
  status: 'Active' | 'Inactive';
}

const VendorManagement: React.FC<VendorManagementProps> = ({ language = 'en' }) => {
  const t = (key: keyof typeof translations.en) => translations[language][key] || translations.en[key];
  const navigate = useNavigate();
  
  // Vendor data from API
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    if (typeof window === 'undefined') return 'grid';
    return (localStorage.getItem('vendors:viewMode') as 'grid' | 'table') || 'grid';
  });
  useEffect(() => {
    try { localStorage.setItem('vendors:viewMode', viewMode); } catch { /* ignore */ }
  }, [viewMode]);

  const refreshVendors = useCallback(async () => {
    try {
      const data = await vendorsService.getVendors();
      setVendors(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { refreshVendors(); }, [refreshVendors]);
  
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});
  const [gstError, setGstError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{open: boolean, id: string}>({open: false, id: ''});

  // GST validation: 2 digits + 5 uppercase + 4 digits + 1 uppercase + 1 alphanumeric + Z + 1 alphanumeric
  const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/;
  const validateGst = (value: string) => {
    if (!value) return '';
    if (value.length !== 15) return language === 'en' ? 'GST Number must be 15 characters' : 'GST எண் 15 எழுத்துகள் இருக்க வேண்டும்';
    if (!GST_REGEX.test(value)) return language === 'en' ? 'Invalid GST format (e.g. 07AABCU9603R1Z5)' : 'தவறான GST வடிவம் (எ.கா. 07AABCU9603R1Z5)';
    return '';
  };

  // Vendor form state
  const [vendorForm, setVendorForm] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    phone_2: '',
    address: '',
    category: '',
    gst_number: '',
    opening_balance: '',
    status: 'Active' as 'Active' | 'Inactive',
  });

  // Vendor handlers
  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateFields(vendorForm, {
      name: { required: true, min: 2, max: 100, label: 'Vendor Name' },
      contact_person: { required: true, min: 2, label: 'Contact Person' },
      email: { email: true },
      phone: { required: true, phone: true },
      category: { required: true, label: 'Category' },
      gst_number: { label: 'GST Number' },
      address: { required: true, label: 'Address' },
    });
    // Additional GST format check (only if value provided)
    const gstErr = vendorForm.gst_number ? validateGst(vendorForm.gst_number) : '';
    if (gstErr) errors.gst_number = gstErr;
    setGstError(gstErr);
    setFormErrors(errors);
    if (Object.keys(errors).length) return;
    try {
      const payload = { ...vendorForm, opening_balance: parseFloat(vendorForm.opening_balance) || 0 };
      if (editingVendor) {
        await vendorsService.updateVendor(editingVendor.id, payload);
        toast.success('Vendor updated successfully');
      } else {
        await vendorsService.createVendor(payload);
        toast.success('Vendor created successfully');
      }
      await refreshVendors();
      resetVendorForm();
      setIsVendorDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save vendor');
    }
  };

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setVendorForm({
      name: vendor.name,
      contact_person: vendor.contact_person,
      email: vendor.email,
      phone: vendor.phone,
      phone_2: vendor.phone_2 || '',
      address: vendor.address,
      category: vendor.category,
      gst_number: vendor.gst_number || '',
      opening_balance: vendor.opening_balance || '',
      status: vendor.status,
    });
    setIsVendorDialogOpen(true);
  };

  const handleDeleteVendor = (id: string) => {
    setDeleteConfirm({ open: true, id });
  };

  const confirmDeleteVendor = async () => {
    const id = deleteConfirm.id;
    setDeleteConfirm({ open: false, id: '' });
    try {
      await vendorsService.deleteVendor(id);
      toast.success('Vendor deleted successfully');
      await refreshVendors();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete vendor');
    }
  };

  const resetVendorForm = () => {
    setVendorForm({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      phone_2: '',
      address: '',
      category: '',
      gst_number: '',
      opening_balance: '',
      status: 'Active',
    });
    setEditingVendor(null);
    setFormErrors({});
  };

  const formatCurrency = (amount: number) => {
    return `₹${(amount ?? 0).toLocaleString('en-IN')}`;
  };

  const getStatusColor = (status: string) => {
    return status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600';
  };

  const filteredVendors = vendors.filter(v => {
    const q = searchQuery.toLowerCase();
    return !q || v.name.toLowerCase().includes(q) || v.contact_person.toLowerCase().includes(q) || v.email.toLowerCase().includes(q) || v.phone.includes(q) || v.category.toLowerCase().includes(q);
  });

  return (
    <div className="px-6 pt-2 pb-4 flex flex-col gap-3 overflow-hidden" style={{ height: 'calc(100dvh - 72px)' }}>
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold leading-tight">{t('vendorManagement')}</h1>
          <p className="text-muted-foreground text-sm">{t('manageYourVendorsAndSuppliers')}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-shrink-0">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-600 font-medium">{t('totalVendors') || 'Total Vendors'}</span>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><Building2 className="w-4 h-4 text-blue-600" /></div>
          </div>
          <p className="text-2xl text-slate-900 font-bold">{vendors.length}</p>
          <p className="text-xs text-emerald-600">{vendors.filter(v => v.status === 'Active').length} {t('active')}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-600 font-medium">{t('totalPurchases')}</span>
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center"><IndianRupee className="w-4 h-4 text-emerald-600" /></div>
          </div>
          <p className="text-2xl text-slate-900 font-bold">{formatCurrency(vendors.reduce((s, v) => s + (Number(v.total_amount) || 0), 0))}</p>
          <p className="text-xs text-emerald-600">{vendors.reduce((s, v) => s + (Number(v.total_purchases) || 0), 0)} orders</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-600 font-medium">{t('outstanding')}</span>
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center"><IndianRupee className="w-4 h-4 text-red-600" /></div>
          </div>
          <p className="text-2xl text-red-600 font-bold">{formatCurrency(vendors.reduce((s, v) => s + (Number(v.outstanding_amount) || 0), 0))}</p>
          <p className="text-xs text-red-500">{vendors.filter(v => Number(v.outstanding_amount) > 0).length} vendors</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-600 font-medium">{t('category') || 'Categories'}</span>
            <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center"><Package className="w-4 h-4 text-violet-600" /></div>
          </div>
          <p className="text-2xl text-slate-900 font-bold">{new Set(vendors.map(v => v.category).filter(Boolean)).size}</p>
          <p className="text-xs text-slate-500">vendor categories</p>
        </motion.div>
      </div>

      {/* Search + View Toggle + Add Vendor */}
      <div className="flex items-center gap-4 justify-between flex-shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder={t('searchVendors') || 'Search vendors...'}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-md border border-slate-200 bg-white p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${viewMode === 'table' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
              aria-label="Table view"
              aria-pressed={viewMode === 'table'}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
          <Dialog open={isVendorDialogOpen} onOpenChange={(open: boolean) => {
                  setIsVendorDialogOpen(open);
                  if (!open) resetVendorForm();
                }}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all">
                      <Plus className="mr-2 h-4 w-4" />
                      {t('addVendor')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingVendor ? (t('editVendor')) : (t('addNewVendor'))}</DialogTitle>
                      <DialogDescription>
                        {t('enterVendorDetails')}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleVendorSubmit} noValidate>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="vendor-name">{t('vendorName')} *</Label>
                            <Input
                              id="vendor-name"
                              value={vendorForm.name}
                              onChange={(e) => { setVendorForm({ ...vendorForm, name: e.target.value }); setFormErrors(prev => ({ ...prev, name: '' })); }}
                              placeholder={t('vendorName')}
                            />
                            <FieldError message={formErrors.name} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="vendor-contact">{t('contactPerson')} *</Label>
                            <Input
                              id="vendor-contact"
                              value={vendorForm.contact_person}
                              onChange={(e) => { setVendorForm({ ...vendorForm, contact_person: e.target.value }); setFormErrors(prev => ({ ...prev, contact_person: '' })); }}
                              placeholder={t('contactPerson')}
                            />
                            <FieldError message={formErrors.contact_person} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="vendor-email">{t('email')}</Label>
                            <Input
                              id="vendor-email"
                              type="email"
                              value={vendorForm.email}
                              onChange={(e) => { setVendorForm({ ...vendorForm, email: e.target.value }); setFormErrors(prev => ({ ...prev, email: '' })); }}
                              placeholder={t('email')}
                            />
                            <FieldError message={formErrors.email} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="vendor-phone">{t('phone')} *</Label>
                            <Input
                              id="vendor-phone"
                              value={vendorForm.phone}
                              onChange={(e) => { setVendorForm({ ...vendorForm, phone: e.target.value }); setFormErrors(prev => ({ ...prev, phone: '' })); }}
                              placeholder={t('phone')}
                            />
                            <FieldError message={formErrors.phone} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="vendor-phone2">{t('phone')} 2</Label>
                            <Input
                              id="vendor-phone2"
                              value={vendorForm.phone_2}
                              onChange={(e) => setVendorForm({ ...vendorForm, phone_2: e.target.value })}
                              placeholder="Additional phone number"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="vendor-category">{t('category')} *</Label>
                            <Input
                              id="vendor-category"
                              value={vendorForm.category}
                              onChange={(e) => { setVendorForm({ ...vendorForm, category: e.target.value }); setFormErrors(prev => ({ ...prev, category: '' })); }}
                              placeholder={t('egRawMaterialsEquipmentServices')}
                            />
                            <FieldError message={formErrors.category} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="vendor-gst">{t('gstNumber')}</Label>
                            <Input
                              id="vendor-gst"
                              value={vendorForm.gst_number}
                              onChange={(e) => {
                                const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
                                setVendorForm({ ...vendorForm, gst_number: val });
                                setFormErrors(prev => ({ ...prev, gst_number: '' }));
                                if (val.length > 0) {
                                  setGstError(validateGst(val));
                                } else {
                                  setGstError('');
                                }
                              }}
                              placeholder="07AABCU9603R1Z5"
                              maxLength={15}
                              className={gstError ? 'border-red-500' : vendorForm.gst_number.length === 15 && !gstError ? 'border-green-500' : ''}
                            />
                            {gstError && <p className="text-xs text-red-500">{gstError}</p>}
                            {!gstError && vendorForm.gst_number.length === 15 && <p className="text-xs text-green-600">{language === 'en' ? '✓ Valid GST Number' : '✓ சரியான GST எண்'}</p>}
                            <FieldError message={formErrors.gst_number} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vendor-address">{t('address')} *</Label>
                          <Input
                            id="vendor-address"
                            value={vendorForm.address}
                            onChange={(e) => { setVendorForm({ ...vendorForm, address: e.target.value }); setFormErrors(prev => ({ ...prev, address: '' })); }}
                          />
                          <FieldError message={formErrors.address} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vendor-opening-balance">{t('outstanding') || 'Outstanding Balance'}</Label>
                          <Input
                            id="vendor-opening-balance"
                            type="number"
                            min="0"
                            step="0.01"
                            value={vendorForm.opening_balance}
                            onChange={(e) => setVendorForm({ ...vendorForm, opening_balance: e.target.value })}
                            onKeyDown={blockInvalidNumberKeys}
                            placeholder="₹0.00"
                          />
                          <p className="text-xs text-gray-500">{language === 'en' ? 'Pending outstanding balance before using this software' : 'இந்த மென்பொருளைப் பயன்படுத்துவதற்கு முன் நிலுவைத் தொகை'}</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vendor-status">{t('status')}</Label>
                          <Select value={vendorForm.status} onValueChange={(value: 'Active' | 'Inactive') => setVendorForm({ ...vendorForm, status: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Active">{t('active')}</SelectItem>
                              <SelectItem value="Inactive">{t('inactive')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => {
                          setIsVendorDialogOpen(false);
                          resetVendorForm();
                        }}>
                          {t('cancel')}
                        </Button>
                        <Button type="submit">
                          {editingVendor ? (t('update')) : (t('add'))}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
        </div>
      </div>

      {/* Vendor Cards Grid */}
      {viewMode === 'grid' && (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 flex-1 min-h-0 overflow-auto pr-1 auto-rows-max">
        {filteredVendors.map((vendor, index) => (
          <motion.div
            key={vendor.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            whileHover={{ y: -1 }}
            className="bg-white rounded-md border border-slate-200 p-3 shadow-sm hover:shadow transition-all cursor-pointer"
            onClick={() => navigate(`/vendors/${vendor.id}`)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded flex items-center justify-center text-white text-xs font-semibold">
                  {vendor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-sm text-slate-900 font-semibold leading-tight">{vendor.name}</h3>
                  <p className="text-[10px] text-slate-400">{vendor.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge className={`text-[10px] px-1.5 py-0 h-5 ${getStatusColor(vendor.status)}`}>
                  {vendor.status}
                </Badge>
                <Badge className="text-[10px] px-1.5 py-0 h-5 bg-violet-100 text-violet-700">
                  {vendor.category}
                </Badge>
              </div>
            </div>

            <div className="space-y-0.5 mb-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <Phone className="w-3 h-3" />
                <span className="truncate">{vendor.contact_person} • {vendor.phone}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="w-3 h-3" />
                <span className="truncate">{vendor.email}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{vendor.address}</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-slate-100 text-[11px]">
              <div>
                <span className="text-slate-400">Purchases: </span>
                <span className="font-semibold text-slate-700">{vendor.total_purchases}</span>
              </div>
              <div>
                <span className="text-slate-400">Amount: </span>
                <span className="font-semibold text-slate-700">{formatCurrency(Number(vendor.total_amount) || 0)}</span>
              </div>
              <div>
                <span className="text-slate-400">Outstanding: </span>
                <span className={`font-semibold ${Number(vendor.outstanding_amount) > 0 ? 'text-red-600' : 'text-slate-600'}`}>{formatCurrency(Number(vendor.outstanding_amount) || 0)}</span>
              </div>
            </div>

            <div className="flex gap-1.5 mt-1.5">
              <Button variant="outline" size="sm" className="flex-1 h-7 text-[11px] px-2" onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate(`/vendors/${vendor.id}`); }}>
                <Eye className="w-3 h-3 mr-1" />
                {t('view')}
              </Button>
              <Button variant="outline" size="sm" className="flex-1 h-7 text-[11px] px-2" onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleEditVendor(vendor); }}>
                <Edit className="w-3 h-3 mr-1" />
                {t('edit')}
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-[11px] px-2 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200" onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDeleteVendor(vendor.id); }}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
      )}

      {/* Vendor Table View */}
      {viewMode === 'table' && filteredVendors.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="overflow-auto flex-1 min-h-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Purchases</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.map((vendor, index) => (
                  <TableRow
                    key={vendor.id}
                    className="cursor-pointer hover:bg-slate-50/70"
                    onClick={() => navigate(`/vendors/${vendor.id}`)}
                  >
                    <TableCell className="text-xs text-slate-500">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {vendor.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">{vendor.name}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{vendor.address || '—'}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-slate-700">{vendor.contact_person || '—'}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {vendor.phone || '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="text-[10px] px-1.5 py-0 h-5 bg-violet-100 text-violet-700">
                        {vendor.category || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-slate-700">{vendor.total_purchases || 0}</TableCell>
                    <TableCell className="text-right text-sm font-medium text-slate-700">{formatCurrency(Number(vendor.total_amount) || 0)}</TableCell>
                    <TableCell className={`text-right text-sm font-semibold ${Number(vendor.outstanding_amount) > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                      {formatCurrency(Number(vendor.outstanding_amount) || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] px-1.5 py-0 h-5 ${getStatusColor(vendor.status)}`}>
                        {vendor.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigate(`/vendors/${vendor.id}`)} title={t('view')}>
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditVendor(vendor)} title={t('edit')}>
                          <Edit className="w-3.5 h-3.5 text-slate-600" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-red-50" onClick={() => handleDeleteVendor(vendor.id)} title="Delete">
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {filteredVendors.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          {searchQuery ? <p>No vendors match your search.</p> : <p>{t('noVendorsFound')}. {t('addYourFirstVendor')}.</p>}
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Vendor"
        description="Are you sure you want to delete this vendor? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeleteVendor}
        onCancel={() => setDeleteConfirm({ open: false, id: '' })}
      />
    </div>
  );
};

export default VendorManagement;
