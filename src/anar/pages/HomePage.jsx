import { lazy, Suspense } from 'react';
import { SkelCard, sitePages, useSite } from '@bookingsystemadvancedorg/site-kit';
import GuestReviewCards from '../components/GuestReviewCards';
import PoweredByBooqy from '../components/PoweredByBooqy';
import RestaurantMapSection from '../components/RestaurantMapSection';
import ReviewsPanel from '../components/ReviewsPanel';
import WeeklyOfferPopup from '../components/WeeklyOfferPopup';

const BookingFlow = lazy(sitePages.booking);

/** Startsidan: bokning (kitets flöde) bredvid betyg och omdömen, sedan kartan. Sidans <main>, som på alla andra sidor. */
export default function HomePage() {
  const { config } = useSite();
  const canBook = Boolean(config.tenant.features.reservations);

  return (
    <>
      <main className="booking-reviews-stack">
        <section className="desk-split">
          <div className="desk-split-col desk-split-col--form">
            {canBook && (
              <div className="kit-panel">
                <Suspense fallback={<SkelCard label="Hämtar bokningen" />}>
                  <BookingFlow />
                </Suspense>
                <PoweredByBooqy />
              </div>
            )}
          </div>
          <div className="desk-split-col desk-split-col--reviews">
            <div className="reviews-column">
              <ReviewsPanel />
              <GuestReviewCards />
            </div>
          </div>
        </section>
        <RestaurantMapSection />
      </main>
      <WeeklyOfferPopup />
    </>
  );
}
