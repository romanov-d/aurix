import { GrainGradient } from '@paper-design/shaders-react';
import ErrorBoundary from './ErrorBoundary.jsx';

// WebGL-шейдер (paper-design) — частая причина краша/фриза мобильного Safari:
// потеря GPU-контекста и нехватка видеопамяти НЕ ловятся React-ErrorBoundary
// (ошибка летит из requestAnimationFrame мимо рендера, либо таб просто виснет
// на белом экране). Поэтому на мобильных / touch / при reduced-motion / без
// WebGL рисуем статичный CSS-градиент вместо анимации.
let _safe;
function shaderSafe() {
  if (_safe !== undefined) return _safe;
  _safe = false;
  if (typeof window === 'undefined') return _safe;
  try {
    if (window.matchMedia('(max-width:900px)').matches) return _safe;
    if (window.matchMedia('(pointer: coarse)').matches) return _safe;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return _safe;
    const c = document.createElement('canvas');
    if (!(c.getContext('webgl2') || c.getContext('webgl'))) return _safe;
    _safe = true;
  } catch { _safe = false; }
  return _safe;
}

// Статичный фолбэк в той же гамме, что и анимация (золото → тёмный).
const FALLBACK = {
  width: '100%',
  height: '100%',
  background: 'radial-gradient(120% 100% at 15% 0%, hsl(46,55%,30%) 0%, hsl(32,45%,12%) 38%, #000 78%)',
};

// Пропсы прокидываются в GrainGradient как есть (colorBack, softness, colors …).
export default function SafeShader(props) {
  if (!shaderSafe()) return <div style={FALLBACK} />;
  return (
    <ErrorBoundary name="shader" fallback={<div style={FALLBACK} />}>
      <GrainGradient style={{ width: '100%', height: '100%' }} {...props} />
    </ErrorBoundary>
  );
}
