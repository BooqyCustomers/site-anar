import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const REVIEWS = [
  {
    id: '2',
    name: 'laleh kafashi',
    meta: 'för 4 månader sedan',
    text: 'Fantastisk atmosfär, jättegod mat och väldigt trevlig personal! En riktigt fin upplevelse. Rekommenderas varmt.',
    stars: 5,
  },
  {
    id: '3',
    name: 'Ingela Lindahl',
    meta: '200-300 kr · för 3 månader sedan',
    text: 'Mycket vällagat och gott i trevlig miljö.',
    stars: 5,
  },
  {
    id: '4',
    name: 'Marcus V.',
    meta: 'för 5 månader sedan',
    text: 'Autentiska smaker och generösa portioner. Perfekt för en middag med familjen.',
    stars: 5,
  },
  {
    id: '5',
    name: 'Sofia K.',
    meta: '100-200 kr · för 1 månad sedan',
    text: 'Lugn stämning och väldigt god saffransrisotto. Personalen tog hand om oss från start.',
    stars: 5,
  },
  {
    id: '6',
    name: 'Jonas P.',
    meta: 'för 2 månader sedan',
    text: 'Bra vegetariska alternativ och snabb service trots fullt på helgkväll.',
    stars: 5,
  },
  {
    id: '7',
    name: 'Elin R.',
    meta: 'för 3 veckor sedan',
    text: 'Fint ställe nära sjukhuset - vi åt lunch och blev positivt överraskade av kvaliteten.',
    stars: 5,
  },
  {
    id: 'ann-britt',
    name: 'Ann-Britt Fagertoft',
    meta: 'Annat · 200-300 kr · för 2 månader sedan',
    text: 'Mycket trevligt bemötande. Vi var 5 personer i sällskapet och alla var nöjda med både mat och service.',
    stars: 5,
  },
];

function initials(name) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function StarRow({ count }) {
  return (
    <div className="guest-reviews-stars" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < count ? 'guest-reviews-star guest-reviews-star--on' : 'guest-reviews-star'}>
          ★
        </span>
      ))}
    </div>
  );
}

/** Leken är lätt solfjäderformad: kortet på djup j (0 = främst). Högst fyra djup syns, resten ligger på djup 3. */
const VISIBLE = 4;
function slot(j) {
  const d = Math.min(j, VISIBLE - 1);
  return {
    t: `translate3d(0, ${-d * 6}px, ${-d * 30}px) rotate(${d * 3}deg) scale(${+(1 - d * 0.03).toFixed(2)})`,
    b: +(1 - d * 0.15).toFixed(2),
  };
}
const STEP_MS = 3600;
const SWING_MS = 620;
/** Långsam start, mycket snabb mitt, mjuk landning, som en hand. */
const HAND = 'cubic-bezier(.8,0,.2,1)';

/** Det främre kortets väg runt hörnet till lekens baksida. Ingen opacitet: kortet syns hela vägen. */
function swingFrames(back) {
  return [
    { transform: slot(0).t, filter: 'brightness(1)' },
    { transform: 'translate3d(42%, -58px, 20px) rotate(16deg)', filter: 'brightness(1)' },
    { transform: 'translate3d(36%, -50px, -140px) rotate(12deg) scale(.92)', filter: `brightness(${(1 + back.b) / 2})` },
    { transform: back.t, filter: `brightness(${back.b})` },
  ];
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Gästomdömen som en lätt solfjäderformad kortlek: var 3,6 sekund svingar det
 * främre kortet runt hörnet till baksidan medan de andra kliver fram ett steg.
 * Kortet ligger över leken tills det har passerat den och går sedan bakom.
 * Stannar medan pekaren är över leken eller fokus är i den; ett klick vänder
 * direkt. Med reducerad rörelse står leken still tills man klickar, och då
 * byter korten plats utan rörelse.
 */
export default function GuestReviewCards() {
  const { t } = useLanguage();
  const count = REVIEWS.length;
  const [front, setFront] = useState(0);
  /** Kortet som svingar just nu, och om det fortfarande ligger över leken. */
  const [swing, setSwing] = useState(null);
  const [paused, setPaused] = useState(false);
  const frontRef = useRef(0);
  const busy = useRef(false);
  const cards = useRef([]);
  const anim = useRef(null);
  const timer = useRef(null);

  const flip = useCallback(() => {
    // Ett kort i taget: en vändning som avbryts mitt i blir ett hopp.
    if (busy.current || count < 2) return;
    const was = frontRef.current;
    frontRef.current = (was + 1) % count;
    setFront(frontRef.current);
    const el = cards.current[was];
    if (reducedMotion() || typeof el?.animate !== 'function') return;
    busy.current = true;
    setSwing({ index: was, over: true });
    const a = el.animate(swingFrames(slot(count - 1)), { duration: SWING_MS, easing: HAND, fill: 'forwards' });
    anim.current = a;
    // Halvvägs har kortet passerat leken och läggs bakom den.
    timer.current = setTimeout(() => setSwing({ index: was, over: false }), SWING_MS / 2);
    a.onfinish = () => {
      busy.current = false;
      anim.current = null;
      setSwing(null);
      a.cancel();
    };
  }, [count]);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      anim.current?.cancel();
    },
    [],
  );

  useEffect(() => {
    if (paused || count < 2 || reducedMotion()) return undefined;
    const id = setInterval(flip, STEP_MS);
    return () => clearInterval(id);
  }, [paused, flip, count]);

  return (
    <div
      className="guest-reviews"
      aria-labelledby="guest-reviews-label"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span id="guest-reviews-label" className="sr-only">
        {`${count} ${t('guestReviews.aria')}`}
      </span>
      <div className="guest-reviews-stack" onClick={flip}>
        {REVIEWS.map((review, index) => {
          const pos = (index - front + count) % count;
          const isFront = pos === 0;
          const swinging = swing?.index === index;
          const s = slot(pos);
          return (
            <blockquote
              key={review.id}
              ref={(el) => {
                cards.current[index] = el;
              }}
              className={`guest-reviews-card${isFront || swinging ? ' guest-reviews-card--featured' : ''}${
                swinging ? ' guest-reviews-card--leaving' : ''
              }`}
              style={{
                '--deck-transform': s.t,
                '--deck-filter': `brightness(${s.b})`,
                zIndex: swinging ? (swing.over ? 100 : 1) : 100 - pos,
              }}
              aria-hidden={!isFront}
            >
              <div className="guest-reviews-head">
                <span className="guest-reviews-avatar" aria-hidden="true" translate="no">
                  {initials(review.name)}
                </span>
                <div>
                  <cite className="guest-reviews-name" translate="no">
                    {review.name}
                  </cite>
                  <p className="guest-reviews-meta">{review.meta}</p>
                </div>
              </div>
              <StarRow count={review.stars} />
              <p className="guest-reviews-quote">“{review.text}”</p>
            </blockquote>
          );
        })}
      </div>
    </div>
  );
}
