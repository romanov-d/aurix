import { Component } from 'react';
import { GrainGradient } from '@paper-design/shaders-react';

// WebGL-шейдер (paper-design) может ронять/морозить мобильный Safari: потеря
// GPU-контекста и нехватка видеопамяти НЕ ловятся React-ErrorBoundary (ошибка
// летит из requestAnimationFrame мимо рендера). Поэтому на мобильных / touch /
// reduced-motion / без WebGL рисуем статичный CSS-градиент вместо анимации.
let _safe;
function shaderSafe() {
  if (_safe !== undefined) return _safe;
  _safe = false;
  if (typeof window === 'undefined') return _safe;
  try {
    if (window.matchMedia('(max-width:1024px)').matches) return _safe;
    if (window.matchMedia('(pointer: coarse)').matches) return _safe;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return _safe;
    const c = document.createElement('canvas');
    if (!(c.getContext('webgl2') || c.getContext('webgl'))) return _safe;
    _safe = true;
  } catch {
    _safe = false;
  }
  return _safe;
}

// Статичный фолбэк в той же гамме (золото → тёмный).
const FALLBACK = {
  width: '100%',
  height: '100%',
  background:
    'radial-gradient(120% 100% at 80% 10%, hsl(46,55%,26%) 0%, hsl(32,45%,11%) 40%, #050505 80%)',
};

class ShaderBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {}
  render() {
    if (this.state.failed) return <div style={FALLBACK} />;
    return this.props.children;
  }
}

// Пропсы прокидываются в GrainGradient как есть (colorBack, softness, colors …).
export default function SafeShader(props) {
  if (!shaderSafe()) return <div style={FALLBACK} />;
  return (
    <ShaderBoundary>
      <GrainGradient style={{ width: '100%', height: '100%' }} {...props} />
    </ShaderBoundary>
  );
}
