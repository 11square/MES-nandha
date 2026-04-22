import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useI18n } from './contexts/I18nContext';
import { useSharedState } from './contexts/SharedStateContext';
import { authService } from './services/auth.service';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  Package, 
  PackageOpen,
  Truck, 
  BarChart3, 
  Clock,
  Menu,
  Search,
  Bell,
  Zap,
  UserCog,
  Shield,
  DollarSign,
  Building2,
  Boxes,
  KeyRound,
  LogOut,
  Wallet,
  TrendingUp,
  ShoppingCart,
  Receipt,
  ClipboardCheck,
  Settings,
  FileText,
  ChevronDown,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

import { translations } from './translations';
import GlobalSearch from './components/GlobalSearch';

/** Map feature_key → icon component */
const moduleIconMap: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  leads: Users,
  orders: FileText,
  billing: Receipt,
  production: ClipboardList,
  sales: TrendingUp,
  inventory: Package,
  stock: Boxes,
  purchase_orders: ShoppingCart,
  dispatch: Truck,
  products: PackageOpen,
  clients: Building2,
  finance: Wallet,
  audit: ClipboardCheck,
  payroll: DollarSign,
  staff: UserCog,
  attendance: Clock,
  vendors: Truck,
  users: Shield,
  reports: BarChart3,
  settings: Settings,
};

/** Map feature_key → translation label key */
const moduleLabelKeyMap: Record<string, string> = {
  dashboard: 'dashboard',
  leads: 'leads',
  orders: 'orders',
  billing: 'billing',
  production: 'production',
  sales: 'sales',
  inventory: 'inventory',
  stock: 'stock',
  purchase_orders: 'purchaseOrders',
  dispatch: 'dispatch',
  products: 'products',
  clients: 'clients',
  finance: 'finance',
  audit: 'audit',
  payroll: 'payroll',
  staff: 'staff',
  attendance: 'attendance',
  vendors: 'vendors',
  users: 'users',
  reports: 'reports',
  settings: 'settings',
};

/** Map feature_key → view title translation key for topbar */
const moduleTitleKeyMap: Record<string, string> = {
  dashboard: 'dashboardTitle',
  leads: 'leadsOrdersTitle',
  orders: 'orders',
  billing: 'billingManagement',
  production: 'productionBoard',
  sales: 'salesManagement',
  inventory: 'inventoryManagement',
  stock: 'stockManagement',
  purchase_orders: 'purchaseOrderManagement',
  dispatch: 'dispatchManagement',
  products: 'productManagement',
  clients: 'clientManagement',
  finance: 'financeManagement',
  audit: 'audit',
  payroll: 'payrollManagement',
  staff: 'staffManagement',
  attendance: 'attendanceTracking',
  vendors: 'vendors',
  users: 'userManagement',
  reports: 'reportsAnalytics',
  settings: 'settings',
};

/**
 * Application shell / layout — rendered inside ProtectedRoute.
 * Contains sidebar, top bar, and an <Outlet /> for child routes.
 */
export default function App() {
  const { t, language, setLanguage } = useI18n();
  const { currentUser, setCurrentUser, modules } = useSharedState();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect superadmin users to their dedicated layout
  const isSuperAdmin = currentUser?.role?.toLowerCase() === 'superadmin' ||
    currentUser?.role_info?.name?.toLowerCase() === 'superadmin';
  if (isSuperAdmin) {
    return <Navigate to="/super-admin" replace />;
  }

  const handleLogout = () => {
    authService.logout();
    navigate('/login', { replace: true });
  };

  // Derive active view from the current URL path
  const currentPath = location.pathname.replace(/^\//, '').split('/')[0] || 'dashboard';

  // HR group keys
  const hrKeys = new Set(['staff', 'attendance', 'payroll', 'users']);

  // Build navigation items dynamically from the modules API response
  const navigationItems = useMemo(() => {
    if (modules.length === 0) return []; // Still loading
    return modules
      .filter((m) => moduleIconMap[m.key] && m.url && m.key !== 'products' && m.key !== 'production' && m.key !== 'inventory' && m.key !== 'sales' && m.key !== 'settings' && !hrKeys.has(m.key))
      .map((m) => ({
        id: m.url.replace(/^\//, ''),
        moduleKey: m.key,
        labelKey: moduleLabelKeyMap[m.key] || m.key,
        icon: moduleIconMap[m.key] || LayoutDashboard,
        url: m.url,
      }));
  }, [modules]);

  const hrItems = useMemo(() => {
    if (modules.length === 0) return [];
    return modules
      .filter((m) => hrKeys.has(m.key) && moduleIconMap[m.key] && m.url)
      .map((m) => ({
        id: m.url.replace(/^\//, ''),
        moduleKey: m.key,
        labelKey: moduleLabelKeyMap[m.key] || m.key,
        icon: moduleIconMap[m.key] || LayoutDashboard,
        url: m.url,
      }));
  }, [modules]);

  const [hrOpen, setHrOpen] = useState(false);
  const isHrActive = hrItems.some(item => currentPath === item.id);

  // Resolve page title from current path
  // Map URL path segment back to feature_key for title lookup
  const pathToFeatureKey: Record<string, string> = {
    'purchase-orders': 'purchase_orders',
    'order-detail': 'order-detail',
  };
  const featureKey = pathToFeatureKey[currentPath] || currentPath;
  const titleKey = moduleTitleKeyMap[featureKey] || (currentPath === 'order-detail' ? 'orderDetails' : 'dashboardTitle');
  const pageTitle = t(titleKey as keyof typeof translations.en);

  return (
    <div className="min-h-screen bg-gray-50 flex relative overflow-hidden">

      {/* Mobile overlay backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Professional sidebar with subtle glassmorphism */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 248 : 72 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className={`bg-gradient-to-b from-white to-slate-50 border-r border-slate-200/80 shadow-[1px_0_3px_0_rgba(0,0,0,0.02)] flex-col fixed h-full z-50 ${
          mobileMenuOpen ? 'flex' : 'hidden md:flex'
        }`}
      >
        <div className="h-16 flex items-center px-3 border-b border-slate-200/80">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-10 h-10 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="ml-2.5 flex items-center gap-2.5"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-500/20">
                  <Zap className="w-4.5 h-4.5 text-white" />
                </div>
                <div className="leading-tight">
                  <h1 className="text-slate-800 font-semibold text-sm tracking-tight">MES Pro</h1>
                  <p className="text-[11px] text-slate-500">Production</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <nav className="flex-1 px-2.5 py-3 overflow-y-auto custom-scrollbar">
          {sidebarOpen && (
            <p className="px-2 pb-1.5 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">Menu</p>
          )}
          <div className="space-y-0.5">
            {navigationItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPath === item.id;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => { navigate(item.url); setMobileMenuOpen(false); }}
                  whileTap={{ scale: 0.98 }}
                  className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  title={!sidebarOpen ? t(item.labelKey as keyof typeof translations.en) : ''}
                >
                  {isActive && (
                    <motion.span layoutId="sidebar-active-indicator" className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-blue-600" />
                  )}
                  <Icon className={`w-4.5 h-4.5 flex-shrink-0 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className={`text-sm font-medium ${isActive ? 'text-blue-700' : ''}`}
                      >
                        {t(item.labelKey as keyof typeof translations.en)}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}

            {/* HR Group */}
            {hrItems.length > 0 && (
              <>
                {sidebarOpen && (
                  <p className="px-2 pt-4 pb-1.5 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">Modules</p>
                )}
                <motion.button
                  onClick={() => setHrOpen(!hrOpen)}
                  whileTap={{ scale: 0.98 }}
                  className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isHrActive && !hrOpen
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  title={!sidebarOpen ? 'HR' : ''}
                >
                  {isHrActive && !hrOpen && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-blue-600" />
                  )}
                  <UsersRound className={`w-4.5 h-4.5 flex-shrink-0 ${isHrActive && !hrOpen ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className={`text-sm font-medium flex-1 text-left flex items-center gap-2 ${isHrActive && !hrOpen ? 'text-blue-700' : ''}`}
                      >
                        HR <span className={`text-[9px] tracking-wider px-1.5 py-px rounded font-semibold uppercase ${isHrActive && !hrOpen ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>Beta</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {sidebarOpen && (
                    <ChevronDown className={`w-4 h-4 transition-transform ${hrOpen ? 'rotate-180' : ''} ${isHrActive && !hrOpen ? 'text-blue-600' : 'text-slate-400'}`} />
                  )}
                </motion.button>
                <AnimatePresence>
                  {hrOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className={`${sidebarOpen ? 'ml-5 pl-3 border-l border-slate-200' : ''} mt-0.5 space-y-0.5`}>
                        {hrItems.map(item => {
                          const Icon = item.icon;
                          const isActive = currentPath === item.id;
                          return (
                            <motion.button
                              key={item.id}
                              onClick={() => { navigate(item.url); setMobileMenuOpen(false); }}
                              whileTap={{ scale: 0.98 }}
                              className={`group relative w-full flex items-center gap-3 ${sidebarOpen ? 'px-3' : 'pl-3 pr-3'} py-2 rounded-lg transition-all ${
                                isActive
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                              title={!sidebarOpen ? t(item.labelKey as keyof typeof translations.en) : ''}
                            >
                              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
                              <AnimatePresence>
                                {sidebarOpen && (
                                  <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className={`text-sm font-medium ${isActive ? 'text-blue-700' : ''}`}
                                  >
                                    {t(item.labelKey as keyof typeof translations.en)}
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </nav>

        {/* Bottom Actions */}
        <div className="p-2.5 border-t border-slate-200/80 bg-white/60 space-y-0.5">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => toast.info(t('changePassword'))}
            className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all"
            title={!sidebarOpen ? t('changePassword') : ''}
          >
            <KeyRound className="w-4.5 h-4.5 flex-shrink-0 text-slate-500 group-hover:text-slate-700" />
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="text-sm font-medium"
                >
                  {t('changePassword')}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-all"
            title={!sidebarOpen ? t('logout') : ''}
          >
            <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="text-sm font-medium"
                >
                  {t('logout')}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <motion.div 
        initial={false}
        animate={{ marginLeft: sidebarOpen ? 248 : 72 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="flex-1 flex flex-col min-w-0 mt-16 mb-7 max-md:!ml-0"
      >
        {/* Professional top bar */}
        <header className="h-16 backdrop-blur-xl bg-white border-b border-gray-200 fixed top-0 z-40 px-4 md:px-8 flex items-center justify-between shadow-sm w-full max-md:!w-full"
        style={{ width: `calc(100% - ${sidebarOpen ? 248 : 72}px)` }}
        >
          <div className="flex items-center gap-4 md:gap-6 flex-1">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-gray-500 rounded-full"></div>
              <h1 className="text-xl text-gray-700 font-semibold">
                {pageTitle}
              </h1>
            </div>

            {/* Professional search bar */}
            <div className="hidden md:flex flex-1 max-w-2xl">
              <GlobalSearch placeholder={t('searchPlaceholder')} />
            </div>
          </div>

          <div className="flex items-center gap-3">

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-11 h-11 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors relative"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            </motion.button>
            
            <div className="h-8 w-px bg-gray-200 mx-2"></div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm text-gray-700 font-semibold">{currentUser?.name || t('mesAdmin')}</p>
                <div className="flex items-center gap-1.5 justify-end">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                  <p className="text-xs text-gray-500">{currentUser?.role || t('online')}</p>
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-11 h-11 rounded-lg bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-white hover:shadow-lg hover:shadow-gray-400/30 transition-shadow font-semibold"
                title="Profile"
              >
                {(currentUser?.name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
              </motion.button>
            </div>
          </div>
        </header>

        {/* Content Area — child routes render here */}
        <main className="flex-1 overflow-auto relative">
          <div className="max-w-[1600px] pt-2 px-4 mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPath}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </motion.div>
      <Toaster position="top-right" richColors />
    </div>
  );
}
