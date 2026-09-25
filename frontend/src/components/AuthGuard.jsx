import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Blocks unauthenticated visitors from protected routes.
 * While the session is hydrating we render a quiet loader instead of
 * flashing the login page. The attempted URL is preserved so login can
 * send the user straight back.
 */
export default function AuthGuard({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-sm text-muted" role="status">
        Checking session…
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
