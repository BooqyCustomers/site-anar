import { Link } from 'react-router-dom';
import { useSite } from '@bookingsystemadvancedorg/site-kit';
import { BooqyWordmark } from '../../shared/BooqyWordmark';
import { useLanguage } from '../i18n/LanguageContext';

const ALLABOLAG_URL =
  'https://www.allabolag.se/foretag/anar-ab/link%C3%B6ping/restauranger/2KIC4IUI5YH9F';

export const DEVELOPER = 'IT Hjälparna Nordic AB';

export default function Footer() {
  const { t } = useLanguage();
  const { config } = useSite();
  const year = new Date().getFullYear();
  // Bolagsnamn och organisationsnummer från Booqy (versaler som i designen).
  const legalName = (config.legal.legalName || config.tenant.name).toUpperCase();

  return (
    <footer className="site-footer">
      <div className="site-footer-main">
        <a
          className="site-footer-org"
          href={ALLABOLAG_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="site-footer-org-name" translate="no">
            {legalName}
          </span>
          {config.legal.orgNumber && (
            <span className="site-footer-org-number" translate="no">
              {config.legal.orgNumber}
            </span>
          )}
        </a>
        <p className="site-footer-rights">
          © {year} <span translate="no">{legalName}</span>.{' '}
          <span>{t('footer.rights')}</span>
        </p>
        <div className="site-footer-credit-block">
          <p className="site-footer-credit">
            {t('footer.credit')}{' '}
            {/* The developer's company name is never translated. */}
            <span translate="no">{DEVELOPER}</span>
          </p>
          <p className="site-footer-dev-site">
            <a
              className="site-footer-dev-link"
              href="https://www.ithjalparna.se"
              target="_blank"
              rel="noopener noreferrer"
            >
              www.ithjalparna.se
            </a>
          </p>
        </div>
      </div>
      <div className="site-footer-sub">
        <nav className="site-footer-legal" aria-label="Juridiskt">
          <Link to="/integritetspolicy">Integritetspolicy</Link>
          <Link to="/cookies">Cookies</Link>
          {config.tenant.features.reservations && <Link to="/bokningsvillkor">Bokningsvillkor</Link>}
        </nav>
        <p className="site-footer-credit">
          Drivs av{' '}
          <span translate="no">
            <BooqyWordmark className="site-footer-booqy" />
          </span>
        </p>
      </div>
    </footer>
  );
}
