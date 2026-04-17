import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard, Users, FileText, Receipt, ClipboardList, TrendingUp,
  Package, Boxes, ShoppingCart, Truck, PackageOpen, Building2, Wallet,
  ClipboardCheck, DollarSign, UserCog, Clock, Shield, BarChart3, Settings,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { leadsService } from '../services/leads.service';
import { ordersService } from '../services/orders.service';
import { clientsService } from '../services/clients.service';
import { stockService } from '../services/stock.service';
import { vendorsService } from '../services/vendors.service';
import { staffService } from '../services/staff.service';
import { billingService } from '../services/billing.service';

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  type: 'page' | 'order' | 'lead' | 'client' | 'stock' | 'vendor' | 'staff' | 'bill';
  icon: LucideIcon;
  path: string;
}

const PAGE_ICON_MAP: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard, leads: Users, orders: FileText, billing: Receipt,
  production: ClipboardList, sales: TrendingUp, inventory: Package, stock: Boxes,
  'purchase-orders': ShoppingCart, dispatch: Truck, products: PackageOpen,
  clients: Building2, finance: Wallet, audit: ClipboardCheck, payroll: DollarSign,
  staff: UserCog, attendance: Clock, vendors: Truck, users: Shield,
  reports: BarChart3, settings: Settings,
};

const PAGES: SearchResult[] = [
  { id: 'p-dashboard', label: 'Dashboard', type: 'page', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'p-leads', label: 'Leads', type: 'page', icon: Users, path: '/leads' },
  { id: 'p-orders', label: 'Orders', type: 'page', icon: FileText, path: '/orders' },
  { id: 'p-billing', label: 'Billing', type: 'page', icon: Receipt, path: '/billing' },
  { id: 'p-production', label: 'Production', type: 'page', icon: ClipboardList, path: '/production' },
  { id: 'p-sales', label: 'Sales', type: 'page', icon: TrendingUp, path: '/sales' },
  { id: 'p-inventory', label: 'Inventory', type: 'page', icon: Package, path: '/inventory' },
  { id: 'p-stock', label: 'Stock', type: 'page', icon: Boxes, path: '/stock' },
  { id: 'p-purchase-orders', label: 'Purchase Orders', type: 'page', icon: ShoppingCart, path: '/purchase-orders' },
  { id: 'p-dispatch', label: 'Dispatch', type: 'page', icon: Truck, path: '/dispatch' },
  { id: 'p-products', label: 'Products / Categories', type: 'page', icon: PackageOpen, path: '/products' },
  { id: 'p-clients', label: 'Clients', type: 'page', icon: Building2, path: '/clients' },
  { id: 'p-finance', label: 'Finance', type: 'page', icon: Wallet, path: '/finance' },
  { id: 'p-audit', label: 'Audit', type: 'page', icon: ClipboardCheck, path: '/audit' },
  { id: 'p-payroll', label: 'Payroll', type: 'page', icon: DollarSign, path: '/payroll' },
  { id: 'p-staff', label: 'Staff', type: 'page', icon: UserCog, path: '/staff' },
  { id: 'p-attendance', label: 'Attendance', type: 'page', icon: Clock, path: '/attendance' },
  { id: 'p-vendors', label: 'Vendors', type: 'page', icon: Truck, path: '/vendors' },
  { id: 'p-users', label: 'Users', type: 'page', icon: Shield, path: '/users' },
  { id: 'p-reports', label: 'Reports', type: 'page', icon: BarChart3, path: '/reports' },
  { id: 'p-settings', label: 'Settings', type: 'page', icon: Settings, path: '/settings' },
];

const TYPE_LABELS: Record<string, string> = {
  page: 'Pages', order: 'Orders', lead: 'Leads', client: 'Clients',
  stock: 'Stock Items', vendor: 'Vendors', staff: 'Staff', bill: 'Bills',
};

export default function GlobalSearch({ placeholder }: { placeholder: string }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [dataResults, setDataResults] = useState<SearchResult[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch data from all modules on first focus
  const loadData = useCallback(async () => {
    if (dataLoaded || loading) return;
    setLoading(true);
    try {
      const [leads, orders, clients, stockItems, vendors, staffList, bills] = await Promise.allSettled([
        leadsService.getLeads(),
        ordersService.getOrders(),
        clientsService.getClients(),
        stockService.getAllStockItems(),
        vendorsService.getVendors(),
        staffService.getStaff(),
        billingService.getBills(),
      ]);

      const results: SearchResult[] = [];

      if (leads.status === 'fulfilled') {
        leads.value.forEach((l: any) => results.push({
          id: `lead-${l.id}`, label: l.customer_name || l.company_name || `Lead #${l.id}`,
          sublabel: l.lead_number || l.status, type: 'lead', icon: Users, path: '/leads',
        }));
      }
      if (orders.status === 'fulfilled') {
        orders.value.forEach((o: any) => results.push({
          id: `order-${o.id}`, label: o.order_number || `Order #${o.id}`,
          sublabel: o.customer_name || o.client_name, type: 'order', icon: FileText, path: '/orders',
        }));
      }
      if (clients.status === 'fulfilled') {
        clients.value.forEach((c: any) => results.push({
          id: `client-${c.id}`, label: c.name || c.company_name || `Client #${c.id}`,
          sublabel: c.contact_person || c.email, type: 'client', icon: Building2, path: `/clients/${c.id}`,
        }));
      }
      if (stockItems.status === 'fulfilled') {
        stockItems.value.forEach((s: any) => results.push({
          id: `stock-${s.id}`, label: s.name || `Item #${s.id}`,
          sublabel: s.sku || s.category, type: 'stock', icon: Boxes, path: '/stock',
        }));
      }
      if (vendors.status === 'fulfilled') {
        vendors.value.forEach((v: any) => results.push({
          id: `vendor-${v.id}`, label: v.name || v.company_name || `Vendor #${v.id}`,
          sublabel: v.contact_person || v.email, type: 'vendor', icon: Truck, path: '/vendors',
        }));
      }
      if (staffList.status === 'fulfilled') {
        staffList.value.forEach((s: any) => results.push({
          id: `staff-${s.id}`, label: s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || `Staff #${s.id}`,
          sublabel: s.employee_id || s.department, type: 'staff', icon: UserCog, path: '/staff',
        }));
      }
      if (bills.status === 'fulfilled') {
        bills.value.forEach((b: any) => results.push({
          id: `bill-${b.id}`, label: b.bill_no || b.bill_number || `Bill #${b.id}`,
          sublabel: b.client_name || b.customer_name, type: 'bill', icon: Receipt, path: '/billing',
        }));
      }

      setDataResults(results);
      setDataLoaded(true);
    } catch {
      // Silently fail — pages will still be searchable
    } finally {
      setLoading(false);
    }
  }, [dataLoaded, loading]);

  // Filter results based on query
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const matchPages = PAGES.filter(p => p.label.toLowerCase().includes(q));
    const matchData = dataResults.filter(r =>
      r.label.toLowerCase().includes(q) ||
      (r.sublabel && r.sublabel.toLowerCase().includes(q))
    );

    // Combine, pages first, then data results limited to 5 per type
    const grouped: SearchResult[] = [...matchPages];
    const typeCounts: Record<string, number> = {};
    for (const r of matchData) {
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
      if (typeCounts[r.type] <= 5) grouped.push(r);
    }
    return grouped.slice(0, 20);
  }, [query, dataResults]);

  // Reset active index when results change
  useEffect(() => setActiveIndex(0), [filtered]);

  // ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(filtered[activeIndex]);
    }
  };

  // Group results by type for display
  const groupedResults = useMemo(() => {
    const groups: { type: string; label: string; items: SearchResult[] }[] = [];
    const seen = new Set<string>();
    for (const r of filtered) {
      if (!seen.has(r.type)) {
        seen.add(r.type);
        groups.push({ type: r.type, label: TYPE_LABELS[r.type] || r.type, items: [] });
      }
      groups.find(g => g.type === r.type)!.items.push(r);
    }
    return groups;
  }, [filtered]);

  // Flat index helper for keyboard navigation
  let flatIdx = -1;

  return (
    <div ref={containerRef} className="relative w-full group">
      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-focus-within:text-gray-600 z-10" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setOpen(true); loadData(); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full h-12 pl-12 pr-16 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 hover:border-gray-300 focus:bg-white focus:border-gray-400 focus:shadow-sm transition-all outline-none"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs text-gray-600">
          <span>⌘</span>K
        </kbd>
      </div>

      {/* Results dropdown */}
      {open && query.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[400px] overflow-y-auto">
          {loading && filtered.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-400">Loading...</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-400">No results for "{query}"</div>
          )}
          {groupedResults.map(group => (
            <div key={group.type}>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100 sticky top-0">
                {group.label}
              </div>
              {group.items.map(item => {
                flatIdx++;
                const idx = flatIdx;
                return (
                  <button
                    key={item.id}
                    onMouseDown={() => handleSelect(item)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      activeIndex === idx ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${activeIndex === idx ? 'text-blue-500' : 'text-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.label}</div>
                      {item.sublabel && <div className="text-xs text-gray-400 truncate">{item.sublabel}</div>}
                    </div>
                    {activeIndex === idx && <ArrowRight className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
