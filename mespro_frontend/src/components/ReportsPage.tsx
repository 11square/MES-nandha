import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { translations, Language } from '../translations';
import { reportsService } from '../services/reports.service';
import {
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  Truck,
  DollarSign,
  BarChart3,
  Calendar,
  Clock,
  Warehouse,
  FileText,
  CreditCard,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Star,
  Box,
  ShoppingCart,
  Timer,
  Factory,
  Wallet,
  Link,
} from 'lucide-react';

interface ReportsPageProps {
  userRole: string;
  language?: Language;
}

// Safe number formatting helpers
const safe = (v: any, fallback = 0): number =>
  typeof v === 'number' && !Number.isNaN(v) ? v : fallback;

const formatCurrency = (v: any): string => {
  const n = safe(v);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  return `${sign}₹${abs.toLocaleString()}`;
};

const pct = (v: any): string => `${safe(v)}%`;

// Reusable metric card
const METRIC_THEME: Record<string, { card: string; label: string; value: string }> = {
  blue:   { card: 'bg-blue-500/10 backdrop-blur-sm border-blue-200',     label: 'text-blue-600',   value: 'text-blue-700' },
  green:  { card: 'bg-green-500/10 backdrop-blur-sm border-green-200',   label: 'text-green-600',  value: 'text-green-700' },
  emerald:{ card: 'bg-emerald-500/10 backdrop-blur-sm border-emerald-200',label: 'text-emerald-600',value: 'text-emerald-700' },
  purple: { card: 'bg-purple-500/10 backdrop-blur-sm border-purple-200', label: 'text-purple-600', value: 'text-purple-700' },
  orange: { card: 'bg-orange-500/10 backdrop-blur-sm border-orange-200', label: 'text-orange-600', value: 'text-orange-700' },
  amber:  { card: 'bg-amber-500/10 backdrop-blur-sm border-amber-200',   label: 'text-amber-600',  value: 'text-amber-700' },
  red:    { card: 'bg-red-500/10 backdrop-blur-sm border-red-200',       label: 'text-red-600',    value: 'text-red-700' },
  teal:   { card: 'bg-teal-500/10 backdrop-blur-sm border-teal-200',     label: 'text-teal-600',   value: 'text-teal-700' },
  indigo: { card: 'bg-indigo-500/10 backdrop-blur-sm border-indigo-200', label: 'text-indigo-600', value: 'text-indigo-700' },
  violet: { card: 'bg-violet-500/10 backdrop-blur-sm border-violet-200', label: 'text-violet-600', value: 'text-violet-700' },
  cyan:   { card: 'bg-cyan-500/10 backdrop-blur-sm border-cyan-200',     label: 'text-cyan-600',   value: 'text-cyan-700' },
  slate:  { card: 'bg-slate-500/10 backdrop-blur-sm border-slate-200',   label: 'text-slate-600',  value: 'text-slate-700' },
};
function MetricCard({ icon: Icon, iconBg, iconColor, label, value, change, changeTrend }: {
  icon: any; iconBg: string; iconColor: string; label: string; value: string | number;
  change?: string; changeTrend?: 'up' | 'down' | 'neutral';
}) {
  const m = iconBg.match(/bg-([a-z]+)-/);
  const theme = METRIC_THEME[m?.[1] || 'slate'] || METRIC_THEME.slate;
  return (
    <Card className={theme.card}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 ${iconBg} rounded-lg flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
          {change && (
            <Badge className={changeTrend === 'up' ? 'bg-green-100 text-green-700' : changeTrend === 'down' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}>
              {changeTrend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> : changeTrend === 'down' ? <TrendingDown className="w-3 h-3 mr-1" /> : null}
              {change}
            </Badge>
          )}
        </div>
        <h3 className={`text-sm mb-1 ${theme.label}`}>{label}</h3>
        <p className={`text-2xl font-semibold ${theme.value}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

// Progress bar row
function ProgressRow({ label, value, max, color = 'bg-blue-600', suffix }: {
  label: string; value: number; max: number; color?: string; suffix?: string;
}) {
  const pctVal = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-gray-900 text-sm">{label}</span>
        <span className="text-gray-600 text-sm">{value}{suffix ?? ''}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full`} style={{ width: `${Math.min(pctVal, 100)}%` }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CSV EXPORT HELPERS
// ═══════════════════════════════════════════════════════════════
function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: any) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function ReportsPage({ userRole, language = 'en' }: ReportsPageProps) {
  const t = (key: keyof typeof translations.en) => translations[language][key] || translations.en[key];

  // 1. Overview state
  const [overviewMetrics, setOverviewMetrics] = useState({
    totalLeads: 0, totalLeadsChange: '',
    ordersCompleted: 0, ordersCompletedChange: '',
    monthlyRevenue: 0, monthlyRevenueChange: '',
    onTimeDelivery: 0, onTimeDeliveryChange: '',
  });
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);

  // 2. Sales & Leads state
  const [leadFunnelData, setLeadFunnelData] = useState({
    newLeads: 0, contacted: 0, qualified: 0, approved: 0, rejected: 0, conversionRate: 0,
  });
  const [leadSources, setLeadSources] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  // 3. Production state
  const [productionData, setProductionData] = useState({
    ordersInProduction: 0, ordersCompleted: 0, ordersDispatched: 0,
    avgProductionTime: 0, onTimeDelivery: 0, qualityPassRate: 0,
  });
  const [productionStages, setProductionStages] = useState<any[]>([]);

  // 4. Finance state
  const [financeData, setFinanceData] = useState({
    totalRevenue: 0, totalExpenses: 0, netProfit: 0, profitMargin: 0,
    cashInflow: 0, cashOutflow: 0,
    totalInvoices: 0, paidInvoices: 0, unpaidInvoices: 0, overdueAmount: 0,
    avgPaymentDays: 0,
    totalPayroll: 0, avgSalary: 0, overtimeCost: 0,
  });
  const [revenueByMonth, setRevenueByMonth] = useState<any[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<any[]>([]);
  const [invoiceAging, setInvoiceAging] = useState<any[]>([]);

  // 5. Orders & Dispatch state
  const [ordersData, setOrdersData] = useState({
    totalOrders: 0, pendingOrders: 0, confirmedOrders: 0, inProductionOrders: 0,
    completedOrders: 0, cancelledOrders: 0, avgOrderValue: 0,
    totalDispatches: 0, onTimeDispatches: 0, delayedDispatches: 0,
    inTransit: 0, delivered: 0, avgDeliveryDays: 0,
  });
  const [ordersByStatus, setOrdersByStatus] = useState<any[]>([]);
  const [dispatchByRegion, setDispatchByRegion] = useState<any[]>([]);

  // 6. Supply Chain state
  const [inventoryData, setInventoryData] = useState({
    rawMaterialsValue: 0, finishedGoodsValue: 0, wipValue: 0,
    criticalStock: 0, lowStock: 0, reordersPending: 0,
    stockTurnoverRatio: 0, deadStockItems: 0,
  });
  const [vendorData, setVendorData] = useState({
    totalVendors: 0, activeVendors: 0, avgRating: 0, onTimeSupplyRate: 0, pendingPayments: 0,
  });
  const [poData, setPoData] = useState({
    totalPOs: 0, pendingPOs: 0, approvedPOs: 0, receivedPOs: 0, rejectedPOs: 0, totalPOValue: 0,
  });
  const [fastMovingItems, setFastMovingItems] = useState<any[]>([]);
  const [topVendors, setTopVendors] = useState<any[]>([]);

  // 7. HR state
  const [attendanceData, setAttendanceData] = useState({
    avgAttendance: 0, totalWorkers: 0, avgPresent: 0, totalHoursThisMonth: 0,
  });
  const [attendanceByTeam, setAttendanceByTeam] = useState<any[]>([]);
  const [staffData, setStaffData] = useState({
    totalStaff: 0, newHires: 0, exits: 0, avgTenure: 0, attritionRate: 0,
  });
  const [departmentHeadcount, setDepartmentHeadcount] = useState<any[]>([]);
  const [payrollData, setPayrollData] = useState({
    totalPayroll: 0, avgSalary: 0, totalOvertime: 0, totalDeductions: 0,
  });
  const [payrollByDept, setPayrollByDept] = useState<any[]>([]);

  // ═══════════════════════════════════════════════════════════
  // DATA FETCHING — maps actual backend responses to UI state
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    // 1 & 2. Sales / Overview / Leads
    reportsService.getSalesReport().then((data: any) => {
      const summary = data?.summary || {};
      // Overview metrics from sales
      setOverviewMetrics(prev => ({
        ...prev,
        monthlyRevenue: summary.totalSales ?? 0,
      }));
      // Recent orders from sales list
      if (data?.sales?.length) {
        setRecentOrders(data.sales.slice(0, 10).map((s: any) => ({
          id: s.id,
          status: s.status || 'Completed',
          customer: s.customer_name || s.client_name || `Sale #${s.id}`,
          product: s.product || s.description || '',
          value: s.total_amount || 0,
        })));
        // Build monthly trends from sales data
        const monthMap: Record<string, { orders: number; revenue: number }> = {};
        data.sales.forEach((s: any) => {
          const month = (s.date || '').substring(0, 7); // YYYY-MM
          if (!monthMap[month]) monthMap[month] = { orders: 0, revenue: 0 };
          monthMap[month].orders += 1;
          monthMap[month].revenue += parseFloat(s.total_amount || 0);
        });
        const trends = Object.entries(monthMap).sort().slice(-6).map(([month, val]) => ({
          month, orders: val.orders, revenue: val.revenue,
        }));
        if (trends.length) setMonthlyTrends(trends);
        // Top products from sales
        const prodMap: Record<string, { orders: number; revenue: number }> = {};
        data.sales.forEach((s: any) => {
          const name = s.product || s.description || 'Other';
          if (!prodMap[name]) prodMap[name] = { orders: 0, revenue: 0 };
          prodMap[name].orders += 1;
          prodMap[name].revenue += parseFloat(s.total_amount || 0);
        });
        const prods = Object.entries(prodMap)
          .map(([name, val]) => ({ name, orders: val.orders, revenue: val.revenue }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);
        if (prods.length) setTopProducts(prods);
      }
    }).catch(() => {});

    // Fetch leads separately for funnel + overview
    (async () => {
      try {
        const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
        const leadsResp = await fetch(`${apiBase}/leads`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        });
        if (leadsResp.ok) {
          const leadsJson = await leadsResp.json();
          const leads = leadsJson.data?.leads || leadsJson.data?.items || leadsJson.data || [];
          if (Array.isArray(leads) && leads.length) {
            const statusMap: Record<string, number> = {};
            const sourceMap: Record<string, number> = {};
            leads.forEach((l: any) => {
              const st = (l.status || '').toLowerCase();
              statusMap[st] = (statusMap[st] || 0) + 1;
              const src = l.source || 'Unknown';
              sourceMap[src] = (sourceMap[src] || 0) + 1;
            });
            setLeadFunnelData({
              newLeads: statusMap['new'] || leads.length,
              contacted: statusMap['contacted'] || 0,
              qualified: statusMap['qualified'] || 0,
              approved: statusMap['approved'] || statusMap['converted'] || 0,
              rejected: statusMap['rejected'] || statusMap['lost'] || 0,
              conversionRate: leads.length > 0
                ? Math.round(((statusMap['approved'] || statusMap['converted'] || 0) / leads.length) * 100)
                : 0,
            });
            const srcArr = Object.entries(sourceMap).map(([source, count]) => ({
              source,
              count,
              percentage: Math.round((count / leads.length) * 100),
            }));
            setLeadSources(srcArr);
            setOverviewMetrics(prev => ({ ...prev, totalLeads: leads.length }));
          }
        }
      } catch {}
    })();

    // Orders for overview metric
    reportsService.getOrdersReport().then((data: any) => {
      const summary = data?.summary || {};
      setOverviewMetrics(prev => ({
        ...prev,
        ordersCompleted: (summary.statusCounts?.['Delivered'] || 0) + (summary.statusCounts?.['Bill'] || 0),
      }));
      setOrdersData(prev => ({
        ...prev,
        totalOrders: summary.totalOrders ?? 0,
        pendingOrders: summary.statusCounts?.['Pending'] ?? 0,
        confirmedOrders: summary.statusCounts?.['Confirmed'] ?? 0,
        inProductionOrders: summary.statusCounts?.['In Production'] ?? 0,
        completedOrders: (summary.statusCounts?.['Delivered'] ?? 0) + (summary.statusCounts?.['Bill'] ?? 0) + (summary.statusCounts?.['Ready'] ?? 0),
        cancelledOrders: summary.statusCounts?.['Cancelled'] ?? 0,
        avgOrderValue: summary.avgOrderValue ?? 0,
      }));
      // Build order status chart data
      if (summary.statusCounts) {
        const byStatus = Object.entries(summary.statusCounts).map(([status, count]) => ({
          status, count,
        }));
        setOrdersByStatus(byStatus);
      }
      // Recent orders for orders tab
      if (data?.recentOrders?.length) {
        setRecentOrders(prev => prev.length > 0 ? prev : data.recentOrders.map((o: any) => ({
          id: o.order_number || o.id,
          status: o.status,
          customer: o.customer,
          product: o.product || '',
          value: o.total_amount || o.grand_total || 0,
        })));
      }
    }).catch(() => {});

    // 3. Production — try production_orders first, fall back to orders pipeline
    reportsService.getProductionReport().then((data: any) => {
      const summary = data?.summary || {};
      const sc = summary.statusCounts || {};
      const hasProductionData = summary.total > 0 || Object.keys(sc).length > 0;

      if (hasProductionData) {
        setProductionData({
          ordersInProduction: sc['in_progress'] || sc['In Progress'] || sc['pending'] || 0,
          ordersCompleted: sc['completed'] || sc['Completed'] || 0,
          ordersDispatched: sc['dispatched'] || sc['Dispatched'] || 0,
          avgProductionTime: summary.avgProductionTime ?? 0,
          onTimeDelivery: summary.onTimeDelivery ?? 0,
          qualityPassRate: summary.qualityPassRate ?? 0,
        });
        const stages = Object.entries(sc).map(([stage, orders]) => ({ stage, orders }));
        setProductionStages(stages);
      } else {
        // Fall back to orders data for production context
        reportsService.getOrdersReport().then((ordData: any) => {
          const ordSummary = ordData?.summary || {};
          const ordSc = ordSummary.statusCounts || {};
          const pending = ordSc['Pending'] || 0;
          const inProd = ordSc['In Production'] || 0;
          const completed = (ordSc['Bill'] || 0) + (ordSc['Delivered'] || 0) + (ordSc['Ready'] || 0) + (ordSc['Completed'] || 0);
          const dispatched = ordSc['Dispatched'] || ordSc['Delivered'] || 0;

          setProductionData({
            ordersInProduction: pending + inProd,
            ordersCompleted: completed,
            ordersDispatched: dispatched,
            avgProductionTime: 0,
            onTimeDelivery: ordSummary.totalOrders > 0 ? Math.round((completed / ordSummary.totalOrders) * 100) : 0,
            qualityPassRate: 0,
          });

          // Build stages from order statuses
          const stages = Object.entries(ordSc).map(([stage, orders]) => ({ stage, orders }));
          if (stages.length) setProductionStages(stages);
        }).catch(() => {});
      }
    }).catch(() => {});

    // 4. Finance
    reportsService.getFinancialReport().then((data: any) => {
      setFinanceData(prev => ({
        ...prev,
        totalRevenue: data?.totalIncome ?? prev.totalRevenue,
        totalExpenses: data?.totalExpense ?? prev.totalExpenses,
        netProfit: data?.netProfit ?? prev.netProfit,
        profitMargin: (data?.totalIncome && data.totalIncome > 0)
          ? Math.round((data.netProfit / data.totalIncome) * 100) : 0,
      }));
    }).catch(() => {});

    reportsService.getBillingReport().then((data: any) => {
      if (data?.summary) {
        setFinanceData(prev => ({
          ...prev,
          totalInvoices: data.summary.totalBills ?? prev.totalInvoices,
          paidInvoices: 0,
          unpaidInvoices: 0,
          overdueAmount: data.summary.totalPending ?? prev.overdueAmount,
        }));
        // Map statusBreakdown to invoice aging
        if (data.statusBreakdown?.length) {
          const aging = data.statusBreakdown.map((s: any) => ({
            status: s.payment_status,
            count: parseInt(s.count || 0),
            amount: parseFloat(s.total || 0),
          }));
          setInvoiceAging(aging);
          // Count paid/unpaid from breakdown
          let paid = 0, unpaid = 0;
          data.statusBreakdown.forEach((s: any) => {
            if (s.payment_status === 'paid') paid += parseInt(s.count || 0);
            else unpaid += parseInt(s.count || 0);
          });
          setFinanceData(prev => ({ ...prev, paidInvoices: paid, unpaidInvoices: unpaid }));
        }
      }
    }).catch(() => {});

    // 5. Dispatch
    reportsService.getDispatchReport().then((data: any) => {
      const summary = data?.summary || {};
      const sc = summary.statusCounts || {};
      setOrdersData(prev => ({
        ...prev,
        totalDispatches: summary.total ?? 0,
        onTimeDispatches: sc['delivered'] || sc['Delivered'] || 0,
        delayedDispatches: sc['delayed'] || sc['Delayed'] || 0,
        inTransit: sc['in_transit'] || sc['In Transit'] || sc['dispatched'] || sc['Dispatched'] || 0,
        delivered: sc['delivered'] || sc['Delivered'] || 0,
      }));
      // On-time delivery for overview
      if (summary.total > 0) {
        const onTime = sc['delivered'] || sc['Delivered'] || 0;
        setOverviewMetrics(prev => ({
          ...prev,
          onTimeDelivery: Math.round((onTime / summary.total) * 100),
        }));
      }
    }).catch(() => {});

    // 6. Supply Chain - Inventory
    reportsService.getInventoryReport().then((data: any) => {
      setInventoryData(prev => ({
        ...prev,
        rawMaterialsValue: data?.rawMaterials?.total ?? 0,
        finishedGoodsValue: data?.finishedGoods?.total ?? 0,
        lowStock: (data?.rawMaterials?.lowStock ?? 0) + (data?.finishedGoods?.lowStock ?? 0),
        criticalStock: data?.rawMaterials?.lowStock ?? 0,
      }));
    }).catch(() => {});

    // Stock
    reportsService.getStockReport().then((data: any) => {
      if (data?.summary) {
        setInventoryData(prev => ({
          ...prev,
          wipValue: data.summary.totalValue ?? prev.wipValue,
          deadStockItems: data.summary.outOfStock ?? prev.deadStockItems,
        }));
      }
      if (data?.lowStockList?.length) {
        setFastMovingItems(data.lowStockList.map((item: any) => ({
          name: item.name,
          stock: item.current_stock,
          status: item.status,
          category: item.category,
        })));
      }
    }).catch(() => {});

    // Purchase Orders
    reportsService.getPurchaseOrderReport().then((data: any) => {
      if (data?.summary) {
        const sc = data.summary.statusCounts || {};
        setPoData({
          totalPOs: data.summary.totalPOs ?? 0,
          pendingPOs: sc['pending'] || sc['draft'] || 0,
          approvedPOs: sc['approved'] || 0,
          receivedPOs: sc['received'] || 0,
          rejectedPOs: sc['cancelled'] || 0,
          totalPOValue: data.summary.totalSpent ?? 0,
        });
      }
    }).catch(() => {});

    // Vendors
    reportsService.getVendorReport().then((data: any) => {
      if (data?.summary) {
        setVendorData({
          totalVendors: data.summary.totalVendors ?? 0,
          activeVendors: data.summary.activeVendors ?? 0,
          avgRating: 0,
          onTimeSupplyRate: 0,
          pendingPayments: data.summary.totalOutstanding ?? 0,
        });
      }
      if (data?.topVendors) {
        setTopVendors(data.topVendors.map((v: any) => ({
          name: v.name,
          category: v.category,
          totalAmount: v.total_amount,
          status: v.status,
        })));
      }
    }).catch(() => {});

    // 7. HR - Attendance
    reportsService.getAttendanceReport().then((data: any) => {
      if (data?.summary) {
        const s = data.summary;
        setAttendanceData({
          avgAttendance: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
          totalWorkers: s.total ?? 0,
          avgPresent: s.present ?? 0,
          totalHoursThisMonth: 0,
        });
      }
      // Build attendance by team (department) from records
      if (data?.records && Array.isArray(data.records)) {
        const teamMap: Record<string, { total: number; present: number }> = {};
        data.records.forEach((r: any) => {
          const dept = r.staff?.department || 'Unassigned';
          if (!teamMap[dept]) teamMap[dept] = { total: 0, present: 0 };
          teamMap[dept].total++;
          if (r.present) teamMap[dept].present++;
        });
        setAttendanceByTeam(Object.entries(teamMap).map(([team, d]) => ({
          team,
          total: d.total,
          present: d.present,
          percentage: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
        })));
      }
    }).catch(() => {});

    // Staff
    reportsService.getStaffReport().then((data: any) => {
      if (data?.summary) {
        setStaffData({
          totalStaff: data.summary.totalStaff ?? 0,
          newHires: 0,
          exits: data.summary.inactive ?? 0,
          avgTenure: 0,
          attritionRate: 0,
        });
      }
      if (data?.departmentBreakdown) {
        setDepartmentHeadcount(data.departmentBreakdown.map((d: any) => ({
          department: d.department || 'Unassigned',
          count: parseInt(d.count || 0),
        })));
      }
    }).catch(() => {});

    // Payroll
    reportsService.getPayrollReport().then((data: any) => {
      if (data?.summary) {
        setPayrollData({
          totalPayroll: data.summary.totalNetSalary ?? 0,
          avgSalary: data.summary.totalRecords > 0
            ? Math.round(data.summary.totalNetSalary / data.summary.totalRecords)
            : 0,
          totalOvertime: data.summary.totalAllowances ?? 0,
          totalDeductions: data.summary.totalDeductions ?? 0,
        });
        setFinanceData(prev => ({
          ...prev,
          totalPayroll: data.summary.totalNetSalary ?? prev.totalPayroll,
          avgSalary: data.summary.totalRecords > 0
            ? Math.round(data.summary.totalNetSalary / data.summary.totalRecords) : prev.avgSalary,
        }));
      }
      if (data?.departmentSummary) {
        setPayrollByDept(data.departmentSummary.map((d: any) => ({
          department: d.department || 'Unassigned',
          count: parseInt(d.count || 0),
          totalSalary: parseFloat(d.totalSalary || 0),
        })));
      }
    }).catch(() => {});

  }, []);

  // ═══════════════════════════════════════════════════════════
  // EXPORT HANDLERS
  // ═══════════════════════════════════════════════════════════
  const exportMonthlyTrends = () => {
    downloadCSV('monthly_performance_trends',
      ['Month', 'Orders', 'Revenue'],
      monthlyTrends.map(m => [m.month, safe(m.orders), safe(m.revenue)]));
  };

  const exportTopProducts = () => {
    downloadCSV('top_selling_products',
      ['Product', 'Orders', 'Revenue'],
      topProducts.map(p => [p.name, safe(p.orders), safe(p.revenue)]));
  };

  const exportLeadFunnel = () => {
    downloadCSV('lead_funnel',
      ['Stage', 'Count'],
      [
        ['New Leads', safe(leadFunnelData.newLeads)],
        ['Contacted', safe(leadFunnelData.contacted)],
        ['Qualified', safe(leadFunnelData.qualified)],
        ['Approved', safe(leadFunnelData.approved)],
        ['Rejected', safe(leadFunnelData.rejected)],
        ['Conversion Rate (%)', safe(leadFunnelData.conversionRate)],
      ]);
  };

  const exportLeadSources = () => {
    downloadCSV('lead_sources',
      ['Source', 'Count', 'Percentage'],
      leadSources.map(s => [s.source, safe(s.count), safe(s.percentage)]));
  };

  const exportRecentOrders = () => {
    downloadCSV('recent_orders',
      ['Order ID', 'Status', 'Customer', 'Product', 'Value'],
      recentOrders.map(o => [o.id, o.status, o.customer, o.product, safe(o.value)]));
  };

  const exportProduction = () => {
    const rows: (string | number)[][] = [
      ['Orders In Production', safe(productionData.ordersInProduction)],
      ['Orders Completed', safe(productionData.ordersCompleted)],
      ['Orders Dispatched', safe(productionData.ordersDispatched)],
      ['Avg Production Time (days)', safe(productionData.avgProductionTime)],
      ['On-Time Delivery (%)', safe(productionData.onTimeDelivery)],
      ['Quality Pass Rate (%)', safe(productionData.qualityPassRate)],
    ];
    productionStages.forEach(s => rows.push([`Stage: ${s.stage}`, safe(s.orders)]));
    downloadCSV('production_report', ['Metric', 'Value'], rows);
  };

  const exportFinance = () => {
    const rows: (string | number)[][] = [
      ['Total Revenue', safe(financeData.totalRevenue)],
      ['Total Expenses', safe(financeData.totalExpenses)],
      ['Net Profit', safe(financeData.netProfit)],
      ['Profit Margin (%)', safe(financeData.profitMargin)],
      ['Total Invoices', safe(financeData.totalInvoices)],
      ['Paid Invoices', safe(financeData.paidInvoices)],
      ['Unpaid Invoices', safe(financeData.unpaidInvoices)],
      ['Overdue Amount', safe(financeData.overdueAmount)],
      ['Avg Payment Days', safe(financeData.avgPaymentDays)],
      ['Total Payroll', safe(financeData.totalPayroll)],
      ['Avg Salary', safe(financeData.avgSalary)],
      ['Overtime Cost', safe(financeData.overtimeCost)],
      ['Cash Inflow', safe(financeData.cashInflow)],
      ['Cash Outflow', safe(financeData.cashOutflow)],
    ];
    revenueByMonth.forEach(m => rows.push([`Revenue ${m.month}`, safe(m.revenue)], [`Expense ${m.month}`, safe(m.expense)]));
    expenseBreakdown.forEach(e => rows.push([`Expense: ${e.category}`, safe(e.amount)]));
    invoiceAging.forEach(a => rows.push([`Invoice Aging: ${a.status}`, safe(a.amount)]));
    downloadCSV('finance_report', ['Metric', 'Value'], rows);
  };

  const exportOrdersDispatch = () => {
    const rows: (string | number)[][] = [
      ['Total Orders', safe(ordersData.totalOrders)],
      ['Pending Orders', safe(ordersData.pendingOrders)],
      ['Confirmed Orders', safe(ordersData.confirmedOrders)],
      ['In Production Orders', safe(ordersData.inProductionOrders)],
      ['Completed Orders', safe(ordersData.completedOrders)],
      ['Cancelled Orders', safe(ordersData.cancelledOrders)],
      ['Avg Order Value', safe(ordersData.avgOrderValue)],
      ['Total Dispatches', safe(ordersData.totalDispatches)],
      ['On-Time Dispatches', safe(ordersData.onTimeDispatches)],
      ['Delayed Dispatches', safe(ordersData.delayedDispatches)],
      ['In Transit', safe(ordersData.inTransit)],
      ['Delivered', safe(ordersData.delivered)],
      ['Avg Delivery Days', safe(ordersData.avgDeliveryDays)],
    ];
    ordersByStatus.forEach(s => rows.push([`Orders: ${s.status}`, safe(s.count)]));
    dispatchByRegion.forEach(r => rows.push([`Dispatch Region: ${r.region}`, safe(r.count)]));
    downloadCSV('orders_dispatch_report', ['Metric', 'Value'], rows);
  };

  const exportSupplyChain = () => {
    const rows: (string | number)[][] = [
      ['Raw Materials Value', safe(inventoryData.rawMaterialsValue)],
      ['Finished Goods Value', safe(inventoryData.finishedGoodsValue)],
      ['WIP Value', safe(inventoryData.wipValue)],
      ['Critical Stock Items', safe(inventoryData.criticalStock)],
      ['Low Stock Items', safe(inventoryData.lowStock)],
      ['Reorders Pending', safe(inventoryData.reordersPending)],
      ['Stock Turnover Ratio', safe(inventoryData.stockTurnoverRatio)],
      ['Dead Stock Items', safe(inventoryData.deadStockItems)],
      ['Total Vendors', safe(vendorData.totalVendors)],
      ['Active Vendors', safe(vendorData.activeVendors)],
      ['Avg Rating', safe(vendorData.avgRating)],
      ['On-Time Supply Rate (%)', safe(vendorData.onTimeSupplyRate)],
      ['Pending Payments', safe(vendorData.pendingPayments)],
      ['Total POs', safe(poData.totalPOs)],
      ['Pending POs', safe(poData.pendingPOs)],
      ['Approved POs', safe(poData.approvedPOs)],
      ['Received POs', safe(poData.receivedPOs)],
      ['Rejected POs', safe(poData.rejectedPOs)],
      ['Total PO Value', safe(poData.totalPOValue)],
    ];
    fastMovingItems.forEach(i => rows.push([`Item: ${i.name}`, safe(i.stock)]));
    topVendors.forEach(v => rows.push([`Vendor: ${v.name}`, safe(v.totalAmount)]));
    downloadCSV('supply_chain_report', ['Metric', 'Value'], rows);
  };

  const exportHR = () => {
    const rows: (string | number)[][] = [
      ['Total Staff', safe(staffData.totalStaff)],
      ['New Hires', safe(staffData.newHires)],
      ['Exits', safe(staffData.exits)],
      ['Avg Tenure (years)', safe(staffData.avgTenure)],
      ['Attrition Rate (%)', safe(staffData.attritionRate)],
      ['Avg Attendance (%)', safe(attendanceData.avgAttendance)],
      ['Total Workers', safe(attendanceData.totalWorkers)],
      ['Avg Present/Day', safe(attendanceData.avgPresent)],
      ['Total Hours This Month', safe(attendanceData.totalHoursThisMonth)],
      ['Total Payroll', safe(payrollData.totalPayroll)],
      ['Avg Salary', safe(payrollData.avgSalary)],
      ['Total Overtime', safe(payrollData.totalOvertime)],
      ['Total Deductions', safe(payrollData.totalDeductions)],
    ];
    attendanceByTeam.forEach(t => rows.push([`Attendance: ${t.team}`, `${safe(t.present)}/${safe(t.total)} (${safe(t.percentage)}%)`]));
    departmentHeadcount.forEach(d => rows.push([`Dept: ${d.department}`, safe(d.count)]));
    payrollByDept.forEach(d => rows.push([`Payroll Dept: ${d.department}`, safe(d.totalSalary)]));
    downloadCSV('hr_staff_report', ['Metric', 'Value'], rows);
  };

  const exportAllReports = () => {
    exportMonthlyTrends();
    exportTopProducts();
    exportLeadFunnel();
    exportRecentOrders();
    exportProduction();
    exportFinance();
    exportOrdersDispatch();
    exportSupplyChain();
    exportHR();
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 overflow-auto h-full pb-6">
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard icon={Users} iconBg="bg-blue-100" iconColor="text-blue-600"
          label="Total Leads" value={`${safe(overviewMetrics.totalLeads)} this month`}
          change={overviewMetrics.totalLeadsChange} changeTrend="up" />
        <MetricCard icon={Package} iconBg="bg-green-100" iconColor="text-green-600"
          label="Orders Completed" value={`${safe(overviewMetrics.ordersCompleted)} this month`}
          change={overviewMetrics.ordersCompletedChange} changeTrend="up" />
        <MetricCard icon={DollarSign} iconBg="bg-purple-100" iconColor="text-purple-600"
          label="Monthly Revenue" value={formatCurrency(overviewMetrics.monthlyRevenue)}
          change={overviewMetrics.monthlyRevenueChange} changeTrend="up" />
        <MetricCard icon={Truck} iconBg="bg-orange-100" iconColor="text-orange-600"
          label="On-Time Delivery" value={pct(overviewMetrics.onTimeDelivery)}
          change={overviewMetrics.onTimeDeliveryChange} changeTrend="up" />
      </div>

      {/* 8 REPORT TABS */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList className="flex flex-wrap gap-2">
            <TabsTrigger value="overview" className="flex items-center gap-2 text-sm px-4 py-2"><BarChart3 className="w-5 h-5" /> Overview</TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2 text-sm px-4 py-2"><Briefcase className="w-5 h-5" /> Sales & Leads</TabsTrigger>
            <TabsTrigger value="production" className="flex items-center gap-2 text-sm px-4 py-2"><Factory className="w-5 h-5" /> Production</TabsTrigger>
            <TabsTrigger value="finance" className="flex items-center gap-2 text-sm px-4 py-2"><Wallet className="w-5 h-5" /> Finance</TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2 text-sm px-4 py-2"><Package className="w-5 h-5" /> Orders & Dispatch</TabsTrigger>
            <TabsTrigger value="supply" className="flex items-center gap-2 text-sm px-4 py-2"><Link className="w-5 h-5" /> Supply Chain</TabsTrigger>
            <TabsTrigger value="hr" className="flex items-center gap-2 text-sm px-4 py-2"><Users className="w-5 h-5" /> Staffs</TabsTrigger>
          </TabsList>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={exportAllReports}>
            <Download className="w-4 h-4 mr-2" />
            Export All Reports
          </Button>
        </div>

        {/* ════════════════════════════════════════════════════ */}
        {/* TAB 1 — OVERVIEW                                    */}
        {/* ════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monthly Trends */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Monthly Performance Trend</CardTitle>
                <Button variant="outline" size="sm" onClick={exportMonthlyTrends}><Download className="w-4 h-4 mr-2" />Export</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyTrends.map((month, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-16 text-gray-600 text-sm">{month.month}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-900 text-sm">{safe(month.orders)} orders</span>
                          <span className="text-gray-900 text-sm">{formatCurrency(month.revenue)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div className="bg-blue-600 h-3 rounded-full" style={{ width: `${Math.min((safe(month.orders) / 60) * 100, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                  {monthlyTrends.length === 0 && <p className="text-gray-400 text-center py-8">No trend data available</p>}
                </div>
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Top Selling Products</CardTitle>
                <Button variant="outline" size="sm" onClick={exportTopProducts}><Download className="w-4 h-4 mr-2" />Export</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topProducts.map((product, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-sm font-semibold">#{i + 1}</span>
                        </div>
                        <div>
                          <p className="text-gray-900 text-sm font-medium">{product.name}</p>
                          <p className="text-gray-500 text-xs">{safe(product.orders)} orders</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-900 text-sm font-medium">{formatCurrency(product.revenue)}</p>
                      </div>
                    </div>
                  ))}
                  {topProducts.length === 0 && <p className="text-gray-400 text-center py-8">No product data available</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ════════════════════════════════════════════════════ */}
        {/* TAB 2 — SALES & LEADS                               */}
        {/* ════════════════════════════════════════════════════ */}
        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lead Funnel */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Lead Funnel</CardTitle>
                <Button variant="outline" size="sm" onClick={exportLeadFunnel}><Download className="w-4 h-4 mr-2" />Export</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'New Leads', value: leadFunnelData.newLeads, color: 'bg-blue-600', pctVal: 100 },
                    { label: 'Contacted', value: leadFunnelData.contacted, color: 'bg-blue-500', pctVal: leadFunnelData.newLeads ? (leadFunnelData.contacted / leadFunnelData.newLeads) * 100 : 0 },
                    { label: 'Qualified', value: leadFunnelData.qualified, color: 'bg-blue-400', pctVal: leadFunnelData.newLeads ? (leadFunnelData.qualified / leadFunnelData.newLeads) * 100 : 0 },
                    { label: 'Approved', value: leadFunnelData.approved, color: 'bg-green-600', pctVal: leadFunnelData.newLeads ? (leadFunnelData.approved / leadFunnelData.newLeads) * 100 : 0 },
                    { label: 'Rejected', value: leadFunnelData.rejected, color: 'bg-red-500', pctVal: leadFunnelData.newLeads ? (leadFunnelData.rejected / leadFunnelData.newLeads) * 100 : 0 },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-600 text-sm">{item.label}</span>
                        <span className="text-gray-900 text-sm font-medium">{safe(item.value)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className={`${item.color} h-3 rounded-full`} style={{ width: `${Math.min(safe(item.pctVal), 100)}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 border-t flex items-center justify-between">
                    <span className="text-gray-900 font-medium">Conversion Rate</span>
                    <Badge className="bg-green-100 text-green-700">{safe(leadFunnelData.conversionRate)}%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lead Sources */}
            <Card>
              <CardHeader><CardTitle>Lead Sources</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leadSources.map((source, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-900 text-sm">{source.source}</span>
                        <span className="text-gray-600 text-sm">{safe(source.count)} ({safe(source.percentage)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(safe(source.percentage) * 3, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                  {leadSources.length === 0 && <p className="text-gray-400 text-center py-8">No lead source data</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Orders</CardTitle>
              <Button variant="outline" size="sm" onClick={exportRecentOrders}><Download className="w-4 h-4 mr-2" />Export</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-blue-600 font-medium text-sm">{order.id}</span>
                        <Badge variant="outline">{order.status}</Badge>
                      </div>
                      <p className="text-gray-900 text-sm">{order.customer}</p>
                      <p className="text-gray-500 text-xs">{order.product}</p>
                    </div>
                    <p className="text-gray-900 font-medium">{formatCurrency(order.value)}</p>
                  </div>
                ))}
                {recentOrders.length === 0 && <p className="text-gray-400 text-center py-8">No recent orders</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════ */}
        {/* TAB 3 — PRODUCTION                                  */}
        {/* ════════════════════════════════════════════════════ */}
        <TabsContent value="production" className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportProduction}><Download className="w-4 h-4 mr-2" />Export Production</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard icon={BarChart3} iconBg="bg-blue-100" iconColor="text-blue-600"
              label="Orders in Production" value={safe(productionData.ordersInProduction)} change="Active" changeTrend="neutral" />
            <MetricCard icon={Package} iconBg="bg-green-100" iconColor="text-green-600"
              label="Orders Completed" value={safe(productionData.ordersCompleted)} change="Done" changeTrend="up" />
            <MetricCard icon={Clock} iconBg="bg-purple-100" iconColor="text-purple-600"
              label="Avg Production Time" value={`${safe(productionData.avgProductionTime)} days`} change="Avg" changeTrend="neutral" />
          </div>

          <Card>
            <CardHeader><CardTitle>Production Quality Metrics</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-900">On-Time Delivery Rate</span>
                    <Badge className="bg-green-100 text-green-700">{pct(productionData.onTimeDelivery)}</Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className="bg-green-600 h-4 rounded-full" style={{ width: `${safe(productionData.onTimeDelivery)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-900">Quality Pass Rate</span>
                    <Badge className="bg-green-100 text-green-700">{pct(productionData.qualityPassRate)}</Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className="bg-green-600 h-4 rounded-full" style={{ width: `${safe(productionData.qualityPassRate)}%` }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Production by Stage</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {productionStages.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-gray-900">{item.stage}</span>
                    <Badge variant="outline">{safe(item.orders)} orders</Badge>
                  </div>
                ))}
                {productionStages.length === 0 && <p className="text-gray-400 text-center py-8">No stage data available</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════ */}
        {/* TAB 4 — FINANCE                                     */}
        {/* ════════════════════════════════════════════════════ */}
        <TabsContent value="finance" className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportFinance}><Download className="w-4 h-4 mr-2" />Export Finance</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard icon={DollarSign} iconBg="bg-green-100" iconColor="text-green-600"
              label="Total Revenue" value={formatCurrency(financeData.totalRevenue)} change="Income" changeTrend="up" />
            <MetricCard icon={CreditCard} iconBg="bg-red-100" iconColor="text-red-600"
              label="Total Expenses" value={formatCurrency(financeData.totalExpenses)} change="Cost" changeTrend="down" />
            <MetricCard icon={TrendingUp} iconBg="bg-blue-100" iconColor="text-blue-600"
              label="Net Profit" value={formatCurrency(financeData.netProfit)}
              change={`${safe(financeData.profitMargin)}% margin`} changeTrend="up" />
            <MetricCard icon={FileText} iconBg="bg-orange-100" iconColor="text-orange-600"
              label="Overdue Amount" value={formatCurrency(financeData.overdueAmount)} change="Pending" changeTrend="down" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Revenue by Month</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {revenueByMonth.map((item, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-12 text-gray-600 text-sm">{item.month}</div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-green-600 text-xs">Revenue: {formatCurrency(item.revenue)}</span>
                          <span className="text-red-500 text-xs">Expense: {formatCurrency(item.expense)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 relative">
                          <div className="bg-green-500 h-2.5 rounded-full absolute left-0" style={{ width: `${item.maxRevenue ? (safe(item.revenue) / item.maxRevenue) * 100 : 50}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                  {revenueByMonth.length === 0 && <p className="text-gray-400 text-center py-8">No revenue data available</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Expense Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {expenseBreakdown.map((item, i) => {
                    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500', 'bg-teal-500'];
                    return (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${colors[i % colors.length]}`} />
                          <span className="text-gray-900 text-sm">{item.category}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-900 text-sm font-medium">{formatCurrency(item.amount)}</span>
                          <span className="text-gray-500 text-xs ml-2">({safe(item.percentage)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                  {expenseBreakdown.length === 0 && <p className="text-gray-400 text-center py-8">No expense data available</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Invoice Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="text-gray-600 text-sm">Total Invoices</p>
                      <p className="text-2xl font-semibold text-gray-900">{safe(financeData.totalInvoices)}</p>
                    </div>
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <p className="text-green-700 text-lg font-semibold">{safe(financeData.paidInvoices)}</p>
                      <p className="text-green-600 text-xs">Paid</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg text-center">
                      <p className="text-red-700 text-lg font-semibold">{safe(financeData.unpaidInvoices)}</p>
                      <p className="text-red-600 text-xs">Unpaid</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 text-sm">Avg Payment Time</span>
                    <span className="text-gray-900 font-medium">{safe(financeData.avgPaymentDays)} days</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Invoice Aging</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoiceAging.length > 0 ? invoiceAging.map((bucket, i) => {
                    const bgColors = ['bg-green-50', 'bg-yellow-50', 'bg-orange-50', 'bg-red-50'];
                    return (
                      <div key={i} className={`p-4 ${bgColors[i % bgColors.length]} rounded-lg`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-900 font-medium text-sm capitalize">{bucket.status}</p>
                            <p className="text-gray-600 text-xs">{safe(bucket.count)} invoices</p>
                          </div>
                          <p className="text-gray-900 font-semibold">{formatCurrency(bucket.amount)}</p>
                        </div>
                      </div>
                    );
                  }) : (
                    <>
                      {[
                        { label: '0-30 Days', color: 'bg-green-50' },
                        { label: '31-60 Days', color: 'bg-yellow-50' },
                        { label: '61-90 Days', color: 'bg-orange-50' },
                        { label: '90+ Days', color: 'bg-red-50' },
                      ].map((b, i) => (
                        <div key={i} className={`p-4 ${b.color} rounded-lg`}>
                          <div className="flex items-center justify-between">
                            <p className="text-gray-900 font-medium text-sm">{b.label}</p>
                            <p className="text-gray-500">—</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Payroll Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <p className="text-gray-600 text-xs mb-1">Total Payroll</p>
                  <p className="text-xl font-semibold text-gray-900">{formatCurrency(financeData.totalPayroll)}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-gray-600 text-xs mb-1">Avg Salary</p>
                  <p className="text-xl font-semibold text-gray-900">{formatCurrency(financeData.avgSalary)}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg text-center">
                  <p className="text-gray-600 text-xs mb-1">Overtime Cost</p>
                  <p className="text-xl font-semibold text-gray-900">{formatCurrency(financeData.overtimeCost)}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg text-center">
                  <p className="text-gray-600 text-xs mb-1">Cash Flow</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {safe(financeData.cashInflow) - safe(financeData.cashOutflow) >= 0
                      ? <span className="text-green-600">+{formatCurrency(safe(financeData.cashInflow) - safe(financeData.cashOutflow))}</span>
                      : <span className="text-red-600">{formatCurrency(safe(financeData.cashInflow) - safe(financeData.cashOutflow))}</span>
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════ */}
        {/* TAB 5 — ORDERS & DISPATCH                           */}
        {/* ════════════════════════════════════════════════════ */}
        <TabsContent value="orders" className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportOrdersDispatch}><Download className="w-4 h-4 mr-2" />Export Orders</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard icon={ShoppingCart} iconBg="bg-blue-100" iconColor="text-blue-600"
              label="Total Orders" value={safe(ordersData.totalOrders)} />
            <MetricCard icon={DollarSign} iconBg="bg-green-100" iconColor="text-green-600"
              label="Avg Order Value" value={formatCurrency(ordersData.avgOrderValue)} />
            <MetricCard icon={Truck} iconBg="bg-purple-100" iconColor="text-purple-600"
              label="Total Dispatches" value={safe(ordersData.totalDispatches)} />
            <MetricCard icon={Timer} iconBg="bg-orange-100" iconColor="text-orange-600"
              label="Avg Delivery Time" value={`${safe(ordersData.avgDeliveryDays)} days`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Order Pipeline</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: 'Pending', value: ordersData.pendingOrders, color: 'bg-yellow-500' },
                    { label: 'Confirmed', value: ordersData.confirmedOrders, color: 'bg-blue-500' },
                    { label: 'In Production', value: ordersData.inProductionOrders, color: 'bg-purple-500' },
                    { label: 'Completed', value: ordersData.completedOrders, color: 'bg-green-500' },
                    { label: 'Cancelled', value: ordersData.cancelledOrders, color: 'bg-red-500' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="flex-1 text-gray-900 text-sm">{item.label}</span>
                      <span className="text-gray-900 font-semibold">{safe(item.value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Dispatch Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                      <p className="text-xl font-semibold text-green-700">{safe(ordersData.onTimeDispatches)}</p>
                      <p className="text-green-600 text-xs">On-Time</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg text-center">
                      <AlertTriangle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                      <p className="text-xl font-semibold text-red-700">{safe(ordersData.delayedDispatches)}</p>
                      <p className="text-red-600 text-xs">Delayed</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-blue-700 text-lg font-semibold">{safe(ordersData.inTransit)}</p>
                      <p className="text-blue-600 text-xs">In Transit</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <p className="text-green-700 text-lg font-semibold">{safe(ordersData.delivered)}</p>
                      <p className="text-green-600 text-xs">Delivered</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">SLA Compliance</span>
                      <Badge className="bg-green-100 text-green-700">
                        {ordersData.totalDispatches > 0
                          ? `${((safe(ordersData.onTimeDispatches) / safe(ordersData.totalDispatches)) * 100).toFixed(1)}%`
                          : '—'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {dispatchByRegion.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Dispatch by Region</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dispatchByRegion.map((region, i) => (
                    <ProgressRow key={i} label={region.region} value={safe(region.count)}
                      max={Math.max(...dispatchByRegion.map((r: any) => safe(r.count)), 1)}
                      color="bg-blue-600" suffix=" dispatches" />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {ordersByStatus.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Orders by Status</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ordersByStatus.map((item, i) => {
                    const statusColors: Record<string, string> = {
                      pending: 'bg-yellow-500', confirmed: 'bg-blue-500', 'in-production': 'bg-purple-500',
                      completed: 'bg-green-500', cancelled: 'bg-red-500', dispatched: 'bg-teal-500',
                    };
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className={`w-3 h-3 rounded-full ${statusColors[item.status?.toLowerCase()] ?? 'bg-gray-400'}`} />
                        <span className="flex-1 text-gray-900 text-sm capitalize">{item.status}</span>
                        <span className="text-gray-900 font-semibold">{safe(item.count)}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ════════════════════════════════════════════════════ */}
        {/* TAB 6 — SUPPLY CHAIN                                */}
        {/* ════════════════════════════════════════════════════ */}
        <TabsContent value="supply" className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportSupplyChain}><Download className="w-4 h-4 mr-2" />Export Supply Chain</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard icon={Box} iconBg="bg-blue-100" iconColor="text-blue-600"
              label="Raw Materials" value={formatCurrency(inventoryData.rawMaterialsValue)} />
            <MetricCard icon={Package} iconBg="bg-green-100" iconColor="text-green-600"
              label="Finished Goods" value={formatCurrency(inventoryData.finishedGoodsValue)} />
            <MetricCard icon={Warehouse} iconBg="bg-purple-100" iconColor="text-purple-600"
              label="WIP Value" value={formatCurrency(inventoryData.wipValue)} />
            <MetricCard icon={DollarSign} iconBg="bg-teal-100" iconColor="text-teal-600"
              label="Total Inventory" value={formatCurrency(safe(inventoryData.rawMaterialsValue) + safe(inventoryData.finishedGoodsValue) + safe(inventoryData.wipValue))} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Stock Alerts</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                    <div>
                      <p className="text-red-900 font-medium">Critical Stock</p>
                      <p className="text-red-700 text-sm">{safe(inventoryData.criticalStock)} items</p>
                    </div>
                    <Badge variant="destructive">Urgent</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50">
                    <div>
                      <p className="text-orange-900 font-medium">Low Stock</p>
                      <p className="text-orange-700 text-sm">{safe(inventoryData.lowStock)} items</p>
                    </div>
                    <Badge className="bg-orange-100 text-orange-700">Warning</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-blue-200 rounded-lg bg-blue-50">
                    <div>
                      <p className="text-blue-900 font-medium">Reorders Pending</p>
                      <p className="text-blue-700 text-sm">{safe(inventoryData.reordersPending)} requisitions</p>
                    </div>
                    <Badge variant="outline">Review</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div>
                      <p className="text-gray-900 font-medium">Dead Stock</p>
                      <p className="text-gray-600 text-sm">{safe(inventoryData.deadStockItems)} items (90+ days)</p>
                    </div>
                    <Badge variant="outline">Audit</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Stock Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Stock Turnover Ratio</span>
                      <span className="text-2xl font-semibold text-blue-700">{safe(inventoryData.stockTurnoverRatio).toFixed(1)}x</span>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="text-gray-900 font-medium mb-3">Fast-Moving Items</h4>
                    {fastMovingItems.length > 0 ? fastMovingItems.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-gray-900 text-sm">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 text-sm">{safe(item.stock)} units</span>
                          <Badge variant="outline" className="text-xs">{item.status || item.category}</Badge>
                        </div>
                      </div>
                    )) : <p className="text-gray-400 text-center py-4 text-sm">No data available</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Purchase Order Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Total POs</p>
                      <p className="text-xl font-semibold text-gray-900">{safe(poData.totalPOs)}</p>
                    </div>
                    <p className="text-blue-700 font-semibold">{formatCurrency(poData.totalPOValue)}</p>
                  </div>
                  {[
                    { label: 'Pending', value: poData.pendingPOs, color: 'text-yellow-600', dot: 'bg-yellow-500' },
                    { label: 'Approved', value: poData.approvedPOs, color: 'text-blue-600', dot: 'bg-blue-500' },
                    { label: 'Received', value: poData.receivedPOs, color: 'text-green-600', dot: 'bg-green-500' },
                    { label: 'Rejected', value: poData.rejectedPOs, color: 'text-red-600', dot: 'bg-red-500' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <div className={`w-3 h-3 rounded-full ${item.dot}`} />
                      <span className="flex-1 text-gray-700 text-sm">{item.label}</span>
                      <span className={`font-semibold ${item.color}`}>{safe(item.value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Vendor Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-lg font-semibold text-gray-900">{safe(vendorData.totalVendors)}</p>
                      <p className="text-gray-600 text-xs">Total Vendors</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <p className="text-lg font-semibold text-green-700">{safe(vendorData.activeVendors)}</p>
                      <p className="text-gray-600 text-xs">Active</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">Avg Rating</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-gray-900 font-medium">{safe(vendorData.avgRating).toFixed(1)} / 5</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">On-Time Supply</span>
                      <Badge className="bg-green-100 text-green-700">{pct(vendorData.onTimeSupplyRate)}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">Pending Payments</span>
                      <span className="text-red-600 font-medium">{formatCurrency(vendorData.pendingPayments)}</span>
                    </div>
                  </div>
                  {topVendors.length > 0 && (
                    <div className="border-t pt-3">
                      <h4 className="text-gray-900 font-medium mb-2 text-sm">Top Vendors</h4>
                      {topVendors.slice(0, 4).map((v, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5">
                          <span className="text-gray-700 text-sm">{v.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 text-xs">{formatCurrency(v.totalAmount)}</span>
                            <Badge variant="outline" className="text-xs">{v.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ════════════════════════════════════════════════════ */}
        {/* TAB 7 — HR                                          */}
        {/* ════════════════════════════════════════════════════ */}
        <TabsContent value="hr" className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportHR}><Download className="w-4 h-4 mr-2" />Export Staff Report</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard icon={Users} iconBg="bg-blue-100" iconColor="text-blue-600"
              label="Total Staff" value={safe(staffData.totalStaff)} />
            <MetricCard icon={UserCheck} iconBg="bg-green-100" iconColor="text-green-600"
              label="Avg Attendance" value={pct(attendanceData.avgAttendance)} />
            <MetricCard icon={ArrowUpRight} iconBg="bg-teal-100" iconColor="text-teal-600"
              label="New Hires (Month)" value={safe(staffData.newHires)} change="Joined" changeTrend="up" />
            <MetricCard icon={ArrowDownRight} iconBg="bg-red-100" iconColor="text-red-600"
              label="Attrition Rate" value={pct(staffData.attritionRate)} change={`${safe(staffData.exits)} exits`} changeTrend="down" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Attendance Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                      <p className="text-xl font-semibold text-gray-900">{safe(attendanceData.totalWorkers)}</p>
                      <p className="text-gray-600 text-xs">Total Workers</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <p className="text-xl font-semibold text-green-700">{safe(attendanceData.avgPresent).toFixed(0)}</p>
                      <p className="text-gray-600 text-xs">Avg Present/Day</p>
                    </div>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg flex items-center justify-between">
                    <span className="text-gray-600 text-sm">Total Hours (Month)</span>
                    <span className="text-gray-900 font-semibold">{safe(attendanceData.totalHoursThisMonth).toLocaleString()} hrs</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Department Headcount</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {departmentHeadcount.length > 0 ? departmentHeadcount.map((dept, i) => (
                    <ProgressRow key={i} label={dept.department} value={safe(dept.count)}
                      max={Math.max(...departmentHeadcount.map((d: any) => safe(d.count)), 1)}
                      color="bg-blue-600" />
                  )) : <p className="text-gray-400 text-center py-8">No department data available</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Attendance by Team</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {attendanceByTeam.map((team, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-900 text-sm">{team.team}</span>
                      <span className="text-gray-600 text-sm">{safe(team.present)}/{safe(team.total)} ({safe(team.percentage)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-green-600 h-3 rounded-full" style={{ width: `${safe(team.percentage)}%` }} />
                    </div>
                  </div>
                ))}
                {attendanceByTeam.length === 0 && <p className="text-gray-400 text-center py-8">No attendance team data</p>}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Payroll Overview</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 rounded-lg flex justify-between">
                    <span className="text-gray-600">Total Payroll</span>
                    <span className="text-gray-900 font-semibold">{formatCurrency(payrollData.totalPayroll)}</span>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg flex justify-between">
                    <span className="text-gray-600">Avg Salary</span>
                    <span className="text-gray-900 font-semibold">{formatCurrency(payrollData.avgSalary)}</span>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg flex justify-between">
                    <span className="text-gray-600">Overtime Cost</span>
                    <span className="text-orange-700 font-semibold">{formatCurrency(payrollData.totalOvertime)}</span>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg flex justify-between">
                    <span className="text-gray-600">Deductions</span>
                    <span className="text-red-700 font-semibold">{formatCurrency(payrollData.totalDeductions)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Payroll by Department</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payrollByDept.length > 0 ? payrollByDept.map((dept, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-gray-900 text-sm">{dept.department}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs">{safe(dept.count)} staff</span>
                        <span className="text-gray-900 font-medium text-sm">{formatCurrency(dept.totalSalary)}</span>
                      </div>
                    </div>
                  )) : <p className="text-gray-400 text-center py-8">No payroll data available</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Staff Metrics</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <Briefcase className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-xl font-semibold text-gray-900">{safe(staffData.avgTenure).toFixed(1)} yrs</p>
                  <p className="text-gray-600 text-xs">Avg Tenure</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <ArrowUpRight className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <p className="text-xl font-semibold text-green-700">{safe(staffData.newHires)}</p>
                  <p className="text-gray-600 text-xs">New Hires This Month</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg text-center">
                  <ArrowDownRight className="w-6 h-6 text-red-600 mx-auto mb-2" />
                  <p className="text-xl font-semibold text-red-700">{safe(staffData.exits)}</p>
                  <p className="text-gray-600 text-xs">Exits This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>
    </div>
  );
}
