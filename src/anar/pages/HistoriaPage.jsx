import { useEffect } from 'react';
import foundersImg from '../images/aboutus/MustafaAndShima.png';
import { useLanguage } from '../i18n/LanguageContext';

const CORREN_ARTICLE =
  'https://www.corren.se/nyheter/linkoping/artikel/unga-paret-oppnar-nytt-i-klassiska-linkopingslokalen/lw49dzwr';

export default function HistoriaPage() {
  const { t } = useLanguage();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="historia" id="historia">
      <header className="historia-hero">
        <p className="historia-eyebrow">{t('historia.eyebrow')}</p>
        <h1 className="historia-title">{t('historia.h1')}</h1>
        <p className="historia-intro">{t('historia.intro')}</p>
      </header>

      <section className="historia-panel" aria-labelledby="historia-anar">
        <h2 className="historia-h2" id="historia-anar">
          {t('historia.anar.h2')}
        </h2>
        <p className="historia-p">{t('historia.anar.p1')}</p>
        <p className="historia-p">{t('historia.anar.p2')}</p>
      </section>

      <section className="historia-panel" aria-labelledby="historia-vision">
        <h2 className="historia-h2" id="historia-vision">
          {t('historia.vision.h2')}
        </h2>
        <p className="historia-p">{t('historia.vision.p1')}</p>
      </section>

      <section className="historia-panel" aria-labelledby="historia-linkoping">
        <h2 className="historia-h2" id="historia-linkoping">
          {t('historia.dream.h2')}
        </h2>
        <p className="historia-p">{t('historia.dream.p1')}</p>
        <p className="historia-p">{t('historia.dream.p2')}</p>
        <p className="historia-p">{t('historia.dream.p3')}</p>
      </section>

      <blockquote className="historia-quote" cite={CORREN_ARTICLE}>
        <p>&ldquo;{t('historia.quote')}&rdquo;</p>
        <footer>{t('historia.quoteFooter')}</footer>
      </blockquote>

      <section className="historia-panel historia-panel--note" aria-labelledby="historia-media">
        <h2 className="historia-h2 historia-h2--small" id="historia-media">
          {t('historia.media.h2')}
        </h2>
        <figure className="historia-figure historia-figure--media">
          <div className="historia-figure-frame">
            <img
              src={foundersImg}
              alt={t('historia.media.alt')}
              width={960}
              height={640}
              loading="lazy"
              decoding="async"
              className="historia-img"
            />
          </div>
          <figcaption className="historia-caption">
            {t('historia.media.captionLead')}
            <a
              className="historia-caption-link"
              href={CORREN_ARTICLE}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('historia.media.link')}
            </a>
            {t('historia.media.captionTail')}
          </figcaption>
        </figure>
        <p className="historia-p">{t('historia.media.p1')}</p>
        <p className="historia-p historia-p--last">
          <a
            className="historia-link"
            href={CORREN_ARTICLE}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('historia.media.readLink')}
          </a>
        </p>
      </section>
    </main>
  );
}
