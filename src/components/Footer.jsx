import { Link } from 'react-router-dom';
import { GrainGradient } from '@paper-design/shaders-react';

/* ── Цветные SVG иконки платёжных систем ── */
function IconVisa() {
  return (
    <svg viewBox="0 0 50 16" width="42" height="14" xmlns="http://www.w3.org/2000/svg">
      <rect width="50" height="16" rx="3" fill="#1A1F71"/>
      <text x="25" y="12" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontFamily="Arial" fontWeight="bold" letterSpacing="1">VISA</text>
    </svg>
  );
}

function IconMastercard() {
  return (
    <svg viewBox="0 0 38 24" width="38" height="24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="12" r="10" fill="#EB001B"/>
      <circle cx="24" cy="12" r="10" fill="#F79E1B"/>
      <path d="M19 4.8a10 10 0 0 1 0 14.4A10 10 0 0 1 19 4.8z" fill="#FF5F00"/>
    </svg>
  );
}

function IconMir() {
  return (
    <svg viewBox="0 0 50 16" width="42" height="14" xmlns="http://www.w3.org/2000/svg">
      <rect width="50" height="16" rx="3" fill="#00B4E6"/>
      <text x="25" y="12" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontFamily="Arial" fontWeight="bold" letterSpacing="0.5">МИР</text>
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="ft">
      {/* Animated gradient behind glass */}
      <div className="ft-shader">
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
      </div>

      <div className="ft-wrap">
        <div className="ft-cols">
          <div className="ft-col ft-col-brand">
            <img src="/logo3.png" alt="AURIX MOTORS" className="ft-logo-img" />
            <p>AURIX — где аренда меняет всё.</p>
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
            <a href="https://instagram.com/aurixmotors" target="_blank" rel="noopener noreferrer"><i className="ph-fill ph-instagram-logo" /></a>
            <a href="https://t.me/aurixmotors" target="_blank" rel="noopener noreferrer"><i className="ph-fill ph-telegram-logo" /></a>
            <a href="https://youtube.com/@aurixmotors" target="_blank" rel="noopener noreferrer"><i className="ph-fill ph-youtube-logo" /></a>
          </div>
          <div className="ft-pay">
            <span>Способы оплаты</span>
            <IconVisa />
            <IconMastercard />
            <IconMir />
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
