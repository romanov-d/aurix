import { Link } from 'react-router-dom';

// Карточка предприятия (реквизиты) — данные ИП для договоров и оплат.
const ORG = [
  ['Полное наименование организации', 'Индивидуальный предприниматель Сусарова Марина Ханпашевна'],
  ['Сокращённое наименование организации', 'ИП Сусарова Марина Ханпашевна'],
  ['Юридический адрес', '141000, Московская обл, г Мытищи'],
  ['Фактический адрес', 'Московская обл, г Мытищи'],
  ['Почтовый адрес', '141000, Московская обл, г Мытищи'],
  ['ИНН / ОГРНИП', '502920631808 / 322508100522511'],
  ['ОКПО / ОКАТО / ОКТМО', '2018722514 / 46446000000 / 46746000001'],
];

const BANK = [
  ['Наименование банка', 'ПАО Сбербанк'],
  ['Корреспондентский счёт', '30101810400000000225'],
  ['БИК', '044525225'],
  ['Расчётный счёт', '40802810340000161221'],
  ['ИНН / КПП банка', '7707083893 / 773601001'],
];

const CONTACTS = [
  ['Руководитель', 'Сусарова Марина Ханпашевна'],
  ['Электронная почта', 'info@aurixmotors.com'],
  ['Телефон', '+7 977 660 67 73'],
];

function Block({ title, rows }) {
  return (
    <div className="req-block">
      <div className="req-block-title">{title}</div>
      <div className="req-block-rows">
        {rows.map(([k, v]) => (
          <div className="req-row" key={k}>
            <div className="req-key">{k}</div>
            <div className="req-val">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Requisites() {
  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="breadcrumbs">
            <Link to="/">Главная</Link><span className="sep">/</span><span>Реквизиты</span>
          </div>
          <h1>Карточка <em>предприятия</em></h1>
        </div>
      </div>

      <section>
        <div className="container">
          <div className="req-wrap">
            <Block title="ОРГАНИЗАЦИЯ" rows={ORG} />
            <Block title="БАНК" rows={BANK} />
            <Block title="КОНТАКТЫ" rows={CONTACTS} />
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 24, letterSpacing: '.04em' }}>
            Реквизиты предоставляются для заключения договоров и безналичной оплаты. По вопросам документооборота — <Link to="/contacts" style={{ color: 'var(--gold)' }}>свяжитесь с нами</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
