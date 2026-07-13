import { api } from '@/lib/aurix-api';

// Адаптер авторизации поверх нашего Express-бэка (JWT в httpOnly-cookie).
// Тот же интерфейс, что ждёт auth-провайдер Metronic. Заменяет Supabase.

// Наш пользователь → форма user, которую читает UI Metronic (шапка/дропдаун).
function mapUser(u) {
  if (!u) return null;
  const name = (u.name || '').trim();
  const parts = name.split(/\s+/).filter(Boolean);
  return {
    id: u.id,
    email: u.email,
    username: u.email,
    first_name: parts[0] || name || 'AURIX',
    last_name: parts.slice(1).join(' ') || '',
    fullname: name || u.email,
    role: u.role,
    is_admin: u.role === 'admin',
    is_active: true,
    pic:
      u.avatar_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'A')}&background=D4AF37&color=000`,
  };
}

const notSupported = (what) => async () => {
  throw new Error(`${what} недоступно в админ-панели`);
};

export const AurixAdapter = {
  async login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    // Аккаунты с 2FA (код на почту) в админку не пускаем — она для служебного
    // admin@aurix.local без 2FA.
    if (res?.needsCode) {
      throw new Error('Для этого аккаунта включён вход по коду — админ-панель только для служебного администратора');
    }
    // Сервер поставил httpOnly-cookie. Возвращаем маркер, чтобы провайдер
    // сохранил флаг сессии (сам токен живёт в cookie, не в JS).
    return { access_token: 'session' };
  },

  async getCurrentUser() {
    const res = await api.get('/auth/me'); // 401 → бросит → провайдер очистит сессию
    const user = mapUser(res?.user);
    if (!user) throw new Error('Не авторизован');
    // Пускаем любого авторизованного: админ → админка, клиент → личный кабинет
    // (роутинг по роли, см. is_admin). raw хранит все поля нашего юзера для ЛК.
    user.raw = res.user;
    return user;
  },

  async getUserProfile() {
    return this.getCurrentUser();
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      /* даже если запрос упал — локально считаем разлогиненным */
    }
  },

  // Не используются в админке — заглушки с понятной ошибкой.
  signInWithOAuth: notSupported('Вход через OAuth'),
  register: notSupported('Регистрация'),
  requestPasswordReset: notSupported('Сброс пароля'),
  resetPassword: notSupported('Сброс пароля'),
  resendVerificationEmail: notSupported('Повторная отправка кода'),
  updateUserProfile: notSupported('Обновление профиля'),
};
