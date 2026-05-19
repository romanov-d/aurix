import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="ft">
      <div className="ft-wrap">
        <div className="ft-top">
          <div className="ft-promo">
            <div className="ft-promo-text">
              <div className="ft-promo-eyebrow">Приложение для аренды авто</div>
              <div className="ft-promo-title">Арендуйте авто или сдавайте свой —<br />всё в одном удобном приложении.</div>
              <div className="ft-promo-badges">
                <a href="#" className="ft-badge">
                  <i className="ph-fill ph-apple-logo" />
                  <span><small>Скачать в</small>App Store</span>
                </a>
                <a href="#" className="ft-badge">
                  <i className="ph-fill ph-google-play-logo" />
                  <span><small>Доступно в</small>Google Play</span>
                </a>
              </div>
            </div>
          </div>
          <div className="ft-rating">
            <div className="ft-rating-head">
              <i className="ph-fill ph-google-logo" />
              <span>Google</span>
            </div>
            <div className="ft-rating-stars">
              <i className="ph-fill ph-star" />
              <i className="ph-fill ph-star" />
              <i className="ph-fill ph-star" />
              <i className="ph-fill ph-star" />
              <i className="ph-fill ph-star" />
            </div>
            <div className="ft-rating-score">5.0/5.0 (227 отзывов)</div>
          </div>
        </div>

        <div className="ft-cols">
          <div className="ft-col ft-col-brand">
            <img src="/logo.svg" alt="AURIX" className="ft-logo-img" />
            <p>AURIX — где аренда меняет всё.</p>
          </div>
          <div className="ft-col">
            <h5>Правовая информация</h5>

            <ul>
              <li><Link to="/terms">Условия и положения</Link></li>
              <li><Link to="/terms">Политика конфиденциальности</Link></li>
              <li><a href="#">Блог</a></li>
            </ul>
          </div>
          <div className="ft-col">
            <h5>Города</h5>
            <ul>
              <li><a href="#">Москва</a></li>
              <li><a href="#">Санкт-Петербург</a></li>
              <li><a href="#">Сочи</a></li>
              <li><a href="#">Дубай</a></li>
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
            <p>Москва, Пресненская наб., 12<br />Бизнес-центр «Москва-Сити»</p>
          </div>
        </div>

        <div className="ft-bot">
          <div className="ft-social">
            <span>Подписывайтесь</span>
            <a href="#"><i className="ph-fill ph-instagram-logo" /></a>
            <a href="#"><i className="ph-fill ph-telegram-logo" /></a>
            <a href="#"><i className="ph-fill ph-youtube-logo" /></a>
          </div>
          <div className="ft-pay">
            <span>Способы оплаты</span>
            <i className="ph-fill ph-credit-card" />
            <i className="ph-fill ph-currency-circle-dollar" />
            <i className="ph-fill ph-currency-btc" />
            <i className="ph-fill ph-money" />
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
