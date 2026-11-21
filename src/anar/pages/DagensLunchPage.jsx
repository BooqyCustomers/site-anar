import { useEffect } from 'react';
import DishPhoto from '../components/DishPhoto';
import { MenuState } from '../components/MenyCategoryPage';
import { lunchTitle, priceList, priceText, useBooqyMenu } from '../data/booqyMenu';
import { useLanguage } from '../i18n/LanguageContext';

/** Det pris flest rätter i kategorin har; visas som prislapp, avvikande pris står efter rätten. */
function sharedPrice(items) {
  const counts = new Map();
  for (const it of items) {
    const prices = priceList(it);
    if (prices.length !== 1) continue;
    counts.set(prices[0], (counts.get(prices[0]) ?? 0) + 1);
  }
  let best = null;
  for (const [price, n] of counts) if (n > 1 && (best === null || n > counts.get(best))) best = price;
  return best;
}

/**
 * Dagens lunch: en panel per lunchkategori i Booqy ("Dagens lunch: ...",
 * data/booqyMenu.js). Lunchtiden och vad som ingår är Anars fasta text.
 */
export default function DagensLunchPage() {
  const { t } = useLanguage();
  const { loading, error, retry, sections } = useBooqyMenu();
  const lunch = sections.filter((s) => s.page === 'dagens');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="dagens" id="dagens-lunch">
      <header className="dagens-hero">
        <div className="dagens-hero-frame">
          <p className="dagens-kicker">{t('dagens.kicker')}</p>
          <h1 className="dagens-title">{t('dagens.title')}</h1>
          <p className="dagens-hours">
            <span className="dagens-hours-icon" aria-hidden="true">
              ◆
            </span>
            {t('dagens.hours')}
            <span className="dagens-hours-icon" aria-hidden="true">
              ◆
            </span>
          </p>
        </div>
      </header>

      <div className="dagens-included">
        <span className="dagens-included-line" aria-hidden="true" />
        <p className="dagens-included-text">{t('dagens.included')}</p>
        <span className="dagens-included-line" aria-hidden="true" />
      </div>

      {lunch.length === 0 && <MenuState loading={loading} error={error} retry={retry} />}

      {lunch.map((sec, si) => {
        const shared = sharedPrice(sec.items);
        const title = lunchTitle(sec.name);
        const grill = /kabab|kolgrill|kebab/i.test(title);
        const headingId = `dagens-heading-${si}`;
        return (
          <section
            key={sec.id}
            className={`dagens-panel${grill ? ' dagens-panel--grill' : ''}`}
            aria-labelledby={headingId}
          >
            <div className="dagens-panel-head">
              <h2 className="dagens-panel-title" id={headingId}>
                {title}
                {grill && (
                  <span className="dagens-panel-sub">
                    {t('dagens.grillSub')}
                  </span>
                )}
              </h2>
              {shared !== null && <span className="dagens-price-tag">{shared} kr</span>}
            </div>
            {shared !== null && (
              <p className="dagens-panel-note">
                {t('menu.sharedPrice')}
              </p>
            )}
            <div className="dagens-dishes">
              {sec.items.map((d) => {
                const prices = priceList(d);
                const own = !(prices.length === 1 && prices[0] === shared);
                return (
                  <article key={d.menuItemId} className="dagens-dish">
                    <DishPhoto item={d} />
                    <h3 className="dagens-dish-title">
                      <span translate="no">{d.name}</span>
                      {own && priceText(d) && ` - ${priceText(d)}`}
                    </h3>
                    {d.description && <p className="dagens-dish-text">{d.description}</p>}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
