import { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { useI18n } from '../contexts/I18nContext';
import { useSharedState } from '../contexts/SharedStateContext';
import {
  Users,
  ClipboardList,
  Truck,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
  IndianRupee,
  ShoppingCart,
  UserCheck,
  Briefcase,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  CreditCard,
  Target,
  Zap,
  CalendarDays,
  Factory,
  CircleDollarSign,
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  MapPin,
  Droplets,
  Wind,
  Sunset,
  Moon,
  Package,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
} from 'lucide-react';
import { Badge } from './ui/badge';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

import { dashboardService } from '../services/dashboard.service';

interface AdminDashboardProps {
  onNavigate: (view: string) => void;
  onViewOrder: (orderId: string) => void;
}

function formatCurrency(val: number): string {
  if (val >= 10000000) return '\u20B9' + (val / 10000000).toFixed(1) + 'Cr';
  if (val >= 100000) return '\u20B9' + (val / 100000).toFixed(1) + 'L';
  if (val >= 1000) return '\u20B9' + (val / 1000).toFixed(1) + 'K';
  return '\u20B9' + val.toFixed(0);
}

function getWeatherDescription(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 49) return 'Foggy';
  if (code <= 59) return 'Drizzle';
  if (code <= 69) return 'Rain';
  if (code <= 79) return 'Snow';
  if (code <= 82) return 'Rain showers';
  if (code <= 86) return 'Snow showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Cloudy';
}

function WeatherIcon({ code, className }: { code: number; className?: string }) {
  if (code === 0) return <Sun className={className} />;
  if (code <= 3) return <CloudSun className={className} />;
  if (code <= 49) return <CloudFog className={className} />;
  if (code <= 59) return <CloudDrizzle className={className} />;
  if (code <= 69) return <CloudRain className={className} />;
  if (code <= 79) return <CloudSnow className={className} />;
  if (code <= 86) return <CloudSnow className={className} />;
  if (code <= 99) return <CloudLightning className={className} />;
  return <Cloud className={className} />;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-slate-900 mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' && entry.value > 100 ? formatCurrency(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/* ── SVG radial gauge for attendance ── */
function RadialGauge({ value, total, size = 100 }: { value: number; total: number; size?: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={8} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeLinecap="round" strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-slate-900">{pct}%</span>
        <span className="text-[10px] text-slate-500">{value}/{total}</span>
      </div>
    </div>
  );
}

/* ── Custom pie chart label ── */
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function AdminDashboard({ onNavigate, onViewOrder }: AdminDashboardProps) {
  const { t } = useI18n();
  const { currentUser } = useSharedState();

  const [summary, setSummary] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [pendingLeads, setPendingLeads] = useState<any[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [orderStats, setOrderStats] = useState<any[]>([]);
  const [monthlyOrders, setMonthlyOrders] = useState<any[]>([]);
  const [paymentOverview, setPaymentOverview] = useState<any[]>([]);
  const [topClients, setTopClients] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [productionStatus, setProductionStatus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<{ temp: number; description: string; code: number; humidity: number; wind: number; city: string } | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`
          );
          const data = await res.json();
          const c = data.current;
          let city = '';
          try {
            const geo = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`);
            const geoData = await geo.json();
            city = geoData.address?.city || geoData.address?.town || geoData.address?.district || geoData.address?.state || '';
          } catch {}
          setWeather({
            temp: Math.round(c.temperature_2m),
            description: getWeatherDescription(c.weather_code),
            code: c.weather_code,
            humidity: c.relative_humidity_2m,
            wind: Math.round(c.wind_speed_10m),
            city,
          });
        } catch {}
      },
      () => {},
      { timeout: 5000 }
    );
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [
          summaryData, orders, lowStock, leads, revenue,
          oStats, mOrders, payOverview, clients, attendance, prodStatus,
        ] = await Promise.allSettled([
          dashboardService.getSummary(),
          dashboardService.getRecentOrders(),
          dashboardService.getLowStock(),
          dashboardService.getPendingLeads(),
          dashboardService.getRevenueTrend(),
          dashboardService.getOrderStats(),
          dashboardService.getMonthlyOrders(),
          dashboardService.getPaymentOverview(),
          dashboardService.getTopClients(),
          dashboardService.getAttendanceToday(),
          dashboardService.getProductionStatus(),
        ]);

        if (summaryData.status === 'fulfilled' && summaryData.value) setSummary(summaryData.value);
        if (orders.status === 'fulfilled' && Array.isArray(orders.value)) {
          setRecentOrders(orders.value.map((order: any) => {
            const p = (order.priority || '').toLowerCase();
            return {
              ...order,
              order_number: order.order_number || `ORD-${order.id}`,
              progress: order.progress ?? (order.status === 'Completed' ? 100 : order.status === 'In Production' ? 50 : 20),
              priority_key: p || 'medium',
              priority_color: p === 'high' ? 'bg-red-100 text-red-700'
                : p === 'low' ? 'bg-slate-100 text-slate-600'
                : 'bg-amber-100 text-amber-700',
            };
          }));
        }
        if (lowStock.status === 'fulfilled' && Array.isArray(lowStock.value)) setLowStockItems(lowStock.value);
        if (leads.status === 'fulfilled' && Array.isArray(leads.value)) setPendingLeads(leads.value);
        if (revenue.status === 'fulfilled' && Array.isArray(revenue.value)) setRevenueTrend(revenue.value);
        if (oStats.status === 'fulfilled' && Array.isArray(oStats.value)) setOrderStats(oStats.value);
        if (mOrders.status === 'fulfilled' && Array.isArray(mOrders.value)) setMonthlyOrders(mOrders.value);
        if (payOverview.status === 'fulfilled' && Array.isArray(payOverview.value)) setPaymentOverview(payOverview.value);
        if (clients.status === 'fulfilled' && Array.isArray(clients.value)) setTopClients(clients.value);
        if (attendance.status === 'fulfilled' && attendance.value) setAttendanceData(attendance.value);
        if (prodStatus.status === 'fulfilled' && Array.isArray(prodStatus.value)) setProductionStatus(prodStatus.value);
      } catch (_e) {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const attendanceGauge = useMemo(() => {
    if (!attendanceData?.summary) return null;
    const { total, present, absent } = attendanceData.summary;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, pct };
  }, [attendanceData]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good Morning', icon: Sun, bg: 'from-amber-400 to-orange-400' };
    if (hour < 17) return { text: 'Good Afternoon', icon: Sunset, bg: 'from-orange-400 to-rose-400' };
    return { text: 'Good Evening', icon: Moon, bg: 'from-indigo-400 to-purple-400' };
  }, []);

  const dateStr = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }, []);

  /* ── Compute totals for payment pie ── */
  const paymentTotal = useMemo(() => paymentOverview.reduce((s, i) => s + i.value, 0), [paymentOverview]);

  /* ── Order status color map ── */
  const statusColors: Record<string, string> = {
    'Pending': 'bg-amber-100 text-amber-700 border-amber-200',
    'Confirmed': 'bg-blue-100 text-blue-700 border-blue-200',
    'In Production': 'bg-violet-100 text-violet-700 border-violet-200',
    'Ready': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Dispatched': 'bg-cyan-100 text-cyan-700 border-cyan-200',
    'Delivered': 'bg-green-100 text-green-700 border-green-200',
    'Bill': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'Cancelled': 'bg-red-100 text-red-700 border-red-200',
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-16 rounded-xl bg-slate-200/60" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[...Array(8)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-slate-200/60" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-72 rounded-xl bg-slate-200/60" />
          <div className="h-72 rounded-xl bg-slate-200/60" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 rounded-xl bg-slate-200/60" />
          <div className="h-64 rounded-xl bg-slate-200/60" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ═══════════════════════════════════════════════════════════════════
          GREETING BANNER — compact, with weather inline
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${greeting.bg} text-white shadow-sm`}>
              <greeting.icon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800 leading-tight">
                {greeting.text}{currentUser?.name ? `, ${currentUser.name}` : ''}
              </h1>
              <p className="text-xs text-slate-500">{dateStr}</p>
            </div>
          </div>
          {weather && (
            <div className="hidden md:flex items-center gap-3">
              <WeatherIcon code={weather.code} className="h-7 w-7 text-slate-500" />
              <div className="text-right">
                <p className="text-lg font-bold text-slate-800 leading-tight">{weather.temp}°C</p>
                <p className="text-[11px] text-slate-500">{weather.description}</p>
              </div>
              <div className="h-8 w-px bg-slate-200 mx-1" />
              <div className="text-[11px] text-slate-500 space-y-0">
                {weather.city && <p className="flex items-center gap-1"><MapPin className="h-3 w-3" />{weather.city}</p>}
                <p className="flex items-center gap-1"><Droplets className="h-3 w-3" />{weather.humidity}% <Wind className="h-3 w-3 ml-1" />{weather.wind}km/h</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          KPI CARDS — 8 cards in a single row on large screens
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
        {[
          { title: 'Revenue', value: formatCurrency(summary?.totalRevenue || 0), icon: IndianRupee, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100', nav: 'finance' },
          { title: 'Outstanding', value: formatCurrency(summary?.totalOutstanding || 0), icon: CreditCard, color: 'text-rose-600', bg: 'bg-rose-50', ring: 'ring-rose-100', nav: 'billing' },
          { title: 'Orders', value: String(summary?.totalOrders ?? 0), sub: `${summary?.activeOrders ?? 0} active`, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-100', nav: 'orders' },
          { title: 'Clients', value: String(summary?.totalClients ?? 0), icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-50', ring: 'ring-cyan-100', nav: 'clients' },
          { title: 'Leads', value: String(summary?.activeLeads ?? 0), icon: Target, color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-100', nav: 'leads' },
          { title: 'Staff', value: String(summary?.totalStaff ?? 0), icon: UserCheck, color: 'text-indigo-600', bg: 'bg-indigo-50', ring: 'ring-indigo-100', nav: 'staff' },
          { title: 'Production', value: String(summary?.activeProduction ?? 0), sub: `${summary?.productionEfficiency ?? 0}% eff.`, icon: Factory, color: 'text-violet-600', bg: 'bg-violet-50', ring: 'ring-violet-100', nav: 'production' },
          { title: 'Stock Alerts', value: String(summary?.stockAlerts ?? 0), icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', ring: 'ring-orange-100', nav: 'stock', alert: (summary?.stockAlerts ?? 0) > 0 },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigate(kpi.nav)}
              className={`relative rounded-xl ${kpi.bg} ring-1 ${kpi.ring} p-3.5 cursor-pointer group transition-all duration-200 hover:shadow-md ${(kpi as any).alert ? 'animate-pulse-subtle' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-4.5 h-4.5 ${kpi.color}`} />
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
              <p className="text-[11px] font-medium text-slate-500 leading-tight">{kpi.title}</p>
              <p className={`text-xl font-bold ${kpi.color} leading-tight mt-0.5`}>{kpi.value}</p>
              {(kpi as any).sub && <p className="text-[10px] text-slate-400 mt-0.5">{(kpi as any).sub}</p>}
            </motion.div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          ROW 2: Revenue Trend + Order Status Donut + Quick Metrics
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Revenue Trend — 7 cols */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-7"
        >
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden h-full">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 leading-tight">Revenue Trend</h2>
                  <p className="text-[11px] text-slate-500">Last 6 months</p>
                </div>
              </div>
              <Button onClick={() => onNavigate('finance')} variant="ghost" className="text-[11px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-medium rounded-lg h-7 px-2">
                View Finance <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="p-4 pb-3">
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={revenueTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="billedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v)} width={50} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="billed" name="Total Billed" stroke="#6366f1" strokeWidth={2} fill="url(#billedGrad)" />
                  <Area type="monotone" dataKey="revenue" name="Revenue (Paid)" stroke="#10b981" strokeWidth={2.5} fill="url(#revenueGrad)" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-5 mt-1">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span className="text-[11px] text-slate-500">Revenue (Paid)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500" /><span className="text-[11px] text-slate-500">Total Billed</span></div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Order Status Donut — 3 cols */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="lg:col-span-3"
        >
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2.5">
              <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                <PieChartIcon className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 leading-tight">Order Status</h2>
                <p className="text-[11px] text-slate-500">Distribution</p>
              </div>
            </div>
            <div className="p-3 flex-1 flex flex-col items-center justify-center">
              {orderStats.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={orderStats} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={2} dataKey="value" label={renderCustomLabel} labelLine={false}>
                        {orderStats.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any, name: string) => [value, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 w-full px-1">
                    {orderStats.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-[10px] text-slate-500 truncate">{s.name}</span>
                        <span className="text-[10px] font-bold text-slate-700 ml-auto">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400 py-8">No orders yet</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Quick Metrics Column — 2 cols */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="lg:col-span-2 flex flex-col gap-3"
        >
          {/* Attendance Gauge */}
          <div
            onClick={() => onNavigate('attendance')}
            className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 flex flex-col items-center cursor-pointer hover:shadow-md transition-all flex-1"
          >
            <div className="flex items-center gap-1.5 self-start mb-2">
              <CalendarDays className="w-3.5 h-3.5 text-cyan-600" />
              <span className="text-[11px] font-semibold text-slate-700">Attendance</span>
            </div>
            {attendanceGauge ? (
              <RadialGauge value={attendanceGauge.present} total={attendanceGauge.total} size={90} />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-xs text-slate-400">No data</span>
              </div>
            )}
          </div>

          {/* Completed this week + Avg time */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            <div
              onClick={() => onNavigate('orders')}
              className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-3.5 border border-emerald-200/60 cursor-pointer hover:shadow-md transition-all"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mb-1.5" />
              <p className="text-[10px] font-medium text-emerald-600/80 uppercase tracking-wider">This Week</p>
              <p className="text-xl font-bold text-emerald-800 leading-tight">{summary?.completedThisWeek ?? 0}</p>
              <p className="text-[10px] text-emerald-600/60">completed</p>
            </div>
            <div
              onClick={() => onNavigate('production')}
              className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-3.5 border border-blue-200/60 cursor-pointer hover:shadow-md transition-all"
            >
              <Clock className="w-4 h-4 text-blue-600 mb-1.5" />
              <p className="text-[10px] font-medium text-blue-600/80 uppercase tracking-wider">Avg. Time</p>
              <p className="text-xl font-bold text-blue-800 leading-tight">{summary?.avgProductionTime ?? 0}<span className="text-xs ml-0.5 font-medium text-blue-600/60">d</span></p>
              <p className="text-[10px] text-blue-600/60">production</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          ROW 3: Monthly Orders Bar + Payment Pie + Dispatch/Production
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Monthly Orders — 5 cols */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="lg:col-span-5"
        >
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden h-full">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-3.5 h-3.5 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 leading-tight">Monthly Orders</h2>
                  <p className="text-[11px] text-slate-500">Last 6 months</p>
                </div>
              </div>
              <Button onClick={() => onNavigate('orders')} variant="ghost" className="text-[11px] text-violet-600 hover:text-violet-700 hover:bg-violet-50 font-medium rounded-lg h-7 px-2">
                All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="p-4 pb-2">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={monthlyOrders} margin={{ top: 5, right: 5, left: -15, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Total" fill="#8b5cf6" radius={[3, 3, 0, 0]} barSize={16} />
                  <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[3, 3, 0, 0]} barSize={16} />
                  <Bar dataKey="cancelled" name="Cancelled" fill="#ef4444" radius={[3, 3, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-4 mt-1">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-violet-500" /><span className="text-[10px] text-slate-500">Total</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-green-500" /><span className="text-[10px] text-slate-500">Done</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-red-500" /><span className="text-[10px] text-slate-500">Cancelled</span></div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Payment Overview — Pie + list — 4 cols */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="lg:col-span-4"
        >
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
                  <CircleDollarSign className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 leading-tight">Payments</h2>
                  <p className="text-[11px] text-slate-500">Total: {formatCurrency(paymentTotal)}</p>
                </div>
              </div>
              <Button onClick={() => onNavigate('billing')} variant="ghost" className="text-[11px] text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-medium rounded-lg h-7 px-2">
                Bills <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="p-3 flex-1 flex flex-col">
              {paymentOverview.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={paymentOverview} cx="50%" cy="50%" innerRadius={35} outerRadius={58} paddingAngle={2} dataKey="value" label={renderCustomLabel} labelLine={false}>
                        {paymentOverview.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [formatCurrency(value as number), 'Amount']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {paymentOverview.map((item, idx) => {
                      const pct = paymentTotal > 0 ? Math.round((item.value / paymentTotal) * 100) : 0;
                      return (
                        <div key={idx} className="flex items-center gap-2 text-[11px]">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-600">{item.name}</span>
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-auto">{item.count}</Badge>
                          <span className="font-bold text-slate-800 w-16 text-right">{formatCurrency(item.value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-xs text-slate-400">No billing data yet</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Dispatches + Production + Efficiency — 3 cols */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="lg:col-span-3 flex flex-col gap-3"
        >
          <div onClick={() => onNavigate('dispatch')} className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-xl p-3.5 border border-teal-200/60 cursor-pointer hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-1">
              <Truck className="w-4 h-4 text-teal-600" />
              <ArrowUpRight className="w-3.5 h-3.5 text-teal-300 group-hover:text-teal-500 transition-colors" />
            </div>
            <p className="text-[10px] font-medium text-teal-600/80 uppercase tracking-wider">Pending Dispatch</p>
            <p className="text-2xl font-bold text-teal-800 leading-tight">{summary?.pendingDispatches ?? 0}</p>
          </div>
          <div onClick={() => onNavigate('production')} className="bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-xl p-3.5 border border-violet-200/60 cursor-pointer hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-1">
              <Zap className="w-4 h-4 text-violet-600" />
              <ArrowUpRight className="w-3.5 h-3.5 text-violet-300 group-hover:text-violet-500 transition-colors" />
            </div>
            <p className="text-[10px] font-medium text-violet-600/80 uppercase tracking-wider">Efficiency</p>
            <p className="text-2xl font-bold text-violet-800 leading-tight">{summary?.productionEfficiency ?? 0}%</p>
            <div className="mt-1.5 w-full bg-violet-200/50 rounded-full h-1.5 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${summary?.productionEfficiency ?? 0}%` }} transition={{ duration: 1 }} className="h-1.5 rounded-full bg-violet-600" />
            </div>
          </div>
          <div onClick={() => onNavigate('stock')} className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-3.5 border border-orange-200/60 cursor-pointer hover:shadow-md transition-all group flex-1">
            <div className="flex items-center justify-between mb-1">
              <Package className="w-4 h-4 text-orange-600" />
              <ArrowUpRight className="w-3.5 h-3.5 text-orange-300 group-hover:text-orange-500 transition-colors" />
            </div>
            <p className="text-[10px] font-medium text-orange-600/80 uppercase tracking-wider">Low Stock</p>
            <p className="text-2xl font-bold text-orange-800 leading-tight">{lowStockItems.length}</p>
            <p className="text-[10px] text-orange-600/60">items need reorder</p>
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          ROW 4: Recent Orders Table + Inventory Alerts
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Recent Orders — 8 cols */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="lg:col-span-8"
        >
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 leading-tight">Recent Orders</h2>
                  <p className="text-[11px] text-slate-500">{recentOrders.length} orders</p>
                </div>
              </div>
              <Button onClick={() => onNavigate('orders')} variant="ghost" className="text-[11px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium rounded-lg h-7 px-2">
                {t('viewAll')} <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            {recentOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/80">
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Order</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Product</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Progress</th>
                      <th className="px-3 py-2.5 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentOrders.slice(0, 8).map((order, idx) => (
                      <motion.tr
                        key={order.order_number}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.45 + idx * 0.03 }}
                        className="hover:bg-slate-50/60 cursor-pointer transition-colors group"
                        onClick={() => onViewOrder(order.order_number)}
                      >
                        <td className="px-4 py-2.5">
                          <span className="text-xs font-semibold text-blue-600">{order.order_number}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs text-slate-700 font-medium truncate block max-w-[140px]">{order.customer || '-'}</span>
                        </td>
                        <td className="px-4 py-2.5 hidden md:table-cell">
                          <span className="text-xs text-slate-500 truncate block max-w-[160px]">{order.product || '-'}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium inline-block ${statusColors[order.status] || 'bg-slate-100 text-slate-600'}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${order.progress}%` }} />
                            </div>
                            <span className="text-[10px] font-semibold text-slate-600 w-7 text-right">{order.progress}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <Eye className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center">
                <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No orders yet</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Inventory Alerts — 4 cols */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="lg:col-span-4"
        >
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 leading-tight">{t('inventoryAlerts')}</h2>
                  <p className="text-[11px] text-slate-500">{lowStockItems.length} items</p>
                </div>
              </div>
              <Button onClick={() => onNavigate('inventory')} variant="ghost" className="text-[11px] text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-medium rounded-lg h-7 px-2">
                {t('manage')}
              </Button>
            </div>
            <div className="flex-1 divide-y divide-slate-50 overflow-y-auto max-h-[340px]">
              {lowStockItems.slice(0, 8).map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.04 }}
                  className="px-4 py-2.5 hover:bg-amber-50/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-slate-800 font-medium truncate max-w-[160px]">{item.material}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${item.status === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percentage}%` }}
                        transition={{ duration: 0.8, delay: 0.5 + idx * 0.04 }}
                        className={`h-1.5 rounded-full ${item.status === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">{item.current}/{item.reorder}</span>
                  </div>
                </motion.div>
              ))}
              {lowStockItems.length === 0 && (
                <div className="py-10 text-center">
                  <CheckCircle2 className="w-7 h-7 text-emerald-300 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-400">All stock levels healthy</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          ROW 5: Top Clients + Pending Leads
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Clients */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 leading-tight">Top Clients</h2>
                  <p className="text-[11px] text-slate-500">By revenue</p>
                </div>
              </div>
              <Button onClick={() => onNavigate('clients')} variant="ghost" className="text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-medium rounded-lg h-7 px-2">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            {topClients.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {topClients.map((client, idx) => {
                  const maxRev = topClients[0]?.revenue || 1;
                  const pct = Math.round((client.revenue / maxRev) * 100);
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.55 + idx * 0.04 }}
                      className="px-5 py-3 hover:bg-indigo-50/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {(client.name || '?')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-slate-800 truncate">{client.name}</p>
                            <p className="text-xs font-bold text-slate-900">{formatCurrency(client.revenue)}</p>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-[10px] text-slate-500">{client.orders} orders</p>
                            {client.outstanding > 0 && (
                              <p className="text-[10px] text-rose-500 font-medium flex items-center gap-0.5">
                                <ArrowDownRight className="w-2.5 h-2.5" />Due: {formatCurrency(client.outstanding)}
                              </p>
                            )}
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden mt-1.5">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, delay: 0.55 + idx * 0.04 }}
                              className="h-1 rounded-full bg-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center">
                <Users className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs text-slate-400">No client data yet</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Pending Leads */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden h-full">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Target className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 leading-tight">{t('pendingLeads')}</h2>
                  <p className="text-[11px] text-slate-500">{pendingLeads.length} pending</p>
                </div>
              </div>
              <Button onClick={() => onNavigate('leads')} variant="ghost" className="text-[11px] text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-medium rounded-lg h-7 px-2">
                {t('viewAllLeads')} <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            {pendingLeads.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {pendingLeads.map((lead, idx) => {
                  const leadColors: Record<string, string> = {
                    'New': 'bg-blue-100 text-blue-700',
                    'Contacted': 'bg-cyan-100 text-cyan-700',
                    'Qualified': 'bg-emerald-100 text-emerald-700',
                    'Negotiation': 'bg-amber-100 text-amber-700',
                  };
                  return (
                    <motion.div
                      key={lead.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + idx * 0.04 }}
                      className="px-5 py-3 hover:bg-amber-50/30 cursor-pointer transition-colors"
                      onClick={() => onNavigate('leads')}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-amber-600 font-semibold">{lead.id}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${leadColors[lead.status] || 'bg-slate-100 text-slate-600'}`}>
                            {lead.status}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[9px] px-1.5 h-4">{lead.source}</Badge>
                      </div>
                      <p className="text-xs text-slate-700 font-medium">{lead.customer}</p>
                      <p className="text-[11px] text-slate-500 truncate">{lead.product}</p>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center">
                <Target className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs text-slate-400">No pending leads</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          ROW 6: Active Production Cards (conditional)
         ═══════════════════════════════════════════════════════════════════ */}
      {productionStatus.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 leading-tight">Active Production</h2>
                  <p className="text-[11px] text-slate-500">{productionStatus.length} in progress</p>
                </div>
              </div>
              <Button onClick={() => onNavigate('production')} variant="ghost" className="text-[11px] text-purple-600 hover:text-purple-700 hover:bg-purple-50 font-medium rounded-lg h-7 px-2">
                View Board <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {productionStatus.slice(0, 8).map((prod: any, idx: number) => {
                  const progress = prod.progress ?? 0;
                  const riskColor = prod.delay_risk === 'high' ? 'border-red-200 bg-red-50/40'
                    : prod.delay_risk === 'medium' ? 'border-amber-200 bg-amber-50/40'
                    : 'border-slate-200 bg-slate-50/40';
                  return (
                    <motion.div
                      key={prod.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.65 + idx * 0.04 }}
                      className={`p-3 rounded-lg border ${riskColor} transition-all hover:shadow-sm`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-purple-600">
                          {prod.order?.order_number || prod.order_number || `PO-${prod.id}`}
                        </span>
                        <Badge variant={prod.status === 'In Progress' ? 'default' : 'secondary'} className="text-[9px] px-1.5 py-0">
                          {prod.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-700 font-medium mb-1 truncate">{prod.customer || prod.product}</p>
                      {prod.stage_name && (
                        <p className="text-[10px] text-slate-500 mb-1.5">Stage: {prod.stage_name}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200/60 rounded-full h-1.5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8 }}
                            className="h-1.5 rounded-full bg-purple-500"
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-600">{progress}%</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
