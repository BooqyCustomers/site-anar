import { useEffect, useState } from 'react';
import dagens from '../images/dagens.webp';
import dagens1 from '../images/dagens1.webp';
import dagens2 from '../images/dagens2.webp';
import dagens3 from '../images/dagens3.webp';
import dagens4 from '../images/dagens4.webp';

const SOURCES = [dagens, dagens1, dagens2, dagens3, dagens4];
const INTERVAL_MS = 5000;

export default function DagensLunchBackground() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return undefined;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % SOURCES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="landing-bg-cycle" aria-hidden="true">
      {SOURCES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className={`landing-bg-slide${i === active ? ' landing-bg-slide--active' : ''}`}
          decoding="async"
          fetchPriority={i === 0 ? 'high' : 'low'}
        />
      ))}
    </div>
  );
}
