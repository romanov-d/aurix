import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../api/client.js';

const tiers = [
  {
    label: 'Старт',
    deposit: '500 000 ₽',
    discount: '5%',
    period: '1 год',
    popular: false,
    minSpent: 500000,
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
    minSpent: 1000000,
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
    minSpent: 2000000,
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
    minSpent: 4000000,
    perks: [
      'Скидка 40% — максимальная privilege',
      'Бессрочная карта',
      'Личный менеджер 24/7',
      'Все закрытые ивенты и партнёрские мероприятия',
      'Concierge сервис',
    ],
  },
];

export default function Club() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    if (!user) return;
    api('/me/bookings')
      .then(setBookings)
      .catch(console.error);
  }, [user]);

  const totalSpent = bookings
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + b.total, 0);

  let currentTier = 'Club Member';
  if (totalSpent >= 4000000) currentTier = 'Black';
  else if (totalSpent >= 2000000) currentTier = 'Премиум';
  else if (totalSpent >= 1000000) currentTier = 'Комфорт';
  else if (totalSpent >= 500000) currentTier = 'Старт';

  const formatCardName = (name) => {
    if (!name) return 'GUEST USER';
    // Translate cyrillic to latin simply or uppercase cyrillic
    return name.toUpperCase();
  };

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
              <div className={`club-card ${currentTier.toLowerCase()}`}>
                <div className="ctop">
                  <div className="logo-mark">A</div>
                  <div className="ctier" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>{currentTier}</div>
                </div>
                <div className="cnum">
                  {user 
                    ? `5224 · ${String(user.id).padStart(4, '0')} · ${(user.points || 0).toString().padStart(4, '0')}`
                    : '5224 · 0000 · 0000'
                  }
                </div>
                <div className="cname">
                  <div>
                    <div className="who">Member</div>
                    <div className="nm">{user ? formatCardName(user.name) : 'IVAN PETROV'}</div>
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
            {user && (
              <p style={{ color: '#bdbdbd', fontSize: 14, marginTop: 8 }}>
                Сумма завершенных аренд: <strong style={{ color: 'var(--gold)' }}>{totalSpent.toLocaleString()} ₽</strong>. 
                Ваш уровень: <strong style={{ color: 'var(--gold)' }}>{currentTier}</strong>
              </p>
            )}
          </div>

          <div className="tariffs" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {tiers.map(tier => {
              const isActive = currentTier === tier.label;
              return (
                <div 
                  key={tier.label} 
                  className={`tariff${tier.popular ? ' pop' : ''}`}
                  style={isActive ? { border: '2px solid var(--gold)', boxShadow: '0 0 15px rgba(212, 175, 55, 0.2)' } : undefined}
                >
                  {isActive && (
                    <div style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#000', background: 'var(--gold)', padding: '4px 10px', marginBottom: 12, display: 'inline-block', fontWeight: 700 }}>
                      Ваш статус
                    </div>
                  )}
                  {!isActive && tier.popular && (
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
                    className={`btn${tier.popular || isActive ? ' btn-filled' : ''}`}
                    style={{ width: '100%' }}
                  >
                    {isActive ? 'Условия обслуживания' : 'Получить карту'}
                  </Link>
                </div>
              );
            })}
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
