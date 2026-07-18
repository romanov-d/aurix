import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../api/client.js';
import T from '../components/T.jsx';

export default function RentOut() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [formData, setFormData] = useState({
    brand: '', name: '', year: '', body: '',
    fuel: '', engine: '', power_hp: '', drive: '',
    price_per_day: '', image_url: '', description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      nav('/login');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api('/me/cars', {
        method: 'POST',
        body: {
          ...formData,
          name: `${formData.brand} ${formData.name}`,
          year: parseInt(formData.year, 10),
          power_hp: parseInt(formData.power_hp, 10) || undefined,
          price_per_day: parseInt(formData.price_per_day, 10),
        }
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Ошибка при отправке заявки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="breadcrumbs"><Link to="/"><T k="rentout.crumb.home">Главная</T></Link><span className="sep">/</span><span><T k="rentout.crumb.current">Сдать свою машину</T></span></div>
          <T k="rentout.hero.title" as="h1" html>Сдайте свой автомобиль в <em>управление</em></T>
          <T k="rentout.hero.lead" as="p" style={{ color: '#bdbdbd', maxWidth: 640, marginTop: 18, fontSize: 15, lineHeight: 1.7 }}>Передайте премиальный автомобиль команде AURIX MOTORS — мы возьмём на себя бронирования, обслуживание, страховку и сервис. Вы получаете стабильный доход и прозрачную отчётность.</T>
        </div>
      </div>

      <section>
        <div className="container">
          <div className="lt-bullets">
            <div className="lt-bullet"><div className="n">01</div><T k="rentout.step1.title" as="h4">Заявка</T><T k="rentout.step1.desc" as="p">Отправляете данные авто и фото. Менеджер связывается в течение часа.</T></div>
            <div className="lt-bullet"><div className="n">02</div><T k="rentout.step2.title" as="h4">Оценка</T><T k="rentout.step2.desc" as="p">Технический осмотр, оценка стоимости аренды и подготовка авто к работе.</T></div>
            <div className="lt-bullet"><div className="n">03</div><T k="rentout.step3.title" as="h4">Договор</T><T k="rentout.step3.desc" as="p">Прозрачные условия, страхование от рисков, фиксированная доля.</T></div>
            <div className="lt-bullet"><div className="n">04</div><T k="rentout.step4.title" as="h4">Доход</T><T k="rentout.step4.desc" as="p">До 70% от аренды. Выплаты дважды в месяц, личный кабинет с отчётами.</T></div>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head center">
            <div className="row-eyebrow" style={{ justifyContent: 'center' }}><span className="bar"></span><span className="eyebrow"><T k="rentout.form.eyebrow">Заявка</T></span><span className="bar"></span></div>
            <T k="rentout.form.title" as="h2" html>Расскажите о <em>вашем авто</em></T>
          </div>

          {!user ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <T k="rentout.auth.prompt" as="p" className="muted" style={{ marginBottom: 20 }}>Чтобы оставить заявку, необходимо войти в систему.</T>
              <Link to="/login" className="btn btn-filled"><T k="rentout.auth.login">Войти</T></Link>
            </div>
          ) : success ? (
            <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--bg-2)', borderRadius: 20 }}>
              <i className="ph-fill ph-check-circle" style={{ fontSize: 64, color: 'var(--gold)', marginBottom: 20 }} />
              <T k="rentout.success.title" as="h2">Заявка успешно отправлена!</T>
              <T k="rentout.success.desc" as="p" className="muted" style={{ marginTop: 10, maxWidth: 400, margin: '10px auto 0' }}>
                Ваш автомобиль отправлен на модерацию. Мы свяжемся с вами в ближайшее время.
              </T>
              <Link to="/account" className="btn btn-ghost" style={{ marginTop: 30 }}><T k="rentout.success.cabinet">В личный кабинет</T></Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="form-card">
              <div className="form-row">
                <div className="field"><label><T k="rentout.field.brand">Марка *</T></label><input required name="brand" value={formData.brand} onChange={handleChange} placeholder="Mercedes-Benz" /></div>
                <div className="field"><label><T k="rentout.field.model">Модель *</T></label><input required name="name" value={formData.name} onChange={handleChange} placeholder="S 580" /></div>
              </div>
              <div className="form-row">
                <div className="field"><label><T k="rentout.field.year">Год выпуска *</T></label><input required type="number" name="year" value={formData.year} onChange={handleChange} placeholder="2024" /></div>
                <div className="field"><label><T k="rentout.field.body">Кузов</T></label><input name="body" value={formData.body} onChange={handleChange} placeholder="Седан" /></div>
              </div>
              <div className="form-row">
                <div className="field"><label><T k="rentout.field.engine">Двигатель</T></label><input name="engine" value={formData.engine} onChange={handleChange} placeholder="4.0 л" /></div>
                <div className="field"><label><T k="rentout.field.power">Мощность (л.с.)</T></label><input type="number" name="power_hp" value={formData.power_hp} onChange={handleChange} placeholder="503" /></div>
              </div>
              <div className="form-row">
                <div className="field"><label><T k="rentout.field.price">Желаемая цена (в сутки) *</T></label><input required type="number" name="price_per_day" value={formData.price_per_day} onChange={handleChange} placeholder="40000" /></div>
                <div className="field"><label><T k="rentout.field.image">URL фотографии (временное решение) *</T></label><input required type="url" name="image_url" value={formData.image_url} onChange={handleChange} placeholder="https://..." /></div>
              </div>
              <div className="field"><label><T k="rentout.field.desc">Комментарий / Описание</T></label><textarea name="description" value={formData.description} onChange={handleChange} placeholder="Дополнительная информация об автомобиле, комплектации, истории обслуживания" rows={3} style={{ background: '#000', border: '1px solid #333', color: '#fff', padding: 12, borderRadius: 8 }} /></div>
              
              {error && <div style={{ color: '#ef4444', fontSize: 14, marginTop: 10, textAlign: 'center' }}>{error}</div>}
              
              <div className="form-actions" style={{ marginTop: 24 }}>
                <T k="rentout.form.note" as="p" className="note">Нажимая «Отправить», вы принимаете условия партнерской программы AURIX MOTORS.</T>
                <button type="submit" disabled={loading} className="btn btn-filled">{loading ? <T k="rentout.form.submitting">Отправка...</T> : <T k="rentout.form.submit">Отправить заявку</T>}</button>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
