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

  // ── Тарифы ──
  { key: 'tariffs.head.title', section: 'Тарифы', label: 'Заголовок страницы', type: 'html', sort: 10, value: 'Тарифы <em>и цены</em>' },
  { key: 'tariffs.head.lead', section: 'Тарифы', label: 'Подзаголовок', type: 'textarea', sort: 20, value: 'Прозрачное ценообразование без скрытых платежей. Стоимость зависит от модели и срока аренды. Цена включает НДС 22%.' },
  { key: 'tariffs.table.note', section: 'Тарифы', label: 'Примечание под таблицей', type: 'textarea', sort: 30, value: 'Цена включает НДС 22%. Залог обязателен по всем автомобилям и возвращается после сдачи авто.' },
  { key: 'tariffs.notes.photo.title', section: 'Тарифы', label: 'Блок «Фотосессии» — заголовок', type: 'text', sort: 40, value: 'Аренда для фотосессий' },
  { key: 'tariffs.notes.photo.text', section: 'Тарифы', label: 'Блок «Фотосессии» — текст', type: 'textarea', sort: 50, value: 'Автомобиль можно арендовать для фотосессии или съёмки без пробега. Тариф указан за час. Возможна подача в любое место Москвы и МО.' },
  { key: 'tariffs.notes.gift.title', section: 'Тарифы', label: 'Блок «Сертификаты» — заголовок', type: 'text', sort: 60, value: 'Подарочные сертификаты' },
  { key: 'tariffs.notes.gift.text', section: 'Тарифы', label: 'Блок «Сертификаты» — текст', type: 'textarea', sort: 70, value: 'Подарочный сертификат на аренду любого автомобиля из парка. Стоимость сертификата равна стоимости одних суток аренды выбранного автомобиля. Срок действия — 1 год с даты оформления.' },
  { key: 'tariffs.notes.delivery.title', section: 'Тарифы', label: 'Блок «Доставка» — заголовок', type: 'text', sort: 80, value: 'Доставка и получение' },
  { key: 'tariffs.notes.delivery.text', section: 'Тарифы', label: 'Блок «Доставка» — текст', type: 'textarea', sort: 90, value: 'Доставка и забор автомобиля осуществляются за дополнительную плату в любое удобное место. Работаем 7 дней в неделю, 24 часа в сутки. Свяжитесь с нами для уточнения стоимости.' },
  { key: 'tariffs.cta.button', section: 'Тарифы', label: 'Кнопка CTA', type: 'text', sort: 100, value: 'Выбрать автомобиль' },

  // ── Долгосрочная ──
  { key: 'longterm.head.title', section: 'Долгосрочная', label: 'Заголовок страницы', type: 'html', sort: 10, value: 'Премиальное авто <em>в долгосрочную аренду</em>' },
  { key: 'longterm.head.lead', section: 'Долгосрочная', label: 'Подзаголовок', type: 'textarea', sort: 20, value: 'Подписка AURIX MOTORS от 1 месяца с фиксированным ежемесячным платежом. Свежий автомобиль премиум-класса, полное обслуживание, страховка, сезонная резина и подменное авто — всё включено в один платёж. Меняйте модель, когда захотите, без забот о покупке и содержании.' },
  { key: 'longterm.head.cta1', section: 'Долгосрочная', label: 'Кнопка CTA 1', type: 'text', sort: 30, value: 'Подобрать автомобиль' },
  { key: 'longterm.head.cta2', section: 'Долгосрочная', label: 'Кнопка CTA 2', type: 'text', sort: 40, value: 'Получить расчёт' },
  { key: 'longterm.benefits.eyebrow', section: 'Долгосрочная', label: 'Надзаголовок «Преимущества»', type: 'text', sort: 50, value: 'Преимущества' },
  { key: 'longterm.benefits.title', section: 'Долгосрочная', label: 'Заголовок «Преимущества»', type: 'html', sort: 60, value: 'Почему <em>долгосрочная</em> аренда' },

  // ── Контакты ──
  { key: 'contacts.hero.title', section: 'Контакты', label: 'Заголовок страницы', type: 'html', sort: 10, value: 'Свяжитесь <em>с нами</em>' },
  { key: 'contacts.hero.lead', section: 'Контакты', label: 'Подзаголовок', type: 'textarea', sort: 20, value: 'Мы на связи 24/7. Звоните, пишите в мессенджеры или приезжайте в наш шоурум.' },
  { key: 'contacts.info.phoneLabel', section: 'Контакты', label: 'Подпись блока «Телефон»', type: 'text', sort: 30, value: 'Телефон · 24/7' },
  { key: 'contacts.info.phone', section: 'Контакты', label: 'Телефон', type: 'text', sort: 40, value: '+7 999 123 45 67' },
  { key: 'contacts.info.phoneNote', section: 'Контакты', label: 'Примечание к телефону', type: 'text', sort: 50, value: 'Москва, основной номер' },
  { key: 'contacts.info.messengersLabel', section: 'Контакты', label: 'Подпись «Мессенджеры»', type: 'text', sort: 60, value: 'Мессенджеры' },
  { key: 'contacts.info.messengers', section: 'Контакты', label: 'Мессенджеры (ник)', type: 'text', sort: 70, value: '@aurixmotors' },
  { key: 'contacts.info.messengersNote', section: 'Контакты', label: 'Примечание к мессенджерам', type: 'text', sort: 80, value: 'Telegram · WhatsApp · iMessage' },
  { key: 'contacts.info.emailLabel', section: 'Контакты', label: 'Подпись блока «Email»', type: 'text', sort: 90, value: 'Email' },
  { key: 'contacts.info.email', section: 'Контакты', label: 'Email', type: 'text', sort: 100, value: 'info@aurixmotors.com' },
  { key: 'contacts.info.emailNote', section: 'Контакты', label: 'Примечание к email', type: 'text', sort: 110, value: 'booking@aurixmotors.com — бронирование' },
  { key: 'contacts.info.addressLabel', section: 'Контакты', label: 'Подпись блока «Шоурум»', type: 'text', sort: 120, value: 'Шоурум' },
  { key: 'contacts.info.address', section: 'Контакты', label: 'Адрес', type: 'text', sort: 130, value: 'Москва, Олимпийский проспект, 12' },
  { key: 'contacts.info.hours', section: 'Контакты', label: 'Часы работы', type: 'text', sort: 140, value: 'Ежедневно, 24 часа' },
  { key: 'contacts.form.title', section: 'Контакты', label: 'Заголовок формы', type: 'text', sort: 150, value: 'Оставьте заявку' },
  { key: 'contacts.form.note', section: 'Контакты', label: 'Примечание под формой', type: 'text', sort: 160, value: 'Перезвоним в течение 5 минут' },
  { key: 'contacts.form.submit', section: 'Контакты', label: 'Кнопка отправки формы', type: 'text', sort: 170, value: 'Отправить' },

  // ── Аренда для фото ──
  { key: 'photo.hero.title', section: 'Аренда для фото', label: 'Заголовок страницы', type: 'html', sort: 10, value: 'Аренда авто <em>для фотосессий</em>' },
  { key: 'photo.hero.lead', section: 'Аренда для фото', label: 'Подзаголовок', type: 'textarea', sort: 20, value: 'Премиальный автомобиль на час-полтора для фотосессии, съёмки клипа, свадьбы или праздника. Без пробега и лишней бумажной волокиты — машина подаётся к месту съёмки, вы получаете кадры, мы забираем авто. Тариф указан за час.' },
  { key: 'photo.hero.ctaBook', section: 'Аренда для фото', label: 'Кнопка «Забронировать»', type: 'text', sort: 30, value: 'Забронировать съёмку' },
  { key: 'photo.hero.ctaCatalog', section: 'Аренда для фото', label: 'Кнопка «Автопарк»', type: 'text', sort: 40, value: 'Смотреть автопарк' },
  { key: 'photo.how.eyebrow', section: 'Аренда для фото', label: 'Надзаголовок «Как это работает»', type: 'text', sort: 50, value: 'Как это работает' },
  { key: 'photo.how.title', section: 'Аренда для фото', label: 'Заголовок «Как это работает»', type: 'html', sort: 60, value: 'Просто и <em>быстро</em>' },
  { key: 'photo.how.step1Title', section: 'Аренда для фото', label: 'Шаг 1 — заголовок', type: 'text', sort: 70, value: '1. Выберите авто и время' },
  { key: 'photo.how.step1Text', section: 'Аренда для фото', label: 'Шаг 1 — текст', type: 'textarea', sort: 80, value: 'Любой автомобиль из списка ниже. Минимальная аренда — 1 час. Возможна съёмка день в день — уточните у менеджера.' },
  { key: 'photo.how.step2Title', section: 'Аренда для фото', label: 'Шаг 2 — заголовок', type: 'text', sort: 90, value: '2. Подача к месту съёмки' },
  { key: 'photo.how.step2Text', section: 'Аренда для фото', label: 'Шаг 2 — текст', type: 'textarea', sort: 100, value: 'Привезём автомобиль в любую точку Москвы и МО — студия, парк, набережная, площадка мероприятия.' },
  { key: 'photo.how.step3Title', section: 'Аренда для фото', label: 'Шаг 3 — заголовок', type: 'text', sort: 110, value: '3. Снимайте' },
  { key: 'photo.how.step3Text', section: 'Аренда для фото', label: 'Шаг 3 — текст', type: 'textarea', sort: 120, value: 'Машина в вашем распоряжении на время съёмки. Фотограф, свет, декор — на ваше усмотрение. Поездки — по договорённости.' },
];
