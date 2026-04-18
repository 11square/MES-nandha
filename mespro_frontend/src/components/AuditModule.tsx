import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { useI18n } from '../contexts/I18nContext';
import { billingService } from '../services/billing.service';
import { purchaseOrdersService } from '../services/purchaseOrders.service';
import { stockService } from '../services/stock.service';
import { 
  Search, 
  FileText,
  TrendingUp,
  TrendingDown,
  Calculator,
  Package,
  AlertTriangle,
  CheckCircle2,
  Download,
  Calendar,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface AuditModuleProps {}

export default function AuditModule({}: AuditModuleProps) {
  const { t, language } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('this-month');
  
  // Month slider state
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });

  const monthNames = language === 'ta' 
    ? ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Current date limits
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const minYear = 2024;
  const minMonth = 0; // January 2024

  const handlePrevMonth = () => {
    setSelectedMonth(prev => {
      // Don't go before January 2024
      if (prev.year === minYear && prev.month === minMonth) {
        return prev;
      }
      if (prev.month === 0) {
        return { month: 11, year: prev.year - 1 };
      }
      return { month: prev.month - 1, year: prev.year };
    });
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => {
      // Don't go beyond current month/year
      if (prev.year === currentYear && prev.month === currentMonth) {
        return prev;
      }
      if (prev.month === 11) {
        return { month: 0, year: prev.year + 1 };
      }
      return { month: prev.month + 1, year: prev.year };
    });
  };

  // Check if at boundary for button styling
  const isAtMinMonth = selectedMonth.year === minYear && selectedMonth.month === minMonth;
  const isAtMaxMonth = selectedMonth.year === currentYear && selectedMonth.month === currentMonth;

  // Purchase Order Data (Input Tax - GST we paid on purchases)
  const [allPurchaseOrders, setAllPurchaseOrders] = useState<any[]>([]);

  // Sales/Billing Data (Output Tax - GST we collected on sales)
  const [allSalesBills, setAllSalesBills] = useState<any[]>([]);

  // All Stock Reconciliation Data (with month/year for filtering)
  const [allStockReconciliation, setAllStockReconciliation] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  const fetchAuditData = async () => {
    setIsLoading(true);
    try {
      // Fetch all three data sources in parallel
      const [posResult, billsResult, stockResult] = await Promise.allSettled([
        purchaseOrdersService.getAllPurchaseOrders(),
        billingService.getAllBills(),
        stockService.getAllStockItems(),
      ]);

      // --- Process Purchase Orders ---
      const rawPOs = posResult.status === 'fulfilled'
        ? (Array.isArray(posResult.value) ? posResult.value : (posResult.value as any)?.items || (posResult.value as any)?.data || [])
        : [];
      const mappedPOs = rawPOs.map((po: any) => {
        const totalAmount = parseFloat(po.total_amount) || 0;
        const isGst = po.is_gst !== false;
        const gstRate = isGst ? 0.18 : 0;
        const amount = isGst ? Math.round(totalAmount / (1 + gstRate)) : totalAmount;
        const gst = isGst ? totalAmount - amount : 0;
        const gstType = isGst ? (po.vendor_gst ? 'CGST+SGST' : 'IGST') : 'N/A';
        const status = po.status ? po.status.charAt(0).toUpperCase() + po.status.slice(1) : 'Pending';
        return {
          id: po.po_number || `PO-${po.id}`,
          vendor: po.vendor_name || 'Unknown Vendor',
          date: po.date,
          amount,
          gst,
          total_amount: totalAmount,
          status,
          gst_type: gstType,
        };
      });
      setAllPurchaseOrders(mappedPOs);

      // --- Process Bills ---
      const rawBills = billsResult.status === 'fulfilled'
        ? (Array.isArray(billsResult.value) ? billsResult.value : (billsResult.value as any)?.items || (billsResult.value as any)?.data || [])
        : [];
      const mappedBills = rawBills.map((bill: any) => {
        const subtotal = parseFloat(bill.subtotal) || 0;
        const totalTax = parseFloat(bill.total_tax) || 0;
        const grandTotal = parseFloat(bill.grand_total) || (subtotal + totalTax);
        const gstType = totalTax > 0 ? (bill.client_gst ? 'CGST+SGST' : 'IGST') : 'N/A';
        const statusMap: Record<string, string> = { paid: 'Paid', partial: 'Partial', pending: 'Pending', overdue: 'Overdue' };
        const status = statusMap[bill.payment_status] || (bill.payment_status ? bill.payment_status.charAt(0).toUpperCase() + bill.payment_status.slice(1) : 'Pending');
        return {
          id: bill.bill_no || `INV-${bill.id}`,
          customer: bill.client_name || 'Unknown Client',
          date: bill.date,
          amount: subtotal,
          gst: totalTax,
          total_amount: grandTotal,
          status,
          gst_type: gstType,
        };
      });
      setAllSalesBills(mappedBills);

      // --- Aggregate sold quantities & values from bill items ---
      const soldByItem: Record<string, { qty: number; value: number }> = {};
      rawBills.forEach((bill: any) => {
        const billItems = Array.isArray(bill.items) ? bill.items : [];
        billItems.forEach((bi: any) => {
          const name = (bi.name || '').trim().toLowerCase();
          if (!name) return;
          const qty = parseFloat(bi.quantity) || 0;
          const val = parseFloat(bi.total) || 0;
          if (!soldByItem[name]) soldByItem[name] = { qty: 0, value: 0 };
          soldByItem[name].qty += qty;
          soldByItem[name].value += val;
        });
      });

      // --- Aggregate purchased quantities & values from PO items ---
      const purchasedByItem: Record<string, { qty: number; value: number }> = {};
      rawPOs.forEach((po: any) => {
        const poItems = Array.isArray(po.items) ? po.items : [];
        poItems.forEach((pi: any) => {
          const name = (pi.name || '').trim().toLowerCase();
          if (!name) return;
          const qty = parseFloat(pi.quantity) || 0;
          const val = parseFloat(pi.amount) || 0;
          if (!purchasedByItem[name]) purchasedByItem[name] = { qty: 0, value: 0 };
          purchasedByItem[name].qty += qty;
          purchasedByItem[name].value += val;
        });
      });

      // --- Process Stock Items with aggregated data ---
      const rawStock = stockResult.status === 'fulfilled'
        ? (Array.isArray(stockResult.value) ? stockResult.value : (stockResult.value as any)?.items || (stockResult.value as any)?.data || [])
        : [];
      const mappedStock = rawStock.map((item: any) => {
        const currentStock = parseFloat(item.current_stock) || 0;
        const unitPrice = parseFloat(item.unit_price) || 0;
        const reorderLevel = parseFloat(item.reorder_level) || 0;
        const itemName = (item.name || '').trim().toLowerCase();
        const sold = soldByItem[itemName] || { qty: 0, value: 0 };
        const purchased = purchasedByItem[itemName] || { qty: 0, value: 0 };
        return {
          item: item.name || 'Unknown Item',
          purchased: purchased.qty,
          used: sold.qty,
          in_stock: currentStock,
          po_value: purchased.value,
          bill_value: sold.value,
          variance: (purchased.qty + currentStock) > 0 ? (purchased.qty - sold.qty - currentStock) : 0,
          month: -1,
          year: -1,
          last_restocked: item.last_restocked,
          status: item.status,
        };
      });
      setAllStockReconciliation(mappedStock);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, []);

  // Filter data by selected month
  const filterByMonth = (date: string) => {
    const d = new Date(date);
    return d.getMonth() === selectedMonth.month && d.getFullYear() === selectedMonth.year;
  };

  const purchaseOrders = allPurchaseOrders.filter(po => filterByMonth(po.date));
  const salesBills = allSalesBills.filter(bill => filterByMonth(bill.date));
  // Stock: show all items (DB stock items don't have monthly breakdown)
  const stockReconciliation = allStockReconciliation.filter(
    item => (item.month === -1 && item.year === -1) || (item.month === selectedMonth.month && item.year === selectedMonth.year)
  );

  // Safe number helper to prevent NaN
  const safeNum = (val: any): number => (typeof val === 'number' && !isNaN(val)) ? val : 0;

  // Tax Summary Calculations (using filtered data)
  const totalInputGST = purchaseOrders.filter(po => po.status === 'Received').reduce((sum, po) => sum + safeNum(po.gst), 0);
  const totalOutputGST = salesBills.reduce((sum, bill) => sum + safeNum(bill.gst), 0);
  const gstPayable = totalOutputGST - totalInputGST;
  
  const totalPurchaseAmount = purchaseOrders.filter(po => po.status === 'Received').reduce((sum, po) => sum + safeNum(po.amount), 0);
  const totalSalesAmount = salesBills.reduce((sum, bill) => sum + safeNum(bill.amount), 0);
  
  // CGST/SGST/IGST Breakdown
  const cgstSgstPurchases = purchaseOrders.filter(po => po.gst_type === 'CGST+SGST' && po.status === 'Received');
  const igstPurchases = purchaseOrders.filter(po => po.gst_type === 'IGST' && po.status === 'Received');
  const cgstSgstSales = salesBills.filter(bill => bill.gst_type === 'CGST+SGST');
  const igstSales = salesBills.filter(bill => bill.gst_type === 'IGST');

  const inputCGST = cgstSgstPurchases.reduce((sum, po) => sum + safeNum(po.gst) / 2, 0);
  const inputSGST = cgstSgstPurchases.reduce((sum, po) => sum + safeNum(po.gst) / 2, 0);
  const inputIGST = igstPurchases.reduce((sum, po) => sum + safeNum(po.gst), 0);

  const outputCGST = cgstSgstSales.reduce((sum, bill) => sum + safeNum(bill.gst) / 2, 0);
  const outputSGST = cgstSgstSales.reduce((sum, bill) => sum + safeNum(bill.gst) / 2, 0);
  const outputIGST = igstSales.reduce((sum, bill) => sum + safeNum(bill.gst), 0);

  const cgstPayable = outputCGST - inputCGST;
  const sgstPayable = outputSGST - inputSGST;
  const igstPayable = outputIGST - inputIGST;

  // Stock Value (using filtered data)
  const totalPurchasedStockValue = stockReconciliation.reduce((sum, item) => sum + safeNum(item.po_value), 0);
  const totalSoldStockValue = stockReconciliation.reduce((sum, item) => sum + safeNum(item.bill_value), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const handleExportReport = () => {
    const monthLabel = `${monthNames[selectedMonth.month]} ${selectedMonth.year}`;
    const lines: string[] = [];

    // Header
    lines.push(`Audit Report - ${monthLabel}`);
    lines.push(`Generated on: ${new Date().toLocaleDateString('en-IN')}`);
    lines.push('');

    // Tax Summary
    lines.push('=== TAX SUMMARY ===');
    lines.push(`Total Purchase Amount,${totalPurchaseAmount}`);
    lines.push(`Input GST (Purchases),${totalInputGST}`);
    lines.push(`Total Sales Amount,${totalSalesAmount}`);
    lines.push(`Output GST (Sales),${totalOutputGST}`);
    lines.push(`GST ${gstPayable > 0 ? 'Payable' : 'Credit'},${Math.abs(gstPayable)}`);
    lines.push(`Net Profit (Before Tax),${totalSalesAmount - totalPurchaseAmount}`);
    lines.push('');

    // GST Breakdown
    lines.push('=== GST BREAKDOWN ===');
    lines.push('Type,Input,Output,Payable');
    lines.push(`CGST,${inputCGST},${outputCGST},${cgstPayable}`);
    lines.push(`SGST,${inputSGST},${outputSGST},${sgstPayable}`);
    lines.push(`IGST,${inputIGST},${outputIGST},${igstPayable}`);
    lines.push('');

    // Purchase Orders
    lines.push('=== PURCHASE ORDERS ===');
    lines.push('PO No,Vendor,Date,Amount,GST,Type,Total,Status');
    purchaseOrders.forEach(po => {
      lines.push(`${po.id},${po.vendor},${po.date},${po.amount},${po.gst},${po.gst_type},${po.total_amount},${po.status}`);
    });
    lines.push('');

    // Sales Bills
    lines.push('=== SALES / BILLS ===');
    lines.push('Invoice No,Customer,Date,Amount,GST,Type,Total,Status');
    salesBills.forEach(bill => {
      lines.push(`${bill.id},${bill.customer},${bill.date},${bill.amount},${bill.gst},${bill.gst_type},${bill.total_amount},${bill.status}`);
    });
    lines.push('');

    // Stock Reconciliation
    lines.push('=== STOCK RECONCILIATION ===');
    lines.push('Item,Purchased,Used/Sold,In Stock,PO Value,Sale Value,Variance');
    stockReconciliation.forEach(item => {
      lines.push(`${item.item},${item.purchased},${item.used},${item.in_stock},${item.po_value},${item.bill_value},${item.variance}`);
    });

    // Download as CSV
    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Audit_Report_${monthNames[selectedMonth.month]}_${selectedMonth.year}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl text-slate-900 font-bold">{t('auditModule')}</h2>
          <p className="text-sm text-slate-600 mt-1">{t('poBillingTaxStockReconciliation')}</p>
        </div>
        
        {/* Month Slider Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm">
            <button
              onClick={handlePrevMonth}
              disabled={isAtMinMonth}
              className={`p-2 rounded-l-lg transition-colors border-r border-gray-200 ${isAtMinMonth ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100'}`}
              title={t('previousMonth')}
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="px-4 py-2 min-w-[160px] text-center">
              <span className="font-semibold text-gray-800">
                {monthNames[selectedMonth.month]} {selectedMonth.year}
              </span>
            </div>
            <button
              onClick={handleNextMonth}
              disabled={isAtMaxMonth}
              className={`p-2 rounded-r-lg transition-colors border-l border-gray-200 ${isAtMaxMonth ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100'}`}
              title={t('nextMonth')}
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
        </div>
      </div>

      {/* Tax Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-blue-100 font-medium">{t('inputGstPurchases')}</span>
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <p className="text-sm text-blue-200 mb-1">{t('totalPurchase')}: {formatCurrency(totalPurchaseAmount)}</p>
          <p className="text-3xl font-bold">{formatCurrency(totalInputGST)}</p>
          <p className="text-xs text-blue-200 mt-2">{t('taxCreditAvailable')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-emerald-100 font-medium">{t('outputGstSales')}</span>
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <p className="text-sm text-emerald-200 mb-1">{t('totalSales')}: {formatCurrency(totalSalesAmount)}</p>
          <p className="text-3xl font-bold">{formatCurrency(totalOutputGST)}</p>
          <p className="text-xs text-emerald-200 mt-2">{t('taxCollected')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`rounded-xl p-6 text-white shadow-lg ${gstPayable > 0 ? 'bg-gradient-to-br from-red-600 to-red-700' : 'bg-gradient-to-br from-violet-600 to-violet-700'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-medium ${gstPayable > 0 ? 'text-red-100' : 'text-violet-100'}`}>
              {gstPayable > 0 ? (t('gstPayable')) : (t('gstCredit'))}
            </span>
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(Math.abs(gstPayable))}</p>
          <p className={`text-xs mt-2 ${gstPayable > 0 ? 'text-red-200' : 'text-violet-200'}`}>
            {gstPayable > 0 ? (t('toBePaidToGovt')) : (t('carryForwardToNextPeriod'))}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-amber-100 font-medium">{t('netProfit')}</span>
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(totalSalesAmount - totalPurchaseAmount)}</p>
          <p className="text-xs text-amber-200 mt-2">{t('beforeTax')}</p>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tax-summary" className="space-y-6">
        <div className='flex justify-between items-center'>
        <TabsList className="bg-white border border-slate-200 p-1 rounded-lg shadow-sm">
          <TabsTrigger value="tax-summary" className="gap-2">
            <Calculator className="w-4 h-4" />
            {t('taxSummary')}
          </TabsTrigger>
          <TabsTrigger value="purchases" className="gap-2">
            <ArrowDownRight className="w-4 h-4" />
            {t('purchasesPo')}
          </TabsTrigger>
          <TabsTrigger value="sales" className="gap-2">
            <ArrowUpRight className="w-4 h-4" />
            {t('salesBills')}
          </TabsTrigger>
          <TabsTrigger value="stock" className="gap-2">
            <Package className="w-4 h-4" />
            {t('stockReconciliation')}
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('refresh')}
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleExportReport}>
            <Download className="w-4 h-4 mr-2" />
            {t('exportReport')}
          </Button>
        </div>
        </div>
        
        {/* Tax Summary Tab */}
        <TabsContent value="tax-summary" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GST Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  {t('gstDetailedBreakdown')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">{t('cgstCentralGst')}</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">{t('input')}</p>
                        <p className="text-lg font-semibold text-blue-600">{formatCurrency(inputCGST)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">{t('output')}</p>
                        <p className="text-lg font-semibold text-emerald-600">{formatCurrency(outputCGST)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">{t('payable')}</p>
                        <p className={`text-lg font-semibold ${cgstPayable > 0 ? 'text-red-600' : 'text-violet-600'}`}>
                          {formatCurrency(Math.abs(cgstPayable))}
                          {cgstPayable <= 0 && ' (Credit)'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">{t('sgstStateGst')}</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">{t('input')}</p>
                        <p className="text-lg font-semibold text-blue-600">{formatCurrency(inputSGST)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">{t('output')}</p>
                        <p className="text-lg font-semibold text-emerald-600">{formatCurrency(outputSGST)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">{t('payable')}</p>
                        <p className={`text-lg font-semibold ${sgstPayable > 0 ? 'text-red-600' : 'text-violet-600'}`}>
                          {formatCurrency(Math.abs(sgstPayable))}
                          {sgstPayable <= 0 && ' (Credit)'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">{t('igstIntegratedGst')}</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">{t('input')}</p>
                        <p className="text-lg font-semibold text-blue-600">{formatCurrency(inputIGST)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">{t('output')}</p>
                        <p className="text-lg font-semibold text-emerald-600">{formatCurrency(outputIGST)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">{t('payable')}</p>
                        <p className={`text-lg font-semibold ${igstPayable > 0 ? 'text-red-600' : 'text-violet-600'}`}>
                          {formatCurrency(Math.abs(igstPayable))}
                          {igstPayable <= 0 && ' (Credit)'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tax Liability Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-emerald-600" />
                  {t('taxLiabilitySummary')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <p className="text-sm text-blue-700">{t('totalInputTaxCreditItc')}</p>
                      <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalInputGST)}</p>
                    </div>
                    <ArrowDownRight className="w-8 h-8 text-blue-400" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div>
                      <p className="text-sm text-emerald-700">{t('totalOutputTaxLiability')}</p>
                      <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalOutputGST)}</p>
                    </div>
                    <ArrowUpRight className="w-8 h-8 text-emerald-400" />
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <div className={`flex items-center justify-between p-4 rounded-lg border ${gstPayable > 0 ? 'bg-red-50 border-red-200' : 'bg-violet-50 border-violet-200'}`}>
                      <div>
                        <p className={`text-sm ${gstPayable > 0 ? 'text-red-700' : 'text-violet-700'}`}>
                          {gstPayable > 0 ? (t('netGstPayable')) : (t('netGstCredit'))}
                        </p>
                        <p className={`text-3xl font-bold ${gstPayable > 0 ? 'text-red-700' : 'text-violet-700'}`}>
                          {formatCurrency(Math.abs(gstPayable))}
                        </p>
                      </div>
                      {gstPayable > 0 ? (
                        <AlertTriangle className="w-10 h-10 text-red-400" />
                      ) : (
                        <CheckCircle2 className="w-10 h-10 text-violet-400" />
                      )}
                    </div>
                  </div>

                  {gstPayable > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {t('dueBy20thOfNextMonth')}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Purchases Tab */}
        <TabsContent value="purchases" className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder={t('searchPoOrVendor')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">{t('poNo')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">{t('vendor')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">{t('date')}</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">{t('amount')}</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">{t('taxGST')}</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">{t('type')}</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">{t('total')}</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">{t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((po, index) => (
                    <motion.tr
                      key={po.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-blue-600">{po.id}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">{po.vendor}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{new Date(po.date).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-sm text-slate-900 text-right font-medium">{formatCurrency(po.amount)}</td>
                      <td className="py-3 px-4 text-sm text-blue-600 text-right font-medium">{formatCurrency(po.gst)}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline" className="text-xs">{po.gst_type}</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-900 text-right font-bold">{formatCurrency(po.total_amount)}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={po.status === 'Received' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                          {po.status}
                        </Badge>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-semibold">
                    <td colSpan={3} className="py-3 px-4 text-sm text-slate-700">{t('total')}</td>
                    <td className="py-3 px-4 text-sm text-slate-900 text-right">{formatCurrency(purchaseOrders.reduce((sum, po) => sum + safeNum(po.amount), 0))}</td>
                    <td className="py-3 px-4 text-sm text-blue-600 text-right">{formatCurrency(purchaseOrders.reduce((sum, po) => sum + safeNum(po.gst), 0))}</td>
                    <td></td>
                    <td className="py-3 px-4 text-sm text-slate-900 text-right">{formatCurrency(purchaseOrders.reduce((sum, po) => sum + safeNum(po.total_amount), 0))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder={t('searchInvoiceOrCustomer')}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">{t('invoiceNo')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">{t('customer')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">{t('date')}</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">{t('amount')}</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">{t('taxGST')}</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">{t('type')}</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">{t('total')}</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">{t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {salesBills.map((bill, index) => (
                    <motion.tr
                      key={bill.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-emerald-600">{bill.id}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">{bill.customer}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{new Date(bill.date).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-sm text-slate-900 text-right font-medium">{formatCurrency(bill.amount)}</td>
                      <td className="py-3 px-4 text-sm text-emerald-600 text-right font-medium">{formatCurrency(bill.gst)}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline" className="text-xs">{bill.gst_type}</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-900 text-right font-bold">{formatCurrency(bill.total_amount)}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                          {bill.status}
                        </Badge>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-semibold">
                    <td colSpan={3} className="py-3 px-4 text-sm text-slate-700">{t('total')}</td>
                    <td className="py-3 px-4 text-sm text-slate-900 text-right">{formatCurrency(salesBills.reduce((sum, bill) => sum + safeNum(bill.amount), 0))}</td>
                    <td className="py-3 px-4 text-sm text-emerald-600 text-right">{formatCurrency(salesBills.reduce((sum, bill) => sum + safeNum(bill.gst), 0))}</td>
                    <td></td>
                    <td className="py-3 px-4 text-sm text-slate-900 text-right">{formatCurrency(salesBills.reduce((sum, bill) => sum + safeNum(bill.total_amount), 0))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Stock Reconciliation Tab */}
        <TabsContent value="stock" className="space-y-6">
          {/* Stock Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600 font-medium">{t('totalPurchaseValue')}</span>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ArrowDownRight className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl text-slate-900 font-bold">{formatCurrency(totalPurchasedStockValue)}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600 font-medium">{t('totalSalesValue')}</span>
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <p className="text-2xl text-slate-900 font-bold">{formatCurrency(totalSoldStockValue)}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600 font-medium">{t('varianceItems')}</span>
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <p className="text-2xl text-slate-900 font-bold">{stockReconciliation.filter(s => s.variance > 0).length}</p>
            </motion.div>
          </div>

          {/* Stock Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">{t('item')}</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">{t('purchased')}</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">{t('usedsold')}</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">{t('inStock')}</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">{t('poValue')}</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">{t('saleValue')}</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">{t('variance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stockReconciliation.map((item, index) => (
                    <motion.tr
                      key={item.item}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-900">{item.item}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700 text-right">{item.purchased}</td>
                      <td className="py-3 px-4 text-sm text-slate-700 text-right">{item.used}</td>
                      <td className="py-3 px-4 text-sm text-slate-900 text-right font-medium">{item.in_stock}</td>
                      <td className="py-3 px-4 text-sm text-blue-600 text-right">{formatCurrency(item.po_value)}</td>
                      <td className="py-3 px-4 text-sm text-emerald-600 text-right">{formatCurrency(item.bill_value)}</td>
                      <td className="py-3 px-4 text-center">
                        {item.variance > 0 ? (
                          <Badge className="bg-red-100 text-red-700">-{item.variance}</Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            OK
                          </Badge>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
