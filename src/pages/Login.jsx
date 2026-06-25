import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { GrainGradient } from '@paper-design/shaders-react';
import ErrorBoundary from '../components/ErrorBoundary.jsx';

export default function Login() {
  const { login, loginVerify } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState('login'); // 'login' | 'code'
  const [code, setCode] = useState('');

  const goNext = () => nav(loc.state?.from?.pathname || '/account', { replace: true });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await login({ email, password });
      if (res.needsCode) { setStep('code'); }
      else { goNext(); }
    } catch (err) {
      setError(err.message || 'Ошибка входа');
    } finally {
      setSubmitting(false);
    }
  };

  const onVerify = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await loginVerify({ email, code: code.trim() });
      goNext();
    } catch (err) {
      setError(err.message || 'Неверный код');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-fullscreen">
      <div className="auth-shader">
        <ErrorBoundary name="login-shader" fallback={null}>
          <GrainGradient
            style={{ width: '100%', height: '100%' }}
            colorBack="hsl(0,0%,0%)"
            softness={0.55}
            intensity={0.65}
            noise={0}
            shape="corners"
            offsetX={0}
            offsetY={0}
            scale={1}
            rotation={0}
            speed={1.6}
            colors={['hsl(46,65%,55%)', 'hsl(42,60%,40%)', 'hsl(32,45%,15%)']}
          />
        </ErrorBoundary>
      </div>

      <div className="auth-glass">
        <div className="auth-top">
          <Link to="/" className="auth-logo">
            <img src="/logo.svg" alt="AURIX MOTORS" />
          </Link>
          <Link to="/" className="auth-back">
            <i className="ph ph-arrow-left" /> Назад
          </Link>
        </div>

        {step === 'login' ? (
          <>
            <h1 className="auth-title">Вход в кабинет</h1>
            <p className="auth-sub">Введите email и пароль для входа.</p>
            <form onSubmit={onSubmit} className="auth-form">
              <label>
                <span>Email</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
              </label>
              <label>
                <span>Пароль</span>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Минимум 6 символов" required />
              </label>
              {error && <div className="auth-error">{error}</div>}
              <button className="auth-cta" type="submit" disabled={submitting}>
                {submitting ? 'Входим…' : 'Войти'}
              </button>
            </form>
            <div className="auth-foot">
              Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="auth-title">Код подтверждения</h1>
            <p className="auth-sub">Отправили 6-значный код на <b>{email}</b>. Введите его, чтобы войти.</p>
            <form onSubmit={onVerify} className="auth-form">
              <label>
                <span>Код из письма</span>
                <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="000000" required autoFocus
                  style={{ letterSpacing: '8px', fontSize: 22, textAlign: 'center' }} />
              </label>
              {error && <div className="auth-error">{error}</div>}
              <button className="auth-cta" type="submit" disabled={submitting}>
                {submitting ? 'Проверяем…' : 'Подтвердить'}
              </button>
            </form>
            <div className="auth-foot">
              <button type="button" onClick={() => { setStep('login'); setCode(''); setError(''); }} style={{ background: 'none', border: 0, color: 'var(--gold)', cursor: 'pointer', font: 'inherit' }}>← Назад</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
