import { toast } from 'sonner';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { translations, Language } from '../translations';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { validateFields, FieldError, blockInvalidNumberKeys, type ValidationErrors } from '../lib/validation';
import { getStateFromGST, getDistrictsForState, getAllStates } from '../lib/gstUtils';

interface ClientManagementProps {
  language?: Language;
}
import { 
  Building2, 
  Search, 
  Plus,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  ShoppingCart,
  Calendar,
  MessageSquare,
  FileText,
  IndianRupee,
  AlertCircle,
  CreditCard,
  Filter,
  ChevronDown,
  ChevronRight,
  Clock
} from 'lucide-react';
import { Badge } from './ui/badge';

import { clientsService } from '../services/clients.service';
import { ordersService } from '../services/orders.service';
import { billingService } from '../services/billing.service';
import { dispatchService } from '../services/dispatch.service';
import { leadsService } from '../services/leads.service';
import { getCustomerType } from '../lib/utils';
interface Client {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  gst_number?: string;
  state?: string;
  district?: string;
  total_orders: number;
  total_value: number;
  status: string;
  last_order: string;
  join_date: string;
  rating: 1 | 2 | 3;
}

export default function ClientManagement({ language = 'en' }: ClientManagementProps) {
  const t = (key: keyof typeof translations.en) => translations[language][key] || translations.en[key];
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCustomerType, setFilterCustomerType] = useState('all');
  const [selectedSalesClient, setSelectedSalesClient] = useState<string>('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    gst_number: '',
    state: '',
    district: '',
    status: 'Active',
    rating: 1 as 1 | 2 | 3,
    opening_outstanding: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [deleteBlocked, setDeleteBlocked] = useState(false);
  const [linkedModules, setLinkedModules] = useState<{ orders: number; bills: number; dispatches: number }>({ orders: 0, bills: 0, dispatches: 0 });
  const [checkingLinks, setCheckingLinks] = useState(false);

  const [clientsData, setClientsData] = useState<Client[]>([]);
  const [allClientSales, setAllClientSales] = useState<any[]>([]);
  const [allClientPayments, setAllClientPayments] = useState<any[]>([]);
  const [selectedClientSales, setSelectedClientSales] = useState<any[]>([]);
  const [selectedClientPayments, setSelectedClientPayments] = useState<any[]>([]);
  const [selectedClientBills, setSelectedClientBills] = useState<any[]>([]);
  const [expandedSalesRows, setExpandedSalesRows] = useState<Set<string>>(new Set());
  const [clientFollowups, setClientFollowups] = useState<any[]>([]);
  const [creditOutstandings, setCreditOutstandings] = useState<any[]>([]);

  const extractItems = (data: any): any[] => {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];

    const listKeys = ['items', 'rows', 'orders', 'sales', 'payments', 'results', 'records', 'list'];
    for (const key of listKeys) {
      if (Array.isArray((data as any)[key])) return (data as any)[key];
    }

    if (Array.isArray((data as any).data)) return (data as any).data;
    return [];
  };

  const normalizeClientRecord = (raw: any): Client => {
    const ratingRaw = Number(raw?.rating ?? 1);
    const safeRating = (ratingRaw >= 3 ? 3 : ratingRaw <= 1 ? 1 : 2) as 1 | 2 | 3;
    return {
      id: String(raw?.id ?? raw?.client_id ?? raw?.clientId ?? ''),
      name: String(raw?.name ?? raw?.client_name ?? raw?.customer_name ?? raw?.customer ?? 'Unknown Client'),
      contact_person: String(raw?.contact_person ?? raw?.contactPerson ?? raw?.contact ?? ''),
      phone: String(raw?.phone ?? raw?.mobile ?? ''),
      email: String(raw?.email ?? ''),
      address: String(raw?.address ?? ''),
      gst_number: String(raw?.gst_number ?? raw?.gstNumber ?? ''),
      state: String(raw?.state ?? ''),
      district: String(raw?.district ?? ''),
      total_orders: Number(raw?.total_orders ?? raw?.totalOrders ?? 0) || 0,
      total_value: Number(raw?.total_value ?? raw?.totalValue ?? 0) || 0,
      status: String(raw?.status ?? 'Active'),
      last_order: String(raw?.last_order ?? raw?.lastOrder ?? raw?.created_at ?? ''),
      join_date: String(raw?.join_date ?? raw?.joinDate ?? raw?.created_at ?? ''),
      rating: safeRating,
    };
  };

  const refreshClients = () => {
    clientsService.getClients({ customerType: filterCustomerType }).then(data => {
      const raw = extractItems(data);
      setClientsData(Array.isArray(raw) ? raw.map(normalizeClientRecord) : []);
    }).catch(() => {});
    clientsService.getClientSales('').then(data => {
      setAllClientSales(extractItems(data));
    }).catch(() => {});
    clientsService.getClientPayments('').then(data => {
      setAllClientPayments(extractItems(data));
    }).catch(() => {});
    Promise.all([
      clientsService.getClientFollowups().catch(() => []),
      leadsService.getLeads().catch(() => []),
    ]).then(([clientFuData, leadsData]) => {
      const clientFus = extractItems(clientFuData);
      const leads = extractItems(leadsData);
      const leadFollowups: any[] = [];
      const parseFollowUps = (value: any): any[] => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return [];
      };
      leads.forEach((lead: any) => {
        const fus = parseFollowUps(lead?.follow_ups).length > 0
          ? parseFollowUps(lead?.follow_ups)
          : parseFollowUps(lead?.followUps);
        fus.forEach((fu: any) => {
          leadFollowups.push({
            ...fu,
            customer: lead.customer || lead.customer_name || lead.client_name || '',
            lead_id: lead.id || lead.lead_id || '',
          });
        });
      });
      setClientFollowups([...clientFus, ...leadFollowups]);
    }).catch(() => {});
    clientsService.getCreditOutstandings().then(data => {
      setCreditOutstandings(extractItems(data));
    }).catch(() => {});
  };

  useEffect(() => {
    refreshClients();
  }, [filterCustomerType]);

  useEffect(() => {
    if (!selectedSalesClient) {
      setSelectedClientSales([]);
      setSelectedClientPayments([]);
      setSelectedClientBills([]);
      setExpandedSalesRows(new Set());
      return;
    }

    clientsService.getClientSales(selectedSalesClient).then(data => {
      setSelectedClientSales(extractItems(data));
    }).catch(() => setSelectedClientSales([]));

    clientsService.getClientPayments(selectedSalesClient).then(data => {
      setSelectedClientPayments(extractItems(data));
    }).catch(() => setSelectedClientPayments([]));

    clientsService.getClientBills(selectedSalesClient).then(data => {
      setSelectedClientBills(extractItems(data));
    }).catch(() => setSelectedClientBills([]));

    setExpandedSalesRows(new Set());
  }, [selectedSalesClient]);

  

  // All client sales history
  

  // All client payments history
  

  // Calculate totals for sales tab
  const totalSalesAmount = allClientSales.reduce((sum: number, sale: any) =>
    sum + (Number(sale.grand_total) || Number(sale.total_amount) || Number(sale.amount) || 0), 0);
  const totalPaymentsReceived = allClientPayments.reduce((sum: number, payment: any) =>
    sum + (Number(payment.amount) || Number(payment.paid_amount) || 0), 0);

  const followups = clientFollowups;

  // Credit bills (outstandings) - bills with paymentType: 'credit' that have pending balance
  

  const totalOutstanding = creditOutstandings.reduce((sum: number, bill: any) => sum + (Number(bill.balance) || 0), 0);
  const overdueAmount = creditOutstandings.filter((b: any) => (b.days_overdue || b.daysOverdue) > 0).reduce((sum: number, bill: any) => sum + (Number(bill.balance) || 0), 0);

  const activeOrdersCount = allClientSales.filter((s: any) => s.status && !['Completed', 'Delivered', 'Cancelled'].includes(s.status)).length;
  const pendingFollowupsCount = followups.filter((f: any) => {
    const s = (f.status || '').toLowerCase();
    return s === 'upcoming' || s === 'scheduled' || s === 'pending';
  }).length;
  const activeClientsCount = clientsData.filter((c: any) => c.status === 'Active').length;

  const formatLargeCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatCurrency = (amount: number) => {
    return `₹${(amount ?? 0).toLocaleString('en-IN')}`;
  };

  const getStatusColor = (status: string) => {
    return status === 'Active' 
      ? 'bg-emerald-100 text-emerald-700' 
      : 'bg-slate-100 text-slate-600';
  };

  const getStarRating = (rating: 1 | 2 | 3) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3].map((star) => (
          <span
            key={star}
            className={`text-lg ${star <= rating ? 'opacity-100' : 'opacity-30 grayscale'}`}
          >
            ⭐
          </span>
        ))}
      </div>
    );
  };

  // GST validation
  const validateGstNumber = (value: string): string => {
    if (!value) return '';
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (value.length !== 15) return 'GST number must be 15 characters';
    if (!gstRegex.test(value.toUpperCase())) return 'Invalid GST format (e.g. 22AAAAA0000A1Z5)';
    return '';
  };
  const [gstError, setGstError] = useState('');
  const [editGstError, setEditGstError] = useState('');

  // Districts based on selected state (Add form)
  const newClientDistricts = useMemo(() => getDistrictsForState(newClientForm.state), [newClientForm.state]);
  // Districts based on selected state (Edit form)
  const editClientDistricts = useMemo(() => getDistrictsForState(editingClient?.state || ''), [editingClient?.state]);

  // GST change handler for Add form
  const handleNewClientGstChange = (val: string) => {
    const upper = val.toUpperCase();
    setNewClientForm(prev => {
      const updated = { ...prev, gst_number: upper };
      if (upper.length >= 2) {
        const detectedState = getStateFromGST(upper);
        if (detectedState) {
          updated.state = detectedState;
          updated.district = '';
        }
      }
      if (!upper) { updated.state = ''; updated.district = ''; }
      return updated;
    });
    setGstError(upper ? validateGstNumber(upper) : '');
  };

  // GST change handler for Edit form
  const handleEditClientGstChange = (val: string) => {
    if (!editingClient) return;
    const upper = val.toUpperCase();
    const updated: any = { ...editingClient, gst_number: upper };
    if (upper.length >= 2) {
      const detectedState = getStateFromGST(upper);
      if (detectedState) {
        updated.state = detectedState;
        updated.district = '';
      }
    }
    if (!upper) { updated.state = ''; updated.district = ''; }
    setEditingClient(updated);
    setEditGstError(upper ? validateGstNumber(upper) : '');
  };

  const handleEditClient = (client: Client) => {
    setEditingClient({ ...client });
    setEditGstError('');
    setErrors({});
    setEditDialogOpen(true);
  };

  const handleSaveClient = async () => {
    if (editingClient) {
      const validationErrors = validateFields(editingClient, {
        name: { required: true, min: 2 },
        contact_person: { required: true, label: 'Contact Person' },
        phone: { required: true, phone: true },
        email: { required: true, email: true },
        address: { required: true },
      });
      if (Object.keys(validationErrors).length) { setErrors(validationErrors); return; }
      try {
        await clientsService.updateClient(editingClient.id, {
          name: editingClient.name,
          contact_person: editingClient.contact_person,
          phone: editingClient.phone,
          email: editingClient.email,
          address: editingClient.address,
          gst_number: editingClient.gst_number || '',
          state: editingClient.state || '',
          district: editingClient.district || '',
          status: editingClient.status,
          rating: editingClient.rating,
        });
        toast.success('Client updated successfully!');
        refreshClients();
        setEditDialogOpen(false);
        setEditingClient(null);
      } catch (err: any) {
        toast.error(err.message || 'Failed to update client');
      }
    }
  };

  const handleRatingClick = (rating: 1 | 2 | 3) => {
    if (editingClient) {
      setEditingClient({ ...editingClient, rating });
    }
  };

  const resetNewClientForm = () => {
    setNewClientForm({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      gst_number: '',
      state: '',
      district: '',
      status: 'Active',
      rating: 1 as 1 | 2 | 3,
      opening_outstanding: '',
    });
    setGstError('');
  };

  const handleAddClient = async () => {
    const validationErrors = validateFields(newClientForm, {
      name: { required: true, min: 2 },
      contact_person: { required: true, label: 'Contact Person' },
      phone: { required: true, phone: true },
      email: { required: true, email: true },
      address: { required: true },
    });
    if (Object.keys(validationErrors).length) { setErrors(validationErrors); return; }
    try {
      await clientsService.createClient({
        name: newClientForm.name,
        contact_person: newClientForm.contact_person,
        phone: newClientForm.phone,
        email: newClientForm.email,
        address: newClientForm.address,
        gst_number: newClientForm.gst_number || '',
        state: newClientForm.state,
        district: newClientForm.district,
        status: newClientForm.status,
        rating: newClientForm.rating,
        opening_outstanding: parseFloat(newClientForm.opening_outstanding) || 0,
      });
      toast.success('Client added successfully!');
      refreshClients();
      setAddDialogOpen(false);
      resetNewClientForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add client');
    }
  };

  const handleNewClientRatingClick = (rating: 1 | 2 | 3) => {
    setNewClientForm({ ...newClientForm, rating });
  };

  const checkClientLinks = async (clientId: string) => {
    setCheckingLinks(true);
    try {
      const client = clientsData.find(c => String(c.id) === String(clientId));
      const clientName = client?.name?.toLowerCase() || '';

      const [ordersData, billsData, dispatchData] = await Promise.all([
        ordersService.getOrders().catch(() => []),
        billingService.getAllBills().catch(() => []),
        dispatchService.getDispatches().catch(() => []),
      ]);

      const ordersList = extractItems(ordersData);
      const billsList = extractItems(billsData);
      const dispatchList = extractItems(dispatchData);

      const linkedOrders = ordersList.filter((o: any) =>
        String(o.clientId) === String(clientId) ||
        String(o.client_id) === String(clientId) ||
        (o.customer && String(o.customer).toLowerCase() === clientName) ||
        (o.customer_name && String(o.customer_name).toLowerCase() === clientName)
      ).length;

      const linkedBills = billsList.filter((b: any) =>
        String(b.clientId) === String(clientId) ||
        String(b.client_id) === String(clientId) ||
        (b.clientName && String(b.clientName).toLowerCase() === clientName)
      ).length;

      const linkedDispatches = dispatchList.filter((d: any) =>
        String(d.clientId) === String(clientId) ||
        String(d.client_id) === String(clientId) ||
        (d.customer && String(d.customer).toLowerCase() === clientName)
      ).length;

      const links = { orders: linkedOrders, bills: linkedBills, dispatches: linkedDispatches };
      setLinkedModules(links);

      const hasLinks = linkedOrders > 0 || linkedBills > 0 || linkedDispatches > 0;
      setDeleteBlocked(hasLinks);
    } catch {
      setDeleteBlocked(false);
      setLinkedModules({ orders: 0, bills: 0, dispatches: 0 });
    } finally {
      setCheckingLinks(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!deletingClientId || deleteBlocked) return;
    try {
      await clientsService.deleteClient(deletingClientId);
      toast.success(t('deletedSuccessfully'));
      refreshClients();
      if (selectedClient === deletingClientId) setSelectedClient(null);
      setDeleteDialogOpen(false);
      setDeletingClientId(null);
      setDeleteBlocked(false);
      setLinkedModules({ orders: 0, bills: 0, dispatches: 0 });
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete client');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-700';
      case 'Medium': return 'bg-amber-100 text-amber-700';
      case 'Low': return 'bg-slate-100 text-slate-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const filteredClients = clientsData.filter(client => 
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.contact_person || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(client.id).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const normalizeText = (value: any) =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  const normalizePhone = (value: any) => String(value || '').replace(/\D/g, '');
  const recordBelongsToClient = (record: any, client: Client) => {
    if (!record || !client) return false;

    const clientId = String(client.id || '');
    const recordClientId = String(record.client_id ?? record.clientId ?? record?.bill?.client_id ?? '');
    if (clientId && recordClientId && clientId === recordClientId) return true;

    const clientNames = [normalizeText(client.name)];
    const recordNames = [
      normalizeText(record.client_name),
      normalizeText(record.customer_name),
      normalizeText(record.customer),
      normalizeText(record.name),
      normalizeText(record?.bill?.client_name),
      normalizeText(record?.client?.name),
    ].filter(Boolean);
    if (clientNames.some(name => recordNames.includes(name))) return true;

    const clientPhones = [normalizePhone(client.phone)].filter(Boolean);
    const recordPhones = [
      normalizePhone(record.client_contact),
      normalizePhone(record.mobile),
      normalizePhone(record.phone),
      normalizePhone(record.contact),
      normalizePhone(record?.client?.phone),
      normalizePhone(record?.bill?.client_contact),
    ].filter(Boolean);
    if (clientPhones.some(phone => recordPhones.includes(phone))) return true;

    return false;
  };

  const parseOrderItems = (sale: any): any[] => {
    const raw = sale?.products ?? sale?.items ?? sale?.order_items;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const getOrderProductSummary = (sale: any): string => {
    const items = parseOrderItems(sale);
    if (items.length > 0) {
      const names = Array.from(new Set(items.map((item: any) =>
        String(item?.name ?? item?.product_name ?? item?.product ?? item?.item_name ?? '').trim()
      ).filter(Boolean)));
      if (names.length === 0) return `${items.length} item${items.length > 1 ? 's' : ''}`;
      if (names.length === 1) return names[0];
      return `${names.length} products (${names[0]} +${names.length - 1})`;
    }

    return sale.product || sale.product_details || sale.item_name || '-';
  };

  const getOrderQuantity = (sale: any): number => {
    const items = parseOrderItems(sale);
    if (items.length > 0) {
      const total = items.reduce((sum: number, item: any) => sum + (Number(item?.quantity) || 0), 0);
      if (total > 0) return total;
    }
    return Number(sale.quantity) || 0;
  };

  const getOrderQuantityDisplay = (sale: any): string => {
    const items = parseOrderItems(sale);
    const qty = getOrderQuantity(sale);
    if (items.length > 1) return `${qty} (${items.length} items)`;
    return String(qty);
  };

  const getSaleRowKey = (sale: any, fallbackIndex: number): string =>
    String(sale.order_number || sale.orderId || sale.id || `sale-${fallbackIndex}`);

  const toggleSalesRow = (rowKey: string) => {
    setExpandedSalesRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  const getOrderItemDetails = (sale: any): { product: string; quantity: number; amount: number }[] => {
    const items = parseOrderItems(sale);
    if (items.length === 0) {
      return [{
        product: getOrderProductSummary(sale),
        quantity: getOrderQuantity(sale),
        amount: Number(sale.grand_total) || Number(sale.total_amount) || Number(sale.amount) || 0,
      }];
    }

    return items.map((item: any) => {
      const quantity = Number(item?.quantity) || 0;
      const rate = Number(item?.unit_price) || Number(item?.rate) || Number(item?.price) || 0;
      const amount = Number(item?.amount)
        || Number(item?.total_amount)
        || Number(item?.total)
        || (rate * quantity)
        || 0;

      return {
        product: String(item?.name ?? item?.product_name ?? item?.product ?? item?.item_name ?? '-'),
        quantity,
        amount,
      };
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('clientManagement')}</h1>
          <p className="text-muted-foreground">{t('manageClients')}</p>
        </div>
       
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">{t('totalClients')}</span>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">{clientsData.length}</p>
          <p className="text-xs text-emerald-600 mt-1">{activeClientsCount} {t('active')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">{t('totalSales')}</span>
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">{formatLargeCurrency(totalSalesAmount)}</p>
          <p className="text-xs text-emerald-600 mt-1">{allClientSales.length} {t('totalOrders')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">{t('activeOrders')}</span>
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">{activeOrdersCount}</p>
          <p className="text-xs text-slate-600 mt-1">{t('inProgressOrders')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">{t('followups')}</span>
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-violet-600" />
            </div>
          </div>
          <p className="text-3xl text-slate-900 font-bold">{pendingFollowupsCount}</p>
          <p className="text-xs text-amber-600 mt-1">{t('pendingThisWeek')}</p>
        </motion.div>
      </div>

      <div className="flex items-center gap-4 justify-between ">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder={t('searchClients')}
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterCustomerType} onValueChange={setFilterCustomerType}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allCustomerTypes')}</SelectItem>
                <SelectItem value="b2b">{t('b2b')}</SelectItem>
                <SelectItem value="b2c">{t('b2c')}</SelectItem>
              </SelectContent>
            </Select>
            {/* <Select defaultValue="all">
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatus')}</SelectItem>
                <SelectItem value="active">{t('active')}</SelectItem>
                <SelectItem value="inactive">{t('inactive')}</SelectItem>
              </SelectContent>
            </Select> */}
            
          </div>

      {/* Main Tabs */}
      <Tabs defaultValue="clients" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList className="grid w-full max-w-lg grid-cols-2">
            <TabsTrigger value="clients">{t('clients')}</TabsTrigger>
            <TabsTrigger value="outstandings">{t('outstandings')}</TabsTrigger>
          </TabsList>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('addNewClient')}
          </Button>
        </div>

        <TabsContent value="clients" className="space-y-6">
          {/* Search and Filter */}
          

          {/* Clients List */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredClients.map((client, index) => (
          <motion.div
            key={client.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            whileHover={{ y: -1 }}
            className="bg-white rounded-md border border-slate-200 p-3 shadow-sm hover:shadow transition-all cursor-pointer"
            onClick={() => navigate(`/clients/${client.id}`)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded flex items-center justify-center text-white text-xs font-semibold">
                  {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-sm text-slate-900 font-semibold leading-tight">{client.name}</h3>
                  <p className="text-[10px] text-slate-400">{client.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge className={`text-[10px] px-1.5 py-0 h-5 ${getStatusColor(client.status)}`}>
                  {client.status}
                </Badge>
                <Badge className={`text-[10px] px-1.5 py-0 h-5 ${(client as any).gst_number ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                  {getCustomerType((client as any).gst_number)}
                </Badge>
                <div className="flex items-center">
                  {getStarRating(client.rating)}
                </div>
              </div>
            </div>

            <div className="space-y-0.5 mb-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <Phone className="w-3 h-3" />
                <span className="truncate">{client.contact_person} • {client.phone}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="w-3 h-3" />
                <span className="truncate">{client.email}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{client.address}</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-slate-100 text-[11px]">
              <div>
                <span className="text-slate-400">Orders: </span>
                <span className="font-semibold text-slate-700">{client.total_orders}</span>
              </div>
              <div>
                <span className="text-slate-400">Value: </span>
                <span className="font-semibold text-slate-700">{formatCurrency(client.total_value)}</span>
              </div>
              <div>
                <span className="text-slate-400">Last: </span>
                <span className="text-slate-600">{client.last_order && !isNaN(new Date(client.last_order).getTime()) ? new Date(client.last_order).toLocaleDateString() : '—'}</span>
              </div>
            </div>

            <div className="flex gap-1.5 mt-1.5">
              <Button variant="outline" size="sm" className="flex-1 h-7 text-[11px] px-2" onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate(`/clients/${client.id}`); }}>
                <Eye className="w-3 h-3 mr-1" />
                {t('view')}
              </Button>
              <Button variant="outline" size="sm" className="flex-1 h-7 text-[11px] px-2" onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleEditClient(client); }}>
                <Edit className="w-3 h-3 mr-1" />
                {t('edit')}
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-[11px] px-2 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200" onClick={(e: React.MouseEvent) => { e.stopPropagation(); const cid = String(client.id); setDeletingClientId(cid); setDeleteBlocked(false); setLinkedModules({ orders: 0, bills: 0, dispatches: 0 }); setDeleteDialogOpen(true); checkClientLinks(cid); }}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

        </TabsContent>

      {/* Add New Client Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open: boolean) => {
        setAddDialogOpen(open);
        if (!open) resetNewClientForm();
        setErrors({});
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('addNewClient')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('businessName')} *</Label>
                <Input 
                  value={newClientForm.name}
                  onChange={(e) => { setNewClientForm({...newClientForm, name: e.target.value}); setErrors(prev => ({...prev, name: ''})); }}
                  placeholder={t('enterBusinessName')}
                />
                <FieldError message={errors.name} />
              </div>
              <div className="space-y-2">
                <Label>{t('contactPerson')} *</Label>
                <Input 
                  value={newClientForm.contact_person}
                  onChange={(e) => { setNewClientForm({...newClientForm, contact_person: e.target.value}); setErrors(prev => ({...prev, contact_person: ''})); }}
                  placeholder={t('contactPersonName')}
                />
                <FieldError message={errors.contact_person} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('phone')} *</Label>
                <Input 
                  value={newClientForm.phone}
                  onChange={(e) => { setNewClientForm({...newClientForm, phone: e.target.value}); setErrors(prev => ({...prev, phone: ''})); }}
                  placeholder="+91 98765 43210"
                />
                <FieldError message={errors.phone} />
              </div>
              <div className="space-y-2">
                <Label>{t('email')} *</Label>
                <Input 
                  type="email"
                  value={newClientForm.email}
                  onChange={(e) => { setNewClientForm({...newClientForm, email: e.target.value}); setErrors(prev => ({...prev, email: ''})); }}
                  placeholder="email@company.com"
                />
                <FieldError message={errors.email} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('address')} *</Label>
              <Input 
                value={newClientForm.address}
                onChange={(e) => { setNewClientForm({...newClientForm, address: e.target.value}); setErrors(prev => ({...prev, address: ''})); }}
                placeholder={t('fullAddress')}
              />
              <FieldError message={errors.address} />
            </div>
            <div className="space-y-2">
              <Label>{t('gstNumber')}</Label>
              <Input
                value={newClientForm.gst_number}
                onChange={(e) => handleNewClientGstChange(e.target.value)}
                placeholder={t('enterGstNumber')}
                maxLength={15}
                className={`border border-gray-300${gstError ? ' border-red-500' : ''}`}
              />
              {gstError && <p className="text-xs text-red-500">{gstError}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('state')}</Label>
                <Select value={newClientForm.state} onValueChange={(val: string) => { setNewClientForm({...newClientForm, state: val, district: ''}); }}>
                  <SelectTrigger className="border border-gray-300">
                    <SelectValue placeholder={t('enterState')} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {getAllStates().map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {newClientForm.state && newClientForm.gst_number && <p className="text-xs text-green-600">Auto-filled from GST</p>}
              </div>
              <div className="space-y-2">
                <Label>{t('district')}</Label>
                {newClientDistricts.length > 0 ? (
                  <Select value={newClientForm.district} onValueChange={(val: string) => setNewClientForm({...newClientForm, district: val})}>
                    <SelectTrigger className="border border-gray-300">
                      <SelectValue placeholder={t('enterDistrict')} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {newClientDistricts.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input 
                    value={newClientForm.district}
                    onChange={(e) => setNewClientForm({...newClientForm, district: e.target.value})}
                    placeholder={t('enterDistrict')}
                    className="border border-gray-300"
                  />
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('status')}</Label>
                <Select value={newClientForm.status} onValueChange={(value: string) => setNewClientForm({...newClientForm, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">{t('active')}</SelectItem>
                    <SelectItem value="Inactive">{t('inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('rating')}</Label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  {[1, 2, 3].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleNewClientRatingClick(star as 1 | 2 | 3)}
                      className="focus:outline-none transition-transform hover:scale-125"
                    >
                      <span
                        className={`text-2xl cursor-pointer transition-all ${
                          star <= newClientForm.rating
                            ? 'opacity-100'
                            : 'opacity-30 grayscale hover:opacity-50'
                        }`}
                      >
                        ⭐
                      </span>
                    </button>
                  ))}
                  <span className="ml-3 text-sm font-medium text-slate-700">
                    {newClientForm.rating} {t('stars')}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('openingOutstanding') || 'Opening Outstanding'}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={newClientForm.opening_outstanding}
                onChange={(e) => setNewClientForm({...newClientForm, opening_outstanding: e.target.value})}
                placeholder="₹0.00"
                onKeyDown={blockInvalidNumberKeys}
              />
              <p className="text-xs text-gray-500">{t('openingOutstandingHint') || 'Outstanding amount before using this software'}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAddDialogOpen(false);
              resetNewClientForm();
            }}>
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleAddClient} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!newClientForm.name || !newClientForm.contact_person || !newClientForm.phone || !newClientForm.email || !newClientForm.address}
            >
              {t('addClient')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open: boolean) => { setEditDialogOpen(open); setErrors({}); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('editClient')}</DialogTitle>
          </DialogHeader>
          {editingClient && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{t('companyName')} *</Label>
                <Input 
                  value={editingClient.name}
                  onChange={(e) => { setEditingClient({...editingClient, name: e.target.value}); setErrors(prev => ({...prev, name: ''})); }}
                />
                <FieldError message={errors.name} />
              </div>
              <div className="space-y-2">
                <Label>{t('contactPerson')} *</Label>
                <Input 
                  value={editingClient.contact_person}
                  onChange={(e) => { setEditingClient({...editingClient, contact_person: e.target.value}); setErrors(prev => ({...prev, contact_person: ''})); }}
                />
                <FieldError message={errors.contact_person} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('phone')} *</Label>
                  <Input 
                    value={editingClient.phone}
                    onChange={(e) => { setEditingClient({...editingClient, phone: e.target.value}); setErrors(prev => ({...prev, phone: ''})); }}
                  />
                  <FieldError message={errors.phone} />
                </div>
                <div className="space-y-2">
                  <Label>{t('email')} *</Label>
                  <Input 
                    value={editingClient.email}
                    onChange={(e) => { setEditingClient({...editingClient, email: e.target.value}); setErrors(prev => ({...prev, email: ''})); }}
                  />
                  <FieldError message={errors.email} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('address')} *</Label>
                <Input 
                  value={editingClient.address}
                  onChange={(e) => { setEditingClient({...editingClient, address: e.target.value}); setErrors(prev => ({...prev, address: ''})); }}
                />
                <FieldError message={errors.address} />
              </div>
              <div className="space-y-2">
                <Label>{t('gstNumber')}</Label>
                <Input
                  value={editingClient.gst_number || ''}
                  onChange={(e) => handleEditClientGstChange(e.target.value)}
                  placeholder={t('enterGstNumber')}
                  maxLength={15}
                  className={`border border-gray-300${editGstError ? ' border-red-500' : ''}`}
                />
                {editGstError && <p className="text-xs text-red-500">{editGstError}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('state')}</Label>
                  <Select value={editingClient.state || ''} onValueChange={(val: string) => { setEditingClient({...editingClient, state: val, district: ''}); }}>
                    <SelectTrigger className="border border-gray-300">
                      <SelectValue placeholder={t('enterState')} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {getAllStates().map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editingClient.state && editingClient.gst_number && <p className="text-xs text-green-600">Auto-filled from GST</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t('district')}</Label>
                  {editClientDistricts.length > 0 ? (
                    <Select value={editingClient.district || ''} onValueChange={(val: string) => setEditingClient({...editingClient, district: val})}>
                      <SelectTrigger className="border border-gray-300">
                        <SelectValue placeholder={t('enterDistrict')} />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {editClientDistricts.map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input 
                      value={editingClient.district || ''}
                      onChange={(e) => setEditingClient({...editingClient, district: e.target.value})}
                      placeholder={t('enterDistrict')}
                      className="border border-gray-300"
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('rating')}</Label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  {[1, 2, 3].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRatingClick(star as 1 | 2 | 3)}
                      className="focus:outline-none transition-transform hover:scale-125"
                    >
                      <span
                        className={`text-3xl cursor-pointer transition-all ${
                          star <= editingClient.rating
                            ? 'opacity-100'
                            : 'opacity-30 grayscale hover:opacity-50'
                        }`}
                      >
                        ⭐
                      </span>
                    </button>
                  ))}
                  <span className="ml-3 text-sm font-medium text-slate-700">
                    {editingClient.rating} {t('stars')}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSaveClient} className="bg-blue-600 hover:bg-blue-700 text-white">
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open: boolean) => { if (!open) { setDeleteDialogOpen(false); setDeletingClientId(null); setDeleteBlocked(false); setLinkedModules({ orders: 0, bills: 0, dispatches: 0 }); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {deleteBlocked && <AlertCircle className="w-5 h-5 text-red-500" />}
              {deleteBlocked ? t('cannotDeleteClient') : t('delete')}
            </DialogTitle>
          </DialogHeader>
          {checkingLinks ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              <span className="ml-3 text-sm text-slate-500">{t('checkingLinkedRecords')}</span>
            </div>
          ) : deleteBlocked ? (
            <div className="py-3 space-y-3">
              <p className="text-sm text-slate-600">{t('clientHasLinkedRecords')}</p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                {linkedModules.orders > 0 && (
                  <div className="flex items-center gap-2 text-sm text-red-700">
                    <ShoppingCart className="w-4 h-4" />
                    <span>{linkedModules.orders} {linkedModules.orders === 1 ? t('order') : t('orders')} {t('linked')}</span>
                  </div>
                )}
                {linkedModules.bills > 0 && (
                  <div className="flex items-center gap-2 text-sm text-red-700">
                    <FileText className="w-4 h-4" />
                    <span>{linkedModules.bills} {linkedModules.bills === 1 ? t('bill') : t('bills')} {t('linked')}</span>
                  </div>
                )}
                {linkedModules.dispatches > 0 && (
                  <div className="flex items-center gap-2 text-sm text-red-700">
                    <IndianRupee className="w-4 h-4" />
                    <span>{linkedModules.dispatches} {linkedModules.dispatches === 1 ? t('dispatch') : t('dispatches')} {t('linked')}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">{t('deleteLinkedRecordsFirst')}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-600 py-2">{t('confirmDeleteClient')}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeletingClientId(null); setDeleteBlocked(false); setLinkedModules({ orders: 0, bills: 0, dispatches: 0 }); }}>
              {deleteBlocked ? t('close') : t('cancel')}
            </Button>
            {!deleteBlocked && !checkingLinks && (
              <Button variant="destructive" onClick={handleDeleteClient}>
                <Trash2 className="w-4 h-4 mr-2" />
                {t('delete')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

        {/* Outstandings Tab */}
        <TabsContent value="outstandings" className="space-y-6">
          {/* Outstanding Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600 font-medium">{t('totalOutstanding')}</span>
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <p className="text-3xl text-red-600 font-bold">{formatCurrency(totalOutstanding)}</p>
              <p className="text-xs text-slate-600 mt-1">{creditOutstandings.length} {t('creditBillsPending')}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600 font-medium">{t('overdueAmount')}</span>
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
              </div>
              <p className="text-3xl text-orange-600 font-bold">{formatCurrency(overdueAmount)}</p>
              <p className="text-xs text-orange-600 mt-1">{creditOutstandings.filter((b: any) => (b.days_overdue || b.daysOverdue) > 0).length} {t('overdueBills')}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600 font-medium">{t('clientsWithOutstanding')}</span>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-3xl text-slate-900 font-bold">{new Set(creditOutstandings.map((b: any) => b.client_id || b.clientId)).size}</p>
              <p className="text-xs text-slate-600 mt-1">{t('uniqueClients')}</p>
            </motion.div>
          </div>

          {/* Outstanding Bills Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-semibold text-slate-900">{t('creditBillOutstandings')}</h3>
              <p className="text-sm text-slate-600">{t('pendingInvoicesWithCreditPaymentType')}</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('invoiceNo')}</TableHead>
                    <TableHead>{t('client')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead className="text-right">{t('total')}</TableHead>
                    <TableHead className="text-right">{t('paid')}</TableHead>
                    <TableHead className="text-right">{t('balance')}</TableHead>
                    <TableHead>{t('dueDate')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditOutstandings.map((bill: any) => (
                    <TableRow key={bill.id} className={(bill.days_overdue || bill.daysOverdue) > 0 ? 'bg-red-50' : ''}>
                      <TableCell className="font-mono font-medium text-blue-600">{bill.bill_no || bill.billNo}</TableCell>
                      <TableCell>
                        <div className="font-medium">{bill.client_name || bill.clientName}</div>
                        <div className="text-xs text-slate-500">{bill.client_id || bill.clientId}</div>
                      </TableCell>
                      <TableCell>{new Date(bill.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right font-semibold">₹{Number(bill.grand_total || bill.grandTotal || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-emerald-600">₹{Number(bill.paid_amount || bill.paidAmount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold text-red-600">₹{Number(bill.balance || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(bill.due_date || bill.dueDate).toLocaleDateString()}
                        </div>
                        {(bill.days_overdue || bill.daysOverdue) > 0 && (
                          <span className="text-xs text-red-600">{bill.days_overdue || bill.daysOverdue} {t('daysOverdue')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          bill.status === 'overdue' ? 'bg-red-100 text-red-700' :
                          bill.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }>
                          {bill.status === 'overdue' ? (t('overdue')) :
                           bill.status === 'partial' ? (t('partial')) :
                           (t('pending'))}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
