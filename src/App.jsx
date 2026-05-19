import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Preloader from './components/Preloader.jsx';
import Home from './pages/Home.jsx';
import Catalog from './pages/Catalog.jsx';
import Car from './pages/Car.jsx';
import LongTerm from './pages/LongTerm.jsx';
import Club from './pages/Club.jsx';
import Terms from './pages/Terms.jsx';
import Contacts from './pages/Contacts.jsx';
import Account from './pages/Account.jsx';
import RentOut from './pages/RentOut.jsx';
import Tariffs from './pages/Tariffs.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';

export default function App() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  useEffect(() => {
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

  return (
    <AuthProvider>
      <Preloader />
      <Header />
      <div className={isHome ? '' : 'page-wrap'}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/car/:id" element={<Car />} />
        <Route path="/long-term" element={<LongTerm />} />
        <Route path="/club" element={<Club />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
        <Route path="/rent-out" element={<RentOut />} />
        <Route path="/tariffs" element={<Tariffs />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
      </div>
      <Footer />
    </AuthProvider>
  );
}
