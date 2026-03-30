import { toast } from 'sonner';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
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
  Upload,
  FileText,
  User,
  Bell,
  ChevronsUpDown,
  Check,
  Trash2,
  ArrowLeft
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import DocumentUpload from './DocumentUpload';
import { FollowUp, Lead, LeadProduct, Product, ProductCategory } from '../types';
import { useI18n } from '../contexts/I18nContext';
import { leadsService } from '../services';
import { clientsService } from '../services/clients.service';
import { stockService } from '../services/stock.service';

import { validateFields, FieldError, blockInvalidNumberKeys, type ValidationErrors } from '../lib/validation';
import { getStateFromGST, getDistrictsForState, getAllStates } from '../lib/gstUtils';
import { ConfirmDialog, PromptDialog } from './ui/confirm-dialog';

const LEAD_PRODUCTS_CACHE_KEY = 'mespro:lead-products-cache:v1';

const getLeadCacheKey = (lead: any) => String(lead?.id || lead?._id || lead?.lead_number || '');

const readLeadProductsCache = (): Record<string, any[]> => {
  try {
    const raw = localStorage.getItem(LEAD_PRODUCTS_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeLeadProductsCache = (cache: Record<string, any[]>) => {
  try {
    localStorage.setItem(LEAD_PRODUCTS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // no-op
  }
};

const saveLeadProductsToCache = (leadKey: string, productsList: any[]) => {
  if (!leadKey) return;
  const cache = readLeadProductsCache();
  cache[leadKey] = Array.isArray(productsList) ? productsList : [];
  writeLeadProductsCache(cache);
};
// Helper component for conversion status with dynamic color
function ConversionStatusSelect({ leadId, leadNumber, initialStatus, onStatusChange, onConverted }: { leadId: string | number; leadNumber: string; initialStatus: string; onStatusChange?: (newStatus: string) => void; onConverted?: () => void }) {
  const { t } = useI18n();
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);

  const getConversionStatusColor = (s: string) => {
    const colors: Record<string, string> = {
      'None': 'bg-gray-100 text-gray-600 border border-gray-300',
      'Converted': 'bg-green-100 text-green-700 border border-green-300',
      'Not Converted': 'bg-red-100 text-red-700 border border-red-300',
    };
    return colors[s] || 'bg-gray-100 text-gray-600 border border-gray-300';
  };

  const handleChange = async (value: string) => {
    const prev = status;
    setStatus(value);
    setSaving(true);
    try {
      await leadsService.updateLead(String(leadId), { conversion_status: value });
      toast.success(`${leadNumber} conversion updated to ${value}`);
      onStatusChange?.(value);
      if (value === 'Converted') {
        onConverted?.();
      }
    } catch {
      setStatus(prev);
      toast.error('Failed to update conversion status');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Select 
      value={status}
      onValueChange={handleChange}
      disabled={saving}
    >
      <SelectTrigger className={`w-32 h-8 text-xs [&>span]:flex-1 [&>span]:text-center ${getConversionStatusColor(status)}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="None">{t('none')}</SelectItem>
        <SelectItem value="Converted">{t('converted')}</SelectItem>
        <SelectItem value="Not Converted">{t('notConverted')}</SelectItem>
      </SelectContent>
    </Select>
  );
}



interface LeadsManagementProps {
  onNavigate: (view: string) => void;
  productCategories?: ProductCategory[];
  products?: Product[];
  onConvertToOrder?: (leadData: Record<string, any>) => void;
}

export default function LeadsManagement({ onNavigate, productCategories = [], products = [], onConvertToOrder }: LeadsManagementProps) {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [activeTab, setActiveTab] = useState('leads');
  const [showEditLead, setShowEditLead] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [showEditActivity, setShowEditActivity] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [promptDialog, setPromptDialog] = useState<{open: boolean, leadId: string}>({open: false, leadId: ''});
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean, lead: any | null}>({open: false, lead: null});

  const normalizeLeadRecord = (lead: any, cachedProducts?: any[]) => {
    const parseProducts = (value: any): any[] => {
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

    const sourceProducts = parseProducts(lead?.products);
    const parsedCachedProducts = Array.isArray(cachedProducts) ? cachedProducts : [];
    const preferredProducts = sourceProducts.length > 0 ? sourceProducts : parsedCachedProducts;

    const normalizedProducts = preferredProducts.map((p: any, idx: number) => ({
      id: Number(p?.id) || idx + 1,
      product: String(p?.product ?? p?.product_id ?? p?.name ?? ''),
      category: String(p?.category ?? ''),
      subcategory: String(p?.subcategory ?? p?.size ?? ''),
      size: String(p?.size ?? p?.subcategory ?? ''),
      quantity: Number(p?.quantity) || 1,
      unit_price: Number(p?.unit_price ?? p?.rate ?? p?.price ?? 0) || 0,
    }));

    if (normalizedProducts.length === 0 && (lead?.product || lead?.category || Number(lead?.quantity) > 0)) {
      normalizedProducts.push({
        id: 1,
        product: String(lead?.product || ''),
        category: String(lead?.category || ''),
        subcategory: String(lead?.size || ''),
        size: String(lead?.size || ''),
        quantity: Number(lead?.quantity) || 1,
        unit_price: Number(lead?.unit_price || 0) || 0,
      });
    }

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

    const sourceFollowUps = parseFollowUps(lead?.follow_ups).length > 0
      ? parseFollowUps(lead?.follow_ups)
      : parseFollowUps(lead?.followUps);

    const normalizedFollowUps = sourceFollowUps.map((fu: any, idx: number) => ({
      id: Number(fu?.id) || idx + 1,
      date: fu?.date || '',
      scheduled_time: fu?.scheduled_time ?? fu?.scheduledTime ?? '',
      note: fu?.note || '',
      by: fu?.by ?? fu?.done_by ?? fu?.doneBy ?? '',
      done_by: fu?.done_by ?? fu?.doneBy ?? fu?.by ?? '',
      status: fu?.status || 'upcoming',
      activity_type: fu?.activity_type ?? fu?.activityType ?? 'followup',
      priority: fu?.priority || 'medium',
    }));

    return {
      ...lead,
      id: lead?.id ?? lead?._id ?? '',
      lead_number: String(lead?.lead_number ?? lead?.leadNumber ?? lead?.lead_no ?? ''),
      customer: String(lead?.customer ?? lead?.customer_name ?? lead?.client_name ?? lead?.name ?? ''),
      contact: String(lead?.contact ?? lead?.contact_person ?? lead?.contact_name ?? ''),
      mobile: String(lead?.mobile ?? lead?.phone ?? lead?.contact_number ?? ''),
      products: normalizedProducts,
      follow_ups: normalizedFollowUps,
      followUps: normalizedFollowUps,
    };
  };

  const handleDeleteLead = async () => {
    if (!deleteDialog.lead?.id) return;
    try {
      await leadsService.deleteLead(String(deleteDialog.lead.id));
      toast.success(`Lead ${deleteDialog.lead.lead_number || ''} deleted successfully`);
      setDeleteDialog({open: false, lead: null});
      refreshLeads();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete lead');
    }
  };

  const refreshLeads = () => {
    leadsService.getLeads().then(data => {
      const items = Array.isArray(data) ? data : [];
      const cache = readLeadProductsCache();
      setLeads(items.map(item => normalizeLeadRecord(item, cache[getLeadCacheKey(item)])));
    }).catch(() => {});
  };

  useEffect(() => {
    refreshLeads();
  }, []);

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
          unit_price: (Number(p.unit_price) || 0) > 0 ? Number(p.unit_price) : (Number(stockMatch.selling_price) || Number(stockMatch.unit_price) || 0),
          selling_price: (Number(p.selling_price) || 0) > 0 ? Number(p.selling_price) : (Number(stockMatch.selling_price) || Number(stockMatch.unit_price) || 0),
          base_price: (Number(p.base_price) || 0) > 0 ? Number(p.base_price) : (Number(stockMatch.buying_price) || Number(stockMatch.unit_price) || 0),
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
          unit_price: Number(s.selling_price) || Number(s.unit_price) || 0,
          selling_price: Number(s.selling_price) || Number(s.unit_price) || 0,
          base_price: Number(s.buying_price) || Number(s.unit_price) || 0,
        });
        existingNames.add((s.name || '').toLowerCase());
      }
    });
    return merged;
  }, [products, stockItems]);

  // Build merged categories from props + stock items
  const mergedCategories = useMemo(() => {
    const catMap = new Map<string, { name: string; subcategories: Set<string> }>();
    productCategories.forEach(c => {
      catMap.set(c.id, { name: c.name, subcategories: new Set(c.subcategories) });
    });
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

  // Product categories from props (from Product module) - must be defined before early returns
  const categories = mergedCategories.map(cat => ({
    id: cat.id,
    name: cat.name,
    items: cat.subcategories,
    subcategories: cat.subcategories
  }));

  // Get products by category
  const getProductsForCategory = (categoryId: string) => {
    return mergedProducts.filter(p => {
      const pCatId = (p.category || '').toLowerCase().replace(/\s+/g, '-');
      return pCatId === categoryId;
    });
  };

  // If showing create lead page, render it instead of the main view
  if (showCreateLead) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => setShowCreateLead(false)}
          >
            ← {t('back')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('createNewLead')}</h1>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <CreateLeadForm onClose={() => setShowCreateLead(false)} categories={categories} allProducts={mergedProducts} onSuccess={refreshLeads} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // If showing edit lead page, render it instead of the main view
  if (showEditLead && editingLead) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => {
              setShowEditLead(false);
              setEditingLead(null);
            }}
          >
            ← {t('back')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('editLead')}</h1>
            <p className="text-sm text-gray-500">{editingLead.lead_number}</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <EditLeadForm 
              lead={editingLead} 
              categories={categories}
              allProducts={mergedProducts}
              onClose={() => {
                setShowEditLead(false);
                setEditingLead(null);
              }}
              onSuccess={refreshLeads}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mock leads data with various product types
  

  // Get all follow-ups from all leads with full details
  const allFollowUps = leads.flatMap(lead => 
    (lead.follow_ups || []).map(fu => ({
      ...fu,
      lead_id: lead.id,
      lead_number: lead.lead_number,
      customer: lead.customer,
      contact: lead.contact,
      mobile: lead.mobile,
      email: lead.email,
      product: lead.product,
      category: lead.category,
      quantity: lead.quantity,
      size: lead.size
    }))
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const upcomingFollowUps = allFollowUps.filter(fu => fu.status === 'upcoming');
  const completedFollowUps = allFollowUps.filter(fu => fu.status === 'completed');

  const handleUpdateFollowUpStatus = async (followUp: any, newStatus: string) => {
    try {
      await leadsService.updateFollowUp(String(followUp.lead_id), String(followUp.id), { status: newStatus });
      toast.success(`Activity status updated to ${newStatus}`);
      refreshLeads();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update activity status');
    }
  };

  const handleEditFollowUp = (followUp: any) => {
    setEditingFollowUp(followUp);
    setShowEditActivity(true);
  };

  const handleDeleteFollowUp = async (followUp: any) => {
    const ok = window.confirm(`Delete activity for ${followUp.lead_number}?`);
    if (!ok) return;
    try {
      await leadsService.deleteFollowUp(String(followUp.lead_id), String(followUp.id));
      toast.success('Activity deleted successfully');
      refreshLeads();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete activity');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'New': 'bg-blue-100 text-blue-700',
      'Contacted': 'bg-yellow-100 text-yellow-700',
      'Qualified': 'bg-purple-100 text-purple-700',
      'Converted': 'bg-green-100 text-green-700',
      'Rejected': 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getConversionStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'None': 'bg-gray-100 text-gray-600 border border-gray-300',
      'Converted': 'bg-green-100 text-green-700 border border-green-300',
      'Not Converted': 'bg-red-100 text-red-700 border border-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-600 border border-gray-300';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'Converted') return <CheckCircle2 className="w-4 h-4" />;
    if (status === 'Rejected') return <XCircle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lead.lead_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lead.contact.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' 
      || lead.status.toLowerCase() === filterStatus.toLowerCase()
      || (filterStatus.toLowerCase() === 'converted' && lead.conversion_status === 'Converted');
    return matchesSearch && matchesStatus;
  });

  const handleApproveLead = (lead: Lead) => {
    toast.info(`Lead ${lead.lead_number} has been converted to Order!\n\nOrder Number: ORD-${lead.lead_number.split('-')[2]}\n\nYou can view and manage this order in the Orders module.`);
    setShowLeadDetail(false);
    if (onConvertToOrder) {
      onConvertToOrder(lead as any);
    }
    // Navigate to orders module
    onNavigate('orders');
  };

  const handleRejectLead = (lead: Lead) => {
    setPromptDialog({ open: true, leadId: lead.lead_number });
  };

  const canApprove = true; // Assuming the user has the necessary permissions

  return (
    <div className="space-y-6">
      {/* Page Heading with Actions */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{t('leadsTitle')}</h1>
          <p className="text-muted-foreground">{t('trackAndManageSalesLeads')}</p>
        </div>
        
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        
        <div className="flex justify-between items-start">
          <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-gray-100 rounded-lg w-fit">
            <TabsTrigger value="leads" className="px-4 py-2">
              {t('leads')}
            </TabsTrigger>
            <TabsTrigger value="followups" className="px-4 py-2">
              {t('followups')}
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              onClick={() => onNavigate('orders')}
            >
              {t('viewOrders')}
            </Button>
            {(canApprove) && (
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowCreateLead(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('createLead')}
              </Button>
            )}
          </div>
        </div>

        {/* Leads Tab Content */}
        <TabsContent value="leads" className="space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-blue-500/10 backdrop-blur-sm border-blue-200 cursor-pointer hover:shadow-md" onClick={() => setFilterStatus('new')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('new')}</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{leads.filter(l => l.status === 'New').length}</div>
            <p className="text-xs text-blue-600">{t('newLeads')}</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/10 backdrop-blur-sm border-amber-200 cursor-pointer hover:shadow-md" onClick={() => setFilterStatus('contacted')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('contacted')}</CardTitle>
            <Phone className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{leads.filter(l => l.status === 'Contacted').length}</div>
            <p className="text-xs text-amber-600">{t('followupPending')}</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/10 backdrop-blur-sm border-purple-200 cursor-pointer hover:shadow-md" onClick={() => setFilterStatus('qualified')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('qualified')}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{leads.filter(l => l.status === 'Qualified').length}</div>
            <p className="text-xs text-purple-600">{t('readyToConvert')}</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/10 backdrop-blur-sm border-emerald-200 cursor-pointer hover:shadow-md" onClick={() => setFilterStatus('converted')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('converted')}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{leads.filter(l => l.conversion_status === 'Converted').length}</div>
            <p className="text-xs text-emerald-600">{t('convertedToOrders')}</p>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 backdrop-blur-sm border-red-200 cursor-pointer hover:shadow-md" onClick={() => setFilterStatus('rejected')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('rejected')}</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{leads.filter(l => l.status === 'Rejected').length}</div>
            <p className="text-xs text-red-600">{t('rejectedLeads')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input 
            placeholder={t('searchByLeadCustomerOrContact')}
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
            <SelectItem value="new">{t('new')}</SelectItem>
            <SelectItem value="contacted">{t('contacted')}</SelectItem>
            <SelectItem value="qualified">{t('qualified')}</SelectItem>
            <SelectItem value="converted">{t('converted')}</SelectItem>
            <SelectItem value="rejected">{t('rejected')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('allLeads')} ({filteredLeads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('lead')}</TableHead>
                <TableHead>{t('requiredDate')}</TableHead>
                <TableHead>{t('customer')}</TableHead>
                <TableHead>{t('products')}</TableHead>
                {/* <TableHead>{t('requiredDate')}</TableHead> */}
                <TableHead>{t('source')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('conversion')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium font-mono text-blue-600">{lead.lead_number}</TableCell>
                  <TableCell>
                    {lead.required_date
                      ? new Date(lead.required_date).toLocaleDateString()
                      : (lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—')}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{lead.customer}</div>
                      <div className="text-xs text-gray-500">{lead.contact}</div>
                      <div className="text-xs text-gray-500">{lead.mobile}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <Badge variant="outline" className="text-xs">
                        {lead.products ? `${lead.products.length} ${t('items')}` : `${lead.product}`}
                      </Badge>
                      {/* {lead.category && <div className="text-xs text-gray-500 mt-1">{lead.category}</div>} */}
                    </div>
                  </TableCell>
                  {/* <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      {new Date(lead.required_date).toLocaleDateString()}
                    </div>
                  </TableCell> */}
                  <TableCell>
                    <Badge variant="outline">{lead.source}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(lead.status)} flex items-center gap-1 w-fit`}>
                      {getStatusIcon(lead.status)}
                      <span className="ml-1">{lead.status}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ConversionStatusSelect 
                      leadId={lead.id}
                      leadNumber={lead.lead_number}
                      initialStatus={lead.conversion_status}
                      onStatusChange={(newStatus) => {
                        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, conversion_status: newStatus } : l));
                      }}
                      onConverted={() => {
                        if (onConvertToOrder) {
                          onConvertToOrder(lead);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        setSelectedLead(lead);
                        setShowLeadDetail(true);
                      }}
                      title={t('view')}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        setEditingLead(lead);
                        setShowEditLead(true);
                      }}
                      title={t('edit')}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        setDeleteDialog({open: true, lead});
                      }}
                      title={t('delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>

        {/* Follow-ups Tab Content */}
        <TabsContent value="followups" className="space-y-6">
          {/* Header with Add Follow-up Button */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">
              {t('allFollowups')} 
              <span className="text-gray-500 font-normal ml-2">({allFollowUps.length})</span>
            </h2>
            <AddActivityDialog leads={leads} onSuccess={refreshLeads} />
          </div>
          <EditActivityDialog
            open={showEditActivity}
            onOpenChange={(open) => {
              setShowEditActivity(open);
              if (!open) setEditingFollowUp(null);
            }}
            followUp={editingFollowUp}
            onSuccess={refreshLeads}
          />

          {/* Upcoming Activities Card */}
          <Card>
            <CardHeader className="bg-green-50/50">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <Clock className="w-5 h-5" />
                    {t('upcomingActivities')}
                  </CardTitle>
                  <CardDescription>{t('scheduledCallsMeetingsAndFollowups')}</CardDescription>
                </div>
                <Badge className="bg-green-100 text-green-700">{upcomingFollowUps.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingFollowUps.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {t('noUpcomingActivitiesScheduled')}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-green-50/30">
                      <TableHead>{t('lead')}</TableHead>
                      <TableHead>{t('customer')}</TableHead>
                      <TableHead>{t('type')}</TableHead>
                      <TableHead>{t('product')}</TableHead>
                      <TableHead>{t('scheduled')}</TableHead>
                      <TableHead>{t('priority')}</TableHead>
                      <TableHead>{t('notes')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead className="text-right">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingFollowUps.map((followUp) => (
                      <TableRow key={followUp.id} className="bg-green-50/20 hover:bg-green-50/40">
                        <TableCell className="font-medium text-blue-600">{followUp.lead_number}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{followUp.customer}</div>
                            <div className="text-xs text-gray-500">{followUp.contact}</div>
                            <div className="text-xs text-gray-400">{followUp.mobile}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-700">{followUp.activity_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{followUp.product}</div>
                            <div className="text-xs text-gray-500">{followUp.size} • Qty: {followUp.quantity}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-green-700 font-medium">
                            <Bell className="w-3.5 h-3.5" />
                            <div>
                              <div>{followUp.date}</div>
                              <div className="text-xs">{followUp.scheduled_time}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${followUp.priority === 'High' ? 'bg-red-100 text-red-700' : followUp.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                            {followUp.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm">{followUp.note}</TableCell>
                        <TableCell>
                          <select
                            value={followUp.status || 'upcoming'}
                            onChange={(e) => handleUpdateFollowUpStatus(followUp, e.target.value)}
                            className="w-32 px-2 py-1 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="upcoming">{t('upcoming')}</option>
                            <option value="completed">{t('completed')}</option>
                          </select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => toast.info(`Call ${followUp.mobile}`)}>
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEditFollowUp(followUp)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteFollowUp(followUp)}>
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

          {/* Completed Activities Card */}
          <Card>
            <CardHeader className="bg-red-50/50">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <CheckCircle2 className="w-5 h-5" />
                    {t('completedActivities')}
                  </CardTitle>
                  <CardDescription>{t('completedCallsEmailsAndFollowups')}</CardDescription>
                </div>
                <Badge className="bg-red-100 text-red-700">{completedFollowUps.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {completedFollowUps.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {t('noCompletedActivitiesYet')}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-red-50/30">
                      <TableHead>{t('lead')}</TableHead>
                      <TableHead>{t('customer')}</TableHead>
                      <TableHead>{t('type')}</TableHead>
                      <TableHead>{t('product')}</TableHead>
                      <TableHead>{t('date')}</TableHead>
                      <TableHead>{t('priority')}</TableHead>
                      <TableHead>{t('doneBy')}</TableHead>
                      <TableHead>{t('notes')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead className="text-right">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedFollowUps.map((followUp) => (
                      <TableRow key={followUp.id} className="bg-red-50/10 hover:bg-red-50/30">
                        <TableCell className="font-medium text-blue-600">{followUp.lead_number}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{followUp.customer}</div>
                            <div className="text-xs text-gray-500">{followUp.contact}</div>
                            <div className="text-xs text-gray-400">{followUp.mobile}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-gray-600">{followUp.activity_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{followUp.product}</div>
                            <div className="text-xs text-gray-500">{followUp.size} • Qty: {followUp.quantity}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{followUp.date}</div>
                            <div className="text-xs text-gray-500">{followUp.scheduled_time}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${followUp.priority === 'High' ? 'bg-red-100 text-red-700' : followUp.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                            {followUp.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>{followUp.by}</TableCell>
                        <TableCell className="max-w-xs truncate text-sm">{followUp.note}</TableCell>
                        <TableCell>
                          <select
                            value={followUp.status || 'completed'}
                            onChange={(e) => handleUpdateFollowUpStatus(followUp, e.target.value)}
                            className="w-32 px-2 py-1 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            <option value="upcoming">{t('upcoming')}</option>
                            <option value="completed">{t('completed')}</option>
                          </select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteFollowUp(followUp)}>
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

      {/* Lead Detail Dialog */}
      {selectedLead && (
        <Dialog open={showLeadDetail} onOpenChange={setShowLeadDetail}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    {selectedLead.lead_number}
                  </DialogTitle>
                  <DialogDescription className="text-base">{selectedLead.customer}</DialogDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${getConversionStatusColor(selectedLead.conversion_status)} text-xs`}>
                    {selectedLead.conversion_status || 'None'}
                  </Badge>
                  <Badge className={`${getStatusColor(selectedLead.status)} text-xs`}>
                    {getStatusIcon(selectedLead.status)}
                    <span className="ml-1">{selectedLead.status}</span>
                  </Badge>
                </div>
              </div>
            </DialogHeader>

            <Tabs defaultValue="details" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details" className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {t('details')}
                </TabsTrigger>
                <TabsTrigger value="followup" className="flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5" />
                  {t('followUp')}
                </TabsTrigger>
                <TabsTrigger value="actions" className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t('actions')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-5 pt-2">
                {/* Contact Info Card */}
                <div className="rounded-lg border bg-card p-4 space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('contactInformation')}</h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t('contactPerson')}</p>
                        <p className="text-sm font-medium">{selectedLead.contact || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t('mobile')}</p>
                        <p className="text-sm font-medium">{selectedLead.mobile || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t('email')}</p>
                        <p className="text-sm font-medium">{selectedLead.email || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Filter className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t('source')}</p>
                        <p className="text-sm font-medium">{selectedLead.source || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 col-span-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t('address')}</p>
                        <p className="text-sm font-medium">{selectedLead.address || '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product & Lead Info Card */}
                <div className="rounded-lg border bg-card p-4 space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('leadInformation')}</h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {selectedLead.products && selectedLead.products.length > 0 ? (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground mb-1">{t('products')}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedLead.products.map((p: any, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {p.product || p.name} × {p.quantity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground">{t('product')}</p>
                          <p className="text-sm font-medium">{selectedLead.product}{selectedLead.size ? ` — ${selectedLead.size}` : ''}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t('quantity')}</p>
                          <p className="text-sm font-medium">{selectedLead.quantity} {t('units')}</p>
                        </div>
                      </>
                    )}
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t('requiredDate')}</p>
                        <p className="text-sm font-medium">{selectedLead.required_date ? new Date(selectedLead.required_date).toLocaleDateString() : '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{t('gstNumber')}</p>
                        <p className="text-sm font-medium font-mono">{selectedLead.gst_number || '—'}</p>
                      </div>
                    </div>
                  </div>
                  {selectedLead.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">{t('notes')}</p>
                      <p className="text-sm whitespace-pre-wrap">{selectedLead.notes}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="followup" className="space-y-4 pt-2">
                {(selectedLead.follow_ups || []).length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {t('noFollowUpsYet')}
                  </div>
                )}
                {(selectedLead.follow_ups || []).map((followUp: FollowUp, index: number) => (
                  <div key={index} className="rounded-lg border p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(followUp.date).toLocaleDateString()}
                      </div>
                      <Badge variant="outline" className="text-xs">{followUp.by}</Badge>
                    </div>
                    <p className="text-sm">{followUp.note}</p>
                  </div>
                ))}
                <div className="pt-3 border-t space-y-2">
                  <Label>{t('addFollowUpNote')}</Label>
                  <Textarea placeholder={t('enterFollowUpDetails')} className="border border-gray-300" />
                  <Button size="sm">{t('addNote')}</Button>
                </div>
              </TabsContent>

              <TabsContent value="actions" className="space-y-4 pt-2">
                {canApprove && selectedLead.status === 'Qualified' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-1">{t('readyToConvert')}</h4>
                    <p className="text-sm text-green-700 mb-3">
                      {t('leadQualifiedReadyToConvert')}
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleApproveLead(selectedLead)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {t('convertToOrder')}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleRejectLead(selectedLead)}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        {t('rejectLead')}
                      </Button>
                    </div>
                  </div>
                )}

                {selectedLead.status === 'Converted' && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-1">{t('orderCreated')}</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      {t('leadConvertedToOrder')}: ORD-{selectedLead.lead_number.split('-')[2]}
                    </p>
                    <Button onClick={() => onNavigate('orders')}>
                      {t('viewOrders')}
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{t('gstNumber')}</Label>
                  <Input 
                    value={selectedLead.gst_number || ''}
                    readOnly
                    placeholder={t('enterGstNumber')}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('updateStatus')}</Label>
                  <Select defaultValue={selectedLead.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">{t('new')}</SelectItem>
                      <SelectItem value="Contacted">{t('contacted')}</SelectItem>
                      <SelectItem value="Qualified">{t('qualified')}</SelectItem>
                      {canApprove && <SelectItem value="Converted">{t('converted')}</SelectItem>}
                      {canApprove && <SelectItem value="Rejected">{t('rejected')}</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Document Upload Dialog */}
      {showDocumentUpload && (
        <DocumentUpload 
          onDataExtracted={(data) => {
            toast.info(`Order created successfully from document!\n\nCustomer: ${data.customerName}\nPO Number: ${data.poNumber}\nQuantity: ${data.quantity}\n\nThe order has been added to the production queue.`);
            setShowDocumentUpload(false);
          }}
          onClose={() => setShowDocumentUpload(false)} 
        />
      )}

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Lead"
        description={`Are you sure you want to delete lead ${deleteDialog.lead?.lead_number || ''}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteLead}
        onCancel={() => setDeleteDialog({open: false, lead: null})}
      />
      <PromptDialog
        open={promptDialog.open}
        title="Reject Lead"
        description="Please provide a reason for rejection."
        placeholder="Enter rejection reason..."
        confirmLabel="Reject"
        required
        onConfirm={(reason) => {
          toast.info(`Lead ${promptDialog.leadId} has been rejected.\nReason: ${reason}`);
          setPromptDialog({ open: false, leadId: '' });
          setShowLeadDetail(false);
        }}
        onCancel={() => setPromptDialog({ open: false, leadId: '' })}
      />
    </div>
  );
}

function CreateLeadForm({ onClose, categories = [], allProducts = [], onSuccess }: { onClose: () => void; categories?: Array<{ id: string; name: string; items: string[]; subcategories?: string[] }>; allProducts?: Array<{ id: string; name: string; sku: string; category: string; subcategory?: string; unit: string; unit_price?: number; selling_price?: number; base_price?: number }>; onSuccess?: () => void }) {
  const { t } = useI18n();
  const [addedProducts, setAddedProducts] = useState<Array<{ id: number; category: string; subcategory: string; product: string; quantity: number }>>([]);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingQty, setEditingQty] = useState(0);
  const [gstNumber, setGstNumber] = useState('');
  const [gstError, setGstError] = useState('');
  const [stateValue, setStateValue] = useState('');
  const [districtValue, setDistrictValue] = useState('');
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
    // Auto-fill state from GST code (first 2 digits)
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
  const [mobileValue, setMobileValue] = useState('');
  const [customerValue, setCustomerValue] = useState('');
  const [contactValue, setContactValue] = useState('');
  const [emailValue, setEmailValue] = useState('');

  // Client mobile dropdown
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
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
    const q = mobileSearchQuery.toLowerCase();
    return phone.toLowerCase().includes(q) || name.toLowerCase().includes(q);
  });

  const handleClientSelect = (client: any) => {
    const phone = String(client.phone || client.mobile || '');
    setMobileValue(phone);
    setCustomerValue(String(client.name || client.customer_name || client.client_name || ''));
    setContactValue(String(client.contact_person || client.contactPerson || client.contact || ''));
    setEmailValue(String(client.email || ''));
    // Auto-fill GST, state, district, address from selected client
    const clientGst = String(client.gst_number || client.gstNumber || '');
    setGstNumber(clientGst);
    setGstError(clientGst ? validateGstNumber(clientGst) : '');
    setStateValue(String(client.state || ''));
    setDistrictValue(String(client.district || ''));
    // Auto-fill address field
    const addressEl = document.getElementById('address') as HTMLTextAreaElement;
    if (addressEl) addressEl.value = String(client.address || '');
    setShowMobileDropdown(false);
    setMobileSearchQuery('');
    if (errors.mobile) setErrors(prev => { const { mobile, ...rest } = prev; return rest; });
    if (errors.customer) setErrors(prev => { const { customer, ...rest } = prev; return rest; });
    if (errors.contact) setErrors(prev => { const { contact, ...rest } = prev; return rest; });
    if (errors.email) setErrors(prev => { const { email, ...rest } = prev; return rest; });
  };

  // Use categories from props (from Product module)
  const productCategories = categories;

  // Filter all products based on search
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

    const newProducts = validRows.map((row, idx) => ({
      id: addedProducts.length + idx + 1,
      category: row.category,
      subcategory: row.subcategory,
      product: row.itemId,
      quantity: row.quantity,
    }));
    setAddedProducts([...addedProducts, ...newProducts]);
    setItemEntryRows([{ id: 1, itemId: '', itemName: '', category: '', subcategory: '', quantity: 0 }]);
    setItemRowErrors({});
    if (errors.products) setErrors(prev => { const { products, ...rest } = prev; return rest; });
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

  const findProductDetails = (item: { category: string; subcategory: string; product: string; quantity?: number; unit_price?: number }) => {
    const itemProduct = String(item.product || '').trim();
    const itemProductLower = itemProduct.toLowerCase();
    const byId = allProducts.find(p => String(p.id) === itemProduct);
    if (byId) return byId;
    const byStockIdAlias = allProducts.find(p => {
      const id = String(p.id || '');
      return id === `STOCK-${itemProduct}` || id.replace(/^STOCK-/, '') === itemProduct;
    });
    if (byStockIdAlias) return byStockIdAlias;
    const byNameOrSku = allProducts.find(p =>
      (p.name || '').toLowerCase() === itemProductLower ||
      (p.sku || '').toLowerCase() === itemProductLower
    );
    if (byNameOrSku) return byNameOrSku;
    return getProductsBySubcategory(item.category, item.subcategory).find(p => String(p.id) === itemProduct);
  };

  const getProductUnitPrice = (item: { category: string; subcategory: string; product: string; quantity: number; unit_price?: number }) => {
    const details = findProductDetails(item);
    return Number(details?.selling_price) || Number(details?.unit_price) || Number(item.unit_price) || 0;
  };

  const getLeadSummaryFromProducts = () => {
    const firstItem = addedProducts[0];
    if (!firstItem) {
      return { category: '', product: '', size: '', quantity: 0 };
    }

    const firstProduct = allProducts.find(p => String(p.id) === String(firstItem.product));
    const firstCategory = productCategories.find(c => c.id === firstItem.category);
    const totalQty = addedProducts.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);

    return {
      category: firstCategory?.name || firstProduct?.category || firstItem.category || '',
      product: firstProduct?.name || String(firstItem.product || ''),
      size: firstItem.subcategory || firstProduct?.subcategory || '',
      quantity: totalQty,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData: Record<string, string> = {
      customer: customerValue || (form.elements.namedItem('customer') as HTMLInputElement)?.value || '',
      contact: contactValue || (form.elements.namedItem('contact') as HTMLInputElement)?.value || '',
      mobile: mobileValue || '',
      email: emailValue || (form.elements.namedItem('email') as HTMLInputElement)?.value || '',
      source: (form.elements.namedItem('source') as HTMLSelectElement)?.value || '',
      required_date: (form.elements.namedItem('required_date') as HTMLInputElement)?.value || '',
    };
    formData.gst_number = gstNumber || '';
    formData.status = (form.elements.namedItem('leadStatus') as HTMLSelectElement)?.value || '';
    const validationErrors = validateFields(formData, {
      customer: { required: true, min: 2, label: 'Business Name' },
      contact: { required: true, label: 'Contact Person' },
      mobile: { required: true, phone: true, label: 'Mobile' },
      status: { required: true, label: 'Status' },
    });
    if (addedProducts.length === 0) {
      validationErrors.products = 'At least one item must be added';
    }
    if (Object.keys(validationErrors).length) { setErrors(validationErrors); return; }
    setErrors({});
    const leadSummary = getLeadSummaryFromProducts();
    const serializedProducts = addedProducts.map(p => ({
      product: p.product,
      category: p.category,
      subcategory: p.subcategory,
      size: p.subcategory || '',
      quantity: p.quantity,
      unit_price: Number(allProducts.find(ap => String(ap.id) === String(p.product))?.selling_price) || Number(allProducts.find(ap => String(ap.id) === String(p.product))?.unit_price) || 0,
    }));
    const payload: any = {
      customer: formData.customer,
      contact: formData.contact,
      mobile: formData.mobile,
      email: formData.email || '',
      source: formData.source || '',
      category: leadSummary.category,
      product: leadSummary.product,
      size: leadSummary.size,
      quantity: leadSummary.quantity,
      status: (form.elements.namedItem('leadStatus') as HTMLSelectElement)?.value || 'Contacted',
      gst_number: gstNumber || '',
      required_date: formData.required_date || undefined,
      address: (form.elements.namedItem('address') as HTMLTextAreaElement)?.value || '',
      state: stateValue || '',
      district: districtValue || '',
      notes: (form.elements.namedItem('notes') as HTMLTextAreaElement)?.value || '',
      description: (form.elements.namedItem('notes') as HTMLTextAreaElement)?.value || '',
      products: serializedProducts,
    };
    try {
      const created = await leadsService.createLead(payload);
      const leadKey = getLeadCacheKey(created) || getLeadCacheKey(payload);
      if (leadKey) saveLeadProductsToCache(leadKey, serializedProducts);
      toast.success('Lead created successfully!');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create lead');
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4 py-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="mobile">{t('mobile')} *</Label>
            <div className="relative">
              <Input
                id="mobile"
                placeholder="+91 XXXXX XXXXX"
                className="border border-gray-300"
                value={mobileValue}
                onChange={(e) => {
                  setMobileValue(e.target.value);
                  setMobileSearchQuery(e.target.value);
                  setShowMobileDropdown(true);
                  if (errors.mobile) setErrors(prev => { const { mobile, ...rest } = prev; return rest; });
                }}
                onFocus={() => setShowMobileDropdown(true)}
              />
              {showMobileDropdown && mobileValue && filteredClients.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredClients.map(client => (
                    <div
                      key={client.id || client._id}
                      className="px-3 py-2 cursor-pointer hover:bg-blue-50"
                      onClick={() => handleClientSelect(client)}
                    >
                      <p className="text-sm font-medium text-gray-900">{String(client.name || client.customer_name || client.client_name || '')}</p>
                      <p className="text-xs text-gray-500">{String(client.phone || client.mobile || '')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <FieldError message={errors.mobile} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer">{t('businessName')} *</Label>
            <Input id="customer" placeholder={t('enterBusinessName')} className="border border-gray-300" value={customerValue} onChange={(e) => { setCustomerValue(e.target.value); if (errors.customer) setErrors(prev => { const { customer, ...rest } = prev; return rest; }); }} />
            <FieldError message={errors.customer} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('gstNumber')}</Label>
            <Input
              value={gstNumber}
              onChange={handleGstChange}
              placeholder={t('enterGstNumber')}
              maxLength={15}
              className={`border border-gray-300${gstError ? ' border-red-500' : ''}`}
            />
            {gstError && <p className="text-xs text-red-500">{gstError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">{t('contactPerson')} *</Label>
            <Input id="contact" placeholder={t('enterContactPerson')} className="border border-gray-300" value={contactValue} onChange={(e) => { setContactValue(e.target.value); if (errors.contact) setErrors(prev => { const { contact, ...rest } = prev; return rest; }); }} />
            <FieldError message={errors.contact} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" type="email" placeholder="email@example.com" className="border border-gray-300" value={emailValue} onChange={(e) => { setEmailValue(e.target.value); if (errors.email) setErrors(prev => { const { email, ...rest } = prev; return rest; }); }} />
            <FieldError message={errors.email} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">{t('leadSource')}</Label>
            <select
              id="source"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={() => errors.source && setErrors(prev => { const { source, ...rest } = prev; return rest; })}
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="required_date">{t('requiredDate')}</Label>
            <Input
              id="required_date"
              type="date"
              className="border border-gray-300"
              onChange={() => errors.required_date && setErrors(prev => { const { required_date, ...rest } = prev; return rest; })}
            />
            <FieldError message={errors.required_date} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="leadStatus">{t('status')} *</Label>
            <select
              id="leadStatus"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={() => errors.status && setErrors(prev => { const { status, ...rest } = prev; return rest; })}
            >
              <option value="">{t('selectStatus')}</option>
              <option value="Contacted">{t('contacted')}</option>
              <option value="Qualified">{t('qualified')}</option>
            </select>
            <FieldError message={errors.status} />
          </div>
        </div>

        {/* Add Items Section */}
        <Card className={errors.products ? 'border-red-400' : ''}>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{t('addItems')} *</CardTitle>
            {errors.products && <p className="text-sm text-red-500 mt-1">{errors.products}</p>}
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
                      onFocus={(e) => e.target.select()}
                      onKeyDown={blockInvalidNumberKeys}
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
                      const productDetails = findProductDetails(product);
                      const productName = productDetails?.name || product.product;
                      const unitPrice = getProductUnitPrice(product);
                      const total = unitPrice * product.quantity;
                      return (
                        <TableRow key={product.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{productName}</TableCell>
                          <TableCell className="text-center">{product.quantity}</TableCell>
                          <TableCell className="text-right">₹{unitPrice.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-semibold">₹{total.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-center">
                              <Button type="button" size="sm" variant="ghost" onClick={() => {}}><Edit className="h-4 w-4 text-blue-500" /></Button>
                              <Button type="button" size="sm" variant="ghost" onClick={() => removeProduct(product.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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
                      <span>₹{addedProducts.reduce((sum, p) => sum + (getProductUnitPrice(p) * p.quantity), 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{t('gst18')}</span>
                      <span>₹{Math.round(addedProducts.reduce((sum, p) => sum + (getProductUnitPrice(p) * p.quantity), 0) * 0.18).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2">
                      <span>{t('grandTotal')}</span>
                      <span>₹{Math.round(addedProducts.reduce((sum, p) => sum + (getProductUnitPrice(p) * p.quantity), 0) * 1.18).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-2 grid grid-flow-col gap-4 md:grid-cols-2">
          <div className='space-y-2 mt-2'>
          <Label htmlFor="address">{t('address')}</Label>
          <Textarea id="address" placeholder={t('enterCustomerAddress')} className="border border-gray-300" />
          </div>
          <div className='space-y-2'>
          <Label htmlFor="notes">{t('notesSpecialRequirements')}</Label>
          <Textarea id="notes" placeholder={t('enterAnyAdditionalNotesOrSpecialRequirements')} className="border border-gray-300" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="state">{t('state')}</Label>
            <Popover open={stateOpen} onOpenChange={setStateOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" role="combobox" aria-expanded={stateOpen} className="w-full justify-between border border-gray-300 font-normal">
                  {stateValue || t('enterState')}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t('searchState')} />
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
            {stateValue && gstNumber && <p className="text-xs text-green-600">Auto-filled from GST</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="district">{t('district')}</Label>
            <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" role="combobox" aria-expanded={districtOpen} disabled={!stateValue} className="w-full justify-between border border-gray-300 font-normal">
                  {districtValue || (stateValue ? t('enterDistrict') : t('enterState'))}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t('searchDistrict')} />
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
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          {t('createLead')}
        </Button>
      </div>
    </form>
  );
}

function AddActivityDialog({ leads, onSuccess }: { leads: Lead[]; onSuccess?: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          {t('addActivity')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('addActivity')}</DialogTitle>
          <DialogDescription>
            {t('createANewActivityForALeadOrCustomer')}
          </DialogDescription>
        </DialogHeader>
        <AddActivityForm leads={leads} onClose={() => setOpen(false)} onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  );
}

function EditActivityDialog({ open, onOpenChange, followUp, onSuccess }: { open: boolean; onOpenChange: (open: boolean) => void; followUp: any; onSuccess?: () => void }) {
  const { t } = useI18n();
  const [activityType, setActivityType] = useState('');
  const [customActivityType, setCustomActivityType] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('upcoming');
  const [priority, setPriority] = useState('medium');
  const [errors, setErrors] = useState<ValidationErrors>({});

  const presetTypes = ['call', 'email', 'meeting', 'visit', 'followup'];

  useEffect(() => {
    if (!open || !followUp) return;
    const rawType = String(followUp.activity_type || 'followup').toLowerCase();
    const isPreset = presetTypes.includes(rawType);
    const datePart = String(followUp.date || '').slice(0, 10);
    const timePart = String(followUp.scheduled_time || '').slice(0, 5);
    setActivityType(isPreset ? rawType : 'add');
    setCustomActivityType(isPreset ? '' : String(followUp.activity_type || ''));
    setCustomerName(String(followUp.customer || followUp.by || ''));
    setScheduledAt(datePart ? `${datePart}T${timePart || '00:00'}` : '');
    setDescription(String(followUp.note || ''));
    setStatus(String(followUp.status || 'upcoming'));
    setPriority(String(followUp.priority || 'medium').toLowerCase());
    setErrors({});
  }, [open, followUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUp) return;
    const finalActivityType = activityType === 'add' ? customActivityType : activityType;
    const [date = '', timeRaw = ''] = scheduledAt.split('T');
    const formData: Record<string, string> = {
      activityType,
      customerName,
      description,
      status,
    };
    const rules: Record<string, any> = {
      activityType: { required: true, label: 'Activity Type' },
      customerName: { required: true, label: 'Business Name' },
      description: { required: true, label: 'Description' },
      status: { required: true, label: 'Status' },
    };
    if (activityType === 'add') {
      (formData as any).customActivityType = customActivityType;
      rules.customActivityType = { required: true, label: 'Custom Activity Type' };
    }
    const validationErrors = validateFields(formData, rules);
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    try {
      await leadsService.updateFollowUp(String(followUp.lead_id), String(followUp.id), {
        date: date || followUp.date,
        scheduled_time: timeRaw ? timeRaw.slice(0, 5) : null,
        note: description,
        status,
        activity_type: finalActivityType,
        priority,
        done_by: customerName || followUp.by || 'System',
      });
      toast.success('Activity updated successfully');
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update activity');
    }
  };

  if (!followUp) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('edit')} {t('addActivity')}</DialogTitle>
          <DialogDescription>
            {followUp.lead_number} - {followUp.customer}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('activityType')} *</Label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={activityType}
                  onChange={(e) => {
                    setActivityType(e.target.value);
                    if (e.target.value !== 'add') setCustomActivityType('');
                    if (errors.activityType) setErrors(prev => { const { activityType, ...rest } = prev; return rest; });
                  }}
                >
                  <option value="">{t('selectType')}</option>
                  <option value="call">{t('call')}</option>
                  <option value="email">{t('email')}</option>
                  <option value="meeting">{t('meeting')}</option>
                  <option value="visit">{t('siteVisit')}</option>
                  <option value="followup">{t('followup')}</option>
                  <option value="add">{t('add')}</option>
                </select>
                <FieldError message={errors.activityType} />
              </div>
              <div className="space-y-2">
                <Label>{t('businessName')} *</Label>
                <Input
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (errors.customerName) setErrors(prev => { const { customerName, ...rest } = prev; return rest; });
                  }}
                  className="border border-gray-300"
                />
                <FieldError message={errors.customerName} />
              </div>
            </div>

            {activityType === 'add' && (
              <div className="space-y-2">
                <Label>{t('customActivityType')} *</Label>
                <Input
                  value={customActivityType}
                  onChange={(e) => {
                    setCustomActivityType(e.target.value);
                    if (errors.customActivityType) setErrors(prev => { const { customActivityType, ...rest } = prev; return rest; });
                  }}
                  className="border border-gray-300"
                />
                <FieldError message={errors.customActivityType} />
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('scheduledTime')}</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="border border-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('description')} *</Label>
              <Textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) setErrors(prev => { const { description, ...rest } = prev; return rest; });
                }}
                className="min-h-[80px] border border-gray-300"
              />
              <FieldError message={errors.description} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('status')} *</Label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    if (errors.status) setErrors(prev => { const { status, ...rest } = prev; return rest; });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="upcoming">{t('upcoming')}</option>
                  <option value="completed">{t('completed')}</option>
                </select>
                <FieldError message={errors.status} />
              </div>
              <div className="space-y-2">
                <Label>{t('priority')}</Label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="high">{t('high')}</option>
                  <option value="medium">{t('medium')}</option>
                  <option value="low">{t('low')}</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {t('saveChanges')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddActivityForm({ leads, onClose, onSuccess }: { leads: Lead[]; onClose: () => void; onSuccess?: () => void }) {
  const { t } = useI18n();
  const [activityType, setActivityType] = useState('');
  const [customActivityType, setCustomActivityType] = useState('');
  const [selectedLead, setSelectedLead] = useState('');
  const [isClientSelection, setIsClientSelection] = useState(false);
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [allDropdownItems, setAllDropdownItems] = useState<any[]>([]);

  // Fetch clients and merge with leads so all entries appear in the dropdown
  useEffect(() => {
    const leadNames = new Set(leads.map(l => (l.customer || '').toLowerCase()));
    const merged: any[] = [...leads];

    clientsService.getClients().then(data => {
      const clients = Array.isArray(data) ? data : (data as any)?.items ?? [];
      clients.forEach((client: any) => {
        const clientName = String(client.name || client.customer || '');
        if (clientName && !leadNames.has(clientName.toLowerCase())) {
          merged.push({
            id: client.id ?? client._id ?? '',
            lead_number: `CLIENT-${client.id}`,
            customer: clientName,
            contact: String(client.contact_person || client.contact || ''),
            mobile: String(client.phone || client.mobile || ''),
            _isClient: true,
          });
        }
      });
      setAllDropdownItems(merged);
    }).catch(() => {
      setAllDropdownItems(merged);
    });
  }, [leads]);

  const filteredLeads = allDropdownItems.filter(lead => {
    const query = leadSearchQuery.toLowerCase();
    return (
      (lead.lead_number || '').toLowerCase().includes(query) ||
      (lead.customer || '').toLowerCase().includes(query) ||
      (lead.contact || '').toLowerCase().includes(query)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const finalActivityType = activityType === 'add' ? customActivityType : activityType;
    const scheduledAt = (form.elements.namedItem('scheduled-time') as HTMLInputElement)?.value || '';
    const [scheduledDate = '', scheduledTimeRaw = ''] = scheduledAt.split('T');
    const description = (form.elements.namedItem('description') as HTMLTextAreaElement)?.value || '';
    const status = (form.elements.namedItem('status') as HTMLSelectElement)?.value || '';
    const priority = (form.elements.namedItem('priority') as HTMLSelectElement)?.value || '';
    const formData: Record<string, string> = {
      activityType,
      lead: selectedLead,
      customerName,
      description,
      status,
    };
    const rules: Record<string, any> = {
      activityType: { required: true, label: 'Activity Type' },
      lead: { required: true, label: 'Lead' },
      customerName: { required: true, label: 'Business Name' },
      description: { required: true, label: 'Description' },
      status: { required: true, label: 'Status' },
    };
    if (activityType === 'add') {
      (formData as any).customActivityType = customActivityType;
      rules.customActivityType = { required: true, label: 'Custom Activity Type' };
    }
    const validationErrors = validateFields(formData, rules);
    if (Object.keys(validationErrors).length) { setErrors(validationErrors); return; }
    setErrors({});
    try {
      let leadId = String(selectedLead);

      // If a client (not a lead) was selected, create a lead from the client first
      if (isClientSelection) {
        const selectedItem = allDropdownItems.find(item => String(item.id) === leadId && item._isClient);
        const newLead = await leadsService.createLead({
          customer: selectedItem?.customer || customerName,
          contact: selectedItem?.contact || '',
          mobile: selectedItem?.mobile || '',
          source: 'Client',
          status: 'New',
          conversion_status: 'None',
        });
        leadId = String(newLead?.id ?? newLead?._id ?? leadId);
      }

      await leadsService.addFollowUp(leadId, {
        date: scheduledDate || new Date().toISOString().split('T')[0],
        scheduled_time: scheduledTimeRaw ? scheduledTimeRaw.slice(0, 5) : undefined,
        note: description,
        status,
        activity_type: finalActivityType,
        priority: priority || undefined,
        done_by: customerName || 'System',
      });
      toast.success(`Activity added successfully! Type: ${finalActivityType}`);
      onSuccess?.();
      handleCancel();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add activity');
    }
  };

  const handleCancel = () => {
    setActivityType('');
    setCustomActivityType('');
    setSelectedLead('');
    setIsClientSelection(false);
    setLeadSearchQuery('');
    setShowLeadDropdown(false);
    setCustomerName('');
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Activity Type */}
          <div className="space-y-2">
            <Label htmlFor="activity-type">{t('activityType')} *</Label>
            <select
              id="activity-type"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={activityType}
              onChange={(e) => {
                setActivityType(e.target.value);
                if (e.target.value !== 'add') {
                  setCustomActivityType('');
                }
                if (errors.activityType) setErrors(prev => { const { activityType, ...rest } = prev; return rest; });
              }}
            >
              <option value="">{t('selectType')}</option>
              <option value="call">{t('call')}</option>
              <option value="email">{t('email')}</option>
              <option value="meeting">{t('meeting')}</option>
              <option value="visit">{t('siteVisit')}</option>
              <option value="followup">{t('followup')}</option>
              <option value="add">{t('add')}</option>
            </select>
            <FieldError message={errors.activityType} />
          </div>

          {/* Lead Selection */}
          <div className="space-y-2">
            <Label htmlFor="lead-select">{t('lead')} *</Label>
            <div className="space-y-2 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder={t('searchLead')}
                  value={leadSearchQuery}
                  onChange={(e) => setLeadSearchQuery(e.target.value)}
                  onFocus={() => setShowLeadDropdown(true)}
                  className="pl-10 pr-10 border border-gray-300"
                />
                {selectedLead && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLead('');
                      setIsClientSelection(false);
                      setLeadSearchQuery('');
                      setCustomerName('');
                      setShowLeadDropdown(false);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
              {showLeadDropdown && (
                <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredLeads.length > 0 ? (
                    filteredLeads.map(lead => (
                      <div
                        key={lead.id}
                        className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${String(selectedLead) === String(lead.id) ? 'bg-blue-50' : ''}`}
                        onClick={() => {
                          setSelectedLead(String(lead.id));
                          setIsClientSelection(!!lead._isClient);
                          setLeadSearchQuery(`${lead.lead_number} - ${lead.customer}`);
                          setCustomerName(lead.customer);
                          setShowLeadDropdown(false);
                        }}
                      >
                        <div className="font-medium text-sm">{lead.lead_number} - {lead.customer}</div>
                        <div className="text-xs text-gray-500">{lead.contact} • {lead.mobile}</div>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-gray-500 text-sm">
                      {t('noLeadFound')}
                    </div>
                  )}
                </div>
              )}
              <input type="hidden" name="leadId" value={selectedLead} />
              <FieldError message={errors.lead} />
            </div>
          </div>
        </div>

        {/* Custom Activity Type Input - Shows only when "Add" is selected */}
        {activityType === 'add' && (
          <div className="space-y-2">
            <Label htmlFor="custom-activity-type">{t('customActivityType')} *</Label>
            <Input
              id="custom-activity-type"
              placeholder={t('enterCustomActivityType')}
              value={customActivityType}
              onChange={(e) => { setCustomActivityType(e.target.value); if (errors.customActivityType) setErrors(prev => { const { customActivityType, ...rest } = prev; return rest; }); }}
              className="border border-gray-300"
            />
            <FieldError message={errors.customActivityType} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Business Name */}
          <div className="space-y-2">
            <Label htmlFor="customer-name">{t('businessName')} *</Label>
            <Input 
              id="customer-name"
              placeholder={t('enterBusinessName')} 
              value={customerName}
              onChange={(e) => { setCustomerName(e.target.value); if (errors.customerName) setErrors(prev => { const { customerName, ...rest } = prev; return rest; }); }}
              className="border border-gray-300"
            />
            <FieldError message={errors.customerName} />
          </div>

          {/* Scheduled Time */}
          <div className="space-y-2">
            <Label htmlFor="scheduled-time">{t('scheduledTime')}</Label>
            <Input id="scheduled-time" type="datetime-local" className="border border-gray-300" />
          </div>
        </div>

        {/* Description - Full Width */}
        <div className="space-y-2">
          <Label htmlFor="description">{t('description')} *</Label>
          <Textarea 
            id="description"
            placeholder={t('enterActivityDetails')} 
            className="min-h-[80px] border border-gray-300"
            onChange={() => errors.description && setErrors(prev => { const { description, ...rest } = prev; return rest; })}
          />
          <FieldError message={errors.description} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">{t('status')} *</Label>
            <select
              id="status"
              defaultValue="upcoming"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={() => errors.status && setErrors(prev => { const { status, ...rest } = prev; return rest; })}
            >
              <option value="upcoming">{t('upcoming')}</option>
              <option value="completed">{t('completed')}</option>
            </select>
            <FieldError message={errors.status} />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">{t('priority')}</Label>
            <select
              id="priority"
              defaultValue="medium"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="high">{t('high')}</option>
              <option value="medium">{t('medium')}</option>
              <option value="low">{t('low')}</option>
            </select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={handleCancel}>
          {t('cancel')}
        </Button>
        <Button type="submit">
          {t('addActivity')}
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditLeadForm({ lead, categories = [], allProducts = [], onClose, onSuccess }: { lead: Lead; categories?: Array<{ id: string; name: string; items: string[]; subcategories?: string[] }>; allProducts?: Array<{ id: string; name: string; sku: string; category: string; subcategory?: string; unit: string; unit_price?: number; selling_price?: number; base_price?: number }>; onClose: () => void; onSuccess?: () => void }) {
  const { t } = useI18n();
  const knownLeadSources = ['website', 'phone', 'walkin', 'advertisement', 'referral', 'inperson'];
  const normalizeLeadSource = (value: string) => {
    const v = (value || '').trim().toLowerCase();
    if (v === 'walk-in' || v === 'walk in' || v === 'walkin') return 'walkin';
    if (v === 'in-person' || v === 'in person' || v === 'inperson') return 'inperson';
    if (v === 'website' || v === 'phone' || v === 'advertisement' || v === 'referral') return v;
    return v;
  };
  const initialCategoryId = categories.find(
    c => c.name.toLowerCase() === String(lead.category || '').toLowerCase()
  )?.id || String(lead.category || '').toLowerCase().replace(/\s+/g, '-');
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingQty, setEditingQty] = useState(0);
  const [addedProducts, setAddedProducts] = useState<Array<{ id: number; category: string; subcategory: string; product: string; quantity: number; unit_price?: number }>>(
    lead.products && lead.products.length > 0 
      ? lead.products.map((p: LeadProduct, idx: number) => ({ 
          id: idx + 1, 
          category: p.category || '', 
          subcategory: p.subcategory || '', 
          product: String(p.product || ''), 
          quantity: p.quantity || 1,
          unit_price: Number((p as any).unit_price ?? (p as any).selling_price ?? (p as any).rate ?? (p as any).price ?? 0) || 0,
        }))
      : (lead.product || lead.category || lead.quantity
          ? [{
              id: 1,
              category: initialCategoryId || '',
              subcategory: String(lead.size || ''),
              product: String(lead.product || ''),
              quantity: Number(lead.quantity) > 0 ? Number(lead.quantity) : 1,
              unit_price: Number((lead as any).unit_price ?? (lead as any).selling_price ?? 0) || 0,
            }]
          : [])
  );
  // Multi-row item entry (like billing)
  const [itemEntryRows, setItemEntryRows] = useState<Array<{ id: number; itemId: string; itemName: string; category: string; subcategory: string; quantity: number }>>([
    { id: 1, itemId: '', itemName: '', category: '', subcategory: '', quantity: 0 }
  ]);
  const [activeRowDropdown, setActiveRowDropdown] = useState<number | null>(null);
  const [itemRowErrors, setItemRowErrors] = useState<Record<number, { itemId?: string; quantity?: string }>>({});
  
  const [customerName, setCustomerName] = useState(lead.customer || '');
  const [contactPerson, setContactPerson] = useState(lead.contact || '');
  const [mobile, setMobile] = useState(lead.mobile || '');
  const [email, setEmail] = useState(lead.email || '');
  const [source, setSource] = useState(normalizeLeadSource(lead.source || ''));
  const [status, setStatus] = useState(lead.status || '');
  const [requiredDate, setRequiredDate] = useState(String((lead as any).required_date || '').slice(0, 10));
  const [address, setAddress] = useState(lead.address || '');
  const [notes, setNotes] = useState(lead.notes || lead.description || '');
  const isLeadConverted = String((lead as any).conversion_status || '').toLowerCase() === 'converted';
  
  const [gstNumber, setGstNumber] = useState((lead as any).gst_number || '');
  const [gstError, setGstError] = useState('');
  const [stateValue, setStateValue] = useState((lead as any).state || ((lead as any).gst_number ? getStateFromGST((lead as any).gst_number) : ''));
  const [districtValue, setDistrictValue] = useState((lead as any).district || '');
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
    // Don't clear state/district when GST is removed — user may have set them manually
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
    // Auto-fill GST, state, district, address from selected client
    const clientGst = String(client.gst_number || client.gstNumber || '');
    setGstNumber(clientGst);
    setGstError(clientGst ? validateGstNumber(clientGst) : '');
    setStateValue(String(client.state || ''));
    setDistrictValue(String(client.district || ''));
    setAddress(String(client.address || ''));
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
    if (isLeadConverted) {
      toast.error('This lead is already converted. Create a new lead to add new items.');
      return;
    }
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
    if (isLeadConverted) {
      toast.error('This lead is already converted. Create a new lead to add new items.');
      return;
    }
    const rowErrors: Record<number, { itemId?: string; quantity?: string }> = {};
    itemEntryRows.forEach((row) => {
      if (!row.itemId) rowErrors[row.id] = { ...(rowErrors[row.id] || {}), itemId: 'Select an item' };
      if (!row.quantity || row.quantity < 1) rowErrors[row.id] = { ...(rowErrors[row.id] || {}), quantity: 'Enter quantity' };
    });
    if (Object.keys(rowErrors).length) { setItemRowErrors(rowErrors); return; }

    const validRows = itemEntryRows.filter(row => row.itemId);
    if (validRows.length === 0) return;

    const newProducts = validRows.map((row, idx) => {
      const selected = allProducts.find(p => String(p.id) === String(row.itemId));
      return {
        id: addedProducts.length + idx + 1,
        category: row.category,
        subcategory: row.subcategory,
        product: row.itemId,
        quantity: row.quantity,
        unit_price: Number(selected?.selling_price) || Number(selected?.unit_price) || 0,
      };
    });
    setAddedProducts([...addedProducts, ...newProducts]);
    setItemEntryRows([{ id: 1, itemId: '', itemName: '', category: '', subcategory: '', quantity: 0 }]);
    setItemRowErrors({});
    if (errors.products) setErrors(prev => { const { products, ...rest } = prev; return rest; });
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

  const findProductDetails = (item: { category: string; subcategory: string; product: string; quantity?: number; unit_price?: number }) => {
    const itemProduct = String(item.product || '').trim();
    const itemProductLower = itemProduct.toLowerCase();

    // Primary match by product id across catalog
    const byId = allProducts.find(p => String(p.id) === itemProduct);
    if (byId) return byId;

    // Older lead rows may store raw stock id while UI uses STOCK-{id}
    const byStockIdAlias = allProducts.find(p => {
      const id = String(p.id || '');
      return id === `STOCK-${itemProduct}` || id.replace(/^STOCK-/, '') === itemProduct;
    });
    if (byStockIdAlias) return byStockIdAlias;

    // Fallback for older records where product may be saved as name/sku
    const byNameOrSku = allProducts.find(p =>
      (p.name || '').toLowerCase() === itemProductLower ||
      (p.sku || '').toLowerCase() === itemProductLower
    );
    if (byNameOrSku) return byNameOrSku;

    // Last fallback: scoped category/subcategory lookup
    return getProductsBySubcategory(item.category, item.subcategory).find(p => String(p.id) === itemProduct);
  };

  const getProductUnitPrice = (item: { category: string; subcategory: string; product: string; quantity: number; unit_price?: number }) => {
    const details = findProductDetails(item);
    return Number(details?.selling_price) || Number(details?.unit_price) || Number(item.unit_price) || 0;
  };

  const getLeadSummaryFromProducts = () => {
    const firstItem = addedProducts[0];
    if (!firstItem) {
      return { category: '', product: '', size: '', quantity: 0 };
    }

    const firstProduct = findProductDetails(firstItem);
    const firstCategory = productCategories.find(c => c.id === firstItem.category);
    const totalQty = addedProducts.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);

    return {
      category: firstCategory?.name || firstProduct?.category || firstItem.category || '',
      product: firstProduct?.name || String(firstItem.product || ''),
      size: firstItem.subcategory || firstProduct?.subcategory || '',
      quantity: totalQty,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveSource = String(source || (lead as any).source || '').trim().toLowerCase();
    const effectiveRequiredDate = requiredDate || String((lead as any).required_date || '').slice(0, 10);
    const validationErrors = validateFields(
      { customer: customerName, contact: contactPerson, mobile, email, source: effectiveSource, gst_number: gstNumber || '', status },
      {
        customer: { required: true, min: 2, label: 'Business Name' },
        contact: { required: true, label: 'Contact Person' },
        mobile: { required: true, phone: true, label: 'Mobile' },
        source: { required: true, label: 'Lead Source' },
        email: { required: true, email: true, label: 'Email' },
        status: { required: true, label: 'Status' },
      }
    );
    if (addedProducts.length === 0) {
      validationErrors.products = 'At least one item must be added';
    }
    if (Object.keys(validationErrors).length) { setErrors(validationErrors); return; }
    setErrors({});
    const leadSummary = getLeadSummaryFromProducts();
    const serializedProducts = addedProducts.map(p => ({
      product: p.product,
      category: p.category,
      subcategory: p.subcategory,
      size: p.subcategory || '',
      quantity: p.quantity,
      unit_price: Number(p.unit_price) || getProductUnitPrice(p) || 0,
    }));
    const payload: any = {
      customer: customerName,
      contact: contactPerson,
      mobile,
      email,
      source: effectiveSource,
      category: leadSummary.category,
      product: leadSummary.product,
      size: leadSummary.size,
      quantity: leadSummary.quantity,
      status,
      address,
      gst_number: gstNumber || '',
      state: stateValue || '',
      district: districtValue || '',
      required_date: effectiveRequiredDate || undefined,
      notes,
      description: notes,
      products: serializedProducts,
    };
    try {
      await leadsService.updateLead(String(lead.id || lead.lead_number), payload);
      saveLeadProductsToCache(String(lead.id || lead._id || lead.lead_number), serializedProducts);
      toast.success(`Lead ${lead.lead_number} updated successfully!`);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update lead');
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4 py-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-mobile">{t('mobile')} *</Label>
            <div className="relative">
              <Input 
                id="edit-mobile" 
                placeholder="+91 XXXXX XXXXX" 
                className="border border-gray-300"
                value={mobile}
                onChange={(e) => { setMobile(e.target.value); setShowMobileDropdown(true); if (errors.mobile) setErrors(prev => { const { mobile, ...rest } = prev; return rest; }); }}
                onFocus={() => setShowMobileDropdown(true)}
              />
              {showMobileDropdown && mobile && filteredClients.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredClients.map(client => (
                    <div
                      key={client.id || client._id}
                      className="px-3 py-2 cursor-pointer hover:bg-blue-50"
                      onClick={() => handleClientSelect(client)}
                    >
                      <p className="text-sm font-medium text-gray-900">{String(client.phone || client.mobile || '')}</p>
                      <p className="text-xs text-gray-500">{String(client.name || client.customer_name || client.client_name || '')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <FieldError message={errors.mobile} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-customer">{t('businessName')} *</Label>
            <Input 
              id="edit-customer" 
              placeholder={t('enterBusinessName')} 
              className="border border-gray-300"
              value={customerName}
              onChange={(e) => { setCustomerName(e.target.value); if (errors.customer) setErrors(prev => { const { customer, ...rest } = prev; return rest; }); }}
            />
            <FieldError message={errors.customer} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('gstNumber')}</Label>
            <Input
              value={gstNumber}
              onChange={handleGstChange}
              placeholder={t('enterGstNumber')}
              maxLength={15}
              className={`border border-gray-300${gstError ? ' border-red-500' : ''}`}
            />
            {gstError && <p className="text-xs text-red-500">{gstError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-contact">{t('contactPerson')} *</Label>
            <Input 
              id="edit-contact" 
              placeholder={t('enterContactPerson')} 
              className="border border-gray-300"
              value={contactPerson}
              onChange={(e) => { setContactPerson(e.target.value); if (errors.contact) setErrors(prev => { const { contact, ...rest } = prev; return rest; }); }}
            />
            <FieldError message={errors.contact} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-email">{t('email')} *</Label>
            <Input 
              id="edit-email" 
              type="email" 
              placeholder="email@example.com" 
              className="border border-gray-300"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors(prev => { const { email, ...rest } = prev; return rest; }); }}
            />
            <FieldError message={errors.email} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-source">{t('leadSource')} *</Label>
            <select
              id="edit-source"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={source}
              onChange={(e) => { setSource(e.target.value); if (errors.source) setErrors(prev => { const { source, ...rest } = prev; return rest; }); }}
            >
              <option value="">{t('selectSource')}</option>
              {source && !knownLeadSources.includes(source) && (
                <option value={source}>{source}</option>
              )}
              <option value="website">{t('website')}</option>
              <option value="phone">{t('phone')}</option>
              <option value="walkin">{t('walkin')}</option>
              <option value="advertisement">{t('advertisement')}</option>
              <option value="referral">{t('referral')}</option>
              <option value="inperson">{t('inperson')}</option>
            </select>
            <FieldError message={errors.source} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-required-date">{t('requiredDate')}</Label>
            <Input
              id="edit-required-date"
              type="date"
              value={requiredDate}
              onChange={(e) => {
                setRequiredDate(e.target.value);
              }}
              className="border border-gray-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-status">{t('status')} *</Label>
            <select
              id="edit-status"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={status}
              onChange={(e) => { setStatus(e.target.value); if (errors.status) setErrors(prev => { const { status, ...rest } = prev; return rest; }); }}
            >
              <option value="">{t('selectStatus')}</option>
              <option value="New">{t('new')}</option>
              <option value="Contacted">{t('contacted')}</option>
              <option value="Qualified">{t('qualified')}</option>
              <option value="Converted">{t('converted')}</option>
              <option value="Rejected">{t('rejected')}</option>
            </select>
            <FieldError message={errors.status} />
          </div>
        </div>

        {/* Add Items Section */}
        <Card className={errors.products ? 'border-red-400' : ''}>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{t('addItems')} *</CardTitle>
            {isLeadConverted && <p className="text-sm text-red-500 mt-1">This lead is converted. Please create a new lead to add items.</p>}
            {errors.products && <p className="text-sm text-red-500 mt-1">{errors.products}</p>}
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
                      disabled={isLeadConverted}
                    />
                    <FieldError message={itemRowErrors[row.id]?.itemId} />
                    {activeRowDropdown === row.id && !isLeadConverted && (
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
                      disabled={isLeadConverted}
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
                        disabled={isLeadConverted}
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
                        disabled={isLeadConverted}
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
                disabled={isLeadConverted || !itemEntryRows.some(row => row.itemId)}
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
                      const productDetails = findProductDetails(product);
                      const productName = productDetails?.name || String(product.product);
                      const unitPrice = getProductUnitPrice(product);
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
                      <span>₹{addedProducts.reduce((sum, p) => sum + (getProductUnitPrice(p) * p.quantity), 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{t('gst18')}</span>
                      <span>₹{Math.round(addedProducts.reduce((sum, p) => sum + (getProductUnitPrice(p) * p.quantity), 0) * 0.18).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2">
                      <span>{t('grandTotal')}</span>
                      <span>₹{Math.round(addedProducts.reduce((sum, p) => sum + (getProductUnitPrice(p) * p.quantity), 0) * 1.18).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-2 grid grid-flow-col gap-4 md:grid-cols-2">
          <div className='space-y-2 mt-2'>
            <Label htmlFor="edit-address">{t('address')}</Label>
            <Textarea 
              id="edit-address" 
              placeholder={t('enterCustomerAddress')} 
              className="border border-gray-300"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor="edit-notes">{t('notesSpecialRequirements')}</Label>
            <Textarea 
              id="edit-notes" 
              placeholder={t('enterAnyAdditionalNotesOrSpecialRequirements')} 
              className="border border-gray-300"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('state')}</Label>
            <Popover open={stateOpen} onOpenChange={setStateOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" role="combobox" aria-expanded={stateOpen} className="w-full justify-between border border-gray-300 font-normal">
                  {stateValue || t('enterState')}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t('searchState')} />
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
            {stateValue && gstNumber && <p className="text-xs text-green-600">Auto-filled from GST</p>}
          </div>
          <div className="space-y-2">
            <Label>{t('district')}</Label>
            <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" role="combobox" aria-expanded={districtOpen} disabled={!stateValue} className="w-full justify-between border border-gray-300 font-normal">
                  {districtValue || (stateValue ? t('enterDistrict') : t('enterState'))}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t('searchDistrict')} />
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
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          {t('updateLead')}
        </Button>
      </div>
    </form>
  );
}
