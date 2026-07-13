import { Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/context/auth-context';

// Лендинг по роли: админ → админ-дашборд, клиент → личный кабинет
export function RoleLanding() {
  const { isAdmin } = useAuth();
  return <Navigate to={isAdmin ? '/aurix' : '/me'} replace />;
}
