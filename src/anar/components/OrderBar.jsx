import { Link, useLocation } from 'react-router-dom';
import { useSite } from '@bookingsystemadvancedorg/site-kit';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * Knapparna under headern. Boka bord och Beställ avhämtning (kitets flöden)
 * visas bara när restaurangens plan har dem; Beställ hem (Uber Eats/foodora)
 * är en vanlig sida.
 */
export default function OrderBar() {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const { config, location } = useSite();
  const { features } = config.tenant;
  const canBook = Boolean(features.reservations);
  const canPickup = Boolean(features.ordering && location.ordering?.pickup);
  const onBestallPage = pathname === '/bestall-hem';

  return (
    <section
      className={`order-bar${onBestallPage ? ' order-bar--bestall-page' : ''}`}
      aria-label={t('orderBar.aria')}
    >
      <div className="order-bar-actions">
        {canBook && (
          <Link className="order-bar-cta order-bar-cta--secondary" to="/">
            {t('orderBar.book')}
          </Link>
        )}
        {canPickup && (
          <Link className="order-bar-cta order-bar-cta--secondary" to="/bestall">
            {t('orderBar.pickup')}
          </Link>
        )}
        <Link className="order-bar-cta" to="/bestall-hem" aria-current={onBestallPage ? 'page' : undefined}>
          {t('orderBar.orderHome')}
        </Link>
      </div>
    </section>
  );
}
