import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { useI18n } from '../contexts/I18nContext';
import { vendorsService } from '../services/vendors.service';
import { generatePartyReportPdf } from '../lib/partyReportPdf';
import { useLedgerFilter, applyLedgerFilter, LedgerToolbar, exportLedgerPdf, getRangeLabel, type LedgerEntry } from './ledgerFilter';
import {
  ArrowLeft, Phone, Mail, MapPin, Building2,
  ShoppingCart, IndianRupee, Calendar, FileText,
  Edit, Save, X, Package, Clock, CreditCard, Download,
  ChevronDown, ChevronRight, Plus, MessageSquare,
  Truck, ArrowDownRight, ArrowUpRight, TrendingUp, Receipt,
} from 'lucide-react';

const fmt = (val: number) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

export default function VendorDetailPage() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();

  const [vendor, setVendor] = useState<any>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [viewPo, setViewPo] = useState<any>(null);

  // Followup dialog
  const [followupOpen, setFollowupOpen] = useState(false);
  const [newFollowup, setNewFollowup] = useState({ type: 'Call', subject: '', notes: '', priority: 'Medium', status: 'Pending' });

  const fetchData = () => {
    if (!vendorId) return;
    setLoading(true);
    Promise.all([
      vendorsService.getVendorById(vendorId).catch(() => null),
      vendorsService.getVendorPurchases(vendorId).catch(() => []),
      vendorsService.getVendorTransactions(vendorId).catch(() => []),
      vendorsService.getVendorDispatches(vendorId).catch(() => []),
      vendorsService.getVendorFollowups(vendorId).catch(() => []),
    ]).then(([vd, poData, txData, ddData, fdData]) => {
      setVendor(vd);
      if (vd) setEditForm({ ...vd });
      setPurchaseOrders(Array.isArray(poData) ? poData : (poData as any)?.items || []);
      setTransactions(Array.isArray(txData) ? txData : (txData as any)?.items || []);
      setDispatches(Array.isArray(ddData) ? ddData : (ddData as any)?.items || []);
      setFollowups(Array.isArray(fdData) ? fdData : (fdData as any)?.items || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [vendorId]);

  const toggleRow = (key: string) => {
    setExpandedRows(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  const handleSave = async () => {
    if (!vendorId) return;
    setSaving(true);
    try {
      await vendorsService.updateVendor(vendorId, editForm);
      toast.success('Vendor details updated');
      setEditing(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update');
    } finally { setSaving(false); }
  };

  const handleAddFollowup = async () => {
    if (!vendorId || !newFollowup.subject) return;
    try {
      await vendorsService.createVendorFollowup(vendorId, { ...newFollowup, date: new Date().toISOString().split('T')[0] });
      toast.success('Follow-up added');
      setFollowupOpen(false);
      setNewFollowup({ type: 'Call', subject: '', notes: '', priority: 'Medium', status: 'Pending' });
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add follow-up');
    }
  };

  const ledgerFilter = useLedgerFilter();

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="p-6 text-center">
        <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 mb-2">Vendor not found</h3>
        <Button variant="outline" onClick={() => navigate('/vendors')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Vendors
        </Button>
      </div>
    );
  }

  // Stats
  const totalPurchaseAmount = purchaseOrders.reduce((s, po) => s + (Number(po.total_amount) || 0), 0);
  const outstandingPOs = purchaseOrders.filter((po: any) => {
    const status = String(po?.status || '').toLowerCase();
    return status !== 'received' && status !== 'cancelled';
  });
  const outstandingAmount = outstandingPOs.reduce((s, po) => s + (Number(po.total_amount) || 0), 0);
  // For a vendor: expense = money we paid them, income = refund/credit from them.
  const expenseTxnTotal = transactions.filter(t => t.type !== 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const incomeTxnTotal = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalPaid = expenseTxnTotal - incomeTxnTotal;
  // Outstanding = Total Purchase Amount − Total Paid (mirrors client: totalBilled − totalPaid).
  // Every expense reduces what we still owe the vendor.
  const totalAmount = Number(vendor.total_amount) || totalPurchaseAmount;
  const liveOutstanding = totalAmount - totalPaid;

  // Build unified ledger entries from POs (debits) and transactions (credits = payments to vendor, debits = refunds from vendor).
  const ledgerEntries: LedgerEntry[] = [];
  for (const po of purchaseOrders) {
    const status = String(po?.status || '').toLowerCase();
    if (status === 'cancelled') continue;
    const amt = Number(po.total_amount) || 0;
    if (amt <= 0) continue;
    const itemsLabel = Array.isArray(po.items) && po.items.length
      ? po.items.map((it: any) => it.item_name || it.name || it.description).filter(Boolean).join(', ')
      : (po.description || 'Purchase Order');
    ledgerEntries.push({
      key: `po-${po.id}`,
      date: po.date || po.order_date || po.po_date || po.created_at || po.createdAt || '',
      item: itemsLabel || 'Purchase Order',
      ref: po.po_number || po.po_no || `PO-${po.id}`,
      debit: amt,
      credit: 0,
      source: po,
      kind: 'po',
    });
  }
  for (const t of transactions) {
    const amt = Number(t.amount) || 0;
    if (amt <= 0) continue;
    const isPayment = t.type !== 'income';
    ledgerEntries.push({
      key: `tx-${t.id}`,
      date: t.date || '',
      item: t.description || t.category || (isPayment ? 'Payment' : 'Refund'),
      ref: t.reference || t.bill_no || t.bill?.bill_no || `TXN-${t.id}`,
      debit: isPayment ? 0 : amt,
      credit: isPayment ? amt : 0,
      source: t,
      kind: 'tx',
    });
  }
  const ledgerFiltered = applyLedgerFilter(ledgerEntries, ledgerFilter.range, ledgerFilter.customFrom, ledgerFilter.customTo);
  const ledgerSortedAsc = [...ledgerFiltered].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    if (da !== db) return da - db;
    return a.key.localeCompare(b.key);
  });
  const ledgerBalanceByKey = new Map<string, number>();
  {
    let running = 0;
    for (const e of ledgerSortedAsc) {
      running += e.debit - e.credit;
      ledgerBalanceByKey.set(e.key, running);
    }
  }

  return (
    <div className="px-6 pt-2 pb-4 flex flex-col gap-3">
      {/* Compact header bar */}
      <div className="flex items-center justify-between flex-shrink-0 gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 -ml-2 h-8 px-2" onClick={() => navigate('/vendors')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            {(vendor.name || '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-gray-900 leading-tight truncate">{vendor.name}</h1>
              <Badge variant="outline" className="text-[10px] py-0 h-5">#{vendor.id}</Badge>
              <Badge className={`text-[10px] py-0 h-5 border-0 ${vendor.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{vendor.status || 'Active'}</Badge>
              {vendor.category && <Badge className="text-[10px] py-0 h-5 border-0 bg-blue-100 text-blue-700">{vendor.category}</Badge>}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap mt-0.5">
              {vendor.contact_person && <span>{vendor.contact_person}</span>}
              {vendor.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {vendor.phone}</span>}
              {vendor.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {vendor.email}</span>}
              {vendor.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {vendor.address}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!editing && (
            <Button variant="outline" size="sm" disabled={downloading} onClick={async () => {
              setDownloading(true);
              try {
                await generatePartyReportPdf({
                  kind: 'vendor', party: vendor, purchaseOrders, transactions, followups, outstandings: [],
                  totals: { totalBilled: totalAmount, totalPaid, outstanding: liveOutstanding, ordersCount: vendor.total_purchases || purchaseOrders.length, incomeTxnTotal, expenseTxnTotal },
                });
                toast.success('Statement downloaded');
              } catch (e: any) { toast.error(e?.message || 'Failed to generate PDF'); }
              finally { setDownloading(false); }
            }}>
              <Download className="w-4 h-4 mr-2" /> {downloading ? 'Generating…' : 'Download'}
            </Button>
          )}
          {!editing ? (
            <Button variant="outline" size="sm" onClick={() => { setEditForm({ ...vendor }); setEditing(true); }}>
              <Edit className="w-4 h-4 mr-2" /> Edit
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}><X className="w-4 h-4 mr-1" /> Cancel</Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving…' : 'Save'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards (Orders-module style) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-shrink-0">
        <Card className="bg-blue-500/10 backdrop-blur-sm border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            <div className="text-2xl font-bold text-blue-700">{vendor.total_purchases || purchaseOrders.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 backdrop-blur-sm border-emerald-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            <div className="text-2xl font-bold text-emerald-700">{fmt(Number(vendor.total_amount) || totalPurchaseAmount)}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 backdrop-blur-sm border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <IndianRupee className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            <div className="text-2xl font-bold text-green-700">{fmt(totalPaid)}</div>
          </CardContent>
        </Card>
        <Card className={`backdrop-blur-sm ${liveOutstanding > 0 ? 'bg-red-500/10 border-red-200' : 'bg-slate-500/10 border-slate-200'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <CreditCard className={`h-4 w-4 ${liveOutstanding > 0 ? 'text-red-600' : 'text-slate-600'}`} />
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            <div className={`text-2xl font-bold ${liveOutstanding > 0 ? 'text-red-700' : 'text-slate-700'}`}>{fmt(liveOutstanding)}</div>
            {outstandingPOs.length > 0 && <p className="text-xs text-red-600">{outstandingPOs.length} pending POs</p>}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 w-full justify-start bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="details" className="text-xs px-3 py-1.5"><Building2 className="w-3.5 h-3.5 mr-1" /> Details</TabsTrigger>
          <TabsTrigger value="purchases" className="text-xs px-3 py-1.5"><FileText className="w-3.5 h-3.5 mr-1" /> Purchase Orders ({purchaseOrders.length})</TabsTrigger>
          <TabsTrigger value="outstanding" className="text-xs px-3 py-1.5"><CreditCard className="w-3.5 h-3.5 mr-1" /> Outstanding ({outstandingPOs.length})</TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs px-3 py-1.5"><TrendingUp className="w-3.5 h-3.5 mr-1" /> Ledger ({purchaseOrders.filter((p:any)=>String(p?.status||'').toLowerCase()!=='cancelled').length + transactions.length})</TabsTrigger>
          <TabsTrigger value="followups" className="text-xs px-3 py-1.5"><MessageSquare className="w-3.5 h-3.5 mr-1" /> Follow-ups ({followups.length})</TabsTrigger>
        </TabsList>

        {/* ===== DETAILS TAB ===== */}
        <TabsContent value="details" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Vendor Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Vendor Name</Label>
                    {editing ? <Input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /> :
                      <p className="text-sm font-medium text-slate-900">{vendor.name}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Contact Person</Label>
                    {editing ? <Input value={editForm.contact_person || ''} onChange={e => setEditForm({ ...editForm, contact_person: e.target.value })} /> :
                      <p className="text-sm font-medium text-slate-900">{vendor.contact_person || '-'}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Phone</Label>
                    {editing ? <Input value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /> :
                      <p className="text-sm font-medium text-slate-900">{vendor.phone || '-'}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Email</Label>
                    {editing ? <Input value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /> :
                      <p className="text-sm font-medium text-slate-900">{vendor.email || '-'}</p>}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Address</Label>
                  {editing ? <Textarea value={editForm.address || ''} onChange={e => setEditForm({ ...editForm, address: e.target.value })} rows={2} /> :
                    <p className="text-sm font-medium text-slate-900">{vendor.address || '-'}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Category</Label>
                    {editing ? <Input value={editForm.category || ''} onChange={e => setEditForm({ ...editForm, category: e.target.value })} /> :
                      <p className="text-sm font-medium text-slate-900">{vendor.category || '-'}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Status</Label>
                    {editing ? (
                      <Select value={editForm.status || 'Active'} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : <Badge className={vendor.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>{vendor.status}</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Tax & Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">GST Number</Label>
                  {editing ? <Input value={editForm.gst_number || ''} onChange={e => setEditForm({ ...editForm, gst_number: e.target.value })} placeholder="Enter GST Number" maxLength={15} /> :
                    <p className="text-sm font-medium text-slate-900 font-mono">{vendor.gst_number || '-'}</p>}
                </div>
                <hr className="my-2" />
                <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Activity Summary</CardTitle>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Added On</Label>
                    <p className="text-sm font-medium text-slate-900">{vendor.created_at ? new Date(vendor.created_at).toLocaleDateString() : '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Last Purchase</Label>
                    <p className="text-sm font-medium text-slate-900">{vendor.last_purchase_date && !isNaN(new Date(vendor.last_purchase_date).getTime()) ? new Date(vendor.last_purchase_date).toLocaleDateString() : '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Total Purchases</Label>
                    <p className="text-sm font-bold text-slate-900">{vendor.total_purchases || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Total Amount</Label>
                    <p className="text-sm font-bold text-blue-700">{fmt(Number(vendor.total_amount) || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== PURCHASE ORDERS TAB ===== */}
        <TabsContent value="purchases" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {purchaseOrders.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No purchase orders found for this vendor</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Expected Delivery</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.map((po: any, idx: number) => {
                      const rk = `po-${po.id || idx}`;
                      const exp = expandedRows.has(rk);
                      const items = Array.isArray(po.items) ? po.items : [];
                      return [
                        <TableRow key={`${rk}-m`}>
                          <TableCell className="font-mono font-medium text-blue-600">{po.po_number || `PO-${po.id}`}</TableCell>
                          <TableCell>{po.date ? new Date(po.date).toLocaleDateString('en-IN') : '-'}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{items.length > 0 ? items.map((i: any) => i.name || i.item_name).join(', ') : (po.notes || '-')}</TableCell>
                          <TableCell className="text-right font-semibold">{fmt(Number(po.total_amount) || 0)}</TableCell>
                          <TableCell>{po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString('en-IN') : '-'}</TableCell>
                          <TableCell>
                            <Badge className={
                              po.status === 'received' ? 'bg-emerald-100 text-emerald-700' :
                              po.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              po.status === 'ordered' ? 'bg-blue-100 text-blue-700' :
                              'bg-slate-100 text-slate-700'
                            }>{po.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {items.length > 0 && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-600" onClick={() => toggleRow(rk)}>
                                {exp ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>,
                        ...(exp && items.length > 0 ? [
                          <TableRow key={`${rk}-d`} className="bg-slate-50/80">
                            <TableCell colSpan={7}>
                              <div className="rounded-md border bg-white overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-slate-50">
                                    <tr className="border-b">
                                      <th className="text-left px-3 py-2 font-medium text-slate-700">Item</th>
                                      <th className="text-right px-3 py-2 font-medium text-slate-700">Qty</th>
                                      <th className="text-right px-3 py-2 font-medium text-slate-700">Unit Price</th>
                                      <th className="text-right px-3 py-2 font-medium text-slate-700">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map((it: any, i: number) => (
                                      <tr key={i} className="border-b last:border-b-0">
                                        <td className="px-3 py-2">{it.name || it.item_name || '-'}</td>
                                        <td className="px-3 py-2 text-right">{it.quantity || 0}</td>
                                        <td className="px-3 py-2 text-right">{fmt(it.unit_price || it.price)}</td>
                                        <td className="px-3 py-2 text-right font-medium">{fmt(it.total || it.total_price)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </TableCell>
                          </TableRow>
                        ] : []),
                      ];
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== DISPATCHES TAB ===== */}
        <TabsContent value="dispatches" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {dispatches.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No dispatches found for this vendor</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dispatch ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Transport</TableHead>
                      <TableHead>Tracking</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dispatches.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono font-medium text-blue-600">{d.dispatch_number || d.id}</TableCell>
                        <TableCell>{d.dispatch_date || d.date ? new Date(d.dispatch_date || d.date).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>{d.product || d.items || '-'}</TableCell>
                        <TableCell className="text-right">{d.quantity || 0}</TableCell>
                        <TableCell className="text-sm">{d.transport_name || d.transporter || d.transport_mode || '-'}</TableCell>
                        <TableCell className="text-sm font-mono">{d.tracking_number || d.lr_number || '-'}</TableCell>
                        <TableCell>
                          <Badge className={
                            d.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                            d.status === 'In Transit' ? 'bg-blue-100 text-blue-700' :
                            d.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }>{d.status || 'Pending'}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== FINANCE TRANSACTIONS TAB ===== */}
        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <LedgerToolbar
                range={ledgerFilter.range}
                setRange={ledgerFilter.setRange}
                customFrom={ledgerFilter.customFrom}
                setCustomFrom={ledgerFilter.setCustomFrom}
                customTo={ledgerFilter.customTo}
                setCustomTo={ledgerFilter.setCustomTo}
                exportDisabled={ledgerSortedAsc.length === 0}
                onExport={() => {
                  const rows = [...ledgerSortedAsc].reverse().map((e) => ({
                    ...e,
                    balance: ledgerBalanceByKey.get(e.key) ?? 0,
                  }));
                  const safeName = String(vendor?.name || 'vendor').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
                  const periodLabel = getRangeLabel(ledgerFilter.range, ledgerFilter.customFrom, ledgerFilter.customTo);
                  exportLedgerPdf(
                    `ledger_${safeName}_${new Date().toISOString().slice(0,10)}.pdf`,
                    {
                      kind: 'vendor',
                      name: vendor?.name || 'Vendor',
                      code: vendor?.id,
                      contact: vendor?.contact_person,
                      email: vendor?.email,
                      phone: vendor?.phone,
                      address: vendor?.address,
                      gst: vendor?.gst_number,
                    },
                    periodLabel,
                    rows,
                  );
                }}
              />
              {ledgerSortedAsc.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No ledger entries found for the selected range</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow className="bg-slate-100 hover:bg-slate-100 border-b border-slate-200">
                        <TableHead className="text-slate-700 font-semibold uppercase text-xs tracking-wide w-[140px]">Date</TableHead>
                        <TableHead className="text-slate-700 font-semibold uppercase text-xs tracking-wide w-[160px]">Bill Reference</TableHead>
                        <TableHead className="text-slate-700 font-semibold uppercase text-xs tracking-wide">Particulars</TableHead>
                        <TableHead className="text-slate-700 font-semibold uppercase text-xs tracking-wide text-right w-[120px]">Credit</TableHead>
                        <TableHead className="text-slate-700 font-semibold uppercase text-xs tracking-wide text-right w-[120px]">Debit</TableHead>
                        <TableHead className="text-slate-700 font-semibold uppercase text-xs tracking-wide text-right w-[140px]">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...ledgerSortedAsc].reverse().map((e) => {
                        const bal = ledgerBalanceByKey.get(e.key) ?? 0;
                        const clickable = e.kind === 'po' && e.source;
                        return (
                          <TableRow key={e.key} className="odd:bg-white even:bg-slate-50/60 hover:bg-blue-50/60 border-b border-slate-100">
                            <TableCell className="py-2.5 text-slate-700 whitespace-nowrap">{e.date ? new Date(e.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) : '-'}</TableCell>
                            <TableCell className="py-2.5 font-mono text-xs whitespace-nowrap">
                              {clickable ? (
                                <button
                                  type="button"
                                  className="text-blue-700 hover:text-blue-900 hover:underline focus:outline-none"
                                  onClick={() => setViewPo(e.source)}
                                  title="View purchase order"
                                >
                                  {e.ref}
                                </button>
                              ) : (
                                <span className="text-slate-500">{e.ref}</span>
                              )}
                            </TableCell>
                            <TableCell className="py-2.5 text-slate-800 max-w-[320px] truncate" title={e.item}>{e.item}</TableCell>
                            <TableCell className="py-2.5 text-right tabular-nums font-medium text-emerald-700">
                              {e.credit > 0 ? fmt(e.credit) : <span className="text-slate-300">—</span>}
                            </TableCell>
                            <TableCell className="py-2.5 text-right tabular-nums font-medium text-rose-700">
                              {e.debit > 0 ? fmt(e.debit) : <span className="text-slate-300">—</span>}
                            </TableCell>
                            <TableCell className={`py-2.5 text-right tabular-nums font-semibold ${bal < 0 ? 'text-emerald-700' : bal > 0 ? 'text-slate-900' : 'text-slate-500'}`}>
                              {bal < 0 ? `(${fmt(Math.abs(bal))})` : fmt(bal)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== OUTSTANDING TAB ===== */}
        <TabsContent value="outstanding" className="mt-4 space-y-4">
          {outstandingPOs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-red-500/10 border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-red-600">Outstanding Amount</span>
                    <CreditCard className="h-4 w-4 text-red-600" />
                  </div>
                  <p className="text-2xl font-bold text-red-700">{fmt(outstandingAmount)}</p>
                  <p className="text-xs text-red-500 mt-1">{outstandingPOs.length} pending POs</p>
                </CardContent>
              </Card>
              <Card className="bg-orange-500/10 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-orange-600">Pending Orders</span>
                    <Clock className="h-4 w-4 text-orange-600" />
                  </div>
                  <p className="text-2xl font-bold text-orange-700">{outstandingPOs.filter(po => po.status === 'pending' || po.status === 'draft').length}</p>
                  <p className="text-xs text-orange-500 mt-1">awaiting approval</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/10 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-blue-600">In Transit</span>
                    <Package className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-700">{outstandingPOs.filter(po => po.status === 'ordered' || po.status === 'approved').length}</p>
                  <p className="text-xs text-blue-500 mt-1">ordered / in transit</p>
                </CardContent>
              </Card>
            </div>
          )}
          <Card>
            <CardContent className="p-0">
              {outstandingPOs.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No outstanding orders — all clear!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Expected Delivery</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outstandingPOs.map((po: any) => (
                      <TableRow key={`out-${po.id}`}>
                        <TableCell className="font-mono font-medium text-blue-600">{po.po_number || `PO-${po.id}`}</TableCell>
                        <TableCell>{po.date ? new Date(po.date).toLocaleDateString('en-IN') : '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString('en-IN') : '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600">{fmt(Number(po.total_amount) || 0)}</TableCell>
                        <TableCell>
                          <Badge className={
                            po.status === 'ordered' ? 'bg-blue-100 text-blue-700' :
                            po.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-100 text-slate-700'
                          }>{po.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== FOLLOW-UPS TAB ===== */}
        <TabsContent value="followups" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setFollowupOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Follow-up
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {followups.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No follow-ups recorded yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {followups.map((f: any) => (
                      <TableRow key={f.id}>
                        <TableCell>{f.date ? new Date(f.date).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{f.type}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{f.subject}</TableCell>
                        <TableCell className="text-sm text-slate-500 max-w-[200px] truncate">{f.notes || '-'}</TableCell>
                        <TableCell>
                          <Badge className={
                            f.priority === 'High' ? 'bg-red-100 text-red-700' :
                            f.priority === 'Low' ? 'bg-slate-100 text-slate-700' :
                            'bg-amber-100 text-amber-700'
                          }>{f.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            f.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                            f.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }>{f.status}</Badge>
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

      {/* Add Follow-up Dialog */}
      <Dialog open={followupOpen} onOpenChange={setFollowupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={newFollowup.type} onValueChange={v => setNewFollowup({ ...newFollowup, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Call', 'Email', 'Meeting', 'Visit'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={newFollowup.priority} onValueChange={v => setNewFollowup({ ...newFollowup, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['High', 'Medium', 'Low'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Subject *</Label>
              <Input value={newFollowup.subject} onChange={e => setNewFollowup({ ...newFollowup, subject: e.target.value })} placeholder="Follow-up subject" />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={newFollowup.notes} onChange={e => setNewFollowup({ ...newFollowup, notes: e.target.value })} placeholder="Additional notes..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowupOpen(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAddFollowup} disabled={!newFollowup.subject}>
              Add Follow-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Purchase Order Dialog (from Ledger) */}
      <Dialog open={!!viewPo} onOpenChange={(o) => !o && setViewPo(null)}>
        <DialogContent className="!max-w-6xl w-[95vw] max-h-[92vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>Purchase Order {viewPo?.po_number || viewPo?.po_no || `#${viewPo?.id}`}</DialogTitle>
          </DialogHeader>
          {viewPo && (() => {
            const status = String(viewPo.status || 'pending').toLowerCase();
            const totalAmount = Number(viewPo.total_amount) || 0;
            const items = Array.isArray(viewPo.items) ? viewPo.items : [];
            const statusBadgeClass = status === 'received' ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
              : status === 'cancelled' ? 'bg-red-100 text-red-700 border-red-200'
              : status === 'ordered' ? 'bg-blue-100 text-blue-700 border-blue-200'
              : 'bg-amber-100 text-amber-700 border-amber-200';
            const subtotal = items.reduce((s: number, it: any) => s + (Number(it.total || it.total_price) || (Number(it.unit_price || it.price) || 0) * (Number(it.quantity) || 0)), 0);
            return (
              <>
                <div className="p-5 space-y-4 w-full flex-1 overflow-y-auto">
                  <div className="flex justify-between items-start border-b pb-3">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{viewPo.po_number || viewPo.po_no || `PO-${viewPo.id}`}</h2>
                    <p className="text-gray-500 text-sm mt-0.5">Date: {viewPo.date ? new Date(viewPo.date).toLocaleDateString() : '-'}</p>
                  </div>
                  <Badge className={`${statusBadgeClass} flex items-center gap-1 text-xs px-3 py-1 border`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4" /> Vendor
                    </h3>
                    <p className="font-medium">{vendor?.name}</p>
                    <p className="text-gray-600 text-sm mt-0.5">{vendor?.address || '-'}</p>
                    {vendor?.gst_number && <p className="text-gray-500 text-xs mt-1">GSTIN: {vendor.gst_number}</p>}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4" /> Order Info
                    </h3>
                    <div className="space-y-1.5 text-sm">
                      <p className="flex justify-between"><span className="text-gray-600">PO Number:</span> <span>{viewPo.po_number || viewPo.po_no || `PO-${viewPo.id}`}</span></p>
                      <p className="flex justify-between"><span className="text-gray-600">Expected Delivery:</span> <span>{viewPo.expected_delivery ? new Date(viewPo.expected_delivery).toLocaleDateString() : '-'}</span></p>
                      <p className="flex justify-between font-semibold"><span>Total Amount:</span> <span className="text-blue-600">{fmt(totalAmount)}</span></p>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2 text-sm">
                      <Receipt className="w-4 h-4" /> Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Items:</span>
                        <Badge variant="outline">{items.length}</Badge>
                      </div>
                      {viewPo.created_by && <p className="text-gray-500 text-xs">Created by: {viewPo.created_by}</p>}
                    </div>
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <Table className="text-sm">
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold py-2">Item</TableHead>
                          <TableHead className="font-semibold py-2">Qty</TableHead>
                          <TableHead className="font-semibold py-2">Unit Price (₹)</TableHead>
                          <TableHead className="text-right font-semibold py-2">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((it: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium py-2">{it.name || it.item_name || '-'}</TableCell>
                            <TableCell className="py-2">{it.quantity ?? 0}</TableCell>
                            <TableCell className="py-2">{fmt(Number(it.unit_price || it.price) || 0)}</TableCell>
                            <TableCell className="text-right font-semibold py-2">{fmt(Number(it.total || it.total_price) || 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                  {viewPo.notes ? (
                    <div className="bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-200 text-sm flex-1">
                      <span className="font-semibold text-gray-700 mr-2">Notes:</span>
                      <span className="text-gray-600">{viewPo.notes}</span>
                    </div>
                  ) : <div className="flex-1" />}
                  <div className="w-full md:w-72 bg-gray-50 p-4 rounded-lg border">
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span>{fmt(subtotal)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2 mt-1">
                        <span>Grand Total:</span>
                        <span className="text-blue-600">{fmt(totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                </div>

                <DialogFooter className="px-5 py-3 border-t bg-white shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setViewPo(null)}>Close</Button>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { setViewPo(null); navigate('/purchase-orders'); }}>
                    Open in Purchase Orders
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
