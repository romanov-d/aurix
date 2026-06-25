import { Link } from 'react-router-dom';
import { GrainGradient } from '@paper-design/shaders-react';
import ErrorBoundary from './ErrorBoundary.jsx';

/* ── Иконка мессенджера MAX ── */
function IconMax() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="currentColor" d="M5 19V5.6c0-.5.62-.74.95-.37l5.3 5.86a1 1 0 0 0 1.5 0l5.3-5.86c.33-.37.95-.13.95.37V19a1 1 0 0 1-1 1 1 1 0 0 1-1-1v-8.2l-4.05 4.48a3 3 0 0 1-4.4 0L7.5 10.8V19a1 1 0 0 1-1 1 1 1 0 0 1-1.5-1Z"/>
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="ft">
      {/* Animated gradient behind glass */}
      <div className="ft-shader">
        <ErrorBoundary name="footer-shader" fallback={null}>
          <GrainGradient
            style={{ width: '100%', height: '100%' }}
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
        </ErrorBoundary>
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
              <li><Link to="/blog">Блог</Link></li>
            </ul>
          </div>
          <div className="ft-col">
            <h5>Города</h5>
            <ul>
              <li><a href="#">Москва</a></li>
            </ul>
          </div>
          <div className="ft-col">
            <h5>Связь и поддержка</h5>
            <ul>
              <li><a href="tel:+79991234567"><i className="ph-fill ph-phone" /> +7 999 123 45 67</a></li>
              <li><a href="mailto:info@aurixmotors.com"><i className="ph-fill ph-envelope" /> info@aurixmotors.com</a></li>
            </ul>
          </div>
          <div className="ft-col">
            <h5>Адрес</h5>
            <p>Москва, Олимпийский проспект, 12<br />Ежедневно, 24 часа</p>
          </div>
        </div>

        <div className="ft-bot">
          <div className="ft-social">
            <span>Подписывайтесь</span>
            <a href="https://instagram.com/aurixmotors" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i className="ph-fill ph-instagram-logo" /></a>
            <a href="https://t.me/aurixmotors" target="_blank" rel="noopener noreferrer" aria-label="Telegram"><i className="ph-fill ph-telegram-logo" /></a>
            <a href="https://youtube.com/@aurixmotors" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><i className="ph-fill ph-youtube-logo" /></a>
            <a href="https://max.ru/aurixmotors" target="_blank" rel="noopener noreferrer" className="ft-max" aria-label="MAX"><IconMax /></a>
          </div>
          <div className="ft-pay">
            <span>Оплата</span>
            <span className="ft-pay-note">По ссылке или наличными у менеджера</span>
          </div>
          <div className="ft-error">
            <span>Нашли ошибку? Напишите нам</span>
            <a href="mailto:bugs@aurixmotors.com" className="ft-error-btn">Сообщить об ошибке</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
