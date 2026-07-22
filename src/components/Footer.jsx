import { Link } from 'react-router-dom';
import SafeShader from './SafeShader.jsx';

export default function Footer() {
  return (
    <footer className="ft">
      {/* Animated gradient behind glass */}
      <div className="ft-shader">
        <SafeShader
          colorBack="hsl(0,0%,0%)"
          softness={0.6}
          intensity={0.7}
          noise={0}
          shape="corners"
          offsetX={0}
          offsetY={0}
          scale={1}
          rotation={0}
          speed={1.8}
          colors={['hsl(46,65%,55%)', 'hsl(42,60%,40%)', 'hsl(32,45%,15%)']}
        />
      </div>

      <div className="ft-wrap">
        <div className="ft-cols">
          <div className="ft-col ft-col-brand">
            <span className="logo-shine"><img src="/logo3.png" alt="AURIX MOTORS" className="ft-logo-img" /></span>
            <p>AURIX MOTORS — где аренда меняет всё.</p>
          </div>
          <div className="ft-col">
            <h5>Правовая информация</h5>
            <ul>
              <li><Link to="/terms">Условия и положения</Link></li>
              <li><Link to="/privacy">Политика конфиденциальности</Link></li>
              <li><Link to="/requisites">Реквизиты</Link></li>
              <li><Link to="/blog">Блог</Link></li>
            </ul>
          </div>
          <div className="ft-col">
            <h5>Услуги</h5>
            <ul>
              <li><Link to="/catalog">Аренда авто</Link></li>
              <li><Link to="/long-term">Подписка</Link></li>
              <li><Link to="/photo">Аренда для фото</Link></li>
            </ul>
          </div>
          <div className="ft-col">
            <h5>Связь и поддержка</h5>
            <ul>
              <li><a href="tel:+79253122802"><i className="ph-fill ph-phone" /> +7 925 312 28 02</a></li>
              <li><a href="mailto:info@aurixmotors.com"><i className="ph-fill ph-envelope" /> info@aurixmotors.com</a></li>
            </ul>
          </div>
          <div className="ft-col">
            <h5>Адрес</h5>
            <p>Москва, Олимпийский проспект, 12<br />Ежедневно, 10:00–20:00</p>
          </div>
        </div>

        <div className="ft-bot">
          <div className="ft-social">
            <span>Подписывайтесь</span>
            <a href="https://t.me/aurixmotors" target="_blank" rel="noopener noreferrer" aria-label="Telegram"><i className="ph-fill ph-telegram-logo" /></a>
          </div>
          <div className="ft-pay">
            <span>Оплата</span>
            <span className="ft-pay-note">По ссылке или наличными у менеджера</span>
          </div>
          <div className="ft-error">
            <span>Нашли ошибку? Напишите нам</span>
            <a href="https://t.me/aurixmotors" target="_blank" rel="noopener noreferrer" className="ft-error-btn">Сообщить об ошибке</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
