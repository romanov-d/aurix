import { Link } from 'react-router-dom';

const ARTICLES = [
  {
    id: 1,
    title: 'Топ-5 суперкаров для идеального летнего сезона в Москве',
    excerpt: 'Рассказываем о лучших кабриолетах и спортивных купе из нашего автопарка, которые раскроют всю красоту летних дорог столицы.',
    date: '28 мая 2026',
    category: 'Обзоры',
    image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=600&q=80',
    readTime: '5 мин'
  },
  {
    id: 2,
    title: 'Как правильно ухаживать за матовым кузовом автомобиля',
    excerpt: 'Особенности детейлинга, правила мойки и защиты матовых пленок и лакокрасочного покрытия эксклюзивных моделей.',
    date: '15 мая 2026',
    category: 'Лайфхаки',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80',
    readTime: '4 мин'
  },
  {
    id: 3,
    title: 'Культура суперкаров: почему аренда меняет представление о владении',
    excerpt: 'Анализируем экономику и эмоции: почему шеринг и долгосрочная аренда спорткаров становятся популярнее классической покупки.',
    date: '02 мая 2026',
    category: 'Тренды',
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=600&q=80',
    readTime: '7 мин'
  },
  {
    id: 4,
    title: 'Особенности управления мощным заднеприводным спорткаром',
    excerpt: 'Базовые советы по безопасности, работа с системами стабилизации и как получить максимум удовольствия без риска.',
    date: '18 апреля 2026',
    category: 'Школа вождения',
    image: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=600&q=80',
    readTime: '6 мин'
  }
];

export default function Blog() {
  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="breadcrumbs">
            <Link to="/">Главная</Link><span className="sep">/</span><span>Блог</span>
          </div>
          <h1>Блог <em>Aurix</em></h1>
          <p style={{ color: '#bdbdbd', maxWidth: 540, marginTop: 18, fontSize: 15, lineHeight: 1.7 }}>
            Интересные статьи, обзоры автомобилей нашего автопарка, полезные советы по вождению и последние новости компании.
          </p>
        </div>
      </div>

      <section style={{ padding: '60px 0' }}>
        <div className="container">
          <div className="blog-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '30px',
            marginTop: '20px'
          }}>
            {ARTICLES.map((article) => (
              <article key={article.id} className="blog-card" style={{
                background: 'var(--bg-1)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.3s ease, border-color 0.3s ease',
              }}>
                <div style={{ position: 'relative', height: '220px', overflow: 'hidden' }}>
                  <img 
                    src={article.image} 
                    alt={article.title} 
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.5s ease'
                    }}
                    className="blog-img"
                  />
                  <span style={{
                    position: 'absolute',
                    top: '15px',
                    left: '15px',
                    background: 'var(--gold)',
                    color: '#000',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    letterSpacing: '1px'
                  }}>{article.category}</span>
                </div>
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                    <span>{article.date}</span>
                    <span>{article.readTime}</span>
                  </div>
                  <h3 style={{ fontSize: '18px', lineHeight: '1.4', marginBottom: '12px', color: '#fff', fontWeight: '600' }}>
                    {article.title}
                  </h3>
                  <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px', flexGrow: 1 }}>
                    {article.excerpt}
                  </p>
                  <a href="#" className="btn-text" style={{
                    color: 'var(--gold)',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }} onClick={(e) => e.preventDefault()}>
                    Читать далее <i className="ph ph-arrow-right" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Add subtle hover animations via inline style element */}
      <style>{`
        .blog-card:hover {
          transform: translateY(-5px);
          border-color: var(--gold) !important;
        }
        .blog-card:hover .blog-img {
          transform: scale(1.05);
        }
      `}</style>
    </>
  );
}
