import { useCallback, useEffect, useId, useState } from 'react';
import { priceText, useBooqyMenu } from '../data/booqyMenu';
import { useLanguage } from '../i18n/LanguageContext';
import DishPhoto from './DishPhoto';
import { dismissWeeklyOffer, isWeeklyOfferDismissed } from './weeklyOfferState';

/**
 * "Veckans erbjudande" på startsidan: kategorin med det namnet i Booqy visas som en ruta nere till höger
 * (på telefon och mindre skärmar som ett ark längst ned) som gästen kan stänga. Restaurangen byter rätter,
 * priser, beskrivning och foto i Booqy Admin; finns ingen sådan kategori visas ingenting.
 *
 * Kategorin ligger kvar bland de andra på Meny-sidan. Rutan visas en stund efter att sidan öppnats, så att den
 * inte tar fokus från bokningen, och den är inte en modal: sidan bakom går att använda. Börjar gästen använda
 * bokningen (ett klick eller tangentbordsfokus i bokningsrutan) stänger den sig själv: på telefon ligger arket
 * annars över bordsplanen och knapparna gästen försöker trycka på.
 */

const OFFER_RE = /veckans\s+erbjudande/i;
const SHOW_AFTER_MS = 1200;
/** Bokningsrutan på startsidan (kitets flöde i Anars panel). */
const BOOKING_SELECTOR = '.kit-panel';

export default function WeeklyOfferPopup() {
  const { t } = useLanguage();
  const { sections } = useBooqyMenu();
  const titleId = useId();
  const [open, setOpen] = useState(!isWeeklyOfferDismissed());
  const [ready, setReady] = useState(false);
  const offer = sections.find((s) => OFFER_RE.test(s.name));

  const close = useCallback(() => {
    dismissWeeklyOffer();
    setOpen(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const inBooking = (target) => target instanceof Element && target.closest(BOOKING_SELECTOR) !== null;
    const keyboardFocus = (target) => {
      try {
        return target.matches(':focus-visible');
      } catch {
        return false;
      }
    };
    const onPointerDown = (e) => {
      if (inBooking(e.target)) close();
    };
    const onFocusIn = (e) => {
      if (inBooking(e.target) && keyboardFocus(e.target)) close();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [open, close]);

  if (!offer || !open || !ready) return null;

  return (
    <aside
      className="weekly-offer"
      aria-labelledby={titleId}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
      }}
    >
      <button type="button" className="weekly-offer-close" aria-label={t('a11y.closeOffer')} onClick={close}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <h2 className="weekly-offer-title" id={titleId}>
        {offer.name}
      </h2>
      <ul className="weekly-offer-list">
        {offer.items.map((item) => {
          const price = priceText(item);
          return (
            <li className="weekly-offer-item" key={item.menuItemId}>
              <DishPhoto item={item} />
              <div className="weekly-offer-text">
                <h3 className="weekly-offer-dish">
                  <span className="weekly-offer-name" translate="no">
                    {item.name}
                  </span>
                  {price && <span className="weekly-offer-price">{price}</span>}
                </h3>
                {item.description && <p className="weekly-offer-desc">{item.description}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
