import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function Contacts() {
  const [form, setForm] = useState({ name: '', phone: '', car: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    if (error) setError('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Имя и телефон обязательны для заполнения');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await api('/contact', {
        method: 'POST',
        body: form,
      });
      setSuccess(true);
      setForm({ name: '', phone: '', car: '', message: '' });
    } catch (err) {
      setError(err.message || 'Произошла ошибка при отправке заявки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="breadcrumbs"><Link to="/">Главная</Link><span className="sep">/</span><span>Контакты</span></div>
          <h1>Свяжитесь <em>с нами</em></h1>
          <p style={{ color: '#bdbdbd', maxWidth: 540, marginTop: 18, fontSize: 15, lineHeight: 1.7 }}>Мы на связи 24/7. Звоните, пишите в мессенджеры или приезжайте в наш шоурум.</p>
        </div>
      </div>

      <section>
        <div className="container">
          <div className="contacts-grid">
            <div>
              <div className="contact-box">
                <div className="lbl">Телефон · 24/7</div>
                <div className="v">+7 999 123 45 67<small>Москва, основной номер</small></div>
              </div>
              <div className="contact-box">
                <div className="lbl">Мессенджеры</div>
                <div className="v">@aurixmotors<small>Telegram · WhatsApp · iMessage</small></div>
              </div>
              <div className="contact-box">
                <div className="lbl">Email</div>
                <div className="v">info@aurixmotors.com<small>booking@aurixmotors.com — бронирование</small></div>
              </div>
              <div className="contact-box">
                <div className="lbl">Шоурум</div>
                <div className="v">Москва, Олимпийский проспект, 12<small>Ежедневно, 24 часа</small></div>
              </div>
            </div>

            <div>
              <div className="map"></div>

              <form className="form-card" onSubmit={onSubmit} style={{ marginTop: 24, padding: 32 }}>
                <h3 className="serif" style={{ color: 'var(--gold)', fontSize: 22, marginBottom: 18 }}>Оставьте заявку</h3>
                
                {success && (
                  <div style={{ color: '#2ecc71', marginBottom: 18, fontSize: 14, background: 'rgba(46, 204, 113, 0.1)', padding: '12px 16px', borderRadius: 6 }}>
                    Заявка успешно отправлена! Мы перезвоним вам в течение 5 минут.
                  </div>
                )}

                {error && (
                  <div style={{ color: '#e74c3c', marginBottom: 18, fontSize: 14, background: 'rgba(231, 76, 60, 0.1)', padding: '12px 16px', borderRadius: 6 }}>
                    {error}
                  </div>
                )}

                <div className="form-row">
                  <div className="field">
                    <label>Имя</label>
                    <input 
                      value={form.name}
                      onChange={handleChange('name')}
                      placeholder="Иван" 
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="field">
                    <label>Телефон</label>
                    <input 
                      value={form.phone}
                      onChange={handleChange('phone')}
                      placeholder="+7 999 123 45 67" 
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="field" style={{ marginBottom: 18 }}>
                  <label>Какой автомобиль вас интересует</label>
                  <input 
                    value={form.car}
                    onChange={handleChange('car')}
                    placeholder="Mercedes-AMG SL 43" 
                    disabled={loading}
                  />
                </div>
                <div className="field">
                  <label>Сообщение</label>
                  <textarea 
                    value={form.message}
                    onChange={handleChange('message')}
                    placeholder="Даты, пожелания, дополнительные услуги" 
                    disabled={loading}
                  />
                </div>
                <div className="form-actions">
                  <p className="note">Перезвоним в течение 5 минут</p>
                  <button className="btn btn-filled" type="submit" disabled={loading}>
                    {loading ? 'Отправка...' : 'Отправить'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

