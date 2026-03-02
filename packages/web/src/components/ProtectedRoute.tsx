import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

/**
 * Wrapper component that protects routes requiring authentication.
 * Redirects to home page with a message if user is not authenticated.
 */
export default function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Redirect to home if not authenticated and route requires auth
  if (requireAuth && !isAuthenticated) {
    // Store the attempted URL for redirecting after login
    return <Navigate to="/" state={{ from: location, authRequired: true }} replace />;
  }

  return <>{children}</>;
}
