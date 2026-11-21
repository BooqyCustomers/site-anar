import googleLogo from '../images/Google.png';
import foodoraLogo from '../images/Foodora.png';
import { useLanguage } from '../i18n/LanguageContext';

const GOOGLE_REVIEW_URL =
  'https://www.google.com/search?sca_esv=d3b7886481150a40&si=AL3DRZEsmMGCryMMFSHJ3StBhOdZ2-6yYkXd_doETEE1OR-qOZcilv0Mmw8So-Rs80GbG24s6CRODuMTgnfDlviKo_pswFfmBNhy9_5xCT5bKjcxA3obdwCtS5S-YU_wQSULDBvrt_OjQ_rE--R1PQSL0YFwZf-GQg%3D%3D&q=ANAR+Restaurang+%26+Bar+Recensioner&sa=X&ved=2ahUKEwjtg9q1ypmUAxVxHhAIHc8pG1UQ0bkNegQIMxAH&biw=2133&bih=1012&dpr=0.9';

const FOODORA_URL =
  'https://www.foodora.se/restaurant/t5ix/anar-restaurang-and-bar/reviews';

export default function ReviewsPanel() {
  const { t } = useLanguage();

  return (
    <aside className="reviews-panel" aria-labelledby="reviews-panel-heading">
      <div className="reviews-panel-card">
        <h2 id="reviews-panel-heading" className="reviews-panel-title">
          {t('reviews.title')}
        </h2>

        <div className="reviews-panel-badges">
          <a
            href={GOOGLE_REVIEW_URL}
            className="reviews-panel-badge reviews-panel-badge--link reviews-panel-badge--google"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src={googleLogo} alt="Google" className="reviews-panel-badge-logo" width={36} height={36} />
            <div className="reviews-panel-badge-text">
              <span className="reviews-panel-badge-label" translate="no">Google</span>
              <span className="reviews-panel-badge-score" aria-label={t('reviews.scoreGoogle')}>
                4,6<span className="reviews-panel-badge-max">/5</span>
              </span>
            </div>
          </a>
          <a
            className="reviews-panel-badge reviews-panel-badge--link"
            href={FOODORA_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src={foodoraLogo} alt="foodora" className="reviews-panel-badge-logo" width={36} height={36} />
            <div className="reviews-panel-badge-text">
              <span className="reviews-panel-badge-label" translate="no">foodora</span>
              <span className="reviews-panel-badge-score" aria-label={t('reviews.scoreFoodora')}>
                4,5<span className="reviews-panel-badge-max">/5</span>
              </span>
            </div>
          </a>
        </div>
      </div>
    </aside>
  );
}
