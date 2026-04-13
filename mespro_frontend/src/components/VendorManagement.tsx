import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { validateFields, FieldError, blockInvalidNumberKeys, type ValidationErrors } from '../lib/validation';
import { ConfirmDialog } from './ui/confirm-dialog';
import { Card, CardContent, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Pencil, Trash2, Plus, Building2, Mail, Phone, MapPin, Package, IndianRupee, ShoppingCart, Calendar, FileText } from 'lucide-react';
import { translations, Language } from '../translations';
import { Badge } from './ui/badge';

import { vendorsService } from '../services/vendors.service';
import { purchaseOrdersService } from '../services/purchaseOrders.service';
import { financeService } from '../services/finance.service';
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
  
  // Vendor data from API
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorPurchaseOrders, setVendorPurchaseOrders] = useState<any[]>([]);
  const [vendorTransactions, setVendorTransactions] = useState<any[]>([]);

  const refreshVendors = useCallback(async () => {
    try {
      const data = await vendorsService.getVendors();
      setVendors(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { refreshVendors(); }, [refreshVendors]);
  
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
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
      if (selectedVendorId === id) {
        setSelectedVendorId('');
      }
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
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const selectedVendor = vendors.find(v => String(v.id) === String(selectedVendorId));

  useEffect(() => {
    const loadVendorHistory = async () => {
      if (!selectedVendor) {
        setVendorPurchaseOrders([]);
        setVendorTransactions([]);
        return;
      }

      try {
        const purchaseData = await purchaseOrdersService.getPurchaseOrders();
        const purchaseItems = Array.isArray(purchaseData) ? purchaseData : (purchaseData as any)?.items || [];
        const filteredPurchaseOrders = purchaseItems.filter((po: any) => {
          const poVendorId = po?.vendor_id != null ? String(po.vendor_id) : '';
          const selectedId = String(selectedVendor.id);
          const poVendorName = String(po?.vendor_name || '').toLowerCase().trim();
          const selectedVendorName = String(selectedVendor.name || '').toLowerCase().trim();

          return poVendorId === selectedId || (!!poVendorName && poVendorName === selectedVendorName);
        });
        setVendorPurchaseOrders(filteredPurchaseOrders);
      } catch {
        setVendorPurchaseOrders([]);
      }

      try {
        const txData = await financeService.getTransactions();
        const txItems = Array.isArray(txData) ? txData : (txData as any)?.items || [];
        const vendorName = String(selectedVendor.name || '').toLowerCase().trim();
        const filteredTransactions = txItems.filter((tx: any) => {
          const description = String(tx?.description || '').toLowerCase();
          const reference = String(tx?.reference || '').toLowerCase();
          return !!vendorName && (description.includes(vendorName) || reference.includes(vendorName));
        });
        setVendorTransactions(filteredTransactions);
      } catch {
        setVendorTransactions([]);
      }
    };

    loadVendorHistory();
  }, [selectedVendor]);

  const vendorOutstandingItems = vendorPurchaseOrders.filter((po: any) => {
    const status = String(po?.status || '').toLowerCase();
    return status !== 'received' && status !== 'cancelled';
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('vendorManagement')}</h1>
          <p className="text-muted-foreground">{t('manageYourVendorsAndSuppliers')}</p>
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <div className='flex justify-between items-center'>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="list">{t('vendorList')}</TabsTrigger>
          <TabsTrigger value="details">{t('vendorDetails')}</TabsTrigger>
        </TabsList>
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
                          <Label htmlFor="vendor-opening-balance">{t('openingBalance') || 'Opening Balance'}</Label>
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
                          <p className="text-xs text-gray-500">{language === 'en' ? 'Pending balance before using this software' : 'இந்த மென்பொருளைப் பயன்படுத்துவதற்கு முன் நிலுவைத் தொகை'}</p>
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

        {/* Vendor List Tab */}
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardContent>
              {vendors.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {t('noVendorsFound')}. {t('addYourFirstVendor')}.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('vendorName')}</TableHead>
                      <TableHead>{t('contactPerson')}</TableHead>
                      <TableHead>{t('email')}</TableHead>
                      <TableHead>{t('phone')}</TableHead>
                      <TableHead>{t('category')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead className="text-right">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.map((vendor) => (
                      <TableRow key={vendor.id}>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell>{vendor.contact_person}</TableCell>
                        <TableCell>{vendor.email}</TableCell>
                        <TableCell>{vendor.phone}</TableCell>
                        <TableCell>{vendor.category}</TableCell>
                        <TableCell>
                          <Badge variant={vendor.status === 'Active' ? 'default' : 'secondary'}>
                            {vendor.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditVendor(vendor)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteVendor(vendor.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendor Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardContent>
              <div className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="vendor-select">{t('selectVendor')}</Label>
                  <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                    <SelectTrigger id="vendor-select">
                      <SelectValue placeholder={t('chooseAVendor')} />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={String(vendor.id)}>
                          {vendor.name} ({vendor.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedVendor ? (
                  <div className="space-y-6">
                    {/* Vendor Header */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-2xl shadow-md">
                            {selectedVendor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-slate-900">{selectedVendor.name}</h3>
                            <p className="text-sm text-slate-600 mt-1">{selectedVendor.id}</p>
                            <Badge className="mt-2" variant={selectedVendor.status === 'Active' ? 'default' : 'secondary'}>
                              {selectedVendor.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditVendor(selectedVendor)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {t('edit')}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-slate-600 mb-1">{t('totalPurchases')}</p>
                              <p className="text-2xl font-bold text-slate-900">{selectedVendor.total_purchases}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <ShoppingCart className="w-6 h-6 text-blue-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-slate-600 mb-1">{t('totalAmount')}</p>
                              <p className="text-2xl font-bold text-blue-900">{formatCurrency(selectedVendor.total_amount)}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                              <IndianRupee className="w-6 h-6 text-green-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-slate-600 mb-1">{t('outstanding')}</p>
                              <p className="text-2xl font-bold text-red-600">{formatCurrency(selectedVendor.outstanding_amount)}</p>
                            </div>
                            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                              <IndianRupee className="w-6 h-6 text-red-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-slate-600 mb-1">{t('lastPurchase')}</p>
                              <p className="text-lg font-bold text-slate-900">
                                {new Date(selectedVendor.last_purchase_date).toLocaleDateString('en-IN')}
                              </p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-6 h-6 text-purple-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Contact Information */}
                    <Card>
                      <div className="px-6 pt-6">
                        <CardTitle className="text-lg">{t('contactInformation')}</CardTitle>
                      </div>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-600 mb-1">{t('contactPerson')}</p>
                              <p className="text-sm font-medium text-slate-900">{selectedVendor.contact_person}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Mail className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-600 mb-1">{t('email')}</p>
                              <p className="text-sm font-medium text-slate-900">{selectedVendor.email}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Phone className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-600 mb-1">{t('phone')}</p>
                              <p className="text-sm font-medium text-slate-900">{selectedVendor.phone}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <MapPin className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-600 mb-1">{t('address')}</p>
                              <p className="text-sm font-medium text-slate-900">{selectedVendor.address}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Package className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-600 mb-1">{t('category')}</p>
                              <p className="text-sm font-medium text-slate-900">{selectedVendor.category}</p>
                            </div>
                          </div>

                          {selectedVendor.gst_number && (
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 text-slate-600" />
                              </div>
                              <div>
                                <p className="text-xs text-slate-600 mb-1">{t('gstNumber')}</p>
                                <p className="text-sm font-medium text-slate-900">{selectedVendor.gst_number}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* History Tabs */}
                    <Card>
                      <CardContent className="p-0">
                        <Tabs defaultValue="purchase" className="w-full">
                          <div className="border-b border-slate-200 px-6 py-4">
                            <TabsList className="bg-slate-100 p-1 rounded-lg">
                              <TabsTrigger value="purchase" className="px-4 py-2">
                                {t('purchaseHistory')}
                              </TabsTrigger>
                              <TabsTrigger value="outstanding" className="px-4 py-2">
                                {t('outstandingHistory')}
                              </TabsTrigger>
                              <TabsTrigger value="transaction" className="px-4 py-2">
                                {t('transactionHistory')}
                              </TabsTrigger>
                            </TabsList>
                          </div>

                          <TabsContent value="purchase" className="p-6">
                            {vendorPurchaseOrders.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">{t('noDataFound')}</div>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>{t('poNumber')}</TableHead>
                                    <TableHead>{t('date')}</TableHead>
                                    <TableHead>{t('items')}</TableHead>
                                    <TableHead className="text-right">{t('amount')}</TableHead>
                                    <TableHead>{t('status')}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {vendorPurchaseOrders.map((po: any) => (
                                    <TableRow key={po.id}>
                                      <TableCell className="font-medium">{po.po_number || `PO-${po.id}`}</TableCell>
                                      <TableCell>{po.date ? new Date(po.date).toLocaleDateString('en-IN') : '—'}</TableCell>
                                      <TableCell>{po.items?.length ? `${po.items.length} item(s)` : (po.notes || '—')}</TableCell>
                                      <TableCell className="text-right">{formatCurrency(Number(po.total_amount || 0))}</TableCell>
                                      <TableCell>
                                        <Badge variant="secondary">{String(po.status || 'pending')}</Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </TabsContent>

                          <TabsContent value="outstanding" className="p-6">
                            {vendorOutstandingItems.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">{t('noDataFound')}</div>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>{t('poNumber')}</TableHead>
                                    <TableHead>{t('date')}</TableHead>
                                    <TableHead>{t('dueDate')}</TableHead>
                                    <TableHead className="text-right">{t('amount')}</TableHead>
                                    <TableHead className="text-right">{t('outstanding')}</TableHead>
                                    <TableHead>{t('status')}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {vendorOutstandingItems.map((po: any) => (
                                    <TableRow key={`out-${po.id}`}>
                                      <TableCell className="font-medium">{po.po_number || `PO-${po.id}`}</TableCell>
                                      <TableCell>{po.date ? new Date(po.date).toLocaleDateString('en-IN') : '—'}</TableCell>
                                      <TableCell>{po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString('en-IN') : '—'}</TableCell>
                                      <TableCell className="text-right">{formatCurrency(Number(po.total_amount || 0))}</TableCell>
                                      <TableCell className="text-right text-red-600 font-medium">{formatCurrency(Number(po.total_amount || 0))}</TableCell>
                                      <TableCell>
                                        <Badge variant="secondary">{String(po.status || 'pending')}</Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </TabsContent>

                          <TabsContent value="transaction" className="p-6">
                            {vendorTransactions.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">{t('noDataFound')}</div>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>{t('transactionId')}</TableHead>
                                    <TableHead>{t('date')}</TableHead>
                                    <TableHead>{t('description')}</TableHead>
                                    <TableHead>{t('method')}</TableHead>
                                    <TableHead className="text-right">{t('amount')}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {vendorTransactions.map((tx: any) => (
                                    <TableRow key={`txn-${tx.id}`}>
                                      <TableCell className="font-medium">{tx.reference || `TXN-${tx.id}`}</TableCell>
                                      <TableCell>{tx.date ? new Date(tx.date).toLocaleDateString('en-IN') : '—'}</TableCell>
                                      <TableCell>{tx.description || '—'}</TableCell>
                                      <TableCell>{tx.payment_method || '—'}</TableCell>
                                      <TableCell className="text-right text-emerald-600 font-medium">{formatCurrency(Number(tx.amount || 0))}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p>{t('pleaseSelectAVendorFromTheDropdownAboveToViewDetails')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
