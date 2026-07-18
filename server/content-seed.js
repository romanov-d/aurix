// Дефолтные тексты лендинга для мини-CMS.
// key: page.section.field | section — группа в редакторе | type: text|textarea|html
// Значения = текущие тексты сайта (пока админ не отредактирует — рендерится это).
// ВАЖНО: значение сидируется только при первом появлении ключа; правки админа не затираются.
export const CONTENT_DEFAULTS = [
  // ── Главная ──
  { key: 'home.hero.title', section: 'Главная', label: 'Заголовок героя', type: 'html', sort: 10,
    value: 'AURIX MOTORS — это не просто аренда.<br><span class="fs-title-gold">Это стиль жизни.</span>' },
  { key: 'home.hero.lead', section: 'Главная', label: 'Подзаголовок героя', type: 'textarea', sort: 20,
    value: 'Круглосуточная подача по Москве. AURIX MOTORS делает аренду премиум-авто простой и быстрой.' },
  { key: 'home.categories.title', section: 'Главная', label: 'Заголовок «Категории»', type: 'text', sort: 30,
    value: 'Категории автопарка' },
  { key: 'home.experience.title', section: 'Главная', label: 'Заголовок «Опыт»', type: 'html', sort: 40,
    value: 'Мы создаём опыт,<br>который запоминается' },
  { key: 'home.fleet.title', section: 'Главная', label: 'Заголовок «Автопарк»', type: 'text', sort: 50,
    value: 'Наш автопарк' },
  { key: 'home.partner.title', section: 'Главная', label: 'Заголовок «Сдать авто»', type: 'html', sort: 60,
    value: '<span class="pt-title-accent">Сдаёте</span> авто<br>в аренду?' },
  { key: 'home.delivery.title', section: 'Главная', label: 'Заголовок «Доставка»', type: 'html', sort: 70,
    value: 'Доставка и получение<br>автомобиля' },
  { key: 'home.why.title', section: 'Главная', label: 'Заголовок «Почему мы»', type: 'text', sort: 80,
    value: 'Почему выбирают нас?' },
  { key: 'home.faq.title', section: 'Главная', label: 'Заголовок «FAQ»', type: 'html', sort: 90,
    value: 'Часто задаваемые<br>вопросы' },
];
