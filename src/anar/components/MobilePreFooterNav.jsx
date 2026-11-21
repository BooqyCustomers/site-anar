import { Link } from 'react-router-dom';
import OpeningHoursContent from './OpeningHoursContent';
import { useLanguage } from '../i18n/LanguageContext';

const COL1 = [
  { to: '/meny', key: 'nav.meny' },
  { to: '/drinkmeny', key: 'nav.drinkmeny' },
];

const COL2 = [
  { to: '/historia', key: 'nav.historia' },
  { to: '/parkering', key: 'nav.parkering' },
  { to: '/kontakt', key: 'nav.kontakt' },
];

export default function MobilePreFooterNav() {
  const { t } = useLanguage();

  return (
    <nav className="mobile-pre-footer" aria-label={t('a11y.preFooterNav')}>
      <div className="mobile-pre-footer-col">
        <ul className="mobile-pre-footer-list">
          {COL1.map((item) => (
            <li key={item.to}>
              <Link className="mobile-pre-footer-link" to={item.to}>
                {t(item.key)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="mobile-pre-footer-col">
        <ul className="mobile-pre-footer-list">
          {COL2.map((item) => (
            <li key={item.to}>
              <Link className="mobile-pre-footer-link" to={item.to}>
                {t(item.key)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="mobile-pre-footer-col mobile-pre-footer-col--hours">
        <p className="mobile-pre-footer-hours-heading">{t('hours.title')}</p>
        <OpeningHoursContent
          className="opening-hours--mobile-pre-footer"
          sectionIds={['restaurant', 'lunch', 'middag']}
          staticSections
        />
      </div>
    </nav>
  );
}
