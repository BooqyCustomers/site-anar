import { useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * Catering: platshållare som visas tills platsen har slagit på catering i
 * Booqy (då visas kitets riktiga flöde i stället, se CATERING_PLACEHOLDER_UNTIL_ENABLED
 * i App.tsx). Sidan ligger i Anars vanliga skal, så headern och menyn finns kvar.
 */
export default function CateringPage() {
  const { t } = useLanguage();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="catering-page" id="catering">
      <div className="catering-page-panel">
        <h1 className="catering-page-title">{t('catering.h1')}</h1>
        <p className="catering-page-status">{t('catering.status')}</p>
      </div>
    </main>
  );
}
