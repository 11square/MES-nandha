import { useNavigate } from 'react-router-dom';

/**
 * Map of view IDs → URL paths.
 * Used by the sidebar, onNavigate callbacks, and anywhere
 * the old `setCurrentView(id)` pattern was used.
 */
export const viewToPath: Record<string, string> = {
  dashboard: '/dashboard',
  leads: '/leads',
  orders: '/orders',
  billing: '/billing',
  production: '/production',
  sales: '/sales',
  inventory: '/inventory',
  stock: '/stock',
  'purchase-order': '/purchase-order',
  dispatch: '/dispatch',
  products: '/products',
  clients: '/clients',
  finance: '/finance',
  audit: '/audit',
  payroll: '/payroll',
  staff: '/staff',
  attendance: '/attendance',
  vendors: '/vendors',
  users: '/users',
  reports: '/reports',
  settings: '/settings',
  library: '/library',
  'super-admin': '/super-admin',
  'order-detail': '/order-detail',
};

/**
 * Reverse map: URL path segment → view id
 */
export const pathToView: Record<string, string> = Object.fromEntries(
  Object.entries(viewToPath).map(([k, v]) => [v.replace('/', ''), k])
);

/**
 * Hook that returns a function with the same signature as the old
 * `onNavigate: (view: string) => void` so child components can
 * switch routes without prop-drilling.
 */
export function useAppNavigate() {
  const navigate = useNavigate();
  return (view: string) => {
    const path = viewToPath[view] || '/dashboard';
    navigate(path);
  };
}
