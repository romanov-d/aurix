import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('Пароль минимум 6 символов');
    if (form.password !== form.confirm) return setError('Пароли не совпадают');
    setSubmitting(true);
    try {
      await register({ name: form.name, email: form.email, phone: form.phone || undefined, password: form.password });
      nav('/account', { replace: true });
    } catch (err) {
      setError(err.message || 'Ошибка регистрации');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Регистрация</h1>
        <p className="auth-sub">Создайте аккаунт AURIX и начните бронировать.</p>
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
            <span>Телефон <em>(необязательно)</em></span>
            <input value={form.phone} onChange={set('phone')} placeholder="+7 999 123 45 67" />
          </label>
          <label>
            <span>Пароль</span>
            <input type="password" value={form.password} onChange={set('password')} placeholder="Минимум 6 символов" required />
          </label>
          <label>
            <span>Повторите пароль</span>
            <input type="password" value={form.confirm} onChange={set('confirm')} required />
          </label>
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-cta" type="submit" disabled={submitting}>
            {submitting ? 'Создаём…' : 'Создать аккаунт'}
          </button>
        </form>
        <div className="auth-foot">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </div>
      </div>
    </div>
  );
}
