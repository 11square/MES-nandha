import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { translations, Language } from '../translations';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Calendar,
  Phone,
  Mail,
  MapPin,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Bell,
  AlertCircle,
  Activity,
  Target,
  Award,
  UserCheck,
  LogIn,
  LogOut,
  Timer,
  BarChart3,
  Star,
  TrendingDown,
  Zap
} from 'lucide-react';
import { Progress } from './ui/progress';
import { validateFields, FieldError, blockInvalidNumberKeys, type ValidationErrors } from '../lib/validation';
import { ConfirmDialog } from './ui/confirm-dialog';

import { salesService } from '../services/sales.service';
interface SalesManagementProps {
  language?: Language;
}

interface Sale {
  id: string;
  date: string;
  client_name: string;
  client_contact: string;
  product_details: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  payment_status: 'unpaid' | 'partial' | 'paid';
  sales_person: string;
  notes?: string;
}

interface SalesFollowup {
  id: string;
  client_name: string;
  client_contact: string;
  last_contact: string;
  next_followup: string;
  status: 'hot' | 'warm' | 'cold';
  sales_person: string;
  notes: string;
  potential_value: number;
}

interface SalesTarget {
  id: string;
  sales_person: string;
  month: string;
  target: number;
  achieved: number;
  percentage: number;
}

interface SalesStaffProductivity {
  id: string;
  name: string;
  email: string;
  phone: string;
  login_time: string;
  logout_time: string | null;
  status: 'online' | 'offline' | 'break';
  today_calls: number;
  today_meetings: number;
  today_sales: number;
  today_revenue: number;
  weekly_target: number;
  weekly_achieved: number;
  monthly_target: number;
  monthly_achieved: number;
  rating: number;
  conversion_rate: number;
  avg_response_time: string;
}

interface LeadSale {
  id: string;
  lead_number: string;
  converted_date: string;
  client_name: string;
  client_contact: string;
  client_email: string;
  client_address: string;
  source: string;
  products: { product: string; size: string; quantity: number }[];
  total_amount: number;
  status: 'pending' | 'in-production' | 'completed' | 'delivered';
  payment_status: 'unpaid' | 'partial' | 'paid';
  gst_number: string;
  converted_by: string;
  notes?: string;
}

const SalesManagement: React.FC<SalesManagementProps> = ({ language = 'en' }) => {
  const t = (key: keyof typeof translations.en) => translations[language][key] || translations.en[key];
  
  const [sales, setSales] = useState<Sale[]>([]);

  const [leadSales, setLeadSales] = useState<LeadSale[]>([]);

  const [targets, setTargets] = useState<SalesTarget[]>([]);

  const [staffProductivity, setStaffProductivity] = useState<SalesStaffProductivity[]>([]);

  const [followups, setFollowups] = useState<SalesFollowup[]>([]);

  const refreshSales = () => {
    salesService.getSales().then(data => {
      const items = Array.isArray(data) ? data : (data as any)?.items || [];
      setSales(items);
    }).catch(() => {});
    salesService.getTargets().then(data => {
      const items = Array.isArray(data) ? data : (data as any)?.items || [];
      setTargets(items);
    }).catch(() => {});
    salesService.getFollowups().then(data => {
      const items = Array.isArray(data) ? data : (data as any)?.items || [];
      setFollowups(items);
    }).catch(() => {});
  };

  useEffect(() => {
    refreshSales();
  }, []);

  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
  const [isTargetDialogOpen, setIsTargetDialogOpen] = useState(false);
  const [isFollowupDialogOpen, setIsFollowupDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editingTarget, setEditingTarget] = useState<SalesTarget | null>(null);
  const [editingFollowup, setEditingFollowup] = useState<SalesFollowup | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [saleForm, setSaleForm] = useState({
    date: '',
    client_name: '',
    client_contact: '',
    product_details: '',
    quantity: 0,
    unit_price: 0,
    status: 'pending' as Sale['status'],
    payment_status: 'unpaid' as Sale['payment_status'],
    sales_person: '',
    notes: '',
  });

  const [targetForm, setTargetForm] = useState({
    sales_person: '',
    month: '',
    target: 0,
  });

  const [followupForm, setFollowupForm] = useState({
    client_name: '',
    client_contact: '',
    last_contact: '',
    next_followup: '',
    status: 'warm' as SalesFollowup['status'],
    sales_person: '',
    notes: '',
    potential_value: 0,
  });

  const [saleErrors, setSaleErrors] = useState<ValidationErrors>({});
  const [followupErrors, setFollowupErrors] = useState<ValidationErrors>({});
  const [targetErrors, setTargetErrors] = useState<ValidationErrors>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{open: boolean, type: 'sale'|'target'|'followup', id: string}>({open: false, type: 'sale', id: ''});

  // Calculate statistics
  const totalSales = sales.reduce((sum, sale) => sum + (sale.total_amount ?? 0), 0);
  const pendingSales = sales.filter(s => s.status === 'pending').length;
  const confirmedSales = sales.filter(s => s.status === 'confirmed').length;
  const deliveredSales = sales.filter(s => s.status === 'delivered').length;

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateFields(saleForm, {
      date: { required: true, label: 'Date' },
      sales_person: { required: true, label: 'Sales Person' },
      client_name: { required: true, label: 'Client Name' },
      client_contact: { required: true, phone: true, label: 'Client Contact' },
      product_details: { required: true, label: 'Product Details' },
      quantity: { required: true, numeric: true, min: 1, label: 'Quantity' },
      unit_price: { required: true, numeric: true, min: 0, label: 'Unit Price' },
      status: { required: true, label: 'Order Status' },
      payment_status: { required: true, label: 'Payment Status' },
    });
    if (Object.keys(errors).length) { setSaleErrors(errors); return; }
    try {
      const payload = {
        ...saleForm,
        total_amount: saleForm.quantity * saleForm.unit_price,
      };
      if (editingSale) {
        await salesService.updateSale(editingSale.id, payload);
        toast.success('Sale updated successfully!');
      } else {
        await salesService.createSale(payload);
        toast.success('Sale created successfully!');
      }
      refreshSales();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save sale');
    }
    resetSaleForm();
    setIsSaleDialogOpen(false);
  };

  const handleTargetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateFields(targetForm, {
      sales_person: { required: true, label: 'Sales Person' },
      month: { required: true, label: 'Month' },
      target: { required: true, numeric: true, min: 0, label: 'Target Amount' },
    });
    if (Object.keys(errors).length) { setTargetErrors(errors); return; }
    try {
      if (editingTarget) {
        await salesService.updateTarget(editingTarget.id, targetForm);
        toast.success('Target updated successfully!');
      } else {
        await salesService.createTarget({
          ...targetForm,
          achieved: 0,
          percentage: 0,
        });
        toast.success('Target created successfully!');
      }
      refreshSales();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save target');
    }
    resetTargetForm();
    setIsTargetDialogOpen(false);
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setSaleErrors({});
    setSaleForm({
      date: sale.date,
      client_name: sale.client_name,
      client_contact: sale.client_contact,
      product_details: sale.product_details,
      quantity: sale.quantity,
      unit_price: sale.unit_price,
      status: sale.status,
      payment_status: sale.payment_status,
      sales_person: sale.sales_person,
      notes: sale.notes || '',
    });
    setIsSaleDialogOpen(true);
  };

  const handleEditTarget = (target: SalesTarget) => {
    setEditingTarget(target);
    setTargetErrors({});
    setTargetForm({
      sales_person: target.sales_person,
      month: target.month,
      target: target.target,
    });
    setIsTargetDialogOpen(true);
  };

  const handleDeleteSale = (id: string) => {
    setDeleteConfirm({ open: true, type: 'sale', id });
  };

  const handleDeleteTarget = (id: string) => {
    setDeleteConfirm({ open: true, type: 'target', id });
  };

  const handleFollowupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateFields(followupForm, {
      client_name: { required: true, label: 'Client Name' },
      client_contact: { required: true, phone: true, label: 'Client Contact' },
      last_contact: { required: true, label: 'Last Contact Date' },
      next_followup: { required: true, label: 'Next Follow-up Date' },
      status: { required: true, label: 'Lead Status' },
      sales_person: { required: true, label: 'Sales Person' },
      potential_value: { required: true, numeric: true, min: 0, label: 'Potential Value' },
      notes: { required: true, label: 'Notes' },
    });
    if (Object.keys(errors).length) { setFollowupErrors(errors); return; }
    try {
      if (editingFollowup) {
        await salesService.updateFollowup(editingFollowup.id, followupForm);
        toast.success('Follow-up updated successfully!');
      } else {
        await salesService.createFollowup(followupForm);
        toast.success('Follow-up created successfully!');
      }
      refreshSales();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save follow-up');
    }
    resetFollowupForm();
    setIsFollowupDialogOpen(false);
  };

  const handleEditFollowup = (followup: SalesFollowup) => {
    setEditingFollowup(followup);
    setFollowupErrors({});
    setFollowupForm({
      client_name: followup.client_name,
      client_contact: followup.client_contact,
      last_contact: followup.last_contact,
      next_followup: followup.next_followup,
      status: followup.status,
      sales_person: followup.sales_person,
      notes: followup.notes,
      potential_value: followup.potential_value,
    });
    setIsFollowupDialogOpen(true);
  };

  const handleDeleteFollowup = (id: string) => {
    setDeleteConfirm({ open: true, type: 'followup', id });
  };

  const handleConfirmDelete = async () => {
    const { type, id } = deleteConfirm;
    setDeleteConfirm({ open: false, type: 'sale', id: '' });
    try {
      if (type === 'sale') {
        await salesService.deleteSale(id);
        toast.success('Sale deleted successfully!');
        refreshSales();
      } else if (type === 'target') {
        setTargets(prev => prev.filter(t => t.id !== id));
        toast.success('Target deleted successfully!');
      } else if (type === 'followup') {
        setFollowups(prev => prev.filter(f => f.id !== id));
        toast.success('Follow-up deleted successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const resetSaleForm = () => {
    setSaleForm({
      date: '',
      client_name: '',
      client_contact: '',
      product_details: '',
      quantity: 0,
      unit_price: 0,
      status: 'pending',
      payment_status: 'unpaid',
      sales_person: '',
      notes: '',
    });
    setEditingSale(null);
    setSaleErrors({});
  };

  const resetTargetForm = () => {
    setTargetForm({
      sales_person: '',
      month: '',
      target: 0,
    });
    setEditingTarget(null);
    setTargetErrors({});
  };

  const resetFollowupForm = () => {
    setFollowupForm({
      client_name: '',
      client_contact: '',
      last_contact: '',
      next_followup: '',
      status: 'warm',
      sales_person: '',
      notes: '',
      potential_value: 0,
    });
    setEditingFollowup(null);
    setFollowupErrors({});
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'paid':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'pending':
      case 'unpaid':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'delivered':
      case 'partial':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'paid':
        return <CheckCircle className="w-3 h-3" />;
      case 'pending':
      case 'unpaid':
        return <Clock className="w-3 h-3" />;
      case 'delivered':
        return <CheckCircle className="w-3 h-3" />;
      case 'cancelled':
        return <XCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-500/10 backdrop-blur-sm border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">{t('totalSales')}</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            <div className="text-2xl font-bold text-blue-700">₹{totalSales.toLocaleString()}</div>
            <p className="text-xs text-blue-600">{t('thisMonth')}</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/10 backdrop-blur-sm border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">{t('pendingOrders')}</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            <div className="text-2xl font-bold text-amber-700">{pendingSales}</div>
            <p className="text-xs text-amber-600">{t('awaitingPayment')}</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/10 backdrop-blur-sm border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">{t('approved')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            <div className="text-2xl font-bold text-purple-700">{confirmedSales}</div>
            <p className="text-xs text-purple-600">{t('inProgressOrders')}</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/10 backdrop-blur-sm border-emerald-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">{t('delivered')}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            <div className="text-2xl font-bold text-emerald-700">{deliveredSales}</div>
            <p className="text-xs text-emerald-600">{t('completedOrders')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="lead-sales" className="w-full">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-gray-100 rounded-lg w-fit">
          <TabsTrigger value="lead-sales" className="px-4 py-2">{t('leadSales')}</TabsTrigger>
          <TabsTrigger value="sales" className="px-4 py-2">{t('salesOrders')}</TabsTrigger>
          <TabsTrigger value="followups" className="px-4 py-2">{t('salesFollowups')}</TabsTrigger>
          <TabsTrigger value="targets" className="px-4 py-2">{t('salesTargets')}</TabsTrigger>
          <TabsTrigger value="productivity" className="px-4 py-2">{t('productivity')}</TabsTrigger>
        </TabsList>

        {/* Sales Orders Tab */}
        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t('salesOrders')}</CardTitle>
                  <CardDescription>{t('manageSales')}</CardDescription>
                </div>
                <Dialog open={isSaleDialogOpen} onOpenChange={(open: boolean) => {
                  setIsSaleDialogOpen(open);
                  if (!open) resetSaleForm();
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('add')} {t('sales')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingSale ? t('edit') + ' ' + t('sales') : t('add') + ' ' + t('sales')}</DialogTitle>
                      <DialogDescription>
                        {t('enterVendorDetails')}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaleSubmit} noValidate>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="sale-date">{t('date')} *</Label>
                            <Input
                              id="sale-date"
                              type="date"
                              value={saleForm.date}
                              onChange={(e) => { setSaleForm({ ...saleForm, date: e.target.value }); setSaleErrors(prev => { const n = {...prev}; delete n.date; return n; }); }}
                            />
                            <FieldError message={saleErrors.date} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="sales-person">{t('salesPerson')} *</Label>
                            <Input
                              id="sales-person"
                              value={saleForm.sales_person}
                              onChange={(e) => { setSaleForm({ ...saleForm, sales_person: e.target.value }); setSaleErrors(prev => { const n = {...prev}; delete n.sales_person; return n; }); }}
                            />
                            <FieldError message={saleErrors.sales_person} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="client-name">Client Name *</Label>
                            <Input
                              id="client-name"
                              value={saleForm.client_name}
                              onChange={(e) => { setSaleForm({ ...saleForm, client_name: e.target.value }); setSaleErrors(prev => { const n = {...prev}; delete n.client_name; return n; }); }}
                            />
                            <FieldError message={saleErrors.client_name} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="client-contact">Client Contact *</Label>
                            <Input
                              id="client-contact"
                              value={saleForm.client_contact}
                              onChange={(e) => { setSaleForm({ ...saleForm, client_contact: e.target.value }); setSaleErrors(prev => { const n = {...prev}; delete n.client_contact; return n; }); }}
                              placeholder="+91 98765 43210"
                            />
                            <FieldError message={saleErrors.client_contact} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="product-details">Product Details *</Label>
                          <Input
                            id="product-details"
                            value={saleForm.product_details}
                            onChange={(e) => { setSaleForm({ ...saleForm, product_details: e.target.value }); setSaleErrors(prev => { const n = {...prev}; delete n.product_details; return n; }); }}
                          />
                          <FieldError message={saleErrors.product_details} />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity *</Label>
                            <Input
                              id="quantity"
                              type="number"
                              value={saleForm.quantity}
                              onChange={(e) => { setSaleForm({ ...saleForm, quantity: Number(e.target.value) }); setSaleErrors(prev => { const n = {...prev}; delete n.quantity; return n; }); }}
                              onKeyDown={blockInvalidNumberKeys}
                            />
                            <FieldError message={saleErrors.quantity} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="unit-price">Unit Price (₹) *</Label>
                            <Input
                              id="unit-price"
                              type="number"
                              value={saleForm.unit_price}
                              onChange={(e) => { setSaleForm({ ...saleForm, unit_price: Number(e.target.value) }); setSaleErrors(prev => { const n = {...prev}; delete n.unit_price; return n; }); }}
                              onKeyDown={blockInvalidNumberKeys}
                            />
                            <FieldError message={saleErrors.unit_price} />
                          </div>
                          <div className="space-y-2">
                            <Label>Total Amount</Label>
                            <Input
                              value={`₹${(saleForm.quantity * saleForm.unit_price).toLocaleString()}`}
                              disabled
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="status">Order Status *</Label>
                            <select
                              id="status"
                              value={saleForm.status}
                              onChange={(e) => { setSaleForm({ ...saleForm, status: e.target.value as Sale['status'] }); setSaleErrors(prev => { const n = {...prev}; delete n.status; return n; }); }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <FieldError message={saleErrors.status} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="payment-status">Payment Status *</Label>
                            <select
                              id="payment-status"
                              value={saleForm.payment_status}
                              onChange={(e) => { setSaleForm({ ...saleForm, payment_status: e.target.value as Sale['payment_status'] }); setSaleErrors(prev => { const n = {...prev}; delete n.payment_status; return n; }); }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                              <option value="unpaid">Unpaid</option>
                              <option value="partial">Partial</option>
                              <option value="paid">Paid</option>
                            </select>
                            <FieldError message={saleErrors.payment_status} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notes">Notes</Label>
                          <Input
                            id="notes"
                            value={saleForm.notes}
                            onChange={(e) => setSaleForm({ ...saleForm, notes: e.target.value })}
                            placeholder="Additional notes or comments"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => {
                          setIsSaleDialogOpen(false);
                          resetSaleForm();
                        }}>
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingSale ? 'Update' : 'Add'} Sale
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="mt-4 flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by client, product, or sale ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sales.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No sales orders yet. Click "Add Sale" to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sale ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Order Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Sales Person</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{sale.id}</TableCell>
                        <TableCell>{new Date(sale.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{sale.client_name}</div>
                            <div className="text-xs text-gray-500">{sale.client_contact}</div>
                          </div>
                        </TableCell>
                        <TableCell>{sale.product_details}</TableCell>
                        <TableCell>{sale.quantity}</TableCell>
                        <TableCell className="font-semibold">₹{(sale.total_amount ?? 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(sale.status)} flex items-center gap-1 w-fit`}>
                            {getStatusIcon(sale.status)}
                            {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(sale.payment_status)} flex items-center gap-1 w-fit`}>
                            {getStatusIcon(sale.payment_status)}
                            {sale.payment_status.charAt(0).toUpperCase() + sale.payment_status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{sale.sales_person}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditSale(sale)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSale(sale.id)}
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

        {/* Lead Sales Tab */}
        <TabsContent value="lead-sales" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t('leadSales')}</CardTitle>
                  <CardDescription>{t('salesConvertedFromLeadModule')}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    {t('filter')}
                  </Button>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    {t('export')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Lead Sales Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('lead')}</TableHead>
                    <TableHead>{t('convertedDate')}</TableHead>
                    <TableHead>{t('client')}</TableHead>
                    <TableHead>{t('source')}</TableHead>
                    <TableHead>{t('products')}</TableHead>
                    <TableHead className="text-right">{t('total')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('payment')}</TableHead>
                    <TableHead>{t('convertedBy')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leadSales.map((leadSale) => (
                    <TableRow key={leadSale.id}>
                      <TableCell className="font-mono text-blue-600 font-medium">{leadSale.lead_number}</TableCell>
                      <TableCell>{new Date(leadSale.converted_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{leadSale.client_name}</div>
                          <div className="text-xs text-gray-500">{leadSale.client_contact}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {leadSale.source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {leadSale.products.map((p, idx) => (
                            <div key={idx} className="text-xs text-gray-600">
                              {p.product} ({p.size}) x{p.quantity}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">₹{(leadSale.total_amount ?? 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${
                          leadSale.status === 'delivered' || leadSale.status === 'completed' 
                            ? 'bg-green-100 text-green-700 border-green-200' 
                            : leadSale.status === 'in-production' 
                              ? 'bg-blue-100 text-blue-700 border-blue-200'
                              : 'bg-amber-100 text-amber-700 border-amber-200'
                        }`}>
                          {leadSale.status === 'in-production' ? 'In Production' : leadSale.status.charAt(0).toUpperCase() + leadSale.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${
                          leadSale.payment_status === 'paid' 
                            ? 'bg-green-100 text-green-700' 
                            : leadSale.payment_status === 'partial' 
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {leadSale.payment_status.charAt(0).toUpperCase() + leadSale.payment_status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{leadSale.converted_by}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Follow-ups Tab */}
        <TabsContent value="followups" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Sales Follow-ups</CardTitle>
                  <CardDescription>Track and manage client follow-ups and leads</CardDescription>
                </div>
                <Dialog open={isFollowupDialogOpen} onOpenChange={(open: boolean) => {
                  setIsFollowupDialogOpen(open);
                  if (!open) resetFollowupForm();
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Follow-up
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingFollowup ? 'Edit Follow-up' : 'Add New Follow-up'}</DialogTitle>
                      <DialogDescription>
                        Enter client follow-up details
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleFollowupSubmit} noValidate>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="followup-client">Client Name *</Label>
                            <Input
                              id="followup-client"
                              value={followupForm.client_name}
                              onChange={(e) => { setFollowupForm({ ...followupForm, client_name: e.target.value }); setFollowupErrors(prev => { const n = {...prev}; delete n.client_name; return n; }); }}
                            />
                            <FieldError message={followupErrors.client_name} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="followup-contact">Client Contact *</Label>
                            <Input
                              id="followup-contact"
                              value={followupForm.client_contact}
                              onChange={(e) => { setFollowupForm({ ...followupForm, client_contact: e.target.value }); setFollowupErrors(prev => { const n = {...prev}; delete n.client_contact; return n; }); }}
                              placeholder="+91 98765 43210"
                            />
                            <FieldError message={followupErrors.client_contact} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="last-contact">Last Contact Date *</Label>
                            <Input
                              id="last-contact"
                              type="date"
                              value={followupForm.last_contact}
                              onChange={(e) => { setFollowupForm({ ...followupForm, last_contact: e.target.value }); setFollowupErrors(prev => { const n = {...prev}; delete n.last_contact; return n; }); }}
                            />
                            <FieldError message={followupErrors.last_contact} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="next-followup">Next Follow-up Date *</Label>
                            <Input
                              id="next-followup"
                              type="date"
                              value={followupForm.next_followup}
                              onChange={(e) => { setFollowupForm({ ...followupForm, next_followup: e.target.value }); setFollowupErrors(prev => { const n = {...prev}; delete n.next_followup; return n; }); }}
                            />
                            <FieldError message={followupErrors.next_followup} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="followup-status">Lead Status *</Label>
                            <select
                              id="followup-status"
                              value={followupForm.status}
                              onChange={(e) => { setFollowupForm({ ...followupForm, status: e.target.value as SalesFollowup['status'] }); setFollowupErrors(prev => { const n = {...prev}; delete n.status; return n; }); }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                              <option value="hot">Hot Lead</option>
                              <option value="warm">Warm Lead</option>
                              <option value="cold">Cold Lead</option>
                            </select>
                            <FieldError message={followupErrors.status} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="followup-salesperson">Sales Person *</Label>
                            <Input
                              id="followup-salesperson"
                              value={followupForm.sales_person}
                              onChange={(e) => { setFollowupForm({ ...followupForm, sales_person: e.target.value }); setFollowupErrors(prev => { const n = {...prev}; delete n.sales_person; return n; }); }}
                            />
                            <FieldError message={followupErrors.sales_person} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="potential-value">Potential Value (₹) *</Label>
                          <Input
                            id="potential-value"
                            type="number"
                            value={followupForm.potential_value}
                            onChange={(e) => { setFollowupForm({ ...followupForm, potential_value: Number(e.target.value) }); setFollowupErrors(prev => { const n = {...prev}; delete n.potential_value; return n; }); }}
                            onKeyDown={blockInvalidNumberKeys}
                          />
                          <FieldError message={followupErrors.potential_value} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="followup-notes">Notes *</Label>
                          <Input
                            id="followup-notes"
                            value={followupForm.notes}
                            onChange={(e) => { setFollowupForm({ ...followupForm, notes: e.target.value }); setFollowupErrors(prev => { const n = {...prev}; delete n.notes; return n; }); }}
                            placeholder="Discussion points, requirements, etc."
                          />
                          <FieldError message={followupErrors.notes} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => {
                          setIsFollowupDialogOpen(false);
                          resetFollowupForm();
                        }}>
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingFollowup ? 'Update' : 'Add'} Follow-up
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {followups.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No follow-ups scheduled. Click "Add Follow-up" to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Follow-up ID</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Last Contact</TableHead>
                      <TableHead>Next Follow-up</TableHead>
                      <TableHead>Lead Status</TableHead>
                      <TableHead>Potential Value</TableHead>
                      <TableHead>Sales Person</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {followups.map((followup) => (
                      <TableRow key={followup.id}>
                        <TableCell className="font-medium">{followup.id}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{followup.client_name}</div>
                            <div className="text-xs text-gray-500">{followup.client_contact}</div>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(followup.last_contact).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Bell className="w-3.5 h-3.5 text-gray-500" />
                            {new Date(followup.next_followup).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`flex items-center gap-1 w-fit ${
                            followup.status === 'hot' ? 'bg-red-100 text-red-700 border-red-200' :
                            followup.status === 'warm' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                            'bg-blue-100 text-blue-700 border-blue-200'
                          }`}>
                            {followup.status === 'hot' && <AlertCircle className="w-3 h-3" />}
                            {followup.status === 'warm' && <Clock className="w-3 h-3" />}
                            {followup.status === 'cold' && <Clock className="w-3 h-3" />}
                            {followup.status.charAt(0).toUpperCase() + followup.status.slice(1)} Lead
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-emerald-600">
                          ₹{(followup.potential_value ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell>{followup.sales_person}</TableCell>
                        <TableCell className="max-w-xs truncate">{followup.notes}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditFollowup(followup)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteFollowup(followup.id)}
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

        {/* Sales Targets Tab */}
        <TabsContent value="targets" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Sales Targets</CardTitle>
                  <CardDescription>Set and track sales targets for team members</CardDescription>
                </div>
                <Dialog open={isTargetDialogOpen} onOpenChange={(open: boolean) => {
                  setIsTargetDialogOpen(open);
                  if (!open) resetTargetForm();
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Target
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingTarget ? 'Edit Target' : 'Add New Target'}</DialogTitle>
                      <DialogDescription>
                        Set sales target details
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleTargetSubmit} noValidate>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="target-salesperson">Sales Person *</Label>
                          <Input
                            id="target-salesperson"
                            value={targetForm.sales_person}
                            onChange={(e) => { setTargetForm({ ...targetForm, sales_person: e.target.value }); setTargetErrors(prev => { const n = {...prev}; delete n.sales_person; return n; }); }}
                          />
                          <FieldError message={targetErrors.sales_person} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="target-month">Month *</Label>
                          <Input
                            id="target-month"
                            value={targetForm.month}
                            onChange={(e) => { setTargetForm({ ...targetForm, month: e.target.value }); setTargetErrors(prev => { const n = {...prev}; delete n.month; return n; }); }}
                            placeholder="e.g., December 2024"
                          />
                          <FieldError message={targetErrors.month} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="target-amount">Target Amount (₹) *</Label>
                          <Input
                            id="target-amount"
                            type="number"
                            value={targetForm.target}
                            onChange={(e) => { setTargetForm({ ...targetForm, target: Number(e.target.value) }); setTargetErrors(prev => { const n = {...prev}; delete n.target; return n; }); }}
                            onKeyDown={blockInvalidNumberKeys}
                          />
                          <FieldError message={targetErrors.target} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => {
                          setIsTargetDialogOpen(false);
                          resetTargetForm();
                        }}>
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingTarget ? 'Update' : 'Add'} Target
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {targets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No sales targets set. Click "Add Target" to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sales Person</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Achieved</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {targets.map((target) => (
                      <TableRow key={target.id}>
                        <TableCell className="font-medium">{target.sales_person}</TableCell>
                        <TableCell>{target.month}</TableCell>
                        <TableCell>₹{(target.target ?? 0).toLocaleString()}</TableCell>
                        <TableCell className="text-emerald-600 font-semibold">
                          ₹{(target.achieved ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-amber-600 font-semibold">
                          ₹{((target.target ?? 0) - (target.achieved ?? 0)).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div
                                className={`h-2.5 rounded-full ${
                                  target.percentage >= 100 ? 'bg-emerald-600' :
                                  target.percentage >= 75 ? 'bg-blue-600' :
                                  target.percentage >= 50 ? 'bg-amber-600' : 'bg-red-600'
                                }`}
                                style={{ width: `${Math.min(target.percentage, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium min-w-[45px]">{target.percentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditTarget(target)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTarget(target.id)}
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

        {/* Productivity Tab */}
        <TabsContent value="productivity" className="space-y-4">
          {/* Productivity Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-emerald-500/10 border-emerald-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('staffOnline')}</CardTitle>
                <UserCheck className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700">
                  {staffProductivity.filter(s => s.status === 'online').length}/{staffProductivity.length}
                </div>
                <p className="text-xs text-emerald-600">{t('currentlyActive')}</p>
              </CardContent>
            </Card>

            <Card className="bg-blue-500/10 border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('todaysCalls')}</CardTitle>
                <Phone className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">
                  {staffProductivity.reduce((sum, s) => sum + s.todayCalls, 0)}
                </div>
                <p className="text-xs text-blue-600">{t('totalCallsMade')}</p>
              </CardContent>
            </Card>

            <Card className="bg-purple-500/10 border-purple-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('todaysMeetings')}</CardTitle>
                <Users className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700">
                  {staffProductivity.reduce((sum, s) => sum + s.today_meetings, 0)}
                </div>
                <p className="text-xs text-purple-600">{t('scheduledMeetings')}</p>
              </CardContent>
            </Card>

            <Card className="bg-amber-500/10 border-amber-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('todaysRevenue')}</CardTitle>
                <DollarSign className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-700">
                  ₹{staffProductivity.reduce((sum, s) => sum + (s.today_revenue ?? 0), 0).toLocaleString()}
                </div>
                <p className="text-xs text-amber-600">{t('totalSalesToday')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Staff Login Status */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <LogIn className="h-5 w-5" />
                    {t('staffLoginStatus')}
                  </CardTitle>
                  <CardDescription>{t('salesTeamLoginAndActivityTracking')}</CardDescription>
                </div>
                <Badge variant="outline" className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  {t('live')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('staff')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('loginTime')}</TableHead>
                    <TableHead>{t('logout')}</TableHead>
                    <TableHead>{t('calls')}</TableHead>
                    <TableHead>{t('meetings')}</TableHead>
                    <TableHead>{t('sales')}</TableHead>
                    <TableHead>{t('avgResponse')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffProductivity.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                            staff.status === 'online' ? 'bg-emerald-500' :
                            staff.status === 'break' ? 'bg-amber-500' : 'bg-gray-400'
                          }`}>
                            {staff.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-medium">{staff.name}</div>
                            <div className="text-xs text-gray-500">{staff.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${
                          staff.status === 'online' ? 'bg-emerald-100 text-emerald-700' :
                          staff.status === 'break' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          <div className={`w-2 h-2 rounded-full mr-1 ${
                            staff.status === 'online' ? 'bg-emerald-500' :
                            staff.status === 'break' ? 'bg-amber-500' : 'bg-gray-500'
                          }`}></div>
                          {staff.status === 'online' ? (t('online')) :
                           staff.status === 'break' ? (t('break')) :
                           (t('offline'))}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <LogIn className="h-3 w-3 text-emerald-600" />
                          {staff.login_time}
                        </div>
                      </TableCell>
                      <TableCell>
                        {staff.logout_time ? (
                          <div className="flex items-center gap-1">
                            <LogOut className="h-3 w-3 text-red-600" />
                            {staff.logout_time}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-blue-600" />
                          <span className="font-semibold">{staff.today_calls}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-purple-600" />
                          <span className="font-semibold">{staff.today_meetings}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ShoppingCart className="h-3 w-3 text-emerald-600" />
                          <span className="font-semibold">{staff.today_sales}</span>
                          <span className="text-xs text-gray-500">(₹{(staff.today_revenue ?? 0).toLocaleString()})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Timer className="h-3 w-3 text-amber-600" />
                          {staff.avg_response_time}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Individual Performance Cards */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t('individualPerformance')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {staffProductivity.map((staff) => (
                <Card key={staff.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg ${
                          staff.rating >= 4.5 ? 'bg-emerald-500' :
                          staff.rating >= 4 ? 'bg-blue-500' :
                          staff.rating >= 3.5 ? 'bg-amber-500' : 'bg-red-500'
                        }`}>
                          {staff.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{staff.name}</CardTitle>
                          <div className="flex items-center gap-1 text-amber-500">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`h-3 w-3 ${i < Math.floor(staff.rating) ? 'fill-current' : ''}`} />
                            ))}
                            <span className="text-sm text-gray-600 ml-1">{staff.rating}</span>
                          </div>
                        </div>
                      </div>
                      <Badge className={`${
                        staff.status === 'online' ? 'bg-emerald-100 text-emerald-700' :
                        staff.status === 'break' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {staff.status === 'online' ? (t('online')) :
                         staff.status === 'break' ? (t('break')) :
                         (t('offline'))}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Weekly Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{t('weeklyTarget')}</span>
                        <span className="font-semibold">₹{(staff.weekly_achieved ?? 0).toLocaleString()} / ₹{(staff.weekly_target ?? 0).toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            (staff.weekly_achieved / staff.weekly_target) * 100 >= 80 ? 'bg-emerald-500' :
                            (staff.weekly_achieved / staff.weekly_target) * 100 >= 60 ? 'bg-blue-500' :
                            (staff.weekly_achieved / staff.weekly_target) * 100 >= 40 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min((staff.weekly_achieved / staff.weekly_target) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Monthly Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{t('monthlyTarget')}</span>
                        <span className="font-semibold">₹{(staff.monthly_achieved ?? 0).toLocaleString()} / ₹{(staff.monthly_target ?? 0).toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            (staff.monthly_achieved / staff.monthly_target) * 100 >= 80 ? 'bg-emerald-500' :
                            (staff.monthly_achieved / staff.monthly_target) * 100 >= 60 ? 'bg-blue-500' :
                            (staff.monthly_achieved / staff.monthly_target) * 100 >= 40 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min((staff.monthly_achieved / staff.monthly_target) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{staff.conversion_rate}%</div>
                        <div className="text-xs text-gray-500">{t('conversion')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-600">{staff.today_calls}</div>
                        <div className="text-xs text-gray-500">{t('calls')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-emerald-600">{staff.today_sales}</div>
                        <div className="text-xs text-gray-500">{t('sales')}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Overall Team Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {t('overallTeamPerformance')}
              </CardTitle>
              <CardDescription>{t('overallPerformanceMetricsForTheSalesTeam')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">
                    {Math.round(staffProductivity.reduce((sum, s) => sum + s.conversion_rate, 0) / staffProductivity.length)}%
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{t('avgConversionRate')}</div>
                  <div className="flex items-center justify-center gap-1 text-xs text-emerald-600 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    +5% {t('fromLastMonth')}
                  </div>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-emerald-600">
                    ₹{(staffProductivity.reduce((sum, s) => sum + s.monthly_achieved, 0) / 100000).toFixed(1)}L
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{t('totalMonthlySales')}</div>
                  <div className="flex items-center justify-center gap-1 text-xs text-emerald-600 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    +12% {t('fromLastMonth')}
                  </div>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600">
                    {staffProductivity.reduce((sum, s) => sum + s.today_calls, 0)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{t('totalCallsToday')}</div>
                  <div className="flex items-center justify-center gap-1 text-xs text-amber-600 mt-1">
                    <TrendingDown className="h-3 w-3" />
                    -3% {t('fromYesterday')}
                  </div>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-amber-600">
                    {(staffProductivity.reduce((sum, s) => sum + s.rating, 0) / staffProductivity.length).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{t('avgTeamRating')}</div>
                  <div className="flex items-center justify-center gap-1 text-amber-500 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < 4 ? 'fill-current' : ''}`} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Performers */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  {t('topPerformersThisMonth')}
                </h4>
                <div className="flex flex-wrap gap-3">
                  {staffProductivity
                    .sort((a, b) => b.monthly_achieved - a.monthly_achieved)
                    .slice(0, 3)
                    .map((staff, index) => (
                      <div key={staff.id} className="flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-lg">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-700'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium">{staff.name}</span>
                        <span className="text-sm text-gray-600">₹{(staff.monthly_achieved ?? 0).toLocaleString()}</span>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Confirm Delete"
        description={`Are you sure you want to delete this ${deleteConfirm.type === 'followup' ? 'follow-up' : deleteConfirm.type}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, type: 'sale', id: '' })}
      />
    </div>
  );
};

export default SalesManagement;
