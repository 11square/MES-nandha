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
  CreditCard,
  Building,
  Calendar,
  DollarSign,
  Receipt
} from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  gst_number: string;
  mobile_number?: string;
  client?: string;
  address?: string;
  bill_id?: number;
  payment_type?: string;
  status: 'completed' | 'pending' | 'cancelled';
}

export default function FinanceManagement({ language = 'en' }: FinanceManagementProps) {
  const t = (key: keyof typeof translations.en) => translations[language][key] || translations.en[key];
  const [searchTerm, setSearchTerm] = useState('');
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
    gst_number: '',
    mobile_number: '',
    client: '',
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
    gst_number: '',
    mobile_number: '',
    client: '',
    address: '',
    payment_type: '' as '' | 'cash' | 'credit',
    status: 'completed' as 'completed' | 'pending' | 'cancelled'
  });
  const [editTxErrors, setEditTxErrors] = useState<ValidationErrors>({});
  const [txErrors, setTxErrors] = useState<ValidationErrors>({});
  const [rcErrors, setRcErrors] = useState<ValidationErrors>({});

  const [transactionsData, setTransactionsData] = useState<Transaction[]>([]);
  const [clientsList, setClientsList] = useState<Array<{ id: string; name: string; phone: string; address: string; gst_number: string }>>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showEditClientDropdown, setShowEditClientDropdown] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const editClientDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) setShowClientDropdown(false);
      if (editClientDropdownRef.current && !editClientDropdownRef.current.contains(e.target as Node)) setShowEditClientDropdown(false);
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
        financeService.getTransactions(),
        financeService.getReceipts(),
        clientsService.getCreditOutstandings({ page: 1, limit: 10000 }),
        financeService.getSummary(),
        billingService.getAllBills(),
      ]);
      const txItems = Array.isArray(txData) ? txData : (txData as any)?.items || [];
      setTransactionsData(txItems);
      const rcItems = Array.isArray(rcData) ? rcData : (rcData as any)?.items || [];
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
  }, []);

  const filteredClientsList = clientsList.filter(c =>
    c.name.toLowerCase().includes((transactionForm.client || '').toLowerCase())
  );
  const filteredEditClientsList = clientsList.filter(c =>
    c.name.toLowerCase().includes((editTransactionForm.client || '').toLowerCase())
  );

  // Compute selected client's total credit outstanding balance
  const getClientCreditBalance = (clientName: string) => {
    if (!clientName) return 0;
    return outstandings
      .filter((o: any) => (o.client_name || '').toLowerCase() === clientName.toLowerCase() && o.status !== 'cleared')
      .reduce((sum: number, o: any) => sum + Math.max(0, Number(o.balance || 0)), 0);
  };
  const selectedClientBalance = getClientCreditBalance(transactionForm.client);

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
      gst_number: '',
      mobile_number: '',
      client: '',
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
      description: { required: true },
      payment_method: { required: true },
    });
    if (Object.keys(validationErrors).length) { setTxErrors(validationErrors); return; }
    if (transactionForm.gst_number && validateGstNumber(transactionForm.gst_number)) { setGstError(validateGstNumber(transactionForm.gst_number)); return; }
    try {
      await financeService.createTransaction({
        date: transactionForm.date,
        type: transactionForm.type,
        category: transactionForm.category,
        description: transactionForm.description,
        amount: parseFloat(transactionForm.amount) || 0,
        payment_method: transactionForm.payment_method,
        gst_number: transactionForm.gst_number,
        mobile_number: transactionForm.mobile_number,
        client: transactionForm.client,
        address: transactionForm.address,
        payment_type: transactionForm.payment_type || undefined,
        status: transactionForm.status,
      });
      toast.success('Transaction created successfully');
      await refreshFinance();
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
    try {
      const data = await financeService.getTransactionById(String(transaction.id));
      setSelectedTransaction((data as Transaction) || transaction);
    } catch {
      setSelectedTransaction(transaction);
    }
    setShowViewTransaction(true);
  };

  const handleEditTransactionOpen = async (transaction: Transaction) => {
    try {
      const data = await financeService.getTransactionById(String(transaction.id));
      const tx = (data as Transaction) || transaction;
      setEditTransactionForm({
        id: String(tx.id),
        date: tx.date ? String(tx.date).split('T')[0] : new Date().toISOString().split('T')[0],
        type: tx.type,
        category: tx.category || '',
        description: tx.description || '',
        amount: String(tx.amount ?? ''),
        payment_method: tx.payment_method || 'Cash',
        gst_number: tx.gst_number || '',
        mobile_number: tx.mobile_number || '',
        client: tx.client || '',
        address: tx.address || '',
        payment_type: ((tx as any).payment_type || '') as '' | 'cash' | 'credit',
        status: (tx.status as any) || 'completed',
      });
    } catch {
      setEditTransactionForm({
        id: String(transaction.id),
        date: transaction.date ? String(transaction.date).split('T')[0] : new Date().toISOString().split('T')[0],
        type: transaction.type,
        category: transaction.category || '',
        description: transaction.description || '',
        amount: String(transaction.amount ?? ''),
        payment_method: transaction.payment_method || 'Cash',
        gst_number: transaction.gst_number || '',
        mobile_number: transaction.mobile_number || '',
        client: transaction.client || '',
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
      description: { required: true },
      payment_method: { required: true },
    });
    if (Object.keys(validationErrors).length) { setEditTxErrors(validationErrors); return; }
    if (editTransactionForm.gst_number && validateGstNumber(editTransactionForm.gst_number)) { setEditGstError(validateGstNumber(editTransactionForm.gst_number)); return; }

    try {
      await financeService.updateTransaction(editTransactionForm.id, {
        date: editTransactionForm.date,
        type: editTransactionForm.type,
        category: editTransactionForm.category,
        description: editTransactionForm.description,
        amount: parseFloat(editTransactionForm.amount) || 0,
        payment_method: editTransactionForm.payment_method,
        gst_number: editTransactionForm.gst_number,
        mobile_number: editTransactionForm.mobile_number,
        client: editTransactionForm.client,
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
      await financeService.deleteTransaction(deleteConfirm.id);
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

  const totalReceivable = computedPending || outstandings
    .filter((item: any) => getOutstandingBalance(item) > 0)
    .reduce((sum: number, item: any) => sum + getOutstandingBalance(item), 0);
  const overdueAmount = outstandings
    .filter((item: any) => String(item?.status || '').toLowerCase() === 'overdue' || Number(item?.days_overdue || 0) > 0)
    .reduce((sum: number, item: any) => sum + getOutstandingBalance(item), 0);

  return (
    <div className="space-y-6">
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
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">Date</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">Type</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">Client</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">Category</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">Description</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">Amount</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">Payment Type</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">Status</th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactionsData.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Calendar className="w-3.5 h-3.5 text-gray-500" />
                          {new Date(transaction.date).toLocaleDateString()}
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
                        <div className="text-sm text-gray-700 font-medium">{transaction.client || '—'}</div>
                        {transaction.address && <div className="text-xs text-gray-500 truncate max-w-[150px]">{transaction.address}</div>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{transaction.category}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-[200px] truncate">{transaction.description}</td>
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
                <p className="text-xs text-gray-500">Client</p>
                <p className="text-sm font-medium">{selectedTransaction.client || '—'}</p>
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
                <p className="text-xs text-gray-500">GST Number</p>
                <p className="text-sm font-medium font-mono">{selectedTransaction.gst_number || '—'}</p>
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

            <div className="space-y-2">
              <Label>{t('description')} *</Label>
              <Textarea value={editTransactionForm.description} onChange={(e) => { setEditTransactionForm({ ...editTransactionForm, description: e.target.value }); setEditTxErrors(prev => ({ ...prev, description: '' })); }} rows={2} />
              <FieldError message={editTxErrors.description} />
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
              <div className="space-y-2">
                <Label>Payment Type</Label>
                <Select value={editTransactionForm.payment_type} onValueChange={(value: 'cash' | 'credit') => setEditTransactionForm({ ...editTransactionForm, payment_type: value })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">
                      <span className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-600" />Cash</span>
                    </SelectItem>
                    <SelectItem value="credit">
                      <span className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-orange-600" />Credit</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('gstNumber')}</Label>
              <Input 
                value={editTransactionForm.gst_number} 
                onChange={(e) => { 
                  const val = e.target.value.toUpperCase();
                  setEditTransactionForm({ ...editTransactionForm, gst_number: val });
                  setEditGstError(val ? validateGstNumber(val) : '');
                }}
                placeholder={t('enterGstNumber')}
                maxLength={15}
                className={editGstError ? 'border-red-500' : ''}
              />
              {editGstError && <p className="text-xs text-red-500">{editGstError}</p>}
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
              <div className="space-y-2 relative" ref={editClientDropdownRef}>
                <Label>{t('client')}</Label>
                <Input 
                  value={editTransactionForm.client}
                  onChange={(e) => { setEditTransactionForm({ ...editTransactionForm, client: e.target.value }); setShowEditClientDropdown(true); }}
                  onFocus={() => setShowEditClientDropdown(true)}
                  placeholder="Search or enter client name"
                  autoComplete="off"
                />
                {showEditClientDropdown && editTransactionForm.client && filteredEditClientsList.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredEditClientsList.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-slate-100 last:border-b-0"
                        onClick={() => {
                          setEditTransactionForm(prev => ({
                            ...prev,
                            client: c.name,
                            address: c.address || prev.address,
                            mobile_number: c.phone || prev.mobile_number,
                            gst_number: c.gst_number || prev.gst_number,
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

      {/* Add Transaction Dialog */}
      <Dialog open={showAddTransaction} onOpenChange={(open: boolean) => {
        setShowAddTransaction(open);
        if (!open) resetTransactionForm();
        setTxErrors({});
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('addNewTransaction')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
            <div className="space-y-2">
              <Label>{t('description')} *</Label>
              <Textarea 
                value={transactionForm.description}
                onChange={(e) => { setTransactionForm({...transactionForm, description: e.target.value}); setTxErrors(prev => ({...prev, description: ''})); }}
                placeholder={t('enterTransactionDescription')}
                rows={2}
              />
              <FieldError message={txErrors.description} />
            </div>
            <div className="space-y-2">
              <Label>{t('gstNumber')}</Label>
              <Input 
                value={transactionForm.gst_number}
                onChange={(e) => { 
                  const val = e.target.value.toUpperCase();
                  setTransactionForm({...transactionForm, gst_number: val});
                  setGstError(val ? validateGstNumber(val) : '');
                }}
                placeholder={t('enterGstNumber')}
                maxLength={15}
                className={gstError ? 'border-red-500' : ''}
              />
              {gstError && <p className="text-xs text-red-500">{gstError}</p>}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 relative" ref={clientDropdownRef}>
                <Label>{t('client')}</Label>
                <Input 
                  value={transactionForm.client}
                  onChange={(e) => { setTransactionForm({...transactionForm, client: e.target.value}); setShowClientDropdown(true); }}
                  onFocus={() => setShowClientDropdown(true)}
                  placeholder="Search or enter client name"
                  autoComplete="off"
                />
                {showClientDropdown && transactionForm.client && filteredClientsList.length > 0 && (
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
                              gst_number: c.gst_number || prev.gst_number,
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
                {transactionForm.client && selectedClientBalance > 0 && (
                  <div className="mt-1.5 p-2.5 rounded-lg border border-orange-200 bg-orange-50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-orange-700">Credit Outstanding</span>
                      <span className="text-sm font-bold text-orange-700">₹{selectedClientBalance.toLocaleString()}</span>
                    </div>
                    {transactionForm.amount && parseFloat(transactionForm.amount) > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-orange-200 flex items-center justify-between">
                        <span className="text-xs text-orange-600">Balance after payment</span>
                        <span className={`text-sm font-bold ${(selectedClientBalance - (parseFloat(transactionForm.amount) || 0)) <= 0 ? 'text-emerald-600' : 'text-orange-700'}`}>
                          ₹{Math.max(0, selectedClientBalance - (parseFloat(transactionForm.amount) || 0)).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('address')}</Label>
                <Input 
                  value={transactionForm.address}
                  onChange={(e) => setTransactionForm({...transactionForm, address: e.target.value})}
                  placeholder="Enter address"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Type</Label>
              <Select 
                value={transactionForm.payment_type} 
                onValueChange={(value: 'cash' | 'credit') => setTransactionForm({...transactionForm, payment_type: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    <span className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Cash
                    </span>
                  </SelectItem>
                  <SelectItem value="credit">
                    <span className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-orange-600" />
                      Credit
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddTransaction(false);
              resetTransactionForm();
            }}>
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleAddTransaction} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!transactionForm.date || !transactionForm.category || !transactionForm.amount || !transactionForm.description}
            >
              {t('addTransaction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
