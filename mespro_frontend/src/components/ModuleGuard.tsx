import { useSharedState } from '../contexts/SharedStateContext';
import NotFoundPage from './NotFoundPage';

interface ModuleGuardProps {
  /** The feature_key that maps this route to a module (e.g. 'leads', 'purchase_orders') */
  moduleKey: string;
  children: React.ReactNode;
}

/**
 * Route-level guard that checks whether the current business has
 * the given module enabled.
 *
 * - If modules haven't loaded yet (empty array while checking), renders children
 *   optimistically (ProtectedRoute is still verifying).
 * - If modules are loaded and the key is present, renders children.
 * - If modules are loaded and the key is NOT present, renders 404.
 *
 * This makes disabled modules appear as if they don't exist.
 */
export default function ModuleGuard({ moduleKey, children }: ModuleGuardProps) {
  const { modules, currentUser } = useSharedState();

  // SuperAdmin bypasses module checks
  const isSuperAdmin =
    currentUser?.role?.toLowerCase() === 'superadmin' ||
    currentUser?.role_info?.name?.toLowerCase() === 'superadmin';

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // If modules haven't been loaded yet, render optimistically
  // (ProtectedRoute is still fetching — it will update modules shortly)
  if (modules.length === 0) {
    return <>{children}</>;
  }

  // Check if the module is in the allowed list
  const isAllowed = modules.some((m) => m.key === moduleKey);

  if (!isAllowed) {
    return <NotFoundPage />;
  }

  return <>{children}</>;
}
