import { useLocationInfo } from '@bookingsystemadvancedorg/site-kit';
import { useLanguage } from '../i18n/LanguageContext';

/** Hitta hit: adressen kommer från platsen i Booqy (gata, sedan postnummer och ort). */
export default function RestaurantMapSection() {
  const { t } = useLanguage();
  const { address } = useLocationInfo();
  const name = t('map.name');
  const [LINE1, ...rest] = address.split(',').map((p) => p.trim());
  const LINE2 = rest.join(', ');
  const query = encodeURIComponent([name, address].filter(Boolean).join(', '));
  const MAPS_EMBED = `https://maps.google.com/maps?q=${query}&z=16&output=embed&iwloc=near`;
  const MAPS_NAV = `https://www.google.com/maps/dir/?api=1&destination=${query}`;

  return (
    <section className="home-map" aria-labelledby="home-map-heading">
      <div className="home-map-inner">
        <h2 className="home-map-title" id="home-map-heading">
          {t('map.title')}
        </h2>
        <p className="home-map-address">
          <span className="home-map-name">{name}</span>
          <span className="home-map-lines" translate="no">
            {LINE1}
            <br />
            {LINE2}
          </span>
        </p>

        <div className="home-map-frame">
          <iframe
            title={t('map.iframeTitle')}
            className="home-map-iframe"
            src={MAPS_EMBED}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <a className="home-map-nav" href={MAPS_NAV} target="_blank" rel="noopener noreferrer">
          {t('map.navigate')}
        </a>
      </div>
    </section>
  );
}
