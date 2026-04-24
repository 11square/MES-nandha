import { toast } from 'sonner';
import React, { useState, useEffect, useRef } from 'react';
import { saveDraft, loadDraft, clearDraft } from '../lib/draftStorage';
import { validateFields, FieldError, blockInvalidNumberKeys, type ValidationErrors } from '../lib/validation';
import { getCustomerType } from '../lib/utils';
import { ConfirmDialog } from './ui/confirm-dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useI18n } from '../contexts/I18nContext';
import { OrderForBilling } from '../types';
import { billingService } from '../services/billing.service';
import { clientsService } from '../services/clients.service';
import { ordersService } from '../services/orders.service';
import {
  Plus, 
  Search, 
  Filter, 
  Download, 
  FileDown,
  Eye, 
  Edit, 
  Trash2,
  Receipt,
  IndianRupee,
  Calendar,
  Building,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Printer,
  Send,
  CreditCard,
  Wallet,
  TrendingUp,
  Package,
  AlertCircle,
  SendHorizontal,
  MoreVertical
} from 'lucide-react';

interface BillingManagementProps {
  orderForBilling?: OrderForBilling | null;
  onClearOrderForBilling?: () => void;
  openBillForm?: boolean;
  preferredBillType?: 'invoice' | 'quotation';
  onSendToDispatch?: (billData: { bill_no: string; order_id?: string | number; order_number: string; client_name: string; client_address: string; items: { name: string; quantity: number }[]; grand_total: number }) => void;
}

// Shared stock data (simulating connection to StockManagement)
interface StockItem {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  sku: string;
  hsnSac: string;
  gstRate: number;
  currentStock: number;
  unit: string;
  unitPrice: number;
}

// Client data interface
interface Client {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstNo?: string;
}

interface BillItem {
  item_id: string;
  name: string;
  hsn_sac?: string;
  category?: string;
  subcategory?: string;
  size?: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  discount: number;
  tax: number;
  total: number;
}

interface Bill {
  id: string;
  bill_no: string;
  date: string;
  client_id: string;
  order_id?: string | number;
  order_number?: string;
  client_name: string;
  client_address: string;
  client_gst?: string;
  items: BillItem[];
  subtotal: number;
  total_discount: number;
  total_tax: number;
  grand_total: number;
  payment_status: 'paid' | 'partial' | 'pending' | 'overdue';
  payment_method?: 'cash' | 'upi' | 'card' | 'bank' | 'credit';
  payment_type: 'cash' | 'credit';
  paid_amount: number;
  due_date: string;
  notes?: string;
  created_by: string;
  gst_rate: number;
}

interface Payment {
  id: string;
  billId: string;
  billNo: string;
  clientName: string;
  date: string;
  amount: number;
  method: 'cash' | 'upi' | 'card' | 'bank';
  reference?: string;
  receivedBy: string;
  notes?: string;
}

const BillingManagement: React.FC<BillingManagementProps> = ({ orderForBilling, onClearOrderForBilling, openBillForm, preferredBillType, onSendToDispatch }) => {
  // Translation helper
  const { t } = useI18n();

  // Stock items (connected to Stock module)
  const [stockItems, setStockItems] = useState<StockItem[]>([]);

  // Clients data (connected to Client module)
  const [clients, setClients] = useState<Client[]>([]);

  // Client search and add new client state
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientMobile, setClientMobile] = useState('');

  // Multiple item entry rows state
  interface ItemEntryRow {
    id: number;
    itemId: string;
    itemName: string;
    hsnSac: string;
    gstRate: number;
    quantity: number;
    unit: string;
    price: number;
    discount: number;
  }
  const [itemEntryRows, setItemEntryRows] = useState<ItemEntryRow[]>([
    { id: 1, itemId: '', itemName: '', hsnSac: '', gstRate: 18, quantity: 1, unit: 'Pcs', price: 0, discount: 0 }
  ]);
  const [activeRowDropdown, setActiveRowDropdown] = useState<number | null>(null);
  const itemInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const [itemRowErrors, setItemRowErrors] = useState<Record<number, { itemId?: string; quantity?: string }>>({});

  const [bills, setBills] = useState<Bill[]>([]);
  const [orderNumberById, setOrderNumberById] = useState<Record<string, string>>({});

  const [payments, setPayments] = useState<Payment[]>([]);

  const extractOrderNumberFromNotes = (notes: any): string => {
    const match = String(notes || '').match(/Order:\s*([A-Za-z0-9-]+)/i);
    return match ? match[1] : '';
  };

  const normalizeBillItems = (rawItems: any): BillItem[] => {
    let source: any[] = [];
    if (Array.isArray(rawItems)) {
      source = rawItems;
    } else if (typeof rawItems === 'string') {
      try {
        const parsed = JSON.parse(rawItems);
        if (Array.isArray(parsed)) source = parsed;
      } catch {
        source = [];
      }
    }

    return source.map((item: any, idx: number) => {
      const quantity = Number(item?.quantity) || 0;
      const unitPrice = Number(item?.unit_price ?? item?.rate ?? item?.price) || 0;
      return {
        item_id: String(item?.item_id ?? item?.id ?? `item-${idx + 1}`),
        name: String(item?.name ?? item?.product ?? item?.item_name ?? ''),
        hsn_sac: item?.hsn_sac || '',
        category: item?.category || '',
        subcategory: item?.subcategory || '',
        size: item?.size || '',
        quantity,
        unit: item?.unit || '',
        unit_price: unitPrice,
        discount: Number(item?.discount) || 0,
        tax: Number(item?.tax) || 0,
        total: Number(item?.total ?? item?.amount) || (quantity * unitPrice),
      };
    }).filter((item) => !!item.name);
  };

  // Generate next bill number based on existing bills
  const generateNextBillNumber = (existingBills: Bill[]) => {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    let maxNum = 0;
    existingBills.forEach(b => {
      const match = b.bill_no?.match(/INV-\d{4}-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
  };

  // Generate next quotation bill number based on existing bills
  const generateNextQuotationNumber = (existingBills: Bill[]) => {
    const year = new Date().getFullYear();
    const prefix = `QTN-${year}-`;
    let maxNum = 0;
    existingBills.forEach(b => {
      const match = b.bill_no?.match(/QTN-\d{4}-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
  };

  const [filterCustomerType, setFilterCustomerType] = useState('all');

  useEffect(() => {
    refreshBills();
  }, [filterCustomerType]);

  const refreshBills = () => {
    billingService.getBills({ customerType: filterCustomerType }).then(data => {
      const items = Array.isArray(data) ? data : (data as any)?.items || [];
      const mapped = items.map((b: any) => ({
        ...b,
        id: String(b.id),
        client_id: String(b.client_id || ''),
        order_id: b.order_id !== null && b.order_id !== undefined ? String(b.order_id) : undefined,
        order_number: String(b.order_number || extractOrderNumberFromNotes(b.notes) || ''),
        items: normalizeBillItems(b.items),
        grand_total: Number(b.grand_total) || 0,
        subtotal: Number(b.subtotal) || 0,
        total_discount: Number(b.total_discount) || 0,
        total_tax: Number(b.total_tax) || 0,
        paid_amount: Number(b.paid_amount) || 0,
        gst_rate: Number(b.gst_rate) || 0,
      })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setBills(mapped);
      // Auto-set bill number if form is open and bill_number is empty
      if (!billForm.bill_number && !editingBill) {
        setBillForm(prev => ({ ...prev, bill_number: generateNextBillNumber(mapped) }));
      }
    }).catch(() => {});
    ordersService.getOrders().then(data => {
      const items = Array.isArray(data) ? data : (data as any)?.items || [];
      const map: Record<string, string> = {};
      items.forEach((order: any) => {
        if (order?.id !== undefined && order?.id !== null) {
          map[String(order.id)] = String(order.order_number || '');
        }
      });
      setOrderNumberById(map);
    }).catch(() => {});
    billingService.getBillingClients().then(data => {
      const items = Array.isArray(data) ? data : (data as any)?.items || [];
      setClients(items.map((client: any) => ({
        id: String(client.id),
        name: client.name,
        contactPerson: client.contact_person || client.contactPerson || '',
        phone: client.phone || '',
        email: client.email || '',
        address: client.address || '',
        gstNo: client.gst_number || client.gstNo || undefined,
      })));
    }).catch(() => {});
    billingService.getStockItems().then(data => {
      const items = Array.isArray(data) ? data : (data as any)?.items || [];
      setStockItems(items.map((item: any) => ({
        id: String(item.id),
        name: item.name,
        category: item.category || '',
        subcategory: item.subcategory || '',
        sku: item.sku || '',
        hsnSac: item.hsn_sac || item.hsnSac || '',
        gstRate: Number(item.gst_rate ?? item.gstRate ?? 18),
        currentStock: item.current_stock ?? item.currentStock ?? 0,
        unit: item.unit || '',
        unitPrice: Number(item.selling_price) || Number(item.unit_price) || Number(item.unitPrice) || 0,
      })));
    }).catch(() => {});
  };

  const getBillClientAddress = (bill: Partial<Bill>): string => {
    const direct = String(bill.client_address || '').trim();
    if (direct) return direct;

    const clientId = String(bill.client_id || '').trim();
    if (clientId) {
      const byId = clients.find((c) => String(c.id) === clientId);
      if (byId?.address) return byId.address;
    }

    const clientName = String(bill.client_name || '').trim().toLowerCase();
    if (clientName) {
      const byName = clients.find((c) => (c.name || '').trim().toLowerCase() === clientName);
      if (byName?.address) return byName.address;
    }

    return '-';
  };

  const getDispatchPayloadFromBill = (bill: Bill) => {
    const resolvedClientAddress = getBillClientAddress(bill);
    const orderId = bill.order_id !== undefined && bill.order_id !== null && String(bill.order_id) !== ''
      ? String(bill.order_id)
      : undefined;
    const orderNumberFromId = orderId ? (orderNumberById[String(orderId)] || '') : '';
    const notesOrder = extractOrderNumberFromNotes(bill.notes);
    const resolvedOrderNumber = String(bill.order_number || orderNumberFromId || notesOrder || (orderId ? String(orderId) : ''));
    const items = normalizeBillItems((bill as any).items).map((item) => ({
      name: item.name,
      quantity: Number(item.quantity) || 0,
    })).filter((item) => item.name);

    return {
      bill_no: bill.bill_no,
      order_id: orderId,
      order_number: resolvedOrderNumber,
      client_name: bill.client_name,
      client_address: resolvedClientAddress,
      items,
      grand_total: Number(bill.grand_total) || 0,
    };
  };

  const [activeTab, setActiveTab] = useState<'gst-bills' | 'non-gst-bills'>('gst-bills');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showCreateBill, setShowCreateBill] = useState(!!orderForBilling || !!openBillForm);
  const [showViewBill, setShowViewBill] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [viewingBill, setViewingBill] = useState<Bill | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dispatchedBills, setDispatchedBills] = useState<Set<string>>(new Set());
  const [printedBills, setPrintedBills] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string }>({ open: false, id: '' });

  const [billForm, setBillForm] = useState({
    date: new Date().toISOString().split('T')[0],
    client_id: '',
    items: [] as BillItem[],
    bill_number: `INV-${new Date().getFullYear()}-001`,
    notes: '',
    created_by: 'Admin',
    payment_type: 'cash' as 'cash' | 'credit',
    payment_method: 'cash' as 'cash' | 'upi' | 'card' | 'bank',
    gst: 18,
    invoiceType: 'b2b' as 'b2b' | 'b2c',
    gst_number: '',
    place_of_supply: '33-Tamil Nadu',
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    terms_conditions: 'Thanks for doing business with us!',
  });

  // Addons state
  interface Addon {
    id: number;
    title: string;
    description: string;
    amount: number;
  }
  const [addons, setAddons] = useState<Addon[]>([]);
  const [newAddon, setNewAddon] = useState({ title: '', description: '', amount: 0 });
  const [addonErrors, setAddonErrors] = useState<ValidationErrors>({});
  const [showAddonForm, setShowAddonForm] = useState(false);
  const [editingAddonIndex, setEditingAddonIndex] = useState<number | null>(null);
  const [editingAddon, setEditingAddon] = useState<{ title: string; description: string; amount: number } | null>(null);
  const [posSearch, setPosSearch] = useState('');
  const [posOpen, setPosOpen] = useState(false);

  const [currentItem, setCurrentItem] = useState({
    itemId: '',
    quantity: 0,
    discount: 0,
  });

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');

  const [paymentForm, setPaymentForm] = useState({
    billId: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    method: 'cash' as Payment['method'],
    reference: '',
    receivedBy: 'Admin',
    notes: '',
  });

  // State for order-based billing
  const [orderBillData, setOrderBillData] = useState<{
    orderId: string;
    customer: string;
    contact: string;
    mobile: string;
    email: string;
    address: string;
    product: string;
    size: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    gstAmount: number;
    grandTotal: number;
  } | null>(null);

  const parseOrderIdForApi = (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const str = String(value).trim();
    if (!str) return null;
    if (/^\d+$/.test(str)) return parseInt(str, 10);
    const match = str.match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  };

  // Track whether we've already processed the incoming order
  const orderProcessedRef = useRef(false);

  useEffect(() => {
    if (openBillForm && preferredBillType) {
      setActiveTab(preferredBillType === 'quotation' ? 'non-gst-bills' : 'gst-bills');
    }
  }, [openBillForm, preferredBillType]);

  // Handle order sent from OrdersManagement
  useEffect(() => {
    if (orderForBilling && !orderProcessedRef.current) {
      orderProcessedRef.current = true;
      const targetTab: 'gst-bills' | 'non-gst-bills' = preferredBillType === 'quotation' ? 'non-gst-bills' : 'gst-bills';
      setActiveTab(targetTab);
      const orderData = orderForBilling as any;
      const orderRef = String(orderData.order_id || orderData.id || '');
      const orderNum = orderData.orderNumber || orderData.order_number || '';
      const customerName = orderData.customer || '';
      const orderProducts = orderData.products || [];

      // Fetch fresh bills to generate accurate bill number
      billingService.getBills().then(data => {
        const items = Array.isArray(data) ? data : (data as any)?.items || [];
        const freshBills = items.map((b: any) => ({ ...b, id: String(b.id), bill_no: b.bill_no }));
        const freshBillNo = targetTab === 'non-gst-bills'
          ? generateNextQuotationNumber(freshBills)
          : generateNextBillNumber(freshBills);
        setBillForm(prev => ({ ...prev, bill_number: freshBillNo }));
      }).catch(() => {});

      // Map order bill data for the info display
      setOrderBillData({
        orderId: orderRef || orderNum,
        customer: customerName,
        contact: orderData.contact || '',
        mobile: orderData.mobile || '',
        email: orderData.email || '',
        address: orderData.address || '',
        product: orderProducts.map((p: any) => p.product).join(', '),
        size: '',
        quantity: orderProducts.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0),
        unitPrice: orderProducts.length > 0 ? orderProducts[0].rate || 0 : 0,
        totalAmount: orderData.subtotal || 0,
        gstAmount: orderData.gst_amount || orderData.taxAmount || 0,
        grandTotal: orderData.grand_total || orderData.grandTotal || 0,
      });

      // Map order products to BillingManagement's BillItem format
      const quotationMode = targetTab === 'non-gst-bills';
      const orderItems: BillItem[] = orderProducts.map((product: any, idx: number) => ({
        item_id: `${orderNum}-${idx + 1}`,
        name: product.product,
        category: product.category || '',
        subcategory: product.subcategory || '',
        size: product.size || '',
        quantity: product.quantity,
        unit: product.unit || '',
        unit_price: product.rate,
        discount: 0,
        tax: quotationMode ? 0 : (orderData.tax_rate || orderData.taxRate || 18),
        total: product.amount,
      }));

      // Auto-fill the client name in search field
      setClientSearchQuery(customerName);

      // Try to match customer to an existing billing client
      const matchedClient = clients.find(c =>
        c.name.toLowerCase() === customerName.toLowerCase() ||
        c.phone === orderData.mobile
      );

      setBillForm(prev => ({
        ...prev,
        client_id: matchedClient?.id || '',
        gst_number: matchedClient?.gstNo || orderData.gst_number || '',
        items: orderItems,
        notes: `Order: ${orderNum} - ${customerName}`,
        gst: targetTab === 'non-gst-bills' ? 0 : (orderData.tax_rate || orderData.taxRate || 18),
      }));

      setShowCreateBill(true);

      // Clear shared state after a short delay to avoid race conditions
      setTimeout(() => {
        if (onClearOrderForBilling) {
          onClearOrderForBilling();
        }
      }, 500);
    }
  }, [orderForBilling, preferredBillType]);

  // When clients load later, try to match the customer if we have order data
  useEffect(() => {
    if (orderBillData && clients.length > 0 && !billForm.client_id) {
      const matchedClient = clients.find(c =>
        c.name.toLowerCase() === orderBillData.customer.toLowerCase() ||
        c.phone === orderBillData.mobile
      );
      if (matchedClient) {
        setBillForm(prev => ({ ...prev, client_id: matchedClient.id, gst_number: matchedClient.gstNo || prev.gst_number || '' }));
      }
    }
  }, [clients]);

  // Date filter helper
  const matchesBillDateFilter = (bill: Bill) => {
    if (dateFilter === 'all') return true;
    const d = new Date(bill.date);
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

  const dateFilteredBills = bills.filter(matchesBillDateFilter);
  const dateFilteredPayments = payments.filter(p => {
    if (dateFilter === 'all') return true;
    const d = new Date(p.date);
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
  });

  // Calculate statistics
  const totalBillValue = dateFilteredBills.reduce((sum, bill) => sum + bill.grand_total, 0);
  const totalReceived = dateFilteredBills.reduce((sum, bill) => sum + bill.paid_amount, 0);
  const totalPending = totalBillValue - totalReceived;
  const overdueCount = dateFilteredBills.filter(bill => {
    const dueDate = new Date(bill.due_date);
    const today = new Date();
    return bill.payment_status !== 'paid' && dueDate < today;
  }).length;

  const getSelectedClient = (): Client | { id: string; name: string; address: string; gstNo?: string } | null => {
    // First check if a client is selected from dropdown
    const existingClient = clients.find(c => c.id === billForm.client_id);
    if (existingClient) return existingClient;
    
    // If no client selected but there's text in search, use that as custom client
    if (clientSearchQuery.trim()) {
      return {
        id: 'CUSTOM',
        name: clientSearchQuery.trim(),
        address: orderBillData?.address || '',
        gstNo: undefined,
      };
    }
    
    return null;
  };

  const getSelectedStock = (itemId: string) => {
    return stockItems.find(s => s.id === itemId);
  };

  // Filter clients based on search query
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    client.contactPerson.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    client.phone.includes(clientSearchQuery)
  );

  // Handle selecting a client from dropdown
  const handleSelectClient = (client: Client) => {
    setBillForm(prev => ({ ...prev, client_id: client.id, gst_number: client.gstNo || '', invoiceType: client.gstNo?.trim() ? 'b2b' : 'b2c' }));
    setClientSearchQuery(client.name);
    setClientMobile(client.phone || '');
    setShowClientDropdown(false);
    setErrors(prev => ({ ...prev, client: '' }));
  };

  // Add a new empty row for item entry
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
    setItemEntryRows([...itemEntryRows, { id: newId, itemId: '', itemName: '', hsnSac: '', gstRate: 18, quantity: 1, unit: 'Pcs', price: 0, discount: 0 }]);
    setTimeout(() => {
      itemInputRefs.current[newId]?.focus();
    }, 100);
  };

  // Update a specific row
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

  // Select item for a specific row
  const selectItemForRow = (rowId: number, stock: typeof stockItems[0]) => {
    setItemEntryRows(rows => rows.map(row => 
      row.id === rowId ? { ...row, itemId: stock.id, itemName: stock.name, hsnSac: stock.hsnSac || '', gstRate: stock.gstRate ?? 18, price: stock.unitPrice, unit: stock.unit || 'Pcs' } : row
    ));
    setItemRowErrors(prev => ({ ...prev, [rowId]: { ...prev[rowId], itemId: '' } }));
    setActiveRowDropdown(null);
  };

  // Remove an item row
  const removeItemRow = (rowId: number) => {
    const row = itemEntryRows.find(r => r.id === rowId);
    // Allow removal if multiple rows exist OR quantity is 0
    if (itemEntryRows.length > 1 || (row && row.quantity === 0)) {
      setItemEntryRows(rows => rows.filter(row => row.id !== rowId));
    } else {
      // Reset the only row if quantity is not 0
      setItemEntryRows([{ id: 1, itemId: '', itemName: '', quantity: 0, price: 0, discount: 0, gstRate: 18 }]);
    }
  };

  // Add all valid rows to bill
  const addAllItemsToBill = () => {
    const rowErrors: Record<number, { itemId?: string; quantity?: string }> = {};
    itemEntryRows.forEach((row) => {
      if (!row.itemId) {
        rowErrors[row.id] = { ...(rowErrors[row.id] || {}), itemId: 'Select an item' };
      }
      if (!row.quantity || row.quantity < 1) {
        rowErrors[row.id] = { ...(rowErrors[row.id] || {}), quantity: 'Enter quantity' };
      }
    });
    if (Object.keys(rowErrors).length) {
      setItemRowErrors(rowErrors);
      return;
    }

    const validRows = itemEntryRows.filter(row => row.itemId);
    if (validRows.length === 0) return;

    // Build new items list first (outside updater for reliable side effects)
    const newItems: BillItem[] = [];
    for (const row of validRows) {
      const stock = getSelectedStock(row.itemId);
      if (!stock) {
        toast.error(`Item not found in stock. Please re-select the item.`);
        continue;
      }

      if (row.quantity > stock.currentStock) {
        toast.info(`Insufficient stock for ${stock.name}! Available: ${stock.currentStock} ${stock.unit}`);
        continue;
      }

      const unitPrice = row.price > 0 ? row.price : stock.unitPrice;
      const itemGstRate = row.gstRate ?? stock.gstRate ?? 18;
      const subtotal = unitPrice * row.quantity;
      const discountAmount = (subtotal * row.discount) / 100;
      const taxableAmount = subtotal - discountAmount;
      const taxAmount = (taxableAmount * itemGstRate) / 100;
      const total = taxableAmount + taxAmount;

      newItems.push({
        item_id: stock.id,
        name: stock.name,
        hsn_sac: row.hsnSac || '',
        category: stock.category || '',
        subcategory: stock.subcategory || '',
        size: '',
        quantity: row.quantity,
        unit: row.unit || stock.unit || 'Pcs',
        unit_price: unitPrice,
        discount: row.discount,
        tax: itemGstRate,
        total: Math.round(total),
      });
    }

    if (newItems.length > 0) {
      setBillForm(prev => ({
        ...prev,
        items: [...prev.items, ...newItems],
      }));
      setErrors(prev => ({ ...prev, items: '' }));
      setItemRowErrors({});
      // Reset to single empty row only after successful add
      setItemEntryRows([{ id: 1, itemId: '', itemName: '', quantity: 0, price: 0, discount: 0, gstRate: 18 }]);
    }
  };

  const removeItemFromBill = (index: number) => {
    setBillForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // State for editing bill items
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<{
    quantity: number;
    unit_price: number;
    discount: number;
    tax: number;
  } | null>(null);

  const startEditItem = (index: number) => {
    const item = billForm.items[index];
    setEditingItemIndex(index);
    setEditingItem({
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount,
      tax: item.tax,
    });
  };

  const saveEditItem = () => {
    if (editingItemIndex === null || !editingItem) return;
    
    const subtotal = editingItem.unit_price * editingItem.quantity;
    const discountAmount = (subtotal * editingItem.discount) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * editingItem.tax) / 100;
    const total = taxableAmount + taxAmount;

    setBillForm(prev => {
      const updatedItems = [...prev.items];
      if (editingItemIndex < updatedItems.length) {
        updatedItems[editingItemIndex] = {
          ...updatedItems[editingItemIndex],
          quantity: editingItem.quantity,
          unit_price: editingItem.unit_price,
          discount: editingItem.discount,
          tax: editingItem.tax,
          total: Math.round(total),
        };
      }
      return { ...prev, items: updatedItems };
    });
    setEditingItemIndex(null);
    setEditingItem(null);
  };

  const cancelEditItem = () => {
    setEditingItemIndex(null);
    setEditingItem(null);
  };

  // Indian states list for Place of Supply
  const INDIAN_STATES = [
    '01-Jammu & Kashmir', '02-Himachal Pradesh', '03-Punjab', '04-Chandigarh', '05-Uttarakhand',
    '06-Haryana', '07-Delhi', '08-Rajasthan', '09-Uttar Pradesh', '10-Bihar',
    '11-Sikkim', '12-Arunachal Pradesh', '13-Nagaland', '14-Manipur', '15-Mizoram',
    '16-Tripura', '17-Meghalaya', '18-Assam', '19-West Bengal', '20-Jharkhand',
    '21-Odisha', '22-Chhattisgarh', '23-Madhya Pradesh', '24-Gujarat', '26-Dadra & Nagar Haveli',
    '27-Maharashtra', '28-Andhra Pradesh', '29-Karnataka', '30-Goa', '31-Lakshadweep',
    '32-Kerala', '33-Tamil Nadu', '34-Puducherry', '35-Andaman & Nicobar', '36-Telangana',
    '37-Andhra Pradesh (New)', '38-Ladakh',
  ];

  const UNIT_OPTIONS = ['Pcs', 'Kg', 'Ltr', 'Mtr', 'Box', 'Bag', 'Set', 'Nos', 'Pair', 'Roll', 'Pack', 'Dozen', 'Ton', 'Sq.ft', 'Sq.mtr'];

  // Convert number to Indian currency words
  const amountToWords = (num: number): string => {
    if (num === 0) return 'Zero Rupees only';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const convert = (n: number): string => {
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
      if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
      if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
      return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
    };
    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);
    let words = convert(rupees) + ' Rupees';
    if (paise > 0) words += ' and ' + convert(paise) + ' Paise';
    return words + ' only';
  };

  // Calculate tax breakdown by HSN/SAC code
  const calculateTaxBreakdown = () => {
    const hsnMap: Record<string, { hsn: string; rate: number; taxable: number; cgst: number; sgst: number; total: number }> = {};
    
    billForm.items.forEach(item => {
      const hsn = item.hsn_sac || '-';
      const itemRate = item.tax || 0;
      const halfRate = itemRate / 2;
      const itemSubtotal = item.unit_price * item.quantity;
      const discountAmt = (itemSubtotal * item.discount) / 100;
      const taxable = itemSubtotal - discountAmt;
      const cgst = (taxable * halfRate) / 100;
      const sgst = (taxable * halfRate) / 100;
      
      const key = `${hsn}_${itemRate}`;
      if (!hsnMap[key]) {
        hsnMap[key] = { hsn, rate: itemRate, taxable: 0, cgst: 0, sgst: 0, total: 0 };
      }
      hsnMap[key].taxable += taxable;
      hsnMap[key].cgst += cgst;
      hsnMap[key].sgst += sgst;
      hsnMap[key].total += cgst + sgst;
    });
    
    return Object.values(hsnMap);
  };

  const calculateBillTotals = () => {
    const subtotal = billForm.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const totalDiscount = billForm.items.reduce((sum, item) => sum + ((item.unit_price * item.quantity * item.discount) / 100), 0);
    const totalTax = billForm.items.reduce((sum, item) => {
      const itemSubtotal = item.unit_price * item.quantity;
      const itemDiscount = (itemSubtotal * item.discount) / 100;
      const taxableAmount = itemSubtotal - itemDiscount;
      return sum + (taxableAmount * item.tax) / 100;
    }, 0);
    const totalAddons = addons.reduce((sum, addon) => sum + addon.amount, 0);
    const grandTotal = subtotal - totalDiscount + totalTax + totalAddons;
    return { subtotal, totalDiscount, totalTax, totalAddons, grandTotal };
  };

  const addAddon = () => {
    const errs = validateFields(
      { title: newAddon.title, description: newAddon.description, amount: newAddon.amount },
      {
        title: { required: true, label: 'Title' },
        description: { required: true, label: 'Description' },
        amount: { required: true, numeric: true, min: 1, label: 'Amount' },
      }
    );
    if (Object.keys(errs).length) {
      setAddonErrors(errs);
      return;
    }
    setAddonErrors({});
    setAddons([...addons, { id: addons.length + 1, ...newAddon }]);
    setNewAddon({ title: '', description: '', amount: 0 });
  };

  const removeAddon = (id: number) => {
    setAddons(addons.filter(a => a.id !== id));
  };

  const startEditAddon = (index: number) => {
    const addon = addons[index];
    setEditingAddonIndex(index);
    setEditingAddon({
      title: addon.title,
      description: addon.description,
      amount: addon.amount,
    });
  };

  const saveEditAddon = () => {
    if (editingAddonIndex === null || !editingAddon) return;
    
    const updatedAddons = [...addons];
    updatedAddons[editingAddonIndex] = {
      ...updatedAddons[editingAddonIndex],
      title: editingAddon.title,
      description: editingAddon.description,
      amount: editingAddon.amount,
    };

    setAddons(updatedAddons);
    setEditingAddonIndex(null);
    setEditingAddon(null);
  };

  const cancelEditAddon = () => {
    setEditingAddonIndex(null);
    setEditingAddon(null);
  };

  const billFormRef = useRef<HTMLFormElement>(null);
  const billSubmittedRef = useRef(false);

  // Reset submitted ref when form opens & restore draft
  useEffect(() => {
    if (showCreateBill && !editingBill && !orderForBilling) {
      billSubmittedRef.current = false;
      const draft = loadDraft('billing');
      if (draft) {
        if (draft.billForm) setBillForm(prev => ({ ...prev, ...draft.billForm }));
        if (draft.addons?.length) setAddons(draft.addons);
        if (draft.clientSearchQuery) setClientSearchQuery(draft.clientSearchQuery);
        toast.info('Draft restored');
      }
    }
  }, [showCreateBill]);

  // Auto-save draft to localStorage on form changes
  useEffect(() => {
    if (!showCreateBill || editingBill) return;
    if (!clientSearchQuery && !billForm.items.length) { clearDraft('billing'); return; }
    saveDraft('billing', { billForm, addons, clientSearchQuery });
  }, [showCreateBill, billForm, addons, clientSearchQuery]);

  const performBillCreate = async (isDraft: boolean) => {
    const client = getSelectedClient();
    const clientValue = client ? client.name : (clientSearchQuery.trim() || '');
    if (!isDraft) {
      const errs = validateFields(
        {
          date: billForm.date,
          client: clientValue,
          invoiceType: billForm.invoiceType,
          payment_type: billForm.payment_type,
        },
        {
          date: { required: true, label: 'Date' },
          client: { required: true, label: 'Client' },
          invoiceType: { required: true, label: 'Invoice Type' },
          payment_type: { required: true, label: 'Bill Type' },
        }
      );
      if (billForm.items.length === 0) {
        errs.items = 'At least one item must be added';
      }
      if (Object.keys(errs).length) {
        setErrors(errs);
        return;
      }
      setErrors({});
      if (!client || billForm.items.length === 0) return;
    } else {
      // Draft only requires client name
      const errs = validateFields(
        { client: clientValue },
        { client: { required: true, label: 'Client' } }
      );
      if (Object.keys(errs).length) {
        setErrors(errs);
        return;
      }
      setErrors({});
      if (!client) return;
    }

    const totals = calculateBillTotals();

    try {
      // Auto-create client if it's a new (custom) client
      let resolvedClientId = client.id === 'CUSTOM' ? null : client.id;
      if (client.id === 'CUSTOM' && client.name && !isDraft) {
        try {
          const result = await clientsService.createClient({
            name: client.name,
            phone: clientMobile || '',
            gst_number: billForm.gst_number || undefined,
          });
          if (result?.id) resolvedClientId = String(result.id);
          refreshBills(); // refresh client list too
        } catch (_) { /* continue even if client creation fails */ }
      }

      await billingService.createBill({
        bill_no: billForm.bill_number || undefined,
        date: billForm.date,
        order_id: orderBillData ? parseOrderIdForApi(orderBillData.orderId) : null,
        client_id: resolvedClientId,
        client_name: client.name,
        client_address: client.address || '',
        client_gst: billForm.gst_number || client.gstNo || '',
        items: billForm.items,
        subtotal: Math.round(totals.subtotal),
        total_discount: Math.round(totals.totalDiscount),
        total_tax: Math.round(totals.totalTax),
        grand_total: Math.round(totals.grandTotal),
        status: isDraft ? 'draft' : 'final',
        payment_status: 'pending',
        payment_type: billForm.payment_type,
        payment_method: billForm.payment_method,
        paid_amount: 0,
        due_date: billForm.due_date,
        notes: billForm.notes,
        created_by: billForm.created_by,
        gst_rate: billForm.items.length > 0 ? Math.max(...billForm.items.map(i => i.tax || 0)) : 0,
        place_of_supply: billForm.place_of_supply,
        terms_conditions: billForm.terms_conditions,
        state: billForm.place_of_supply,
      });
      toast.success(isDraft ? 'Bill saved as draft!' : 'Bill created successfully!');
      billSubmittedRef.current = true;
      clearDraft('billing');
      setActiveTab((billForm.bill_number || '').startsWith('QTN') ? 'non-gst-bills' : 'gst-bills');
      refreshBills();
      resetBillForm();
      setShowCreateBill(false);
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('duplicate')) {
        // Duplicate bill number — fetch fresh bills and regenerate
        try {
          const freshData = await billingService.getBills();
          const freshItems = Array.isArray(freshData) ? freshData : (freshData as any)?.items || [];
          const freshBillNo = generateNextBillNumber(freshItems.map((b: any) => ({ ...b, id: String(b.id) })));
          setBillForm(prev => ({ ...prev, bill_number: freshBillNo }));
          toast.error('Bill number was already used. A new number has been generated — please try again.');
        } catch {
          toast.error('Duplicate bill number. Please change the bill number and try again.');
        }
      } else {
        toast.error(err.message || 'Failed to create bill');
      }
    }
  };

  const handleBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performBillCreate(false);
  };

  const handleSaveAsDraft = async () => {
    await performBillCreate(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const bill = bills.find(b => b.id === paymentForm.billId);
    if (!bill) return;

    try {
      await billingService.createPayment(bill.id, {
        date: paymentForm.date,
        amount: paymentForm.amount,
        method: paymentForm.method,
        reference: paymentForm.reference,
        received_by: paymentForm.receivedBy,
        notes: paymentForm.notes,
      });
      toast.success('Payment recorded successfully!');
      refreshBills();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment');
    }
    resetPaymentForm();
    setIsPaymentDialogOpen(false);
  };

  const resetBillForm = () => {
    setErrors({});
    setBillForm({
      date: new Date().toISOString().split('T')[0],
      client_id: '',
      items: [],
      bill_number: generateNextBillNumber(bills),
      notes: '',
      created_by: 'Admin',
      payment_type: 'cash',
      payment_method: 'cash',
      gst: 18,
      invoiceType: 'b2b',
      gst_number: '',
      place_of_supply: '33-Tamil Nadu',
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      terms_conditions: 'Thanks for doing business with us!',
    });
    setCurrentItem({ itemId: '', quantity: 0, discount: 0 });
    setSelectedCategory('');
    setSelectedSubcategory('');
    setOrderBillData(null);
    setEditingItemIndex(null);
    setEditingItem(null);
    setClientSearchQuery('');
    setClientMobile('');
    setShowClientDropdown(false);
    setItemEntryRows([{ id: 1, itemId: '', itemName: '', hsnSac: '', gstRate: 18, quantity: 1, unit: 'Pcs', price: 0, discount: 0 }]);
    setItemRowErrors({});
    setActiveRowDropdown(null);
    setAddons([]);
    setNewAddon({ title: '', description: '', amount: 0 });
    setShowAddonForm(false);
    setEditingAddonIndex(null);
    setEditingAddon(null);
    setAddonErrors({});
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      billId: '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      method: 'cash',
      reference: '',
      receivedBy: 'Admin',
      notes: '',
    });
  };

  // Generate a clean bill PDF in a new window
  const generateBillPDF = async (bill: Bill, action: 'print' | 'download' = 'print') => {
    const clientAddress = getBillClientAddress(bill);
    const placeOfSupply = (bill as any).place_of_supply || '33-Tamil Nadu';
    const termsConditions = (bill as any).terms_conditions || 'Thanks for doing business with us!';
    const isQuotation = bill.bill_no.startsWith('QTN');
    const docTitle = isQuotation ? 'Quotation' : 'Tax Invoice';
    const balance = bill.grand_total - bill.paid_amount;
    const pdfIsIntraState = placeOfSupply.startsWith('33-');

    // Build item rows with serial numbers
    let totalQty = 0;
    const itemsRows = bill.items.map((item, idx) => {
      const taxablePrice = item.unit_price * (1 - (item.discount || 0) / 100);
      const taxableTotal = taxablePrice * item.quantity;
      const gstAmt = taxableTotal * ((item.tax || 0) / 100);
      const finalRate = taxablePrice * (1 + (item.tax || 0) / 100);
      totalQty += item.quantity;
      if (isQuotation) {
        return `
        <tr>
          <td class="tc">${idx + 1}</td>
          <td>
            <div class="item-name">${item.name}</div>
            ${item.category ? `<div class="item-cat">${item.category}</div>` : ''}
          </td>
          <td class="tc">${item.quantity}</td>
          <td class="tc">${item.unit || 'Pcs'}</td>
          <td class="tr">${fmtCur(item.unit_price)}</td>
          <td class="tr bold">${fmtCur(item.total)}</td>
        </tr>`;
      }
      return `
        <tr>
          <td class="tc">${idx + 1}</td>
          <td>
            <div class="item-name">${item.name}</div>
            ${item.category ? `<div class="item-cat">${item.category}</div>` : ''}
          </td>
          <td class="tc">${item.hsn_sac || '-'}</td>
          <td class="tc">${item.quantity}</td>
          <td class="tc">${item.unit || 'Pcs'}</td>
          <td class="tr">${fmtCur(item.unit_price)}</td>
          <td class="tr">${fmtCur(taxablePrice)}</td>
          <td class="tr">${fmtCur(gstAmt)}</td>
          <td class="tr">${fmtCur(finalRate)}</td>
          <td class="tr bold">${fmtCur(item.total)}</td>
        </tr>`;
    }).join('');

    // HSN/SAC tax breakdown - group items by hsn_sac + tax rate
    const hsnMap: Record<string, { rate: number; taxable: number; cgst: number; sgst: number; total: number }> = {};
    bill.items.forEach(item => {
      const hsn = item.hsn_sac || '-';
      const itemRate = item.tax || 0;
      const taxablePrice = item.unit_price * (1 - (item.discount || 0) / 100);
      const taxableAmt = taxablePrice * item.quantity;
      const halfRate = itemRate / 2;
      const halfTax = taxableAmt * (halfRate / 100);
      const key = `${hsn}_${itemRate}`;
      if (!hsnMap[key]) hsnMap[key] = { rate: itemRate, taxable: 0, cgst: 0, sgst: 0, total: 0 };
      hsnMap[key].taxable += taxableAmt;
      hsnMap[key].cgst += halfTax;
      hsnMap[key].sgst += halfTax;
      hsnMap[key].total += halfTax * 2;
    });

    const hsnRows = Object.entries(hsnMap).map(([key, v]) => {
      const hsn = key.split('_')[0];
      if (pdfIsIntraState) {
        const halfRate = v.rate / 2;
        return `
        <tr>
          <td>${hsn}</td>
          <td class="tr">${fmtCur(v.taxable)}</td>
          <td class="tc">${halfRate}%</td>
          <td class="tr">${fmtCur(v.cgst)}</td>
          <td class="tc">${halfRate}%</td>
          <td class="tr">${fmtCur(v.sgst)}</td>
          <td class="tr bold">${fmtCur(v.total)}</td>
        </tr>`;
      } else {
        return `
        <tr>
          <td>${hsn}</td>
          <td class="tr">${fmtCur(v.taxable)}</td>
          <td class="tc">${v.rate}%</td>
          <td class="tr">${fmtCur(v.total)}</td>
          <td class="tr bold">${fmtCur(v.total)}</td>
        </tr>`;
      }
    }).join('');

    const hsnTotals = Object.values(hsnMap).reduce((a, v) => ({
      taxable: a.taxable + v.taxable, cgst: a.cgst + v.cgst, sgst: a.sgst + v.sgst, total: a.total + v.total
    }), { taxable: 0, cgst: 0, sgst: 0, total: 0 });

    // Number to Indian words
    const numToWords = (n: number): string => {
      if (n === 0) return 'Zero';
      const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
      const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
      const convert = (num: number): string => {
        if (num < 20) return ones[num];
        if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
        if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + convert(num % 100) : '');
        if (num < 100000) return convert(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + convert(num % 1000) : '');
        if (num < 10000000) return convert(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + convert(num % 100000) : '');
        return convert(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + convert(num % 10000000) : '');
      };
      const rupees = Math.floor(n);
      const paise = Math.round((n - rupees) * 100);
      let result = convert(rupees) + ' Rupees';
      if (paise > 0) result += ' and ' + convert(paise) + ' Paise';
      result += ' only';
      return result;
    };

    function fmtCur(v: number) { return '₹ ' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${bill.bill_no} - ${docTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: #f5f6f8; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1f2937;
      font-size: 12px;
      line-height: 1.5;
      padding: 24px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }

    /* ===== Header ===== */
    .header {
      background: linear-gradient(90deg, #1e3a8a 0%, #2563eb 100%);
      color: #ffffff;
      padding: 22px 28px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .header .brand .company-name { font-size: 22px; font-weight: 700; letter-spacing: 0.2px; }
    .header .brand .company-tag { font-size: 11px; opacity: 0.85; margin-top: 2px; }
    .header .brand .company-meta { font-size: 11px; opacity: 0.9; margin-top: 10px; line-height: 1.6; }
    .header .doc-meta { text-align: right; }
    .header .doc-meta .doc-title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
    }
    .header .doc-meta .doc-sub { font-size: 11px; opacity: 0.85; margin-top: 2px; }
    .header .doc-meta .meta-grid {
      margin-top: 14px;
      display: grid;
      grid-template-columns: auto auto;
      gap: 4px 14px;
      font-size: 11.5px;
    }
    .header .doc-meta .meta-grid .k { opacity: 0.8; text-align: right; }
    .header .doc-meta .meta-grid .v { font-weight: 600; text-align: right; }
    .status-pill {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.4);
      margin-top: 6px;
    }

    /* ===== Parties (Bill To / Ship To) ===== */
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 0; padding: 18px 28px 6px; }
    .party { padding-right: 18px; }
    .party .label {
      font-size: 10px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .party .name { font-size: 14px; font-weight: 700; color: #111827; }
    .party .addr { font-size: 11.5px; color: #374151; line-height: 1.6; margin-top: 2px; }
    .party .kv { font-size: 11.5px; color: #374151; margin-top: 2px; }
    .party .kv span { color: #6b7280; }

    /* ===== Items ===== */
    .items-wrap { padding: 10px 28px 0; }
    .items-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
    .items-table thead th {
      background: #1f2937;
      color: #ffffff;
      padding: 9px 8px;
      font-size: 10.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      border: none;
    }
    .items-table thead th:first-child { border-top-left-radius: 4px; }
    .items-table thead th:last-child { border-top-right-radius: 4px; }
    .items-table tbody td {
      padding: 9px 8px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }
    .items-table tbody tr:nth-child(even) td { background: #fafbfc; }
    .items-table .item-name { font-weight: 600; color: #111827; }
    .items-table .item-cat { color: #6b7280; font-size: 10.5px; }
    .items-table tfoot td {
      background: #f3f4f6;
      padding: 9px 8px;
      font-weight: 700;
      border-top: 2px solid #d1d5db;
    }
    .tc { text-align: center; }
    .tr { text-align: right; }
    .bold { font-weight: 700; }

    /* ===== Bottom section: words + amounts ===== */
    .bottom-section {
      display: grid;
      grid-template-columns: 1fr 320px;
      padding: 18px 28px 0;
      gap: 20px;
    }
    .words-box {
      border: 1px dashed #d1d5db;
      padding: 12px 14px;
      border-radius: 4px;
      background: #fafbfc;
      font-size: 11.5px;
    }
    .words-box .label {
      font-size: 10px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .words-box .words { font-style: italic; color: #1f2937; }
    .amounts-box { border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden; }
    .amounts-box table { width: 100%; border-collapse: collapse; }
    .amounts-box td {
      padding: 7px 12px;
      font-size: 11.5px;
      border-bottom: 1px solid #f3f4f6;
    }
    .amounts-box td:first-child { color: #4b5563; }
    .amounts-box td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
    .amounts-box tr:last-child td { border-bottom: none; }
    .amounts-box .grand-total td {
      background: #1f2937;
      color: #ffffff;
      font-weight: 700;
      font-size: 13px;
      padding: 10px 12px;
    }
    .amounts-box .balance td {
      background: #fef3c7;
      color: #92400e;
      font-weight: 700;
    }
    .amounts-box .paid td {
      color: #047857;
      font-weight: 600;
    }

    /* ===== HSN breakdown ===== */
    .hsn-section { padding: 18px 28px 0; }
    .hsn-section .label {
      font-size: 10px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .hsn-table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    .hsn-table th {
      background: #f3f4f6;
      color: #374151;
      padding: 7px 8px;
      border: 1px solid #e5e7eb;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .hsn-table td {
      padding: 6px 8px;
      border: 1px solid #e5e7eb;
    }
    .hsn-table tfoot td, .hsn-table .total-row td {
      background: #f9fafb;
      font-weight: 700;
    }

    /* ===== Footer: Terms + Signatory ===== */
    .footer-section {
      display: grid;
      grid-template-columns: 1fr 260px;
      padding: 18px 28px 24px;
      gap: 20px;
    }
    .terms-box { font-size: 11px; color: #374151; }
    .terms-box .label {
      font-size: 10px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .terms-box p { line-height: 1.6; }
    .sig-box {
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 14px;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 120px;
      background: #fafbfc;
    }
    .sig-box .for-text { font-size: 12px; font-weight: 700; color: #111827; }
    .sig-box .sig-line {
      margin-top: 32px;
      border-top: 1px solid #9ca3af;
      padding-top: 6px;
      font-size: 10.5px;
      color: #6b7280;
      letter-spacing: 0.4px;
    }

    .page-footer {
      text-align: center;
      padding: 12px 28px 20px;
      font-size: 10px;
      color: #9ca3af;
      border-top: 1px solid #e5e7eb;
      background: #fafbfc;
    }

    @media print {
      body { background: #ffffff; padding: 0; }
      .page { border: none; box-shadow: none; border-radius: 0; max-width: 100%; }
      @page { size: A4; margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="brand">
        <div class="company-name">MES Pro</div>
        <div class="company-tag">Manufacturing Execution System</div>
        ${isQuotation ? '' : `<div class="company-meta">State: ${placeOfSupply}</div>`}
      </div>
      <div class="doc-meta">
        <div class="doc-title">${docTitle}</div>
        <div class="doc-sub">${isQuotation ? 'Quotation Document' : 'Original for Recipient'}</div>
        <div class="meta-grid">
          <div class="k">${isQuotation ? 'Quotation No.' : 'Invoice No.'}</div>
          <div class="v">${bill.bill_no}</div>
          <div class="k">Date</div>
          <div class="v">${new Date(bill.date).toLocaleDateString('en-GB')}</div>
          ${isQuotation ? '' : `<div class="k">Place of Supply</div>
          <div class="v">${placeOfSupply}</div>`}
        </div>
      </div>
    </div>

    <!-- Parties -->
    <div class="parties">
      <div class="party">
        <div class="label">Bill To</div>
        <div class="name">${bill.client_name}</div>
        <div class="addr">${clientAddress}</div>
        ${!isQuotation && bill.client_gst ? `<div class="kv"><span>GSTIN:</span> ${bill.client_gst}</div>` : ''}
        ${isQuotation ? '' : `<div class="kv"><span>State:</span> ${placeOfSupply}</div>`}
      </div>
      <div class="party">
        <div class="label">${isQuotation ? 'Quotation Summary' : 'Payment Summary'}</div>
        <div class="kv"><span>Payment Status:</span> <strong>${(bill.payment_status || 'Pending').toUpperCase()}</strong></div>
        <div class="kv"><span>Payment Type:</span> ${(bill.payment_type || '—')}</div>
        <div class="kv"><span>Amount Paid:</span> ${fmtCur(bill.paid_amount)}</div>
        <div class="kv"><span>Balance Due:</span> <strong style="color:${balance > 0 ? '#b91c1c' : '#047857'};">${fmtCur(balance)}</strong></div>
      </div>
    </div>

    <!-- Items -->
    <div class="items-wrap">
      <table class="items-table">
        <thead>
          <tr>
            <th style="width:32px;">#</th>
            <th style="text-align:left;">Item Name</th>
            ${isQuotation ? '' : '<th>HSN/SAC</th>'}
            <th>Qty</th>
            <th>Unit</th>
            <th>Price/Unit</th>
            ${isQuotation ? '' : '<th>Taxable</th><th>GST</th><th>Final Rate</th>'}
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
        <tfoot>
          ${isQuotation ? `<tr>
            <td class="tc" colspan="2">Total</td>
            <td class="tr">${totalQty}</td>
            <td colspan="2"></td>
            <td class="tr">${fmtCur(bill.grand_total)}</td>
          </tr>` : `<tr>
            <td class="tc" colspan="3">Total</td>
            <td class="tr">${totalQty}</td>
            <td colspan="3"></td>
            <td class="tr">${fmtCur(bill.total_tax)}</td>
            <td></td>
            <td class="tr">${fmtCur(bill.grand_total)}</td>
          </tr>`}
        </tfoot>
      </table>
    </div>

    <!-- Amount in Words + Amounts -->
    <div class="bottom-section">
      <div class="words-box">
        <div class="label">${isQuotation ? 'Quotation' : 'Invoice'} Amount In Words</div>
        <div class="words">${numToWords(bill.grand_total)}</div>
      </div>
      <div class="amounts-box">
        <table>
          <tr><td>Sub Total</td><td>${fmtCur(bill.subtotal)}</td></tr>
          ${bill.total_discount > 0 ? `<tr><td>Discount</td><td>- ${fmtCur(bill.total_discount)}</td></tr>` : ''}
          ${!isQuotation && bill.total_tax > 0 ? (pdfIsIntraState
            ? `<tr><td>CGST</td><td>${fmtCur(bill.total_tax / 2)}</td></tr><tr><td>SGST</td><td>${fmtCur(bill.total_tax / 2)}</td></tr>`
            : `<tr><td>IGST</td><td>${fmtCur(bill.total_tax)}</td></tr>`) : ''}
          <tr class="grand-total"><td>Grand Total</td><td>${fmtCur(bill.grand_total)}</td></tr>
          <tr class="paid"><td>Paid</td><td>${fmtCur(bill.paid_amount)}</td></tr>
          <tr class="balance"><td>Balance Due</td><td>${fmtCur(balance)}</td></tr>
        </table>
      </div>
    </div>

    <!-- HSN Breakdown -->
    ${!isQuotation && bill.total_tax > 0 ? `
    <div class="hsn-section">
      <div class="label">Tax Breakdown</div>
      <table class="hsn-table">
        <thead>
          ${pdfIsIntraState ? `
          <tr>
            <th rowspan="2">HSN/SAC</th>
            <th rowspan="2">Taxable Amount</th>
            <th colspan="2">CGST</th>
            <th colspan="2">SGST</th>
            <th rowspan="2">Total Tax</th>
          </tr>
          <tr>
            <th>Rate</th>
            <th>Amount</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>` : `
          <tr>
            <th>HSN/SAC</th>
            <th>Taxable Amount</th>
            <th>IGST Rate</th>
            <th>IGST Amount</th>
            <th>Total Tax</th>
          </tr>`}
        </thead>
        <tbody>
          ${hsnRows}
          <tr class="total-row">
            <td class="tc">Total</td>
            <td class="tr">${fmtCur(hsnTotals.taxable)}</td>
            ${pdfIsIntraState ? `
            <td></td>
            <td class="tr">${fmtCur(hsnTotals.cgst)}</td>
            <td></td>
            <td class="tr">${fmtCur(hsnTotals.sgst)}</td>` : `
            <td></td>
            <td class="tr">${fmtCur(hsnTotals.total)}</td>`}
            <td class="tr bold">${fmtCur(hsnTotals.total)}</td>
          </tr>
        </tbody>
      </table>
    </div>` : ''}

    <!-- Terms & Signatory -->
    <div class="footer-section">
      <div class="terms-box">
        <div class="label">Terms &amp; Conditions</div>
        <p>${termsConditions}</p>
        ${bill.notes ? `<div style="margin-top:10px;"><div class="label">Notes</div><p>${bill.notes}</p></div>` : ''}
      </div>
      <div class="sig-box">
        <div class="for-text">For: MES Pro</div>
        <div class="sig-line">Authorized Signatory</div>
      </div>
    </div>

    <div class="page-footer">
      This is a computer generated ${isQuotation ? 'quotation' : 'invoice'} and does not require a physical signature.
    </div>
  </div>
</body>
</html>`;

    if (action === 'download') {
      try {
        const mod: any = await import('html2pdf.js');
        const html2pdf = mod.default || mod;
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-10000px';
        container.style.top = '0';
        container.style.width = '800px';
        container.innerHTML = html;
        document.body.appendChild(container);
        const target = container.querySelector('.bill-container') || container;
        const filename = `${bill.bill_no || 'bill'}.pdf`;
        await html2pdf()
          .set({
            margin: 10,
            filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
          })
          .from(target as HTMLElement)
          .save();
        document.body.removeChild(container);
      } catch (err) {
        console.error('PDF download failed:', err);
        toast.error('Failed to download PDF');
      }
      return;
    }

    const printWindow = window.open('', '_blank', 'width=800,height=1100');
    if (!printWindow) {
      toast.error('Please allow popups to generate PDF');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  // Download bill directly as PDF (no print dialog)
  const downloadBillPDF = (bill: Bill) => generateBillPDF(bill, 'download');

  // Export filtered bills list as CSV download
  const exportBillsCSV = (billsList: Bill[]) => {
    const headers = ['Invoice No', 'Date', 'Client', 'Amount', 'Paid', 'Balance', 'Status', 'Payment Type'];
    const rows = billsList.map(bill => [
      bill.bill_no,
      new Date(bill.date).toLocaleDateString(),
      bill.client_name,
      bill.grand_total,
      bill.paid_amount,
      bill.grand_total - bill.paid_amount,
      bill.payment_status,
      bill.payment_type,
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bills_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Bills exported successfully!');
  };

  const handleViewBill = (bill: Bill) => {
    setViewingBill(bill);
    setShowViewBill(true);
  };

  const handleDeleteBill = (id: string) => {
    setConfirmDelete({ open: true, id });
  };

  const executeDeleteBill = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ open: false, id: '' });
    try {
      await billingService.deleteBill(id);
      toast.success('Bill deleted successfully!');
      refreshBills();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete bill');
    }
  };

  const handleEditBill = (bill: Bill) => {
    setEditingBill(bill);
    const client = clients.find(c => c.id === bill.client_id);
    setBillForm({
      date: bill.date,
      client_id: bill.client_id,
      items: [...bill.items],
      bill_number: bill.bill_no,
      notes: bill.notes || '',
      created_by: bill.created_by,
      payment_type: bill.payment_type,
      payment_method: (bill.payment_method as any) || 'cash',
      gst: bill.gst_rate,
      invoiceType: bill.client_gst ? 'b2b' : 'b2c',
      gst_number: bill.client_gst || '',
      place_of_supply: (bill as any).place_of_supply || '33-Tamil Nadu',
      due_date: bill.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      terms_conditions: (bill as any).terms_conditions || 'Thanks for doing business with us!',
    });
    setClientSearchQuery(client ? client.name : (bill.client_name || ''));
    setActiveTab((bill.bill_no || '').startsWith('QTN') ? 'non-gst-bills' : 'gst-bills');
    setItemEntryRows([{ id: 1, itemId: '', itemName: '', hsnSac: '', gstRate: 18, quantity: 1, unit: 'Pcs', price: 0, discount: 0 }]);
    setItemRowErrors({});
    setActiveRowDropdown(null);
    setEditingItemIndex(null);
    setEditingItem(null);
    setShowCreateBill(true);
  };

  const handleUpdateBill = async () => {
    if (!editingBill) return;
    
    const client = getSelectedClient();
    const clientValue = client ? client.name : (clientSearchQuery.trim() || '');
    const errs = validateFields(
      {
        date: billForm.date,
        client: clientValue,
        invoiceType: billForm.invoiceType,
        payment_type: billForm.payment_type,
      },
      {
        date: { required: true, label: 'Date' },
        client: { required: true, label: 'Client' },
        invoiceType: { required: true, label: 'Invoice Type' },
        payment_type: { required: true, label: 'Bill Type' },
      }
    );
    if (billForm.items.length === 0) {
      errs.items = 'At least one item must be added';
    }
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    if (!client) return;

    const totals = calculateBillTotals();

    try {
      await billingService.updateBill(editingBill.id, {
        bill_no: billForm.bill_number || editingBill.bill_no,
        date: billForm.date,
        client_id: client.id === 'CUSTOM' ? null : client.id,
        client_name: client.name,
        client_address: client.address || '',
        client_gst: billForm.gst_number || client.gstNo || '',
        items: billForm.items,
        subtotal: Math.round(totals.subtotal),
        total_discount: Math.round(totals.totalDiscount),
        total_tax: Math.round(totals.totalTax),
        grand_total: Math.round(totals.grandTotal),
        payment_type: billForm.payment_type,
        notes: billForm.notes,
        gst_rate: billForm.items.length > 0 ? Math.max(...billForm.items.map(i => i.tax || 0)) : 0,
      });
      toast.success('Bill updated successfully!');
      setActiveTab((billForm.bill_number || '').startsWith('QTN') ? 'non-gst-bills' : 'gst-bills');
      refreshBills();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update bill');
    }
    setShowCreateBill(false);
    setEditingBill(null);
    resetBillForm();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'partial':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pending':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'overdue':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-3 h-3" />;
      case 'partial':
        return <Clock className="w-3 h-3" />;
      case 'pending':
        return <AlertCircle className="w-3 h-3" />;
      case 'overdue':
        return <XCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Wallet className="w-3 h-3" />;
      case 'upi':
      case 'bank':
        return <CreditCard className="w-3 h-3" />;
      case 'card':
        return <CreditCard className="w-3 h-3" />;
      default:
        return <IndianRupee className="w-3 h-3" />;
    }
  };

  const pendingBills = dateFilteredBills.filter(b => b.payment_status !== 'paid');

  // Handle payment status change from dropdown
  const handlePaymentStatusChange = async (billId: string, newStatus: 'paid' | 'partial' | 'pending' | 'overdue') => {
    try {
      await billingService.updateBill(billId, { payment_status: newStatus });
      setBills(prev => prev.map(b => b.id === billId ? { ...b, payment_status: newStatus } : b));
      toast.success(`Payment status updated to ${newStatus}`);
    } catch {
      toast.error('Failed to update payment status');
    }
  };

  // If showing view bill page, render it instead of the main view
  if (showViewBill && viewingBill) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowViewBill(false);
                setViewingBill(null);
              }}
            >
              ← {t('back')}
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{t('invoiceDetails')}</h1>
              <p className="text-gray-500">{viewingBill.bill_no}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => generateBillPDF(viewingBill)}>
              <Printer className="h-4 w-4 mr-2" />
              {t('print')}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Header with Status */}
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">{viewingBill.bill_no}</h2>
                  <p className="text-gray-500 mt-1">Date: {new Date(viewingBill.date).toLocaleDateString()}</p>
                </div>
                <Badge className={`${getStatusColor(viewingBill.payment_status)} flex items-center gap-1 text-sm px-3 py-1`}>
                  {getStatusIcon(viewingBill.payment_status)}
                  {viewingBill.payment_status.charAt(0).toUpperCase() + viewingBill.payment_status.slice(1)}
                </Badge>
              </div>

              {/* Client & Payment Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 p-5 rounded-lg border">
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    {t('billTo')}
                  </h3>
                  <p className="font-medium text-lg">{viewingBill.client_name}</p>
                  <p className="text-gray-600 mt-1">{getBillClientAddress(viewingBill)}</p>
                  {viewingBill.client_gst && <p className="text-gray-500 text-sm mt-2">GSTIN: {viewingBill.client_gst}</p>}
                </div>
                <div className="bg-gray-50 p-5 rounded-lg border">
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {t('paymentInfo')}
                  </h3>
                  <div className="space-y-2">
                    <p className="flex justify-between"><span className="text-gray-600">{t('billNumber')}</span> <span>{viewingBill.bill_no}</span></p>
                    <p className="flex justify-between"><span className="text-gray-600">Amount Paid:</span> <span className="text-emerald-600 font-medium">₹{viewingBill.paid_amount.toLocaleString()}</span></p>
                    <p className="flex justify-between font-semibold"><span>Balance:</span> <span className="text-red-600">₹{(viewingBill.grand_total - viewingBill.paid_amount).toLocaleString()}</span></p>
                  </div>
                </div>
                <div className="bg-gray-50 p-5 rounded-lg border">
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    {t('billType')}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Type:</span>
                      <Badge className={viewingBill.payment_type === 'cash' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {viewingBill.payment_type === 'cash' ? 'Cash' : 'Credit'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">GST:</span>
                      <Badge variant="outline">Per Item</Badge>
                    </div>
                    <p className="text-gray-500 text-sm">Created by: {viewingBill.created_by}</p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">{t('item')}</TableHead>
                      <TableHead className="font-semibold">{t('qty')}</TableHead>
                      <TableHead className="font-semibold">{t('unitPrice')}</TableHead>
                      <TableHead className="font-semibold">{t('discount')}</TableHead>
                      <TableHead className="font-semibold">{t('tax')}</TableHead>
                      <TableHead className="text-right font-semibold">{t('total')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingBill.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₹{item.unit_price.toLocaleString()}</TableCell>
                        <TableCell>{item.discount}%</TableCell>
                        <TableCell>{item.tax}%</TableCell>
                        <TableCell className="text-right font-semibold">₹{item.total.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Summary */}
              <div className="flex justify-end">
                <div className="w-80 bg-gray-50 p-5 rounded-lg border">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('subtotal')}:</span>
                      <span>₹{viewingBill.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-red-600">
                      <span>{t('discount')}:</span>
                      <span>-₹{viewingBill.total_discount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">GST:</span>
                      <span>₹{viewingBill.total_tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-xl border-t pt-3">
                      <span>{t('grandTotal')}:</span>
                      <span className="text-blue-600">₹{viewingBill.grand_total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {viewingBill.notes && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h3 className="font-semibold text-gray-700 mb-2">{t('notes')}</h3>
                  <p className="text-gray-600">{viewingBill.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If showing create bill page, render it instead of the main view
  if (showCreateBill) {
    const totals = calculateBillTotals();
    const taxBreakdown = calculateTaxBreakdown();
    const isQuotation = activeTab === 'non-gst-bills' || (billForm.bill_number || '').startsWith('QTN');
    const hasAnyTax = !isQuotation && billForm.items.some(item => item.tax > 0);
    const isIntraState = billForm.place_of_supply.startsWith('33-');
    const taxableAmount = totals.subtotal - totals.totalDiscount;

    return (
      <div className="p-4 space-y-4 max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              if (!editingBill) { clearDraft('billing'); } else { billSubmittedRef.current = true; }
              setShowCreateBill(false);
              setEditingBill(null);
              resetBillForm();
            }}
          >
            ← {t('back')}
          </Button>
          <h1 className="text-xl font-bold">
            {editingBill
              ? (activeTab === 'non-gst-bills' ? t('editQuotationBill') : t('editInvoice'))
              : (activeTab === 'non-gst-bills' ? t('createNewQuotationBill') : t('createNewInvoice'))
            }
          </h1>
        </div>

        <form ref={billFormRef} onSubmit={handleBillSubmit} noValidate>
          {/* Invoice Details + Client - Compact Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Left: Invoice Details */}
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <FileText className="w-4 h-4" /> {isQuotation ? 'Quotation Details' : 'Invoice Details'}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <div>
                    <Label className="text-xs text-gray-500">{isQuotation ? 'Quotation No.' : 'Invoice No.'}</Label>
                    <Input type="text" value={billForm.bill_number} readOnly className="h-8 text-sm bg-gray-50 font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Date *</Label>
                    <Input type="date" value={billForm.date} onChange={(e) => { setBillForm(prev => ({ ...prev, date: e.target.value })); setErrors(prev => ({ ...prev, date: '' })); }} className="h-8 text-sm" />
                    <FieldError message={errors.date} />
                  </div>
                  <div className="relative" style={{ display: isQuotation ? 'none' : undefined }}>
                    <Label className="text-xs text-gray-500">Place of Supply</Label>
                    <div className="relative">
                      <input
                        type="text"
                        value={posOpen ? posSearch : billForm.place_of_supply}
                        onChange={(e) => { setPosSearch(e.target.value); setPosOpen(true); }}
                        onFocus={() => { setPosSearch(''); setPosOpen(true); }}
                        onBlur={() => setTimeout(() => setPosOpen(false), 150)}
                        placeholder="Search state..."
                        className="w-full h-8 px-2 pr-7 border border-gray-300 rounded-md text-xs"
                      />
                      <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                    {posOpen && (
                      <div className="absolute z-50 w-full mt-0.5 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {INDIAN_STATES.filter(s => s.toLowerCase().includes(posSearch.toLowerCase())).map(s => (
                          <div
                            key={s}
                            className={`px-2 py-1.5 text-xs cursor-pointer hover:bg-blue-50 ${s === billForm.place_of_supply ? 'bg-blue-100 font-semibold' : ''}`}
                            onMouseDown={() => { setBillForm(prev => ({ ...prev, place_of_supply: s })); setPosOpen(false); setPosSearch(''); }}
                          >{s}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: isQuotation ? 'none' : undefined }}>
                    <Label className="text-xs text-gray-500">Invoice Type</Label>
                    <div className={`w-full h-8 px-2 flex items-center border rounded-md text-xs font-medium ${billForm.gst_number.trim() ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                      {billForm.gst_number.trim() ? 'B2B (Business to Business)' : 'B2C (Business to Consumer)'}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Bill Type *</Label>
                    <select value={billForm.payment_type} onChange={(e) => { setBillForm(prev => ({ ...prev, payment_type: e.target.value as 'cash' | 'credit' })); setErrors(prev => ({ ...prev, payment_type: '' })); }} className="w-full h-8 px-2 border border-gray-300 rounded-md text-xs">
                      <option value="cash">{t('cash')}</option>
                      <option value="credit">{t('credit')}</option>
                    </select>
                    <FieldError message={errors.payment_type} />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Payment Method</Label>
                    <select value={billForm.payment_method} onChange={(e) => setBillForm(prev => ({ ...prev, payment_method: e.target.value as any }))} className="w-full h-8 px-2 border border-gray-300 rounded-md text-xs">
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                      <option value="bank">Bank Transfer</option>
                    </select>
                  </div>
                  {billForm.payment_type === 'credit' && (
                    <div>
                      <Label className="text-xs text-gray-500">Due Date</Label>
                      <Input type="date" value={billForm.due_date} onChange={(e) => setBillForm(prev => ({ ...prev, due_date: e.target.value }))} className="h-8 text-sm" />
                    </div>
                  )}
                  {isQuotation && (
                    <>
                      <div>
                        <Label className="text-xs text-gray-500">Valid Until</Label>
                        <Input
                          type="date"
                          value={billForm.due_date || (() => { const d = new Date(billForm.date || new Date()); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; })()}
                          onChange={(e) => setBillForm(prev => ({ ...prev, due_date: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Reference</Label>
                        <Input
                          type="text"
                          placeholder="Enquiry / Order ref."
                          value={billForm.reference || ''}
                          onChange={(e) => setBillForm(prev => ({ ...prev, reference: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-gray-500">Prepared By</Label>
                        <Input
                          type="text"
                          placeholder="Sales person name"
                          value={billForm.prepared_by || ''}
                          onChange={(e) => setBillForm(prev => ({ ...prev, prepared_by: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Right: Bill To (Client) */}
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <Building className="w-4 h-4" /> Bill To
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-gray-500">Client *</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Search client..."
                        value={clientSearchQuery}
                        onChange={(e) => {
                          setClientSearchQuery(e.target.value);
                          setShowClientDropdown(true);
                          setErrors(prev => ({ ...prev, client: '' }));
                          if (!e.target.value) { setBillForm(prev => ({ ...prev, client_id: '' })); setClientMobile(''); }
                        }}
                        onFocus={() => setShowClientDropdown(true)}
                        onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                        className="h-8 text-sm"
                      />
                      {showClientDropdown && clientSearchQuery && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto">
                          {filteredClients.length > 0 ? (
                            <>
                              {filteredClients.map(client => (
                                <div key={client.id} className="px-3 py-1.5 hover:bg-gray-100 cursor-pointer border-b border-gray-50" onMouseDown={(e) => { e.preventDefault(); handleSelectClient(client); }}>
                                  <div className="font-medium text-sm">{client.name}</div>
                                  <div className="text-[10px] text-gray-500">{client.phone} {client.gstNo ? `• GST: ${client.gstNo}` : ''}</div>
                                </div>
                              ))}
                              <div className="px-3 py-1.5 hover:bg-blue-50 cursor-pointer border-t border-gray-200 bg-gray-50" onMouseDown={(e) => { e.preventDefault(); setBillForm(prev2 => ({ ...prev2, client_id: '' })); setShowClientDropdown(false); }}>
                                <div className="font-medium text-blue-600 text-sm">Use "{clientSearchQuery}"</div>
                              </div>
                            </>
                          ) : (
                            <div className="px-3 py-1.5 hover:bg-blue-50 cursor-pointer" onMouseDown={(e) => { e.preventDefault(); setBillForm(prev2 => ({ ...prev2, client_id: '' })); setShowClientDropdown(false); }}>
                              <div className="font-medium text-blue-600 text-sm">Use "{clientSearchQuery}" as new client</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <FieldError message={errors.client} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <div>
                      <Label className="text-xs text-gray-500">Mobile</Label>
                      <Input type="text" placeholder="e.g. 9876543210" value={clientMobile} onChange={(e) => setClientMobile(e.target.value.replace(/[^0-9+\s]/g, ''))} className="h-8 text-sm" maxLength={15} />
                    </div>
                    <div style={{ display: isQuotation ? 'none' : undefined }}>
                      <Label className="text-xs text-gray-500">GSTIN</Label>
                      <Input type="text" placeholder="e.g. 33AUJPM8458P1ZR" value={billForm.gst_number} onChange={(e) => { const val = e.target.value.toUpperCase(); setBillForm(prev => ({ ...prev, gst_number: val, invoiceType: val.trim() ? 'b2b' : 'b2c' })); }} className="h-8 text-sm font-mono" maxLength={15} />
                    </div>
                  </div>
                  {/* Selected client info display */}
                  {(() => {
                    const sel = getSelectedClient();
                    if (!sel || sel.id === 'CUSTOM') return null;
                    return (
                      <div className="bg-gray-50 rounded-md p-2 text-xs text-gray-600 border">
                        <p className="font-semibold text-gray-800">{sel.name}</p>
                        {sel.address && <p className="mt-0.5">{sel.address}</p>}
                        {sel.gstNo && <p className="mt-0.5 font-mono text-gray-500">GSTIN: {sel.gstNo}</p>}
                        {'phone' in sel && sel.phone && <p className="mt-0.5">Contact: {sel.phone}</p>}
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Addon Form - Only show when showAddonForm is true */}
          {showAddonForm && (
            <Card className="border-blue-200 bg-blue-50/30 mb-4 shadow-sm">
              <CardHeader className="py-2 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{t('addAddonAdditionalCharge')}</CardTitle>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddonForm(false)} className="text-gray-500 hover:text-gray-700 h-6 w-6 p-0">✕</Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Title *</Label>
                    <Input placeholder="e.g. Installation" value={newAddon.title} onChange={(e) => { setNewAddon({ ...newAddon, title: e.target.value }); setAddonErrors(prev => ({ ...prev, title: '' })); }} className="h-8 text-sm" />
                    <FieldError message={addonErrors.title} />
                  </div>
                  <div>
                    <Label className="text-xs">Description *</Label>
                    <Input placeholder="Description" value={newAddon.description} onChange={(e) => { setNewAddon({ ...newAddon, description: e.target.value }); setAddonErrors(prev => ({ ...prev, description: '' })); }} className="h-8 text-sm" />
                    <FieldError message={addonErrors.description} />
                  </div>
                  <div>
                    <Label className="text-xs">Amount *</Label>
                    <div className="flex gap-1">
                      <Input type="number" min="0" placeholder="0" value={newAddon.amount || ''} onChange={(e) => { setNewAddon({ ...newAddon, amount: Number(e.target.value) }); setAddonErrors(prev => ({ ...prev, amount: '' })); }} onKeyDown={blockInvalidNumberKeys} className="h-8 text-sm" />
                      <Button type="button" onClick={addAddon} size="sm" className="h-8 px-2"><Plus className="h-3 w-3" /></Button>
                    </div>
                    <FieldError message={addonErrors.amount} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items Section */}
          <Card className="shadow-sm mb-4 overflow-visible">
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <Package className="w-4 h-4" /> Items
                </CardTitle>
                <div className="flex gap-2">
                  {!showAddonForm && (
                    <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => setShowAddonForm(true)}>
                      <Plus className="w-3 h-3 mr-1" /> Addon
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              {/* Item Entry Rows - Compact Table Style */}
              <div className="overflow-visible">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left text-[10px] font-semibold text-gray-500 uppercase py-1 pr-2 w-[24%]">Item *</th>
                      {!isQuotation && <th className="text-left text-[10px] font-semibold text-gray-500 uppercase py-1 pr-2 w-[12%]">HSN/SAC</th>}
                      <th className="text-center text-[10px] font-semibold text-gray-500 uppercase py-1 pr-2 w-[7%]">Qty *</th>
                      <th className="text-left text-[10px] font-semibold text-gray-500 uppercase py-1 pr-2 w-[8%]">Unit</th>
                      <th className="text-right text-[10px] font-semibold text-gray-500 uppercase py-1 pr-2 w-[11%]">Price/Unit</th>
                      <th className="text-center text-[10px] font-semibold text-gray-500 uppercase py-1 pr-2 w-[7%]">Disc %</th>
                      {!isQuotation && <th className="text-center text-[10px] font-semibold text-gray-500 uppercase py-1 pr-2 w-[7%]">GST %</th>}
                      <th className="text-right text-[10px] font-semibold text-gray-500 uppercase py-1 pr-2 w-[10%]">Amount</th>
                      <th className="w-[8%]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemEntryRows.map((row, index) => {
                      const rowPrice = row.price > 0 ? row.price : (getSelectedStock(row.itemId)?.unitPrice || 0);
                      const rowSubtotal = rowPrice * row.quantity;
                      const rowDiscAmt = (rowSubtotal * row.discount) / 100;
                      const rowTaxable = rowSubtotal - rowDiscAmt;
                      const rowItemGst = row.gstRate ?? 18;
                      const rowTax = (rowTaxable * rowItemGst) / 100;
                      const rowTotal = rowTaxable + rowTax;
                      return (
                        <tr key={row.id} className="border-b border-gray-100">
                          <td className="py-1 pr-2">
                            <div className="relative">
                              <Input
                                ref={(el) => { itemInputRefs.current[row.id] = el; }}
                                type="text"
                                placeholder="Search item..."
                                value={row.itemName}
                                onChange={(e) => { updateItemRow(row.id, 'itemName', e.target.value); updateItemRow(row.id, 'itemId', ''); setActiveRowDropdown(row.id); }}
                                onFocus={() => setActiveRowDropdown(row.id)}
                                onBlur={() => setTimeout(() => setActiveRowDropdown(null), 300)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && itemEntryRows.some(r => r.itemId)) { e.preventDefault(); addAllItemsToBill(); } }}
                                className={`h-7 text-xs ${itemRowErrors[row.id]?.itemId ? 'border-red-400' : ''}`}
                              />
                              <FieldError message={itemRowErrors[row.id]?.itemId} />
                              {activeRowDropdown === row.id && (
                                <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-auto">
                                  {stockItems.filter(s => s.currentStock > 0 && s.name.toLowerCase().includes(row.itemName.toLowerCase())).length > 0 ? (
                                    stockItems.filter(s => s.currentStock > 0 && s.name.toLowerCase().includes(row.itemName.toLowerCase())).map(stock => (
                                      <div key={stock.id} className="px-2 py-1 hover:bg-gray-100 cursor-pointer border-b border-gray-50 last:border-b-0" onMouseDown={(e) => { e.preventDefault(); selectItemForRow(row.id, stock); }}>
                                        <div className="font-medium text-xs">{stock.name}</div>
                                        <div className="text-[10px] text-gray-500">₹{stock.unitPrice} • {stock.currentStock} {stock.unit || 'Pcs'}</div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="px-2 py-1 text-center text-gray-500 text-xs">{t('noItemsFound')}</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-1 pr-2" style={{ display: isQuotation ? 'none' : undefined }}>
                            <Input type="text" placeholder="HSN" value={row.hsnSac} onChange={(e) => updateItemRow(row.id, 'hsnSac', e.target.value)} className="h-7 text-xs font-mono" maxLength={10} />
                          </td>
                          <td className="py-1 pr-2">
                            <Input
                              type="number" min="1" value={row.quantity}
                              onChange={(e) => updateItemRow(row.id, 'quantity', Math.max(0, Number(e.target.value) || 0))}
                              onFocus={(e) => e.target.select()}
                              className={`h-7 text-xs text-center ${itemRowErrors[row.id]?.quantity ? 'border-red-400' : ''}`}
                              onKeyDown={(e) => { blockInvalidNumberKeys(e); if (e.key === 'Enter' && itemEntryRows.some(r => r.itemId)) { e.preventDefault(); addAllItemsToBill(); } }}
                            />
                            <FieldError message={itemRowErrors[row.id]?.quantity} />
                          </td>
                          <td className="py-1 pr-2">
                            <select value={row.unit} onChange={(e) => updateItemRow(row.id, 'unit', e.target.value)} className="w-full h-7 px-1 border border-gray-300 rounded-md text-xs">
                              {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </td>
                          <td className="py-1 pr-2">
                            <Input
                              type="number" min="0" value={row.price || ''} placeholder="Auto"
                              onChange={(e) => updateItemRow(row.id, 'price', Number(e.target.value))}
                              className="h-7 text-xs text-right"
                              onKeyDown={(e) => { blockInvalidNumberKeys(e); if (e.key === 'Enter' && itemEntryRows.some(r => r.itemId)) { e.preventDefault(); addAllItemsToBill(); } }}
                            />
                          </td>
                          <td className="py-1 pr-2">
                            <Input
                              type="number" min="0" max="100" value={row.discount}
                              onChange={(e) => updateItemRow(row.id, 'discount', Number(e.target.value))}
                              className="h-7 text-xs text-center"
                              onKeyDown={(e) => {
                                blockInvalidNumberKeys(e);
                                if (e.key === 'Enter' && itemEntryRows.some(r => r.itemId)) { e.preventDefault(); addAllItemsToBill(); }
                                else if (e.key === 'Tab' && !e.shiftKey && index === itemEntryRows.length - 1) {
                                  e.preventDefault();
                                  const lastRow = itemEntryRows[itemEntryRows.length - 1];
                                  const errs: { itemId?: string; quantity?: string } = {};
                                  if (!lastRow.itemId) errs.itemId = 'Select an item';
                                  if (!lastRow.quantity || lastRow.quantity < 1) errs.quantity = 'Enter quantity';
                                  if (Object.keys(errs).length) { setItemRowErrors(prev => ({ ...prev, [lastRow.id]: errs })); return; }
                                  addNewItemRow();
                                }
                              }}
                            />
                          </td>
                          <td className="py-1 pr-2" style={{ display: isQuotation ? 'none' : undefined }}>
                            <select value={row.gstRate} onChange={(e) => updateItemRow(row.id, 'gstRate', Number(e.target.value))} className="w-full h-7 px-1 border border-gray-300 rounded-md text-xs text-center">
                              <option value={0}>0%</option>
                              <option value={5}>5%</option>
                              <option value={12}>12%</option>
                              <option value={18}>18%</option>
                              <option value={28}>28%</option>
                            </select>
                          </td>
                          <td className="py-1 pr-2 text-right text-xs font-medium text-gray-700">
                            {row.itemId ? `₹${Math.round(rowTotal).toLocaleString()}` : '-'}
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

              {/* Add to Bill Button */}
              <div className="flex justify-end pt-2">
                <Button type="button" onClick={addAllItemsToBill} disabled={!itemEntryRows.some(row => row.itemId)} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8">
                  <Plus className="w-3 h-3 mr-1" /> {t('addToBill')}
                </Button>
              </div>

              {/* Added Items Table - Invoice Style */}
              {(billForm.items.length > 0 || addons.length > 0) && (
                <div className="mt-4 border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 font-semibold text-gray-600 w-8">#</th>
                        <th className="text-left py-2 px-2 font-semibold text-gray-600">Item Name</th>
                        {!isQuotation && <th className="text-left py-2 px-2 font-semibold text-gray-600 w-20">HSN/SAC</th>}
                        <th className="text-center py-2 px-2 font-semibold text-gray-600 w-14">Qty</th>
                        <th className="text-center py-2 px-2 font-semibold text-gray-600 w-12">Unit</th>
                        <th className="text-right py-2 px-2 font-semibold text-gray-600 w-20">Price/Unit</th>
                        {!isQuotation && <th className="text-right py-2 px-2 font-semibold text-gray-600 w-20">Taxable</th>}
                        {!isQuotation && <th className="text-center py-2 px-2 font-semibold text-gray-600 w-16">GST %</th>}
                        {!isQuotation && <th className="text-right py-2 px-2 font-semibold text-gray-600 w-20">Final Rate</th>}
                        <th className="text-right py-2 px-2 font-semibold text-gray-600 w-20">Amount</th>
                        <th className="w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {billForm.items.map((item, index) => {
                        const itemSub = item.unit_price * item.quantity;
                        const itemDiscAmt = (itemSub * item.discount) / 100;
                        const itemTaxable = (item.unit_price * item.quantity - (item.unit_price * item.quantity * item.discount / 100)) / item.quantity;
                        const itemGstAmt = (itemSub - itemDiscAmt) * item.tax / 100;
                        const finalRate = (item.total / item.quantity);
                        return (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50/50">
                            <td className="py-1.5 px-2 text-gray-500">{index + 1}</td>
                            <td className="py-1.5 px-2 font-medium">{item.name}</td>
                            {!isQuotation && <td className="py-1.5 px-2 text-gray-500 font-mono">{item.hsn_sac || '-'}</td>}
                            <td className="py-1.5 px-2 text-center">
                              {editingItemIndex === index ? (
                                <Input type="number" value={editingItem?.quantity || 0} onChange={(e) => setEditingItem(prev => prev ? {...prev, quantity: Number(e.target.value)} : null)} onKeyDown={blockInvalidNumberKeys} className="w-14 h-6 text-xs text-center" />
                              ) : item.quantity}
                            </td>
                            <td className="py-1.5 px-2 text-center text-gray-500">{item.unit || 'Pcs'}</td>
                            <td className="py-1.5 px-2 text-right">
                              {editingItemIndex === index ? (
                                <Input type="number" value={editingItem?.unit_price || 0} onChange={(e) => setEditingItem(prev => prev ? {...prev, unit_price: Number(e.target.value)} : null)} onKeyDown={blockInvalidNumberKeys} className="w-16 h-6 text-xs text-right" />
                              ) : `₹${item.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                            </td>
                            {!isQuotation && <td className="py-1.5 px-2 text-right text-gray-600">₹{itemTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>}
                            {!isQuotation && <td className="py-1.5 px-2 text-center text-gray-600">{item.tax}%</td>}
                            {!isQuotation && <td className="py-1.5 px-2 text-right font-medium">₹{finalRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>}
                            <td className="py-1.5 px-2 text-right font-bold">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="py-1.5 px-2">
                              {editingItemIndex === index ? (
                                <div className="flex gap-0.5 justify-center">
                                  <Button type="button" size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={saveEditItem}><CheckCircle className="h-3 w-3 text-green-500" /></Button>
                                  <Button type="button" size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={cancelEditItem}><XCircle className="h-3 w-3 text-gray-400" /></Button>
                                </div>
                              ) : (
                                <div className="flex gap-0.5 justify-center">
                                  <Button type="button" size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => startEditItem(index)}><Edit className="h-3 w-3 text-blue-500" /></Button>
                                  <Button type="button" size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => removeItemFromBill(index)}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Addon rows */}
                      {addons.map((addon, index) => (
                        <tr key={`addon-${addon.id}`} className="border-b border-gray-100 bg-blue-50/30">
                          <td className="py-1.5 px-2"></td>
                          <td className="py-1.5 px-2">
                            {editingAddonIndex === index ? (
                              <div className="flex gap-1 items-center">
                                <Badge variant="outline" className="bg-blue-100 text-blue-700 text-[9px] h-4">Addon</Badge>
                                <Input value={editingAddon?.title || ''} onChange={(e) => setEditingAddon(prev => prev ? {...prev, title: e.target.value} : null)} className="w-24 h-6 text-xs" />
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="bg-blue-100 text-blue-700 text-[9px] h-4">Addon</Badge>
                                <span>{addon.title}</span>
                                {addon.description && <span className="text-[10px] text-gray-500">({addon.description})</span>}
                              </div>
                            )}
                          </td>
                          {!isQuotation && <td className="py-1.5 px-2">-</td>}
                          <td className="py-1.5 px-2 text-center">1</td>
                          <td className="py-1.5 px-2 text-center">-</td>
                          <td className="py-1.5 px-2 text-right">
                            {editingAddonIndex === index ? (
                              <Input type="number" value={editingAddon?.amount || 0} onChange={(e) => setEditingAddon(prev => prev ? {...prev, amount: Number(e.target.value)} : null)} onKeyDown={blockInvalidNumberKeys} className="w-16 h-6 text-xs text-right" />
                            ) : `₹${addon.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                          </td>
                          {!isQuotation && <td className="py-1.5 px-2 text-right">-</td>}
                          {!isQuotation && <td className="py-1.5 px-2 text-right">-</td>}
                          {!isQuotation && <td className="py-1.5 px-2 text-right">-</td>}
                          <td className="py-1.5 px-2 text-right font-bold text-blue-600">₹{addon.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="py-1.5 px-2">
                            {editingAddonIndex === index ? (
                              <div className="flex gap-0.5 justify-center">
                                <Button type="button" size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={saveEditAddon}><CheckCircle className="h-3 w-3 text-green-500" /></Button>
                                <Button type="button" size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={cancelEditAddon}><XCircle className="h-3 w-3 text-gray-400" /></Button>
                              </div>
                            ) : (
                              <div className="flex gap-0.5 justify-center">
                                <Button type="button" size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => startEditAddon(index)}><Edit className="h-3 w-3 text-blue-500" /></Button>
                                <Button type="button" size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => removeAddon(addon.id)}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                        <td className="py-2 px-2"></td>
                        <td className="py-2 px-2">Total</td>
                        {!isQuotation && <td className="py-2 px-2"></td>}
                        <td className="py-2 px-2 text-center">{billForm.items.reduce((s, i) => s + i.quantity, 0)}</td>
                        <td className="py-2 px-2"></td>
                        <td className="py-2 px-2"></td>
                        {!isQuotation && <td className="py-2 px-2"></td>}
                        {!isQuotation && <td className="py-2 px-2 text-right">₹{Math.round(totals.totalTax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>}
                        {!isQuotation && <td className="py-2 px-2"></td>}
                        <td className="py-2 px-2 text-right text-blue-700">₹{Math.round(totals.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary + Tax Breakdown - Side by Side */}
          {(billForm.items.length > 0 || addons.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Amount Summary */}
              <Card className="shadow-sm">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                    <IndianRupee className="w-4 h-4" /> Amounts
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sub Total</span>
                      <span>₹{Math.round(totals.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {totals.totalDiscount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Discount</span>
                        <span>-₹{Math.round(totals.totalDiscount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {!isQuotation && (
                      <div className="flex justify-between text-gray-600">
                        <span>Taxable Amount</span>
                        <span>₹{taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {hasAnyTax && (
                      isIntraState ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">CGST</span>
                            <span>₹{(totals.totalTax / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">SGST</span>
                            <span>₹{(totals.totalTax / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between">
                          <span className="text-gray-600">IGST</span>
                          <span>₹{totals.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )
                    )}
                    {totals.totalAddons > 0 && (
                      <div className="flex justify-between text-blue-600">
                        <span>Addons</span>
                        <span>+₹{Math.round(totals.totalAddons).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base border-t-2 border-gray-800 pt-2 mt-2">
                      <span>Grand Total</span>
                      <span className="text-blue-700">₹{Math.round(totals.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Balance</span>
                      <span>₹{Math.round(totals.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  {/* Amount in Words */}
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <p className="text-[10px] text-gray-500 uppercase font-semibold">{isQuotation ? 'Amount in Words' : 'Invoice Amount in Words'}</p>
                    <p className="text-xs text-gray-700 font-medium italic">{amountToWords(Math.round(totals.grandTotal))}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Tax Breakdown by HSN */}
              {hasAnyTax && taxBreakdown.length > 0 && (
                <Card className="shadow-sm">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Tax Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0">
                    <table className="w-full text-xs">
                      <thead>
                        {isIntraState ? (
                          <>
                            <tr className="border-b">
                              <th className="text-left py-1.5 font-semibold text-gray-600" rowSpan={2}>HSN/SAC</th>
                              <th className="text-right py-1.5 font-semibold text-gray-600" rowSpan={2}>Taxable</th>
                              <th className="text-center py-1 font-semibold text-gray-600 border-b" colSpan={2}>CGST</th>
                              <th className="text-center py-1 font-semibold text-gray-600 border-b" colSpan={2}>SGST</th>
                              <th className="text-right py-1.5 font-semibold text-gray-600" rowSpan={2}>Total Tax</th>
                            </tr>
                            <tr className="border-b">
                              <th className="text-center py-1 font-medium text-gray-500">Rate</th>
                              <th className="text-right py-1 font-medium text-gray-500">Amt</th>
                              <th className="text-center py-1 font-medium text-gray-500">Rate</th>
                              <th className="text-right py-1 font-medium text-gray-500">Amt</th>
                            </tr>
                          </>
                        ) : (
                          <tr className="border-b">
                            <th className="text-left py-1.5 font-semibold text-gray-600">HSN/SAC</th>
                            <th className="text-right py-1.5 font-semibold text-gray-600">Taxable</th>
                            <th className="text-center py-1.5 font-semibold text-gray-600">IGST Rate</th>
                            <th className="text-right py-1.5 font-semibold text-gray-600">IGST Amt</th>
                            <th className="text-right py-1.5 font-semibold text-gray-600">Total Tax</th>
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {taxBreakdown.map((row, idx) => (
                          <tr key={idx} className="border-b border-gray-100">
                            <td className="py-1.5 font-mono">{row.hsn}</td>
                            <td className="py-1.5 text-right">₹{row.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            {isIntraState ? (
                              <>
                                <td className="py-1.5 text-center">{row.rate / 2}%</td>
                                <td className="py-1.5 text-right">₹{row.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="py-1.5 text-center">{row.rate / 2}%</td>
                                <td className="py-1.5 text-right">₹{row.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              </>
                            ) : (
                              <>
                                <td className="py-1.5 text-center">{row.rate}%</td>
                                <td className="py-1.5 text-right">₹{row.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              </>
                            )}
                            <td className="py-1.5 text-right font-medium">₹{row.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-bold border-t">
                          <td className="py-1.5">Total</td>
                          <td className="py-1.5 text-right">₹{taxBreakdown.reduce((s, r) => s + r.taxable, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          {isIntraState ? (
                            <>
                              <td className="py-1.5"></td>
                              <td className="py-1.5 text-right">₹{taxBreakdown.reduce((s, r) => s + r.cgst, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              <td className="py-1.5"></td>
                              <td className="py-1.5 text-right">₹{taxBreakdown.reduce((s, r) => s + r.sgst, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </>
                          ) : (
                            <>
                              <td className="py-1.5"></td>
                              <td className="py-1.5 text-right">₹{taxBreakdown.reduce((s, r) => s + r.total, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </>
                          )}
                          <td className="py-1.5 text-right">₹{taxBreakdown.reduce((s, r) => s + r.total, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              {/* Quotation Summary - fills the gap beside Amounts card */}
              {isQuotation && (
                <Card className="shadow-sm">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Quotation Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-blue-50 rounded-md p-2.5 border border-blue-100">
                        <p className="text-[10px] text-blue-600 uppercase font-semibold">Total Items</p>
                        <p className="text-lg font-bold text-blue-800">{billForm.items.length}</p>
                      </div>
                      <div className="bg-emerald-50 rounded-md p-2.5 border border-emerald-100">
                        <p className="text-[10px] text-emerald-600 uppercase font-semibold">Total Quantity</p>
                        <p className="text-lg font-bold text-emerald-800">{billForm.items.reduce((s, i) => s + i.quantity, 0)}</p>
                      </div>
                      <div className="bg-amber-50 rounded-md p-2.5 border border-amber-100">
                        <p className="text-[10px] text-amber-600 uppercase font-semibold">Avg. Price / Unit</p>
                        <p className="text-lg font-bold text-amber-800">
                          ₹{(() => {
                            const qty = billForm.items.reduce((s, i) => s + i.quantity, 0);
                            return qty > 0 ? Math.round(totals.subtotal / qty).toLocaleString('en-IN') : '0';
                          })()}
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded-md p-2.5 border border-purple-100">
                        <p className="text-[10px] text-purple-600 uppercase font-semibold">Valid For</p>
                        <p className="text-lg font-bold text-purple-800">
                          {(() => {
                            const validUntil = billForm.due_date;
                            if (!validUntil) return '7 days';
                            const days = Math.ceil((new Date(validUntil).getTime() - new Date(billForm.date || new Date()).getTime()) / (1000 * 60 * 60 * 24));
                            return days > 0 ? `${days} day${days === 1 ? '' : 's'}` : 'Expired';
                          })()}
                        </p>
                      </div>
                    </div>

                    <div className="border-t pt-2 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Quotation No.</span>
                        <span className="font-mono font-medium text-gray-800">{billForm.bill_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date</span>
                        <span className="font-medium text-gray-800">{billForm.date ? new Date(billForm.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Valid Until</span>
                        <span className="font-medium text-gray-800">
                          {billForm.due_date ? new Date(billForm.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : <span className="text-gray-400">Not set</span>}
                        </span>
                      </div>
                      {billForm.prepared_by && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Prepared By</span>
                          <span className="font-medium text-gray-800">{billForm.prepared_by}</span>
                        </div>
                      )}
                      {billForm.reference && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Reference</span>
                          <span className="font-medium text-gray-800">{billForm.reference}</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-md p-2.5 border border-blue-100">
                      <p className="text-[10px] text-blue-700 uppercase font-semibold mb-0.5">Note</p>
                      <p className="text-xs text-gray-700 leading-snug">
                        This quotation is valid until the date shown above. Prices are inclusive and subject to change without prior notice after expiry.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Terms, Notes & Actions */}
          <Card className="shadow-sm mb-4">
            <CardContent className="px-4 py-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-500">Terms & Conditions</Label>
                  <textarea
                    value={billForm.terms_conditions}
                    onChange={(e) => setBillForm(prev => ({ ...prev, terms_conditions: e.target.value }))}
                    placeholder="Thanks for doing business with us!"
                    className="w-full h-16 px-3 py-2 border border-gray-300 rounded-md text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">{t('notes')}</Label>
                  <textarea
                    value={billForm.notes}
                    onChange={(e) => setBillForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes..."
                    className="w-full h-16 px-3 py-2 border border-gray-300 rounded-md text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {errors.items && <FieldError message={errors.items} />}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => {
              if (!editingBill) { saveBillDraftBeacon(); }
              setShowCreateBill(false);
              setEditingBill(null);
              resetBillForm();
            }}>
              {t('cancel')}
            </Button>
            {editingBill ? (
              <Button type="button" size="sm" onClick={handleUpdateBill} disabled={billForm.items.length === 0 || (!billForm.client_id && !clientSearchQuery.trim())}>
                <FileText className="mr-1 h-3 w-3" />
                {activeTab === 'non-gst-bills' ? t('updateQuotationBill') : t('updateInvoice')}
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" size="sm" className="border-gray-400 text-gray-700 hover:bg-gray-50" onClick={handleSaveAsDraft}>
                  Save as Draft
                </Button>
                <Button type="submit" size="sm" disabled={billForm.items.length === 0 || (!billForm.client_id && !clientSearchQuery.trim())} className="bg-blue-600 hover:bg-blue-700">
                  <FileText className="mr-1 h-3 w-3" />
                  {activeTab === 'non-gst-bills' ? t('createQuotationBill') : t('createInvoice')}
                </Button>
              </>
            )}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="px-6 pt-2 pb-4 flex flex-col gap-3 overflow-hidden" style={{ height: 'calc(100dvh - 72px)' }}>
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold leading-tight">{t('billing')}</h1>
          <p className="text-muted-foreground text-sm">{t('createInvoicesAndManagePayments')}</p>
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-shrink-0">
        <Card className="bg-blue-500/10 backdrop-blur-sm border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">{t('totalBilled')}</CardTitle>
            <Receipt className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            <div className="text-2xl font-bold text-blue-700">₹{totalBillValue.toLocaleString()}</div>
            <p className="text-xs text-blue-600">{dateFilteredBills.length} {t('invoices')}</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/10 backdrop-blur-sm border-emerald-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">{t('amountReceived')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            <div className="text-2xl font-bold text-emerald-700">₹{totalReceived.toLocaleString()}</div>
            <p className="text-xs text-emerald-600">{dateFilteredPayments.length} {t('payments')}</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/10 backdrop-blur-sm border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">{t('pendingAmount')}</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            <div className="text-2xl font-bold text-amber-700">₹{totalPending.toLocaleString()}</div>
            <p className="text-xs text-amber-600">{pendingBills.length} {t('pending')}</p>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 backdrop-blur-sm border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">{t('overdue')}</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            <div className="text-2xl font-bold text-red-700">{overdueCount}</div>
            <p className="text-xs text-red-600">{t('needAttention')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val: string) => setActiveTab(val as 'gst-bills' | 'non-gst-bills')} className="w-full flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-2 flex-shrink-0">
          <TabsList className="inline-grid grid-cols-2 h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm w-[320px]">
            <TabsTrigger
              value="gst-bills"
              className="h-8 rounded-md text-sm font-medium text-slate-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-colors"
            >
              {t('invoice')}
            </TabsTrigger>
            <TabsTrigger
              value="non-gst-bills"
              className="h-8 rounded-md text-sm font-medium text-slate-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-colors"
            >
              {t('quotationBill')}
            </TabsTrigger>
          </TabsList>

          {activeTab === 'gst-bills' ? (
            <Button className=" text-white bg-blue-600 hover:bg-blue-700" onClick={() => { resetBillForm(); setBillForm(prev => ({ ...prev, bill_number: generateNextBillNumber(bills), gst: 18 })); setShowCreateBill(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              {t('newInvoice')}
            </Button>
          ) : (
            <Button className=" text-white bg-blue-600 hover:bg-blue-700" onClick={() => { resetBillForm(); setBillForm(prev => ({ ...prev, bill_number: generateNextQuotationNumber(bills), gst: 0 })); setShowCreateBill(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              {t('quotationBill')}
            </Button>
          )}
        </div>

        {/* GST Bills Tab (18%) */}
        <TabsContent value="gst-bills" className="flex-1 min-h-0 mt-0 data-[state=active]:flex data-[state=active]:flex-col">
          <Card className="h-full flex flex-col overflow-hidden">
            <CardHeader className="flex-shrink-0">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder={t('searchByInvoiceNoClient')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  {t('filter')}
                </Button>
                <select
                  value={filterCustomerType}
                  onChange={(e) => setFilterCustomerType(e.target.value)}
                  className="text-sm border rounded-md px-3 py-2 bg-white outline-none cursor-pointer"
                >
                  <option value="all">{t('allCustomerTypes')}</option>
                  <option value="b2b">{t('b2b')}</option>
                  <option value="b2c">{t('b2c')}</option>
                </select>
                <Button variant="outline" onClick={() => exportBillsCSV(dateFilteredBills.filter(b => (b.bill_no || '').startsWith('INV') && ((b.bill_no || '').toLowerCase().includes(searchTerm.toLowerCase()) || (b.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()))))}>
                  <Download className="mr-2 h-4 w-4" />
                  {t('export')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('invoiceNo')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>{t('client')}</TableHead>
                    <TableHead>{t('gstNo')}</TableHead>
                    <TableHead>{t('amount')}</TableHead>
                    <TableHead>B2B/B2C</TableHead>
                    <TableHead>{t('type')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dateFilteredBills.filter(bill => 
                    ((bill.bill_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (bill.client_name || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
                    (bill.bill_no || '').startsWith('INV')
                  ).map((bill) => (
                    <TableRow key={bill.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleViewBill(bill)}>
                      <TableCell className="font-medium font-mono">
                        {bill.bill_no}
                        {(bill as any).status === 'draft' && <Badge className="ml-2 bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0.5">Draft</Badge>}
                      </TableCell>
                      <TableCell>{new Date(bill.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{bill.client_name}</div>
                          <div className="text-xs text-gray-500">{getBillClientAddress(bill)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{bill.client_gst || '—'}</TableCell>
                      <TableCell className="font-semibold">₹{bill.grand_total.toLocaleString()}</TableCell>
                      
                      <TableCell>
                        <Badge className={`text-[10px] px-1.5 py-0.5 ${bill.client_gst ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {getCustomerType(bill.client_gst)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={bill.payment_type === 'cash' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {bill.payment_type === 'cash' ? (t('cash')) : (t('credit'))}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <select
                          value={bill.payment_status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handlePaymentStatusChange(bill.id, e.target.value as 'paid' | 'partial' | 'pending' | 'overdue')}
                          className={`text-xs font-medium rounded-full px-3 py-1.5 border cursor-pointer outline-none appearance-none bg-white ${getStatusColor(bill.payment_status)}`}
                        >
                          <option value="paid">Paid</option>
                          <option value="partial">Partial</option>
                          <option value="pending">Pending</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={dispatchedBills.has(bill.id) ? "text-gray-400 cursor-not-allowed" : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"}
                          title={dispatchedBills.has(bill.id) ? (t('alreadyDispatched')) : (t('sendToDispatch'))}
                          disabled={dispatchedBills.has(bill.id)}
                          onClick={() => {
                            if (!dispatchedBills.has(bill.id)) {
                              setDispatchedBills(prev => new Set(prev).add(bill.id));
                              if (onSendToDispatch) {
                                const payload = getDispatchPayloadFromBill(bill);
                                if (payload.items.length === 0) {
                                  toast.error('No bill items found for dispatch');
                                  return;
                                }
                                onSendToDispatch(payload);
                              }
                            }
                          }}
                        >
                          <SendHorizontal className="h-4 w-4" style={{ transform: 'rotate(-35deg)' }} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Download PDF"
                          className={!printedBills.has(bill.id) ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" : ""}
                          onClick={() => {
                            if (!printedBills.has(bill.id)) {
                              setPrintedBills(prev => new Set(prev).add(bill.id));
                            }
                            downloadBillPDF(bill);
                          }}
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Print"
                          className="text-slate-600 hover:text-slate-700 hover:bg-slate-100"
                          onClick={() => generateBillPDF(bill, 'print')}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-32 p-1">
                            <button 
                              onClick={() => handleEditBill(bill)} 
                              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-100 cursor-pointer"
                            >
                              <Edit className="h-4 w-4 text-amber-600" />
                              {t('edit')}
                            </button>
                            <button 
                              onClick={() => handleDeleteBill(bill.id)} 
                              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                              {t('delete')}
                            </button>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quotation Bill Tab */}
        <TabsContent value="non-gst-bills" className="flex-1 min-h-0 mt-0 data-[state=active]:flex data-[state=active]:flex-col">
          <Card className="h-full flex flex-col overflow-hidden">
            <CardHeader className="flex-shrink-0">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder={t('searchByInvoiceNoClient')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  {t('filter')}
                </Button>
                <select
                  value={filterCustomerType}
                  onChange={(e) => setFilterCustomerType(e.target.value)}
                  className="text-sm border rounded-md px-3 py-2 bg-white outline-none cursor-pointer"
                >
                  <option value="all">{t('allCustomerTypes')}</option>
                  <option value="b2b">{t('b2b')}</option>
                  <option value="b2c">{t('b2c')}</option>
                </select>
                <Button variant="outline" onClick={() => exportBillsCSV(dateFilteredBills.filter(b => (b.bill_no || '').startsWith('QTN') && ((b.bill_no || '').toLowerCase().includes(searchTerm.toLowerCase()) || (b.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()))))}>
                  <Download className="mr-2 h-4 w-4" />
                  {t('export')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('invoiceNo')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>{t('client')}</TableHead>
                    <TableHead>{t('gstNo')}</TableHead>
                    <TableHead>{t('amount')}</TableHead>
                    <TableHead>B2B/B2C</TableHead>
                    <TableHead>{t('type')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dateFilteredBills.filter(bill => 
                    ((bill.bill_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (bill.client_name || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
                    (bill.bill_no || '').startsWith('QTN')
                  ).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        {t('noQuotationBillsFound')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    dateFilteredBills.filter(bill => 
                      ((bill.bill_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (bill.client_name || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
                      (bill.bill_no || '').startsWith('QTN')
                    ).map((bill) => (
                      <TableRow key={bill.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleViewBill(bill)}>
                        <TableCell className="font-medium font-mono">
                          {bill.bill_no}
                          {(bill as any).status === 'draft' && <Badge className="ml-2 bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0.5">Draft</Badge>}
                        </TableCell>
                        <TableCell>{new Date(bill.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{bill.client_name}</div>
                            <div className="text-xs text-gray-500">{getBillClientAddress(bill)}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{bill.client_gst || '—'}</TableCell>
                        <TableCell className="font-semibold">₹{bill.grand_total.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] px-1.5 py-0.5 ${bill.client_gst ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                            {getCustomerType(bill.client_gst)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={bill.payment_type === 'cash' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            {bill.payment_type === 'cash' ? (t('cash')) : (t('credit'))}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <select
                            value={bill.payment_status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handlePaymentStatusChange(bill.id, e.target.value as 'paid' | 'partial' | 'pending' | 'overdue')}
                            className={`text-xs font-medium rounded-full px-3 py-1.5 border cursor-pointer outline-none appearance-none bg-white ${getStatusColor(bill.payment_status)}`}
                          >
                            <option value="paid">Paid</option>
                            <option value="partial">Partial</option>
                            <option value="pending">Pending</option>
                            <option value="overdue">Overdue</option>
                          </select>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={dispatchedBills.has(bill.id) ? "text-gray-400 cursor-not-allowed" : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"}
                            title={dispatchedBills.has(bill.id) ? (t('alreadyDispatched')) : (t('sendToDispatch'))}
                            disabled={dispatchedBills.has(bill.id)}
                            onClick={() => {
                              if (!dispatchedBills.has(bill.id)) {
                                setDispatchedBills(prev => new Set(prev).add(bill.id));
                                if (onSendToDispatch) {
                                  const payload = getDispatchPayloadFromBill(bill);
                                  if (payload.items.length === 0) {
                                    toast.error('No bill items found for dispatch');
                                    return;
                                  }
                                  onSendToDispatch(payload);
                                }
                              }
                            }}
                          >
                            <SendHorizontal className="h-4 w-4" style={{ transform: 'rotate(-35deg)' }} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Download PDF"
                            className={!printedBills.has(bill.id) ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" : ""}
                            onClick={() => {
                              if (!printedBills.has(bill.id)) {
                                setPrintedBills(prev => new Set(prev).add(bill.id));
                              }
                              downloadBillPDF(bill);
                            }}
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Print"
                            className="text-slate-600 hover:text-slate-700 hover:bg-slate-100"
                            onClick={() => generateBillPDF(bill, 'print')}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-32 p-1">
                              <button 
                                onClick={() => handleEditBill(bill)} 
                                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-100 cursor-pointer"
                              >
                                <Edit className="h-4 w-4 text-amber-600" />
                                {t('edit')}
                              </button>
                              <button 
                                onClick={() => handleDeleteBill(bill.id)} 
                                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                                {t('delete')}
                              </button>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmDelete.open}
        title="Delete Bill"
        description="Are you sure you want to delete this bill? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={executeDeleteBill}
        onCancel={() => setConfirmDelete({ open: false, id: '' })}
      />
    </div>
  );
};

export default BillingManagement;
