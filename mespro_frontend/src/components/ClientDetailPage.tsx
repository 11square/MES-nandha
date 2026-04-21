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
import { clientsService } from '../services/clients.service';
import { getCustomerType } from '../lib/utils';
import { getAllStates, getDistrictsForState } from '../lib/gstUtils';
import {
  ArrowLeft, Phone, Mail, MapPin, Building2,
  ShoppingCart, TrendingUp, IndianRupee, AlertCircle,
  Calendar, FileText, ChevronDown, ChevronRight,
  Edit, Star, Save, X, Plus,
  CreditCard, Clock, MessageSquare, Package,
  Truck, ArrowDownRight, ArrowUpRight,
} from 'lucide-react';

const fmt = (val: number) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();

  const [client, setClient] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [outstandings, setOutstandings] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
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
    if (!clientId) return;
    setLoading(true);
    Promise.all([
      clientsService.getClientById(clientId).catch(() => null),
      clientsService.getClientBills(clientId).catch(() => []),
      clientsService.getClientPayments(clientId).catch(() => []),
      clientsService.getClientSales(clientId).catch(() => []),
      clientsService.getClientOutstandings(clientId).catch(() => []),
      clientsService.getClientFollowups(clientId).catch(() => []),
      clientsService.getClientDispatches(clientId).catch(() => []),
      clientsService.getClientTransactions(clientId).catch(() => []),
    ]).then(([cd, bd, pd, sd, od, fd, dd, td]) => {
      setClient(cd);
      if (cd) setEditForm({ ...cd });
      setBills(Array.isArray(bd) ? bd : (bd as any)?.items || []);
      setPayments(Array.isArray(pd) ? pd : (pd as any)?.items || []);
      setOrders(Array.isArray(sd) ? sd : (sd as any)?.items || []);
      setOutstandings(Array.isArray(od) ? od : (od as any)?.items || []);
      setFollowups(Array.isArray(fd) ? fd : (fd as any)?.items || []);
      setDispatches(Array.isArray(dd) ? dd : (dd as any)?.items || []);
      setTransactions(Array.isArray(td) ? td : (td as any)?.items || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [clientId]);

  const toggleRow = (key: string) => {
    setExpandedRows(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  const handleSave = async () => {
    if (!clientId) return;
    setSaving(true);
    try {
      await clientsService.updateClient(clientId, editForm);
      toast.success('Client details updated');
      setEditing(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update');
    } finally { setSaving(false); }
  };

  const handleAddFollowup = async () => {
    if (!clientId || !newFollowup.subject) return;
    try {
      await clientsService.createClientFollowup(clientId, { ...newFollowup, date: new Date().toISOString().split('T')[0] });
      toast.success('Follow-up added');
      setFollowupOpen(false);
      setNewFollowup({ type: 'Call', subject: '', notes: '', priority: 'Medium', status: 'Pending' });
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add follow-up');
    }
  };

  const districts = editForm.state ? getDistrictsForState(editForm.state) : [];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 text-center">
        <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 mb-2">Client not found</h3>
        <Button variant="outline" onClick={() => navigate('/clients')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Clients
        </Button>
      </div>
    );
  }

  // Stats
  const totalBilled = bills.reduce((s, b) => s + (Number(b.grand_total) || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || Number(p.paid_amount) || 0), 0);
  const totalOutstanding = outstandings.reduce((s, o) => s + (Number(o.balance) || 0), 0);
  const overdueCount = outstandings.filter(o => (o.days_overdue || 0) > 0).length;

  return (
    <div className="p-6 space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="text-slate-600 hover:text-slate-900 -ml-2" onClick={() => navigate('/clients')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Clients
        </Button>
        {!editing ? (
          <Button variant="outline" onClick={() => { setEditForm({ ...client }); setEditing(true); }}>
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

      {/* Client Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-2xl font-bold text-white">
              {(client.name || '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{client.name}</h1>
              <p className="text-blue-100">#{client.id} • {client.contact_person}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-blue-100 flex-wrap">
                {client.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {client.phone}</span>}
                {client.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {client.email}</span>}
                {client.address && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {client.address}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className="bg-white/20 text-white border-0">{client.status || 'Active'}</Badge>
            <Badge className={`border-0 ${client.gst_number ? 'bg-blue-400/30 text-white' : 'bg-orange-400/30 text-white'}`}>
              {getCustomerType(client.gst_number)}
            </Badge>
            <div className="flex ml-2">
              {[1, 2, 3].map(s => (
                <Star key={s} className={`w-4 h-4 ${s <= (client.rating || 0) ? 'text-yellow-300 fill-yellow-300' : 'text-white/30'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-blue-500/10 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-blue-600">Total Orders</span>
              <ShoppingCart className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-700">{client.total_orders || orders.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-emerald-600">Total Billed</span>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700">{fmt(totalBilled)}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-green-600">Received</span>
              <IndianRupee className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-700">{fmt(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className={`${totalOutstanding > 0 ? 'bg-red-500/10 border-red-200' : 'bg-slate-500/10 border-slate-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-medium ${totalOutstanding > 0 ? 'text-red-600' : 'text-slate-600'}`}>Outstanding</span>
              <CreditCard className={`h-4 w-4 ${totalOutstanding > 0 ? 'text-red-600' : 'text-slate-600'}`} />
            </div>
            <p className={`text-2xl font-bold ${totalOutstanding > 0 ? 'text-red-700' : 'text-slate-700'}`}>{fmt(totalOutstanding)}</p>
            {overdueCount > 0 && <p className="text-xs text-red-500 mt-1">{overdueCount} overdue</p>}
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-amber-600">Balance</span>
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </div>
            <p className={`text-2xl font-bold ${(totalBilled - totalPaid) > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {fmt(totalBilled - totalPaid)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 w-full justify-start bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="details" className="text-xs px-3 py-1.5"><Building2 className="w-3.5 h-3.5 mr-1" /> Details</TabsTrigger>
          <TabsTrigger value="bills" className="text-xs px-3 py-1.5"><FileText className="w-3.5 h-3.5 mr-1" /> Bills ({bills.length})</TabsTrigger>
          <TabsTrigger value="orders" className="text-xs px-3 py-1.5"><Package className="w-3.5 h-3.5 mr-1" /> Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs px-3 py-1.5"><TrendingUp className="w-3.5 h-3.5 mr-1" /> Finance ({transactions.length})</TabsTrigger>
          <TabsTrigger value="followups" className="text-xs px-3 py-1.5"><MessageSquare className="w-3.5 h-3.5 mr-1" /> Follow-ups ({followups.length})</TabsTrigger>
        </TabsList>

        {/* ===== DETAILS TAB ===== */}
        <TabsContent value="details" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Business Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Business Name</Label>
                    {editing ? <Input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /> :
                      <p className="text-sm font-medium text-slate-900">{client.name}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Contact Person</Label>
                    {editing ? <Input value={editForm.contact_person || ''} onChange={e => setEditForm({ ...editForm, contact_person: e.target.value })} /> :
                      <p className="text-sm font-medium text-slate-900">{client.contact_person || '-'}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Phone</Label>
                    {editing ? <Input value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /> :
                      <p className="text-sm font-medium text-slate-900">{client.phone || '-'}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Email</Label>
                    {editing ? <Input value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /> :
                      <p className="text-sm font-medium text-slate-900">{client.email || '-'}</p>}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Address</Label>
                  {editing ? <Textarea value={editForm.address || ''} onChange={e => setEditForm({ ...editForm, address: e.target.value })} rows={2} /> :
                    <p className="text-sm font-medium text-slate-900">{client.address || '-'}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                    ) : <Badge className={client.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>{client.status}</Badge>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Rating</Label>
                    {editing ? (
                      <div className="flex items-center gap-1 pt-1">
                        {[1, 2, 3].map(s => (
                          <button key={s} onClick={() => setEditForm({ ...editForm, rating: s })} className="focus:outline-none">
                            <Star className={`w-5 h-5 cursor-pointer ${s <= (editForm.rating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300'}`} />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3].map(s => <Star key={s} className={`w-4 h-4 ${s <= (client.rating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300'}`} />)}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tax & Location */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Tax & Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">GST Number</Label>
                  {editing ? <Input value={editForm.gst_number || ''} onChange={e => setEditForm({ ...editForm, gst_number: e.target.value })} placeholder="Enter GST Number" maxLength={15} /> :
                    <p className="text-sm font-medium text-slate-900 font-mono">{client.gst_number || '-'}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">State</Label>
                    {editing ? (
                      <Select value={editForm.state || ''} onValueChange={v => setEditForm({ ...editForm, state: v, district: '' })}>
                        <SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger>
                        <SelectContent className="max-h-60">
                          {getAllStates().map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : <p className="text-sm font-medium text-slate-900">{client.state || '-'}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">District</Label>
                    {editing ? (
                      districts.length > 0 ? (
                        <Select value={editForm.district || ''} onValueChange={v => setEditForm({ ...editForm, district: v })}>
                          <SelectTrigger><SelectValue placeholder="Select District" /></SelectTrigger>
                          <SelectContent className="max-h-60">
                            {districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : <Input value={editForm.district || ''} onChange={e => setEditForm({ ...editForm, district: e.target.value })} placeholder="Enter District" />
                    ) : <p className="text-sm font-medium text-slate-900">{client.district || '-'}</p>}
                  </div>
                </div>

                <hr className="my-2" />
                <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Activity Summary</CardTitle>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Member Since</Label>
                    <p className="text-sm font-medium text-slate-900">{client.join_date ? new Date(client.join_date).toLocaleDateString() : client.created_at ? new Date(client.created_at).toLocaleDateString() : '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Last Order</Label>
                    <p className="text-sm font-medium text-slate-900">{client.last_order && !isNaN(new Date(client.last_order).getTime()) ? new Date(client.last_order).toLocaleDateString() : '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Total Orders</Label>
                    <p className="text-sm font-bold text-slate-900">{client.total_orders || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Total Value</Label>
                    <p className="text-sm font-bold text-blue-700">{fmt(client.total_value)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== BILLS TAB ===== */}
        <TabsContent value="bills" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {bills.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No bills found for this client</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right">GST</TableHead>
                      <TableHead className="text-right">Grand Total</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.map((bill, idx) => {
                      const rk = `bill-${bill.id || idx}`;
                      const exp = expandedRows.has(rk);
                      const items = Array.isArray(bill.items) ? bill.items : [];
                      return [
                        <TableRow key={`${rk}-m`}>
                          <TableCell className="font-mono font-medium text-blue-600">{bill.bill_no}</TableCell>
                          <TableCell>{bill.date ? new Date(bill.date).toLocaleDateString() : '-'}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{items.length > 0 ? items.map((i: any) => i.name).join(', ') : '-'}</TableCell>
                          <TableCell className="text-right">{fmt(bill.subtotal)}</TableCell>
                          <TableCell className="text-right">{fmt(bill.total_tax)}</TableCell>
                          <TableCell className="text-right font-semibold">{fmt(bill.grand_total)}</TableCell>
                          <TableCell>
                            <Badge className={bill.payment_type === 'credit' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}>
                              {bill.payment_type === 'credit' ? 'Credit' : 'Cash'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              bill.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                              bill.payment_status === 'partial' ? 'bg-amber-100 text-amber-700' :
                              bill.payment_status === 'overdue' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-700'
                            }>{bill.payment_status}</Badge>
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
                            <TableCell colSpan={9}>
                              <div className="rounded-md border bg-white overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-slate-50">
                                    <tr className="border-b">
                                      <th className="text-left px-3 py-2 font-medium text-slate-700">Item</th>
                                      <th className="text-right px-3 py-2 font-medium text-slate-700">Qty</th>
                                      <th className="text-right px-3 py-2 font-medium text-slate-700">Unit Price</th>
                                      <th className="text-right px-3 py-2 font-medium text-slate-700">Disc %</th>
                                      <th className="text-right px-3 py-2 font-medium text-slate-700">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map((it: any, i: number) => (
                                      <tr key={i} className="border-b last:border-b-0">
                                        <td className="px-3 py-2">{it.name || '-'}</td>
                                        <td className="px-3 py-2 text-right">{it.quantity || 0}</td>
                                        <td className="px-3 py-2 text-right">{fmt(it.unit_price)}</td>
                                        <td className="px-3 py-2 text-right">{it.discount || 0}%</td>
                                        <td className="px-3 py-2 text-right font-medium">{fmt(it.total)}</td>
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

        {/* ===== ORDERS TAB ===== */}
        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {orders.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No orders found for this client</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order No</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o: any) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono font-medium text-blue-600">{o.order_number}</TableCell>
                        <TableCell>{o.product || '-'}</TableCell>
                        <TableCell className="text-right">{o.quantity || 0}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(o.total_amount)}</TableCell>
                        <TableCell>
                          <Badge className={
                            o.status === 'Delivered' || o.status === 'Bill' ? 'bg-emerald-100 text-emerald-700' :
                            o.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                            o.status === 'In Production' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-700'
                          }>{o.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            o.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                            o.payment_status === 'Partial' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }>{o.payment_status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">{o.created_at ? new Date(o.created_at).toLocaleDateString() : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== PAYMENTS TAB ===== */}
        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {payments.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <IndianRupee className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No payments found for this client</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Received By</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono font-medium text-blue-600">{p.bill_no || p.bill?.bill_no || '-'}</TableCell>
                        <TableCell>{p.date ? new Date(p.date).toLocaleDateString() : '-'}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600">{fmt(p.amount || p.paid_amount)}</TableCell>
                        <TableCell><Badge variant="outline">{p.method || p.payment_method || '-'}</Badge></TableCell>
                        <TableCell className="text-sm text-slate-500 max-w-[200px] truncate">{p.reference || '-'}</TableCell>
                        <TableCell className="text-sm">{p.received_by || '-'}</TableCell>
                        <TableCell>
                          <Badge className={p.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                            {p.status || 'pending'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
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
                  <p>No dispatches found for this client</p>
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
                        <TableCell className="text-sm">{d.transport_name || d.transport_mode || '-'}</TableCell>
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
                  <p>No finance transactions found for this client</p>
                </div>
              ) : (
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((txn: any) => (
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
