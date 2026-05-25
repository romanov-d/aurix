import { Link } from 'react-router-dom';

const tiers = [
  {
    label: 'Старт',
    deposit: '500 000 ₽',
    discount: '5%',
    period: '1 год',
    popular: false,
    perks: [
      'Скидка 5% на все аренды',
      'Приоритетная поддержка',
      'Бронирование первым',
      'Срок действия 1 год',
    ],
  },
  {
    label: 'Комфорт',
    deposit: '1 000 000 ₽',
    discount: '15%',
    period: '1 год',
    popular: false,
    perks: [
      'Скидка 15% на все аренды',
      'Приоритет на дефицитные модели',
      'Приоритетная поддержка 24/7',
      'Срок действия 1 год',
    ],
  },
  {
    label: 'Премиум',
    deposit: '2 000 000 ₽',
    discount: '25%',
    period: 'без срока',
    popular: true,
    perks: [
      'Скидка 25% на все аренды',
      'Бессрочная карта',
      'VIP-сопровождение и доступ к закрытым ивентам',
      'Личный менеджер',
    ],
  },
  {
    label: 'Black',
    deposit: '4 000 000 ₽',
    discount: '40%',
    period: 'без срока',
    popular: false,
    perks: [
      'Скидка 40% — максимальная привилегия',
      'Бессрочная карта',
      'Личный менеджер 24/7',
      'Все закрытые ивенты и партнёрские мероприятия',
      'Concierge сервис',
    ],
  },
];

export default function Club() {
  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="breadcrumbs">
            <Link to="/">Главная</Link><span className="sep">/</span><span>Клубная карта</span>
          </div>
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
                  <div className="ctier">Club Member</div>
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
              <h2 className="serif" style={{ fontSize: 38, letterSpacing: '.04em', marginTop: 14 }}>
                Закрытый клуб <em className="gold" style={{ fontStyle: 'italic' }}>AURIX</em>
              </h2>
              <p className="muted" style={{ marginTop: 18, fontSize: 14, lineHeight: 1.85, color: '#bdbdbd' }}>
                Клубная карта — это не просто скидка, а статус. Разместите депозит и получите персональную скидку от 5 до 40% на любую аренду. Карта действует без ограничений по числу поездок.
              </p>

              <div className="club-perks">
                <div className="perk">
                  <div className="ico"><i className="ph-fill ph-percent" /></div>
                  <h4>Скидка до −40%</h4>
                  <p>На любую аренду в любой день. Скидка применяется автоматически.</p>
                </div>
                <div className="perk">
                  <div className="ico"><i className="ph-fill ph-lightning" /></div>
                  <h4>Приоритет подачи</h4>
                  <p>Держатели карт получают приоритет при бронировании дефицитных моделей.</p>
                </div>
                <div className="perk">
                  <div className="ico"><i className="ph-fill ph-arrow-fat-up" /></div>
                  <h4>Без срока</h4>
                  <p>Карты уровня Премиум и Black действуют бессрочно — без ежегодного продления.</p>
                </div>
                <div className="perk">
                  <div className="ico"><i className="ph-fill ph-crown" /></div>
                  <h4>Закрытые ивенты</h4>
                  <p>Тест-драйвы новинок, закрытые ужины и партнёрские мероприятия.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="divider-h"></div>

          <div className="section-head center">
            <div className="row-eyebrow" style={{ justifyContent: 'center' }}>
              <span className="bar"></span><span className="eyebrow">Уровни членства</span><span className="bar"></span>
            </div>
            <h2>Выберите свой <em>статус</em></h2>
          </div>

          <div className="tariffs" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {tiers.map(tier => (
              <div key={tier.label} className={`tariff${tier.popular ? ' pop' : ''}`}>
                {tier.popular && (
                  <div style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#000', background: 'var(--gold)', padding: '4px 10px', marginBottom: 12, display: 'inline-block', fontWeight: 700 }}>
                    Популярно
                  </div>
                )}
                <h3 style={{ color: tier.label === 'Black' ? '#fff' : undefined }}>{tier.label}</h3>
                <div style={{ marginTop: 10, marginBottom: 2 }}>
                  <span className="serif gold" style={{ fontSize: 36, fontWeight: 700 }}>{tier.discount}</span>
                </div>
                <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>скидка на аренду</div>
                <div className="price" style={{ fontSize: 18 }}>{tier.deposit}</div>
                <div className="per">депозит · {tier.period}</div>
                <ul>
                  {tier.perks.map(p => <li key={p}>{p}</li>)}
                </ul>
                <Link
                  to="/contacts"
                  className={`btn${tier.popular ? ' btn-filled' : ''}`}
                  style={{ width: '100%' }}
                >
                  Получить карту
                </Link>
              </div>
            ))}
          </div>

          <div className="divider-h"></div>

          {/* Gift certificates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
            <div style={{ background: '#101010', padding: '40px 40px', gridColumn: '1 / -1' }}>
              <div className="row-eyebrow" style={{ marginBottom: 16 }}>
                <span className="bar"></span><span className="eyebrow">Подарочные сертификаты</span>
              </div>
              <h2 className="serif" style={{ fontSize: 30, marginBottom: 16 }}>
                Подарите <em>впечатления</em>
              </h2>
              <p style={{ color: '#bdbdbd', fontSize: 14, lineHeight: 1.85, maxWidth: 600 }}>
                Подарочный сертификат на аренду любого автомобиля из нашего парка. Стоимость сертификата равна стоимости <strong>одних суток аренды</strong> выбранного автомобиля. Срок действия сертификата — <strong>1 год</strong> с даты оформления.
              </p>
              <div style={{ marginTop: 28 }}>
                <Link to="/contacts" className="btn">Оформить сертификат</Link>
              </div>
            </div>
          </div>

        </div>
      </section>
    </>
  );
}
