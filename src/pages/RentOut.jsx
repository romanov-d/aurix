import { Link } from 'react-router-dom';

export default function RentOut() {
  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="breadcrumbs"><Link to="/">Главная</Link><span className="sep">/</span><span>Сдать свою машину</span></div>
          <h1>Сдайте свой автомобиль в <em>управление</em></h1>
          <p style={{ color: '#bdbdbd', maxWidth: 640, marginTop: 18, fontSize: 15, lineHeight: 1.7 }}>Передайте премиальный автомобиль команде AURIX MOTORS — мы возьмём на себя бронирования, обслуживание, страховку и сервис. Вы получаете стабильный доход и прозрачную отчётность.</p>
        </div>
      </div>

      <section>
        <div className="container">
          <div className="lt-bullets">
            <div className="lt-bullet"><div className="n">01</div><h4>Заявка</h4><p>Отправляете данные авто и фото. Менеджер связывается в течение часа.</p></div>
            <div className="lt-bullet"><div className="n">02</div><h4>Оценка</h4><p>Технический осмотр, оценка стоимости аренды и подготовка авто к работе.</p></div>
            <div className="lt-bullet"><div className="n">03</div><h4>Договор</h4><p>Прозрачные условия, страхование от рисков, фиксированная доля.</p></div>
            <div className="lt-bullet"><div className="n">04</div><h4>Доход</h4><p>До 70% от аренды. Выплаты дважды в месяц, личный кабинет с отчётами.</p></div>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head center">
            <div className="row-eyebrow" style={{ justifyContent: 'center' }}><span className="bar"></span><span className="eyebrow">Заявка</span><span className="bar"></span></div>
            <h2>Расскажите о <em>вашем авто</em></h2>
          </div>

          <div className="form-card">
            <div className="form-row">
              <div className="field"><label>Марка</label><input placeholder="Mercedes-Benz" /></div>
              <div className="field"><label>Модель</label><input placeholder="S 580" /></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Год выпуска</label><input placeholder="2024" /></div>
              <div className="field"><label>Пробег, км</label><input placeholder="12 000" /></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Цвет</label><input placeholder="Чёрный обсидиан" /></div>
              <div className="field"><label>Город</label><select><option>Москва</option><option>Санкт-Петербург</option><option>Сочи</option><option>Дубай</option></select></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Ваше имя</label><input placeholder="Иван" /></div>
              <div className="field"><label>Телефон</label><input placeholder="+7 ___ ___ __ __" /></div>
            </div>
            <div className="field"><label>Комментарий</label><textarea placeholder="Дополнительная информация об автомобиле, комплектации, истории обслуживания" /></div>
            <div className="form-actions">
              <p className="note">Нажимая «Отправить», вы соглашаетесь с обработкой персональных данных и условиями оферты AURIX MOTORS.</p>
              <button className="btn btn-filled">Отправить заявку</button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
