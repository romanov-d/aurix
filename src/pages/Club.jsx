import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../api/client.js';
import T from '../components/T.jsx';

const tiers = [
  {
    label: 'Старт',
    deposit: '500 000 ₽',
    discount: '5%',
    period: '1 год',
    popular: false,
    minSpent: 500000,
    perks: [
      { k: 'club.tier0.perk0', v: 'Скидка 5% на все аренды' },
      { k: 'club.tier0.perk1', v: 'Приоритетная поддержка' },
      { k: 'club.tier0.perk2', v: 'Бронирование первым' },
      { k: 'club.tier0.perk3', v: 'Срок действия 1 год' },
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
      { k: 'club.tier1.perk0', v: 'Скидка 15% на все аренды' },
      { k: 'club.tier1.perk1', v: 'Приоритет на дефицитные модели' },
      { k: 'club.tier1.perk2', v: 'Приоритетная поддержка 24/7' },
      { k: 'club.tier1.perk3', v: 'Срок действия 1 год' },
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
      { k: 'club.tier2.perk0', v: 'Скидка 25% на все аренды' },
      { k: 'club.tier2.perk1', v: 'Бессрочная карта' },
      { k: 'club.tier2.perk2', v: 'VIP-сопровождение и доступ к закрытым ивентам' },
      { k: 'club.tier2.perk3', v: 'Личный менеджер' },
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
      { k: 'club.tier3.perk0', v: 'Скидка 40% — максимальная privilege' },
      { k: 'club.tier3.perk1', v: 'Бессрочная карта' },
      { k: 'club.tier3.perk2', v: 'Личный менеджер 24/7' },
      { k: 'club.tier3.perk3', v: 'Все закрытые ивенты и партнёрские мероприятия' },
      { k: 'club.tier3.perk4', v: 'Concierge сервис' },
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
            <Link to="/"><T k="club.breadcrumbs.home">Главная</T></Link><span className="sep">/</span><span><T k="club.breadcrumbs.current">Клубная карта</T></span>
          </div>
          <h1><T k="club.hero.title" as="span" html>Клубная карта <em>AURIX MOTORS</em></T></h1>
        </div>
      </div>

      <section>
        <div className="container">
          <div className="club-hero">
            <div>
              <div className={`club-card ${currentTier.toLowerCase()}`}>
                <div className="ctop">
                  <img src="/letter.svg" className="logo-mark-img" alt="AURIX MOTORS" />
                  <div className="ctier" style={{ textTransform: 'uppercase' }}>{currentTier}</div>
                </div>
                <div className="cnum">
                  {user 
                    ? `5224 · ${String(user.id).padStart(4, '0')} · ${(user.points || 0).toString().padStart(4, '0')}`
                    : '5224 · 0000 · 0000'
                  }
                </div>
                <div className="cname">
                  <div>
                    <div className="who"><T k="club.card.member">Member</T></div>
                    <div className="nm">{user ? formatCardName(user.name) : 'IVAN PETROV'}</div>
                  </div>
                  <div>
                    <div className="who"><T k="club.card.validthru">Valid Thru</T></div>
                    <div className="nm">12 / 28</div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="row-eyebrow"><span className="eyebrow"><T k="club.privileges.eyebrow">Привилегии</T></span></div>
              <h2 className="serif" style={{ fontSize: 38, letterSpacing: '.04em', marginTop: 14 }}>
                <T k="club.privileges.title" as="span" html>Закрытый клуб <em className="gold">AURIX MOTORS</em></T>
              </h2>
              <p className="muted" style={{ marginTop: 18, fontSize: 14, lineHeight: 1.85, color: '#bdbdbd' }}>
                <T k="club.privileges.lead" as="span">Клубная карта — это не просто скидка, а статус. Разместите депозит и получите персональную скидку от 5 до 40% на любую аренду. Карта действует без ограничений по числу поездок.</T>
              </p>

              <div className="club-perks">
                <div className="perk">
                  <div className="ico"><i className="ph-fill ph-percent" /></div>
                  <h4><T k="club.perks.item0title">Скидка до −40%</T></h4>
                  <p><T k="club.perks.item0desc" as="span">На любую аренду в любой день. Скидка применяется автоматически.</T></p>
                </div>
                <div className="perk">
                  <div className="ico"><i className="ph-fill ph-lightning" /></div>
                  <h4><T k="club.perks.item1title">Приоритет подачи</T></h4>
                  <p><T k="club.perks.item1desc" as="span">Держатели карт получают приоритет при бронировании дефицитных моделей.</T></p>
                </div>
                <div className="perk">
                  <div className="ico"><i className="ph-fill ph-arrow-fat-up" /></div>
                  <h4><T k="club.perks.item2title">Без срока</T></h4>
                  <p><T k="club.perks.item2desc" as="span">Карты уровня Премиум и Black действуют бессрочно — без ежегодного продления.</T></p>
                </div>
                <div className="perk">
                  <div className="ico"><i className="ph-fill ph-crown" /></div>
                  <h4><T k="club.perks.item3title">Закрытые ивенты</T></h4>
                  <p><T k="club.perks.item3desc" as="span">Тест-драйвы новинок, закрытые ужины и партнёрские мероприятия.</T></p>
                </div>
              </div>
            </div>
          </div>

          <div className="divider-h"></div>

          <div className="section-head center">
            <div className="row-eyebrow" style={{ justifyContent: 'center' }}>
              <span className="eyebrow"><T k="club.levels.eyebrow">Уровни членства</T></span>
            </div>
            <h2><T k="club.levels.title" as="span" html>Выберите свой <em>статус</em></T></h2>
            {user && (
              <p style={{ color: '#bdbdbd', fontSize: 14, marginTop: 8 }}>
                <T k="club.levels.spentlabel">Сумма завершенных аренд:</T> <strong style={{ color: 'var(--gold)' }}>{totalSpent.toLocaleString()} ₽</strong>.
                <T k="club.levels.yourlevel">Ваш уровень:</T> <strong style={{ color: 'var(--gold)' }}>{currentTier}</strong>
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
                      <T k="club.levels.statusbadge">Ваш статус</T>
                    </div>
                  )}
                  <h3 style={{ color: tier.label === 'Black' ? '#fff' : undefined }}>{tier.label}</h3>
                  <div style={{ marginTop: 10, marginBottom: 2 }}>
                    <span className="serif gold" style={{ fontSize: 36, fontWeight: 700 }}>{tier.discount}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}><T k="club.levels.discountlabel">скидка на аренду</T></div>
                  <div className="price" style={{ fontSize: 18 }}>{tier.deposit}</div>
                  <div className="per"><T k="club.levels.depositlabel">депозит</T> · {tier.period}</div>
                  <ul>
                    {tier.perks.map(p => <li key={p.k}><T k={p.k}>{p.v}</T></li>)}
                  </ul>
                  <Link
                    to="/contacts"
                    className={`btn${tier.popular || isActive ? ' btn-filled' : ''}`}
                    style={{ width: '100%' }}
                  >
                    {isActive ? <T k="club.levels.ctaactive">Условия обслуживания</T> : <T k="club.levels.cta">Получить карту</T>}
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="divider-h"></div>

          {/* Gift certificates */}
          <div style={{ background: '#101010', borderRadius: 16, padding: '40px' }}>
            <div className="row-eyebrow" style={{ marginBottom: 16 }}>
              <span className="eyebrow"><T k="club.gift.eyebrow">Подарочные сертификаты</T></span>
            </div>
            <h2 className="serif" style={{ fontSize: 30, marginBottom: 16 }}>
              <T k="club.gift.title" as="span" html>Подарите <em>впечатления</em></T>
            </h2>
            <p style={{ color: '#bdbdbd', fontSize: 14, lineHeight: 1.85, maxWidth: 600 }}>
              <T k="club.gift.desc" as="span" html>Подарочный сертификат на аренду любого автомобиля из нашего парка. Стоимость сертификата равна стоимости <strong>одних суток аренды</strong> выбранного автомобиля. Срок действия сертификата — <strong>1 год</strong> с даты оформления.</T>
            </p>
            <div style={{ marginTop: 28 }}>
              <Link to="/contacts" className="btn"><T k="club.gift.cta">Оформить сертификат</T></Link>
            </div>
          </div>

        </div>
      </section>
    </>
  );
}
