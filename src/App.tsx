import { lazy } from 'react'
import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { isTableQrLink, sitePages, useSite } from '@bookingsystemadvancedorg/site-kit'
import SiteLayout from './anar/layouts/SiteLayout'
import KitPage from './anar/layouts/KitPage'
import HomePage from './anar/pages/HomePage'
import MenyPage from './anar/pages/MenyPage'
import DrinkMenyPage from './anar/pages/DrinkMenyPage'
import DagensLunchPage from './anar/pages/DagensLunchPage'
import KolgrillPage from './anar/pages/KolgrillPage'
import HistoriaPage from './anar/pages/HistoriaPage'
import ParkeringPage from './anar/pages/ParkeringPage'
import KontaktPage from './anar/pages/KontaktPage'
import BestallHemPage from './anar/pages/BestallHemPage'
import CateringPage from './anar/pages/CateringPage'

// Flödena hämtas först när gästen öppnar dem (Anars egna sidor och startsidan
// är med från början); SiteLayout visar ett skelett under tiden.
const BookingFlow = lazy(sitePages.booking)
const ManageBooking = lazy(sitePages.manageBooking)
const OrderFlow = lazy(sitePages.order)
const Kassan = lazy(sitePages.kassan)
const OrderStatus = lazy(sitePages.orderStatus)
// Anars cateringformulär (kryssa i vad du vill ha); gästens sida efteråt är kitets.
const CateringFlow = lazy(() => import('./anar/catering/CateringBuilder'))
const CateringRequest = lazy(sitePages.cateringRequest)
const PrivacyPolicy = lazy(sitePages.privacy)
const CookiePolicy = lazy(sitePages.cookies)
const BookingTermsPage = lazy(sitePages.bookingTerms)
const GiftCards = lazy(sitePages.presentkort)
const GiftCardBalance = lazy(sitePages.presentkortSaldo)
const Queue = lazy(sitePages.ko)
const Events = lazy(sitePages.evenemang)
const EventDetail = lazy(sitePages.evenemangDetalj)
const Tickets = lazy(sitePages.biljett)
const TicketReceive = lazy(sitePages.biljettTaEmot)

/**
 * /catering visar Anars cateringformulär (src/anar/catering: kryssa i rätter och
 * drycker, ungefärlig kalkyl) när platsen har slagit på catering i Booqy
 * (location.catering). Offerten, BankID-signeringen och betalningen efteråt är
 * kitets (CateringRequest). Tills dess visas "Under utveckling" (CateringPage,
 * med headern kvar): dev är klart, prod är under uppbyggnad. När prod är klar:
 * sätt denna till false, så visas alltid formuläret, som själv säger "tar inte
 * emot cateringförfrågningar just nu" när restaurangen stänger av catering.
 */
const CATERING_PLACEHOLDER_UNTIL_ENABLED = true

/**
 * Anars publika webbplats. Utseendet och sidorna (src/anar) är Anars egna;
 * flödena (boka, beställ, catering, presentkort, kö, evenemang, juridik)
 * kommer från @bookingsystemadvancedorg/site-kit och visas i KitPage. Varje
 * flöde finns bara med funktionen i planen (kö dessutom bara när platsen tar
 * emot kö på sajten). En gammal QR-kod från ett bord (/bestall?bord=...) visar
 * alltid "Beställ och betala i kassan". Gästens sidor för en gjord
 * bokning/beställning/cateringförfrågan (länkar i sms och mejl) finns alltid.
 * Beställ hem (Uber Eats/foodora) är Anars egen sida på /bestall-hem.
 */
function App() {
  const { config, location } = useSite()
  const reservations = config.tenant.features.reservations
  const ordering = config.tenant.features.ordering
  const catering = config.tenant.features.catering
  const cateringLive = catering && (Boolean(location.catering) || !CATERING_PLACEHOLDER_UNTIL_ENABLED)
  const giftCards = config.tenant.features.giftCards
  const queue = config.tenant.features.waitlist && location.waitlist?.publicJoin
  const events = config.tenant.features.events
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="meny" element={<MenyPage />} />
        <Route path="drinkmeny" element={<DrinkMenyPage />} />
        <Route path="dagens-lunch" element={<DagensLunchPage />} />
        <Route path="kolgrill" element={<KolgrillPage />} />
        <Route path="historia" element={<HistoriaPage />} />
        <Route path="parkering" element={<ParkeringPage />} />
        <Route path="kontakt" element={<KontaktPage />} />
        <Route path="bestall-hem" element={<BestallHemPage />} />
        {!cateringLive && <Route path="catering" element={<CateringPage />} />}
        <Route element={<KitPage />}>
          {reservations && <Route path="boka-bord" element={<BookingFlow />} />}
          {reservations && <Route path="bokningsvillkor" element={<BookingTermsPage />} />}
          <Route path="bokning/:locationId/:reservationId" element={<ManageBooking />} />
          <Route path="bestall" element={<Bestall order={ordering ? <OrderFlow /> : null} kassan={<Kassan />} />} />
          <Route path="bestallning/:locationId/:orderId" element={<OrderStatus />} />
          {cateringLive && <Route path="catering" element={<CateringFlow />} />}
          <Route path="catering/:locationId/:requestId" element={<CateringRequest />} />
          {giftCards && <Route path="presentkort" element={<GiftCards />} />}
          {giftCards && <Route path="presentkort/saldo" element={<GiftCardBalance />} />}
          {queue && <Route path="ko" element={<Queue />} />}
          {events && <Route path="evenemang" element={<Events />} />}
          {events && <Route path="evenemang/:eventId" element={<EventDetail />} />}
          {events && <Route path="biljett" element={<Tickets />} />}
          {events && <Route path="biljett/ta-emot" element={<TicketReceive />} />}
          <Route path="integritetspolicy" element={<PrivacyPolicy />} />
          <Route path="cookies" element={<CookiePolicy />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

/** /bestall: en gammal QR-kod från ett bord leder till kassan; annars avhämtning (med beställning i planen). */
function Bestall({ order, kassan }: { order: ReactNode; kassan: ReactNode }) {
  const { search } = useLocation()
  if (isTableQrLink(search)) return kassan
  return order ?? <Navigate to="/" replace />
}

export default App
