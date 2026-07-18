import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import T from '../components/T.jsx';

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
    <div className="contacts-page-container">
      <style>{`
        .contacts-page-container, .contacts-page-container * {
          font-family: 'Inter', sans-serif !important;
        }
      `}</style>
      <div className="page-head">
        <div className="container">
          <div className="breadcrumbs"><Link to="/"><T k="contacts.hero.crumbHome">Главная</T></Link><span className="sep">/</span><span><T k="contacts.hero.crumbCurrent">Контакты</T></span></div>
          <T k="contacts.hero.title" as="h1" html>Свяжитесь <em>с нами</em></T>
          <T k="contacts.hero.lead" as="p" style={{ color: '#bdbdbd', maxWidth: 540, marginTop: 18, fontSize: 15, lineHeight: 1.7 }}>Мы на связи 24/7. Звоните, пишите в мессенджеры или приезжайте в наш шоурум.</T>
        </div>
      </div>

      <section style={{ paddingBottom: 80 }}>
        <div className="container">
          <div className="contacts-top-row">
            <div>
              <div className="contact-box">
                <T k="contacts.info.phoneLabel" as="div" className="lbl">Телефон · 24/7</T>
                <div className="v"><T k="contacts.info.phone">+7 999 123 45 67</T><T k="contacts.info.phoneNote" as="small">Москва, основной номер</T></div>
              </div>
              <div className="contact-box">
                <T k="contacts.info.messengersLabel" as="div" className="lbl">Мессенджеры</T>
                <div className="v"><T k="contacts.info.messengers">@aurixmotors</T><T k="contacts.info.messengersNote" as="small">Telegram · WhatsApp · iMessage</T></div>
              </div>
              <div className="contact-box">
                <T k="contacts.info.emailLabel" as="div" className="lbl">Email</T>
                <div className="v"><T k="contacts.info.email">info@aurixmotors.com</T><T k="contacts.info.emailNote" as="small">booking@aurixmotors.com — бронирование</T></div>
              </div>
              <div className="contact-box">
                <T k="contacts.info.addressLabel" as="div" className="lbl">Шоурум</T>
                <div className="v"><T k="contacts.info.address">Москва, Олимпийский проспект, 12</T><T k="contacts.info.hours" as="small">Ежедневно, 24 часа</T></div>
              </div>
            </div>

            <div>
              <form className="form-card" onSubmit={onSubmit} style={{ padding: 32, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <T k="contacts.form.title" as="h3" style={{ color: 'var(--gold)', fontSize: 22, marginBottom: 18, fontWeight: 600 }}>Оставьте заявку</T>
                
                {success && (
                  <div style={{ color: '#2ecc71', marginBottom: 18, fontSize: 14, background: 'rgba(46, 204, 113, 0.1)', padding: '12px 16px', borderRadius: 6 }}>
                    <T k="contacts.form.success">Заявка успешно отправлена! Мы перезвоним вам в течение 5 минут.</T>
                  </div>
                )}

                {error && (
                  <div style={{ color: '#e74c3c', marginBottom: 18, fontSize: 14, background: 'rgba(231, 76, 60, 0.1)', padding: '12px 16px', borderRadius: 6 }}>
                    {error}
                  </div>
                )}

                <div className="form-row">
                  <div className="field">
                    <label><T k="contacts.form.labelName">Имя</T></label>
                    <input
                      value={form.name}
                      onChange={handleChange('name')}
                      placeholder="Иван"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="field">
                    <label><T k="contacts.form.labelPhone">Телефон</T></label>
                    <input
                      value={form.phone}
                      onChange={handleChange('phone')}
                      placeholder="+7 999 123 45 67"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="field" style={{ marginBottom: 18, marginTop: 16 }}>
                  <label><T k="contacts.form.labelCar">Какой автомобиль вас интересует</T></label>
                  <input 
                    value={form.car}
                    onChange={handleChange('car')}
                    placeholder="Mercedes-AMG SL 43" 
                    disabled={loading}
                  />
                </div>
                <div className="field" style={{ marginBottom: 18 }}>
                  <label><T k="contacts.form.labelMessage">Сообщение</T></label>
                  <textarea 
                    value={form.message}
                    onChange={handleChange('message')}
                    placeholder="Даты, пожелания, дополнительные услуги" 
                    disabled={loading}
                  />
                </div>
                <div className="form-actions" style={{ marginTop: 8 }}>
                  <T k="contacts.form.note" as="p" className="note">Перезвоним в течение 5 минут</T>
                  <button className="btn btn-filled" type="submit" disabled={loading}>
                    {loading ? <T k="contacts.form.loading">Отправка...</T> : <T k="contacts.form.submit">Отправить</T>}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="contacts-bottom-row" style={{ width: '100%', marginTop: '40px' }}>
            <iframe 
              src="https://yandex.ru/map-widget/v1/?text=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0%2C%20%D0%9E%D0%BB%D0%B8%D0%BC%D0%BF%D0%B8%D0%B9%D1%81%D0%BA%D0%B8%D0%B9%20%D0%BF%D1%80%D0%BE%D1%81%D0%BF%D0%B5%D0%BA%2C%2012&z=15" 
              width="100%" 
              height="450" 
              frameBorder="0" 
              style={{ border: 0, borderRadius: '14px', filter: 'invert(90%) hue-rotate(180deg) sepia(10%) contrast(90%)' }}
              title="Шоурум AURIX MOTORS на карте"
            ></iframe>
          </div>
        </div>
      </section>
    </div>
  );
}

