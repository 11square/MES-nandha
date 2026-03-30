import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { translations, Language } from '../translations';
import { vendorsService } from '../services/vendors.service';
import { validateFields, FieldError, type ValidationErrors } from '../lib/validation';
import { ConfirmDialog } from './ui/confirm-dialog';

interface LibraryManagementProps {
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
}

interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  products_supplied: string;
}

const LibraryManagement: React.FC<LibraryManagementProps> = ({ language = 'en' }) => {
  const t = (key: keyof typeof translations.en) => translations[language][key] || translations.en[key];
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const refreshLibrary = useCallback(async () => {
    try {
      const data = await vendorsService.getVendors();
      if (data?.length) {
        const all = Array.isArray(data) ? data : [];
        setVendors(all.filter((v: any) => v.category !== 'supplier').map((v: any) => ({ ...v, id: String(v.id) })));
        setSuppliers(all.filter((v: any) => v.category === 'supplier').map((v: any) => ({ ...v, id: String(v.id) })));
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { refreshLibrary(); }, [refreshLibrary]);
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Vendor form state
  const [vendorForm, setVendorForm] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    category: '',
  });

  // Supplier form state
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    products_supplied: '',
  });

  const [vendorFormErrors, setVendorFormErrors] = useState<ValidationErrors>({});
  const [supplierFormErrors, setSupplierFormErrors] = useState<ValidationErrors>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{open: boolean, type: 'vendor'|'supplier', id: string}>({open: false, type: 'vendor', id: ''});

  // Vendor handlers
  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateFields(vendorForm, {
      name: { required: true, label: 'Name' },
      contact_person: { required: true, label: 'Contact Person' },
      email: { required: true, email: true, label: 'Email' },
      phone: { required: true, phone: true, label: 'Phone' },
      category: { required: true, label: 'Category' },
      address: { required: true, label: 'Address' },
    });
    if (Object.keys(errors).length) { setVendorFormErrors(errors); return; }
    try {
      const payload = {
        name: vendorForm.name,
        contact_person: vendorForm.contact_person,
        email: vendorForm.email,
        phone: vendorForm.phone,
        address: vendorForm.address,
        category: vendorForm.category,
      };
      if (editingVendor) {
        await vendorsService.updateVendor(editingVendor.id, payload);
        toast.success('Vendor updated successfully');
      } else {
        await vendorsService.createVendor(payload);
        toast.success('Vendor created successfully');
      }
      await refreshLibrary();
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
    });
    setIsVendorDialogOpen(true);
  };

  const handleDeleteVendor = (id: string) => {
    setDeleteConfirm({ open: true, type: 'vendor', id });
  };

  const resetVendorForm = () => {
    setVendorForm({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      category: '',
    });
    setEditingVendor(null);
    setVendorFormErrors({});
  };

  // Supplier handlers
  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateFields(supplierForm, {
      name: { required: true, label: 'Name' },
      contact_person: { required: true, label: 'Contact Person' },
      email: { required: true, email: true, label: 'Email' },
      phone: { required: true, phone: true, label: 'Phone' },
      products_supplied: { required: true, label: 'Products Supplied' },
      address: { required: true, label: 'Address' },
    });
    if (Object.keys(errors).length) { setSupplierFormErrors(errors); return; }
    try {
      const payload = {
        name: supplierForm.name,
        contact_person: supplierForm.contact_person,
        email: supplierForm.email,
        phone: supplierForm.phone,
        address: supplierForm.address,
        category: 'supplier',
        products_supplied: supplierForm.products_supplied,
      };
      if (editingSupplier) {
        await vendorsService.updateVendor(editingSupplier.id, payload);
        toast.success('Supplier updated successfully');
      } else {
        await vendorsService.createVendor(payload);
        toast.success('Supplier created successfully');
      }
      await refreshLibrary();
      resetSupplierForm();
      setIsSupplierDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save supplier');
    }
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({
      name: supplier.name,
      contact_person: supplier.contact_person,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      products_supplied: supplier.products_supplied,
    });
    setIsSupplierDialogOpen(true);
  };

  const handleDeleteSupplier = (id: string) => {
    setDeleteConfirm({ open: true, type: 'supplier', id });
  };

  const handleConfirmDelete = async () => {
    const { type, id } = deleteConfirm;
    setDeleteConfirm({ open: false, type: 'vendor', id: '' });
    try {
      await vendorsService.deleteVendor(id);
      toast.success(`${type === 'vendor' ? 'Vendor' : 'Supplier'} deleted successfully`);
      await refreshLibrary();
    } catch (err: any) {
      toast.error(err?.message || `Failed to delete ${type}`);
    }
  };

  const resetSupplierForm = () => {
    setSupplierForm({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      products_supplied: '',
    });
    setEditingSupplier(null);
    setSupplierFormErrors({});
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('libraryManagement')}</h1>
          <p className="text-muted-foreground">{t('manageVendorsSuppliers')}</p>
        </div>
      </div>

      <Tabs defaultValue="vendors" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="vendors">{t('vendors')}</TabsTrigger>
          <TabsTrigger value="suppliers">{t('suppliers')}</TabsTrigger>
        </TabsList>

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t('vendors')}</CardTitle>
                  <CardDescription>{t('manageVendorsSuppliers')}</CardDescription>
                </div>
                <Dialog open={isVendorDialogOpen} onOpenChange={(open: boolean) => {
                  setIsVendorDialogOpen(open);
                  if (!open) resetVendorForm();
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('addVendor')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingVendor ? t('editVendor') : t('addNewVendor')}</DialogTitle>
                      <DialogDescription>
                        {t('enterVendorDetails')}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleVendorSubmit} noValidate>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="vendor-name">{t('vendorNameRequired')}</Label>
                            <Input
                              id="vendor-name"
                              value={vendorForm.name}
                              onChange={(e) => { setVendorForm({ ...vendorForm, name: e.target.value }); setVendorFormErrors(prev => { const n = {...prev}; delete n.name; return n; }); }}
                            />
                            <FieldError message={vendorFormErrors.name} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="vendor-contact">{t('contactPersonRequired')}</Label>
                            <Input
                              id="vendor-contact"
                              value={vendorForm.contact_person}
                              onChange={(e) => { setVendorForm({ ...vendorForm, contact_person: e.target.value }); setVendorFormErrors(prev => { const n = {...prev}; delete n.contact_person; return n; }); }}
                            />
                            <FieldError message={vendorFormErrors.contact_person} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="vendor-email">{t('emailRequired')}</Label>
                            <Input
                              id="vendor-email"
                              type="email"
                              value={vendorForm.email}
                              onChange={(e) => { setVendorForm({ ...vendorForm, email: e.target.value }); setVendorFormErrors(prev => { const n = {...prev}; delete n.email; return n; }); }}
                            />
                            <FieldError message={vendorFormErrors.email} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="vendor-phone">{t('phoneRequired')}</Label>
                            <Input
                              id="vendor-phone"
                              value={vendorForm.phone}
                              onChange={(e) => { setVendorForm({ ...vendorForm, phone: e.target.value }); setVendorFormErrors(prev => { const n = {...prev}; delete n.phone; return n; }); }}
                            />
                            <FieldError message={vendorFormErrors.phone} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vendor-category">{t('categoryRequired')}</Label>
                          <Input
                            id="vendor-category"
                            value={vendorForm.category}
                            onChange={(e) => { setVendorForm({ ...vendorForm, category: e.target.value }); setVendorFormErrors(prev => { const n = {...prev}; delete n.category; return n; }); }}
                            placeholder="e.g., Raw Materials, Equipment, Services"
                          />
                          <FieldError message={vendorFormErrors.category} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vendor-address">{t('addressField')}</Label>
                          <Input
                            id="vendor-address"
                            value={vendorForm.address}
                            onChange={(e) => { setVendorForm({ ...vendorForm, address: e.target.value }); setVendorFormErrors(prev => { const n = {...prev}; delete n.address; return n; }); }}
                          />
                          <FieldError message={vendorFormErrors.address} />
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
                          {editingVendor ? t('update') : t('add')} {t('vendor')}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {vendors.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {t('noVendorsFound')}. {t('addFirstVendor')}.
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

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t('suppliers')}</CardTitle>
                  <CardDescription>{t('manageVendorsSuppliers')}</CardDescription>
                </div>
                <Dialog open={isSupplierDialogOpen} onOpenChange={(open: boolean) => {
                  setIsSupplierDialogOpen(open);
                  if (!open) resetSupplierForm();
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('addSupplier')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingSupplier ? t('editSupplier') : t('addNewSupplier')}</DialogTitle>
                      <DialogDescription>
                        {t('enterSupplierDetails')}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSupplierSubmit} noValidate>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="supplier-name">{t('supplierNameRequired')}</Label>
                            <Input
                              id="supplier-name"
                              value={supplierForm.name}
                              onChange={(e) => { setSupplierForm({ ...supplierForm, name: e.target.value }); setSupplierFormErrors(prev => { const n = {...prev}; delete n.name; return n; }); }}
                            />
                            <FieldError message={supplierFormErrors.name} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="supplier-contact">{t('contactPersonRequired')}</Label>
                            <Input
                              id="supplier-contact"
                              value={supplierForm.contact_person}
                              onChange={(e) => { setSupplierForm({ ...supplierForm, contact_person: e.target.value }); setSupplierFormErrors(prev => { const n = {...prev}; delete n.contact_person; return n; }); }}
                            />
                            <FieldError message={supplierFormErrors.contact_person} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="supplier-email">{t('emailRequired')}</Label>
                            <Input
                              id="supplier-email"
                              type="email"
                              value={supplierForm.email}
                              onChange={(e) => { setSupplierForm({ ...supplierForm, email: e.target.value }); setSupplierFormErrors(prev => { const n = {...prev}; delete n.email; return n; }); }}
                            />
                            <FieldError message={supplierFormErrors.email} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="supplier-phone">{t('phoneRequired')}</Label>
                            <Input
                              id="supplier-phone"
                              value={supplierForm.phone}
                              onChange={(e) => { setSupplierForm({ ...supplierForm, phone: e.target.value }); setSupplierFormErrors(prev => { const n = {...prev}; delete n.phone; return n; }); }}
                            />
                            <FieldError message={supplierFormErrors.phone} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="supplier-products">{t('productsSupplied')}</Label>
                          <Input
                            id="supplier-products"
                            value={supplierForm.products_supplied}
                            onChange={(e) => { setSupplierForm({ ...supplierForm, products_supplied: e.target.value }); setSupplierFormErrors(prev => { const n = {...prev}; delete n.products_supplied; return n; }); }}
                            placeholder="e.g., Steel, Plastic Components, Electronics"
                          />
                          <FieldError message={supplierFormErrors.products_supplied} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="supplier-address">{t('addressField')}</Label>
                          <Input
                            id="supplier-address"
                            value={supplierForm.address}
                            onChange={(e) => { setSupplierForm({ ...supplierForm, address: e.target.value }); setSupplierFormErrors(prev => { const n = {...prev}; delete n.address; return n; }); }}
                          />
                          <FieldError message={supplierFormErrors.address} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => {
                          setIsSupplierDialogOpen(false);
                          resetSupplierForm();
                        }}>
                          {t('cancel')}
                        </Button>
                        <Button type="submit">
                          {editingSupplier ? t('update') : t('add')} {t('supplier')}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {suppliers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {t('noSuppliersFound')}. {t('addFirstSupplier')}.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('name')}</TableHead>
                      <TableHead>{t('contactPerson')}</TableHead>
                      <TableHead>{t('email')}</TableHead>
                      <TableHead>{t('phone')}</TableHead>
                      <TableHead>{t('productsSupplied')}</TableHead>
                      <TableHead className="text-right">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>{supplier.contact_person}</TableCell>
                        <TableCell>{supplier.email}</TableCell>
                        <TableCell>{supplier.phone}</TableCell>
                        <TableCell>{supplier.products_supplied}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditSupplier(supplier)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSupplier(supplier.id)}
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
      </Tabs>

      <ConfirmDialog
        open={deleteConfirm.open}
        title={`Delete ${deleteConfirm.type === 'vendor' ? 'Vendor' : 'Supplier'}`}
        description={`Are you sure you want to delete this ${deleteConfirm.type}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, type: 'vendor', id: '' })}
      />
    </div>
  );
};

export default LibraryManagement;
