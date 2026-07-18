import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ScreenLoader } from '@/components/common/screen-loader';
import { useAuth } from './context/auth-context';

/**
 * Component to protect routes that require authentication.
 * If user is not authenticated, redirects to the login page.
 */
export const RequireAuth = () => {
  const { auth, verify, loading: globalLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const verificationStarted = useRef(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (!auth?.access_token || !verificationStarted.current) {
        verificationStarted.current = true;
        try {
          await verify();
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    checkAuth();
  }, [auth, verify]);

  // Show screen loader while checking authentication
  if (loading || globalLoading) {
    return <ScreenLoader />;
  }

  // Не авторизован → единый вход на сайте (не панельный экран Metronic).
  // Панель — отдельный бандл, поэтому жёсткий переход. Так клиент при выходе
  // из ЛК попадает на нормальный /login с поддержкой кода, а не в тупик.
  if (!auth?.access_token) {
    window.location.replace('/login');
    return <ScreenLoader />;
  }

  // If authenticated, render child routes
  return <Outlet />;
};
