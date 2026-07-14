import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/auth-context';

// Гард админ-разделов: клиент (role=user) не должен видеть даже каркасы
// админ-страниц — его молча уводит в личный кабинет. Данные и так защищены
// на бэке (requireRole('admin')), это защита UI.
export function RequireAdmin() {
  const { user, isAdmin } = useAuth();
  // Пока пользователь грузится, ничего не решаем (RequireAuth выше уже показал лоадер)
  if (!user) return null;
  if (!isAdmin) return <Navigate to="/me" replace />;
  return <Outlet />;
}
