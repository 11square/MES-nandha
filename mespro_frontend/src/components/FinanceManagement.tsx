import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { validateFields, FieldError, blockInvalidNumberKeys, type ValidationErrors } from '../lib/validation';
import { Textarea } from './ui/textarea';
import { translations, Language } from '../translations';
import { ConfirmDialog } from './ui/confirm-dialog';

interface FinanceManagementProps {
  language?: Language;
}
import { financeService } from '../services/finance.service';
import { clientsService } from '../services/clients.service';
import { vendorsService } from '../services/vendors.service';
import { billingService } from '../services/billing.service';
import { 
  Bell, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Plus, 
  Search, 
  Filter,
  Download,
  Send,
  Eye,
  Edit,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeft,
  CreditCard,
  Building,
  Calendar,
  DollarSign,
  Receipt
} from 'lucide-react';

interface Transaction {
  id: string;
  _source?: 'transaction' | 'order' | 'bill' | 'purchase_order';
  _sourceId?: number;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  gst_number: string;
  mobile_number?: string;
  client?: string;
  client_name?: string;
  vendor?: string;
  vendor_name?: string;
  party_type?: 'client' | 'vendor' | 'others';
  address?: string;
  bill_id?: number;
  payment_type?: string;
  status: 'completed' | 'pending' | 'partial' | 'cancelled';
  reference?: string;
}

export default function FinanceManagement({ language = 'en' }: FinanceManagementProps) {
  const t = (key: keyof typeof translations.en) => translations[language][key] || translations.en[key];
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showViewTransaction, setShowViewTransaction] = useState(false);
  const [showEditTransaction, setShowEditTransaction] = useState(false);
  const [showAddReceipt, setShowAddReceipt] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [activeTab, setActiveTab] = useState('transactions');
  const [transactionForm, setTransactionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'income' as 'income' | 'expense',
    category: '',
    description: '',
    amount: '',
    payment_method: 'Cash',
    party_type: 'client' as 'client' | 'vendor' | 'others',
    mobile_number: '',
    client: '',
    vendor: '',
    address: '',
    payment_type: '' as '' | 'cash' | 'credit',
    status: 'completed' as 'completed' | 'pending' | 'cancelled'
  });
  const [gstError, setGstError] = useState('');
  const [editGstError, setEditGstError] = useState('');

  const validateGstNumber = (value: string): string => {
    if (!value) return '';
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (value.length !== 15) return 'GST number must be 15 characters';
    if (!gstRegex.test(value.toUpperCase())) return 'Invalid GST format (e.g. 22AAAAA0000A1Z5)';
    return '';
  };
  const [editTransactionForm, setEditTransactionForm] = useState({
    id: '',
    date: '',
    type: 'income' as 'income' | 'expense',
    category: '',
    description: '',
    amount: '',
    payment_method: 'Cash',
    party_type: 'client' as 'client' | 'vendor' | 'others',
    mobile_number: '',
    client: '',
    vendor: '',
    address: '',
    payment_type: '' as '' | 'cash' | 'credit',
    status: 'completed' as 'completed' | 'pending' | 'cancelled'
  });
  const [editTxErrors, setEditTxErrors] = useState<ValidationErrors>({});
  const [txErrors, setTxErrors] = useState<ValidationErrors>({});
  const [rcErrors, setRcErrors] = useState<ValidationErrors>({});

  const [transactionsData, setTransactionsData] = useState<Transaction[]>([]);
  const [clientsList, setClientsList] = useState<Array<{ id: string; name: string; phone: string; address: string; gst_number: string }>>([]);
  const [vendorsList, setVendorsList] = useState<Array<{ id: string; name: string; phone: string; address: string; outstanding_amount: number }>>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showEditClientDropdown, setShowEditClientDropdown] = useState(false);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [showEditVendorDropdown, setShowEditVendorDropdown] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const editClientDropdownRef = useRef<HTMLDivElement>(null);
  const vendorDropdownRef = useRef<HTMLDivElement>(null);
  const editVendorDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) setShowClientDropdown(false);
      if (editClientDropdownRef.current && !editClientDropdownRef.current.contains(e.target as Node)) setShowEditClientDropdown(false);
      if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(e.target as Node)) setShowVendorDropdown(false);
      if (editVendorDropdownRef.current && !editVendorDropdownRef.current.contains(e.target as Node)) setShowEditVendorDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const defaultCategories = [
    'Sales', 'Purchase', 'Salary', 'Rent', 'Transport', 'Other'
  ];

  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('finance_custom_categories');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showEditAddCategory, setShowEditAddCategory] = useState(false);
  const [newEditCategoryName, setNewEditCategoryName] = useState('');

  // Merge default + custom + categories from existing transactions
  const allCategories = Array.from(new Set([
    ...defaultCategories,
    ...customCategories,
    ...transactionsData.map(tx => tx.category).filter(Boolean),
  ])).sort();

  const handleAddCategory = (name: string, isCreate: boolean) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!customCategories.includes(trimmed) && !defaultCategories.includes(trimmed)) {
      const updated = [...customCategories, trimmed];
      setCustomCategories(updated);
      localStorage.setItem('finance_custom_categories', JSON.stringify(updated));
    }
    if (isCreate) {
      setTransactionForm(prev => ({ ...prev, category: trimmed }));
      setTxErrors(prev => ({ ...prev, category: '' }));
      setShowAddCategory(false);
      setNewCategoryName('');
    } else {
      setEditTransactionForm(prev => ({ ...prev, category: trimmed }));
      setEditTxErrors(prev => ({ ...prev, category: '' }));
      setShowEditAddCategory(false);
      setNewEditCategoryName('');
    }
    toast.success(`Category "${trimmed}" added`);
  };

  const paymentMethods = ['Cash', 'Bank Transfer', 'Cheque', 'Online', 'UPI', 'Credit Card'];

  // Cash Receipts data
  interface CashReceipt {
    id: string;
    bill_id: string;
    bill_no: string;
    client_name: string;
    date: string;
    amount: number;
    method: 'cash' | 'upi' | 'card' | 'bank';
    reference?: string;
    received_by: string;
    notes?: string;
  }

  const [receipts, setReceipts] = useState<CashReceipt[]>([]);
  const [outstandings, setOutstandings] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 });
  const [bills, setBills] = useState<any[]>([]);

  const refreshFinance = useCallback(async () => {
    try {
      const [txData, rcData, outData, summaryData, billsData] = await Promise.all([
        financeService.getAllTransactions(),
        financeService.getReceipts(),
        clientsService.getCreditOutstandings({ page: 1, limit: 10000 }),
        financeService.getSummary(),
        billingService.getAllBills(),
      ]);
      const txItems = Array.isArray(txData) ? txData : (txData as any)?.items || [];
      txItems.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || a.date || 0).getTime();
        const dateB = new Date(b.created_at || b.date || 0).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return (b._sourceId || 0) - (a._sourceId || 0);
      });
      setTransactionsData(txItems);
      const rcItems = Array.isArray(rcData) ? rcData : (rcData as any)?.items || [];
      rcItems.sort((a: any, b: any) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return (b.id || 0) - (a.id || 0);
      });
      setReceipts(rcItems);
      const outItems = Array.isArray(outData) ? outData : (outData as any)?.items || [];
      setOutstandings(outItems);
      setSummary({
        totalIncome: Number((summaryData as any)?.totalIncome || 0),
        totalExpense: Number((summaryData as any)?.totalExpense || 0),
      });
      const billItems = Array.isArray(billsData) ? billsData : (billsData as any)?.items || [];
      setBills(billItems);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { refreshFinance(); }, [refreshFinance]);

  useEffect(() => {
    clientsService.getClients().then(data => {
      const items = Array.isArray(data) ? data : (data as any)?.items || [];
      setClientsList(items.map((c: any) => ({
        id: String(c.id),
        name: c.name || '',
        phone: c.phone || c.mobile || '',
        address: c.address || '',
        gst_number: c.gst_number || '',
      })));
    }).catch(() => {});
    vendorsService.getVendors().then(data => {
      const items = Array.isArray(data) ? data : (data as any)?.items || [];
      setVendorsList(items.map((v: any) => ({
        id: String(v.id),
        name: v.name || '',
        phone: v.phone || '',
        address: v.address || '',
        outstanding_amount: Number(v.outstanding_amount || 0),
      })));
    }).catch(() => {});
  }, []);

  const filteredClientsList = clientsList.filter(c =>
    c.name.toLowerCase().includes((transactionForm.client || '').toLowerCase())
  );
  const filteredEditClientsList = clientsList.filter(c =>
    c.name.toLowerCase().includes((editTransactionForm.client || '').toLowerCase())
  );
  const filteredVendorsList = vendorsList.filter(v =>
    v.name.toLowerCase().includes((transactionForm.vendor || '').toLowerCase())
  );
  const filteredEditVendorsList = vendorsList.filter(v =>
    v.name.toLowerCase().includes((editTransactionForm.vendor || '').toLowerCase())
  );

  // Compute selected client's total credit outstanding balance
  const getClientCreditBalance = (clientName: string) => {
    if (!clientName) return 0;
    return outstandings
      .filter((o: any) => (o.client_name || '').toLowerCase() === clientName.toLowerCase() && o.status !== 'cleared')
      .reduce((sum: number, o: any) => sum + Math.max(0, Number(o.balance || 0)), 0);
  };
  const selectedClientBalance = getClientCreditBalance(transactionForm.client);

  // Compute selected vendor's outstanding balance
  const getVendorOutstanding = (vendorName: string) => {
    if (!vendorName) return 0;
    const vendor = vendorsList.find(v => v.name.toLowerCase() === vendorName.toLowerCase());
    return vendor ? vendor.outstanding_amount : 0;
  };
  const selectedVendorBalance = getVendorOutstanding(transactionForm.vendor);

  const [receiptForm, setReceiptForm] = useState({
    bill_no: '',
    client_name: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    method: 'cash' as 'cash' | 'upi' | 'card' | 'bank',
    reference: '',
    received_by: 'Admin',
    notes: '',
  });

  const resetReceiptForm = () => {
    setReceiptForm({
      bill_no: '',
      client_name: '',
      date: new Date().toISOString().split('T')[0],
      amount: '',
      method: 'cash',
      reference: '',
      received_by: 'Admin',
      notes: '',
    });
  };

  const handleAddReceipt = async () => {
    const validationErrors = validateFields(receiptForm, {
      bill_no: { required: true },
      client_name: { required: true },
      date: { required: true },
      amount: { required: true, numeric: true, min: 0 },
      method: { required: true },
      received_by: { required: true },
    });
    if (Object.keys(validationErrors).length) { setRcErrors(validationErrors); return; }
    try {
      await financeService.createReceipt({
        bill_no: receiptForm.bill_no,
        client_name: receiptForm.client_name,
        date: receiptForm.date,
        amount: parseFloat(receiptForm.amount) || 0,
        method: receiptForm.method,
        reference: receiptForm.reference,
        received_by: receiptForm.received_by,
        notes: receiptForm.notes,
      });
      toast.success('Receipt created successfully');
      await refreshFinance();
      setShowAddReceipt(false);
      resetReceiptForm();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create receipt');
    }
  };

  const resetTransactionForm = () => {
    setTransactionForm({
      date: new Date().toISOString().split('T')[0],
      type: 'income',
      category: '',
      description: '',
      amount: '',
      payment_method: 'Cash',
      party_type: 'client',
      mobile_number: '',
      client: '',
      vendor: '',
      address: '',
      payment_type: '' as '' | 'cash' | 'credit',
      status: 'completed'
    });
    setGstError('');
  };

  const handleAddTransaction = async () => {
    const validationErrors = validateFields(transactionForm, {
      date: { required: true },
      type: { required: true },
      category: { required: true },
      amount: { required: true, numeric: true, min: 0 },
      payment_method: { required: true },
    });
    if (Object.keys(validationErrors).length) { setTxErrors(validationErrors); return; }
    try {
      await financeService.createTransaction({
        date: transactionForm.date,
        type: transactionForm.type,
        category: transactionForm.category,
        description: transactionForm.description,
        amount: parseFloat(transactionForm.amount) || 0,
        payment_method: transactionForm.payment_method,
        party_type: transactionForm.party_type,
        mobile_number: transactionForm.mobile_number,
        client: transactionForm.party_type === 'client' ? transactionForm.client : undefined,
        vendor: transactionForm.party_type === 'vendor' ? transactionForm.vendor : undefined,
        address: transactionForm.address,
        payment_type: transactionForm.payment_type || undefined,
        status: transactionForm.status,
      });
      toast.success('Transaction created successfully');
      await refreshFinance();
      // Refresh vendor list to get updated outstanding amounts
      vendorsService.getVendors().then(data => {
        const items = Array.isArray(data) ? data : (data as any)?.items || [];
        setVendorsList(items.map((v: any) => ({
          id: String(v.id), name: v.name || '', phone: v.phone || '',
          address: v.address || '', outstanding_amount: Number(v.outstanding_amount || 0),
        })));
      }).catch(() => {});
      setShowAddTransaction(false);
      resetTransactionForm();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create transaction');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'pending':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'overdue':
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'partial':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getOutstandingBalance = (item: any) => {
    const value = Number(item?.balance ?? ((Number(item?.grand_total || 0) - Number(item?.paid_amount || 0)) || 0));
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  };

  const toCapitalized = (value: string) => {
    if (!value) return '—';
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  };

  const handleViewTransaction = async (transaction: Transaction) => {
    if (!transaction._source || transaction._source === 'transaction') {
      try {
        const rawId = String(transaction.id).replace(/^tx-/, '');
        const data = await financeService.getTransactionById(rawId);
        setSelectedTransaction((data as Transaction) || transaction);
      } catch {
        setSelectedTransaction(transaction);
      }
    } else {
      setSelectedTransaction(transaction);
    }
    setShowViewTransaction(true);
  };

  const handleEditTransactionOpen = async (transaction: Transaction) => {
    try {
      // Extract numeric ID from prefixed id (e.g. "tx-123" → "123")
      const rawId = String(transaction.id).replace(/^tx-/, '');
      const data = await financeService.getTransactionById(rawId);
      const tx = (data as Transaction) || transaction;
      setEditTransactionForm({
        id: rawId,
        date: tx.date ? String(tx.date).split('T')[0] : new Date().toISOString().split('T')[0],
        type: tx.type,
        category: tx.category || '',
        description: tx.description || '',
        amount: String(tx.amount ?? ''),
        payment_method: tx.payment_method || 'Cash',
        party_type: ((tx as any).party_type || (tx.vendor_name ? 'vendor' : 'client')) as 'client' | 'vendor' | 'others',
        mobile_number: tx.mobile_number || '',
        client: (tx as any).client_name || tx.client || '',
        vendor: (tx as any).vendor_name || tx.vendor || '',
        address: tx.address || '',
        payment_type: ((tx as any).payment_type || '') as '' | 'cash' | 'credit',
        status: (tx.status as any) || 'completed',
      });
    } catch {
      const rawId = String(transaction.id).replace(/^tx-/, '');
      setEditTransactionForm({
        id: rawId,
        date: transaction.date ? String(transaction.date).split('T')[0] : new Date().toISOString().split('T')[0],
        type: transaction.type,
        category: transaction.category || '',
        description: transaction.description || '',
        amount: String(transaction.amount ?? ''),
        payment_method: transaction.payment_method || 'Cash',
        party_type: ((transaction as any).party_type || (transaction.vendor_name ? 'vendor' : 'client')) as 'client' | 'vendor' | 'others',
        mobile_number: transaction.mobile_number || '',
        client: (transaction as any).client_name || transaction.client || '',
        vendor: (transaction as any).vendor_name || transaction.vendor || '',
        address: transaction.address || '',
        payment_type: (transaction.payment_type || '') as '' | 'cash' | 'credit',
        status: (transaction.status as any) || 'completed',
      });
    }
    setEditTxErrors({});
    setEditGstError('');
    setShowEditTransaction(true);
  };

  const handleUpdateTransaction = async () => {
    const validationErrors = validateFields(editTransactionForm, {
      date: { required: true },
      type: { required: true },
      category: { required: true },
      amount: { required: true, numeric: true, min: 0 },
      payment_method: { required: true },
    });
    if (Object.keys(validationErrors).length) { setEditTxErrors(validationErrors); return; }

    try {
      await financeService.updateTransaction(editTransactionForm.id, {
        date: editTransactionForm.date,
        type: editTransactionForm.type,
        category: editTransactionForm.category,
        description: editTransactionForm.description,
        amount: parseFloat(editTransactionForm.amount) || 0,
        payment_method: editTransactionForm.payment_method,
        party_type: editTransactionForm.party_type,
        mobile_number: editTransactionForm.mobile_number,
        client: editTransactionForm.party_type === 'client' ? editTransactionForm.client : undefined,
        vendor: editTransactionForm.party_type === 'vendor' ? editTransactionForm.vendor : undefined,
        address: editTransactionForm.address,
        payment_type: editTransactionForm.payment_type || undefined,
        status: editTransactionForm.status,
      });
      toast.success('Transaction updated successfully');
      await refreshFinance();
      setShowEditTransaction(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update transaction');
    }
  };

  const confirmDeleteTransaction = async () => {
    try {
      // Extract numeric ID from prefixed id (e.g. "tx-123" → "123")
      const rawId = deleteConfirm.id.replace(/^tx-/, '');
      await financeService.deleteTransaction(rawId);
      toast.success('Transaction deleted successfully');
      await refreshFinance();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete transaction');
    } finally {
      setDeleteConfirm({ open: false, id: '' });
    }
  };

  // Compute totals from actual transactions data as primary source, fallback to summary API
  const computedIncome = transactionsData
    .filter(tx => tx.type === 'income' && tx.status !== 'cancelled')
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  const computedExpense = transactionsData
    .filter(tx => tx.type === 'expense' && tx.status !== 'cancelled')
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  const computedPending = transactionsData
    .filter(tx => tx.status === 'pending')
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const totalIncome = computedIncome || summary.totalIncome;
  const totalExpense = computedExpense || summary.totalExpense;

  // Filter transactions by source and type
  const filteredTransactions = transactionsData
    .filter(tx => {
      if (sourceFilter !== 'all' && ((tx as any)._source || 'transaction') !== sourceFilter) return false;
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      return true;
    })
    .sort((a: any, b: any) => {
      // Primary: by transaction date (desc), fall back to created_at
      const aDate = new Date(a.date || a.created_at || 0).getTime();
      const bDate = new Date(b.date || b.created_at || 0).getTime();
      if (bDate !== aDate) return bDate - aDate;
      const aCreated = new Date(a.created_at || 0).getTime();
      const bCreated = new Date(b.created_at || 0).getTime();
      if (bCreated !== aCreated) return bCreated - aCreated;
      return (b._sourceId || 0) - (a._sourceId || 0);
    });

  const totalReceivable = computedPending || outstandings
    .filter((item: any) => getOutstandingBalance(item) > 0)
    .reduce((sum: number, item: any) => sum + getOutstandingBalance(item), 0);
  const overdueAmount = outstandings
    .filter((item: any) => String(item?.status || '').toLowerCase() === 'overdue' || Number(item?.days_overdue || 0) > 0)
    .reduce((sum: number, item: any) => sum + getOutstandingBalance(item), 0);

  return (
    <div className="space-y-6">
      {showAddTransaction ? (
      /* ===== Full-Page Add Transaction Form ===== */
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => { setShowAddTransaction(false); resetTransactionForm(); setTxErrors({}); }}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('addNewTransaction')}</h1>
            <p className="text-sm text-muted-foreground">Fill in the details to record a new transaction</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Form Fields (2/3) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-lg border bg-white p-6 space-y-4 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('date')} *</Label>
                <Input 
                  type="date"
                  value={transactionForm.date}
                  onChange={(e) => { setTransactionForm({...transactionForm, date: e.target.value}); setTxErrors(prev => ({...prev, date: ''})); }}
                />
                <FieldError message={txErrors.date} />
              </div>
              <div className="space-y-2">
                <Label>{t('type')} *</Label>
                <Select 
                  value={transactionForm.type} 
                  onValueChange={(value: 'income' | 'expense') => { setTransactionForm({...transactionForm, type: value}); setTxErrors(prev => ({...prev, type: ''})); }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">
                      <span className="flex items-center gap-2">
                        <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                        {t('income')}
                      </span>
                    </SelectItem>
                    <SelectItem value="expense">
                      <span className="flex items-center gap-2">
                        <ArrowUpRight className="w-4 h-4 text-red-600" />
                        {t('expense')}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {txErrors.type && <FieldError message={txErrors.type} />}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('category')} *</Label>
                {showAddCategory ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder={language === 'en' ? 'New category name' : 'புதிய வகை பெயர்'}
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(newCategoryName, true); } }}
                      autoFocus
                    />
                    <Button type="button" size="sm" onClick={() => handleAddCategory(newCategoryName, true)} className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-3">
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => { setShowAddCategory(false); setNewCategoryName(''); }} className="h-9 px-3">
                      ✕
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select 
                      value={transactionForm.category} 
                      onValueChange={(value: string) => { setTransactionForm({...transactionForm, category: value}); setTxErrors(prev => ({...prev, category: ''})); }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectCategory')} />
                      </SelectTrigger>
                      <SelectContent className="max-h-56 overflow-y-auto">
                        {allCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" size="sm" variant="outline" onClick={() => setShowAddCategory(true)} title="Add new category" className="h-9 px-3">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <FieldError message={txErrors.category} />
              </div>
              <div className="space-y-2">
                <Label>{t('amount')} *</Label>
                <Input 
                  type="number"
                  value={transactionForm.amount}
                  onChange={(e) => { setTransactionForm({...transactionForm, amount: e.target.value}); setTxErrors(prev => ({...prev, amount: ''})); }}
                  onKeyDown={blockInvalidNumberKeys}
                  placeholder="0.00"
                />
                <FieldError message={txErrors.amount} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('paymentMethod')} *</Label>
                <Select 
                  value={transactionForm.payment_method} 
                  onValueChange={(value: string) => { setTransactionForm({...transactionForm, payment_method: value}); setTxErrors(prev => ({...prev, payment_method: ''})); }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {txErrors.payment_method && <FieldError message={txErrors.payment_method} />}
              </div>
              <div className="space-y-2">
                <Label>{t('mobileNumber')}</Label>
                <Input 
                  value={transactionForm.mobile_number}
                  onChange={(e) => setTransactionForm({...transactionForm, mobile_number: e.target.value})}
                  placeholder="+91 9876543210"
                  type="tel"
                />
              </div>
            </div>

            {/* Party Type Toggle + Client/Vendor Search inline */}
            <div className="space-y-2">
              <Label>Select Client or Vendor</Label>
              <div className="flex gap-2 items-start">
                <div className="flex gap-1 shrink-0 pt-0.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={transactionForm.party_type === 'client' ? 'default' : 'outline'}
                    className={transactionForm.party_type === 'client' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
                    onClick={() => setTransactionForm(prev => ({ ...prev, party_type: 'client', vendor: '' }))}
                  >
                    <Building className="w-4 h-4 mr-1" /> Client
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={transactionForm.party_type === 'vendor' ? 'default' : 'outline'}
                    className={transactionForm.party_type === 'vendor' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}
                    onClick={() => setTransactionForm(prev => ({ ...prev, party_type: 'vendor', client: '' }))}
                  >
                    <Building className="w-4 h-4 mr-1" /> Vendor
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={transactionForm.party_type === 'others' ? 'default' : 'outline'}
                    className={transactionForm.party_type === 'others' ? 'bg-slate-600 hover:bg-slate-700 text-white' : ''}
                    onClick={() => setTransactionForm(prev => ({ ...prev, party_type: 'others', client: '', vendor: '' }))}
                  >
                    Others
                  </Button>
                </div>
              {transactionForm.party_type === 'client' ? (
                <div className="flex-1 relative" ref={clientDropdownRef}>
                  <Input 
                    value={transactionForm.client}
                    onChange={(e) => { setTransactionForm({...transactionForm, client: e.target.value}); setShowClientDropdown(true); }}
                    onFocus={() => setShowClientDropdown(true)}
                    placeholder="Search client..."
                    autoComplete="off"
                  />
                  {showClientDropdown && filteredClientsList.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredClientsList.map(c => {
                        const cBal = getClientCreditBalance(c.name);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-slate-100 last:border-b-0"
                            onClick={() => {
                              setTransactionForm(prev => ({
                                ...prev,
                                client: c.name,
                                address: c.address || prev.address,
                                mobile_number: c.phone || prev.mobile_number,
                                payment_type: cBal > 0 ? 'credit' : 'cash',
                              }));
                              setShowClientDropdown(false);
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <div className="font-medium">{c.name}</div>
                              {cBal > 0 && <span className="text-xs font-medium text-orange-600">₹{cBal.toLocaleString()} due</span>}
                            </div>
                            {c.phone && <div className="text-xs text-slate-500">{c.phone}</div>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : transactionForm.party_type === 'vendor' ? (
                <div className="flex-1 relative" ref={vendorDropdownRef}>
                  <Input 
                    value={transactionForm.vendor}
                    onChange={(e) => { setTransactionForm({...transactionForm, vendor: e.target.value}); setShowVendorDropdown(true); }}
                    onFocus={() => setShowVendorDropdown(true)}
                    placeholder="Search vendor..."
                    autoComplete="off"
                  />
                  {showVendorDropdown && filteredVendorsList.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredVendorsList.map(v => (
                        <button
                          key={v.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-purple-50 text-sm border-b border-slate-100 last:border-b-0"
                          onClick={() => {
                            setTransactionForm(prev => ({
                              ...prev,
                              vendor: v.name,
                              address: v.address || prev.address,
                              mobile_number: v.phone || prev.mobile_number,
                            }));
                            setShowVendorDropdown(false);
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <div className="font-medium">{v.name}</div>
                            {v.outstanding_amount > 0 && <span className="text-xs font-medium text-orange-600">₹{v.outstanding_amount.toLocaleString()} due</span>}
                          </div>
                          {v.phone && <div className="text-xs text-slate-500">{v.phone}</div>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('address')}</Label>
                <Input 
                  value={transactionForm.address}
                  onChange={(e) => setTransactionForm({...transactionForm, address: e.target.value})}
                  placeholder="Enter address"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('status')}</Label>
                <Select 
                  value={transactionForm.status} 
                  onValueChange={(value: 'completed' | 'pending' | 'cancelled') => setTransactionForm({...transactionForm, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">
                      <span className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        {t('completed')}
                      </span>
                    </SelectItem>
                    <SelectItem value="pending">
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600" />
                        {t('pending')}
                      </span>
                    </SelectItem>
                    <SelectItem value="cancelled">
                      <span className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        {t('cancelled')}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('description')}</Label>
              <Textarea 
                value={transactionForm.description}
                onChange={(e) => { setTransactionForm({...transactionForm, description: e.target.value}); }}
                placeholder="Optional description"
                rows={2}
              />
            </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowAddTransaction(false); resetTransactionForm(); setTxErrors({}); }}>
                {t('cancel')}
              </Button>
              <Button 
                onClick={handleAddTransaction} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!transactionForm.date || !transactionForm.category || !transactionForm.amount}
              >
                {t('addTransaction')}
              </Button>
            </div>
          </div>

          {/* Right: Payment Summary Panel (1/3) */}
          <div className="space-y-4">
            <div className="rounded-lg border bg-white shadow-sm">
              <div className="py-3 px-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Payment Summary</h3>
              </div>
              <div className="px-4 pb-4 pt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type</span>
                  <span className={`font-medium ${transactionForm.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {transactionForm.type === 'income' ? 'Income' : 'Expense'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Method</span>
                  <span className="font-medium">{transactionForm.payment_method || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Category</span>
                  <span className="font-medium truncate ml-2">{transactionForm.category || '—'}</span>
                </div>
                {transactionForm.party_type !== 'others' && (transactionForm.client || transactionForm.vendor) && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{transactionForm.party_type === 'client' ? 'Client' : 'Vendor'}</span>
                    <span className="font-medium truncate ml-2">{transactionForm.client || transactionForm.vendor}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t-2 border-gray-800 pt-2 mt-2">
                  <span>Amount</span>
                  <span className={transactionForm.type === 'income' ? 'text-emerald-700' : 'text-red-700'}>
                    ₹{parseFloat(transactionForm.amount || '0').toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Outstanding Balance Card — Client */}
            {transactionForm.party_type === 'client' && transactionForm.client && selectedClientBalance > 0 && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 shadow-sm">
                <div className="py-3 px-4 border-b border-orange-200">
                  <h3 className="text-sm font-semibold text-orange-700 uppercase tracking-wide">Outstanding Balance</h3>
                </div>
                <div className="px-4 pb-4 pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-orange-600">Client</span>
                    <span className="font-medium text-gray-800 truncate ml-2">{transactionForm.client}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-orange-200 pt-2 mt-1">
                    <span className="text-orange-700">Outstanding</span>
                    <span className="text-orange-700">₹{selectedClientBalance.toLocaleString()}</span>
                  </div>
                  {transactionForm.type === 'income' && transactionForm.amount && parseFloat(transactionForm.amount) > 0 && (
                    <div className="flex justify-between border-t border-orange-200 pt-2 mt-1">
                      <span className="text-orange-600">After Payment</span>
                      <span className={`font-bold ${(selectedClientBalance - (parseFloat(transactionForm.amount) || 0)) <= 0 ? 'text-emerald-600' : 'text-orange-700'}`}>
                        ₹{Math.max(0, selectedClientBalance - (parseFloat(transactionForm.amount) || 0)).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {transactionForm.type === 'expense' && transactionForm.amount && parseFloat(transactionForm.amount) > 0 && (
                    <div className="flex justify-between border-t border-orange-200 pt-2 mt-1">
                      <span className="text-orange-600">After Expense</span>
                      <span className="font-bold text-red-600">
                        ₹{(selectedClientBalance + (parseFloat(transactionForm.amount) || 0)).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Outstanding Balance Card — Vendor */}
            {transactionForm.party_type === 'vendor' && transactionForm.vendor && selectedVendorBalance > 0 && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 shadow-sm">
                <div className="py-3 px-4 border-b border-orange-200">
                  <h3 className="text-sm font-semibold text-orange-700 uppercase tracking-wide">Outstanding Balance</h3>
                </div>
                <div className="px-4 pb-4 pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-orange-600">Vendor</span>
                    <span className="font-medium text-gray-800 truncate ml-2">{transactionForm.vendor}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-orange-200 pt-2 mt-1">
                    <span className="text-orange-700">Outstanding</span>
                    <span className="text-orange-700">₹{selectedVendorBalance.toLocaleString()}</span>
                  </div>
                  {transactionForm.type === 'income' && transactionForm.amount && parseFloat(transactionForm.amount) > 0 && (
                    <div className="flex justify-between border-t border-orange-200 pt-2 mt-1">
                      <span className="text-orange-600">After Payment</span>
                      <span className={`font-bold ${(selectedVendorBalance - (parseFloat(transactionForm.amount) || 0)) <= 0 ? 'text-emerald-600' : 'text-orange-700'}`}>
                        ₹{Math.max(0, selectedVendorBalance - (parseFloat(transactionForm.amount) || 0)).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {transactionForm.type === 'expense' && transactionForm.amount && parseFloat(transactionForm.amount) > 0 && (
                    <div className="flex justify-between border-t border-orange-200 pt-2 mt-1">
                      <span className="text-orange-600">After Payment</span>
                      <span className={`font-bold ${(selectedVendorBalance - (parseFloat(transactionForm.amount) || 0)) <= 0 ? 'text-emerald-600' : 'text-orange-700'}`}>
                        ₹{Math.max(0, selectedVendorBalance - (parseFloat(transactionForm.amount) || 0)).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Status Preview */}
            <div className="rounded-lg border bg-white shadow-sm">
              <div className="py-3 px-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Status</h3>
              </div>
              <div className="px-4 pb-4 pt-3 flex flex-col items-center gap-2">
                {transactionForm.status === 'completed' && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium"><CheckCircle className="w-4 h-4" /> Completed</span>}
                {transactionForm.status === 'pending' && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm font-medium"><Clock className="w-4 h-4" /> Pending</span>}
                {transactionForm.status === 'cancelled' && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-sm font-medium"><AlertCircle className="w-4 h-4" /> Cancelled</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
      ) : (
      <>
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{t('financeManagement')}</h1>
          <p className="text-muted-foreground">{t('managePaymentsAndTransactions')}</p>
        </div>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">{t('totalIncome')}</p>
          <p className="text-2xl text-gray-800 font-semibold">₹{totalIncome.toLocaleString()}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">{t('totalExpenses')}</p>
          <p className="text-2xl text-gray-800 font-semibold">₹{totalExpense.toLocaleString()}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">{t('pendingPayments')}</p>
          <p className="text-2xl text-gray-800 font-semibold">₹{totalReceivable.toLocaleString()}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">{t('overdue')}</p>
          <p className="text-2xl text-gray-800 font-semibold">₹{overdueAmount.toLocaleString()}</p>
        </motion.div>
      </div>

      {/* Tabs for Transactions, Follow-ups, and Outstandings */}
      
      <Tabs defaultValue="transactions" className="w-full" onValueChange={(value) => setActiveTab(value)}>
        <div className='flex justify-between items-center mb-4'>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="transactions">{t('transactions')}</TabsTrigger>
          <TabsTrigger value="receipts">{t('receipts')}</TabsTrigger>
        </TabsList>
        {activeTab === 'transactions' ? (
          <Button 
            onClick={() => setShowAddTransaction(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4" />
            {t('addTransaction')}
          </Button>
        ) : (
          <Button 
            onClick={() => setShowAddReceipt(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="w-4 h-4" />
            {t('addReceipt')}
          </Button>
        )}
        </div>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-lg border border-gray-200 shadow-sm"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg text-gray-800 font-semibold flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-gray-600" />
                    Transactions
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">All income and expense transactions</p>
                </div>
                
              </div>
              {/* Type & Source filters */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {[
                  { key: 'all' as const, label: 'All Types' },
                  { key: 'income' as const, label: 'Income' },
                  { key: 'expense' as const, label: 'Expense' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setTypeFilter(f.key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                      typeFilter === f.key
                        ? f.key === 'income' ? 'bg-emerald-600 text-white border-emerald-600'
                          : f.key === 'expense' ? 'bg-red-600 text-white border-red-600'
                          : 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
                <div className="w-px h-5 bg-gray-300 mx-1" />
                {[
                  { key: 'all', label: 'All' },
                  { key: 'transaction', label: 'Manual' },
                  { key: 'order', label: 'Orders' },
                  { key: 'bill', label: 'Invoices' },
                  { key: 'purchase_order', label: 'Purchase Orders' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setSourceFilter(f.key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                      sourceFilter === f.key
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {f.label}
                    {f.key !== 'all' && (
                      <span className="ml-1.5 text-[10px] opacity-80">
                        ({transactionsData.filter(tx => (tx._source || 'transaction') === f.key).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">Date</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">Type</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">Client / Vendor</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">Category</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">Description</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">Amount</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">Payment Type</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">Status</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Calendar className="w-3.5 h-3.5 text-gray-500" />
                          {new Date(transaction.date).toLocaleDateString('en-GB')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {transaction.type === 'income' ? (
                            <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium">
                              <ArrowDownRight className="w-3.5 h-3.5" />
                              Income
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 px-2.5 py-1 bg-red-100 text-red-700 rounded-md text-xs font-medium">
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              Expense
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 font-medium">{transaction.vendor_name || transaction.client_name || transaction.client || transaction.vendor || '—'}</div>
                        {(transaction as any).party_type && <div className="text-xs text-gray-400">{(transaction as any).party_type === 'vendor' ? 'Vendor' : 'Client'}</div>}
                        {transaction.address && <div className="text-xs text-gray-500 truncate max-w-[150px]">{transaction.address}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-gray-600">{transaction.category}</span>
                          {transaction._source && transaction._source !== 'transaction' && (
                            <span className={`inline-flex items-center w-fit px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              transaction._source === 'order' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                              transaction._source === 'bill' ? 'bg-violet-50 text-violet-600 border border-violet-200' :
                              transaction._source === 'purchase_order' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                              'bg-gray-50 text-gray-600 border border-gray-200'
                            }`}>
                              {transaction._source === 'order' ? 'Order' : transaction._source === 'bill' ? 'Invoice' : transaction._source === 'purchase_order' ? 'PO' : 'Transaction'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-[200px]">
                        <div className="truncate">{transaction.description}</div>
                        {transaction.reference && <div className="text-xs text-gray-400 truncate">{transaction.reference}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-medium ${
                          transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {transaction.payment_type ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${
                            transaction.payment_type === 'cash' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-orange-50 text-orange-700 border-orange-200'
                          }`}>
                            {transaction.payment_type === 'cash' ? <DollarSign className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                            {transaction.payment_type.charAt(0).toUpperCase() + transaction.payment_type.slice(1)}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <CreditCard className="w-3.5 h-3.5" />
                            {transaction.payment_method || '—'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusColor(transaction.status)}`}>
                          {transaction.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                          {transaction.status === 'pending' && <Clock className="w-3 h-3" />}
                          {transaction.status === 'partial' && <Clock className="w-3 h-3" />}
                          {transaction.status === 'cancelled' && <AlertCircle className="w-3 h-3" />}
                          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                            title="View Details"
                            onClick={() => handleViewTransaction(transaction)}
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                          {(!transaction._source || transaction._source === 'transaction') && (
                            <>
                              <button
                                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                title="Edit"
                                onClick={() => handleEditTransactionOpen(transaction)}
                              >
                                <Edit className="w-4 h-4 text-gray-600" />
                              </button>
                              <button
                                className="p-1.5 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                                onClick={() => setDeleteConfirm({ open: true, id: String(transaction.id) })}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </TabsContent>

        {/* Receipts Tab (Cash Receipts) */}
        <TabsContent value="receipts" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-lg border border-gray-200 shadow-sm"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg text-gray-800 font-semibold flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-green-600" />
                    {t('cashReceipts')}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">{t('allReceivedPayments')}</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">{t('receiptNo')}</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">{t('invoiceNo')}</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">{t('date')}</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">{t('client')}</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">{t('amount')}</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">{t('method')}</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">{t('reference')}</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">{t('receivedBy')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {receipts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                        {t('noReceiptsFound')}
                      </td>
                    </tr>
                  ) : (
                    receipts.map((receipt) => (
                      <tr key={receipt.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium font-mono text-sm">{receipt.id}</td>
                        <td className="px-6 py-4 font-mono text-sm">{receipt.bill_no}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(receipt.date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-sm">{receipt.client_name}</td>
                        <td className="px-6 py-4 font-semibold text-green-600">₹{receipt.amount.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                            receipt.method === 'cash' ? 'bg-green-50 text-green-700 border-green-200' :
                            receipt.method === 'upi' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            receipt.method === 'card' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-gray-50 text-gray-700 border-gray-200'
                          }`}>
                            <CreditCard className="w-3 h-3" />
                            {receipt.method === 'cash' ? (t('cash')) :
                             receipt.method === 'upi' ? 'UPI' :
                             receipt.method === 'card' ? (t('card')) :
                             (t('bank'))}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-sm text-gray-600">{receipt.reference || '-'}</td>
                        <td className="px-6 py-4 text-sm">{receipt.received_by}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>

      <Dialog open={showViewTransaction} onOpenChange={setShowViewTransaction}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="grid grid-cols-2 gap-4 py-2">
              <div>
                <p className="text-xs text-gray-500">Date</p>
                <p className="text-sm font-medium">{selectedTransaction.date ? new Date(selectedTransaction.date).toLocaleDateString() : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <p className="text-sm font-medium">{toCapitalized(selectedTransaction.type)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{(selectedTransaction as any).party_type === 'vendor' ? 'Vendor' : 'Client'}</p>
                <p className="text-sm font-medium">{(selectedTransaction as any).vendor_name || selectedTransaction.client_name || selectedTransaction.client || selectedTransaction.vendor || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <p className="text-sm font-medium">{selectedTransaction.category || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Amount</p>
                <p className="text-sm font-medium">₹{Number(selectedTransaction.amount || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Payment Type</p>
                <p className="text-sm font-medium">
                  {selectedTransaction.payment_type ? (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      selectedTransaction.payment_type === 'cash' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {selectedTransaction.payment_type === 'cash' ? 'Cash' : 'Credit'}
                    </span>
                  ) : (selectedTransaction.payment_method || '—')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className="text-sm font-medium">{toCapitalized(selectedTransaction.status || '')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Mobile Number</p>
                <p className="text-sm font-medium">{selectedTransaction.mobile_number || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Address</p>
                <p className="text-sm font-medium">{selectedTransaction.address || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm font-medium">{selectedTransaction.description || '—'}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewTransaction(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditTransaction} onOpenChange={(open: boolean) => { setShowEditTransaction(open); if (!open) setEditTxErrors({}); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('date')} *</Label>
                <Input type="date" value={editTransactionForm.date} onChange={(e) => { setEditTransactionForm({ ...editTransactionForm, date: e.target.value }); setEditTxErrors(prev => ({ ...prev, date: '' })); }} />
                <FieldError message={editTxErrors.date} />
              </div>
              <div className="space-y-2">
                <Label>{t('type')} *</Label>
                <Select value={editTransactionForm.type} onValueChange={(value: 'income' | 'expense') => { setEditTransactionForm({ ...editTransactionForm, type: value }); setEditTxErrors(prev => ({ ...prev, type: '' })); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">{t('income')}</SelectItem>
                    <SelectItem value="expense">{t('expense')}</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError message={editTxErrors.type} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('category')} *</Label>
                {showEditAddCategory ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder={language === 'en' ? 'New category name' : 'புதிய வகை பெயர்'}
                      value={newEditCategoryName}
                      onChange={(e) => setNewEditCategoryName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(newEditCategoryName, false); } }}
                      autoFocus
                    />
                    <Button type="button" size="sm" onClick={() => handleAddCategory(newEditCategoryName, false)} className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-3">
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => { setShowEditAddCategory(false); setNewEditCategoryName(''); }} className="h-9 px-3">
                      ✕
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select value={editTransactionForm.category} onValueChange={(value: string) => { setEditTransactionForm({ ...editTransactionForm, category: value }); setEditTxErrors(prev => ({ ...prev, category: '' })); }}>
                      <SelectTrigger><SelectValue placeholder={t('selectCategory')} /></SelectTrigger>
                      <SelectContent className="max-h-56 overflow-y-auto">
                        {allCategories.map((cat) => (
                          <SelectItem key={`edit-${cat}`} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" size="sm" variant="outline" onClick={() => setShowEditAddCategory(true)} title="Add new category" className="h-9 px-3">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <FieldError message={editTxErrors.category} />
              </div>
              <div className="space-y-2">
                <Label>{t('amount')} *</Label>
                <Input type="number" value={editTransactionForm.amount} onChange={(e) => { setEditTransactionForm({ ...editTransactionForm, amount: e.target.value }); setEditTxErrors(prev => ({ ...prev, amount: '' })); }} onKeyDown={blockInvalidNumberKeys} />
                <FieldError message={editTxErrors.amount} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('paymentMethod')} *</Label>
                <Select value={editTransactionForm.payment_method} onValueChange={(value: string) => { setEditTransactionForm({ ...editTransactionForm, payment_method: value }); setEditTxErrors(prev => ({ ...prev, payment_method: '' })); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={`edit-method-${method}`} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={editTxErrors.payment_method} />
              </div>
              <div className="space-y-2">
                <Label>{t('status')} *</Label>
                <Select value={editTransactionForm.status} onValueChange={(value: 'completed' | 'pending' | 'cancelled') => setEditTransactionForm({ ...editTransactionForm, status: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">{t('completed')}</SelectItem>
                    <SelectItem value="pending">{t('pending')}</SelectItem>
                    <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('description')}</Label>
              <Textarea value={editTransactionForm.description} onChange={(e) => { setEditTransactionForm({ ...editTransactionForm, description: e.target.value }); setEditTxErrors(prev => ({ ...prev, description: '' })); }} rows={2} placeholder="Optional description" />
            </div>

            {/* Party Type Toggle + Client/Vendor Search inline */}
            <div className="space-y-2">
              <Label>Select Client or Vendor</Label>
              <div className="flex gap-2 items-start">
                <div className="flex gap-1 shrink-0 pt-0.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={editTransactionForm.party_type === 'client' ? 'default' : 'outline'}
                    className={editTransactionForm.party_type === 'client' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
                    onClick={() => setEditTransactionForm(prev => ({ ...prev, party_type: 'client', vendor: '' }))}
                  >
                    <Building className="w-4 h-4 mr-1" /> Client
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={editTransactionForm.party_type === 'vendor' ? 'default' : 'outline'}
                    className={editTransactionForm.party_type === 'vendor' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}
                    onClick={() => setEditTransactionForm(prev => ({ ...prev, party_type: 'vendor', client: '' }))}
                  >
                    <Building className="w-4 h-4 mr-1" /> Vendor
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={editTransactionForm.party_type === 'others' ? 'default' : 'outline'}
                    className={editTransactionForm.party_type === 'others' ? 'bg-slate-600 hover:bg-slate-700 text-white' : ''}
                    onClick={() => setEditTransactionForm(prev => ({ ...prev, party_type: 'others', client: '', vendor: '' }))}
                  >
                    Others
                  </Button>
                </div>
              {editTransactionForm.party_type === 'client' ? (
                <div className="flex-1 relative" ref={editClientDropdownRef}>
                  <Input 
                    value={editTransactionForm.client}
                    onChange={(e) => { setEditTransactionForm({ ...editTransactionForm, client: e.target.value }); setShowEditClientDropdown(true); }}
                    onFocus={() => setShowEditClientDropdown(true)}
                    placeholder="Search client..."
                    autoComplete="off"
                  />
                  {showEditClientDropdown && filteredEditClientsList.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredEditClientsList.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-slate-100 last:border-b-0"
                          onClick={() => {
                            const cBal = getClientCreditBalance(c.name);
                            setEditTransactionForm(prev => ({
                              ...prev,
                              client: c.name,
                              address: c.address || prev.address,
                              mobile_number: c.phone || prev.mobile_number,
                              payment_type: cBal > 0 ? 'credit' : 'cash',
                            }));
                            setShowEditClientDropdown(false);
                          }}
                        >
                          <div className="font-medium">{c.name}</div>
                          {c.phone && <div className="text-xs text-slate-500">{c.phone}</div>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : editTransactionForm.party_type === 'vendor' ? (
                <div className="flex-1 relative" ref={editVendorDropdownRef}>
                  <Input 
                    value={editTransactionForm.vendor}
                    onChange={(e) => { setEditTransactionForm({ ...editTransactionForm, vendor: e.target.value }); setShowEditVendorDropdown(true); }}
                    onFocus={() => setShowEditVendorDropdown(true)}
                    placeholder="Search vendor..."
                    autoComplete="off"
                  />
                  {showEditVendorDropdown && filteredEditVendorsList.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredEditVendorsList.map(v => (
                        <button
                          key={v.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-purple-50 text-sm border-b border-slate-100 last:border-b-0"
                          onClick={() => {
                            setEditTransactionForm(prev => ({
                              ...prev,
                              vendor: v.name,
                              address: v.address || prev.address,
                              mobile_number: v.phone || prev.mobile_number,
                            }));
                            setShowEditVendorDropdown(false);
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <div className="font-medium">{v.name}</div>
                            {v.outstanding_amount > 0 && <span className="text-xs font-medium text-orange-600">₹{v.outstanding_amount.toLocaleString()} due</span>}
                          </div>
                          {v.phone && <div className="text-xs text-slate-500">{v.phone}</div>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('mobileNumber')}</Label>
                <Input 
                  value={editTransactionForm.mobile_number}
                  onChange={(e) => setEditTransactionForm({ ...editTransactionForm, mobile_number: e.target.value })}
                  placeholder="+91 9876543210"
                  type="tel"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('address')}</Label>
                <Input 
                  value={editTransactionForm.address}
                  onChange={(e) => setEditTransactionForm({ ...editTransactionForm, address: e.target.value })}
                  placeholder="Enter address"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditTransaction(false)}>{t('cancel')}</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleUpdateTransaction}>{t('update')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Transaction"
        description="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeleteTransaction}
        onCancel={() => setDeleteConfirm({ open: false, id: '' })}
      />

      {/* Add Receipt Dialog */}
      <Dialog open={showAddReceipt} onOpenChange={(open: boolean) => {
        setShowAddReceipt(open);
        if (!open) resetReceiptForm();
        setRcErrors({});
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-green-600" />
              {t('addNewReceipt')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('invoiceNo')} *</Label>
                <Select
                  value={receiptForm.bill_no}
                  onValueChange={(value: string) => {
                    const bill = bills.find((b: any) => (b.bill_no || b.invoice_no || String(b.id)) === value);
                    const billAmount = bill?.grand_total || bill?.total_amount || bill?.amount || 0;
                    setReceiptForm({
                      ...receiptForm,
                      bill_no: value,
                      client_name: bill?.client_name || bill?.customer_name || receiptForm.client_name,
                      amount: billAmount ? String(billAmount) : receiptForm.amount,
                    });
                    setRcErrors(prev => ({ ...prev, bill_no: '', client_name: '', amount: '' }));
                  }}
                >
                  <SelectTrigger className="truncate">
                    <SelectValue placeholder={t('egInv2024001')} />
                  </SelectTrigger>
                  <SelectContent>
                    {bills.map((bill: any) => {
                      const invoiceNo = bill.bill_no || bill.invoice_no || String(bill.id);
                      const clientName = bill.client_name || bill.customer_name || '';
                      return (
                        <SelectItem key={bill.id || invoiceNo} value={invoiceNo}>
                          <span className="block truncate">{invoiceNo}</span>
                          {clientName && <span className="block text-xs text-muted-foreground truncate">{clientName}</span>}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FieldError message={rcErrors.bill_no} />
              </div>
              <div className="space-y-2">
                <Label>{t('date')} *</Label>
                <Input 
                  type="date"
                  value={receiptForm.date}
                  onChange={(e) => { setReceiptForm({...receiptForm, date: e.target.value}); setRcErrors(prev => ({...prev, date: ''})); }}
                />
                <FieldError message={rcErrors.date} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('clientName')} *</Label>
              <Input 
                  value={receiptForm.client_name}
                  onChange={(e) => { setReceiptForm({...receiptForm, client_name: e.target.value}); setRcErrors(prev => ({...prev, client_name: ''})); }}
                placeholder={t('enterClientName')}
              />
              <FieldError message={rcErrors.client_name} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('amount')} *</Label>
                <Input 
                  type="number"
                  value={receiptForm.amount}
                  onChange={(e) => { setReceiptForm({...receiptForm, amount: e.target.value}); setRcErrors(prev => ({...prev, amount: ''})); }}
                  onKeyDown={blockInvalidNumberKeys}
                  placeholder="₹0.00"
                />
                <FieldError message={rcErrors.amount} />
              </div>
              <div className="space-y-2">
                <Label>{t('paymentMethod')} *</Label>
                <Select 
                  value={receiptForm.method} 
                  onValueChange={(value: 'cash' | 'upi' | 'card' | 'bank') => { setReceiptForm({...receiptForm, method: value}); setRcErrors(prev => ({...prev, method: ''})); }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">
                      <span className="flex items-center gap-2">
                        {t('cash')}
                      </span>
                    </SelectItem>
                    <SelectItem value="upi">
                      <span className="flex items-center gap-2">UPI</span>
                    </SelectItem>
                    <SelectItem value="card">
                      <span className="flex items-center gap-2">
                        {t('card')}
                      </span>
                    </SelectItem>
                    <SelectItem value="bank">
                      <span className="flex items-center gap-2">
                        {t('bankTransfer')}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {rcErrors.method && <FieldError message={rcErrors.method} />}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('referenceNo')}</Label>
                <Input 
                  value={receiptForm.reference}
                  onChange={(e) => setReceiptForm({...receiptForm, reference: e.target.value})}
                  placeholder={t('referenceNumberOptional')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('receivedBy')} *</Label>
                <Input 
                  value={receiptForm.received_by}
                  onChange={(e) => { setReceiptForm({...receiptForm, received_by: e.target.value}); setRcErrors(prev => ({...prev, received_by: ''})); }}
                  placeholder="Admin"
                />
                {rcErrors.received_by && <FieldError message={rcErrors.received_by} />}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('notes')}</Label>
              <Textarea 
                value={receiptForm.notes}
                onChange={(e) => setReceiptForm({...receiptForm, notes: e.target.value})}
                placeholder={t('additionalNotesOptional')}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddReceipt(false);
              resetReceiptForm();
            }}>
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleAddReceipt} 
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={!receiptForm.bill_no || !receiptForm.client_name || !receiptForm.amount || !receiptForm.date}
            >
              {t('addReceipt')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
      )}
    </div>
  );
}
