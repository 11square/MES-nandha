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
import {
  ArrowLeft, Phone, Mail, MapPin, Building2,
  ShoppingCart, IndianRupee, Calendar, FileText,
  Edit, Save, X, Package, Clock, CreditCard,
  ChevronDown, ChevronRight, Plus, MessageSquare,
  Truck, ArrowDownRight, ArrowUpRight, TrendingUp,
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
  const totalPaid = transactions.reduce((s, tx) => s + (Number(tx.amount) || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="text-slate-600 hover:text-slate-900 -ml-2" onClick={() => navigate('/vendors')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Vendors
        </Button>
        {!editing ? (
          <Button variant="outline" onClick={() => { setEditForm({ ...vendor }); setEditing(true); }}>
            <Edit className="w-4 h-4 mr-2" /> Edit Details
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}><X className="w-4 h-4 mr-2" /> Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      {/* Vendor Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-2xl font-bold text-white">
              {(vendor.name || '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{vendor.name}</h1>
              <p className="text-blue-100">#{vendor.id} • {vendor.contact_person}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-blue-100 flex-wrap">
                {vendor.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {vendor.phone}</span>}
                {vendor.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {vendor.email}</span>}
                {vendor.address && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {vendor.address}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className="bg-white/20 text-white border-0">{vendor.status || 'Active'}</Badge>
            {vendor.category && <Badge className="bg-blue-400/30 text-white border-0">{vendor.category}</Badge>}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-blue-500/10 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-blue-600">Total Purchases</span>
              <ShoppingCart className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-700">{vendor.total_purchases || purchaseOrders.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-emerald-600">Total Amount</span>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700">{fmt(Number(vendor.total_amount) || totalPurchaseAmount)}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-green-600">Total Paid</span>
              <IndianRupee className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-700">{fmt(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className={`${(Number(vendor.outstanding_amount) || outstandingAmount) > 0 ? 'bg-red-500/10 border-red-200' : 'bg-slate-500/10 border-slate-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-medium ${(Number(vendor.outstanding_amount) || outstandingAmount) > 0 ? 'text-red-600' : 'text-slate-600'}`}>Outstanding</span>
              <CreditCard className={`h-4 w-4 ${(Number(vendor.outstanding_amount) || outstandingAmount) > 0 ? 'text-red-600' : 'text-slate-600'}`} />
            </div>
            <p className={`text-2xl font-bold ${(Number(vendor.outstanding_amount) || outstandingAmount) > 0 ? 'text-red-700' : 'text-slate-700'}`}>{fmt(Number(vendor.outstanding_amount) || outstandingAmount)}</p>
            {outstandingPOs.length > 0 && <p className="text-xs text-red-500 mt-1">{outstandingPOs.length} pending POs</p>}
          </CardContent>
        </Card>
        <Card className="bg-purple-500/10 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-purple-600">Last Purchase</span>
              <Calendar className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-xl font-bold text-purple-700">
              {vendor.last_purchase_date && !isNaN(new Date(vendor.last_purchase_date).getTime())
                ? new Date(vendor.last_purchase_date).toLocaleDateString('en-IN')
                : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 w-full justify-start bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="details" className="text-xs px-3 py-1.5"><Building2 className="w-3.5 h-3.5 mr-1" /> Details</TabsTrigger>
          <TabsTrigger value="purchases" className="text-xs px-3 py-1.5"><FileText className="w-3.5 h-3.5 mr-1" /> Purchase Orders ({purchaseOrders.length})</TabsTrigger>
          <TabsTrigger value="outstanding" className="text-xs px-3 py-1.5"><CreditCard className="w-3.5 h-3.5 mr-1" /> Outstanding ({outstandingPOs.length})</TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs px-3 py-1.5"><TrendingUp className="w-3.5 h-3.5 mr-1" /> Finance ({transactions.length})</TabsTrigger>
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
              {transactions.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No finance transactions found for this vendor</p>
                </div>
              ) : (
                (() => {
                  // Running balance = remaining outstanding (what we owe vendor) AFTER each tx.
                  // Expense (payment to vendor) REDUCES the balance, income (refund from vendor) INCREASES it.
                  // Anchored so the newest tx's balance equals the top "Outstanding" card.
                  const topBalance = Number(vendor.outstanding_amount) || outstandingAmount;
                  const sortedAsc = [...transactions].sort((a, b) => {
                    const da = a.date ? new Date(a.date).getTime() : 0;
                    const db = b.date ? new Date(b.date).getTime() : 0;
                    if (da !== db) return da - db;
                    return (Number(a.id) || 0) - (Number(b.id) || 0);
                  });
                  const sumIncome = sortedAsc.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
                  const sumExpense = sortedAsc.filter(t => t.type !== 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
                  const balanceById = new Map<any, number>();
                  let running = topBalance + sumExpense - sumIncome; // opening balance (before any tx)
                  for (const t of sortedAsc) {
                    const amt = Number(t.amount) || 0;
                    running += t.type === 'income' ? amt : -amt;
                    balanceById.set(t.id, running);
                  }
                  return (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((txn: any) => {
                          const bal = balanceById.get(txn.id) ?? 0;
                          return (
                            <TableRow key={txn.id}>
                              <TableCell>{txn.date ? new Date(txn.date).toLocaleDateString() : '-'}</TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center gap-1 font-medium ${txn.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {txn.type === 'income' ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                                  {txn.type === 'income' ? 'Income' : 'Expense'}
                                </span>
                              </TableCell>
                              <TableCell><Badge variant="outline">{txn.category || '-'}</Badge></TableCell>
                              <TableCell className="text-sm text-slate-500 max-w-[250px] truncate">{txn.description || '-'}</TableCell>
                              <TableCell className={`text-right font-semibold ${txn.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                                {txn.type === 'income' ? '+' : '-'}{fmt(txn.amount)}
                              </TableCell>
                              <TableCell className="text-sm">{txn.payment_method || '-'}</TableCell>
                              <TableCell>
                                <Badge className={
                                  txn.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                  txn.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                  'bg-amber-100 text-amber-700'
                                }>{txn.status || 'pending'}</Badge>
                              </TableCell>
                              <TableCell className={`text-right font-semibold tabular-nums ${bal > 0 ? 'text-amber-700' : bal < 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                                {bal < 0 ? `(${fmt(Math.abs(bal))})` : fmt(bal)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  );
                })()
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
    </div>
  );
}
