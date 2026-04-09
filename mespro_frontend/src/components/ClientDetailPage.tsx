import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useI18n } from '../contexts/I18nContext';
import { clientsService } from '../services/clients.service';
import { getCustomerType } from '../lib/utils';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Building2,
  ShoppingCart,
  TrendingUp,
  IndianRupee,
  AlertCircle,
  Calendar,
  FileText,
  ChevronDown,
  ChevronRight,
  Edit,
  Star,
} from 'lucide-react';

function formatCurrency(val: number) {
  return `₹${Number(val || 0).toLocaleString('en-IN')}`;
}

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();

  const [client, setClient] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    Promise.all([
      clientsService.getClientById(clientId).catch(() => null),
      clientsService.getClientBills(clientId).catch(() => []),
      clientsService.getClientPayments(clientId).catch(() => []),
      clientsService.getClientSales(clientId).catch(() => []),
    ]).then(([clientData, billsData, paymentsData, salesData]) => {
      setClient(clientData);
      const b = Array.isArray(billsData) ? billsData : (billsData as any)?.items || [];
      setBills(b);
      const p = Array.isArray(paymentsData) ? paymentsData : (paymentsData as any)?.items || [];
      setPayments(p);
      const s = Array.isArray(salesData) ? salesData : (salesData as any)?.items || [];
      setSales(s);
    }).finally(() => setLoading(false));
  }, [clientId]);

  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

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

  const totalBills = bills.reduce((sum, b) => sum + (Number(b.grand_total) || 0), 0);
  const totalSales = totalBills > 0 ? totalBills : sales.reduce((sum, s) => sum + (Number(s.grand_total) || Number(s.total_amount) || 0), 0);
  const totalPayments = payments.reduce((sum, p) => sum + (Number(p.amount) || Number(p.paid_amount) || 0), 0);
  const balance = totalSales - totalPayments;

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" className="text-slate-600 hover:text-slate-900 -ml-2" onClick={() => navigate('/clients')}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Clients
      </Button>

      {/* Client Header Card */}
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
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {client.phone}</span>
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {client.email}</span>
                {client.address && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {client.address}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white border-0">{client.status || 'Active'}</Badge>
            <Badge className={`border-0 ${client.gst_number ? 'bg-blue-400/30 text-white' : 'bg-orange-400/30 text-white'}`}>
              {getCustomerType(client.gst_number)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">GST Number</p>
            <p className="text-sm font-medium text-slate-900">{client.gst_number || '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">{t('state') || 'State'}</p>
            <p className="text-sm font-medium text-slate-900">{client.state || '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">{t('district') || 'District'}</p>
            <p className="text-sm font-medium text-slate-900">{client.district || '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">{t('rating') || 'Rating'}</p>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3].map(s => (
                <Star key={s} className={`w-4 h-4 ${s <= (client.rating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300'}`} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-500/10 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalBills') || 'Total Bills'}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{bills.length || sales.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/10 border-emerald-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalSales') || 'Total Sales'}</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{formatCurrency(totalSales)}</div>
          </CardContent>
        </Card>

        <Card className="bg-green-500/10 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('received') || 'Received'}</CardTitle>
            <IndianRupee className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(totalPayments)}</div>
          </CardContent>
        </Card>

        <Card className={`${balance > 0 ? 'bg-amber-500/10 border-amber-200' : 'bg-emerald-500/10 border-emerald-200'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('balance') || 'Balance'}</CardTitle>
            <AlertCircle className={`h-4 w-4 ${balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {formatCurrency(balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Bills & Payments */}
      <Tabs defaultValue="bills" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="bills">
            <FileText className="w-4 h-4 mr-2" /> Bill History ({bills.length})
          </TabsTrigger>
          <TabsTrigger value="payments">
            <IndianRupee className="w-4 h-4 mr-2" /> Payments ({payments.length})
          </TabsTrigger>
        </TabsList>

        {/* Bills Tab */}
        <TabsContent value="bills" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {bills.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p>{t('noBillsFound') || 'No bills found'}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('billNo') || 'Bill No'}</TableHead>
                      <TableHead>{t('date') || 'Date'}</TableHead>
                      <TableHead>{t('items') || 'Items'}</TableHead>
                      <TableHead className="text-right">{t('subtotal') || 'Subtotal'}</TableHead>
                      <TableHead className="text-right">GST</TableHead>
                      <TableHead className="text-right">{t('grandTotal') || 'Grand Total'}</TableHead>
                      <TableHead>{t('paymentType') || 'Payment Type'}</TableHead>
                      <TableHead>{t('paymentStatus') || 'Status'}</TableHead>
                      <TableHead className="text-right">{t('details') || 'Details'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.map((bill: any, index: number) => {
                      const rowKey = `bill-${bill.id || index}`;
                      const isExpanded = expandedRows.has(rowKey);
                      const billItems = Array.isArray(bill.items) ? bill.items : [];

                      return [
                        <TableRow key={`${rowKey}-main`}>
                          <TableCell className="font-mono font-medium text-blue-600">{bill.bill_no}</TableCell>
                          <TableCell>{bill.date ? new Date(bill.date).toLocaleDateString() : '-'}</TableCell>
                          <TableCell>{billItems.length > 0 ? billItems.map((i: any) => i.name).join(', ') : '-'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(bill.subtotal) || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(bill.total_tax) || 0)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(Number(bill.grand_total) || 0)}</TableCell>
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
                            }>
                              {bill.payment_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {billItems.length > 0 && (
                              <Button size="sm" variant="ghost" className="h-8 px-2 text-blue-600" onClick={() => toggleRow(rowKey)}>
                                {isExpanded ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                                {isExpanded ? 'Hide' : 'View'}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>,
                        ...(isExpanded && billItems.length > 0 ? [
                          <TableRow key={`${rowKey}-details`} className="bg-slate-50/80">
                            <TableCell colSpan={9}>
                              <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200">
                                      <th className="text-left px-3 py-2 font-medium text-slate-700">Item</th>
                                      <th className="text-right px-3 py-2 font-medium text-slate-700">Qty</th>
                                      <th className="text-right px-3 py-2 font-medium text-slate-700">Unit Price</th>
                                      <th className="text-right px-3 py-2 font-medium text-slate-700">Discount</th>
                                      <th className="text-right px-3 py-2 font-medium text-slate-700">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {billItems.map((item: any, idx: number) => (
                                      <tr key={`${rowKey}-item-${idx}`} className="border-b border-slate-100 last:border-b-0">
                                        <td className="px-3 py-2 text-slate-800">{item.name || '-'}</td>
                                        <td className="px-3 py-2 text-right text-slate-700">{Number(item.quantity) || 0}</td>
                                        <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(Number(item.unit_price) || 0)}</td>
                                        <td className="px-3 py-2 text-right text-slate-700">{Number(item.discount) || 0}%</td>
                                        <td className="px-3 py-2 text-right text-slate-900 font-medium">{formatCurrency(Number(item.total) || 0)}</td>
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

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {payments.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <IndianRupee className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p>{t('noPaymentsFound') || 'No payments found'}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>{t('date') || 'Date'}</TableHead>
                      <TableHead>{t('billNo') || 'Bill No'}</TableHead>
                      <TableHead>{t('paymentType') || 'Payment Type'}</TableHead>
                      <TableHead className="text-right">{t('amount') || 'Amount'}</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>{t('status') || 'Status'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment: any) => {
                      const payType = payment.bill?.payment_type || payment.payment_type || '';
                      return (
                        <TableRow key={payment.id || payment.paymentId}>
                          <TableCell className="font-medium text-blue-600">{payment.id || payment.paymentId}</TableCell>
                          <TableCell>{payment.date || payment.created_at || payment.createdAt ? new Date(payment.date || payment.created_at || payment.createdAt).toLocaleDateString() : '-'}</TableCell>
                          <TableCell className="font-mono text-sm">{payment.bill_no || payment.bill?.bill_no || payment.billNo || '-'}</TableCell>
                          <TableCell>
                            <Badge className={payType === 'credit' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}>
                              {payType === 'credit' ? 'Credit' : 'Cash'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-emerald-600">{formatCurrency(Number(payment.amount) || Number(payment.paid_amount) || 0)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{payment.method || payment.payment_method || '-'}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">{payment.reference || payment.transaction_id || '-'}</TableCell>
                          <TableCell>
                            <Badge className="bg-emerald-100 text-emerald-700">{payment.status || 'Received'}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
