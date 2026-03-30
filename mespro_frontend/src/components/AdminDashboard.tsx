import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useI18n } from '../contexts/I18nContext';
import { 
  Users, 
  ClipboardList, 
  Package, 
  Truck, 
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Badge } from './ui/badge';

import { dashboardService } from '../services/dashboard.service';

const defaultStats = [
  { title_key: 'newLeads', value: '0', change: '', trend: 'up' as const, icon_type: 'users' as const, bg_color: 'bg-blue-500', light_bg: 'bg-blue-50', text_color: 'text-blue-600', navigate_to: 'leads' as const },
  { title_key: 'inProduction', value: '0', change: '', trend: 'up' as const, icon_type: 'clipboard' as const, bg_color: 'bg-emerald-500', light_bg: 'bg-emerald-50', text_color: 'text-emerald-600', navigate_to: 'production' as const },
  { title_key: 'stockAlerts', value: '0', change: '', trend: 'down' as const, icon_type: 'alert' as const, bg_color: 'bg-amber-500', light_bg: 'bg-amber-50', text_color: 'text-amber-600', navigate_to: 'inventory' as const },
  { title_key: 'dispatches', value: '0', change: '', trend: 'up' as const, icon_type: 'truck' as const, bg_color: 'bg-violet-500', light_bg: 'bg-violet-50', text_color: 'text-violet-600', navigate_to: 'dispatch' as const },
];
interface AdminDashboardProps {
  onNavigate: (view: string) => void;
  onViewOrder: (orderId: string) => void;
}

export default function AdminDashboard({ onNavigate, onViewOrder }: AdminDashboardProps) {
  const { t } = useI18n();

  const [stats, setStats] = useState(defaultStats);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [pendingLeads, setPendingLeads] = useState<any[]>([]);
  const [quickStats, setQuickStats] = useState({ completedThisWeek: 0, avgProductionTime: 0, productionEfficiency: 0 });

  useEffect(() => {
    dashboardService.getSummary()
      .then(data => {
        if (data) {
          // Map API flat object to stats array format
          const mapped = [
            { ...defaultStats[0], value: String(data.activeLeads ?? '0') },
            { ...defaultStats[1], value: String(data.activeProduction ?? '0') },
            { ...defaultStats[2], value: String(data.stockAlerts ?? '0') },
            { ...defaultStats[3], value: String(data.pendingDispatches ?? '0') },
          ];
          setStats(mapped);
          // Set quick stats from DB summary
          if (data.completedThisWeek !== undefined || data.avgProductionTime !== undefined || data.productionEfficiency !== undefined) {
            setQuickStats({
              completedThisWeek: data.completedThisWeek ?? 0,
              avgProductionTime: data.avgProductionTime ?? 0,
              productionEfficiency: data.productionEfficiency ?? 0,
            });
          }
        }
      })
      .catch(() => {});
    dashboardService.getRecentOrders()
      .then(data => {
        if (data && Array.isArray(data)) {
          const mapped = data.map((order: any) => {
            const p = (order.priority || '').toLowerCase();
            return {
              ...order,
              order_number: order.order_number || `ORD-${order.id}`,
              progress: order.progress ?? (order.status === 'Completed' ? 100 : order.status === 'In Production' ? 50 : 20),
              priority_key: p || 'medium',
              priority_color: p === 'high' ? 'bg-red-100 text-red-700'
                : p === 'low' ? 'bg-slate-100 text-slate-600'
                : 'bg-amber-100 text-amber-700',
              bar_color: 'bg-blue-600',
            };
          });
          setRecentOrders(mapped);
        }
      })
      .catch(() => {});
    // Fetch low stock items for Inventory Alerts section
    dashboardService.getLowStock()
      .then(data => {
        if (data && Array.isArray(data)) {
          setLowStockItems(data);
        }
      })
      .catch(() => {});
    // Fetch pending leads
    dashboardService.getPendingLeads()
      .then(data => {
        if (data && Array.isArray(data)) {
          setPendingLeads(data);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      {/* Professional stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const iconMap = { users: Users, clipboard: ClipboardList, alert: AlertTriangle, truck: Truck };
          const Icon = iconMap[stat.icon_type];
          const TrendIcon = stat.trend === 'up' ? ArrowUpRight : ArrowDownRight;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onNavigate(stat.navigate_to)}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative overflow-hidden rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md p-6 cursor-pointer group transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${stat.bg_color} rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <motion.button 
                  whileHover={{ rotate: 90 }}
                  transition={{ duration: 0.2 }}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4 text-slate-600" />
                </motion.button>
              </div>
              
              <h3 className="text-sm text-slate-600 mb-2 font-medium">{t(stat.title_key as any)}</h3>
              <div className="flex items-end gap-3 mb-2">
                <p className="text-3xl text-slate-900 font-bold">{stat.value}</p>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${stat.trend === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'} mb-1`}>
                  <TrendIcon className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">{stat.change}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500">{t('fromLastMonth')}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <h2 className="text-base text-slate-900 font-semibold">{t('ordersInProduction')}</h2>
              </div>
              <Button
                onClick={() => onNavigate('production')}
                variant="ghost"
                className="text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium flex items-center gap-1.5 rounded-lg h-9"
              >
                {t('viewAll')}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentOrders.map((order, idx) => (
                  <motion.div
                    key={order.order_number}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + idx * 0.1 }}
                    whileHover={{ x: 4 }}
                    className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-md hover:bg-blue-50/30 cursor-pointer transition-all group"
                    onClick={() => onViewOrder(order.order_number)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-blue-600 font-semibold">{order.order_number}</span>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${order.priority_color}`}>
                            {t(order.priority_key as any)}
                          </span>
                        </div>
                        <p className="text-slate-900 font-medium mb-1">{order.customer}</p>
                        <p className="text-sm text-slate-600">{order.product}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs text-slate-600 font-medium">{order.status}</p>
                      <span className="text-xs text-slate-400">•</span>
                      <p className="text-xs text-blue-600 font-semibold">{order.progress}% {t('complete')}</p>
                    </div>
                    
                    <div className="relative w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${order.progress}%` }}
                        transition={{ duration: 1, delay: 0.5 + idx * 0.1, ease: "easeOut" }}
                        className={`${order.bar_color} h-2 rounded-full`}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Inventory Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-1"
        >
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <h2 className="text-base text-slate-900 font-semibold">{t('inventoryAlerts')}</h2>
              </div>
              <Button
                onClick={() => onNavigate('inventory')}
                variant="ghost"
                className="text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-medium rounded-lg h-9"
              >
                {t('manage')}
              </Button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {lowStockItems.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + idx * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-lg border border-slate-200 hover:border-amber-300 hover:shadow-md hover:bg-amber-50/30 transition-all"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-9 h-9 rounded-lg ${item.status === 'critical' ? 'bg-red-500' : 'bg-amber-500'} flex items-center justify-center shadow-sm`}>
                        <AlertTriangle className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900 font-medium truncate">{item.material}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{t('reorderAt')} {item.reorder}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-medium">{t('currentStockLabel')}</span>
                        <span className={`font-semibold ${item.status === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>
                          {item.current} {t('units')}
                        </span>
                      </div>
                      <div className="relative w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.percentage}%` }}
                          transition={{ duration: 1, delay: 0.6 + idx * 0.1 }}
                          className={`h-2 rounded-full ${item.status === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Pending Leads */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <h2 className="text-base text-slate-900 font-semibold">{t('pendingLeads')}</h2>
          </div>
          <Button
            onClick={() => onNavigate('leads')}
            variant="ghost"
            className="text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium flex items-center gap-1.5 rounded-lg h-9"
          >
            {t('viewAllLeads')}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pendingLeads.map((lead, idx) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + idx * 0.1 }}
                whileHover={{ y: -4 }}
                className="p-5 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-md hover:bg-blue-50/30 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-blue-600 font-semibold">{lead.id}</span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
                    {lead.source}
                  </span>
                </div>
                <p className="text-slate-900 font-medium mb-1">{lead.customer}</p>
                <p className="text-sm text-slate-600 mb-3">{lead.product}</p>
                <span className="inline-flex text-xs px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                  {lead.status}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Quick Stats - Professional cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-emerald-500/10 backdrop-blur-sm rounded-xl p-6 border border-emerald-200/50 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-emerald-700/80 mb-1 font-medium">{t('completedThisWeek')}</p>
              <p className="text-2xl font-bold text-emerald-700">{quickStats.completedThisWeek} {t('orders')}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="bg-blue-500/10 backdrop-blur-sm rounded-xl p-6 border border-blue-200/50 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-700/80 mb-1 font-medium">{t('avgProductionTime')}</p>
              <p className="text-2xl font-bold text-blue-700">{quickStats.avgProductionTime} {t('days')}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="bg-violet-500/10 backdrop-blur-sm rounded-xl p-6 border border-violet-200/50 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-violet-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-violet-700/80 mb-1 font-medium">{t('productionEfficiency')}</p>
              <p className="text-2xl font-bold text-violet-700">{quickStats.productionEfficiency}%</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
