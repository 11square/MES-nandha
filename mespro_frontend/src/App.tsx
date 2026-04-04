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
  type LucideIcon,
} from 'lucide-react';

import { translations } from './translations';

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

  // Build navigation items dynamically from the modules API response
  const navigationItems = useMemo(() => {
    if (modules.length === 0) return []; // Still loading
    return modules
      .filter((m) => moduleIconMap[m.key] && m.url && m.key !== 'products' && m.key !== 'production' && m.key !== 'inventory' && m.key !== 'sales') // Only render known modules with a valid url, exclude products/production/inventory/sales
      .map((m) => ({
        id: m.url.replace(/^\//, ''), // e.g. '/leads' → 'leads', '/purchase-order' → 'purchase-order'
        moduleKey: m.key,
        labelKey: moduleLabelKeyMap[m.key] || m.key,
        icon: moduleIconMap[m.key] || LayoutDashboard,
        url: m.url,
      }));
  }, [modules]);

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
        animate={{ width: sidebarOpen ? 240 : 72 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className={`backdrop-blur-xl bg-white border-r border-gray-200 shadow-sm flex-col fixed h-full z-50 ${
          mobileMenuOpen ? 'flex' : 'hidden md:flex'
        }`}
      >
        <div className="h-16 flex items-center px-4 border-b border-gray-200">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="ml-3 flex items-center gap-2.5"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg flex items-center justify-center shadow-sm">
                  <Zap className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h1 className="text-gray-700 font-semibold text-sm">MES Pro</h1>
                  <p className="text-xs text-gray-500">Production</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <nav className="flex-1 p-2.5 overflow-y-auto custom-scrollbar">
          <div className="space-y-0.5">
            {navigationItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPath === item.id;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => { navigate(item.url); setMobileMenuOpen(false); }}
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive 
                      ? 'bg-gray-500 text-white shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title={!sidebarOpen ? t(item.labelKey as keyof typeof translations.en) : ''}
                >
                  <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className={`text-sm font-medium ${isActive ? 'text-white' : ''}`}
                      >
                        {t(item.labelKey as keyof typeof translations.en)}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        </nav>

        {/* Bottom Actions */}
        <div className="p-2.5 border-t border-gray-200 space-y-0.5">
          <motion.button
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => toast.info(t('changePassword'))}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-all"
            title={!sidebarOpen ? t('changePassword') : ''}
          >
            <KeyRound className="w-4.5 h-4.5 flex-shrink-0" />
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
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 transition-all"
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
        animate={{ marginLeft: sidebarOpen ? 240 : 72 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="flex-1 flex flex-col min-w-0 mt-16 mb-7 max-md:!ml-0"
      >
        {/* Professional top bar */}
        <header className="h-16 backdrop-blur-xl bg-white border-b border-gray-200 fixed top-0 z-40 px-4 md:px-8 flex items-center justify-between shadow-sm w-full max-md:!w-full"
        style={{ width: `calc(100% - ${sidebarOpen ? 240 : 72}px)` }}
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
              <div className="relative w-full group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-focus-within:text-gray-600" />
                <input 
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  className="w-full h-12 pl-12 pr-4 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 hover:border-gray-300 focus:bg-white focus:border-gray-400 focus:shadow-sm transition-all outline-none"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs text-gray-600">
                    <span>⌘</span>K
                  </kbd>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  language === 'en'
                    ? 'bg-white text-gray-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('ta')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  language === 'ta'
                    ? 'bg-white text-gray-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                தமிழ்
              </button>
            </div>

            <div className="h-8 w-px bg-gray-200"></div>

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
          <div className="max-w-[1600px] pt-4 px-4 mx-auto">
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
