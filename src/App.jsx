import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Preloader from './components/Preloader.jsx';
import Home from './pages/Home.jsx'; // главная — eager, чтобы лендинг был мгновенным
// Остальные страницы — отдельными чанками (code-splitting): грузятся по заходу,
// чтобы стартовый бандл не тащил всю админку и второстепенные страницы на телефон.
const Catalog = lazy(() => import('./pages/Catalog.jsx'));
const Car = lazy(() => import('./pages/Car.jsx'));
const LongTerm = lazy(() => import('./pages/LongTerm.jsx'));
const Club = lazy(() => import('./pages/Club.jsx'));
const Terms = lazy(() => import('./pages/Terms.jsx'));
const Privacy = lazy(() => import('./pages/Privacy.jsx'));
const Blog = lazy(() => import('./pages/Blog.jsx'));
const BlogPost = lazy(() => import('./pages/BlogPost.jsx'));
const Contacts = lazy(() => import('./pages/Contacts.jsx'));
const Account = lazy(() => import('./pages/Account.jsx'));
const RentOut = lazy(() => import('./pages/RentOut.jsx'));
const Tariffs = lazy(() => import('./pages/Tariffs.jsx'));
const PhotoRental = lazy(() => import('./pages/PhotoRental.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));
import RequireAuth from './components/RequireAuth.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';

// Жёсткий переход в новую панель (/admin — отдельный бандл, отдаёт Express).
// Обычный <Navigate> не подходит: остались бы внутри SPA основного сайта.
function RedirectToPanel() {
  useEffect(() => { window.location.replace('/admin/'); }, []);
  return <div style={{ minHeight: '70vh' }} />;
}

export default function App() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const isAuth = pathname === '/login' || pathname === '/register';
  const [transClass, setTransClass] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    setTransClass('pt-in');
    timerRef.current = setTimeout(() => setTransClass('pt-out'), 50);
    timerRef.current = setTimeout(() => setTransClass(''), 450);

    window.scrollTo(0, 0);
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  const noHeader = isAuth || pathname.startsWith('/admin') || pathname === '/account';
  const noFooter = isAuth || pathname.startsWith('/admin') || pathname === '/account';

  return (
    <AuthProvider>
      {transClass && <div className={`page-transition ${transClass}`} />}
      <Preloader />
      {!noHeader && <Header />}
      <div className={noHeader ? '' : isHome ? '' : 'page-wrap'}>
      <Suspense fallback={<div style={{ minHeight: '70vh' }} />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/car/:id" element={<Car />} />
        <Route path="/long-term" element={<LongTerm />} />
        <Route path="/club" element={<Club />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:id" element={<BlogPost />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
        {/* Старая встроенная админка выведена из оборота: /admin — всегда новая панель
            (отдельный бандл admin/dist, Express). Жёсткий переход мимо SPA-роутера,
            иначе клиентская навигация рендерит старый Admin.jsx без запроса к серверу.
            Старая остаётся на /admin-legacy как аварийный запасной вход. */}
        <Route path="/admin" element={<RedirectToPanel />} />
        <Route path="/admin-legacy" element={<RequireAuth><Admin /></RequireAuth>} />
        <Route path="/rent-out" element={<RentOut />} />
        <Route path="/tariffs" element={<Tariffs />} />
        <Route path="/photo" element={<PhotoRental />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
      </Suspense>
      </div>
      {!noFooter && <Footer />}
    </AuthProvider>
  );
}
