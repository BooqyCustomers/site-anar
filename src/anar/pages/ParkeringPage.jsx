import { useEffect, useMemo } from 'react';
import ParkingMap from '../components/ParkingMap';
import { PARKING_LOTS } from '../data/parkingData';
import { useLanguage } from '../i18n/LanguageContext';

function mapsPlaceUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export default function ParkeringPage() {
  const { t } = useLanguage();
  const sorted = useMemo(
    () => [...PARKING_LOTS].sort((a, b) => a.distanceM - b.distanceM),
    []
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="parking-page" id="parkering">
      <header className="parking-page-hero">
        <p className="parking-page-eyebrow">{t('parkering.eyebrow')}</p>
        <h1 className="parking-page-title">{t('parkering.h1')}</h1>
        <p className="parking-page-intro">
          {t('parkering.introStart')}
          <strong className="parking-page-legend-logo">{t('parkering.introLogo')}</strong>
          {t('parkering.introEnd')}
        </p>
      </header>

      <section className="parking-page-map-block" aria-labelledby="parking-map-heading">
        <h2 className="parking-page-h2" id="parking-map-heading">
          {t('parkering.mapH2')}
        </h2>
        <p className="parking-page-map-note">
          {t('parkering.mapNoteBefore')}
          <strong>{t('parkering.mapNoteName')}</strong>
          {t('parkering.mapNoteAfter')}
        </p>
        <div className="parking-page-frame parking-page-frame--leaflet">
          <ParkingMap />
        </div>
        <p className="parking-page-map-attrib">
          Kartdata ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
            OpenStreetMap
          </a>
        </p>
      </section>

      <section className="parking-page-list-section" aria-labelledby="parking-list-heading">
        <h2 className="parking-page-h2" id="parking-list-heading">
          {t('parkering.listH2')}
        </h2>
        <ul className="parking-page-list">
          {sorted.map((lot) => (
            <li key={lot.address} className="parking-page-card">
              <div className="parking-page-card-top">
                <span className="parking-page-distance">{lot.distanceM} m</span>
                <span className="parking-page-spaces">
                  {lot.spaces} {t('parkering.spaces')}
                </span>
              </div>
              <h3 className="parking-page-card-title">{lot.name}</h3>
              <p className="parking-page-card-address">{lot.address}</p>
              <a
                className="parking-page-maps-link"
                href={mapsPlaceUrl(lot.address)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('parkering.mapsLink')}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
