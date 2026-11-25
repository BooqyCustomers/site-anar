import { useEffect, useState } from 'react';
import { bgSet } from '../data/backgrounds';
import BackgroundLayers from './BackgroundLayers';

const SLIDES = ['shiraz-anar', 'shiraz3'].map((name) => ({ name, set: bgSet(name) }));
const INTERVAL_MS = 5000;

export default function DrinkMenyBackground() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return undefined;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="landing-bg-cycle" aria-hidden="true">
      {SLIDES.map((slide, i) => (
        <div key={slide.name} className={`landing-bg-slide${i === active ? ' landing-bg-slide--active' : ''}`}>
          <BackgroundLayers set={slide.set} priority={i === 0 ? 'high' : 'low'} />
        </div>
      ))}
    </div>
  );
}
