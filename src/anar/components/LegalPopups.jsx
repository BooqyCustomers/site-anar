import { Suspense, lazy, useEffect, useId, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { SkelCard, sitePages } from '@bookingsystemadvancedorg/site-kit';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * Integritetspolicyn, cookies och bokningsvillkoren öppnas som popup över sidan gästen står på,
 * i stället för att ta henne till en hel sida (och bort från bokningen eller beställningen).
 *
 * Sidorna finns kvar på sina adresser (/integritetspolicy, /cookies, /bokningsvillkor) för direktlänkar,
 * mejl och sökmotorer. Det här fångar bara vanliga klick på en länk dit, var den än ligger: i sidfoten, eller
 * i kitets egna flöden, som öppnar dem i en ny flik. Ett klick med Ctrl, Cmd, Skift eller mittenknappen
 * går som förut, och står gästen redan på sidan händer inget.
 *
 * Innehållet är kitets egna sidor (så texten följer planen och språket), i en inbyggd <dialog>: tangentbordsfokus
 * stannar i rutan, Escape stänger, och sidan bakom går inte att nå.
 */

const PAGES = {
  '/integritetspolicy': { title: 'Integritetspolicy', Page: lazy(sitePages.privacy) },
  '/cookies': { title: 'Cookies', Page: lazy(sitePages.cookies) },
  '/bokningsvillkor': { title: 'Bokningsvillkor', Page: lazy(sitePages.bookingTerms) },
};

/** Sidan som en länk pekar på, om den är en av de tre och på samma sajt. */
function legalTarget(link) {
  let url;
  try {
    url = new URL(link.href, window.location.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  const path = url.pathname.replace(/\/+$/, '') || '/';
  return PAGES[path] ? { path, hash: url.hash } : null;
}

/** Kommer sist i rutans innehåll: hoppar till rubriken om länken pekade på en (t.ex. #cookies). */
function ScrollToHash({ hash, root }) {
  useEffect(() => {
    const id = hash ? decodeURIComponent(hash.slice(1)) : '';
    if (!id) return;
    const target = [...(root.current?.querySelectorAll('[id]') ?? [])].find((el) => el.id === id);
    target?.scrollIntoView({ block: 'start' });
  }, [hash, root]);
  return null;
}

function LegalDialog({ path, hash, onClose }) {
  const { t } = useLanguage();
  const dialogRef = useRef(null);
  const bodyRef = useRef(null);
  const titleId = useId();
  const { title, Page } = PAGES[path];

  // Rutan öppnas som modal när den visas, och sidan bakom rullar inte.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return undefined;
    if (typeof el.showModal === 'function') {
      if (!el.open) el.showModal();
    } else {
      el.setAttribute('open', '');
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // En länk inne i rutan till en av de andra sidorna byter innehåll: börja om uppifrån.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [path]);

  // close() flyttar fokus tillbaka dit gästen var och ger en close-händelse som tar bort rutan.
  const close = () => {
    const el = dialogRef.current;
    if (el && typeof el.close === 'function' && el.open) el.close();
    else onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="legal-dialog"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        // Ett klick utanför rutan (på bakgrunden) stänger.
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="legal-dialog-head">
        <h2 className="legal-dialog-title" id={titleId}>
          {title}
        </h2>
        <button type="button" className="legal-dialog-close" aria-label={t('a11y.closeDialog')} onClick={close}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="legal-dialog-body" ref={bodyRef} tabIndex={0}>
        <Suspense fallback={<SkelCard label="Hämtar sidan" lines={6} />}>
          <Page />
          <ScrollToHash hash={hash} root={bodyRef} />
        </Suspense>
      </div>
    </dialog>
  );
}

export default function LegalPopups() {
  const { pathname } = useLocation();
  // Rutan hör till sidan den öppnades på: byter sidan (bakåtknappen) är den borta, utan att något behöver nollställas.
  const [open, setOpen] = useState(null);
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!link || link.hasAttribute('download')) return;
      const target = legalTarget(link);
      if (!target || target.path === pathnameRef.current) return;
      // Fångstfas: före kitets egna länkhantering och före webbläsarens navigering (och före en ny flik).
      event.preventDefault();
      event.stopPropagation();
      setOpen({ ...target, from: pathnameRef.current });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  if (!open || open.from !== pathname) return null;
  return <LegalDialog path={open.path} hash={open.hash} onClose={() => setOpen(null)} />;
}
