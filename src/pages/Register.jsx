import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import SafeShader from '../components/SafeShader.jsx';

export default function Register() {
  const { register, verifyEmailCode, resendEmailCode } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'code'
  const [code, setCode] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.phone.trim()) return setError('Укажите телефон');
    if (form.password.length < 6) return setError('Пароль минимум 6 символов');
    if (form.password !== form.confirm) return setError('Пароли не совпадают');
    if (!consent) return setError('Необходимо согласие на обработку персональных данных');
    setSubmitting(true);
    try {
      const res = await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      if (res.needsEmailVerify) setStep('code'); // аккаунт создан, подтвердим почту кодом
      else window.location.assign('/admin/me');
    } catch (err) {
      setError(err.message || 'Ошибка регистрации');
    } finally {
      setSubmitting(false);
    }
  };

  const onVerify = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      await verifyEmailCode(code.trim());
      window.location.assign('/admin/me');
    } catch (err) {
      setError(err.message || 'Неверный код');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-fullscreen">
      <div className="auth-shader">
        <SafeShader
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

        {step === 'form' ? (
          <>
            <h1 className="auth-title">Регистрация</h1>
            <p className="auth-sub">Создайте аккаунт AURIX MOTORS и начните бронировать.</p>
            <form onSubmit={onSubmit} className="auth-form">
              <label>
                <span>Имя</span>
                <input value={form.name} onChange={set('name')} placeholder="Иван Соколов" required autoFocus />
              </label>
              <label>
                <span>Email</span>
                <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
              </label>
              <label>
                <span>Телефон</span>
                <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+7 999 123 45 67" required />
              </label>
              <label>
                <span>Пароль</span>
                <input type="password" value={form.password} onChange={set('password')} placeholder="Минимум 6 символов" required />
              </label>
              <label>
                <span>Повторите пароль</span>
                <input type="password" value={form.confirm} onChange={set('confirm')} required />
              </label>
              <label className="auth-consent">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>Я согласен на <Link to="/privacy" target="_blank">обработку персональных данных</Link> и принимаю <Link to="/terms" target="_blank">условия</Link>.</span>
              </label>
              {error && <div className="auth-error">{error}</div>}
              <button className="auth-cta" type="submit" disabled={submitting}>
                {submitting ? 'Создаём…' : 'Создать аккаунт'}
              </button>
            </form>
            <div className="auth-foot">
              Уже есть аккаунт? <Link to="/login">Войти</Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="auth-title">Подтвердите email</h1>
            <p className="auth-sub">Отправили 6-значный код на <b>{form.email}</b>. Введите его для подтверждения.</p>
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
            <div className="auth-foot" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" onClick={() => resendEmailCode().then(() => setError('Код отправлен повторно')).catch(() => {})} style={{ background: 'none', border: 0, color: 'var(--gold)', cursor: 'pointer', font: 'inherit' }}>Отправить ещё раз</button>
              <button type="button" onClick={() => window.location.assign('/admin/me')} style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', font: 'inherit' }}>Пропустить</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
