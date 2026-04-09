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
  Thermometer,
  MapPin,
  Droplets,
  Wind,
  Sunset,
  Moon,
} from 'lucide-react';
import { Badge } from './ui/badge';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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
    // Fetch weather using Open-Meteo (free, no API key)
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`
          );
          const data = await res.json();
          const c = data.current;
          // Reverse geocode for city name
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

  const kpiCards = useMemo(() => {
    if (!summary) return [];
    return [
      { title: 'Total Revenue', value: formatCurrency(summary.totalRevenue || 0), icon: IndianRupee, bg: 'from-emerald-500 to-emerald-600', nav: 'finance' },
      { title: 'Outstanding', value: formatCurrency(summary.totalOutstanding || 0), icon: CreditCard, bg: 'from-rose-500 to-rose-600', nav: 'billing' },
      { title: 'Total Orders', value: String(summary.totalOrders ?? 0), icon: ShoppingCart, bg: 'from-blue-500 to-blue-600', nav: 'orders' },
      { title: 'Active Orders', value: String(summary.activeOrders ?? 0), icon: ClipboardList, bg: 'from-violet-500 to-violet-600', nav: 'orders' },
      { title: 'Total Clients', value: String(summary.totalClients ?? 0), icon: Users, bg: 'from-cyan-500 to-cyan-600', nav: 'clients' },
      { title: 'Active Leads', value: String(summary.activeLeads ?? 0), icon: Target, bg: 'from-amber-500 to-amber-600', nav: 'leads' },
      { title: 'Total Staff', value: String(summary.totalStaff ?? 0), icon: UserCheck, bg: 'from-indigo-500 to-indigo-600', nav: 'staff' },
      { title: 'Stock Alerts', value: String(summary.stockAlerts ?? 0), icon: AlertTriangle, bg: 'from-orange-500 to-orange-600', nav: 'stock' },
    ];
  }, [summary]);

  const attendanceGauge = useMemo(() => {
    if (!attendanceData?.summary) return null;
    const { total, present } = attendanceData.summary;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, pct };
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

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-200/60" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 rounded-xl bg-slate-200/60" />
          <div className="h-80 rounded-xl bg-slate-200/60" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ===== Greeting Banner ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${greeting.bg} text-white shadow-sm`}>
              <greeting.icon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">
                {greeting.text}{currentUser?.name ? `, ${currentUser.name}` : ''}
              </h1>
              <p className="text-sm text-slate-500">{dateStr}</p>
            </div>
          </div>
          {weather && (
            <div className="hidden md:flex items-center gap-3 text-right">
              <div className="flex items-center gap-2">
                <WeatherIcon code={weather.code} className="h-8 w-8 text-slate-600" />
                <div>
                  <p className="text-xl font-semibold text-slate-800">{weather.temp}°C</p>
                  <p className="text-xs text-slate-500">{weather.description}</p>
                </div>
              </div>
              <div className="h-10 w-px bg-slate-200" />
              <div className="text-xs text-slate-500 space-y-0.5">
                {weather.city && (
                  <p className="flex items-center gap-1 justify-end"><MapPin className="h-3 w-3" />{weather.city}</p>
                )}
                <p className="flex items-center gap-1 justify-end"><Droplets className="h-3 w-3" />{weather.humidity}%</p>
                <p className="flex items-center gap-1 justify-end"><Wind className="h-3 w-3" />{weather.wind} km/h</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== ROW 1: KPI Cards ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onNavigate(kpi.nav)}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="relative overflow-hidden rounded-xl bg-white border border-slate-200/80 shadow-sm hover:shadow-lg p-5 cursor-pointer group transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 bg-gradient-to-br ${kpi.bg} rounded-lg flex items-center justify-center shadow-sm`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{kpi.title}</p>
              <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${kpi.bg} opacity-0 group-hover:opacity-100 transition-opacity`} />
            </motion.div>
          );
        })}
      </div>

      {/* ===== ROW 2: Revenue Trend + Order Status Donut ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Revenue Trend</h2>
                  <p className="text-xs text-slate-500">Last 6 months</p>
                </div>
              </div>
              <Button onClick={() => onNavigate('finance')} variant="ghost" className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-medium rounded-lg h-8">
                View Finance <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="billedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="billed" name="Billed" stroke="#6366f1" strokeWidth={2} fill="url(#billedGrad)" />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#revenueGrad)" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-6 mt-2">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-xs text-slate-600">Revenue (Paid)</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500" /><span className="text-xs text-slate-600">Total Billed</span></div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <PieChartIcon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Order Status</h2>
                  <p className="text-xs text-slate-500">Distribution</p>
                </div>
              </div>
            </div>
            <div className="p-4 flex flex-col items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={orderStats} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {orderStats.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [value, 'Orders']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-2 w-full px-2">
                {orderStats.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-slate-600 truncate">{s.name}</span>
                    <span className="text-xs font-semibold text-slate-900 ml-auto">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ===== ROW 3: Monthly Orders + Payment Overview ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Monthly Orders</h2>
                  <p className="text-xs text-slate-500">Last 6 months</p>
                </div>
              </div>
              <Button onClick={() => onNavigate('orders')} variant="ghost" className="text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50 font-medium rounded-lg h-8">
                View Orders <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyOrders} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Total" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="cancelled" name="Cancelled" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-6 mt-2">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-violet-500" /><span className="text-xs text-slate-600">Total</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-500" /><span className="text-xs text-slate-600">Completed</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-500" /><span className="text-xs text-slate-600">Cancelled</span></div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <CircleDollarSign className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Payment Overview</h2>
                  <p className="text-xs text-slate-500">Bill status breakdown</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {paymentOverview.map((item, idx) => {
                const total = paymentOverview.reduce((s, i) => s + i.value, 0);
                const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + idx * 0.05 }}
                    className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm font-medium text-slate-700">{item.name}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{item.count} bills</Badge>
                      </div>
                      <span className="text-sm font-bold text-slate-900">{formatCurrency(item.value)}</span>
                    </div>
                    <div className="relative w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.5 + idx * 0.05 }}
                        className="h-1.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                  </motion.div>
                );
              })}
              {paymentOverview.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">No billing data yet</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ===== ROW 4: Quick Stats (Attendance, Efficiency, Completed, Avg Time) ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ y: -2 }}
          onClick={() => onNavigate('attendance')}
          className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 rounded-xl p-5 border border-cyan-200/60 cursor-pointer group transition-all hover:shadow-md"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center shadow-sm">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <ArrowRight className="w-4 h-4 text-cyan-300 group-hover:text-cyan-500 ml-auto group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-xs font-medium text-cyan-600/80 uppercase tracking-wider mb-1">Today's Attendance</p>
          <p className="text-2xl font-bold text-cyan-800">
            {attendanceGauge ? `${attendanceGauge.present}/${attendanceGauge.total}` : '\u2014'}
          </p>
          {attendanceGauge && (
            <div className="mt-2">
              <div className="relative w-full bg-cyan-200/50 rounded-full h-1.5 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${attendanceGauge.pct}%` }} transition={{ duration: 1 }} className="h-1.5 rounded-full bg-cyan-600" />
              </div>
              <p className="text-[10px] text-cyan-600/70 mt-1">{attendanceGauge.pct}% present</p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          whileHover={{ y: -2 }}
          onClick={() => onNavigate('production')}
          className="bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-xl p-5 border border-violet-200/60 cursor-pointer group transition-all hover:shadow-md"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-violet-500 rounded-lg flex items-center justify-center shadow-sm">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <ArrowRight className="w-4 h-4 text-violet-300 group-hover:text-violet-500 ml-auto group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-xs font-medium text-violet-600/80 uppercase tracking-wider mb-1">{t('productionEfficiency')}</p>
          <p className="text-2xl font-bold text-violet-800">{summary?.productionEfficiency ?? 0}%</p>
          <div className="mt-2">
            <div className="relative w-full bg-violet-200/50 rounded-full h-1.5 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${summary?.productionEfficiency ?? 0}%` }} transition={{ duration: 1 }} className="h-1.5 rounded-full bg-violet-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileHover={{ y: -2 }}
          onClick={() => onNavigate('orders')}
          className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-5 border border-emerald-200/60 cursor-pointer group transition-all hover:shadow-md"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-300 group-hover:text-emerald-500 ml-auto group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-xs font-medium text-emerald-600/80 uppercase tracking-wider mb-1">{t('completedThisWeek')}</p>
          <p className="text-2xl font-bold text-emerald-800">{summary?.completedThisWeek ?? 0} <span className="text-sm font-medium text-emerald-600/70">{t('ordersLabel')}</span></p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          whileHover={{ y: -2 }}
          onClick={() => onNavigate('production')}
          className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-5 border border-blue-200/60 cursor-pointer group transition-all hover:shadow-md"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shadow-sm">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <ArrowRight className="w-4 h-4 text-blue-300 group-hover:text-blue-500 ml-auto group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-xs font-medium text-blue-600/80 uppercase tracking-wider mb-1">{t('avgProductionTime')}</p>
          <p className="text-2xl font-bold text-blue-800">{summary?.avgProductionTime ?? 0} <span className="text-sm font-medium text-blue-600/70">{t('days')}</span></p>
        </motion.div>
      </div>

      {/* ===== ROW 5: Orders in Production + Inventory Alerts ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Factory className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">{t('ordersInProduction')}</h2>
                  <p className="text-xs text-slate-500">{recentOrders.length} active orders</p>
                </div>
              </div>
              <Button onClick={() => onNavigate('production')} variant="ghost" className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium rounded-lg h-8">
                {t('viewAll')} <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
            <div className="divide-y divide-slate-100">
              {recentOrders.slice(0, 6).map((order, idx) => (
                <motion.div
                  key={order.order_number}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 + idx * 0.05 }}
                  className="px-6 py-3.5 hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  onClick={() => onViewOrder(order.order_number)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-blue-600 font-semibold">{order.order_number}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${order.priority_color}`}>
                        {t(order.priority_key as any)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{order.status}</span>
                      <span className="text-xs font-semibold text-blue-600">{order.progress}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-700 font-medium truncate max-w-[200px]">{order.customer}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[180px]">{order.product}</p>
                  </div>
                  <div className="relative w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${order.progress}%` }}
                      transition={{ duration: 0.8, delay: 0.55 + idx * 0.05 }}
                      className="bg-blue-500 h-1.5 rounded-full"
                    />
                  </div>
                </motion.div>
              ))}
              {recentOrders.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">No orders in production</p>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">{t('inventoryAlerts')}</h2>
                  <p className="text-xs text-slate-500">{lowStockItems.length} items low</p>
                </div>
              </div>
              <Button onClick={() => onNavigate('inventory')} variant="ghost" className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-medium rounded-lg h-8">
                {t('manage')}
              </Button>
            </div>
            <div className="divide-y divide-slate-50">
              {lowStockItems.slice(0, 6).map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + idx * 0.05 }}
                  className="px-6 py-3 hover:bg-amber-50/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm text-slate-800 font-medium truncate max-w-[160px]">{item.material}</p>
                    <Badge variant={item.status === 'critical' ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0">
                      {item.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                    <span>{item.current} / {item.reorder} {t('units')}</span>
                    <span className={`font-semibold ${item.status === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>
                      {item.percentage}%
                    </span>
                  </div>
                  <div className="relative w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      transition={{ duration: 0.8, delay: 0.6 + idx * 0.05 }}
                      className={`h-1.5 rounded-full ${item.status === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`}
                    />
                  </div>
                </motion.div>
              ))}
              {lowStockItems.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">All stock levels healthy</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ===== ROW 6: Top Clients + Pending Leads ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Top Clients</h2>
                  <p className="text-xs text-slate-500">By revenue</p>
                </div>
              </div>
              <Button onClick={() => onNavigate('clients')} variant="ghost" className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-medium rounded-lg h-8">
                View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
            <div className="divide-y divide-slate-50">
              {topClients.map((client, idx) => {
                const maxRev = topClients[0]?.revenue || 1;
                const pct = Math.round((client.revenue / maxRev) * 100);
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.65 + idx * 0.05 }}
                    className="px-6 py-3.5 hover:bg-indigo-50/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600">
                          {(client.name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800 truncate max-w-[160px]">{client.name}</p>
                          <p className="text-[10px] text-slate-500">{client.orders} orders</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">{formatCurrency(client.revenue)}</p>
                        {client.outstanding > 0 && (
                          <p className="text-[10px] text-rose-500">Due: {formatCurrency(client.outstanding)}</p>
                        )}
                      </div>
                    </div>
                    <div className="relative w-full bg-slate-100 rounded-full h-1 overflow-hidden mt-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.65 + idx * 0.05 }}
                        className="h-1 rounded-full bg-indigo-500"
                      />
                    </div>
                  </motion.div>
                );
              })}
              {topClients.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">No client data yet</p>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">{t('pendingLeads')}</h2>
                  <p className="text-xs text-slate-500">{pendingLeads.length} pending</p>
                </div>
              </div>
              <Button onClick={() => onNavigate('leads')} variant="ghost" className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-medium rounded-lg h-8">
                {t('viewAllLeads')} <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
            <div className="divide-y divide-slate-50">
              {pendingLeads.map((lead, idx) => {
                const statusColors: Record<string, string> = {
                  'New': 'bg-blue-100 text-blue-700',
                  'Contacted': 'bg-cyan-100 text-cyan-700',
                  'Qualified': 'bg-emerald-100 text-emerald-700',
                  'Negotiation': 'bg-amber-100 text-amber-700',
                };
                return (
                  <motion.div
                    key={lead.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + idx * 0.05 }}
                    className="px-6 py-3.5 hover:bg-amber-50/30 cursor-pointer transition-colors"
                    onClick={() => onNavigate('leads')}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-amber-600 font-semibold">{lead.id}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[lead.status] || 'bg-slate-100 text-slate-600'}`}>
                          {lead.status}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] px-1.5">{lead.source}</Badge>
                    </div>
                    <p className="text-sm text-slate-700 font-medium">{lead.customer}</p>
                    <p className="text-xs text-slate-500">{lead.product}</p>
                  </motion.div>
                );
              })}
              {pendingLeads.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">No pending leads</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ===== ROW 7: Active Production Status ===== */}
      {productionStatus.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Active Production</h2>
                  <p className="text-xs text-slate-500">{productionStatus.length} in progress</p>
                </div>
              </div>
              <Button onClick={() => onNavigate('production')} variant="ghost" className="text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 font-medium rounded-lg h-8">
                View Board <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {productionStatus.slice(0, 6).map((prod: any, idx: number) => {
                  const progress = prod.progress ?? 0;
                  const riskColor = prod.delay_risk === 'high' ? 'border-red-200 bg-red-50/30'
                    : prod.delay_risk === 'medium' ? 'border-amber-200 bg-amber-50/30'
                    : 'border-slate-200 bg-slate-50/30';
                  return (
                    <motion.div
                      key={prod.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.75 + idx * 0.05 }}
                      className={`p-4 rounded-lg border ${riskColor} transition-all hover:shadow-sm`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-purple-600">
                          {prod.order?.order_number || prod.order_number || `PO-${prod.id}`}
                        </span>
                        <Badge variant={prod.status === 'In Progress' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                          {prod.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-700 font-medium mb-1 truncate">{prod.customer || prod.product}</p>
                      {prod.stage_name && (
                        <p className="text-xs text-slate-500 mb-2">Stage: {prod.stage_name}</p>
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

      {/* ===== ROW 8: Bottom Summary Strip ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <div onClick={() => onNavigate('dispatch')} className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-xl p-5 border border-teal-200/60 cursor-pointer hover:shadow-md transition-all group">
          <div className="flex items-center gap-3 mb-2">
            <Truck className="w-5 h-5 text-teal-600" />
            <ArrowRight className="w-3.5 h-3.5 text-teal-300 group-hover:text-teal-500 ml-auto group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-xs font-medium text-teal-600/80 uppercase tracking-wider">Pending Dispatches</p>
          <p className="text-2xl font-bold text-teal-800">{summary?.pendingDispatches ?? 0}</p>
        </div>

        <div onClick={() => onNavigate('production')} className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-5 border border-purple-200/60 cursor-pointer hover:shadow-md transition-all group">
          <div className="flex items-center gap-3 mb-2">
            <Factory className="w-5 h-5 text-purple-600" />
            <ArrowRight className="w-3.5 h-3.5 text-purple-300 group-hover:text-purple-500 ml-auto group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-xs font-medium text-purple-600/80 uppercase tracking-wider">In Production</p>
          <p className="text-2xl font-bold text-purple-800">{summary?.activeProduction ?? 0}</p>
        </div>

        <div onClick={() => onNavigate('billing')} className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-5 border border-green-200/60 cursor-pointer hover:shadow-md transition-all group">
          <div className="flex items-center gap-3 mb-2">
            <IndianRupee className="w-5 h-5 text-green-600" />
            <ArrowRight className="w-3.5 h-3.5 text-green-300 group-hover:text-green-500 ml-auto group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-xs font-medium text-green-600/80 uppercase tracking-wider">{t('totalRevenue')}</p>
          <p className="text-2xl font-bold text-green-800">{formatCurrency(summary?.totalRevenue ?? 0)}</p>
        </div>

        <div onClick={() => onNavigate('billing')} className="bg-gradient-to-br from-rose-50 to-rose-100/50 rounded-xl p-5 border border-rose-200/60 cursor-pointer hover:shadow-md transition-all group">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-5 h-5 text-rose-600" />
            <ArrowRight className="w-3.5 h-3.5 text-rose-300 group-hover:text-rose-500 ml-auto group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-xs font-medium text-rose-600/80 uppercase tracking-wider">Outstanding</p>
          <p className="text-2xl font-bold text-rose-800">{formatCurrency(summary?.totalOutstanding ?? 0)}</p>
        </div>
      </motion.div>
    </div>
  );
}
