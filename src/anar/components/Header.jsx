import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '@bookingsystemadvancedorg/site-kit';
import logoImg from '../images/logo.png';
import OpeningHoursDropdown from './OpeningHoursDropdown';
import OpeningHoursModal from './OpeningHoursModal';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from '../i18n/LanguageContext';
import useHideOnScroll from '../hooks/useHideOnScroll';
import { useHeaderFit } from './headerFit';

const BASE_LEFT_NAV = [
  { key: 'nav.meny', to: '/meny' },
  { key: 'nav.drinkmeny', to: '/drinkmeny' },
  { key: 'nav.dagensLunch', to: '/dagens-lunch' },
  { key: 'nav.catering', to: '/catering' },
];

// Vår historia och Kontakt ligger i sidfoten (Footer.jsx).
const RIGHT_NAV = [{ key: 'nav.parkering', to: '/parkering' }];

export default function Header() {
  const { t } = useLanguage();
  const { config, location } = useSite();
  const { features } = config.tenant;
  // Funktioner från planen: visas bara när restaurangen har dem.
  const LEFT_NAV = [
    ...BASE_LEFT_NAV,
    ...(features.giftCards ? [{ key: 'nav.presentkort', to: '/presentkort' }] : []),
    ...(features.events ? [{ key: 'nav.evenemang', to: '/evenemang' }] : []),
    ...(features.waitlist && location.waitlist?.publicJoin ? [{ key: 'nav.ko', to: '/ko' }] : []),
  ];
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoursModalOpen, setHoursModalOpen] = useState(false);
  const menuBtnRef = useRef(null);
  const closeBtnRef = useRef(null);
  const openingHoursDesktopRef = useRef(null);
  const prevMenuOpen = useRef(false);
  const fitRef = useRef(1);
  const headerRef = useRef(null);
  const probeRef = useRef(null);
  const brandRef = useRef(null);
  const leftListRef = useRef(null);
  const rightListRef = useRef(null);
  const endRef = useRef(null);
  const langRef = useRef(null);
  const drawerRef = useRef(null);
  // Länkarna på en rad när de får plats (mätt, headerFit.ts), annars i panelen bakom menyknappen.
  const fit = useHeaderFit(
    {
      header: headerRef,
      probe: probeRef,
      brand: brandRef,
      leftList: leftListRef,
      rightList: rightListRef,
      end: endRef,
      tools: langRef,
    },
    menuOpen,
    // Länkarna får plats i raden igen: panelen har ingen menyknapp längre, så den stängs.
    (next) => {
      if (next === 0) setMenuOpen(false);
    },
  );
  const linksInRow = fit === 0;
  // Gömd när man scrollar nedåt, synlig när man scrollar uppåt; alltid synlig medan en meny är öppen.
  const { hidden, stuck } = useHideOnScroll(headerRef, { paused: menuOpen || hoursModalOpen });

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // header.css göms de klistrade raderna i sidan medan menyn är öppen.
    document.documentElement.classList.add('nav-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      document.documentElement.classList.remove('nav-open');
    };
  }, [menuOpen]);

  // Headerns höjd till CSS (--header-h): kalkylbrickan och andra klistrade delar lägger sig under den,
  // eller högst upp när den är gömd.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return undefined;
    const root = document.documentElement;
    const set = () => root.style.setProperty('--header-h', `${hidden ? 0 : el.offsetHeight}px`);
    set();
    const observer = new ResizeObserver(set);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--header-h');
    };
  }, [hidden]);

  useEffect(() => {
    fitRef.current = fit;
  }, [fit]);

  // Menyn öppen: fokus till menyns egen stängknapp (menyknappen i headern är då gömd). Stängd: tillbaka till menyknappen.
  useEffect(() => {
    if (menuOpen) {
      closeBtnRef.current?.focus({ preventScroll: true });
    } else if (prevMenuOpen.current) {
      // Menyknappen finns inte när länkarna står i raden: då den första länken.
      if (fitRef.current === 0) headerRef.current?.querySelector('.site-header-nav a')?.focus({ preventScroll: true });
      else menuBtnRef.current?.focus();
    }
    prevMenuOpen.current = menuOpen;
  }, [menuOpen]);

  // Tab stannar i den öppna panelen: stängknappen, länkarna och Öppettider, runt igen.
  const trapTab = (e) => {
    if (!menuOpen || e.key !== 'Tab') return;
    const drawer = drawerRef.current;
    if (!drawer) return;
    const items = [...drawer.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')];
    if (items.length === 0) return;
    e.preventDefault();
    const i = items.indexOf(document.activeElement);
    const next = i === -1 ? 0 : (i + (e.shiftKey ? -1 : 1) + items.length) % items.length;
    items[next].focus();
  };

  return (
    <>
      {/* Medan sidomenyn är öppen åker hela headern uppåt (och går inte att tabba in i); menyn har egen stängknapp. */}
      <header
        ref={headerRef}
        inert={menuOpen}
        data-fit={fit}
        className={`site-header${stuck ? ' site-header--stuck' : ''}${hidden ? ' site-header--hidden' : ''}${menuOpen ? ' site-header--menu-open' : ''}`}
      >
        {/* Osynligt mått för headerFit.ts: bandets sidomarginal och kolumnavstånd när länkarna står i raden. */}
        <span className="site-header-probe" ref={probeRef} aria-hidden="true" />
        <div className="site-header-gutter" aria-hidden="true" />

        <nav
          className={`site-header-nav site-header-nav--left${linksInRow ? '' : ' site-header-off'}`}
          aria-label={t('a11y.navLeft')}
          aria-hidden={linksInRow ? undefined : true}
          inert={!linksInRow}
        >
          <ul ref={leftListRef}>
            {LEFT_NAV.map((item) => (
              <li key={item.to}>
                <Link to={item.to}>{t(item.key)}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <Link ref={brandRef} className="site-header-brand" to="/" aria-label={t('a11y.home')} onClick={closeMenu}>
          <img src={logoImg} alt="" width={88} height={88} />
        </Link>

        {/* Höger kolumn: länkarna, sedan språkväljaren längst till höger (och på telefon menyknappen). */}
        <div className="site-header-end" ref={endRef}>
          <nav
            className={`site-header-nav site-header-nav--right${linksInRow ? '' : ' site-header-off'}`}
            aria-label={t('a11y.navRight')}
            aria-hidden={linksInRow ? undefined : true}
            inert={!linksInRow}
          >
            <ul ref={rightListRef}>
              {RIGHT_NAV.map((item) => (
                <li key={item.to}>
                  <Link to={item.to}>{t(item.key)}</Link>
                </li>
              ))}
              <li>
                <OpeningHoursDropdown
                  ref={openingHoursDesktopRef}
                  open={hoursModalOpen}
                  onOpenChange={setHoursModalOpen}
                />
              </li>
            </ul>
          </nav>

          <div className="site-header-tools">
            <LanguageSwitcher ref={langRef} />
            <button
              ref={menuBtnRef}
              type="button"
              className={`site-header-burger${menuOpen ? ' site-header-burger--open' : ''}`}
              aria-hidden={linksInRow ? true : undefined}
              inert={linksInRow}
              aria-label={menuOpen ? t('a11y.closeMenu') : t('a11y.openMenu')}
              aria-expanded={menuOpen}
              aria-controls="mobile-drawer"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className="site-header-burger-line" aria-hidden="true" />
              <span className="site-header-burger-line" aria-hidden="true" />
              <span className="site-header-burger-line" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div
        className={`mobile-drawer-backdrop${menuOpen ? ' mobile-drawer-backdrop--visible' : ''}`}
        aria-hidden="true"
        onClick={closeMenu}
      />

      <aside
        id="mobile-drawer"
        ref={drawerRef}
        onKeyDown={trapTab}
        className={`mobile-drawer${menuOpen ? ' mobile-drawer--open' : ''}`}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <button
          ref={closeBtnRef}
          type="button"
          className="mobile-drawer-close"
          aria-label={t('a11y.closeMenu')}
          onClick={closeMenu}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <nav aria-label={t('a11y.mobileNav')}>
          <ul className="mobile-drawer-list">
            {LEFT_NAV.map((item) => (
              <li key={item.to}>
                <Link to={item.to} onClick={closeMenu}>
                  {t(item.key)}
                </Link>
              </li>
            ))}
            {RIGHT_NAV.map((item) => (
              <li key={item.to}>
                <Link to={item.to} onClick={closeMenu}>
                  {t(item.key)}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="mobile-drawer-hours-trigger"
                onClick={() => {
                  closeMenu();
                  setHoursModalOpen(true);
                }}
              >
                {t('hours.title')}
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      <OpeningHoursModal
        open={hoursModalOpen}
        onClose={() => setHoursModalOpen(false)}
        desktopTriggerContainerRef={openingHoursDesktopRef}
      />
    </>
  );
}
