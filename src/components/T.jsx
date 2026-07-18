import { useText } from '../contexts/ContentContext.jsx';

// Редактируемый из админки текст.
// <T k="home.hero.title">Дефолтный текст</T>              — обычный текст
// <T k="home.hero.title" as="h1" className="x" html>…</T> — с разметкой (<br>, <span>)
// children (JSX или строка) = fallback, пока ключ не переопределён в CMS.
export default function T({ k, children, as: Tag = 'span', html = false, ...rest }) {
  const fallbackText =
    typeof children === 'string' ? children : undefined;
  const value = useText(k, fallbackText ?? '');

  // Нет значения в CMS и fallback — сложный JSX → рендерим как есть (например, заголовок с версткой)
  if ((value === '' || value === undefined) && typeof children !== 'string') {
    return <Tag {...rest}>{children}</Tag>;
  }
  if (html) {
    return <Tag {...rest} dangerouslySetInnerHTML={{ __html: value }} />;
  }
  return <Tag {...rest}>{value}</Tag>;
}
