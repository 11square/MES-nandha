import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { beaconPost, consumePendingDraft } from '../lib/beaconPost';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { translations, Language } from '../translations';
import { PurchaseOrder } from '../types';
import { purchaseOrdersService } from '../services/purchaseOrders.service';
import { staffService } from '../services/staff.service';
import { vendorsService } from '../services/vendors.service';
import { stockService } from '../services/stock.service';
import { useSharedState } from '../contexts/SharedStateContext';
import {
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2,
  ShoppingCart,
  Package,
  Truck,
  Calendar,
  Building,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  FileText,
  Send,
  Check,
  ChevronsUpDown,
  IndianRupee
} from 'lucide-react';
import { validateFields, FieldError, blockInvalidNumberKeys, type ValidationErrors } from '../lib/validation';
import { ConfirmDialog } from './ui/confirm-dialog';

interface PurchaseOrderManagementProps {
  language?: Language;
}

interface PurchaseOrder {
  id: string;
  date: string;
  vendor_name: string;
  vendor_contact: string;
  vendor_email?: string;
  vendor_address?: string;
  items: any;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: 'draft' | 'pending' | 'approved' | 'ordered' | 'received' | 'cancelled';
  expected_delivery: string;
  created_by: string;
  notes?: string;
  is_gst?: boolean;
}

const PurchaseOrderManagement: React.FC<PurchaseOrderManagementProps> = ({ language = 'en' }) => {
  const t = (key: keyof typeof translations.en) => translations[language][key] || translations.en[key];
  const location = useLocation();
  const stockItem = (location.state as any)?.fromStock ? (location.state as any)?.item : null;
  
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  const refreshPOs = useCallback(async () => {
    try {
      const data = await purchaseOrdersService.getPurchaseOrders();
      const raw = Array.isArray(data) ? data : (data as any)?.items || [];
      setPurchaseOrders(raw);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const hasPending = consumePendingDraft('/purchase-orders');
    refreshPOs();
    if (hasPending) {
      const t1 = setTimeout(() => refreshPOs(), 800);
      const t2 = setTimeout(() => refreshPOs(), 2000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [refreshPOs]);

  const [showAddPO, setShowAddPO] = useState(false);
  const [showEditPO, setShowEditPO] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string }>({ open: false, id: '' });

  // Auto-open Add PO form when coming from Stock Management
  useEffect(() => {
    if (stockItem) {
      setShowAddPO(true);
      // Clear the location state so it doesn't re-trigger on re-render
      window.history.replaceState({}, document.title);
    }
  }, [stockItem]);

  // Calculate statistics
  const totalPOValue = purchaseOrders.reduce((sum, po) => sum + (Number(po.total_amount) || 0), 0);
  const pendingPOs = purchaseOrders.filter(po => po.status === 'pending' || po.status === 'draft').length;
  const orderedPOs = purchaseOrders.filter(po => po.status === 'ordered' || po.status === 'approved').length;
  const receivedPOs = purchaseOrders.filter(po => po.status === 'received').length;

  const handleAddPO = async (newPO: Omit<PurchaseOrder, 'id' | 'total_amount'>) => {
    try {
      const { gstNumber, addedItems, ...poPayload } = newPO as any;
      await purchaseOrdersService.createPurchaseOrder({
        ...poPayload,
        total_amount: poPayload.quantity * poPayload.unit_price,
        vendor_gst: poPayload.vendor_gst || gstNumber || '',
        is_gst: poPayload.is_gst ?? !!gstNumber,
      });
      toast.success((newPO as any).status === 'draft' ? 'Purchase order saved as draft!' : 'Purchase order created successfully');
      await refreshPOs();
      setShowAddPO(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create purchase order');
    }
  };

  const handleUpdatePO = async (updatedPO: PurchaseOrder) => {
    try {
      const { id, quantity, unit_price, gstNumber, ...rest } = updatedPO as any;
      const payload = {
        ...rest,
        vendor_gst: rest.vendor_gst || gstNumber || '',
        is_gst: rest.is_gst ?? !!gstNumber,
      };
      await purchaseOrdersService.updatePurchaseOrder(id, payload);
      toast.success('Purchase order updated successfully');
      await refreshPOs();
      setShowEditPO(false);
      setEditingPO(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update purchase order');
    }
  };

  const handleEditPO = (po: PurchaseOrder) => {
    setEditingPO(po);
    setShowEditPO(true);
  };

  const handleDeletePO = async (id: string) => {
    setConfirmDelete({ open: true, id });
  };

  const confirmDeletePO = async () => {
    try {
      await purchaseOrdersService.deletePurchaseOrder(confirmDelete.id);
      toast.success('Purchase order deleted successfully');
      await refreshPOs();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete purchase order');
    } finally {
      setConfirmDelete({ open: false, id: '' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received':
      case 'complete':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'approved':
      case 'ordered':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pending':
      case 'partial':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'draft':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'cancelled':
      case 'damaged':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received':
      case 'complete':
        return <CheckCircle className="w-3 h-3" />;
      case 'approved':
      case 'ordered':
        return <Send className="w-3 h-3" />;
      case 'pending':
      case 'partial':
        return <Clock className="w-3 h-3" />;
      case 'draft':
        return <FileText className="w-3 h-3" />;
      case 'cancelled':
      case 'damaged':
        return <XCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  // If showing add PO page, render it instead of the main view
  if (showAddPO) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowAddPO(false)}>
            ← {t('back')}
          </Button>
          <h1 className="text-xl font-bold">{t('createNewPurchaseOrder')}</h1>
        </div>
        <AddPOForm onClose={() => setShowAddPO(false)} onSubmit={handleAddPO} language={language} stockItem={stockItem} />
      </div>
    );
  }

  // If showing edit PO page, render it instead of the main view
  if (showEditPO && editingPO) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => { setShowEditPO(false); setEditingPO(null); }}>
            ← {t('back')}
          </Button>
          <div>
            <h1 className="text-xl font-bold">{t('editPurchaseOrder')}</h1>
            <p className="text-xs text-gray-500">{editingPO.id}</p>
          </div>
        </div>
        <EditPOForm 
          po={editingPO} 
          language={language}
          onClose={() => {
            setShowEditPO(false);
            setEditingPO(null);
          }}
          onSubmit={handleUpdatePO}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{t('purchaseOrderManagement')}</h1>
          <p className="text-muted-foreground">{t('managePurchaseOrders')}</p>
        </div>
        
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">{t('totalPOValue')}</span>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">₹{totalPOValue.toLocaleString()}</p>
          <p className="text-xs text-slate-600 mt-1">{t('allPurchaseOrders')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">{t('pendingApproval')}</span>
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">{pendingPOs}</p>
          <p className="text-xs text-amber-600 mt-1">{t('awaitingApproval')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">{t('inProgress')}</span>
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-violet-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">{orderedPOs}</p>
          <p className="text-xs text-slate-600 mt-1">{t('approvedordered')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">{t('received')}</span>
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">{receivedPOs}</p>
          <p className="text-xs text-emerald-600 mt-1">{t('completedOrders')}</p>
        </motion.div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input 
            placeholder={t('searchByPoVendorOrItem')}
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatus')}</SelectItem>
            <SelectItem value="draft">{t('draft')}</SelectItem>
            <SelectItem value="pending">{t('pending')}</SelectItem>
            <SelectItem value="approved">{t('approved')}</SelectItem>
            <SelectItem value="ordered">{t('ordered')}</SelectItem>
            <SelectItem value="received">{t('received')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="gst" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList className="grid w-full max-w-lg grid-cols-2">
            <TabsTrigger value="gst">{t('invoice')}</TabsTrigger>
            <TabsTrigger value="non-gst">{t('quotationBill')}</TabsTrigger>
          </TabsList>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowAddPO(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('createPO')}
          </Button>
        </div>
        {/* Invoice Tab */}
        <TabsContent value="gst" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('invoicePurchaseOrders')} ({purchaseOrders.filter(po => po.is_gst).length})</CardTitle>
            </CardHeader>
            <CardContent>
              {purchaseOrders.filter(po => po.is_gst).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {t('noInvoicePurchaseOrdersYetClickCreatePoToGetStarted')}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Expected Delivery</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.filter(po => po.is_gst).map((po) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-medium">{po.id}</TableCell>
                        <TableCell>{new Date(po.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{po.vendor_name}</div>
                            <div className="text-xs text-gray-500">{po.vendor_contact}</div>
                          </div>
                        </TableCell>
                        <TableCell>{Array.isArray(po.items) ? po.items.map((item: any) => item.name).join(', ') : po.items}</TableCell>
                        <TableCell>{Array.isArray(po.items) ? po.items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) : (po.quantity || 0)}</TableCell>
                        <TableCell className="font-semibold">₹{(po.total_amount ?? 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-gray-500" />
                            {new Date(po.expected_delivery).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(po.status)} flex items-center gap-1 w-fit`}>
                            {getStatusIcon(po.status)}
                            {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditPO(po)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeletePO(po.id)}
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

        {/* Quotation Bill Tab */}
        <TabsContent value="non-gst" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('quotationBillPurchaseOrders')} ({purchaseOrders.filter(po => !po.is_gst).length})</CardTitle>
            </CardHeader>
            <CardContent>
              {purchaseOrders.filter(po => !po.is_gst).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {t('noQuotationBillPurchaseOrdersYetClickCreatePoToGetStarted')}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Expected Delivery</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.filter(po => !po.is_gst).map((po) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-medium">{po.id}</TableCell>
                        <TableCell>{new Date(po.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{po.vendor_name}</div>
                            <div className="text-xs text-gray-500">{po.vendor_contact}</div>
                          </div>
                        </TableCell>
                        <TableCell>{Array.isArray(po.items) ? po.items.map((item: any) => item.name).join(', ') : po.items}</TableCell>
                        <TableCell>{Array.isArray(po.items) ? po.items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) : (po.quantity || 0)}</TableCell>
                        <TableCell className="font-semibold">₹{(po.total_amount ?? 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-gray-500" />
                            {new Date(po.expected_delivery).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(po.status)} flex items-center gap-1 w-fit`}>
                            {getStatusIcon(po.status)}
                            {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditPO(po)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeletePO(po.id)}
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
        open={confirmDelete.open}
        title="Delete Purchase Order"
        description="Are you sure you want to delete this purchase order? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeletePO}
        onCancel={() => setConfirmDelete({ open: false, id: '' })}
      />
    </div>
  );
};

// Add PO Form Component - Full page like Create Order
function AddPOForm({ onClose, onSubmit, language = 'en', stockItem }: { onClose: () => void; onSubmit: (po: PurchaseOrder) => void; language?: string; stockItem?: any }) {
  const t = (key: keyof typeof translations.en) => translations[language]?.[key] || translations.en[key];
  const savingAsDraftRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vendor_name: '',
    vendor_contact: '',
    vendor_email: '',
    vendor_address: '',
    status: 'draft' as const,
    expected_delivery: '',
    created_by: '',
    notes: '',
    gstNumber: '',
    add_to_stock: false,
  });

  const [gstNumber, setGstNumber] = useState('');
  const [gstError, setGstError] = useState('');

  const validateGstNumber = (value: string): string => {
    if (!value) return '';
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (value.length !== 15) return 'GST number must be 15 characters';
    if (!gstRegex.test(value.toUpperCase())) return 'Invalid GST format (e.g. 22AAAAA0000A1Z5)';
    return '';
  };

  // Vendor search state
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  // Use shared state for categories and products (same data as ProductManagement)
  const { productCategories: sharedCategories, products: sharedProducts } = useSharedState();

  // Fetch stock items from the stock_items table
  const [stockItems, setStockItems] = useState<any[]>([]);
  useEffect(() => {
    stockService.getStockItems().then(data => {
      const items = Array.isArray(data) ? data : (data as any)?.items || [];
      setStockItems(items);
    }).catch(() => {});
  }, []);

  // Merge shared products + stock items into a single allItems array, enriching products with stock data
  const allItems = useMemo(() => {
    // Build a lookup of stock items by lowercase name
    const stockMap = new Map<string, any>();
    stockItems.forEach((s: any) => {
      stockMap.set((s.name || '').toLowerCase(), s);
    });
    // Enrich products with stock data where product has 0 values
    const merged: any[] = sharedProducts.map((p: any) => {
      const stockMatch = stockMap.get((p.name || '').toLowerCase());
      if (stockMatch) {
        return {
          ...p,
          base_price: (Number(p.base_price) || 0) > 0 ? Number(p.base_price) : (Number(stockMatch.buying_price) || Number(stockMatch.unit_price) || 0),
          selling_price: (Number(p.selling_price) || 0) > 0 ? Number(p.selling_price) : (Number(stockMatch.selling_price) || Number(stockMatch.unit_price) || 0),
          unit_price: (Number(p.unit_price) || 0) > 0 ? Number(p.unit_price) : (Number(stockMatch.selling_price) || Number(stockMatch.unit_price) || 0),
          unit: p.unit || stockMatch.unit || 'pcs',
        };
      }
      return p;
    });
    // Add stock items that don't exist in products
    const existingNames = new Set(merged.map((p: any) => (p.name || '').toLowerCase()));
    stockItems.forEach((s: any) => {
      if (!existingNames.has((s.name || '').toLowerCase())) {
        merged.push({
          id: `STOCK-${s.id}`,
          name: s.name,
          category: s.category,
          subcategory: s.subcategory || 'General',
          base_price: Number(s.buying_price) || Number(s.unit_price) || 0,
          selling_price: Number(s.selling_price) || Number(s.unit_price) || 0,
          unit_price: Number(s.selling_price) || Number(s.unit_price) || 0,
        });
        existingNames.add((s.name || '').toLowerCase());
      }
    });
    // Also inject single stockItem from Stock Management redirect
    if (stockItem && !existingNames.has((stockItem.name || '').toLowerCase())) {
      merged.push({
        id: `STOCK-${stockItem.sku || Date.now()}`,
        name: stockItem.name,
        category: stockItem.category,
        subcategory: stockItem.subcategory || 'General',
        base_price: Number(stockItem.buying_price) || Number(stockItem.unit_price) || 0,
        selling_price: Number(stockItem.selling_price) || Number(stockItem.unit_price) || 0,
        unit_price: Number(stockItem.selling_price) || Number(stockItem.unit_price) || 0,
      });
    }
    return merged;
  }, [sharedProducts, stockItems, stockItem]);

  // Build categories from shared categories + all items
  const productCategories = useMemo(() => {
    const catMap = new Map<string, { name: string; subcategories: Set<string> }>();
    // Seed from shared categories
    sharedCategories.forEach(c => {
      catMap.set(c.id, { name: c.name, subcategories: new Set(c.subcategories) });
    });
    // Derive categories from all items (products + stock items)
    allItems.forEach((p: any) => {
      if (p.category) {
        const catId = p.category.toLowerCase().replace(/\s+/g, '-');
        if (!catMap.has(catId)) {
          catMap.set(catId, { name: p.category, subcategories: new Set() });
        }
        if (p.subcategory) {
          catMap.get(catId)!.subcategories.add(p.subcategory);
        }
      }
    });
    return Array.from(catMap.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      subcategories: Array.from(data.subcategories),
    }));
  }, [sharedCategories, allItems]);

  // Build product items lookup from all items (keyed by category id -> subcategory -> products)
  const injectedProductItems = useMemo(() => {
    const result: { [key: string]: { [key: string]: { id: string; name: string; unitPrice: number }[] } } = {};
    allItems.forEach((p: any) => {
      const catId = (p.category || 'other').toLowerCase().replace(/\s+/g, '-');
      const subcat = p.subcategory || 'General';
      if (!result[catId]) result[catId] = {};
      if (!result[catId][subcat]) result[catId][subcat] = [];
      const alreadyExists = result[catId][subcat].some((existing: any) => existing.name === p.name);
      if (!alreadyExists) {
        result[catId][subcat].push({
          id: String(p.id),
          name: p.name,
          unitPrice: Number(p.base_price || p.selling_price || p.unit_price) || 0,
        });
      }
    });
    return result;
  }, [allItems]);

  // New item state (search-based)
  const [newItem, setNewItem] = useState({
    category: '',
    subcategory: '',
    product: '',
    productName: '',
    quantity: 0,
    unitPrice: 0,
  });
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  // Added items list
  interface POItem {
    id: string;
    category: string;
    subcategory: string;
    product: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }
  const [addedItems, setAddedItems] = useState<POItem[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const getSubcategoriesByCategory = (categoryId: string) => {
    const category = productCategories.find(c => c.id === categoryId);
    return category ? category.subcategories : [];
  };

  const getProductsBySubcategory = (categoryId: string, subcategory: string) => {
    if (!categoryId || !subcategory) return [];
    return injectedProductItems[categoryId]?.[subcategory] || [];
  };

  const selectItemFromSearch = (item: any) => {
    const catId = (item.category || 'other').toLowerCase().replace(/\s+/g, '-');
    const unitPrice = Number(item.base_price || item.selling_price || item.unit_price || item.unitPrice) || 0;
    setNewItem({
      category: catId,
      subcategory: item.subcategory || 'General',
      product: String(item.id),
      productName: item.name,
      quantity: newItem.quantity || 1,
      unitPrice,
    });
    setItemSearchQuery(item.name);
    setShowItemDropdown(false);
  };

  const addItem = () => {
    if (!newItem.product || !newItem.productName) return;
    if (newItem.quantity < 1) return;

    const newPOItem: POItem = {
      id: `item-${Date.now()}`,
      category: newItem.category,
      subcategory: newItem.subcategory,
      product: newItem.product,
      productName: newItem.productName,
      quantity: newItem.quantity,
      unitPrice: newItem.unitPrice,
      total: newItem.quantity * newItem.unitPrice,
    };

    setAddedItems([...addedItems, newPOItem]);
    setNewItem({ category: '', subcategory: '', product: '', productName: '', quantity: 0, unitPrice: 0 });
    setItemSearchQuery('');
    setErrors(prev => { const {items: _, ...rest} = prev; return rest; });
  };

  const removeItem = (id: string) => {
    setAddedItems(addedItems.filter(item => item.id !== id));
  };

  const getTotalAmount = () => {
    return addedItems.reduce((sum, item) => sum + item.total, 0);
  };

  // Vendors and staff data fetched from API
  const [vendors, setVendors] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  useEffect(() => {
    vendorsService.getVendors().then(data => {
      const items = Array.isArray(data) ? data : (data as any)?.items || [];
      setVendors(items);
    }).catch(() => {});
    staffService.getStaff().then(data => {
      const items = Array.isArray(data) ? data : (data as any)?.items || [];
      setStaffMembers(items);
    }).catch(() => {});
  }, []);

  // Pre-fill item from Stock Management if stockItem is provided
  useEffect(() => {
    if (stockItem) {
      // Map stock category name to PO category id
      const categoryMap: Record<string, string> = {
        'Accessories': 'accessories',
        'Hardware': 'hardware',
        'Maintenance': 'raw-materials',
        'Packaging': 'packaging',
        'Raw Materials': 'raw-materials',
      };
      const matchedCategoryId = categoryMap[stockItem.category] || stockItem.category?.toLowerCase()?.replace(/\s+/g, '-') || 'accessories';
      const subcat = stockItem.subcategory || 'General';
      const stockProductId = `STOCK-${stockItem.sku || Date.now()}`;
      const reorderQty = Math.max(1, Number(stockItem.reorder_level) - Number(stockItem.current_stock));
      const unitPrice = Number(stockItem.unit_price) || 0;

      // Pre-select the stock item
      setNewItem({
        category: matchedCategoryId,
        subcategory: subcat,
        product: stockProductId,
        productName: stockItem.name || '',
        quantity: reorderQty,
        unitPrice: unitPrice,
      });
      setItemSearchQuery(stockItem.name || '');

      // Also pre-fill the vendor if supplier info is available
      if (stockItem.supplier && vendors.length > 0) {
        const matchedVendor = vendors.find(
          v => (v.name || '').toLowerCase() === (stockItem.supplier || '').toLowerCase()
        );
        if (matchedVendor) {
          setSelectedVendorId(matchedVendor.id);
          setFormData(prev => ({
            ...prev,
            vendor_name: matchedVendor.name,
            vendor_contact: matchedVendor.phone || '',
            vendor_email: matchedVendor.email || '',
            vendor_address: matchedVendor.address || '',
          }));
        }
      }
    }
  }, [stockItem, vendors]);

  const filteredVendors = vendors.filter(vendor =>
    (vendor.name || '').toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
    (vendor.contactPerson || vendor.contact_person || '').toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
    (vendor.category || '').toLowerCase().includes(vendorSearchQuery.toLowerCase())
  );

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  const filteredStaff = staffMembers.filter(staff =>
    (staff.name || '').toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
    staff.role.toLowerCase().includes(staffSearchQuery.toLowerCase())
  );

  const selectedStaffMember = staffMembers.find(s => s.id === formData.created_by || s.name === formData.created_by);

  const handleVendorSelect = (vendor: typeof vendors[0]) => {
    setSelectedVendorId(vendor.id);
    setFormData({
      ...formData,
      vendor_name: vendor.name,
      vendor_contact: vendor.phone,
      vendor_email: vendor.email,
      vendor_address: vendor.address,
    });
    setGstNumber(vendor.gst_number || '');
    setGstError('');
    setShowVendorDropdown(false);
    setVendorSearchQuery('');
    setErrors(prev => { const {vendor: _, ...rest} = prev; return rest; });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isDraft = savingAsDraftRef.current;
    savingAsDraftRef.current = false;
    const validationErrors: ValidationErrors = {};
    if (!selectedVendorId) validationErrors.vendor = 'Vendor is required';
    if (!isDraft) {
      if (!formData.date) validationErrors.date = 'Date is required';
      if (!formData.expected_delivery) validationErrors.expected_delivery = 'Expected Delivery is required';
      if (!formData.status) validationErrors.status = 'Status is required';
      if (addedItems.length === 0) validationErrors.items = 'At least one item with product and quantity is required';
    }
    if (Object.keys(validationErrors).length) { setErrors(validationErrors); return; }
    setErrors({});
    const totalAmount = getTotalAmount();
    const itemsArray = addedItems.map((item, index) => ({
      id: index + 1,
      name: item.productName,
      quantity: item.quantity,
      unit: item.subcategory || 'pcs',
      rate: item.unitPrice,
      amount: item.total,
    }));
    onSubmit({
      ...formData,
      status: isDraft ? 'draft' : (formData.status || 'pending'),
      items: itemsArray,
      quantity: addedItems.reduce((sum, item) => sum + item.quantity, 0),
      unit_price: addedItems.length > 0 ? Math.round(totalAmount / addedItems.reduce((sum, item) => sum + item.quantity, 0)) : 0,
      total_amount: totalAmount,
      created_by: selectedStaffMember?.name || formData.created_by,
      addedItems: addedItems,
      vendor_gst: gstNumber || '',
      is_gst: !!gstNumber,
    });
    formSubmittedRef.current = true;
  };

  const formSubmittedRef = useRef(false);
  const draftPayloadRef = useRef<any>(null);

  // Sync draft payload ref on every render (synchronous — never stale on unmount)
  if (selectedVendorId) {
    const totalAmount = getTotalAmount();
    const totalQty = addedItems.reduce((sum, item) => sum + item.quantity, 0);
    draftPayloadRef.current = {
      ...formData,
      status: 'draft',
      items: addedItems.map((item, index) => ({
        id: index + 1,
        name: item.productName,
        quantity: item.quantity,
        unit: item.subcategory || 'pcs',
        rate: item.unitPrice,
        amount: item.total,
      })),
      quantity: totalQty,
      unit_price: totalQty > 0 ? Math.round(totalAmount / totalQty) : 0,
      total_amount: totalAmount,
      created_by: selectedStaffMember?.name || formData.created_by,
      vendor_gst: gstNumber || '',
      is_gst: !!gstNumber,
    };
  } else {
    draftPayloadRef.current = null;
  }

  // Auto-save as draft on unmount (navigation away)
  useEffect(() => {
    return () => {
      if (!formSubmittedRef.current && draftPayloadRef.current) {
        beaconPost('/purchase-orders', draftPayloadRef.current);
      }
    };
  }, []);

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      {/* PO Details + Vendor Info - Compact Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Left: PO Details */}
        <Card className="shadow-sm">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-4 h-4" /> PO Details
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              <div>
                <Label className="text-xs text-gray-500">{t('date')} *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => { setFormData({ ...formData, date: e.target.value }); setErrors(prev => { const {date: _, ...rest} = prev; return rest; }); }}
                  className="h-8 text-sm"
                />
                {errors.date && <FieldError message={errors.date} />}
              </div>
              <div>
                <Label className="text-xs text-gray-500">{t('expectedDelivery')} *</Label>
                <Input
                  type="date"
                  value={formData.expected_delivery}
                  onChange={(e) => { setFormData({ ...formData, expected_delivery: e.target.value }); setErrors(prev => { const {expected_delivery: _, ...rest} = prev; return rest; }); }}
                  className="h-8 text-sm"
                />
                {errors.expected_delivery && <FieldError message={errors.expected_delivery} />}
              </div>
              <div>
                <Label className="text-xs text-gray-500">{t('gstNumber')}</Label>
                <Input
                  value={gstNumber}
                  onChange={(e) => { const val = e.target.value.toUpperCase(); setGstNumber(val); setGstError(val ? validateGstNumber(val) : ''); }}
                  placeholder="e.g. 33AUJPM8458P1ZR"
                  maxLength={15}
                  className={`h-8 text-sm font-mono${gstError ? ' border-red-500' : ''}`}
                />
                {gstError && <p className="text-xs text-red-500">{gstError}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: Vendor Info */}
        <Card className="shadow-sm">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <Building className="w-4 h-4" /> Vendor Info
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-gray-500">{t('vendor')} *</Label>
                <div className="relative">
                  <div
                    tabIndex={0}
                    role="combobox"
                    aria-expanded={showVendorDropdown}
                    className="w-full h-8 px-2 border border-gray-300 rounded-md cursor-pointer flex items-center justify-between bg-white text-xs"
                    onClick={() => setShowVendorDropdown(!showVendorDropdown)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowVendorDropdown(!showVendorDropdown); } }}
                  >
                    <span className={selectedVendor ? 'text-gray-900' : 'text-gray-500'}>
                      {selectedVendor ? selectedVendor.name : (t('selectVendor'))}
                    </span>
                    <ChevronsUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                  {showVendorDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-72 overflow-hidden">
                      <div className="p-2 border-b">
                        <div className="relative">
                          <Search className="w-3 h-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <Input
                            placeholder={t('searchVendor')}
                            value={vendorSearchQuery}
                            onChange={(e) => setVendorSearchQuery(e.target.value)}
                            className="pl-7 h-7 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div className="max-h-56 overflow-y-auto">
                        {filteredVendors.length === 0 ? (
                          <div className="p-2 text-xs text-gray-500 text-center">
                            {t('noVendorFound')}
                          </div>
                        ) : (
                          filteredVendors.map(vendor => (
                            <div
                              key={vendor.id}
                              className={`px-3 py-1.5 cursor-pointer hover:bg-blue-50 flex items-center justify-between ${selectedVendorId === vendor.id ? 'bg-blue-50' : ''}`}
                              onClick={() => handleVendorSelect(vendor)}
                            >
                              <div>
                                <div className="text-sm font-medium text-gray-900">{vendor.name}</div>
                                <div className="text-[10px] text-gray-500">{vendor.contactPerson} • {vendor.category}</div>
                              </div>
                              {selectedVendorId === vendor.id && (
                                <Check className="w-3 h-3 text-blue-600" />
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {errors.vendor && <FieldError message={errors.vendor} />}
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <div>
                  <Label className="text-xs text-gray-500">{t('vendorContact')}</Label>
                  <Input
                    value={formData.vendor_contact}
                    onChange={(e) => setFormData({ ...formData, vendor_contact: e.target.value })}
                    placeholder="+91 XXXXX XXXXX"
                    className="h-8 text-sm bg-gray-50"
                    readOnly
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">{t('vendorEmail')}</Label>
                  <Input
                    type="email"
                    value={formData.vendor_email}
                    onChange={(e) => setFormData({ ...formData, vendor_email: e.target.value })}
                    placeholder="vendor@example.com"
                    className="h-8 text-sm bg-gray-50"
                    readOnly
                  />
                </div>
              </div>
              {/* Selected vendor info display */}
              {selectedVendor && (
                <div className="bg-gray-50 rounded-md p-2 text-xs text-gray-600 border">
                  <p className="font-semibold text-gray-800">{selectedVendor.name}</p>
                  {formData.vendor_contact && <p className="mt-0.5">{formData.vendor_contact}</p>}
                  {formData.vendor_email && <p className="mt-0.5">{formData.vendor_email}</p>}
                  {gstNumber && <p className="mt-0.5 font-mono text-gray-500">GSTIN: {gstNumber}</p>}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Section */}
      <Card className={`shadow-sm mb-4 overflow-visible ${errors.items ? 'border-red-400' : ''}`}>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <Package className="w-4 h-4" /> {t('items')} *
            </CardTitle>
            <Badge variant="outline" className="text-xs text-gray-500">
              {addedItems.length} {addedItems.length === 1 ? 'item' : 'items'} added
            </Badge>
          </div>
          {errors.items && <p className="text-sm text-red-500 mt-1">{errors.items}</p>}
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {/* Item Entry - Compact Table Style */}
          <div className="overflow-visible">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-[10px] font-semibold text-gray-500 uppercase py-1 pr-2 w-[30%]">{t('item')} *</th>
                  <th className="text-left text-[10px] font-semibold text-gray-500 uppercase py-1 pr-2 w-[18%]">Category</th>
                  <th className="text-center text-[10px] font-semibold text-gray-500 uppercase py-1 pr-2 w-[12%]">{t('quantity')} *</th>
                  <th className="text-right text-[10px] font-semibold text-gray-500 uppercase py-1 pr-2 w-[14%]">{t('unitPrice')}</th>
                  <th className="text-right text-[10px] font-semibold text-gray-500 uppercase py-1 pr-2 w-[14%]">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1 pr-2">
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Search item..."
                        value={itemSearchQuery}
                        onChange={(e) => {
                          setItemSearchQuery(e.target.value);
                          setNewItem({ ...newItem, product: '', productName: '', category: '', subcategory: '', unitPrice: 0 });
                          setShowItemDropdown(true);
                        }}
                        onFocus={() => setShowItemDropdown(true)}
                        onBlur={() => setTimeout(() => setShowItemDropdown(false), 300)}
                        className="h-7 text-xs"
                      />
                      {showItemDropdown && (
                        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                          {allItems
                            .filter((p: any) => (p.name || '').toLowerCase().includes(itemSearchQuery.toLowerCase()))
                            .length > 0 ? (
                            allItems
                              .filter((p: any) => (p.name || '').toLowerCase().includes(itemSearchQuery.toLowerCase()))
                              .map((item: any) => (
                                <div
                                  key={item.id}
                                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    selectItemFromSearch(item);
                                  }}
                                >
                                  <div className="font-medium text-xs">{item.name}</div>
                                  <div className="text-[10px] text-gray-500">{item.category}{item.subcategory ? ` > ${item.subcategory}` : ''} • ₹{Number(item.base_price || item.selling_price || item.unit_price || 0).toLocaleString()}</div>
                                </div>
                              ))
                          ) : (
                            <div className="px-2 py-1 text-center text-gray-500 text-xs">
                              No items found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-1 pr-2 text-xs text-gray-500">
                    {newItem.category ? (
                      <span className="truncate block">{productCategories.find(c => c.id === newItem.category)?.name || newItem.category}{newItem.subcategory ? ` > ${newItem.subcategory}` : ''}</span>
                    ) : '-'}
                  </td>
                  <td className="py-1 pr-2">
                    <Input
                      type="number"
                      min="0"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => {
                        blockInvalidNumberKeys(e);
                        if (e.key === 'Enter' && newItem.product && newItem.quantity > 0) { e.preventDefault(); addItem(); }
                      }}
                      className="h-7 text-xs text-center"
                    />
                  </td>
                  <td className="py-1 pr-2 text-right text-xs text-gray-600">
                    {newItem.product ? `₹${newItem.unitPrice.toLocaleString()}` : '-'}
                  </td>
                  <td className="py-1 text-right text-xs font-medium text-gray-700">
                    {newItem.product && newItem.quantity > 0 ? `₹${(newItem.unitPrice * newItem.quantity).toLocaleString()}` : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Add Item Button */}
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={addItem}
              disabled={!newItem.product || newItem.quantity < 1}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
            >
              <Plus className="w-3 h-3 mr-1" />
              {t('addItem')}
            </Button>
          </div>

          {/* Added Items Table - Invoice Style */}
          {addedItems.length > 0 && (
            <div className="mt-4 border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-semibold text-gray-600 w-8">#</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Item Name</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600 w-28">Category</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600 w-28">Subcategory</th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-600 w-14">Qty</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-600 w-24">Unit Price</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-600 w-24">Amount</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {addedItems.map((item, index) => {
                    const categoryName = productCategories.find(c => c.id === item.category)?.name || item.category;
                    return (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="py-1.5 px-2 text-gray-500">{index + 1}</td>
                        <td className="py-1.5 px-2 font-medium">{item.productName}</td>
                        <td className="py-1.5 px-2 text-gray-500">{categoryName}</td>
                        <td className="py-1.5 px-2 text-gray-500">{item.subcategory}</td>
                        <td className="py-1.5 px-2 text-center">{item.quantity}</td>
                        <td className="py-1.5 px-2 text-right">₹{item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="py-1.5 px-2 text-right font-bold">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="py-1.5 px-2">
                          <Button type="button" size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => removeItem(item.id)}>
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals Row */}
                  <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                    <td className="py-2 px-2"></td>
                    <td className="py-2 px-2">Total</td>
                    <td className="py-2 px-2"></td>
                    <td className="py-2 px-2"></td>
                    <td className="py-2 px-2 text-center">{addedItems.reduce((s, i) => s + i.quantity, 0)}</td>
                    <td className="py-2 px-2"></td>
                    <td className="py-2 px-2 text-right text-blue-700">₹{getTotalAmount().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Amount Summary */}
      {addedItems.length > 0 && (
        <Card className="shadow-sm mb-4">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <IndianRupee className="w-4 h-4" /> Amount Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="space-y-1.5 text-sm max-w-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Items</span>
                <span>{addedItems.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Quantity</span>
                <span>{addedItems.reduce((s, i) => s + i.quantity, 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t-2 border-gray-800 pt-2 mt-2">
                <span>Total Amount</span>
                <span className="text-blue-700">₹{getTotalAmount().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Address, Notes & Stock Option */}
      <Card className="shadow-sm mb-4">
        <CardContent className="px-4 py-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">{t('vendorAddress')}</Label>
              <textarea
                value={formData.vendor_address}
                onChange={(e) => setFormData({ ...formData, vendor_address: e.target.value })}
                placeholder={t('enterVendorAddress')}
                className="w-full h-16 px-3 py-2 border border-gray-300 rounded-md text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">{t('notes')}</Label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('additionalNotesOrComments')}
                className="w-full h-16 px-3 py-2 border border-gray-300 rounded-md text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add to Stock Option */}
      <div className="flex items-center justify-between px-4 py-3 bg-green-50 border border-green-200 rounded-lg mb-4">
        <div>
          <Label className="text-xs font-semibold text-green-800">{t('addToStock')}</Label>
          <p className="text-[10px] text-green-600 mt-0.5">{t('addToStockDescription')}</p>
        </div>
        <input
          type="checkbox"
          checked={formData.add_to_stock}
          onChange={(e) => setFormData({ ...formData, add_to_stock: e.target.checked })}
          className="w-4 h-4 accent-green-600 cursor-pointer"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => { formSubmittedRef.current = true; onClose(); }}>
          {t('cancel')}
        </Button>
        <Button type="button" variant="outline" size="sm" className="border-gray-400 text-gray-700 hover:bg-gray-50" onClick={() => { savingAsDraftRef.current = true; formRef.current?.requestSubmit(); }}>
          Save as Draft
        </Button>
        <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700">
          <ShoppingCart className="mr-1 h-3 w-3" />
          {t('createPO')}
        </Button>
      </div>
    </form>
  );
}

// Edit PO Form Component - Full page like Edit Order
function EditPOForm({ po, language = 'en', onClose, onSubmit }: { po: PurchaseOrder; language?: string; onClose: () => void; onSubmit: (po: PurchaseOrder) => void }) {
  const t = (key: keyof typeof translations.en) => translations[language]?.[key] || translations.en[key];
  // Vendors and staff data fetched from API
  const [vendors, setVendors] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  useEffect(() => {
    vendorsService.getVendors().then(data => {
      const items = Array.isArray(data) ? data : (data as any)?.items || [];
      setVendors(items);
    }).catch(() => {});
    staffService.getStaff().then(data => {
      const items = Array.isArray(data) ? data : (data as any)?.items || [];
      setStaffMembers(items);
    }).catch(() => {});
  }, []);

  // Preserve original items array for submission
  const [originalItems] = useState(() => Array.isArray(po.items) ? po.items : []);

  // Derive quantity, unit_price, and total_amount from items array when top-level values are missing
  const itemsArray = Array.isArray(po.items) ? po.items : [];
  const derivedQuantity = po.quantity || itemsArray.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);
  const derivedTotalAmount = po.total_amount || itemsArray.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
  const derivedUnitPrice = po.unit_price || (derivedQuantity > 0 ? Math.round(derivedTotalAmount / derivedQuantity) : 0);

  const [formData, setFormData] = useState({
    id: po.id,
    date: po.date,
    vendor_name: po.vendor_name,
    vendor_contact: po.vendor_contact,
    vendor_email: po.vendor_email || '',
    vendor_address: po.vendor_address || '',
    items: Array.isArray(po.items) ? po.items.map((item: any) => item.name).join(', ') : po.items,
    quantity: derivedQuantity,
    unit_price: derivedUnitPrice,
    total_amount: derivedTotalAmount,
    status: po.status,
    expected_delivery: po.expected_delivery,
    created_by: po.created_by,
    notes: po.notes || '',
    gstNumber: (po as any).gstNumber || '',
  });

  const [gstNumber, setGstNumber] = useState((po as any).gst_number || '');
  const [gstError, setGstError] = useState('');

  const validateGstNumber = (value: string): string => {
    if (!value) return '';
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (value.length !== 15) return 'GST number must be 15 characters';
    if (!gstRegex.test(value.toUpperCase())) return 'Invalid GST format (e.g. 22AAAAA0000A1Z5)';
    return '';
  };

  // Vendor search state
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Set initial vendor when vendors load from API
  useEffect(() => {
    if (vendors.length && po.vendor_name) {
      const match = vendors.find(v => v.name === po.vendor_name);
      if (match) setSelectedVendorId(match.id);
    }
  }, [vendors, po.vendor_name]);

  const filteredVendors = vendors.filter(vendor =>
    (vendor.name || '').toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
    (vendor.contactPerson || vendor.contact_person || '').toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
    (vendor.category || '').toLowerCase().includes(vendorSearchQuery.toLowerCase())
  );

  const selectedVendor = vendors.find(v => v.id === selectedVendorId) || (formData.vendor_name ? { name: formData.vendor_name } : null);

  const filteredStaff = staffMembers.filter(staff =>
    (staff.name || '').toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
    (staff.role || '').toLowerCase().includes(staffSearchQuery.toLowerCase())
  );

  const selectedStaffMember = staffMembers.find(s => s.id === formData.created_by || s.name === formData.created_by);

  const handleVendorSelect = (vendor: typeof vendors[0]) => {
    setSelectedVendorId(vendor.id);
    setFormData({
      ...formData,
      vendor_name: vendor.name,
      vendor_contact: vendor.phone,
      vendor_email: vendor.email,
      vendor_address: vendor.address,
    });
    setGstNumber(vendor.gst_number || '');
    setGstError('');
    setShowVendorDropdown(false);
    setVendorSearchQuery('');
    setErrors(prev => { const {vendor: _, ...rest} = prev; return rest; });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors: ValidationErrors = {};
    if (!selectedVendorId && !formData.vendor_name) validationErrors.vendor = 'Vendor is required';
    if (!formData.date) validationErrors.date = 'Date is required';
    if (!formData.expected_delivery) validationErrors.expected_delivery = 'Expected Delivery is required';
    if (!formData.status) validationErrors.status = 'Status is required';
    if (!formData.items || !formData.items.trim()) validationErrors.items = 'Item description is required';
    if (!formData.quantity || formData.quantity <= 0) validationErrors.quantity = 'Quantity must be greater than 0';
    if (!formData.unit_price || formData.unit_price <= 0) validationErrors.unit_price = 'Unit Price must be greater than 0';
    if (Object.keys(validationErrors).length) { setErrors(validationErrors); return; }
    setErrors({});

    // Rebuild items array with correct backend field names (name, quantity, unit, rate, amount)
    let updatedItems: any[];
    if (originalItems.length > 0) {
      if (originalItems.length === 1) {
        // Single item: update its quantity, rate and amount directly
        updatedItems = [{
          name: originalItems[0].name,
          quantity: formData.quantity,
          unit: originalItems[0].unit || 'pcs',
          rate: formData.unit_price,
          amount: formData.quantity * formData.unit_price,
        }];
      } else {
        // Multiple items: keep each item's name but update rate; distribute total quantity
        const totalOrigQty = originalItems.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);
        updatedItems = originalItems.map((item: any) => {
          const proportion = totalOrigQty > 0 ? (Number(item.quantity) || 0) / totalOrigQty : 1 / originalItems.length;
          const newQty = Math.max(1, Math.round(formData.quantity * proportion));
          return {
            name: item.name,
            quantity: newQty,
            unit: item.unit || 'pcs',
            rate: formData.unit_price,
            amount: newQty * formData.unit_price,
          };
        });
      }
    } else {
      // No original items array — create from text input
      const itemNames = typeof formData.items === 'string'
        ? formData.items.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [String(formData.items)];
      updatedItems = itemNames.map((name: string) => ({
        name,
        quantity: formData.quantity,
        unit: 'pcs',
        rate: formData.unit_price,
        amount: formData.quantity * formData.unit_price,
      }));
    }

    const newTotal = updatedItems.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);

    onSubmit({
      ...formData,
      items: updatedItems,
      quantity: formData.quantity,
      unit_price: formData.unit_price,
      total_amount: newTotal,
      vendor_gst: gstNumber || '',
      is_gst: !!gstNumber,
      created_by: selectedStaffMember?.name || formData.created_by,
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4 py-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('vendor')} *</Label>
            <div className="relative">
              <div
                tabIndex={0}
                role="combobox"
                aria-expanded={showVendorDropdown}
                className="w-full px-3 py-2 border border-gray-300 rounded-md cursor-pointer flex items-center justify-between bg-white"
                onClick={() => setShowVendorDropdown(!showVendorDropdown)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowVendorDropdown(!showVendorDropdown); } }}
              >
                <span className={selectedVendor ? 'text-gray-900' : 'text-gray-500'}>
                  {selectedVendor ? selectedVendor.name : (t('selectVendor'))}
                </span>
                <ChevronsUpDown className="w-4 h-4 text-gray-400" />
              </div>
              {showVendorDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-72 overflow-hidden">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder={t('searchVendor')}
                        value={vendorSearchQuery}
                        onChange={(e) => setVendorSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {filteredVendors.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500 text-center">
                        {t('noVendorFound')}
                      </div>
                    ) : (
                      filteredVendors.map(vendor => (
                        <div
                          key={vendor.id}
                          className={`px-3 py-2 cursor-pointer hover:bg-blue-50 flex items-center justify-between ${selectedVendorId === vendor.id ? 'bg-blue-50' : ''}`}
                          onClick={() => handleVendorSelect(vendor)}
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">{vendor.name}</p>
                            <p className="text-xs text-gray-500">{vendor.contactPerson} • {vendor.category}</p>
                          </div>
                          {selectedVendorId === vendor.id && (
                            <Check className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {errors.vendor && <FieldError message={errors.vendor} />}
          </div>

          <div className="space-y-2">
            <Label>{t('gstNumber')}</Label>
            <Input
              value={gstNumber}
              onChange={(e) => { const val = e.target.value.toUpperCase(); setGstNumber(val); setGstError(val ? validateGstNumber(val) : ''); }}
              placeholder={t('enterGstNumber')}
              maxLength={15}
              className={`border border-gray-300${gstError ? ' border-red-500' : ''}`}
            />
            {gstError && <p className="text-xs text-red-500">{gstError}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('vendorContact')}</Label>
            <Input 
              value={formData.vendor_contact}
              onChange={(e) => setFormData({ ...formData, vendor_contact: e.target.value })}
              placeholder="+91 XXXXX XXXXX" 
              className="border border-gray-300 bg-gray-50" 
              readOnly
            />
          </div>

          <div className="space-y-2">
            <Label>{t('vendorEmail')}</Label>
            <Input 
              type="email"
              value={formData.vendor_email}
              onChange={(e) => setFormData({ ...formData, vendor_email: e.target.value })}
              placeholder="vendor@example.com" 
              className="border border-gray-300 bg-gray-50" 
              readOnly
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('date')} *</Label>
            <Input 
              type="date"
              value={formData.date}
              onChange={(e) => { setFormData({ ...formData, date: e.target.value }); setErrors(prev => { const {date: _, ...rest} = prev; return rest; }); }}
              className="border border-gray-300" 
            />
            {errors.date && <FieldError message={errors.date} />}
          </div>

          <div className="space-y-2">
            <Label>{t('expectedDelivery')} *</Label>
            <Input 
              type="date"
              value={formData.expected_delivery}
              onChange={(e) => { setFormData({ ...formData, expected_delivery: e.target.value }); setErrors(prev => { const {expected_delivery: _, ...rest} = prev; return rest; }); }}
              className="border border-gray-300" 
            />
            {errors.expected_delivery && <FieldError message={errors.expected_delivery} />}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('status')} *</Label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.status}
              onChange={(e) => { setFormData({ ...formData, status: e.target.value as any }); setErrors(prev => { const {status: _, ...rest} = prev; return rest; }); }}
            >
              <option value="draft">{t('draft')}</option>
              <option value="pending">{t('pendingApproval')}</option>
              <option value="approved">{t('approved')}</option>
              <option value="ordered">{t('ordered')}</option>
              <option value="received">{t('received')}</option>
              <option value="cancelled">{t('cancelled')}</option>
            </select>
            {errors.status && <FieldError message={errors.status} />}
          </div>
        </div>

        {/* Items Section */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">{t('items')} *</Label>
          <Card className="p-4">
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label>{t('itemDescription')} *</Label>
                <Input 
                  value={formData.items}
                  onChange={(e) => { setFormData({ ...formData, items: e.target.value }); setErrors(prev => { const {items: _, ...rest} = prev; return rest; }); }}
                  placeholder={t('eg95mmMdfSheet')} 
                  className="border border-gray-300" 
                />
                {errors.items && <FieldError message={errors.items} />}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>{t('quantity')} *</Label>
                  <Input 
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => { setFormData({ ...formData, quantity: Number(e.target.value) }); setErrors(prev => { const {quantity: _, ...rest} = prev; return rest; }); }}
                    onKeyDown={blockInvalidNumberKeys}
                    className="border border-gray-300" 
                  />
                  {errors.quantity && <FieldError message={errors.quantity} />}
                </div>

                <div className="space-y-2">
                  <Label>{t('unitPrice')} *</Label>
                  <Input 
                    type="number"
                    min="0"
                    value={formData.unit_price}
                    onChange={(e) => { setFormData({ ...formData, unit_price: Number(e.target.value) }); setErrors(prev => { const {unit_price: _, ...rest} = prev; return rest; }); }}
                    onKeyDown={blockInvalidNumberKeys}
                    className="border border-gray-300" 
                  />
                  {errors.unit_price && <FieldError message={errors.unit_price} />}
                </div>

                <div className="space-y-2">
                  <Label>{t('totalAmount')}</Label>
                  <Input 
                    value={`₹${(formData.quantity * formData.unit_price).toLocaleString()}`}
                    disabled
                    className="border border-gray-300 bg-gray-50" 
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('vendorAddress')}</Label>
            <Textarea 
              value={formData.vendor_address}
              onChange={(e) => setFormData({ ...formData, vendor_address: e.target.value })}
              placeholder={t('enterVendorAddress')} 
              className="border border-gray-300" 
            />
          </div>
          <div className="space-y-2">
            <Label>{t('notes')}</Label>
            <Textarea 
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t('additionalNotesOrComments')} 
              className="border border-gray-300" 
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          {t('updatePo')}
        </Button>
      </div>
    </form>
  );
}

export default PurchaseOrderManagement;
