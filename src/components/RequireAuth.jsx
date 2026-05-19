import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div style={{ padding: '120px 28px', color: '#9a9a9a' }}>Загрузка…</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
