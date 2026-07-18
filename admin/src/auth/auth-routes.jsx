import { useEffect } from 'react';
import { BrandedLayout } from './layouts/branded';
import { ClassicLayout } from './layouts/classic';
import { CallbackPage } from './pages/callback-page';

// Единый вход: панель не держит свой экран входа/регистрации — уводим на
// красивый /login основного сайта (там 2FA-код для клиентов и роутинг по роли).
function RedirectToSiteLogin() {
  useEffect(() => { window.location.replace('/login'); }, []);
  return null;
}
import { ChangePasswordPage } from './pages/change-password-page';
import { CheckEmail } from './pages/extended/check-email';
import { ResetPasswordChanged } from './pages/extended/reset-password-changed';
import { ResetPasswordCheckEmail } from './pages/extended/reset-password-check-email';
import { TwoFactorAuth } from './pages/extended/tfa';
import { ResetPasswordPage } from './pages/reset-password-page';
import { SignInPage } from './pages/signin-page';
import { SignUpPage } from './pages/signup-page';

// Define the auth routes
export const authRoutes = [
  {
    path: '',
    element: <BrandedLayout />,
    children: [
      {
        path: 'signin',
        element: <RedirectToSiteLogin />,
      },
      {
        path: 'signup',
        element: <RedirectToSiteLogin />,
      },
      {
        path: 'change-password',
        element: <ChangePasswordPage />,
      },
      {
        path: 'reset-password',
        element: <ResetPasswordPage />,
      },
      /* Extended examples */
      {
        path: '2fa',
        element: <TwoFactorAuth />,
      },
      {
        path: 'check-email',
        element: <CheckEmail />,
      },
      {
        path: 'reset-password/check-email',
        element: <ResetPasswordCheckEmail />,
      },
      {
        path: 'reset-password/changed',
        element: <ResetPasswordChanged />,
      },
    ],
  },
  {
    path: '',
    element: <ClassicLayout />,
    children: [
      {
        path: 'classic/signin',
        element: <RedirectToSiteLogin />,
      },
      {
        path: 'classic/signup',
        element: <RedirectToSiteLogin />,
      },
      {
        path: 'classic/change-password',
        element: <ChangePasswordPage />,
      },
      {
        path: 'classic/reset-password',
        element: <ResetPasswordPage />,
      },
      /* Extended examples */
      {
        path: 'classic/2fa',
        element: <TwoFactorAuth />,
      },
      {
        path: 'classic/check-email',
        element: <CheckEmail />,
      },
      {
        path: 'classic/reset-password/check-email',
        element: <ResetPasswordCheckEmail />,
      },
      {
        path: 'classic/reset-password/changed',
        element: <ResetPasswordChanged />,
      },
    ],
  },
  {
    path: 'callback',
    element: <CallbackPage />,
  },
];
