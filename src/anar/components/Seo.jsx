import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useLanguage as useKitLanguage } from '@bookingsystemadvancedorg/site-kit';
import { DEFAULT_OG_IMAGE, SITE_ORIGIN } from '../config/site';

function ensureMeta(property, content) {
  if (typeof document === 'undefined') return;
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function ensureMetaName(name, content) {
  if (typeof document === 'undefined') return;
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

const ROUTES = [
  { path: '/', titleKey: 'pageTitle.home', descKey: 'meta.desc.home' },
  { path: '/meny', titleKey: 'pageTitle.meny', descKey: 'meta.desc.meny' },
  { path: '/drinkmeny', titleKey: 'pageTitle.drinkmeny', descKey: 'meta.desc.drinkmeny' },
  { path: '/dagens-lunch', titleKey: 'pageTitle.dagens', descKey: 'meta.desc.dagens' },
  { path: '/kolgrill', titleKey: 'pageTitle.kolgrill', descKey: 'meta.desc.kolgrill' },
  { path: '/historia', titleKey: 'pageTitle.historia', descKey: 'meta.desc.historia' },
  { path: '/parkering', titleKey: 'pageTitle.parkering', descKey: 'meta.desc.parkering' },
  { path: '/kontakt', titleKey: 'pageTitle.kontakt', descKey: 'meta.desc.kontakt' },
  { path: '/bestall-hem', titleKey: 'pageTitle.bestall', descKey: 'meta.desc.bestall' },
  { path: '/catering', titleKey: 'pageTitle.catering', descKey: 'meta.desc.catering' },
];

const OG_LOCALES = { sv: 'sv_SE', en: 'en_GB', es: 'es_ES', ar: 'ar_AR', fa: 'fa_IR' };

/**
 * Uppdaterar titel, beskrivning, canonical och Open Graph/Twitter per rutt.
 */
export default function Seo() {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const kitLang = useKitLanguage().lang;

  useEffect(() => {
    const route = ROUTES.find((r) => r.path === pathname) ?? ROUTES[0];
    const title = t(route.titleKey);
    const description = t(route.descKey);
    const url = `${SITE_ORIGIN}${route.path === '/' ? '/' : route.path}`;

    document.title = title;
    ensureMetaName('description', description);

    ensureMeta('og:type', 'website');
    ensureMeta('og:site_name', t('meta.brand'));
    ensureMeta('og:title', title);
    ensureMeta('og:description', description);
    ensureMeta('og:url', url);
    ensureMeta('og:image', DEFAULT_OG_IMAGE);
    ensureMeta('og:locale', OG_LOCALES[kitLang] ?? 'sv_SE');

    ensureMetaName('twitter:card', 'summary_large_image');
    ensureMetaName('twitter:title', title);
    ensureMetaName('twitter:description', description);
    ensureMetaName('twitter:image', DEFAULT_OG_IMAGE);
  }, [pathname, t, kitLang]);

  return null;
}
