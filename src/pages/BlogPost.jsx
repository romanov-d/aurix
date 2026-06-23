import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';

const fmtDate = (iso) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

export default function BlogPost() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    api(`/blog/${id}`)
      .then((data) => setPost(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="container" style={{ maxWidth: 820, padding: '60px 0' }}>
      <div className="sk sk-line" style={{ width: '60%', height: 36 }} />
      <div className="sk" style={{ height: 360, marginTop: 24, borderRadius: 14 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
        {['100%', '97%', '92%', '80%'].map((w, i) => <div key={i} className="sk sk-line" style={{ width: w, height: 13 }} />)}
      </div>
    </div>
  );

  if (notFound || !post) return (
    <div className="container" style={{ padding: '120px 0', textAlign: 'center' }}>
      <h2 style={{ color: 'var(--head)', marginBottom: 16 }}>Статья не найдена</h2>
      <Link to="/blog" className="btn">Вернуться в блог</Link>
    </div>
  );

  return (
    <article className="blog-post">
      <div className="page-head">
        <div className="container">
          <div className="breadcrumbs">
            <Link to="/">Главная</Link><span className="sep">/</span>
            <Link to="/blog">Блог</Link><span className="sep">/</span>
            <span>{post.title}</span>
          </div>
          <h1 style={{ maxWidth: 820 }}>{post.title}</h1>
          <div className="blog-post-meta">
            {post.category && <span className="blog-cat-inline">{post.category}</span>}
            <span>{fmtDate(post.created_at)}</span>
            {post.read_time && <span>· {post.read_time}</span>}
          </div>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 820 }}>
        {post.image_url && (
          <div className="blog-post-cover">
            <img src={post.image_url} alt={post.title} />
          </div>
        )}
        {post.excerpt && <p className="blog-post-lead">{post.excerpt}</p>}
        <div className="blog-post-content">
          {(post.content || '').split('\n').filter(Boolean).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
        <div style={{ margin: '48px 0 80px' }}>
          <Link to="/blog" className="btn btn-ghost"><i className="ph ph-arrow-left" /> Все статьи</Link>
        </div>
      </div>
    </article>
  );
}
