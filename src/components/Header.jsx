import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

const LINKS = [
  ['/catalog', 'Автопарк'],
  ['/long-term', 'Подписка'],
  ['/tariffs', 'Тарифы'],
  ['/photo', 'Фотосессии'],
  ['/terms', 'Условия аренды'],
  ['/club', 'Клуб'],
  ['/blog', 'Блог'],
  ['/contacts', 'Контакты'],
];

export default function Header() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isActive = (path) => location.pathname === path;
  const overlay = location.pathname === '/';

  const renderLink = ([href, text]) => {
    if (href.startsWith('/')) {
      return (
        <Link key={href + text} to={href} className={isActive(href) ? 'active' : ''}>{text}</Link>
      );
    }
    return <a key={href + text} href={href}>{text}</a>;
  };

  return (
    <>
      <header className={`header${overlay ? ' header-overlay' : ''}${scrolled ? ' header-scrolled' : ''}`}><div className="nav">
        <Logo />
        <nav className="nav-links">
          {LINKS.map(renderLink)}
        </nav>
        <div className="nav-right">

          {user ? (
            <>
              {user.role === 'admin' && (
                <Link to="/admin" className="account-btn hide-sm" style={{ marginRight: 8 }}>
                  <i className="ph-fill ph-shield-check" />
                  <span>Админка</span>
                </Link>
              )}
              {/* ЛК — в новой панели (отдельный бандл), поэтому жёсткая ссылка */}
              <a href="/admin/me" className="account-btn hide-sm" title={user.name}>
                {user.avatar_url
                  ? <img src={user.avatar_url} alt="" className="account-btn-ava" />
                  : <i className="ph-fill ph-user-circle" />}
                <span>{user.name.split(' ')[0] || 'Кабинет'}</span>
              </a>
            </>
          ) : (
            <Link to="/login" className="account-btn hide-sm">
              <i className="ph-fill ph-user-circle" />
              <span>Войти</span>
            </Link>
          )}
          <Link to="/contacts" className="contact-btn hide-sm">
            <i className="ph-fill ph-phone" />
            <span>Связаться</span>
          </Link>
          <button className="burger" id="burger" aria-label="Меню" onClick={() => setOpen(true)}>
            <span></span><span></span><span></span>
          </button>
        </div>
      </div></header>
      <div className={`mobile-menu${open ? ' open' : ''}`} id="mobile-menu" aria-hidden={!open}>
        <div className="mm-head">
          <Logo />
          <button className="mm-close" id="mm-close" aria-label="Закрыть" onClick={() => setOpen(false)}>×</button>
        </div>
        <div className="mm-body">
          <nav className="mm-nav">
            {LINKS.map(([href, text]) => (
              href.startsWith('/')
                ? <Link key={href} to={href} className={isActive(href) ? 'active' : ''} onClick={() => setOpen(false)}>{text}</Link>
                : <a key={href} href={href} onClick={() => setOpen(false)}>{text}</a>
            ))}
          </nav>
          <div className="mm-section">
            <div className="mm-section-title">Связь</div>
            <a href="tel:+79253122802" className="mm-sub mm-icon"><i className="ph-fill ph-phone" /> +7 925 312 28 02</a>
            <a href="https://wa.me/79253122802?text=Здравствуйте!%20Пишу%20с%20сайта%20AURIX%20MOTORS%20—%20хочу%20задать%20вопрос%20по%20аренде." target="_blank" rel="noopener noreferrer" className="mm-sub mm-icon"><i className="ph-fill ph-whatsapp-logo" /> WhatsApp</a>
            <a href="https://t.me/aurixmotors" className="mm-sub mm-icon"><i className="ph-fill ph-telegram-logo" /> Telegram</a>
            <a href="mailto:info@aurixmotors.com" className="mm-sub mm-icon"><i className="ph-fill ph-envelope" /> info@aurixmotors.com</a>
          </div>
          <div className="mm-foot">
            <a href="/admin/me" className="btn" style={{ width: '100%', marginBottom: 10 }} onClick={() => setOpen(false)}><i className="ph-fill ph-user-circle" /> &nbsp;Личный кабинет</a>
            <Link to="/catalog" className="btn btn-filled" style={{ width: '100%' }} onClick={() => setOpen(false)}>Забронировать авто</Link>
          </div>
        </div>
      </div>
    </>
  );
}
