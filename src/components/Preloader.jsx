import { useEffect, useState } from 'react';

export default function Preloader() {
  const [progress, setProgress] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const start = performance.now();
    const duration = 4500;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      setProgress(eased * 100);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => setHidden(true), 320);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (hidden) return null;

  return (
    <div className={`preloader${progress >= 100 ? ' done' : ''}`}>
      <div className="pl-inner">
        <img src="/logo3.png" alt="AURIX MOTORS" className="pl-logo" />
        <div className="pl-track-wrap">
          <div className="pl-percent" style={{ left: `${progress}%` }}>{Math.round(progress)}%</div>
          <div className="pl-track">
            <div className="pl-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
