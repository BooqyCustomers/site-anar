import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { SkelCard } from '@bookingsystemadvancedorg/site-kit';
import { useLanguage } from '../i18n/LanguageContext';
import { categoryIntro, descriptionParts, priceText, sectionsForPage, useBooqyMenu, varietyList } from '../data/booqyMenu';
import DishPhoto from './DishPhoto';

function MenyDish({ item }) {
  const price = priceText(item);
  const { text, note } = descriptionParts(item);
  const varieties = varietyList(item);
  if (varieties.length) {
    return (
      <div className="meny-sublist">
        <DishPhoto item={item} />
        <h3 className="meny-sublist-title">
          <span translate="no">{item.name}</span>
          {price && ` ${price}`}
        </h3>
        <ul className="meny-bullets">
          {varieties.map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <article className="meny-dish">
      <DishPhoto item={item} />
      <h3 className="meny-dish-title">
        <span translate="no">{item.name}</span>
        {price && ` - ${price}`}
      </h3>
      {text.map((p, i) => (
        <p key={i} className="meny-dish-p">
          {p}
        </p>
      ))}
      {note && <p className="meny-dish-note">{note}</p>}
    </article>
  );
}

function MenySectionBody({ sec }) {
  return (
    <>
      {categoryIntro(sec.name).map((para, i) => (
        <p key={i} className="meny-intro">
          {para}
        </p>
      ))}
      {sec.items.map((item) => (
        <MenyDish key={item.menuItemId} item={item} />
      ))}
    </>
  );
}

/**
 * Meny- och drinksidan: kategorierna och rätterna kommer från Booqy
 * (data/booqyMenu.js), en kategori i taget som i designen.
 */
export default function MenyCategoryPage({
  page,
  domPrefix,
  panelId,
  mainId,
  mainClassName,
  heroKeys,
  filterAriaKey,
  closeSheetAriaKey,
}) {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const { loading, error, retry, sections: all } = useBooqyMenu();
  const sections = useMemo(() => sectionsForPage(all, page), [all, page]);
  const [activeId, setActiveId] = useState('');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const scrollPanelAfterCategoryPickRef = useRef(false);
  const panelRef = useRef(null);

  const sectionTitle = (id) => sections.find((s) => s.id === id)?.name ?? '';

  const activeSection = useMemo(
    () => sections.find((s) => s.id === activeId) ?? sections[0],
    [activeId, sections]
  );

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  useLayoutEffect(() => {
    if (!scrollPanelAfterCategoryPickRef.current) return;
    scrollPanelAfterCategoryPickRef.current = false;
    panelRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [activeId]);

  useEffect(() => {
    if (!filterSheetOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setFilterSheetOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [filterSheetOpen]);

  const selectCategory = (id) => {
    if (id !== activeSection?.id) {
      scrollPanelAfterCategoryPickRef.current = true;
    }
    setActiveId(id);
    setFilterSheetOpen(false);
  };

  if (loading || error || !activeSection) {
    return (
      <main className={mainClassName} id={mainId}>
        <header className="meny-hero">
          <p className="meny-eyebrow">{t(heroKeys.eyebrow)}</p>
          <h1 className="meny-title">{t(heroKeys.title)}</h1>
        </header>
        <MenuState loading={loading} error={error} retry={retry} />
      </main>
    );
  }

  const headingId = activeSection ? `${domPrefix}-heading-${activeSection.id}` : undefined;
  const filterSheetDomId = `${domPrefix}-filter-sheet`;
  const sheetTitleId = `${domPrefix}-sheet-title`;

  return (
    <main className={mainClassName} id={mainId}>
      <header className="meny-hero">
        <p className="meny-eyebrow">{t(heroKeys.eyebrow)}</p>
        <h1 className="meny-title">{t(heroKeys.title)}</h1>
        <p className="meny-lede">{t(heroKeys.lede)}</p>
      </header>

      <div className="meny-layout">
        <nav className="meny-filter" aria-labelledby={`${domPrefix}-filter-aria`}>
          <span id={`${domPrefix}-filter-aria`} className="sr-only">
            {t(filterAriaKey)}
          </span>
          <div className="meny-filter-desktop">
            <div className="meny-filter-label">
              {t('meny.filterLabel')}
            </div>
            <div className="meny-filter-list" role="tablist" aria-orientation="vertical">
              {sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  id={`${domPrefix}-tab-${s.id}`}
                  aria-selected={activeSection.id === s.id}
                  aria-controls={panelId}
                  className={`meny-filter-btn${activeSection.id === s.id ? ' meny-filter-btn--active' : ''}`}
                  onClick={() => selectCategory(s.id)}
                >
                  {sectionTitle(s.id)}
                </button>
              ))}
            </div>
          </div>

          <div className="meny-filter-mobile">
            <button
              type="button"
              className="meny-filter-open"
              aria-expanded={filterSheetOpen}
              aria-controls={filterSheetDomId}
              aria-haspopup="dialog"
              onClick={() => setFilterSheetOpen(true)}
            >
              <span className="meny-filter-open-row">
                <span className="meny-filter-open-kicker">
                  {t('meny.chooseCategory')}
                </span>
                <span className="meny-filter-open-chevron" aria-hidden="true">
                  ▼
                </span>
              </span>
              <span className="meny-filter-open-current">{sectionTitle(activeSection.id)}</span>
            </button>
          </div>
        </nav>

        <div
          ref={panelRef}
          className="meny-panel"
          id={panelId}
          role="tabpanel"
          aria-labelledby={headingId}
        >
          {activeSection && (
            <section className="meny-section" aria-labelledby={headingId}>
              <div className="meny-section-card">
                <h2 className="meny-section-title" id={headingId}>
                  {sectionTitle(activeSection.id)}
                </h2>
                <div className="meny-section-body">
                  <MenySectionBody sec={activeSection} />
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {filterSheetOpen && (
        <div className="meny-sheet-root">
          <button
            type="button"
            className="meny-sheet-backdrop"
            aria-label={t(closeSheetAriaKey)}
            onClick={() => setFilterSheetOpen(false)}
          />
          <div
            id={filterSheetDomId}
            className="meny-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={sheetTitleId}
          >
            <div className="meny-sheet-handle" aria-hidden="true" />
            <h2 className="meny-sheet-title" id={sheetTitleId}>
              {t('meny.sheetTitle')}
            </h2>
            <ul className="meny-sheet-list">
              {sections.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`meny-sheet-option${activeSection.id === s.id ? ' meny-sheet-option--active' : ''}`}
                    onClick={() => selectCategory(s.id)}
                  >
                    {sectionTitle(s.id)}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="meny-sheet-close"
              onClick={() => setFilterSheetOpen(false)}
            >
              {t('meny.close')}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

/** Laddning, fel eller tom meny (samma ruta på alla menysidor). */
export function MenuState({ loading, error, retry }) {
  const { t } = useLanguage();
  if (loading) return <SkelCard label={t('menu.loading')} />;
  return (
    <div className="meny-state" role={error ? 'alert' : 'status'}>
      <p>{error ? t('menu.error') : t('menu.empty')}</p>
      {error && (
        <button type="button" className="meny-state-retry" onClick={retry}>
          {t('menu.retry')}
        </button>
      )}
    </div>
  );
}
