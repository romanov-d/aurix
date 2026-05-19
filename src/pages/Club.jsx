import { Link } from 'react-router-dom';

export default function Club() {
  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="breadcrumbs"><Link to="/">Главная</Link><span className="sep">/</span><span>Клубная карта</span></div>
          <h1>Клубная карта <em>AURIX</em></h1>
        </div>
      </div>

      <section>
        <div className="container">
          <div className="club-hero">
            <div>
              <div className="club-card">
                <div className="ctop">
                  <div className="logo-mark">A</div>
                  <div className="ctier">Gold Member</div>
                </div>
                <div className="cnum">5224 · 8842 · 1027</div>
                <div className="cname">
                  <div>
                    <div className="who">Member</div>
                    <div className="nm">IVAN PETROV</div>
                  </div>
                  <div>
                    <div className="who">Valid Thru</div>
                    <div className="nm">12 / 28</div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="row-eyebrow"><span className="bar"></span><span className="eyebrow">Привилегии</span></div>
              <h2 className="serif" style={{ fontSize: 38, letterSpacing: '.04em', marginTop: 14 }}>Закрытый клуб <em className="gold" style={{ fontStyle: 'italic' }}>AURIX</em></h2>
              <p className="muted" style={{ marginTop: 18, fontSize: 14, lineHeight: 1.85, color: '#bdbdbd' }}>Клубная карта — это не скидка, а статус. Доступ к лучшим машинам, событиям и привилегиям, которых нет в открытом доступе.</p>

              <div className="club-perks">
                <div className="perk"><div className="ico"><i className="ph-fill ph-percent" /></div><h4>Скидка до −25%</h4><p>На любую аренду в любой день. Распространяется на доп. услуги.</p></div>
                <div className="perk"><div className="ico"><i className="ph-fill ph-lightning" /></div><h4>Приоритет подачи</h4><p>Бронирование за 6 месяцев и приоритет на дефицитные модели.</p></div>
                <div className="perk"><div className="ico"><i className="ph-fill ph-arrow-fat-up" /></div><h4>Апгрейд класса</h4><p>Бесплатное повышение класса при наличии. До 4 раз в год.</p></div>
                <div className="perk"><div className="ico"><i className="ph-fill ph-crown" /></div><h4>Закрытые ивенты</h4><p>Тест-драйвы новых моделей, ужины и партнёрские мероприятия.</p></div>
              </div>
            </div>
          </div>

          <div className="divider-h"></div>

          <div className="section-head center">
            <div className="row-eyebrow" style={{ justifyContent: 'center' }}><span className="bar"></span><span className="eyebrow">Уровни членства</span><span className="bar"></span></div>
            <h2>Выберите свой <em>статус</em></h2>
          </div>

          <div className="tariffs">
            <div className="tariff">
              <h3 style={{ color: '#cfcfcf' }}>Silver</h3>
              <div className="price">120 000 ₽</div>
              <div className="per">в год</div>
              <ul>
                <li>Скидка −10% на аренду</li>
                <li>Бесплатная подача</li>
                <li>Бронирование за 30 дней</li>
                <li>Приоритетная поддержка</li>
              </ul>
              <a href="#" className="btn" style={{ width: '100%' }}>Оформить</a>
            </div>
            <div className="tariff pop">
              <h3>Gold</h3>
              <div className="price">280 000 ₽</div>
              <div className="per">в год · популярно</div>
              <ul>
                <li>Скидка −18% на аренду</li>
                <li>Апгрейд класса 2 раза/год</li>
                <li>Бронирование за 90 дней</li>
                <li>VIP-сопровождение</li>
                <li>Доступ к закрытым ивентам</li>
              </ul>
              <a href="#" className="btn btn-filled" style={{ width: '100%' }}>Оформить</a>
            </div>
            <div className="tariff">
              <h3 style={{ color: '#fff' }}>Black</h3>
              <div className="price">650 000 ₽</div>
              <div className="per">в год · по приглашению</div>
              <ul>
                <li>Скидка −25% на аренду</li>
                <li>Безлимитный апгрейд</li>
                <li>Бронирование за 180 дней</li>
                <li>Личный менеджер 24/7</li>
                <li>Все ивенты + партнёры</li>
                <li>Concierge сервис</li>
              </ul>
              <a href="#" className="btn" style={{ width: '100%' }}>Оставить заявку</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
