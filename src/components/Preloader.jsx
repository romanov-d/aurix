import { useEffect, useState } from 'react';

// Машины, которые «проявляются» по мере загрузки
const PL_CARS = [
  { src: '/cars/mercedes_g63.png', name: 'G63 AMG' },
  { src: '/cars/lambo_huracan.png', name: 'Huracán' },
  { src: '/cars/ferrari_roma.png', name: 'Ferrari Roma' },
  { src: '/cars/porsche_turbo.png', name: '911 Turbo S' },
  { src: '/cars/bmw_m5.png', name: 'BMW M5' },
];

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
      {/* Фоновый авто-кадр для «детализации» */}
      <div className="pl-bg" />
      <div className="pl-vignette" />

      <div className="pl-inner">
        <span className="logo-shine pl-logo-wrap">
          <img src="/logo3.png" alt="AURIX MOTORS" className="pl-logo" />
        </span>

        {/* Лента машин — проявляются по мере прогресса */}
        <div className="pl-cars">
          {PL_CARS.map((c, i) => {
            const threshold = (i / PL_CARS.length) * 100;
            const on = progress >= threshold;
            return (
              <div key={c.name} className={`pl-car${on ? ' on' : ''}`}>
                <img src={c.src} alt={c.name} loading="eager" />
              </div>
            );
          })}
        </div>

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
