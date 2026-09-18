import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Phase 9 will enforce real JWT verification against /api/auth/me.
 * Phase 1 keeps the demo-session gate so protected-route behavior is testable.
 */
export default function AuthGuard({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
