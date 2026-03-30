import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useSharedState } from '../contexts/SharedStateContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Auth guard component — wraps protected routes.
 * Checks localStorage token existence first (fast), then verifies
 * with the backend via getProfile(). Also fetches the user's
 * allowed modules and stores them in shared state.
 * Redirects to /login on failure.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const { setCurrentUser, setModules } = useSharedState();
  const [status, setStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>(
    authService.isAuthenticated() ? 'checking' : 'unauthenticated'
  );

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      setStatus('unauthenticated');
      return;
    }

    // Load cached modules immediately for fast render
    const cached = authService.getCachedModules();
    if (cached.length > 0) {
      setModules(cached);
    }

    Promise.all([
      authService.getProfile(),
      authService.getModules(),
    ])
      .then(([user, modules]) => {
        setStatus('authenticated');
        setCurrentUser(user);
        setModules(modules);
      })
      .catch(() => {
        authService.logout();
        setStatus('unauthenticated');
      });
  }, []);

  if (status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Verifying session…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
