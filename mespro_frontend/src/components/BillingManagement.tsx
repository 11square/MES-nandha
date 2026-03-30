import { toast } from 'sonner';
import React, { useState, useEffect, useRef } from 'react';
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
  onSendToDispatch?: (billData: { bill_no: string; order_id?: string | number; order_number: string; client_name: string; client_address: string; items: { name: string; quantity: number }[]; grand_total: number }) => void;
}

// Shared stock data (simulating connection to StockManagement)
interface StockItem {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  sku: string;
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

const BillingManagement: React.FC<BillingManagementProps> = ({ orderForBilling, onClearOrderForBilling, openBillForm, onSendToDispatch }) => {
  // Translation helper
  const { t } = useI18n();

  // Stock items (connected to Stock module)
  const [stockItems, setStockItems] = useState<StockItem[]>([]);

  // Clients data (connected to Client module)
  const [clients, setClients] = useState<Client[]>([]);

  // Client search and add new client state
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showAddClientDialog, setShowAddClientDialog] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gstNo: '',
  });

  // Multiple item entry rows state
  interface ItemEntryRow {
    id: number;
    itemId: string;
    itemName: string;
    quantity: number;
    price: number;
    discount: number;
  }
  const [itemEntryRows, setItemEntryRows] = useState<ItemEntryRow[]>([
    { id: 1, itemId: '', itemName: '', quantity: 0, price: 0, discount: 0 }
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
      }));
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
  const [showCreateBill, setShowCreateBill] = useState(!!orderForBilling || !!openBillForm);
  const [showViewBill, setShowViewBill] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [viewingBill, setViewingBill] = useState<Bill | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dispatchedBills, setDispatchedBills] = useState<Set<string>>(new Set());
  const [printedBills, setPrintedBills] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [clientErrors, setClientErrors] = useState<ValidationErrors>({});
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string }>({ open: false, id: '' });

  const [billForm, setBillForm] = useState({
    date: new Date().toISOString().split('T')[0],
    client_id: '',
    items: [] as BillItem[],
    bill_number: `INV-${new Date().getFullYear()}-001`,
    notes: '',
    created_by: 'Admin',
    payment_type: 'cash' as 'cash' | 'credit',
    gst: 18,
    invoiceType: 'b2b' as 'b2b' | 'b2c',
    gst_number: '',
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

  // Handle order sent from OrdersManagement
  useEffect(() => {
    if (orderForBilling && !orderProcessedRef.current) {
      orderProcessedRef.current = true;
      const orderData = orderForBilling as any;
      const orderRef = String(orderData.order_id || orderData.id || '');
      const orderNum = orderData.orderNumber || orderData.order_number || '';
      const customerName = orderData.customer || '';
      const orderProducts = orderData.products || [];

      // Fetch fresh bills to generate accurate bill number
      billingService.getBills().then(data => {
        const items = Array.isArray(data) ? data : (data as any)?.items || [];
        const freshBills = items.map((b: any) => ({ ...b, id: String(b.id), bill_no: b.bill_no }));
        const freshBillNo = generateNextBillNumber(freshBills);
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
        tax: orderData.tax_rate || orderData.taxRate || 18,
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
        gst: orderData.tax_rate || orderData.taxRate || 18,
      }));

      setShowCreateBill(true);

      // Clear shared state after a short delay to avoid race conditions
      setTimeout(() => {
        if (onClearOrderForBilling) {
          onClearOrderForBilling();
        }
      }, 500);
    }
  }, [orderForBilling]);

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

  // Calculate statistics
  const totalBillValue = bills.reduce((sum, bill) => sum + bill.grand_total, 0);
  const totalReceived = bills.reduce((sum, bill) => sum + bill.paid_amount, 0);
  const totalPending = totalBillValue - totalReceived;
  const overdueCount = bills.filter(bill => {
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
    setBillForm(prev => ({ ...prev, client_id: client.id, gst_number: client.gstNo || '' }));
    setClientSearchQuery(client.name);
    setShowClientDropdown(false);
    setErrors(prev => ({ ...prev, client: '' }));
  };

  // Handle adding a new client
  const handleAddNewClient = async () => {
    const errs = validateFields(newClientForm, {
      name: { required: true, label: 'Name' },
      contactPerson: { required: true, label: 'Contact Person' },
      phone: { required: true, phone: true, label: 'Phone' },
      email: { required: true, email: true, label: 'Email' },
      address: { required: true, label: 'Address' },
      gstNo: { required: true, label: 'GST No.' },
    });
    if (Object.keys(errs).length) {
      setClientErrors(errs);
      return;
    }
    setClientErrors({});

    try {
      const result = await clientsService.createClient({
        name: newClientForm.name,
        contact_person: newClientForm.contactPerson,
        phone: newClientForm.phone,
        email: newClientForm.email,
        address: newClientForm.address,
        gst_number: newClientForm.gstNo || undefined,
      });
      const newClientId = String(result?.id || `CLT-${clients.length + 1}`);
      toast.success('Client added successfully!');
      refreshBills();
      setBillForm(prev => ({ ...prev, client_id: newClientId }));
      setClientSearchQuery(newClientForm.name);
      setShowAddClientDialog(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add client');
    }
    setNewClientForm({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      gstNo: '',
    });
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
    setItemEntryRows([...itemEntryRows, { id: newId, itemId: '', itemName: '', quantity: 0, price: 0, discount: 0 }]);
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
      row.id === rowId ? { ...row, itemId: stock.id, itemName: stock.name, price: stock.unitPrice } : row
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
      setItemEntryRows([{ id: 1, itemId: '', itemName: '', quantity: 0, price: 0, discount: 0 }]);
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
    const currentGst = billForm.gst;
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
      const subtotal = unitPrice * row.quantity;
      const discountAmount = (subtotal * row.discount) / 100;
      const taxableAmount = subtotal - discountAmount;
      const taxAmount = (taxableAmount * currentGst) / 100;
      const total = taxableAmount + taxAmount;

      newItems.push({
        item_id: stock.id,
        name: stock.name,
        category: stock.category || '',
        subcategory: stock.subcategory || '',
        size: '',
        quantity: row.quantity,
        unit: stock.unit || '',
        unit_price: unitPrice,
        discount: row.discount,
        tax: currentGst,
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
      setItemEntryRows([{ id: 1, itemId: '', itemName: '', quantity: 0, price: 0, discount: 0 }]);
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

  const handleBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = getSelectedClient();
    const clientValue = client ? client.name : (clientSearchQuery.trim() || '');
    const errs = validateFields(
      {
        date: billForm.date,
        client: clientValue,
        gst: billForm.gst,
        invoiceType: billForm.invoiceType,
        payment_type: billForm.payment_type,
      },
      {
        date: { required: true, label: 'Date' },
        client: { required: true, label: 'Client' },
        gst: { required: true, numeric: true, min: 0, label: 'GST' },
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

    const totals = calculateBillTotals();
    
    try {
      await billingService.createBill({
        bill_no: billForm.bill_number || undefined,
        date: billForm.date,
        order_id: orderBillData ? parseOrderIdForApi(orderBillData.orderId) : null,
        client_id: client.id === 'CUSTOM' ? null : client.id,
        client_name: client.name,
        client_address: client.address || '',
        client_gst: billForm.gst_number || client.gstNo || '',
        items: billForm.items,
        subtotal: Math.round(totals.subtotal),
        total_discount: Math.round(totals.totalDiscount),
        total_tax: Math.round(totals.totalTax),
        grand_total: Math.round(totals.grandTotal),
        payment_status: 'pending',
        payment_type: billForm.payment_type,
        paid_amount: 0,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: billForm.notes,
        created_by: billForm.created_by,
        gst_rate: billForm.gst,
      });
      toast.success('Bill created successfully!');
      setActiveTab(billForm.gst > 0 ? 'gst-bills' : 'non-gst-bills');
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
      gst: 18,
      invoiceType: 'b2b',
      gst_number: '',
    });
    setCurrentItem({ itemId: '', quantity: 0, discount: 0 });
    setSelectedCategory('');
    setSelectedSubcategory('');
    setOrderBillData(null);
    setEditingItemIndex(null);
    setEditingItem(null);
    setClientSearchQuery('');
    setShowClientDropdown(false);
    setItemEntryRows([{ id: 1, itemId: '', itemName: '', quantity: 1, price: 0, discount: 0 }]);
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
  const generateBillPDF = (bill: Bill) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      toast.error('Please allow popups to generate PDF');
      return;
    }

    const clientAddress = getBillClientAddress(bill);

    const itemsRows = bill.items.map(item => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">₹${item.unit_price.toLocaleString()}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.discount}%</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.tax}%</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">₹${item.total.toLocaleString()}</td>
      </tr>
    `).join('');

    const statusLabel = bill.payment_status.charAt(0).toUpperCase() + bill.payment_status.slice(1);
    const statusColor = bill.payment_status === 'paid' ? '#16a34a' : bill.payment_status === 'partial' ? '#f59e0b' : bill.payment_status === 'overdue' ? '#dc2626' : '#6b7280';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${bill.bill_no} - Invoice</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
          .company-name { font-size: 24px; font-weight: 700; color: #1e40af; }
          .company-sub { font-size: 12px; color: #6b7280; margin-top: 4px; }
          .invoice-title { font-size: 28px; font-weight: 700; color: #1e40af; text-align: right; }
          .invoice-no { font-size: 14px; color: #6b7280; text-align: right; margin-top: 4px; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; color: white; background: ${statusColor}; margin-top: 8px; float: right; }
          .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .info-box { flex: 1; }
          .info-box h3 { font-size: 12px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; letter-spacing: 1px; }
          .info-box p { font-size: 14px; line-height: 1.6; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          thead th { background: #f8fafc; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e2e8f0; letter-spacing: 0.5px; }
          thead th:nth-child(2), thead th:nth-child(4), thead th:nth-child(5) { text-align: center; }
          thead th:nth-child(3), thead th:last-child { text-align: right; }
          .summary { display: flex; justify-content: flex-end; }
          .summary-box { width: 300px; }
          .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
          .summary-row.total { border-top: 2px solid #1e40af; margin-top: 8px; padding-top: 12px; font-size: 18px; font-weight: 700; color: #1e40af; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #9ca3af; }
          .notes { background: #fffbeb; border: 1px solid #fde68a; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; }
          .notes strong { display: block; margin-bottom: 4px; color: #92400e; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company-name">MES Pro</div>
            <div class="company-sub">Manufacturing Execution System</div>
          </div>
          <div>
            <div class="invoice-title">${bill.bill_no.startsWith('QTN') ? 'QUOTATION' : 'INVOICE'}</div>
            <div class="invoice-no">${bill.bill_no}</div>
            <div class="status-badge">${statusLabel}</div>
          </div>
        </div>

        <div class="info-section">
          <div class="info-box">
            <h3>Bill To</h3>
            <p><strong>${bill.client_name}</strong></p>
            <p>${clientAddress}</p>
            ${bill.client_gst ? `<p style="margin-top:4px;font-size:12px;color:#6b7280;">GSTIN: ${bill.client_gst}</p>` : ''}
          </div>
          <div class="info-box" style="text-align:right;">
            <h3>Invoice Details</h3>
            <p>Date: ${new Date(bill.date).toLocaleDateString()}</p>
            <p>Due: ${new Date(bill.due_date).toLocaleDateString()}</p>
            <p>Type: ${bill.payment_type === 'cash' ? 'Cash' : 'Credit'}</p>
            ${bill.gst_rate ? `<p>GST Rate: ${bill.gst_rate}%</p>` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Discount</th>
              <th>Tax</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-box">
            <div class="summary-row"><span>Subtotal:</span><span>₹${bill.subtotal.toLocaleString()}</span></div>
            <div class="summary-row" style="color:#dc2626;"><span>Discount:</span><span>-₹${bill.total_discount.toLocaleString()}</span></div>
            ${bill.gst_rate ? `<div class="summary-row"><span>GST (${bill.gst_rate}%):</span><span>₹${bill.total_tax.toLocaleString()}</span></div>` : ''}
            <div class="summary-row total"><span>Grand Total:</span><span>₹${bill.grand_total.toLocaleString()}</span></div>
            <div class="summary-row" style="color:#16a34a;"><span>Paid:</span><span>₹${bill.paid_amount.toLocaleString()}</span></div>
            <div class="summary-row" style="color:#dc2626;font-weight:600;"><span>Balance:</span><span>₹${(bill.grand_total - bill.paid_amount).toLocaleString()}</span></div>
          </div>
        </div>

        ${bill.notes ? `<div class="notes"><strong>Notes:</strong>${bill.notes}</div>` : ''}

        <div class="footer">
          <p>Generated by MES Pro | ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

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
      gst: bill.gst_rate,
      invoiceType: bill.client_gst ? 'b2b' : 'b2c',
      gst_number: bill.client_gst || '',
    });
    setClientSearchQuery(client ? client.name : (bill.client_name || ''));
    setActiveTab(bill.gst_rate > 0 ? 'gst-bills' : 'non-gst-bills');
    setItemEntryRows([{ id: 1, itemId: '', itemName: '', quantity: 1, price: 0, discount: 0 }]);
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
        gst: billForm.gst,
        invoiceType: billForm.invoiceType,
        payment_type: billForm.payment_type,
      },
      {
        date: { required: true, label: 'Date' },
        client: { required: true, label: 'Client' },
        gst: { required: true, numeric: true, min: 0, label: 'GST' },
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
        gst_rate: billForm.gst,
      });
      toast.success('Bill updated successfully!');
      setActiveTab(billForm.gst > 0 ? 'gst-bills' : 'non-gst-bills');
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

  const pendingBills = bills.filter(b => b.payment_status !== 'paid');

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
                      <Badge variant="outline">{viewingBill.gst_rate}%</Badge>
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
                      <span className="text-gray-600">GST ({viewingBill.gst_rate}%):</span>
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
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => {
              setShowCreateBill(false);
              setEditingBill(null);
              resetBillForm();
            }}
          >
            ← {t('back')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {editingBill
                ? (activeTab === 'non-gst-bills' ? t('editQuotationBill') : t('editInvoice'))
                : (activeTab === 'non-gst-bills' ? t('createNewQuotationBill') : t('createNewInvoice'))
              }
            </h1>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleBillSubmit} noValidate>
              <div className="space-y-8">
                {/* Client & Date Selection */}
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-2 w-[170px]">
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={billForm.date}
                      onChange={(e) => { setBillForm(prev => ({ ...prev, date: e.target.value })); setErrors(prev => ({ ...prev, date: '' })); }}
                      className="h-9 w-full"
                    />
                    <FieldError message={errors.date} />
                  </div>
                  <div className="space-y-2 w-[260px]">
                    <Label>Client *</Label>
                    <div className="relative">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type="text"
                            placeholder={t('client')}
                            value={clientSearchQuery}
                            onChange={(e) => {
                              setClientSearchQuery(e.target.value);
                              setShowClientDropdown(true);
                              setErrors(prev => ({ ...prev, client: '' }));
                              if (!e.target.value) {
                                setBillForm(prev => ({ ...prev, client_id: '' }));
                              }
                            }}
                            onFocus={() => setShowClientDropdown(true)}
                            onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                            className="h-9 w-full"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAddClientDialog(true)}
                          title={t('addNewClient')}
                          className="h-9"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {showClientDropdown && clientSearchQuery && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                          {filteredClients.length > 0 ? (
                            <>
                              {filteredClients.map(client => (
                                <div
                                  key={client.id}
                                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
                                  onMouseDown={(e) => { e.preventDefault(); handleSelectClient(client); }}
                                >
                                  <div className="font-medium">{client.name}</div>
                                  <div className="text-xs text-gray-500">{client.contactPerson} • {client.phone}</div>
                                </div>
                              ))}
                              <div
                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-t border-gray-200 bg-gray-50"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setBillForm(prev2 => ({ ...prev2, client_id: '' }));
                                  setShowClientDropdown(false);
                                }}
                              >
                                <div className="font-medium text-blue-600">Use "{clientSearchQuery}"</div>
                                <div className="text-xs text-gray-500">{t('useAsCustomClientName')}</div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div
                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setBillForm(prev2 => ({ ...prev2, client_id: '' }));
                                  setShowClientDropdown(false);
                                }}
                              >
                                <div className="font-medium text-blue-600">Use "{clientSearchQuery}"</div>
                                <div className="text-xs text-gray-500">{t('useAsCustomClientName')}</div>
                              </div>
                              <div className="px-4 py-3 text-center border-t border-gray-100">
                                <div className="text-gray-500 mb-2">{t('orAddAsNewClient')}</div>
                                <Button
                                  type="button"
                                  size="sm"
                                  onMouseDown={(e: React.MouseEvent) => {
                                    e.preventDefault();
                                    setNewClientForm({ ...newClientForm, name: clientSearchQuery });
                                    setShowAddClientDialog(true);
                                    setShowClientDropdown(false);
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  {t('addNewClient')}
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <FieldError message={errors.client} />
                  </div>
                  <div className="space-y-2 w-[200px]">
                    <Label>{t('billNumber')}</Label>
                    <Input
                      type="text"
                      value={billForm.bill_number}
                      readOnly
                      className="h-9 w-full bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2 w-[120px]">
                    <Label>{t('gst')} *</Label>
                    <select
                      value={billForm.gst}
                      onChange={(e) => { setBillForm(prev => ({ ...prev, gst: Number(e.target.value) })); setErrors(prev => ({ ...prev, gst: '' })); }}
                      className="w-full h-9 px-3 border border-gray-300 rounded-md text-sm"
                    >
                      <option value={0}>0%</option>
                      <option value={18}>18%</option>
                    </select>
                    <FieldError message={errors.gst} />
                  </div>
                  <div className="space-y-2 w-[210px]">
                    <Label>{t('invoiceType')} *</Label>
                    <select
                      value={billForm.invoiceType}
                      onChange={(e) => { setBillForm(prev => ({ ...prev, invoiceType: e.target.value as 'b2b' | 'b2c' })); setErrors(prev => ({ ...prev, invoiceType: '' })); }}
                      className="w-full h-9 px-3 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="b2b">B2B (Business to Business)</option>
                      <option value="b2c">B2C (Business to Consumer)</option>
                    </select>
                    <FieldError message={errors.invoiceType} />
                  </div>
                  <div className="space-y-2 w-[140px]">
                    <Label>{t('billType')} *</Label>
                    <select
                      value={billForm.payment_type}
                      onChange={(e) => { setBillForm(prev => ({ ...prev, payment_type: e.target.value as 'cash' | 'credit' })); setErrors(prev => ({ ...prev, payment_type: '' })); }}
                      className="w-full h-9 px-3 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="cash">{t('cash')}</option>
                      <option value="credit">{t('credit')}</option>
                    </select>
                    <FieldError message={errors.payment_type} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="space-y-2 w-[220px]">
                    <Label>{t('gstNo')}</Label>
                    <Input
                      type="text"
                      placeholder="e.g. 29ABCDE1234F1Z5"
                      value={billForm.gst_number}
                      onChange={(e) => setBillForm(prev => ({ ...prev, gst_number: e.target.value.toUpperCase() }))}
                      className="h-9 font-mono"
                      maxLength={15}
                    />
                  </div>
                </div>

                {/* Addon Form - Only show when showAddonForm is true */}
                {showAddonForm && (
                  <Card className="border-blue-200 bg-blue-50/30">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{t('addAddonAdditionalCharge')}</CardTitle>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddonForm(false)} className="text-gray-500 hover:text-gray-700">
                          ✕
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>{t('title')} *</Label>
                          <Input
                            placeholder={t('egInstallationCharge')}
                            value={newAddon.title}
                            onChange={(e) => { setNewAddon({ ...newAddon, title: e.target.value }); setAddonErrors(prev => ({ ...prev, title: '' })); }}
                          />
                          <FieldError message={addonErrors.title} />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('description')} *</Label>
                          <Input
                            placeholder={t('description')}
                            value={newAddon.description}
                            onChange={(e) => { setNewAddon({ ...newAddon, description: e.target.value }); setAddonErrors(prev => ({ ...prev, description: '' })); }}
                          />
                          <FieldError message={addonErrors.description} />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('amount')} *</Label>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={newAddon.amount || ''}
                              onChange={(e) => { setNewAddon({ ...newAddon, amount: Number(e.target.value) }); setAddonErrors(prev => ({ ...prev, amount: '' })); }}
                              onKeyDown={blockInvalidNumberKeys}
                            />
                            <Button type="button" onClick={addAddon}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <FieldError message={addonErrors.amount} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Add Items Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('addItems')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Multiple Item Entry Rows */}
                    <div className="space-y-3">
                      {/* Header Row */}
                      <div className="grid grid-cols-12 gap-3 items-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="col-span-4">{t('item')} *</div>
                        <div className="col-span-2">{t('qty')} *</div>
                        <div className="col-span-2">{t('price')}</div>
                        <div className="col-span-2">{t('disc')}</div>
                        <div className="col-span-2"></div>
                      </div>
                      
                      {/* Item Entry Rows */}
                      {itemEntryRows.map((row, index) => (
                        <div key={row.id} className="grid grid-cols-12 gap-3 items-center">
                          <div className="col-span-4 relative">
                            <Input
                              ref={(el) => { itemInputRefs.current[row.id] = el; }}
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
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && itemEntryRows.some(r => r.itemId)) {
                                  e.preventDefault();
                                  addAllItemsToBill();
                                }
                              }}
                              className={itemRowErrors[row.id]?.itemId ? 'border-red-400' : ''}
                            />
                            <FieldError message={itemRowErrors[row.id]?.itemId} />
                            {activeRowDropdown === row.id && (
                              <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto">
                                {stockItems
                                  .filter(s => s.currentStock > 0 && s.name.toLowerCase().includes(row.itemName.toLowerCase()))
                                  .length > 0 ? (
                                  stockItems
                                    .filter(s => s.currentStock > 0 && s.name.toLowerCase().includes(row.itemName.toLowerCase()))
                                    .map(stock => (
                                      <div
                                        key={stock.id}
                                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          selectItemForRow(row.id, stock);
                                        }}
                                      >
                                        <div className="font-medium text-sm">{stock.name}</div>
                                        <div className="text-xs text-gray-500">₹{stock.unitPrice} • {stock.currentStock} {t('avail')}</div>
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
                          <div className="col-span-2">
                            <Input
                              type="number"
                              min="0"
                              value={row.quantity}
                              onChange={(e) => updateItemRow(row.id, 'quantity', Math.max(0, Number(e.target.value) || 0))}
                              onFocus={(e) => e.target.select()}
                              className={itemRowErrors[row.id]?.quantity ? 'border-red-400' : 'border border-gray-300'}
                              onKeyDown={(e) => {
                                blockInvalidNumberKeys(e);
                                if (e.key === 'Enter' && itemEntryRows.some(r => r.itemId)) {
                                  e.preventDefault();
                                  addAllItemsToBill();
                                }
                              }}
                            />
                            <FieldError message={itemRowErrors[row.id]?.quantity} />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              min="0"
                              value={row.price || ''}
                              placeholder="Auto"
                              onChange={(e) => updateItemRow(row.id, 'price', Number(e.target.value))}
                              className="border border-gray-300"
                              onKeyDown={(e) => {
                                blockInvalidNumberKeys(e);
                                if (e.key === 'Enter' && itemEntryRows.some(r => r.itemId)) {
                                  e.preventDefault();
                                  addAllItemsToBill();
                                }
                              }}
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={row.discount}
                              onChange={(e) => updateItemRow(row.id, 'discount', Number(e.target.value))}
                              className="border border-gray-300"
                              onKeyDown={(e) => {
                                blockInvalidNumberKeys(e);
                                if (e.key === 'Enter' && itemEntryRows.some(r => r.itemId)) {
                                  e.preventDefault();
                                  addAllItemsToBill();
                                } else if (e.key === 'Tab' && !e.shiftKey && index === itemEntryRows.length - 1) {
                                  e.preventDefault();
                                  const lastRow = itemEntryRows[itemEntryRows.length - 1];
                                  const errs: { itemId?: string; quantity?: string } = {};
                                  if (!lastRow.itemId) errs.itemId = 'Select an item';
                                  if (!lastRow.quantity || lastRow.quantity < 1) errs.quantity = 'Enter quantity';
                                  if (Object.keys(errs).length) {
                                    setItemRowErrors(prev => ({ ...prev, [lastRow.id]: errs }));
                                    return;
                                  }
                                  addNewItemRow();
                                }
                              }}
                            />
                          </div>
                          <div className="col-span-2 flex gap-2">
                            {index === itemEntryRows.length - 1 ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addNewItemRow}
                                className="text-green-600 border-green-300 hover:bg-green-50 h-9 px-3"
                                title={t('addRow')}
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

                    {/* Add Items to Bill Button */}
                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        onClick={addAllItemsToBill}
                        disabled={!itemEntryRows.some(row => row.itemId)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        {t('addToBill')}
                      </Button>
                    </div>

                    {/* Items Table */}
                    {(billForm.items.length > 0 || addons.length > 0) && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-center w-20">Qty</TableHead>
                            <TableHead className="text-right w-24">Price</TableHead>
                            <TableHead className="text-center w-20">Disc %</TableHead>
                            <TableHead className="text-right w-24">Total</TableHead>
                            <TableHead className="w-20"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {billForm.items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell className="text-center">
                                {editingItemIndex === index ? (
                                  <Input type="number" value={editingItem?.quantity || 0} onChange={(e) => setEditingItem(prev => prev ? {...prev, quantity: Number(e.target.value)} : null)} onKeyDown={blockInvalidNumberKeys} className="w-16 h-8" />
                                ) : item.quantity}
                              </TableCell>
                              <TableCell className="text-right">
                                {editingItemIndex === index ? (
                                  <Input type="number" value={editingItem?.unit_price || 0} onChange={(e) => setEditingItem(prev => prev ? {...prev, unit_price: Number(e.target.value)} : null)} onKeyDown={blockInvalidNumberKeys} className="w-20 h-8" />
                                ) : `₹${item.unit_price.toLocaleString()}`}
                              </TableCell>
                              <TableCell className="text-center">
                                {editingItemIndex === index ? (
                                  <Input type="number" value={editingItem?.discount || 0} onChange={(e) => setEditingItem(prev => prev ? {...prev, discount: Number(e.target.value)} : null)} onKeyDown={blockInvalidNumberKeys} className="w-16 h-8" />
                                ) : `${item.discount}%`}
                              </TableCell>
                              <TableCell className="text-right font-semibold">₹{item.total.toLocaleString()}</TableCell>
                              <TableCell>
                                {editingItemIndex === index ? (
                                  <div className="flex gap-1 justify-center">
                                    <Button type="button" size="sm" variant="ghost" onClick={saveEditItem}><CheckCircle className="h-4 w-4 text-green-500" /></Button>
                                    <Button type="button" size="sm" variant="ghost" onClick={cancelEditItem}><XCircle className="h-4 w-4 text-gray-400" /></Button>
                                  </div>
                                ) : (
                                  <div className="flex gap-1 justify-center">
                                    <Button type="button" size="sm" variant="ghost" onClick={() => startEditItem(index)}><Edit className="h-4 w-4 text-blue-500" /></Button>
                                    <Button type="button" size="sm" variant="ghost" onClick={() => removeItemFromBill(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                          {/* Addons displayed in the same table */}
                          {addons.map((addon, index) => (
                            <TableRow key={`addon-${addon.id}`} className="bg-blue-50/50">
                              <TableCell>
                                {editingAddonIndex === index ? (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-blue-100 text-blue-700 text-xs">Addon</Badge>
                                    <Input 
                                      value={editingAddon?.title || ''} 
                                      onChange={(e) => setEditingAddon(prev => prev ? {...prev, title: e.target.value} : null)} 
                                      className="w-32 h-8" 
                                      placeholder="Title"
                                    />
                                    <Input 
                                      value={editingAddon?.description || ''} 
                                      onChange={(e) => setEditingAddon(prev => prev ? {...prev, description: e.target.value} : null)} 
                                      className="w-32 h-8" 
                                      placeholder="Description"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-blue-100 text-blue-700 text-xs">Addon</Badge>
                                    <span>{addon.title}</span>
                                    {addon.description && <span className="text-xs text-gray-500">({addon.description})</span>}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-center">1</TableCell>
                              <TableCell className="text-right">
                                {editingAddonIndex === index ? (
                                  <Input 
                                    type="number" 
                                    value={editingAddon?.amount || 0} 
                                    onChange={(e) => setEditingAddon(prev => prev ? {...prev, amount: Number(e.target.value)} : null)} 
                                    onKeyDown={blockInvalidNumberKeys}
                                    className="w-20 h-8" 
                                  />
                                ) : `₹${addon.amount.toLocaleString()}`}
                              </TableCell>
                              <TableCell className="text-center">-</TableCell>
                              <TableCell className="text-right font-semibold text-blue-600">
                                ₹{(editingAddonIndex === index ? (editingAddon?.amount || 0) : addon.amount).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                {editingAddonIndex === index ? (
                                  <div className="flex gap-1 justify-center">
                                    <Button type="button" size="sm" variant="ghost" onClick={saveEditAddon}><CheckCircle className="h-4 w-4 text-green-500" /></Button>
                                    <Button type="button" size="sm" variant="ghost" onClick={cancelEditAddon}><XCircle className="h-4 w-4 text-gray-400" /></Button>
                                  </div>
                                ) : (
                                  <div className="flex gap-1 justify-center">
                                    <Button type="button" size="sm" variant="ghost" onClick={() => startEditAddon(index)}><Edit className="h-4 w-4 text-blue-500" /></Button>
                                    <Button type="button" size="sm" variant="ghost" onClick={() => removeAddon(addon.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}

                    {/* Bill Totals */}
                    {(billForm.items.length > 0 || addons.length > 0) && (
                      <div className="flex justify-end">
                        <div className="w-64 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>₹{Math.round(calculateBillTotals().subtotal).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-red-600">
                            <span>Discount:</span>
                            <span>-₹{Math.round(calculateBillTotals().totalDiscount).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>GST ({billForm.gst}%):</span>
                            <span>₹{Math.round(calculateBillTotals().totalTax).toLocaleString()}</span>
                          </div>
                          {calculateBillTotals().totalAddons > 0 && (
                            <div className="flex justify-between text-blue-600">
                              <span>Addons:</span>
                              <span>+₹{Math.round(calculateBillTotals().totalAddons).toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-lg border-t pt-2">
                            <span>Grand Total:</span>
                            <span>₹{Math.round(calculateBillTotals().grandTotal).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div>
                  <Label htmlFor="bill-notes">{t('notes')}</Label>
                  <Input
                    id="bill-notes"
                    value={billForm.notes}
                    onChange={(e) => setBillForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder={t('additionalNotesOrTerms')}
                  />
                </div>

                {errors.items && <FieldError message={errors.items} />}
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => {
                    setShowCreateBill(false);
                    setEditingBill(null);
                    resetBillForm();
                  }}>
                    {t('cancel')}
                  </Button>
                  {editingBill ? (
                    <Button type="button" onClick={handleUpdateBill} disabled={billForm.items.length === 0 || (!billForm.client_id && !clientSearchQuery.trim())}>
                      <FileText className="mr-2 h-4 w-4" />
                      {activeTab === 'non-gst-bills' ? t('updateQuotationBill') : t('updateInvoice')}
                    </Button>
                  ) : (
                    <Button type="submit" disabled={billForm.items.length === 0 || (!billForm.client_id && !clientSearchQuery.trim())}>
                      <FileText className="mr-2 h-4 w-4" />
                      {activeTab === 'non-gst-bills' ? t('createQuotationBill') : t('createInvoice')}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Add New Client Dialog */}
        <Dialog open={showAddClientDialog} onOpenChange={(open: boolean) => { setShowAddClientDialog(open); if (!open) setClientErrors({}); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('addNewClient')}</DialogTitle>
              <DialogDescription>
                {t('enterNewClientDetails')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('companyName')} *</Label>
                <Input
                  value={newClientForm.name}
                  onChange={(e) => { setNewClientForm({ ...newClientForm, name: e.target.value }); setClientErrors(prev => ({ ...prev, name: '' })); }}
                  placeholder={t('companyName')}
                />
                <FieldError message={clientErrors.name} />
              </div>
              <div className="space-y-2">
                <Label>{t('contactPerson')} *</Label>
                <Input
                  value={newClientForm.contactPerson}
                  onChange={(e) => { setNewClientForm({ ...newClientForm, contactPerson: e.target.value }); setClientErrors(prev => ({ ...prev, contactPerson: '' })); }}
                  placeholder={t('contactPersonName')}
                />
                <FieldError message={clientErrors.contactPerson} />
              </div>
              <div className="space-y-2">
                <Label>{t('phone')} *</Label>
                <Input
                  value={newClientForm.phone}
                  onChange={(e) => { setNewClientForm({ ...newClientForm, phone: e.target.value }); setClientErrors(prev => ({ ...prev, phone: '' })); }}
                  placeholder="+91 98765 43210"
                />
                <FieldError message={clientErrors.phone} />
              </div>
              <div className="space-y-2">
                <Label>{t('email')} *</Label>
                <Input
                  type="email"
                  value={newClientForm.email}
                  onChange={(e) => { setNewClientForm({ ...newClientForm, email: e.target.value }); setClientErrors(prev => ({ ...prev, email: '' })); }}
                  placeholder="email@example.com"
                />
                <FieldError message={clientErrors.email} />
              </div>
              <div className="space-y-2">
                <Label>{t('address')} *</Label>
                <Input
                  value={newClientForm.address}
                  onChange={(e) => { setNewClientForm({ ...newClientForm, address: e.target.value }); setClientErrors(prev => ({ ...prev, address: '' })); }}
                  placeholder={t('fullAddress')}
                />
                <FieldError message={clientErrors.address} />
              </div>
              <div className="space-y-2">
                <Label>GST No. *</Label>
                <Input
                  value={newClientForm.gstNo}
                  onChange={(e) => { setNewClientForm({ ...newClientForm, gstNo: e.target.value }); setClientErrors(prev => ({ ...prev, gstNo: '' })); }}
                  placeholder="07AABCA1234D1ZD"
                />
                <FieldError message={clientErrors.gstNo} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddClientDialog(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={handleAddNewClient}>
                <Plus className="mr-2 h-4 w-4" />
                {t('addClient')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('billing')}</h1>
          <p className="text-muted-foreground">{t('createInvoicesAndManagePayments')}</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-500/10 backdrop-blur-sm border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalBilled')}</CardTitle>
            <Receipt className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">₹{totalBillValue.toLocaleString()}</div>
            <p className="text-xs text-blue-600">{bills.length} {t('invoices')}</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/10 backdrop-blur-sm border-emerald-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('amountReceived')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">₹{totalReceived.toLocaleString()}</div>
            <p className="text-xs text-emerald-600">{payments.length} {t('payments')}</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/10 backdrop-blur-sm border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('pendingAmount')}</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">₹{totalPending.toLocaleString()}</div>
            <p className="text-xs text-amber-600">{pendingBills.length} {t('pending')}</p>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 backdrop-blur-sm border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('overdue')}</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{overdueCount}</div>
            <p className="text-xs text-red-600">{t('needAttention')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Warning */}
      {stockItems.some(s => s.currentStock < 50) && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800">{t('lowStock')}</p>
              <p className="text-sm text-amber-600">
                {t('someItemsAreRunningLow')} {stockItems.filter(s => s.currentStock < 50).map(s => s.name).join(', ')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val: string) => setActiveTab(val as 'gst-bills' | 'non-gst-bills')} className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList className="grid w-full max-w-lg grid-cols-2">
            <TabsTrigger value="gst-bills">{t('invoice')}</TabsTrigger>
            <TabsTrigger value="non-gst-bills">{t('quotationBill')}</TabsTrigger>
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
        <TabsContent value="gst-bills" className="space-y-4">
          <Card>
            <CardHeader>
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
                <Button variant="outline" onClick={() => exportBillsCSV(bills.filter(b => b.gst_rate > 0 && ((b.bill_no || '').toLowerCase().includes(searchTerm.toLowerCase()) || (b.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()))))}>
                  <Download className="mr-2 h-4 w-4" />
                  {t('export')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
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
                  {bills.filter(bill => 
                    ((bill.bill_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (bill.client_name || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
                    bill.gst_rate > 0
                  ).map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium font-mono">{bill.bill_no}</TableCell>
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
                          onChange={(e) => handlePaymentStatusChange(bill.id, e.target.value as 'paid' | 'partial' | 'pending' | 'overdue')}
                          className={`text-xs font-medium rounded-full px-3 py-1.5 border cursor-pointer outline-none appearance-none bg-white ${getStatusColor(bill.payment_status)}`}
                        >
                          <option value="paid">Paid</option>
                          <option value="partial">Partial</option>
                          <option value="pending">Pending</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </TableCell>
                      <TableCell className="text-right">
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
                          onClick={() => handleViewBill(bill)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={!printedBills.has(bill.id) ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" : ""}
                          onClick={() => {
                            if (!printedBills.has(bill.id)) {
                              setPrintedBills(prev => new Set(prev).add(bill.id));
                            }
                            generateBillPDF(bill);
                          }}
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
        <TabsContent value="non-gst-bills" className="space-y-4">
          <Card>
            <CardHeader>
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
                <Button variant="outline" onClick={() => exportBillsCSV(bills.filter(b => b.gst_rate === 0 && ((b.bill_no || '').toLowerCase().includes(searchTerm.toLowerCase()) || (b.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()))))}>
                  <Download className="mr-2 h-4 w-4" />
                  {t('export')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
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
                  {bills.filter(bill => 
                    ((bill.bill_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (bill.client_name || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
                    bill.gst_rate === 0
                  ).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        {t('noQuotationBillsFound')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    bills.filter(bill => 
                      ((bill.bill_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (bill.client_name || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
                      bill.gst_rate === 0
                    ).map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium font-mono">{bill.bill_no}</TableCell>
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
                            onChange={(e) => handlePaymentStatusChange(bill.id, e.target.value as 'paid' | 'partial' | 'pending' | 'overdue')}
                            className={`text-xs font-medium rounded-full px-3 py-1.5 border cursor-pointer outline-none appearance-none bg-white ${getStatusColor(bill.payment_status)}`}
                          >
                            <option value="paid">Paid</option>
                            <option value="partial">Partial</option>
                            <option value="pending">Pending</option>
                            <option value="overdue">Overdue</option>
                          </select>
                        </TableCell>
                        <TableCell className="text-right">
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
                            onClick={() => handleViewBill(bill)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={!printedBills.has(bill.id) ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" : ""}
                            onClick={() => {
                              if (!printedBills.has(bill.id)) {
                                setPrintedBills(prev => new Set(prev).add(bill.id));
                              }
                              generateBillPDF(bill);
                            }}
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
