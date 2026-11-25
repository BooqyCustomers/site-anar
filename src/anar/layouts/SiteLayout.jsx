import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { OfferCard, SkelCard, trackPage, useKeepTerms, useSite } from '@bookingsystemadvancedorg/site-kit';
import bgKebab from '../images/kebab.gif';
import bgHistoria from '../images/aboutus/bakgrund_bild.webp';
import bgKontakt from '../images/contact.webp';
import bgBestall from '../images/delivery/delivery_background-3840.webp';
import bgBestallSmall from '../images/delivery/delivery_background-1920.webp';
import { bgSet } from '../data/backgrounds';
import BackgroundLayers from '../components/BackgroundLayers';
import DrinkMenyBackground from '../components/DrinkMenyBackground';
import DagensLunchBackground from '../components/DagensLunchBackground';
import Header from '../components/Header';
import OrderBar from '../components/OrderBar';
import Footer from '../components/Footer';
import LegalPopups from '../components/LegalPopups';
import MobilePreFooterNav from '../components/MobilePreFooterNav';
import Seo from '../components/Seo';
import { useLanguage } from '../i18n/LanguageContext';

// Meny, Catering/Kolgrill och Parkering har en liggande och en stående version var (data/backgrounds.js). Startsidan
// (GIF:en), Kontakt, Vår historia och Beställ hem har en enda bild var, som täcker skärmen (cover).
const BACKGROUND = {
  home: { src: bgKebab },
  meny: { set: bgSet('anar') },
  kolgrill: { set: bgSet('kollgrill') },
  kontakt: { src: bgKontakt },
  parkering: { set: bgSet('parking') },
  historia: { src: bgHistoria },
  bestall: { src: bgBestall, small: bgBestallSmall },
};

export default function SiteLayout() {
  const { pathname } = useLocation();
  const { config, location } = useSite();
  const marketing = config.tenant.features.marketing;
  const { t } = useLanguage();
  // Anars namn översätts aldrig, inte heller i sidtitlar, kartan och beskrivningar.
  useKeepTerms([t('meta.brand'), 'ANAR', 'Anar']);
  // Besöksstatistik utan cookies, bara med marknadsföring i planen.
  useEffect(() => {
    if (marketing) trackPage(location.locationId, pathname);
  }, [marketing, location.locationId, pathname]);
  const isMeny = pathname === '/meny';
  const isDrinkMeny = pathname === '/drinkmeny';
  const isDagensLunch = pathname === '/dagens-lunch';
  const isKolgrill = pathname === '/kolgrill';
  const isHistoria = pathname === '/historia';
  const isParkering = pathname === '/parkering';
  const isKontakt = pathname === '/kontakt';
  const isBestall = pathname === '/bestall-hem';
  const isCatering = pathname === '/catering';
  const bgKey = isBestall
    ? 'bestall'
    : isKontakt
      ? 'kontakt'
      : isParkering
        ? 'parkering'
        : isHistoria
          ? 'historia'
          : isKolgrill || isCatering
            ? 'kolgrill'
            : isMeny
              ? 'meny'
              : 'home';

  const landingClass = [
    'landing',
    isMeny && 'landing--meny',
    isDrinkMeny && 'landing--drinkmeny',
    isDagensLunch && 'landing--dagenslunch',
    isKolgrill && 'landing--kolgrill',
    isHistoria && 'landing--historia',
    isParkering && 'landing--parkering',
    isKontakt && 'landing--kontakt',
    isBestall && 'landing--bestall',
    isCatering && 'landing--catering',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={landingClass}>
      <Seo />
      {isDrinkMeny ? (
        <DrinkMenyBackground />
      ) : isDagensLunch ? (
        <DagensLunchBackground />
      ) : (
        <BackgroundLayers key={bgKey} {...BACKGROUND[bgKey]} />
      )}
      <div className="landing-scrim" aria-hidden="true" />

      <div className="landing-content">
        <Header />
        <OrderBar />
        <Suspense fallback={<SkelCard label="Hämtar sidan" />}>
          <Outlet />
        </Suspense>
        {marketing && <OfferCard key={location.locationId} />}
        <Footer>
          <MobilePreFooterNav />
        </Footer>
        <LegalPopups />
      </div>
    </div>
  );
}
