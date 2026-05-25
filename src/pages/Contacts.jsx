import { Link } from 'react-router-dom';

export default function Contacts() {
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

              <div className="form-card" style={{ marginTop: 24, padding: 32 }}>
                <h3 className="serif" style={{ color: 'var(--gold)', fontSize: 22, marginBottom: 18 }}>Оставьте заявку</h3>
                <div className="form-row">
                  <div className="field"><label>Имя</label><input placeholder="Иван" /></div>
                  <div className="field"><label>Телефон</label><input placeholder="+7 ___ ___ __ __" /></div>
                </div>
                <div className="field" style={{ marginBottom: 18 }}><label>Какой автомобиль вас интересует</label><input placeholder="Mercedes-AMG SL 43" /></div>
                <div className="field"><label>Сообщение</label><textarea placeholder="Даты, пожелания, дополнительные услуги" /></div>
                <div className="form-actions">
                  <p className="note">Перезвоним в течение 5 минут</p>
                  <button className="btn btn-filled">Отправить</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
