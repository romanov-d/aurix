import { toAbsoluteUrl } from '@/lib/helpers';

// Единая заглушка аватара для всех аккаунтов, пока пользователь не загрузит своё фото.
export const BLANK_AVATAR = toAbsoluteUrl('/media/avatars/blank.png');

// Возвращает аватар пользователя или нейтральную заглушку.
// Принимает объект пользователя (avatar_url/pic/avatar) либо строку.
export function avatarUrl(userOrUrl) {
  if (typeof userOrUrl === 'string') return userOrUrl || BLANK_AVATAR;
  const a = userOrUrl?.avatar_url || userOrUrl?.pic || userOrUrl?.avatar;
  return a || BLANK_AVATAR;
}
