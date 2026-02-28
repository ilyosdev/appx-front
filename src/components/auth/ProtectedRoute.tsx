import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { hasActiveSubscription } from '@/lib/auth';

export function ProtectedRoute() {
  const { isAuthenticated, isInitialized, initialize, user } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-surface-800 rounded-full" />
            <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-primary-500 rounded-full animate-spin" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-white font-medium">Loading</p>
            <p className="text-surface-500 text-sm">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!hasActiveSubscription(user)) {
    return <Navigate to="/pricing" replace />;
  }

  return <Outlet />;
}
