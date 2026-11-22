import { useEffect, useState } from 'react';

/** Så här långt ner på sidan måste man ha scrollat innan headern får gömma sig. */
const HIDE_AFTER_PX = 80;
/** Rörelse (px) som krävs innan riktningen räknas, så att ett darrande finger eller en liten studs inte växlar. */
const SLACK_PX = 6;
/** Efter ett klick på en ankarlänk: så länge väntar vi på att hoppet börjar (finns inget att scrolla släpps låset då). */
const ANCHOR_START_MS = 600;
/** Under ett hopp: så lång stillhet i scrollen räknas som att hoppet är klart. */
const ANCHOR_IDLE_MS = 160;

/**
 * Headern gömmer sig när gästen scrollar nedåt och visas igen när hen scrollar uppåt.
 * Returnerar { hidden, stuck }: hidden = ska vara utanför skärmen, stuck = sidan är
 * scrollad bort från toppen (headern ligger då över innehållet och behöver egen bakgrund).
 *
 * paused: håll den synlig, t.ex. medan en meny eller ruta i headern är öppen.
 * Tangentbordsfokus i headern visar den alltid (annars tabbar man in i något osynligt).
 *
 * Ankarlänkar (kategoriraden på Beställ avhämtning, #...): webbläsaren räknar ut var
 * sektionen ska hamna med headerns höjd (--header-h) i klickögonblicket. Växlar headern
 * under hoppet, för att hoppet uppåt visar den eller hoppet nedåt gömmer den, hamnar
 * rubriken bakom headern eller med ett glapp ovanför sig. Därför står headern still
 * från klicket tills scrollen har stannat.
 */
export default function useHideOnScroll(ref, { paused = false } = {}) {
  const [state, setState] = useState(() => ({
    hidden: false,
    stuck: typeof window !== 'undefined' && window.scrollY > 2,
  }));

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    let locked = false; // ett ankarhopp pågår: headern står still
    let lockTimer = 0;

    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY); // iOS kan studsa under noll
      const delta = y - lastY;
      setState((prev) => {
        let hidden = prev.hidden;
        if (!locked) {
          if (y <= HIDE_AFTER_PX) hidden = false;
          else if (delta > SLACK_PX) hidden = true;
          else if (delta < -SLACK_PX) hidden = false;
        }
        const stuck = y > 2;
        return hidden === prev.hidden && stuck === prev.stuck ? prev : { hidden, stuck };
      });
      // Under gränsen räknas inte små steg: rörelsen samlas tills den är stor nog.
      if (locked || Math.abs(delta) > SLACK_PX || y <= HIDE_AFTER_PX) lastY = y;
    };

    const releaseLock = () => {
      locked = false;
      lockTimer = 0;
      lastY = Math.max(0, window.scrollY); // hoppet räknas inte som en scroll åt något håll
    };
    const holdLock = (ms) => {
      locked = true;
      window.clearTimeout(lockTimer);
      lockTimer = window.setTimeout(releaseLock, ms);
    };

    const onScroll = () => {
      if (locked) holdLock(ANCHOR_IDLE_MS); // hoppet pågår: vänta tills det står still
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const onFocusIn = () => setState((prev) => (prev.hidden ? { ...prev, hidden: false } : prev));
    const onClick = (event) => {
      const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
      const id = link ? decodeURIComponent(link.getAttribute('href').slice(1)) : '';
      if (id && document.getElementById(id)) holdLock(ANCHOR_START_MS);
    };

    const el = ref.current;
    window.addEventListener('scroll', onScroll, { passive: true });
    // Fångstfas: låset sätts före webbläsarens hopp, som är länkens standardåtgärd.
    document.addEventListener('click', onClick, true);
    el?.addEventListener('focusin', onFocusIn);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onClick, true);
      el?.removeEventListener('focusin', onFocusIn);
      window.clearTimeout(lockTimer);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [ref]);

  return { hidden: state.hidden && !paused, stuck: state.stuck };
}
