import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

const fmtDate = (iso) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

function BlogSkeleton() {
  return (
    <div className="blog-grid">
      {Array.from({ length: 4 }).map((_, i) => (
        <article key={i} className="blog-card">
          <div className="sk" style={{ height: 220 }} />
          <div style={{ padding: 24 }}>
            <div className="sk sk-line" style={{ width: '40%', height: 11 }} />
            <div className="sk sk-line" style={{ width: '90%', height: 18, marginTop: 14 }} />
            <div className="sk sk-line" style={{ width: '70%', height: 18, marginTop: 8 }} />
            <div className="sk sk-line" style={{ width: '100%', height: 12, marginTop: 16 }} />
            <div className="sk sk-line" style={{ width: '80%', height: 12, marginTop: 8 }} />
          </div>
        </article>
      ))}
    </div>
  );
}

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/blog')
      .then((data) => setPosts(Array.isArray(data) ? data : []))
      .catch((e) => console.error('Ошибка загрузки блога:', e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="breadcrumbs">
            <Link to="/">Главная</Link><span className="sep">/</span><span>Блог</span>
          </div>
          <h1>Блог <em>AURIX MOTORS</em></h1>
          <p style={{ color: '#bdbdbd', maxWidth: 540, marginTop: 18, fontSize: 15, lineHeight: 1.7 }}>
            Интересные статьи, обзоры автомобилей нашего автопарка, полезные советы по вождению и последние новости компании.
          </p>
        </div>
      </div>

      <section style={{ padding: '60px 0' }}>
        <div className="container">
          {loading ? (
            <BlogSkeleton />
          ) : posts.length === 0 ? (
            <p style={{ color: '#888', textAlign: 'center', padding: '40px 0' }}>Пока нет статей.</p>
          ) : (
            <div className="blog-grid">
              {posts.map((post) => (
                <Link key={post.id} to={`/blog/${post.id}`} className="blog-card">
                  <div className="blog-card-img">
                    {post.image_url && <img src={post.image_url} alt={post.title} loading="lazy" />}
                    {post.category && <span className="blog-cat">{post.category}</span>}
                  </div>
                  <div className="blog-card-body">
                    <div className="blog-card-meta">
                      <span>{fmtDate(post.created_at)}</span>
                      {post.read_time && <span>{post.read_time}</span>}
                    </div>
                    <h3>{post.title}</h3>
                    {post.excerpt && <p>{post.excerpt}</p>}
                    <span className="blog-more">Читать далее <i className="ph ph-arrow-right" /></span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
