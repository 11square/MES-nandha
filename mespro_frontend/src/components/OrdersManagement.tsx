import { toast } from 'sonner';
import { useState, useEffect, useMemo, useRef } from 'react';
import { saveDraft, loadDraft, clearDraft } from '../lib/draftStorage';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { validateFields, FieldError, blockInvalidNumberKeys, type ValidationErrors } from '../lib/validation';
import { useI18n } from '../contexts/I18nContext';
import { Language } from '../translations';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Order, OrderForBilling, OrderProduct, Product, ProductCategory, TimelineItem } from '../types';
import { ordersService } from '../services/orders.service';
import { stockService } from '../services/stock.service';
import { clientsService } from '../services/clients.service';
import { getCustomerType } from '../lib/utils';
import { getStateFromGST, getDistrictsForState, getAllStates } from '../lib/gstUtils';
import {
  Plus, 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Edit,
  Package,
  ArrowRight,
  FileText,
  Receipt,
  Check,
  ChevronsUpDown,
  Trash2,
  Building,
  IndianRupee,
  CheckCircle,
  Users
} from 'lucide-react';

const toDateInputValue = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeLookupValue = (value: any): string =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const getEffectiveProductRate = (productInfo: any, fallback = 0): number => {
  if (!productInfo) return Number(fallback) || 0;
  return Number(productInfo.selling_price)
    || Number(productInfo.unit_price)
    || Number(productInfo.base_price)
    || Number(fallback)
    || 0;
};



interface OrdersManagementProps {
  onNavigate: (view: string) => void;
  onSendToBill?: (orderData: OrderForBilling, billType?: 'invoice' | 'quotation') => void;
  onSendToProduction?: (orderData: OrderForBilling) => void;
  productCategories?: ProductCategory[];
  products?: Product[];
  leadForOrder?: Record<string, any> | null;
  onClearLeadForOrder?: () => void;
}

export default function OrdersManagement({ onNavigate, onSendToBill, onSendToProduction, productCategories = [], products = [], leadForOrder, onClearLeadForOrder }: OrdersManagementProps) {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [filterCustomerType, setFilterCustomerType] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [showEditOrder, setShowEditOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [sentToProduction, setSentToProduction] = useState<string[]>([]);
  const [sentToBilling, setSentToBilling] = useState<string[]>([]);
  const [billingChoiceDialog, setBillingChoiceDialog] = useState<{ open: boolean; order: any | null }>({ open: false, order: null });
  const [orders, setOrders] = useState<any[]>([]);

  const refreshOrders = () => {
    ordersService.getOrders({ customerType: filterCustomerType }).then(data => {
      const items = Array.isArray(data) ? data : (data as any)?.items || [];
      items.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
        const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return (b.id || 0) - (a.id || 0);
      });
      setOrders(items);
    }).catch(() => {});
  };

  useEffect(() => {
    refreshOrders();
  }, [filterCustomerType]);

  // Auto-open order form when a lead is converted
  useEffect(() => {
    if (leadForOrder) {
      setShowAddOrder(true);
    }
  }, [leadForOrder]);

  // Fetch stock items to merge with products (products table may be empty)
  const [stockItems, setStockItems] = useState<any[]>([]);
  useEffect(() => {
    stockService.getStockItems().then(data => {
      const items = Array.isArray(data) ? data : (data as any)?.items || [];
      setStockItems(items);
    }).catch(() => {});
  }, []);

  // Merge products + stock items into a single list, enriching products with stock data
  const mergedProducts = useMemo(() => {
    // Build a lookup of stock items by lowercase name
    const stockMap = new Map<string, any>();
    stockItems.forEach((s: any) => {
      stockMap.set((s.name || '').toLowerCase(), s);
    });
    // Enrich products with stock data where product has 0 values
    const merged: Product[] = products.map(p => {
      const stockMatch = stockMap.get((p.name || '').toLowerCase());
      if (stockMatch) {
        return {
          ...p,
          unit_price: (parseFloat(p.unit_price as any) || 0) > 0 ? parseFloat(p.unit_price as any) : (parseFloat(stockMatch.selling_price) || parseFloat(stockMatch.unit_price) || 0),
          selling_price: (parseFloat((p as any).selling_price) || 0) > 0 ? parseFloat((p as any).selling_price) : (parseFloat(stockMatch.selling_price) || parseFloat(stockMatch.unit_price) || 0),
          base_price: (parseFloat((p as any).base_price) || 0) > 0 ? parseFloat((p as any).base_price) : (parseFloat(stockMatch.buying_price) || parseFloat(stockMatch.unit_price) || 0),
          unit: p.unit || stockMatch.unit || 'pcs',
        };
      }
      return p;
    });
    // Add stock items that don't exist in products
    const existingNames = new Set(merged.map(p => (p.name || '').toLowerCase()));
    stockItems.forEach((s: any) => {
      if (!existingNames.has((s.name || '').toLowerCase())) {
        merged.push({
          id: `STOCK-${s.id}`,
          name: s.name,
          sku: s.sku || '',
          category: s.category || '',
          subcategory: s.subcategory || 'General',
          unit: s.unit || 'pcs',
          unit_price: parseFloat(s.selling_price) || parseFloat(s.unit_price) || 0,
          selling_price: parseFloat(s.selling_price) || parseFloat(s.unit_price) || 0,
          base_price: parseFloat(s.buying_price) || parseFloat(s.unit_price) || 0,
        });
        existingNames.add((s.name || '').toLowerCase());
      }
    });
    return merged;
  }, [products, stockItems]);

  // Build merged categories from props + stock items
  const mergedCategories = useMemo(() => {
    const catMap = new Map<string, { name: string; subcategories: Set<string> }>();
    // Seed from prop categories
    productCategories.forEach(c => {
      catMap.set(c.id, { name: c.name, subcategories: new Set(c.subcategories) });
    });
    // Derive from merged products (including stock items)
    mergedProducts.forEach(p => {
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
  }, [productCategories, mergedProducts]);

  // Map categories for forms
  const categories = mergedCategories.map(cat => ({
    id: cat.id,
    name: cat.name,
    items: cat.subcategories,
    subcategories: cat.subcategories
  }));

  const [newOrder, setNewOrder] = useState({
    customer: '',
    contact: '',
    mobile: '',
    email: '',
    address: '',
    product: '',
    size: '',
    quantity: '',
    unitPrice: '',
    requiredDate: '',
    priority: 'Medium',
    notes: '',
  });

  // Mock orders data - these are converted leads
  

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Draft': 'bg-gray-100 text-gray-700 border-gray-200',
      'Pending': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'In Production': 'bg-blue-100 text-blue-700 border-blue-200',
      'Bill': 'bg-purple-100 text-purple-700 border-purple-200',
      'Cancelled': 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Unpaid': 'bg-red-100 text-red-700',
      'Partial': 'bg-yellow-100 text-yellow-700',
      'Paid': 'bg-green-100 text-green-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'High': 'bg-red-100 text-red-700',
      'Medium': 'bg-yellow-100 text-yellow-700',
      'Low': 'bg-green-100 text-green-700',
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <Clock className="w-4 h-4" />;
      case 'In Production': return <Package className="w-4 h-4" />;
      case 'Bill': return <Receipt className="w-4 h-4" />;
      case 'Cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const matchesDateFilter = (item: any) => {
    if (dateFilter === 'all') return true;
    const d = new Date(item.converted_date || item.created_at || item.createdAt);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (dateFilter === 'today') return d >= startOfToday;
    if (dateFilter === 'week') { const s = new Date(startOfToday); s.setDate(s.getDate() - s.getDay()); return d >= s; }
    if (dateFilter === 'month') return d >= new Date(now.getFullYear(), now.getMonth(), 1);
    if (dateFilter === 'custom') {
      let ok = true;
      if (customDateFrom) ok = d >= new Date(customDateFrom);
      if (customDateTo && ok) { const e = new Date(customDateTo); e.setDate(e.getDate() + 1); ok = d < e; }
      return ok;
    }
    return true;
  };

  const dateFilteredOrders = orders.filter(matchesDateFilter);

  const filteredOrders = dateFilteredOrders.filter(order => {
    const matchesSearch = (order.customer || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (order.order_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (order.lead_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (order.contact || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || (order.status || '').toLowerCase().replace(/ /g, '-') === filterStatus.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  // Helper: resolve product ID (e.g. STOCK-7) to actual product name
  const resolveProductName = (productId: string) => {
    if (!productId) return '-';
    const stockMatch = String(productId).match(/^STOCK-(\d+)$/);
    if (stockMatch) {
      const stock = stockItems.find(s => String(s.id) === stockMatch[1]);
      if (stock) return stock.name;
    }
    const merged = mergedProducts.find(p => String(p.id) === String(productId));
    if (merged) return merged.name;
    return productId;
  };

  // GST Number validation
  const validateGstNumber = (value: string): string => {
    if (!value) return '';
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (value.length !== 15) return 'GST number must be 15 characters';
    if (!gstRegex.test(value.toUpperCase())) return 'Invalid GST format (e.g. 22AAAAA0000A1Z5)';
    return '';
  };

  const formatDisplayDate = (value: any) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString();
  };

  const handleDeleteOrder = async (order: any) => {
    const ok = window.confirm(`Delete order ${order.order_number}?`);
    if (!ok) return;
    try {
      await ordersService.deleteOrder(String(order.id));
      toast.success(`Order ${order.order_number} deleted successfully`);
      refreshOrders();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete order');
    }
  };

  const orderItems = selectedOrder
    ? (Array.isArray(selectedOrder.products) && selectedOrder.products.length > 0
        ? selectedOrder.products
        : [
            {
              product: selectedOrder.product,
              category: selectedOrder.category,
              subcategory: selectedOrder.subcategory,
              size: selectedOrder.size,
              quantity: selectedOrder.quantity,
              unit_price: selectedOrder.unit_price,
              total_amount: selectedOrder.total_amount,
            },
          ])
    : [];

  const stats = {
    total: dateFilteredOrders.length,
    totalValue: dateFilteredOrders.reduce((sum, o) => sum + (parseFloat(o.grand_total) || 0), 0),
    b2b: dateFilteredOrders.filter(o => o.customer_type === 'B2B').length,
    b2c: dateFilteredOrders.filter(o => o.customer_type !== 'B2B').length,
  };

  const handleSendToProduction = (order: any) => {
    setSentToProduction(prev => [...prev, order.id]);
    if (onSendToProduction) {
      const orderProducts = (order.products && order.products.length > 0)
        ? order.products.map((p: any, idx: number) => {
            const name = resolveProductName(p.product);
            return {
              id: idx + 1,
              product: p.size ? `${name} (${p.size})` : name,
              quantity: p.quantity || 0,
              unit: p.unit || 'pcs',
              rate: Number(p.rate) || 0,
              amount: Number(p.amount) || 0
            };
          })
        : [{
            id: 1,
            product: order.product ? (order.size ? `${resolveProductName(order.product)} (${order.size})` : resolveProductName(order.product)) : 'Unknown',
            quantity: order.quantity || 0,
            unit: order.unit || 'pcs',
            rate: Number(order.unit_price) || 0,
            amount: Number(order.total_amount) || 0
          }];
      onSendToProduction({
        order_number: order.order_number,
        customer: order.customer,
        contact: order.contact,
        mobile: order.mobile,
        email: order.email,
        address: order.address,
        products: orderProducts,
        subtotal: Number(order.total_amount) || 0,
        discount: Number(order.discount) || 0,
        tax_rate: Number(order.tax_rate) || 18,
        gst_amount: Number(order.gst_amount) || 0,
        grand_total: Number(order.grand_total) || 0
      });
    }
    setShowOrderDetail(false);
  };

  // Check if order is already sent to production
  // Disable only when already in production or past that stage
  const isAlreadySentToProduction = (order: any) => {
    const disabledStatuses = ['In Production', 'Dispatched', 'Completed', 'Delivered', 'Cancelled'];
    return disabledStatuses.includes(order.status);
  };

  // Check if order is already sent to billing
  // Only allow sending to bill when status is 'Pending'
  // Once billed (or any other status), disable until status returns to Pending
  const isAlreadySentToBilling = (order: any) => {
    return order.status !== 'Pending';
  };

  const buildOrderForBillingPayload = (order: any): OrderForBilling => {
    const orderProducts = (order.products && order.products.length > 0)
      ? order.products.map((p: any, idx: number) => {
          const name = resolveProductName(p.product);
          return {
            id: idx + 1,
            product: p.size ? `${name} (${p.size})` : name,
            quantity: p.quantity || 0,
            unit: p.unit || 'pcs',
            rate: Number(p.rate) || 0,
            amount: Number(p.amount) || 0,
          };
        })
      : [{
          id: 1,
          product: order.product ? (order.size ? `${resolveProductName(order.product)} (${order.size})` : resolveProductName(order.product)) : 'Unknown',
          quantity: order.quantity || 0,
          unit: order.unit || 'pcs',
          rate: Number(order.unit_price) || 0,
          amount: Number(order.total_amount) || 0,
        }];

    return {
      order_id: String(order.id),
      order_number: order.order_number,
      customer: order.customer,
      contact: order.contact,
      mobile: order.mobile,
      email: order.email,
      address: order.address,
      products: orderProducts,
      subtotal: Number(order.total_amount) || 0,
      discount: Number(order.discount) || 0,
      tax_rate: Number(order.tax_rate) || 18,
      gst_amount: Number(order.gst_amount) || 0,
      grand_total: Number(order.grand_total) || 0,
    };
  };

  const sendOrderToBilling = (order: any, billType: 'invoice' | 'quotation') => {
    if (onSendToBill) {
      onSendToBill(buildOrderForBillingPayload(order), billType);
    }

    // Update order status to 'Bill' in the database
    ordersService.updateOrderStatus(String(order.id), 'Bill').then(() => {
      refreshOrders();
    }).catch(() => {});
    setSentToBilling((prev) => [...prev, order.id]);
  };

  const handleUpdateStatus = async (order: any, newStatus: string) => {
    try {
      await ordersService.updateOrderStatus(String(order.id), newStatus);
      toast.success(`Order ${order.order_number} status updated to: ${newStatus}`);
      setSelectedOrder((prev: any) => prev ? { ...prev, status: newStatus } : prev);
      refreshOrders();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleUpdatePaymentStatus = async (order: any, newPaymentStatus: string) => {
    try {
      await ordersService.updateOrder(String(order.id), { payment_status: newPaymentStatus });
      toast.success(`Order ${order.order_number} payment status updated to: ${newPaymentStatus}`);
      setSelectedOrder((prev: any) => prev ? { ...prev, payment_status: newPaymentStatus } : prev);
      refreshOrders();

      // Auto-create client in Client Management when payment status is set to "Partial"
      if (newPaymentStatus === 'Partial') {
        try {
          // Check if client already exists by fetching all clients and matching by name or phone
          const existingClients = await clientsService.getClients();
          const clientsList = Array.isArray(existingClients) ? existingClients : (existingClients as any)?.items || [];
          const alreadyExists = clientsList.some(
            (c: any) =>
              (c.name && order.customer && c.name.toLowerCase() === order.customer.toLowerCase()) ||
              (c.phone && order.mobile && c.phone === order.mobile)
          );

          if (!alreadyExists && order.customer) {
            const today = new Date().toISOString().split('T')[0];
            await clientsService.createClient({
              name: order.customer || '',
              contact_person: order.contact || order.customer || '',
              phone: order.mobile || '',
              email: order.email || '',
              address: order.address || '',
              gst_number: order.gst_number || '',
              state: order.state || '',
              district: order.district || '',
              status: 'Active',
              rating: 1,
              total_orders: 1,
              total_value: Number(order.grand_total) || Number(order.total_amount) || 0,
              last_order: today,
              join_date: today,
            });
            toast.success(`Client "${order.customer}" auto-created in Client Management`);
          } else if (alreadyExists) {
            toast.info(`Client "${order.customer}" already exists in Client Management`);
          }
        } catch (clientErr: any) {
          toast.error(clientErr.message || 'Failed to auto-create client');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update payment status');
    }
  };

  const handleUpdatePriority = async (order: any, newPriority: string) => {
    try {
      await ordersService.updateOrder(String(order.id), { priority: newPriority });
      toast.success(`Order ${order.order_number} priority updated to: ${newPriority}`);
      setSelectedOrder((prev: any) => prev ? { ...prev, priority: newPriority } : prev);
      refreshOrders();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update priority');
    }
  };

  // If showing add order page, render it instead of the main view
  if (showAddOrder) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => { setShowAddOrder(false); onClearLeadForOrder?.(); }}
          >
            ← {t('back')}
          </Button>
          <div>
            <h1 className="text-xl font-bold">{t('addNewOrder')}</h1>
            {leadForOrder && (
              <p className="text-xs text-green-600">Auto-filled from Lead: {leadForOrder.lead_number}</p>
            )}
          </div>
        </div>
        <AddOrderForm onClose={() => { setShowAddOrder(false); onClearLeadForOrder?.(); }} categories={categories} allProducts={mergedProducts} onSuccess={refreshOrders} leadData={leadForOrder || undefined} />
      </div>
    );
  }

  // If showing edit order page, render it instead of the main view
  if (showEditOrder && editingOrder) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => {
              setShowEditOrder(false);
              setEditingOrder(null);
            }}
          >
            ← {t('back')}
          </Button>
          <div>
            <h1 className="text-xl font-bold">{t('editOrder')}</h1>
            <p className="text-xs text-gray-500">{editingOrder.order_number}</p>
          </div>
        </div>
        <EditOrderForm 
          order={editingOrder} 
          categories={categories}
          allProducts={mergedProducts}
          onClose={() => {
            setShowEditOrder(false);
            setEditingOrder(null);
          }}
          onSuccess={refreshOrders}
        />
      </div>
    );
  }

  return (
    <div className="px-6 pt-2 pb-4 flex flex-col gap-3 overflow-hidden" style={{ height: 'calc(100dvh - 72px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            {t('ordersTitle')}
          </h1>
          <p className="text-gray-600 text-sm">
            {t('manageConvertedLeadsAsOrders')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateFilter} onValueChange={(v: any) => setDateFilter(v)}>
            <SelectTrigger className="w-44">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allTime') || 'All Time'}</SelectItem>
              <SelectItem value="today">{t('today') || 'Today'}</SelectItem>
              <SelectItem value="week">{t('thisWeek') || 'This Week'}</SelectItem>
              <SelectItem value="month">{t('thisMonth') || 'This Month'}</SelectItem>
              <SelectItem value="custom">{t('custom') || 'Custom'}</SelectItem>
            </SelectContent>
          </Select>
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <Input type="date" className="w-36 h-9 text-sm" value={customDateFrom} onChange={(e) => setCustomDateFrom(e.target.value)} />
              <span className="text-gray-400 text-sm">to</span>
              <Input type="date" className="w-36 h-9 text-sm" value={customDateTo} onChange={(e) => setCustomDateTo(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-shrink-0">
        <Card className="bg-blue-500/10 backdrop-blur-sm border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">{t('totalOrdersCount')}</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
            <p className="text-xs text-blue-600">{t('allOrders')}</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/10 backdrop-blur-sm border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">B2B</CardTitle>
            <Building className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            <div className="text-2xl font-bold text-purple-700">{stats.b2b}</div>
            <p className="text-xs text-purple-600">Business orders</p>
          </CardContent>
        </Card>

        <Card className="bg-cyan-500/10 backdrop-blur-sm border-cyan-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">B2C</CardTitle>
            <Users className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            <div className="text-2xl font-bold text-cyan-700">{stats.b2c}</div>
            <p className="text-xs text-cyan-600">Consumer orders</p>
          </CardContent>
        </Card>

        <Card className="bg-green-500/10 backdrop-blur-sm border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">{t('totalValue')}</CardTitle>
            <span className="text-green-600 font-bold text-sm">₹</span>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            <div className="text-2xl font-bold text-green-700">₹{stats.totalValue.toLocaleString()}</div>
            <p className="text-xs text-green-600">{stats.total} {t('orders')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input 
            placeholder={t('searchByOrderCustomerOrLeadNumber')}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatus')}</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCustomerType} onValueChange={setFilterCustomerType}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allCustomerTypes')}</SelectItem>
            <SelectItem value="b2b">{t('b2b')}</SelectItem>
            <SelectItem value="b2c">{t('b2c')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">

      <div className="flex justify-between items-start flex-shrink-0">    
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-gray-100 rounded-lg w-fit">
          <TabsTrigger value="all" className="px-4 py-2">
            {t('all')} ({orders.length})
          </TabsTrigger>
        </TabsList>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => onNavigate('leads')}>
            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            {t('goToLeads')}
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowAddOrder(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('addOrder')}
          </Button>
        </div>
    </div>
        <TabsContent value={activeTab} className="mt-2 flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col">
          {/* Orders Table */}
          <Card className="h-full flex flex-col overflow-hidden">
            <CardHeader className="flex-shrink-0 py-3">
              <CardTitle>{t('ordersLabel')} ({filteredOrders.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('order')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>{t('customer')}</TableHead>
                    <TableHead>{t('type')}</TableHead>
                    <TableHead className="text-center">{t('products')}</TableHead>
                    <TableHead>{t('amount')}</TableHead>
                    <TableHead>{t('dueDate')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium font-mono text-blue-600">{order.order_number}</TableCell>
                      <TableCell>{formatDisplayDate(order.converted_date || order.created_at || order.createdAt)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.customer}</div>
                          <div className="text-xs text-gray-500">{order.address}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] px-1.5 py-0 h-5 ${order.gst_number ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {getCustomerType(order.gst_number)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-center">{order.quantity}</TableCell>
                      <TableCell className="font-semibold">₹{(parseFloat(order.grand_total) || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-gray-500" />
                          {formatDisplayDate(order.required_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(order.status)} flex items-center gap-1 w-fit`}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1">{order.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => setBillingChoiceDialog({ open: true, order })}
                          title={t('sendToBilling')}
                        >
                          <Receipt className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            try {
                              const fullOrder = await ordersService.getOrderById(String(order.id));
                              setSelectedOrder(fullOrder);
                            } catch {
                              setSelectedOrder(order);
                            }
                            setShowOrderDetail(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingOrder(order);
                            setShowEditOrder(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteOrder(order)}
                          title={t('delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={billingChoiceDialog.open}
        onOpenChange={(open) => {
          if (!open) setBillingChoiceDialog({ open: false, order: null });
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Billing Type</DialogTitle>
            <DialogDescription>
              Choose whether to create a quotation bill or invoice for this order.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => {
                if (billingChoiceDialog.order) {
                  sendOrderToBilling(billingChoiceDialog.order, 'quotation');
                }
                setBillingChoiceDialog({ open: false, order: null });
              }}
            >
              Quotation Bill
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                if (billingChoiceDialog.order) {
                  sendOrderToBilling(billingChoiceDialog.order, 'invoice');
                }
                setBillingChoiceDialog({ open: false, order: null });
              }}
            >
              Invoice
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      {selectedOrder && (
        <Dialog open={showOrderDetail} onOpenChange={setShowOrderDetail}>
          <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <DialogTitle className="text-xl text-slate-900">{selectedOrder.order_number}</DialogTitle>
                    <DialogDescription className="mt-1">
                      {t('convertedFromLead')}: {selectedOrder.lead_number}
                    </DialogDescription>
                    <div className="mt-2 text-sm text-slate-600">
                      {selectedOrder.customer} • {selectedOrder.contact || '-'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(selectedOrder.status)}>
                      {selectedOrder.status}
                    </Badge>
                    <Badge className={getPriorityColor(selectedOrder.priority)}>
                      {selectedOrder.priority}
                    </Badge>
                    <div className="ml-2 rounded-md bg-white px-3 py-1 text-sm font-semibold text-slate-900 border border-slate-200">
                      ₹{(selectedOrder.grand_total ?? 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <Tabs defaultValue="details" className="mt-4">
              <TabsList>
                <TabsTrigger value="details">{t('details')}</TabsTrigger>
                <TabsTrigger value="timeline">{t('timeline')}</TabsTrigger>
                <TabsTrigger value="actions">{t('actions')}</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        {t('customerInformation')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{selectedOrder.customer}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{selectedOrder.mobile}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{selectedOrder.email}</span>
                      </div>
                      <div className="flex items-start gap-2 text-gray-600">
                        <MapPin className="w-4 h-4 mt-0.5" />
                        <span>{selectedOrder.address}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        {t('orderDetails')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <span className="text-gray-600 text-sm">{t('product')}</span>
                        <p className="font-medium mt-1 break-words">
                          {selectedOrder.products && selectedOrder.products.length > 0
                            ? selectedOrder.products.map((p: any) => resolveProductName(p.product)).join(', ')
                            : selectedOrder.product ? `${selectedOrder.product}${selectedOrder.size ? ` - ${selectedOrder.size}` : ''}` : '-'}
                        </p>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('quantity')}</span>
                        <span className="font-medium">
                          {selectedOrder.products && selectedOrder.products.length > 0
                            ? selectedOrder.products.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0)
                            : selectedOrder.quantity} units
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('requiredDate')}</span>
                        <span className="font-medium">{formatDisplayDate(selectedOrder.required_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('gstNumber')}</span>
                        <span className="font-medium font-mono">{selectedOrder.gst_number || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('type')}</span>
                        <Badge className={`${selectedOrder.gst_number ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {getCustomerType(selectedOrder.gst_number)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Items */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      {t('items')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orderItems.length === 0 ? (
                      <div className="text-sm text-gray-500">{t('noItemsFound')}</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('item')}</TableHead>
                            <TableHead>{t('category')}</TableHead>
                            <TableHead className="text-center">{t('qty')}</TableHead>
                            <TableHead className="text-right">{t('price')}</TableHead>
                            <TableHead className="text-right">{t('total')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orderItems.map((item: any, index: number) => {
                            const itemName = resolveProductName(item.product_name || item.product || item.name || '');
                            const itemCategory = item.category || '-';
                            const itemQty = item.quantity || 0;
                            const unitPrice = parseFloat(item.rate) || parseFloat(item.unit_price) || 0;
                            const totalAmount = parseFloat(item.amount) || parseFloat(item.total_amount) || unitPrice * itemQty;
                            return (
                              <TableRow key={`${item.product || 'item'}-${index}`}>
                                <TableCell>
                                  <div className="font-medium text-slate-900">{itemName}</div>
                                  {item.size && <div className="text-xs text-slate-500">{item.size}</div>}
                                </TableCell>
                                <TableCell className="text-slate-600">
                                  {itemCategory}{item.subcategory ? ` • ${item.subcategory}` : ''}
                                </TableCell>
                                <TableCell className="text-center">{itemQty}</TableCell>
                                <TableCell className="text-right">₹{unitPrice.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-semibold">₹{totalAmount.toLocaleString()}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Pricing */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      {t('pricingDetails')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-600 text-sm">{t('unitPrice')}</p>
                        <p className="text-lg font-bold">₹{selectedOrder.unit_price}</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-600 text-sm">{t('subtotal')}</p>
                        <p className="text-lg font-bold">₹{(selectedOrder.total_amount ?? 0).toLocaleString()}</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-600 text-sm">GST (18%)</p>
                        <p className="text-lg font-bold">₹{(selectedOrder.gst_amount ?? 0).toLocaleString()}</p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-blue-600 text-sm">{t('grandTotal')}</p>
                        <p className="text-xl font-bold text-blue-700">₹{(selectedOrder.grand_total ?? 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-gray-600">{t('paymentStatus')}</span>
                      <Badge className={getPaymentStatusColor(selectedOrder.payment_status)}>
                        {selectedOrder.payment_status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                {selectedOrder.notes && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        {t('notes')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700">{selectedOrder.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="timeline" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    {(selectedOrder.timeline || []).length === 0 ? (
                      <p className="text-sm text-gray-500 text-center">{t('noTimelineData') || 'No timeline data available'}</p>
                    ) : (
                    <div className="space-y-4">
                      {(selectedOrder.timeline || []).map((item: any, index: number) => (
                        <div key={index} className="flex items-start gap-4">
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                          <div className="flex-1 pb-4 border-b border-gray-100 last:border-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{item.action || item.event}</p>
                              <span className="text-sm text-gray-500">{item.date}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">by {item.done_by || item.by || '-'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="actions" className="space-y-4 mt-4">
                {selectedOrder.needs_production === 'yes' && (
                  !isAlreadySentToProduction(selectedOrder) ? (
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="pt-6">
                        <h4 className="font-medium text-blue-900 mb-2">
                          {t('sendToProduction')}
                        </h4>
                        <p className="text-blue-700 mb-4">
                          Send this order to the production team for manufacturing
                        </p>
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleSendToProduction(selectedOrder)}
                        >
                          <Package className="w-4 h-4 mr-2" />
                          {t('sendToProduction')}
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="bg-gray-50 border-gray-200">
                      <CardContent className="pt-6">
                        <h4 className="font-medium text-gray-700 mb-2">
                          {t('sentToProduction')}
                        </h4>
                        <p className="text-gray-600 mb-4">
                          This order has already been sent to the production team
                        </p>
                        <Button 
                          className="bg-gray-400 cursor-not-allowed"
                          disabled
                        >
                          <Package className="w-4 h-4 mr-2" />
                          {t('sent')}
                        </Button>
                      </CardContent>
                    </Card>
                  )
                )}

                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <Label>{t('updateStatus')}</Label>
                      <Select value={selectedOrder.status} onValueChange={(value: string) => handleUpdateStatus(selectedOrder, value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Draft">Draft</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('paymentStatus')}</Label>
                      <Select value={selectedOrder.payment_status} onValueChange={(value: string) => handleUpdatePaymentStatus(selectedOrder, value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Unpaid">{t('unpaid')}</SelectItem>
                          <SelectItem value="Partial">{t('partial')}</SelectItem>
                          <SelectItem value="Paid">{t('paid')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('priority')}</Label>
                      <Select value={selectedOrder.priority} onValueChange={(value: string) => handleUpdatePriority(selectedOrder, value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="High">{t('high')}</SelectItem>
                          <SelectItem value="Medium">{t('medium')}</SelectItem>
                          <SelectItem value="Low">{t('low')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AddOrderForm({ onClose, categories = [], allProducts = [], onSuccess, leadData }: { onClose: () => void; categories?: Array<{ id: string; name: string; items: string[]; subcategories?: string[] }>; allProducts?: Array<{ id: string; name: string; sku: string; category: string; subcategory?: string; unit: string; unit_price?: number }>; onSuccess?: () => void; leadData?: Record<string, any> }) {
  const { t } = useI18n();

  const [addedProducts, setAddedProducts] = useState<Array<{ id: number; category: string; subcategory: string; product: string; quantity: number; rate: number }>>([]);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingQty, setEditingQty] = useState(0);
  const [leadProductsFilled, setLeadProductsFilled] = useState(false);
  const [prefillNotes, setPrefillNotes] = useState(leadData?.notes || leadData?.description || '');
  const [requiredDate, setRequiredDate] = useState(toDateInputValue(leadData?.required_date || leadData?.date));
  const [orderSource, setOrderSource] = useState<string>(leadData?.source ? String(leadData.source).toLowerCase() : '');

  useEffect(() => {
    setAddedProducts([]);
    setLeadProductsFilled(false);
    setPrefillNotes(leadData?.notes || leadData?.description || '');
    setRequiredDate(toDateInputValue(leadData?.required_date || leadData?.date));
    setOrderSource(leadData?.source ? String(leadData.source).toLowerCase() : '');
  }, [leadData]);

  const findProductInfo = (productRef: any) => {
    const ref = String(productRef || '').trim();
    const refLower = ref.toLowerCase();
    const refNorm = normalizeLookupValue(ref);
    if (!ref) return undefined;

    const byId = allProducts.find(ap => String(ap.id) === ref || String(ap.id) === String(Number(ref)));
    if (byId) return byId;

    const byStockAlias = allProducts.find(ap => {
      const id = String(ap.id || '');
      return id === `STOCK-${ref}` || id.replace(/^STOCK-/, '') === ref;
    });
    if (byStockAlias) return byStockAlias;

    const exactByNameOrSku = allProducts.find(ap =>
      (ap.name || '').toLowerCase() === refLower ||
      (ap.sku || '').toLowerCase() === refLower
    );
    if (exactByNameOrSku) return exactByNameOrSku;

    const normalizedByNameOrSku = allProducts.find(ap =>
      normalizeLookupValue(ap.name) === refNorm ||
      normalizeLookupValue(ap.sku) === refNorm
    );
    if (normalizedByNameOrSku) return normalizedByNameOrSku;

    return allProducts.find(ap => {
      const nameNorm = normalizeLookupValue(ap.name);
      const skuNorm = normalizeLookupValue(ap.sku);
      return (refNorm && nameNorm && (nameNorm.includes(refNorm) || refNorm.includes(nameNorm)))
        || (refNorm && skuNorm && (skuNorm.includes(refNorm) || refNorm.includes(skuNorm)));
    });
  };

  // Pre-fill products from lead data once allProducts (stock items) are loaded
  useEffect(() => {
    if (leadProductsFilled || allProducts.length === 0 || !leadData) return;

    const sourceProducts = Array.isArray(leadData.products) && leadData.products.length > 0
      ? leadData.products
      : (leadData.product
          ? [{
              product: leadData.product,
              category: leadData.category,
              subcategory: leadData.size,
              size: leadData.size,
              quantity: leadData.quantity || 1,
              unit_price: leadData.unit_price || 0,
              rate: leadData.unit_price || 0,
            }]
          : []);

    if (sourceProducts.length === 0) return;

    const filled = sourceProducts.map((p: any, idx: number) => {
      const productInfo = findProductInfo(p.product);
      const categoryLabel = p.category || productInfo?.category || leadData.category || '';
      const categoryId = String(categoryLabel).toLowerCase().replace(/\s+/g, '-');
      const subcategory = p.subcategory || p.size || productInfo?.subcategory || leadData.size || '';
      const itemRate = Number(
        p.rate ??
        p.unit_price ??
        p.price ??
        (productInfo as any)?.selling_price ??
        (productInfo as any)?.unit_price ??
        leadData.unit_price ??
        0
      ) || 0;

      return {
        id: idx + 1,
        category: categoryId,
        subcategory,
        product: productInfo ? String(productInfo.id) : p.product || '',
        quantity: p.quantity || 1,
        rate: itemRate,
      };
    });
    setAddedProducts(filled);
    setLeadProductsFilled(true);
  }, [allProducts, leadData, leadProductsFilled]);
  const [gstNumber, setGstNumber] = useState(leadData?.gst_number || '');
  const [gstError, setGstError] = useState('');
  const [stateValue, setStateValue] = useState((leadData as any)?.state || (leadData?.gst_number ? getStateFromGST(leadData.gst_number) : ''));
  const [districtValue, setDistrictValue] = useState((leadData as any)?.district || '');
  const availableDistricts = useMemo(() => getDistrictsForState(stateValue), [stateValue]);
  const [stateOpen, setStateOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);

  const validateGstNumber = (value: string): string => {
    if (!value) return '';
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (value.length !== 15) return 'GST number must be 15 characters';
    if (!gstRegex.test(value.toUpperCase())) return 'Invalid GST format (e.g. 22AAAAA0000A1Z5)';
    return '';
  };

  const handleGstChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setGstNumber(val);
    setGstError(val ? validateGstNumber(val) : '');
    if (val.length >= 2) {
      const detectedState = getStateFromGST(val);
      if (detectedState) {
        setStateValue(detectedState);
        setDistrictValue('');
      }
    }
    if (!val) {
      setStateValue('');
      setDistrictValue('');
    }
  };

  // Controlled form fields for auto-fill
  const [mobileValue, setMobileValue] = useState(leadData?.mobile || '');
  const [customerValue, setCustomerValue] = useState(leadData?.customer || '');
  const [contactValue, setContactValue] = useState(leadData?.contact || '');
  const [emailValue, setEmailValue] = useState(leadData?.email || '');

  // Restore draft from localStorage on mount (skip if pre-filling from lead)
  useEffect(() => {
    if (leadData) return;
    const draft = loadDraft('orders');
    if (draft) {
      if (draft.mobileValue) setMobileValue(draft.mobileValue);
      if (draft.customerValue) setCustomerValue(draft.customerValue);
      if (draft.contactValue) setContactValue(draft.contactValue);
      if (draft.emailValue) setEmailValue(draft.emailValue);
      if (draft.gstNumber) setGstNumber(draft.gstNumber);
      if (draft.stateValue) setStateValue(draft.stateValue);
      if (draft.districtValue) setDistrictValue(draft.districtValue);
      if (draft.requiredDate) setRequiredDate(draft.requiredDate);
      if (draft.addedProducts?.length) setAddedProducts(draft.addedProducts);
      toast.info('Draft restored');
    }
  }, []);

  // Auto-save draft to localStorage on form changes
  useEffect(() => {
    if (!mobileValue && !customerValue && !addedProducts.length) { clearDraft('orders'); return; }
    saveDraft('orders', { mobileValue, customerValue, contactValue, emailValue, gstNumber, stateValue, districtValue, requiredDate, addedProducts });
  }, [mobileValue, customerValue, contactValue, emailValue, gstNumber, stateValue, districtValue, requiredDate, addedProducts]);

  // Client mobile dropdown
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [showMobileDropdown, setShowMobileDropdown] = useState(false);

  // Multi-row item entry (like billing)
  const [itemEntryRows, setItemEntryRows] = useState<Array<{ id: number; itemId: string; itemName: string; category: string; subcategory: string; quantity: number }>>([
    { id: 1, itemId: '', itemName: '', category: '', subcategory: '', quantity: 0 }
  ]);
  const [activeRowDropdown, setActiveRowDropdown] = useState<number | null>(null);
  const [itemRowErrors, setItemRowErrors] = useState<Record<number, { itemId?: string; quantity?: string }>>({});

  // Search states for product selection
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [subcategorySearchQuery, setSubcategorySearchQuery] = useState('');
  const [showSubcategoryDropdown, setShowSubcategoryDropdown] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Fetch existing clients for mobile dropdown
  useEffect(() => {
    clientsService.getClients().then(data => {
      const items = Array.isArray(data) ? data : (data as any)?.items || (data as any)?.data || [];
      setClientsList(items);
    }).catch(() => {});
  }, []);

  const filteredClients = clientsList.filter(c => {
    const phone = String(c.phone || c.mobile || '');
    const name = String(c.name || c.customer_name || c.client_name || '');
    const q = mobileValue.toLowerCase();
    return phone.toLowerCase().includes(q) || name.toLowerCase().includes(q);
  });

  const handleClientSelect = (client: any) => {
    const phone = String(client.phone || client.mobile || '');
    setMobileValue(phone);
    setCustomerValue(String(client.name || client.customer_name || client.client_name || ''));
    setContactValue(String(client.contact_person || client.contactPerson || client.contact || ''));
    setEmailValue(String(client.email || ''));
    setShowMobileDropdown(false);
    if (errors.mobile) setErrors(prev => { const { mobile, ...rest } = prev; return rest; });
    if (errors.customer) setErrors(prev => { const { customer, ...rest } = prev; return rest; });
    if (errors.contact) setErrors(prev => { const { contact, ...rest } = prev; return rest; });
    if (errors.email) setErrors(prev => { const { email, ...rest } = prev; return rest; });
  };

  // Use categories from props (from Product module)
  const productCategories = categories;

  // Filter categories based on search
  const filteredCategories = productCategories.filter(cat =>
    cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  // Filter subcategories based on search and selected category
  const getFilteredSubcategories = () => {
    return [];
  };

  // Multi-row item entry functions
  const addNewItemRow = () => {
    const lastRow = itemEntryRows[itemEntryRows.length - 1];
    const errs: { itemId?: string; quantity?: string } = {};
    if (!lastRow.itemId) errs.itemId = 'Select an item';
    if (!lastRow.quantity || lastRow.quantity < 1) errs.quantity = 'Enter quantity';
    if (Object.keys(errs).length) {
      setItemRowErrors(prev => ({ ...prev, [lastRow.id]: errs }));
      return;
    }
    const newId = Math.max(...itemEntryRows.map(r => r.id), 0) + 1;
    setItemEntryRows([...itemEntryRows, { id: newId, itemId: '', itemName: '', category: '', subcategory: '', quantity: 0 }]);
  };

  const updateItemRow = (rowId: number, field: string, value: string | number) => {
    setItemEntryRows(rows => rows.map(row =>
      row.id === rowId ? { ...row, [field]: value } : row
    ));
    if (field === 'itemName' || field === 'itemId') {
      setItemRowErrors(prev => ({ ...prev, [rowId]: { ...prev[rowId], itemId: '' } }));
    }
    if (field === 'quantity') {
      setItemRowErrors(prev => ({ ...prev, [rowId]: { ...prev[rowId], quantity: '' } }));
    }
  };

  const selectItemForRow = (rowId: number, product: { id: string; name: string; sku: string; category: string; subcategory?: string; unit: string }) => {
    const catId = (product.category || '').toLowerCase().replace(/\s+/g, '-');
    setItemEntryRows(rows => rows.map(row =>
      row.id === rowId ? { ...row, itemId: product.id, itemName: product.name, category: catId, subcategory: product.subcategory || '' } : row
    ));
    setItemRowErrors(prev => ({ ...prev, [rowId]: { ...prev[rowId], itemId: '' } }));
    setActiveRowDropdown(null);
  };

  const removeItemRow = (rowId: number) => {
    if (itemEntryRows.length > 1) {
      setItemEntryRows(rows => rows.filter(row => row.id !== rowId));
    } else {
      setItemEntryRows([{ id: 1, itemId: '', itemName: '', category: '', subcategory: '', quantity: 0 }]);
    }
  };

  const addAllItems = () => {
    const rowErrors: Record<number, { itemId?: string; quantity?: string }> = {};
    itemEntryRows.forEach((row) => {
      if (!row.itemId) rowErrors[row.id] = { ...(rowErrors[row.id] || {}), itemId: 'Select an item' };
      if (!row.quantity || row.quantity < 1) rowErrors[row.id] = { ...(rowErrors[row.id] || {}), quantity: 'Enter quantity' };
    });
    if (Object.keys(rowErrors).length) { setItemRowErrors(rowErrors); return; }

    const validRows = itemEntryRows.filter(row => row.itemId);
    if (validRows.length === 0) return;

    const newProducts = validRows.map((row, idx) => {
      const productInfo = allProducts.find(p => String(p.id) === String(row.itemId));
      const rate = getEffectiveProductRate(productInfo);
      return {
        id: addedProducts.length + idx + 1,
        category: row.category,
        subcategory: row.subcategory,
        product: row.itemId,
        quantity: row.quantity,
        rate,
      };
    });
    setAddedProducts([...addedProducts, ...newProducts]);
    setItemEntryRows([{ id: 1, itemId: '', itemName: '', category: '', subcategory: '', quantity: 0 }]);
    setItemRowErrors({});
  };

  const getProductRate = (item: { product: string; rate?: number }) => {
    const fromItem = Number(item.rate) || 0;
    if (fromItem > 0) return fromItem;
    const productInfo = findProductInfo(item.product);
    return getEffectiveProductRate(productInfo, fromItem);
  };

  const removeProduct = (id: number) => {
    setAddedProducts(addedProducts.filter(p => p.id !== id));
  };

  const getSubcategoriesByCategory = (categoryId: string) => {
    const category = productCategories.find(c => c.id === categoryId);
    return category?.subcategories || [];
  };

  const getProductsBySubcategory = (categoryId: string, subcategory: string) => {
    return allProducts.filter(p => {
      const pCatId = (p.category || '').toLowerCase().replace(/\s+/g, '-');
      return pCatId === categoryId && p.subcategory === subcategory;
    });
  };

  const savingAsDraftRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isDraft = savingAsDraftRef.current;
    savingAsDraftRef.current = false;
    const form = e.target as HTMLFormElement;
    const formData = {
      customer: customerValue || (form.elements.namedItem('customer') as HTMLInputElement)?.value || '',
      contact: contactValue || (form.elements.namedItem('contact') as HTMLInputElement)?.value || '',
      mobile: mobileValue || '',
      email: emailValue || (form.elements.namedItem('email') as HTMLInputElement)?.value || '',
      source: (form.elements.namedItem('source') as HTMLSelectElement)?.value || '',
    };
    formData.gst_number = gstNumber || '';
    formData.status = 'Pending';
    if (!isDraft) {
      const validationErrors = validateFields(formData, {
        customer: { required: true, min: 2 },
        contact: { required: true },
        mobile: { required: true, phone: true },
        source: { required: true },
        email: { email: true },
        status: { required: true, label: 'Status' },
      });
      if (Object.keys(validationErrors).length) {
        setErrors(validationErrors);
        return;
      }
      if (addedProducts.length === 0) {
        toast.error('Please add at least one product');
        return;
      }
    } else {
      const validationErrors = validateFields(formData, {
        customer: { required: true, min: 2 },
      });
      if (Object.keys(validationErrors).length) {
        setErrors(validationErrors);
        return;
      }
    }
    const subtotal = addedProducts.reduce((sum, p) => sum + (getProductRate(p) * p.quantity), 0);
    const gstAmount = Math.round(subtotal * 0.18);
    const grandTotal = subtotal + gstAmount;
    const totalQty = addedProducts.reduce((sum, p) => sum + p.quantity, 0);
    const primaryItem = addedProducts[0];
    const primaryProductInfo = primaryItem ? allProducts.find(p => String(p.id) === String(primaryItem.product)) : undefined;
    const address = (form.elements.namedItem('address') as HTMLTextAreaElement)?.value || '';
    const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement)?.value || '';
    const payload: any = {
      ...formData,
      status: isDraft ? 'Draft' : (formData.status || 'Pending'),
      gst_number: gstNumber || '',
      state: stateValue || '',
      district: districtValue || '',
      address,
      notes,
      required_date: requiredDate || null,
      category: primaryItem?.category || leadData?.category || '',
      product: primaryProductInfo?.name || primaryItem?.product || leadData?.product || '',
      size: primaryItem?.subcategory || leadData?.size || '',
      quantity: totalQty,
      unit_price: addedProducts.length > 0 ? getProductRate(addedProducts[0]) : 0,
      total_amount: subtotal,
      gst_amount: gstAmount,
      grand_total: grandTotal,
      tax_rate: 18,
      products: addedProducts.map(p => {
        const rate = getProductRate(p);
        return { product: p.product, category: p.category, subcategory: p.subcategory, size: p.subcategory, quantity: p.quantity, rate, amount: rate * p.quantity };
      }),
    };
    try {
      await ordersService.createOrder(payload);
      formSubmittedRef.current = true;
      clearDraft('orders');
      toast.success(isDraft ? 'Order saved as draft!' : 'Order created successfully!');

      // Auto-create client from order data
      try {
        const existingClients = await clientsService.getClients();
        const clientList = Array.isArray(existingClients) ? existingClients : (existingClients as any)?.items || [];
        const alreadyExists = clientList.some(
          (c: any) =>
            (c.name && payload.customer && c.name.toLowerCase() === payload.customer.toLowerCase()) ||
            (c.phone && payload.mobile && c.phone === payload.mobile)
        );

        if (!alreadyExists && payload.customer) {
          const today = new Date().toISOString().split('T')[0];
          await clientsService.createClient({
            name: payload.customer,
            contact_person: payload.contact || payload.customer,
            phone: payload.mobile || '',
            email: payload.email || '',
            address: payload.address || '',
            gst_number: payload.gst_number || '',
            state: payload.state || '',
            district: payload.district || '',
            status: 'Active',
            rating: 1,
            total_orders: 1,
            total_value: Number(payload.grand_total) || Number(payload.total_amount) || 0,
            last_order: today,
            join_date: today,
          });
          toast.success(`Client "${payload.customer}" auto-created in Client Management`);
        }
      } catch (clientErr: any) {
        toast.error(clientErr.message || 'Failed to auto-create client');
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create order');
    }
  };

  const formRef = useRef<HTMLFormElement>(null);
  const formSubmittedRef = useRef(false);

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      {/* Order Information - Single Card */}
      <Card className="shadow-sm mb-4">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-4 h-4" /> Order Information
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-2">
            {/* Row 1: Mobile (span 2) | Order Source | Required Date */}
            <div className="col-span-2">
              <Label className="text-xs text-gray-500">{t('mobile')} *</Label>
              <div className="relative">
                <div className="flex items-center h-8 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent overflow-hidden">
                  <select
                    className="h-full px-1 text-xs bg-gray-50 border-r border-gray-300 focus:outline-none cursor-pointer"
                    defaultValue="+91"
                  >
                    <option value="+91">+91</option>
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                    <option value="+61">+61</option>
                    <option value="+81">+81</option>
                    <option value="+86">+86</option>
                    <option value="+971">+971</option>
                    <option value="+65">+65</option>
                    <option value="+60">+60</option>
                    <option value="+49">+49</option>
                    <option value="+33">+33</option>
                    <option value="+39">+39</option>
                    <option value="+55">+55</option>
                    <option value="+82">+82</option>
                    <option value="+27">+27</option>
                  </select>
                  <Input
                    id="mobile"
                    placeholder="XXXXX XXXXX"
                    className="h-full text-sm flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
                    value={mobileValue}
                    onChange={(e) => {
                      setMobileValue(e.target.value);
                      setShowMobileDropdown(true);
                      if (errors.mobile) setErrors(prev => ({ ...prev, mobile: '' }));
                    }}
                    onFocus={() => setShowMobileDropdown(true)}
                  />
                </div>
                {showMobileDropdown && mobileValue && filteredClients.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredClients.map(client => (
                      <div
                        key={client.id || client._id}
                        className="px-3 py-1.5 cursor-pointer hover:bg-gray-100 border-b border-gray-50"
                        onClick={() => handleClientSelect(client)}
                      >
                        <div className="font-medium text-sm">{String(client.name || client.customer_name || client.client_name || '')}</div>
                        <div className="text-[10px] text-gray-500">{String(client.phone || client.mobile || '')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <FieldError message={errors.mobile} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">{t('orderSource')} *</Label>
              <select
                id="source"
                value={orderSource}
                className="w-full h-8 px-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => { setOrderSource(e.target.value); if (errors.source) setErrors(prev => ({ ...prev, source: '' })); }}
              >
                <option value="">{t('selectSource')}</option>
                <option value="website">{t('website')}</option>
                <option value="phone">{t('phone')}</option>
                <option value="email">Email</option>
                <option value="social">Social</option>
                <option value="walkin">{t('walkin')}</option>
                <option value="advertisement">{t('advertisement')}</option>
                <option value="referral">{t('referral')}</option>
                <option value="inperson">{t('inperson')}</option>
              </select>
              {leadData?.source && orderSource && (
                <p className="text-[10px] text-green-600">Auto-filled from Lead</p>
              )}
              <FieldError message={errors.source} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">{t('requiredDate')}</Label>
              <Input
                id="requiredDate"
                type="date"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            {/* Row 2: Business Name | Contact Person | State | District */}
            <div>
              <Label className="text-xs text-gray-500">{t('businessName')} *</Label>
              <Input id="customer" placeholder={t('enterBusinessName')} className="h-8 text-sm" value={customerValue} onChange={(e) => { setCustomerValue(e.target.value); if (errors.customer) setErrors(prev => ({ ...prev, customer: '' })); }} />
              <FieldError message={errors.customer} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">{t('contactPerson')} *</Label>
              <Input id="contact" placeholder={t('enterContactPerson')} className="h-8 text-sm" value={contactValue} onChange={(e) => { setContactValue(e.target.value); if (errors.contact) setErrors(prev => ({ ...prev, contact: '' })); }} />
              <FieldError message={errors.contact} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">{t('state')}</Label>
              <Popover open={stateOpen} onOpenChange={setStateOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" role="combobox" aria-expanded={stateOpen} className="w-full h-8 justify-between border border-gray-300 font-normal text-xs">
                    {stateValue || t('enterState')}
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t('searchState') || 'Search state...'} />
                    <CommandList>
                      <CommandEmpty>{t('noResultsFound') || 'No state found.'}</CommandEmpty>
                      <CommandGroup>
                        {getAllStates().map(s => (
                          <CommandItem key={s} value={s} onSelect={() => { setStateValue(s); setDistrictValue(''); setStateOpen(false); }}>
                            <Check className={`mr-2 h-4 w-4 ${stateValue === s ? 'opacity-100' : 'opacity-0'}`} />
                            {s}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {stateValue && gstNumber && <p className="text-[10px] text-green-600">Auto-filled from GST</p>}
            </div>
            <div>
              <Label className="text-xs text-gray-500">{t('district')}</Label>
              <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" role="combobox" aria-expanded={districtOpen} disabled={!stateValue} className="w-full h-8 justify-between border border-gray-300 font-normal text-xs">
                    {districtValue || (stateValue ? t('enterDistrict') : t('enterState'))}
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t('searchDistrict') || 'Search district...'} />
                    <CommandList>
                      <CommandEmpty>{t('noResultsFound') || 'No district found.'}</CommandEmpty>
                      <CommandGroup>
                        {availableDistricts.map(d => (
                          <CommandItem key={d} value={d} onSelect={() => { setDistrictValue(d); setDistrictOpen(false); }}>
                            <Check className={`mr-2 h-4 w-4 ${districtValue === d ? 'opacity-100' : 'opacity-0'}`} />
                            {d}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Row 3: Email | GST Number | Address (span 2) */}
            <div>
              <Label className="text-xs text-gray-500">{t('email')}</Label>
              <Input id="email" type="email" placeholder="email@example.com" className="h-8 text-sm" value={emailValue} onChange={(e) => { setEmailValue(e.target.value); if (errors.email) setErrors(prev => ({ ...prev, email: '' })); }} />
              <FieldError message={errors.email} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">{t('gstNumber')}</Label>
              <Input
                value={gstNumber}
                onChange={handleGstChange}
                placeholder="e.g. 33AUJPM8458P1ZR"
                maxLength={15}
                className={`h-8 text-sm font-mono${gstError ? ' border-red-500' : ''}`}
              />
              {gstError && <p className="text-xs text-red-500">{gstError}</p>}
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-gray-500">{t('address')}</Label>
              <textarea
                id="address"
                defaultValue={leadData?.address || ''}
                placeholder={t('enterCustomerAddress')}
                className="w-full h-8 px-3 py-1.5 border border-gray-300 rounded-md text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Selected client info display */}
          {customerValue && mobileValue && (
            <div className="bg-gray-50 rounded-md p-2 text-xs text-gray-600 border mt-3">
              <p className="font-semibold text-gray-800">{customerValue}</p>
              {contactValue && <p className="mt-0.5">Contact: {contactValue}</p>}
              <p className="mt-0.5">{mobileValue}</p>
              {emailValue && <p className="mt-0.5">{emailValue}</p>}
              {gstNumber && <p className="mt-0.5 font-mono text-gray-500">GSTIN: {gstNumber}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items Section */}
      <Card className={`shadow-sm mb-4 overflow-visible ${errors.products ? 'border-red-400' : ''}`}>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <Package className="w-4 h-4" /> {t('addItems')} *
            </CardTitle>
            <Badge variant="outline" className="text-xs text-gray-500">
              {addedProducts.length} {addedProducts.length === 1 ? 'item' : 'items'} added
            </Badge>
          </div>
          {errors.products && <p className="text-sm text-red-500 mt-1">{errors.products}</p>}
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {/* Item Entry Rows - Compact Table Style */}
          <div className="overflow-visible">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-[10px] font-semibold text-gray-500 uppercase py-1 pr-2 w-[30%]">{t('item')} *</th>
                  <th className="text-left text-[10px] font-semibold text-gray-500 uppercase py-1 pr-2 w-[16%]">Category</th>
                  <th className="text-center text-[10px] font-semibold text-gray-500 uppercase py-1 pr-2 w-[10%]">{t('qty')} *</th>
                  <th className="text-left text-[10px] font-semibold text-gray-500 uppercase py-1 pr-2 w-[10%]">Unit</th>
                  <th className="text-right text-[10px] font-semibold text-gray-500 uppercase py-1 pr-2 w-[12%]">Price/Unit</th>
                  <th className="text-right text-[10px] font-semibold text-gray-500 uppercase py-1 pr-2 w-[14%]">Amount</th>
                  <th className="w-[8%]"></th>
                </tr>
              </thead>
              <tbody>
                {itemEntryRows.map((row, index) => {
                  const productInfo = allProducts.find(p => String(p.id) === String(row.itemId));
                  const rowPrice = getEffectiveProductRate(productInfo);
                  const rowTotal = rowPrice * row.quantity;
                  return (
                    <tr key={row.id} className="border-b border-gray-100">
                      <td className="py-1 pr-2">
                        <div className="relative">
                          <Input
                            type="text"
                            placeholder="Search item..."
                            value={row.itemName}
                            onChange={(e) => {
                              updateItemRow(row.id, 'itemName', e.target.value);
                              updateItemRow(row.id, 'itemId', '');
                              setActiveRowDropdown(row.id);
                            }}
                            onFocus={() => setActiveRowDropdown(row.id)}
                            onBlur={() => setTimeout(() => setActiveRowDropdown(null), 300)}
                            className={`h-7 text-xs ${itemRowErrors[row.id]?.itemId ? 'border-red-400' : ''}`}
                          />
                          <FieldError message={itemRowErrors[row.id]?.itemId} />
                          {activeRowDropdown === row.id && (
                            <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                              {allProducts
                                .filter(p => p.name.toLowerCase().includes(row.itemName.toLowerCase()) || p.sku.toLowerCase().includes(row.itemName.toLowerCase()))
                                .length > 0 ? (
                                allProducts
                                  .filter(p => p.name.toLowerCase().includes(row.itemName.toLowerCase()) || p.sku.toLowerCase().includes(row.itemName.toLowerCase()))
                                  .map(product => (
                                    <div
                                      key={product.id}
                                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        selectItemForRow(row.id, product);
                                      }}
                                    >
                                      <div className="font-medium text-xs">{product.name}</div>
                                      <div className="text-[10px] text-gray-500">{product.sku} • {product.category} {product.subcategory ? `> ${product.subcategory}` : ''} • ₹{getEffectiveProductRate(product).toLocaleString()}</div>
                                    </div>
                                  ))
                              ) : (
                                <div className="px-2 py-1 text-center text-gray-500 text-xs">
                                  {t('noItemsFound')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-1 pr-2 text-xs text-gray-500">
                        {productInfo ? (
                          <span className="truncate block">{productInfo.category}{productInfo.subcategory ? ` > ${productInfo.subcategory}` : ''}</span>
                        ) : '-'}
                      </td>
                      <td className="py-1 pr-2">
                        <Input
                          type="number"
                          min="0"
                          value={row.quantity}
                          onChange={(e) => updateItemRow(row.id, 'quantity', Math.max(0, parseInt(e.target.value) || 0))}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => {
                            blockInvalidNumberKeys(e);
                            if (e.key === 'Enter' && itemEntryRows.some(r => r.itemId)) { e.preventDefault(); addAllItems(); }
                            else if (e.key === 'Tab' && !e.shiftKey && index === itemEntryRows.length - 1) {
                              e.preventDefault();
                              addNewItemRow();
                            }
                          }}
                          className={`h-7 text-xs text-center ${itemRowErrors[row.id]?.quantity ? 'border-red-400' : ''}`}
                        />
                        <FieldError message={itemRowErrors[row.id]?.quantity} />
                      </td>
                      <td className="py-1 pr-2 text-xs text-gray-500">
                        {productInfo?.unit || 'Pcs'}
                      </td>
                      <td className="py-1 pr-2 text-right text-xs text-gray-600">
                        {row.itemId ? `₹${rowPrice.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-1 pr-2 text-right text-xs font-medium text-gray-700">
                        {row.itemId ? `₹${rowTotal.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-1">
                        <div className="flex gap-0.5">
                          {index === itemEntryRows.length - 1 && (
                            <Button type="button" variant="ghost" size="sm" onClick={addNewItemRow} className="h-6 w-6 p-0 text-green-600 hover:bg-green-50" title="Add row">
                              <Plus className="w-3 h-3" />
                            </Button>
                          )}
                          {itemEntryRows.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeItemRow(row.id)} className="h-6 w-6 p-0 text-red-500 hover:bg-red-50">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add Items Button */}
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={addAllItems}
              disabled={!itemEntryRows.some(row => row.itemId)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
            >
              <Plus className="w-3 h-3 mr-1" />
              {t('addItem')}
            </Button>
          </div>

          {/* Added Items Table - Invoice Style */}
          {addedProducts.length > 0 && (
            <div className="mt-4 border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-semibold text-gray-600 w-8">#</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Item Name</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600 w-28">Category</th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-600 w-14">Qty</th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-600 w-12">Unit</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-600 w-24">Price/Unit</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-600 w-24">Amount</th>
                    <th className="w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {addedProducts.map((product, index) => {
                    const productDetails = getProductsBySubcategory(product.category, product.subcategory).find(p => p.id === product.product) || allProducts.find(p => String(p.id) === String(product.product));
                    const productName = productDetails?.name || product.product;
                    const unitPrice = getProductRate(product);
                    const total = unitPrice * product.quantity;
                    return (
                      <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="py-1.5 px-2 text-gray-500">{index + 1}</td>
                        <td className="py-1.5 px-2 font-medium">{productName}</td>
                        <td className="py-1.5 px-2 text-gray-500">{product.category || '-'}{product.subcategory ? ` > ${product.subcategory}` : ''}</td>
                        <td className="py-1.5 px-2 text-center">
                          {editingItemId === product.id ? (
                            <Input type="number" min="1" value={editingQty} onChange={(e) => setEditingQty(Math.max(1, parseInt(e.target.value) || 1))} onKeyDown={(e) => { blockInvalidNumberKeys(e); if (e.key === 'Enter') { e.preventDefault(); setAddedProducts(prev => prev.map(p => p.id === product.id ? { ...p, quantity: editingQty } : p)); setEditingItemId(null); }}} className="w-14 h-6 text-xs text-center" />
                          ) : product.quantity}
                        </td>
                        <td className="py-1.5 px-2 text-center text-gray-500">{productDetails?.unit || 'Pcs'}</td>
                        <td className="py-1.5 px-2 text-right">₹{unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="py-1.5 px-2 text-right font-bold">₹{(editingItemId === product.id ? unitPrice * editingQty : total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="py-1.5 px-2">
                          {editingItemId === product.id ? (
                            <div className="flex gap-0.5 justify-center">
                              <Button type="button" size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => { setAddedProducts(prev => prev.map(p => p.id === product.id ? { ...p, quantity: editingQty } : p)); setEditingItemId(null); }}><CheckCircle className="h-3 w-3 text-green-500" /></Button>
                              <Button type="button" size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => setEditingItemId(null)}><XCircle className="h-3 w-3 text-gray-400" /></Button>
                            </div>
                          ) : (
                            <div className="flex gap-0.5 justify-center">
                              <Button type="button" size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => { setEditingItemId(product.id); setEditingQty(product.quantity); }}><Edit className="h-3 w-3 text-blue-500" /></Button>
                              <Button type="button" size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => removeProduct(product.id)}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals Row */}
                  <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                    <td className="py-2 px-2"></td>
                    <td className="py-2 px-2">Total</td>
                    <td className="py-2 px-2"></td>
                    <td className="py-2 px-2 text-center">{addedProducts.reduce((s, p) => s + p.quantity, 0)}</td>
                    <td className="py-2 px-2"></td>
                    <td className="py-2 px-2"></td>
                    <td className="py-2 px-2 text-right text-blue-700">₹{addedProducts.reduce((sum, p) => sum + (getProductRate(p) * p.quantity), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Amount Summary with GST */}
      {addedProducts.length > 0 && (
        <Card className="shadow-sm mb-4">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <IndianRupee className="w-4 h-4" /> Amount Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="space-y-1.5 text-sm max-w-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('subtotal')}</span>
                <span>₹{addedProducts.reduce((sum, p) => sum + (getProductRate(p) * p.quantity), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('gst18')}</span>
                <span>₹{Math.round(addedProducts.reduce((sum, p) => sum + (getProductRate(p) * p.quantity), 0) * 0.18).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t-2 border-gray-800 pt-2 mt-2">
                <span>{t('grandTotal')}</span>
                <span className="text-blue-700">₹{Math.round(addedProducts.reduce((sum, p) => sum + (getProductRate(p) * p.quantity), 0) * 1.18).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card className="shadow-sm mb-4">
        <CardContent className="px-4 py-3">
          <div>
            <Label className="text-xs text-gray-500">{t('notesSpecialRequirements')}</Label>
            <textarea
              id="notes"
              value={prefillNotes}
              onChange={(e) => setPrefillNotes(e.target.value)}
              placeholder={t('enterAnyAdditionalNotesOrSpecialRequirements')}
              className="w-full h-16 px-3 py-2 border border-gray-300 rounded-md text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => { formSubmittedRef.current = true; clearDraft('orders'); onClose(); }}>
          {t('cancel')}
        </Button>
        <Button type="button" variant="outline" size="sm" className="border-gray-400 text-gray-700 hover:bg-gray-50" onClick={() => { savingAsDraftRef.current = true; formRef.current?.requestSubmit(); }}>
          Save as Draft
        </Button>
        <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700">
          <Receipt className="mr-1 h-3 w-3" />
          {t('createOrder')}
        </Button>
      </div>
    </form>
  );
}

function EditOrderForm({ order, categories = [], allProducts = [], onClose, onSuccess }: { order: any; categories?: Array<{ id: string; name: string; items: string[]; subcategories?: string[] }>; allProducts?: Array<{ id: string; name: string; sku: string; category: string; subcategory?: string; unit: string; unit_price?: number }>; onClose: () => void; onSuccess?: () => void }) {
  const { t } = useI18n();
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingQty, setEditingQty] = useState(0);
  const [addedProducts, setAddedProducts] = useState<Array<{ id: number; category: string; subcategory: string; product: string; quantity: number; rate: number }>>(
    order.products && order.products.length > 0 
      ? order.products.map((p: OrderProduct, idx: number) => ({ 
          id: idx + 1, 
          category: p.category || '', 
          subcategory: p.subcategory || '', 
          product: p.product || '', 
          quantity: p.quantity || 1,
          rate: Number((p as any).rate) || Number((p as any).unit_price) || Number((p as any).price) || 0
        }))
      : (order.product
          ? [{
              id: 1,
              category: (order.category || '').toLowerCase().replace(/\s+/g, '-'),
              subcategory: order.size || '',
              product: order.product || '',
              quantity: order.quantity || 1,
              rate: parseFloat(order.unit_price as any) || 0,
            }]
          : [])
  );
  // Multi-row item entry (like billing)
  const [itemEntryRows, setItemEntryRows] = useState<Array<{ id: number; itemId: string; itemName: string; category: string; subcategory: string; quantity: number }>>([
    { id: 1, itemId: '', itemName: '', category: '', subcategory: '', quantity: 0 }
  ]);
  const [activeRowDropdown, setActiveRowDropdown] = useState<number | null>(null);
  const [itemRowErrors, setItemRowErrors] = useState<Record<number, { itemId?: string; quantity?: string }>>({});
  
  const [customerName, setCustomerName] = useState(order.customer || '');
  const [contactPerson, setContactPerson] = useState(order.contact || '');
  const [mobile, setMobile] = useState(order.mobile || '');
  const [email, setEmail] = useState(order.email || '');
  const [source, setSource] = useState((order.source || '').toLowerCase());
  const [status, setStatus] = useState(order.status || '');
  const [address, setAddress] = useState(order.address || '');
  const [notes, setNotes] = useState(order.notes || '');
  const [requiredDate, setRequiredDate] = useState(toDateInputValue(order.required_date));
  
  const [gstNumber, setGstNumber] = useState(order.gst_number || '');
  const [gstError, setGstError] = useState('');
  const [stateValue, setStateValue] = useState(order.state || (order.gst_number ? getStateFromGST(order.gst_number) : ''));
  const [districtValue, setDistrictValue] = useState(order.district || '');
  const availableDistricts = useMemo(() => getDistrictsForState(stateValue), [stateValue]);
  const [stateOpen, setStateOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);

  const validateGstNumber = (value: string): string => {
    if (!value) return '';
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (value.length !== 15) return 'GST number must be 15 characters';
    if (!gstRegex.test(value.toUpperCase())) return 'Invalid GST format (e.g. 22AAAAA0000A1Z5)';
    return '';
  };

  const handleGstChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setGstNumber(val);
    setGstError(val ? validateGstNumber(val) : '');
    if (val.length >= 2) {
      const detectedState = getStateFromGST(val);
      if (detectedState) {
        setStateValue(detectedState);
        setDistrictValue('');
      }
    }
    if (!val) {
      setStateValue('');
      setDistrictValue('');
    }
  };

  // Client mobile dropdown
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [showMobileDropdown, setShowMobileDropdown] = useState(false);

  // Search states for product selection
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [subcategorySearchQuery, setSubcategorySearchQuery] = useState('');
  const [showSubcategoryDropdown, setShowSubcategoryDropdown] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Fetch existing clients for mobile dropdown
  useEffect(() => {
    clientsService.getClients().then(data => {
      const items = Array.isArray(data) ? data : (data as any)?.items || (data as any)?.data || [];
      setClientsList(items);
    }).catch(() => {});
  }, []);

  const filteredClients = clientsList.filter(c => {
    const phone = String(c.phone || c.mobile || '');
    const name = String(c.name || c.customer_name || c.client_name || '');
    const q = mobile.toLowerCase();
    return phone.toLowerCase().includes(q) || name.toLowerCase().includes(q);
  });

  const handleClientSelect = (client: any) => {
    const phone = String(client.phone || client.mobile || '');
    setMobile(phone);
    setCustomerName(String(client.name || client.customer_name || client.client_name || ''));
    setContactPerson(String(client.contact_person || client.contactPerson || client.contact || ''));
    setEmail(String(client.email || ''));
    setShowMobileDropdown(false);
    if (errors.mobile) setErrors(prev => { const { mobile, ...rest } = prev; return rest; });
    if (errors.customer) setErrors(prev => { const { customer, ...rest } = prev; return rest; });
    if (errors.contact) setErrors(prev => { const { contact, ...rest } = prev; return rest; });
    if (errors.email) setErrors(prev => { const { email, ...rest } = prev; return rest; });
  };

  const productCategories = categories;

  // Filter categories based on search
  const filteredCategories = productCategories.filter(cat =>
    cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  // Filter subcategories based on search and selected category
  const getFilteredSubcategories = () => {
    return [];
  };

  // Multi-row item entry functions
  const addNewItemRow = () => {
    const lastRow = itemEntryRows[itemEntryRows.length - 1];
    const errs: { itemId?: string; quantity?: string } = {};
    if (!lastRow.itemId) errs.itemId = 'Select an item';
    if (!lastRow.quantity || lastRow.quantity < 1) errs.quantity = 'Enter quantity';
    if (Object.keys(errs).length) {
      setItemRowErrors(prev => ({ ...prev, [lastRow.id]: errs }));
      return;
    }
    const newId = Math.max(...itemEntryRows.map(r => r.id), 0) + 1;
    setItemEntryRows([...itemEntryRows, { id: newId, itemId: '', itemName: '', category: '', subcategory: '', quantity: 0 }]);
  };

  const updateItemRow = (rowId: number, field: string, value: string | number) => {
    setItemEntryRows(rows => rows.map(row =>
      row.id === rowId ? { ...row, [field]: value } : row
    ));
    if (field === 'itemName' || field === 'itemId') {
      setItemRowErrors(prev => ({ ...prev, [rowId]: { ...prev[rowId], itemId: '' } }));
    }
    if (field === 'quantity') {
      setItemRowErrors(prev => ({ ...prev, [rowId]: { ...prev[rowId], quantity: '' } }));
    }
  };

  const selectItemForRow = (rowId: number, product: { id: string; name: string; sku: string; category: string; subcategory?: string; unit: string }) => {
    const catId = (product.category || '').toLowerCase().replace(/\s+/g, '-');
    setItemEntryRows(rows => rows.map(row =>
      row.id === rowId ? { ...row, itemId: product.id, itemName: product.name, category: catId, subcategory: product.subcategory || '' } : row
    ));
    setItemRowErrors(prev => ({ ...prev, [rowId]: { ...prev[rowId], itemId: '' } }));
    setActiveRowDropdown(null);
  };

  const removeItemRow = (rowId: number) => {
    if (itemEntryRows.length > 1) {
      setItemEntryRows(rows => rows.filter(row => row.id !== rowId));
    } else {
      setItemEntryRows([{ id: 1, itemId: '', itemName: '', category: '', subcategory: '', quantity: 0 }]);
    }
  };

  const addAllItems = () => {
    const rowErrors: Record<number, { itemId?: string; quantity?: string }> = {};
    itemEntryRows.forEach((row) => {
      if (!row.itemId) rowErrors[row.id] = { ...(rowErrors[row.id] || {}), itemId: 'Select an item' };
      if (!row.quantity || row.quantity < 1) rowErrors[row.id] = { ...(rowErrors[row.id] || {}), quantity: 'Enter quantity' };
    });
    if (Object.keys(rowErrors).length) { setItemRowErrors(rowErrors); return; }

    const validRows = itemEntryRows.filter(row => row.itemId);
    if (validRows.length === 0) return;

    const newProducts = validRows.map((row, idx) => {
      const productInfo = allProducts.find(p => String(p.id) === String(row.itemId));
      const rate = getEffectiveProductRate(productInfo);
      return {
        id: addedProducts.length + idx + 1,
        category: row.category,
        subcategory: row.subcategory,
        product: row.itemId,
        quantity: row.quantity,
        rate,
      };
    });
    setAddedProducts([...addedProducts, ...newProducts]);
    setItemEntryRows([{ id: 1, itemId: '', itemName: '', category: '', subcategory: '', quantity: 0 }]);
    setItemRowErrors({});
  };

  const getProductRate = (item: { product: string; rate?: number }) => {
    const fromItem = Number(item.rate) || 0;
    if (fromItem > 0) return fromItem;
    const byId = allProducts.find(p => String(p.id) === String(item.product));
    if (byId) return getEffectiveProductRate(byId, fromItem);
    const norm = normalizeLookupValue(item.product);
    const byNameOrSku = allProducts.find(p =>
      normalizeLookupValue(p.name) === norm || normalizeLookupValue(p.sku) === norm
    );
    return getEffectiveProductRate(byNameOrSku, fromItem);
  };

  const removeProduct = (id: number) => {
    setAddedProducts(addedProducts.filter(p => p.id !== id));
  };

  const getSubcategoriesByCategory = (categoryId: string) => {
    const category = productCategories.find(c => c.id === categoryId);
    return category?.subcategories || [];
  };

  const getProductsBySubcategory = (categoryId: string, subcategory: string) => {
    return allProducts.filter(p => {
      const pCatId = (p.category || '').toLowerCase().replace(/\s+/g, '-');
      return pCatId === categoryId && p.subcategory === subcategory;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateFields(
      { customer: customerName, contact: contactPerson, mobile, email, source, gst_number: gstNumber || '', status },
      {
        customer: { required: true },
        contact: { required: true },
        mobile: { required: true, phone: true },
        source: { required: true },
        email: { email: true },
        status: { required: true, label: 'Status' },
      }
    );
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    if (addedProducts.length === 0) {
      toast.error('Please add at least one product');
      return;
    }
    const subtotal = addedProducts.reduce((sum, p) => sum + (getProductRate(p) * p.quantity), 0);
    const gstAmount = Math.round(subtotal * 0.18);
    const grandTotal = subtotal + gstAmount;
    const totalQty = addedProducts.reduce((sum, p) => sum + p.quantity, 0);
    const primaryItem = addedProducts[0];
    const primaryProductInfo = primaryItem ? allProducts.find(p => String(p.id) === String(primaryItem.product)) : undefined;
    const payload: any = {
      customer: customerName,
      contact: contactPerson,
      mobile,
      email,
      source,
      status,
      address,
      notes,
      gst_number: gstNumber || '',
      state: stateValue || '',
      district: districtValue || '',
      required_date: requiredDate || null,
      category: primaryItem?.category || order.category || '',
      product: primaryProductInfo?.name || primaryItem?.product || order.product || '',
      size: primaryItem?.subcategory || order.size || '',
      quantity: totalQty,
      unit_price: addedProducts.length > 0 ? getProductRate(addedProducts[0]) : 0,
      total_amount: subtotal,
      gst_amount: gstAmount,
      grand_total: grandTotal,
      tax_rate: 18,
      products: addedProducts.map(p => {
        const rate = getProductRate(p);
        return { product: p.product, category: p.category, subcategory: p.subcategory, size: p.subcategory, quantity: p.quantity, rate, amount: rate * p.quantity };
      }),
    };
    try {
      await ordersService.updateOrder(String(order.id), payload);
      toast.success(`Order ${order.order_number} updated successfully!`);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order');
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Order Information - Single Card */}
      <Card className="shadow-sm mb-4">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-4 h-4" /> Order Information
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-2">
            {/* Row 1: Mobile (span 2) | Order Source | Required Date */}
            <div className="col-span-2">
              <Label className="text-xs text-gray-500">{t('mobile')} *</Label>
              <div className="relative">
                <div className="flex items-center h-8 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent overflow-hidden">
                  <select
                    className="h-full px-1 text-xs bg-gray-50 border-r border-gray-300 focus:outline-none cursor-pointer"
                    defaultValue="+91"
                  >
                    <option value="+91">+91</option>
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                    <option value="+61">+61</option>
                    <option value="+81">+81</option>
                    <option value="+86">+86</option>
                    <option value="+971">+971</option>
                    <option value="+65">+65</option>
                    <option value="+60">+60</option>
                    <option value="+49">+49</option>
                    <option value="+33">+33</option>
                    <option value="+39">+39</option>
                    <option value="+55">+55</option>
                    <option value="+82">+82</option>
                    <option value="+27">+27</option>
                  </select>
                  <Input
                    id="edit-mobile"
                    placeholder="XXXXX XXXXX"
                    className="h-full text-sm flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
                    value={mobile}
                    onChange={(e) => { setMobile(e.target.value); setShowMobileDropdown(true); setErrors(prev => ({ ...prev, mobile: '' })); }}
                    onFocus={() => setShowMobileDropdown(true)}
                  />
                </div>
                {showMobileDropdown && mobile && filteredClients.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredClients.map(client => (
                      <div
                        key={client.id || client._id}
                        className="px-3 py-1.5 cursor-pointer hover:bg-gray-100 border-b border-gray-50"
                        onClick={() => handleClientSelect(client)}
                      >
                        <div className="font-medium text-sm">{String(client.name || client.customer_name || client.client_name || '')}</div>
                        <div className="text-[10px] text-gray-500">{String(client.phone || client.mobile || '')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <FieldError message={errors.mobile} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">{t('orderSource')} *</Label>
              <select
                id="edit-source"
                className="w-full h-8 px-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={source}
                onChange={(e) => { setSource(e.target.value); setErrors(prev => ({ ...prev, source: '' })); }}
              >
                <option value="">{t('selectSource')}</option>
                <option value="website">{t('website')}</option>
                <option value="phone">{t('phone')}</option>
                <option value="walkin">{t('walkin')}</option>
                <option value="advertisement">{t('advertisement')}</option>
                <option value="referral">{t('referral')}</option>
                <option value="inperson">{t('inperson')}</option>
              </select>
              <FieldError message={errors.source} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">{t('requiredDate')}</Label>
              <Input
                id="edit-required-date"
                type="date"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            {/* Row 2: Business Name | Contact Person | Status | State */}
            <div>
              <Label className="text-xs text-gray-500">{t('businessName')} *</Label>
              <Input id="edit-customer" placeholder={t('enterBusinessName')} className="h-8 text-sm" value={customerName} onChange={(e) => { setCustomerName(e.target.value); setErrors(prev => ({ ...prev, customer: '' })); }} />
              <FieldError message={errors.customer} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">{t('contactPerson')} *</Label>
              <Input id="edit-contact" placeholder={t('enterContactPerson')} className="h-8 text-sm" value={contactPerson} onChange={(e) => { setContactPerson(e.target.value); setErrors(prev => ({ ...prev, contact: '' })); }} />
              <FieldError message={errors.contact} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">{t('status')} *</Label>
              <select
                id="edit-status"
                className="w-full h-8 px-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={status}
                onChange={(e) => { setStatus(e.target.value); setErrors(prev => ({ ...prev, status: '' })); }}
              >
                <option value="">{t('selectStatus')}</option>
                <option value="Pending">{t('pending')}</option>
                <option value="Confirmed">{t('confirmed')}</option>
                <option value="In Production">{t('inProduction')}</option>
                <option value="Ready">{t('ready')}</option>
                <option value="Dispatched">{t('dispatched')}</option>
                <option value="Delivered">{t('delivered')}</option>
                <option value="Bill">{t('bill')}</option>
                <option value="Cancelled">{t('cancelled')}</option>
              </select>
              <FieldError message={errors.status} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">{t('state')}</Label>
              <Popover open={stateOpen} onOpenChange={setStateOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" role="combobox" aria-expanded={stateOpen} className="w-full h-8 justify-between border border-gray-300 font-normal text-xs">
                    {stateValue || t('enterState')}
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t('searchState') || 'Search state...'} />
                    <CommandList>
                      <CommandEmpty>{t('noResultsFound') || 'No state found.'}</CommandEmpty>
                      <CommandGroup>
                        {getAllStates().map(s => (
                          <CommandItem key={s} value={s} onSelect={() => { setStateValue(s); setDistrictValue(''); setStateOpen(false); }}>
                            <Check className={`mr-2 h-4 w-4 ${stateValue === s ? 'opacity-100' : 'opacity-0'}`} />
                            {s}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {stateValue && gstNumber && <p className="text-[10px] text-green-600">Auto-filled from GST</p>}
            </div>

            {/* Row 3: Email | GST Number | District | Address */}
            <div>
              <Label className="text-xs text-gray-500">{t('email')}</Label>
              <Input id="edit-email" type="email" placeholder="email@example.com" className="h-8 text-sm" value={email} onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: '' })); }} />
              <FieldError message={errors.email} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">{t('gstNumber')}</Label>
              <Input
                value={gstNumber}
                onChange={handleGstChange}
                placeholder="e.g. 33AUJPM8458P1ZR"
                maxLength={15}
                className={`h-8 text-sm font-mono${gstError ? ' border-red-500' : ''}`}
              />
              {gstError && <p className="text-xs text-red-500">{gstError}</p>}
            </div>
            <div>
              <Label className="text-xs text-gray-500">{t('district')}</Label>
              <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" role="combobox" aria-expanded={districtOpen} disabled={!stateValue} className="w-full h-8 justify-between border border-gray-300 font-normal text-xs">
                    {districtValue || (stateValue ? t('enterDistrict') : t('enterState'))}
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t('searchDistrict') || 'Search district...'} />
                    <CommandList>
                      <CommandEmpty>{t('noResultsFound') || 'No district found.'}</CommandEmpty>
                      <CommandGroup>
                        {availableDistricts.map(d => (
                          <CommandItem key={d} value={d} onSelect={() => { setDistrictValue(d); setDistrictOpen(false); }}>
                            <Check className={`mr-2 h-4 w-4 ${districtValue === d ? 'opacity-100' : 'opacity-0'}`} />
                            {d}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs text-gray-500">{t('address')}</Label>
              <textarea
                id="edit-address"
                placeholder={t('enterCustomerAddress')}
                className="w-full h-8 px-3 py-1.5 border border-gray-300 rounded-md text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Add Items Section */}
        <Card className="shadow-sm mb-4 overflow-visible">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <Package className="w-4 h-4" /> {t('addItems')}
              </CardTitle>
              <Badge variant="outline" className="text-xs text-gray-500">
                {addedProducts.length} {addedProducts.length === 1 ? 'item' : 'items'} added
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Multiple Item Entry Rows */}
            <div className="space-y-3">
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-3 items-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <div className="col-span-7">{t('item')} *</div>
                <div className="col-span-3">{t('qty')} *</div>
                <div className="col-span-2"></div>
              </div>

              {/* Item Entry Rows */}
              {itemEntryRows.map((row, index) => (
                <div key={row.id} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-7 relative">
                    <Input
                      type="text"
                      placeholder={t('searchItem')}
                      value={row.itemName}
                      onChange={(e) => {
                        updateItemRow(row.id, 'itemName', e.target.value);
                        updateItemRow(row.id, 'itemId', '');
                        setActiveRowDropdown(row.id);
                      }}
                      onFocus={() => setActiveRowDropdown(row.id)}
                      onBlur={() => setTimeout(() => setActiveRowDropdown(null), 300)}
                      className={itemRowErrors[row.id]?.itemId ? 'border-red-400' : ''}
                    />
                    <FieldError message={itemRowErrors[row.id]?.itemId} />
                    {activeRowDropdown === row.id && (
                      <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto">
                        {allProducts
                          .filter(p => p.name.toLowerCase().includes(row.itemName.toLowerCase()) || p.sku.toLowerCase().includes(row.itemName.toLowerCase()))
                          .length > 0 ? (
                          allProducts
                            .filter(p => p.name.toLowerCase().includes(row.itemName.toLowerCase()) || p.sku.toLowerCase().includes(row.itemName.toLowerCase()))
                            .map(product => (
                              <div
                                key={product.id}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  selectItemForRow(row.id, product);
                                }}
                              >
                                <div className="font-medium text-sm">{product.name}</div>
                                <div className="text-xs text-gray-500">{product.sku} • {product.category} {product.subcategory ? `> ${product.subcategory}` : ''}</div>
                              </div>
                            ))
                        ) : (
                          <div className="px-3 py-2 text-center text-gray-500 text-sm">
                            {t('noItemsFound')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      min="0"
                      value={row.quantity}
                      onChange={(e) => updateItemRow(row.id, 'quantity', Math.max(0, parseInt(e.target.value) || 0))}
                      onFocus={(e) => e.target.select()} onKeyDown={blockInvalidNumberKeys}
                      className={itemRowErrors[row.id]?.quantity ? 'border-red-400' : 'border border-gray-300'}
                    />
                    <FieldError message={itemRowErrors[row.id]?.quantity} />
                  </div>
                  <div className="col-span-2 flex gap-2">
                    {index === itemEntryRows.length - 1 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addNewItemRow}
                        className="text-green-600 border-green-300 hover:bg-green-50 h-9 px-3"
                        title="Add Row"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    ) : null}
                    {itemEntryRows.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItemRow(row.id)}
                        className="text-red-500 hover:bg-red-50 h-9 px-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add All Items Button */}
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={addAllItems}
                disabled={!itemEntryRows.some(row => row.itemId)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('addItem')}
              </Button>
            </div>

            {/* Items Table */}
            {addedProducts.length > 0 && (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">{t('sno')}</TableHead>
                      <TableHead>{t('item')}</TableHead>
                      <TableHead className="text-center w-20">{t('qty')}</TableHead>
                      <TableHead className="text-right w-24">{t('price')}</TableHead>
                      <TableHead className="text-right w-28">{t('total')}</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {addedProducts.map((product, index) => {
                      const productDetails = getProductsBySubcategory(product.category, product.subcategory).find(p => p.id === product.product) || allProducts.find(p => String(p.id) === String(product.product));
                      const productName = productDetails?.name || product.product;
                      const unitPrice = getProductRate(product);
                      const total = unitPrice * product.quantity;
                      return (
                        <TableRow key={product.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{productName}</TableCell>
                          <TableCell className="text-center">
                            {editingItemId === product.id ? (
                              <Input type="number" min="1" value={editingQty} onChange={(e) => setEditingQty(Math.max(1, parseInt(e.target.value) || 1))} className="w-20 h-8 text-center" />
                            ) : product.quantity}
                          </TableCell>
                          <TableCell className="text-right">₹{unitPrice.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-semibold">₹{(editingItemId === product.id ? unitPrice * editingQty : total).toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-center">
                              {editingItemId === product.id ? (
                                <>
                                  <Button type="button" size="sm" variant="ghost" onClick={() => { setAddedProducts(prev => prev.map(p => p.id === product.id ? { ...p, quantity: editingQty } : p)); setEditingItemId(null); }}><Check className="h-4 w-4 text-green-600" /></Button>
                                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditingItemId(null)}><XCircle className="h-4 w-4 text-gray-400" /></Button>
                                </>
                              ) : (
                                <>
                                  <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingItemId(product.id); setEditingQty(product.quantity); }}><Edit className="h-4 w-4 text-blue-500" /></Button>
                                  <Button type="button" size="sm" variant="ghost" onClick={() => removeProduct(product.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Totals Section */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t('subtotal')}</span>
                      <span>₹{addedProducts.reduce((sum, p) => sum + (getProductRate(p) * p.quantity), 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{t('gst18')}</span>
                      <span>₹{Math.round(addedProducts.reduce((sum, p) => sum + (getProductRate(p) * p.quantity), 0) * 0.18).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2">
                      <span>{t('grandTotal')}</span>
                      <span>₹{Math.round(addedProducts.reduce((sum, p) => sum + (getProductRate(p) * p.quantity), 0) * 1.18).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

      {/* Notes */}
      <Card className="shadow-sm mb-4">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-4 h-4" /> {t('notesSpecialRequirements')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <textarea
            id="edit-notes"
            placeholder={t('enterAnyAdditionalNotesOrSpecialRequirements')}
            className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          {t('updateOrder')}
        </Button>
      </div>
    </form>
  );
}
