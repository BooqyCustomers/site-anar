import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  DEFAULT_CATEGORIES,
  DateInput,
  FlowSteps,
  MarketingConsent,
  PhoneInput,
  PhoneLink,
  SkelCard,
  TimeInput,
  cateringApi,
  consentFields,
  formatPhoneNational,
  getPublicMenuWithCategories,
  isApiConfigured,
  useLocationInfo,
  useSite,
  useStickyCart,
} from '@bookingsystemadvancedorg/site-kit'
import MenuPicker from './MenuPicker'
import { INITIAL_FORM, NOTES_MAX, STEPS, currentStep, detailsDone, guestError, hasAddress, validate, whenWhereDone } from './form'
import type { FormState } from './form'
import { DELAYS, QUICK_DELAY, dishesDone, guestsDone, partsDone } from './guidedFlow'
import type { StepId, TargetId } from './guidedFlow'
import { useGuidedScroll } from './useGuidedScroll'
import { ESTIMATE_NOTE, EMPTY_CHOICE, approxOre, breakdown, buildUnits, hasAutoQuantities, quantities, selectionFields } from './selection'
import type { Choice, Unit } from './selection'
import '../styles/catering-builder.css'

/**
 * Cateringformuläret på /catering: samma flöde, samma API och samma fält som
 * kitets formulär (site-kit CateringPage), men gästen kryssar i vad de vill ha
 * i stället för att skriva antal per rätt. Mängden per rätt räknas ut åt dem
 * (selection.ts) och kalkylen visar en ungefärlig siffra. Offerten, signeringen
 * och betalningen efteråt är kitets (/catering/:plats/:id).
 *
 * Tills kitet har ett eget kryssval ligger detta här. Kitet vet bara
 * "antal per rätt", så formuläret måste dubbleras; flytta det till kitet
 * (och ta bort det här) när Booqy lagt in det.
 */

const QUOTE_DEBOUNCE_MS = 350
const EMPTY_MENU: cateringApi.CateringMenu = { dishes: [], packages: [] }
const ERROR_ID = 'catering-error'
const kr = (ore: number | undefined) => cateringApi.kronor(ore)

/** Vilket steg ett fält hör till: ändras det kan sidan gå vidare från det steget (useGuidedScroll.ts). */
const STEP_OF: Partial<Record<keyof FormState, StepId>> = {
  guests: 'guests',
  fulfilment: 'when',
  deliveryDate: 'when',
  deliveryTime: 'when',
  street: 'when',
  postalCode: 'when',
  city: 'when',
  equipmentReturn: 'when',
  customerType: 'details',
  name: 'details',
  email: 'details',
  phone: 'details',
  companyName: 'details',
  orgNumber: 'details',
  invoiceReference: 'details',
  signatoryName: 'details',
  signatoryRole: 'details',
  signatoryAuthority: 'details',
}
/** Val med en knapp (inte text som skrivs): sidan väntar kortare. */
const QUICK_FIELDS: ReadonlySet<keyof FormState> = new Set(['fulfilment', 'equipmentReturn', 'customerType', 'signatoryAuthority'])

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <li>
      <span className="cart-item-name">{label}</span>
      <span />
      <span className="cart-item-price">{value}</span>
    </li>
  )
}

export default function CateringBuilder() {
  const navigate = useNavigate()
  const { config, location } = useSite()
  const info = useLocationInfo()
  const locationId = location.locationId
  const phoneText = info.phone ? formatPhoneNational(info.phone) : undefined
  const cartRef = useStickyCart<HTMLElement>()
  const whenRef = useRef<HTMLElement>(null)
  const detailsRef = useRef<HTMLElement>(null)
  // Kalkylen är sidans sista del (dit sidan rullar när allt är ifyllt); kitets ref för den klistrade kolumnen får den också.
  const cartEl = useRef<HTMLElement | null>(null)
  const setCart = useCallback(
    (el: HTMLElement | null) => {
      cartEl.current = el
      cartRef(el)
    },
    [cartRef],
  )

  const [settings, setSettings] = useState<cateringApi.CateringSettings | null>(null)
  const [tiers, setTiers] = useState<cateringApi.Tier[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loadFailed, setLoadFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [choice, setChoice] = useState<Choice>(EMPTY_CHOICE)
  const [result, setResult] = useState<{ key: string; quote: cateringApi.Quote | null; error: string | null } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [problemField, setProblemField] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isApiConfigured()) return
    let cancelled = false
    Promise.all([
      cateringApi.getSettings(locationId),
      cateringApi.getTiers(locationId),
      cateringApi.getCateringMenu(locationId).catch(() => EMPTY_MENU),
    ])
      .then(async ([s, t, menu]) => {
        const hasMenu = menu.dishes.length > 0 || menu.packages.length > 0
        // Vanliga menyn ger rättens sort och foto. Utan cateringmeny är den själva valet, och då är ett fel ett fel.
        const regular = await getPublicMenuWithCategories(locationId).catch((err: unknown) => {
          if (!hasMenu) throw err
          return { items: [], categories: DEFAULT_CATEGORIES }
        })
        if (cancelled) return
        setSettings(s)
        setTiers(t)
        setUnits(buildUnits(menu, regular))
        setForm((f) => ({ ...f, deliveryDate: f.deliveryDate || cateringApi.firstDate(s.advanceDays), fulfilment: s.delivery ? 'delivery' : 'pickup' }))
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [locationId, attempt])

  const field = (name: string, hint?: string) => ({
    id: `catering-${name}`,
    'aria-invalid': problemField === name || undefined,
    'aria-describedby': problemField === name ? ERROR_ID : hint,
  })

  const minGuests = settings?.minGuests ?? 1
  const guests = Number(form.guests) || 0
  const qty = quantities(units, choice, guests)
  const selected = qty.size
  const fields = guests >= minGuests ? selectionFields(units, qty, guests) : null
  const address = form.fulfilment === 'delivery' && hasAddress(form) ? { street: form.street.trim(), postalCode: form.postalCode.trim(), city: form.city.trim() } : undefined
  const payload: cateringApi.QuoteInput | null = fields
    ? {
        ...fields,
        fulfilment: form.fulfilment,
        ...(address ? { deliveryAddress: address } : {}),
        ...(form.equipmentReturn ? { equipmentReturn: form.equipmentReturn } : {}),
        ...(/^\d{4}-\d{2}-\d{2}$/.test(form.deliveryDate) ? { deliveryDate: form.deliveryDate } : {}),
      }
    : null
  const payloadKey = payload ? JSON.stringify(payload) : ''

  // Priset räknas alltid av servern (en enda källa), med en kort paus medan gästen skriver.
  useEffect(() => {
    if (!payloadKey) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      cateringApi
        .getQuote(locationId, JSON.parse(payloadKey) as cateringApi.QuoteInput)
        .then((q) => {
          if (cancelled) return
          setResult({ key: payloadKey, quote: q, error: null })
          setForm((f) => (f.deliveryDate && f.deliveryDate < q.earliestDate ? { ...f, deliveryDate: q.earliestDate } : f))
        })
        .catch((err: unknown) => {
          if (!cancelled) setResult({ key: payloadKey, quote: null, error: guestError(err, phoneText) })
        })
    }, QUOTE_DEBOUNCE_MS)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [locationId, payloadKey, phoneText])

  // Valet har tömts: den gamla kalkylen hör inte till något val längre. Annars visas den
  // förra kalkylen nedtonad medan en ny hämtas (resultatet bär nyckeln till det val det gäller).
  if (!payloadKey && result) setResult(null)
  const quote = result?.quote ?? null
  const quoteError = result?.error ?? null
  const quoting = Boolean(payloadKey) && result?.key !== payloadKey

  const earliest = quote?.earliestDate ?? cateringApi.firstDate(settings?.advanceDays ?? 0)
  const latest = cateringApi.firstDate(365)
  const ready = selected > 0 && guests >= minGuests
  const nextTier = cateringApi.nextTier(tiers, guests)
  const split = quote ? breakdown(units, quote.lines) : null

  // Sidan går vidare av sig själv när ett steg är klart: antal gäster, delar av menyn, rätter, När och var, Dina uppgifter
  // och sist Kalkylen med Skicka (useGuidedScroll.ts). Hooken ligger före de tidiga returerna nedan.
  const done: Record<StepId, boolean> = {
    guests: guestsDone(guests, minGuests),
    parts: partsDone(units, choice),
    dishes: dishesDone(units, choice),
    when: whenWhereDone(form),
    details: detailsDone(form),
  }
  const { touch, advance } = useGuidedScroll(done, (target: TargetId) => {
    switch (target) {
      case 'parts':
        return document.getElementById('cb-want')
      case 'dishes':
        return document.getElementById('cb-browse')
      case 'when':
        return whenRef.current
      case 'details':
        return detailsRef.current
      default:
        return cartEl.current
    }
  })

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setMessage(null)
    setProblemField(null)
    const step = STEP_OF[key]
    if (step) touch(step, QUICK_FIELDS.has(key) ? QUICK_DELAY : DELAYS[step])
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!settings) return
    const problem = validate(form, { guests, minGuests, selected, dates: { min: earliest, max: latest } })
    if (problem) {
      setMessage(problem.message)
      setProblemField(problem.field)
      if (problem.field) document.getElementById(`catering-${problem.field}`)?.focus()
      return
    }
    if (!form.equipmentReturn || !payload) return
    setBusy(true)
    try {
      const notes = [form.notes.trim(), hasAutoQuantities(units, qty) ? ESTIMATE_NOTE : ''].filter(Boolean).join('\n\n')
      const created = await cateringApi.createRequest(locationId, {
        ...payload,
        customerType: form.customerType,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        ...(form.customerType === 'company'
          ? {
              companyName: form.companyName.trim(),
              orgNumber: form.orgNumber.trim(),
              signatoryName: form.signatoryName.trim(),
              signatoryRole: form.signatoryRole.trim(),
              signatoryAuthority: true as const,
              ...(form.invoiceReference.trim() ? { invoiceReference: form.invoiceReference.trim() } : {}),
            }
          : {}),
        deliveryDate: form.deliveryDate,
        deliveryTime: form.deliveryTime,
        equipmentReturn: form.equipmentReturn,
        ...(notes ? { notes } : {}),
        acceptTerms: true,
        language: 'sv',
        ...consentFields(form.consent, config.privacy, Boolean(config.tenant.features.marketing)),
      })
      cateringApi.rememberToken(created.requestId, created.token)
      navigate(`/catering/${created.locationId}/${created.requestId}?skickad=1`)
    } catch (err) {
      setMessage(guestError(err, phoneText))
    } finally {
      setBusy(false)
    }
  }

  if (loadFailed) {
    return (
      <section className="page-hero page-prose catering-load-error" data-bq-theme="restaurant">
        <h1>Catering</h1>
        <p role="alert">
          {`Cateringformuläret kunde inte laddas. Försök igen, eller ring ${info.name}`}
          {info.phone ? (
            <>
              {' '}
              på <PhoneLink phone={info.phone} />
            </>
          ) : null}
          .
        </p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setLoadFailed(false)
            setAttempt((a) => a + 1)
          }}
        >
          Försök igen
        </button>
      </section>
    )
  }
  if (!settings) return <SkelCard label="Hämtar cateringmenyn" lines={6} />
  if (!settings.enabled) {
    return (
      <p className="notice" role="status">
        {`${config.tenant.name} tar inte emot cateringförfrågningar just nu.`}
      </p>
    )
  }

  const delivery = form.fulfilment === 'delivery'

  return (
    <>
      <section className="page-hero">
        <p className="hero-kicker">Catering</p>
        <h1>Räkna på catering</h1>
        <p className="hero-sub">Välj vad du vill ha och se ett ungefärligt pris direkt. Du får en offert som du godkänner med BankID.</p>
        <FlowSteps steps={STEPS} current={currentStep(form, ready)} label="Catering" />
      </section>
      <form className="order-layout cb-form" onSubmit={submit} noValidate>
        <div className="order-menu">
          <h2 className="catering-step-title">1. Antal gäster och meny</h2>
          <div className="booking-grid catering-guests">
            <label className="booking-field">
              Antal gäster
              <input
                inputMode="numeric"
                value={form.guests}
                {...field('guests', 'catering-guest-hint')}
                onChange={(e) => update('guests', e.target.value.replace(/\D/g, '').slice(0, 4))}
                // Enter går vidare till menyn i stället för att skicka formuläret; lämnas fältet går sidan vidare strax.
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  if (done.guests) advance('guests')
                  else {
                    setMessage(guests ? `Minst ${minGuests} gäster.` : 'Fyll i antal gäster.')
                    setProblemField('guests')
                  }
                }}
                onBlur={() => touch('guests', QUICK_DELAY / 2)}
              />
            </label>
          </div>
          <p className="order-hint" id="catering-guest-hint">
            {`Minst ${minGuests} gäster${tiers.length > 0 ? ` · rabatt från ${Math.min(...tiers.map((t) => t.fromPortions))} gäster` : ''} · förberedelsetiden beror på antalet gäster`}
          </p>
          <p className="cb-intro">
            Förrätt, varmrätt och efterrätt behöver inget antal: mängden räknas ut åt dig och du ser ett ungefärligt pris. Restaurangen skickar sedan en offert som du kan be att få ändrad innan du godkänner den.
          </p>
          <MenuPicker
            units={units}
            choice={choice}
            guests={guests}
            onChange={(c) => {
              touch(c.wanted !== choice.wanted ? 'parts' : 'dishes')
              setChoice(c)
              setMessage(null)
              setProblemField(null)
            }}
          />
          {ready && (
            <button type="button" className="btn-secondary cb-next" onClick={() => advance('dishes')}>
              Gå vidare till När och var
            </button>
          )}
          {!ready ? (
            <p className="notice catering-next" role="status">
              Fyll i antal gäster och välj vad du vill ha. Därefter anger du datum, leverans och dina uppgifter.
            </p>
          ) : (
            <>
              <section className="catering-details" aria-label="När och var" ref={whenRef}>
                <h2 className="catering-step-title">2. När och var</h2>
                {settings.pickup && settings.delivery && (
                  <div className="segmented" role="radiogroup" aria-label="Avhämtning eller leverans">
                    {(['delivery', 'pickup'] as const).map((v) => (
                      <label key={v} className={form.fulfilment === v ? 'on' : ''}>
                        <input type="radio" name="fulfilment" checked={form.fulfilment === v} onChange={() => update('fulfilment', v)} />
                        {v === 'delivery' ? 'Leverans' : 'Avhämtning'}
                      </label>
                    ))}
                  </div>
                )}
                <div className="booking-grid">
                  <label className="booking-field">
                    Datum
                    <DateInput min={earliest} max={latest} value={form.deliveryDate} {...field('deliveryDate')} onChange={(e) => update('deliveryDate', e.target.value)} />
                  </label>
                  <label className="booking-field">
                    Tid
                    <TimeInput value={form.deliveryTime} {...field('deliveryTime')} onChange={(e) => update('deliveryTime', e.target.value)} />
                  </label>
                </div>
                {quote && (
                  <p className="order-hint">
                    {`Tidigast möjliga datum: ${new Date(`${quote.earliestDate}T12:00:00Z`).toLocaleDateString('sv-SE', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      timeZone: 'Europe/Stockholm',
                    })}.`}
                  </p>
                )}
                {delivery && (
                  <>
                    <div className="booking-grid">
                      <label className="booking-field">
                        Gatuadress
                        <input autoComplete="street-address" value={form.street} {...field('street')} onChange={(e) => update('street', e.target.value)} />
                      </label>
                      <label className="booking-field">
                        Postnummer
                        <input autoComplete="postal-code" inputMode="numeric" value={form.postalCode} {...field('postalCode')} onChange={(e) => update('postalCode', e.target.value)} />
                      </label>
                      <label className="booking-field">
                        Ort
                        <input autoComplete="address-level2" value={form.city} {...field('city')} onChange={(e) => update('city', e.target.value)} />
                      </label>
                    </div>
                    <p className="order-hint">Leveranspriset räknas på vägavståndet från restaurangen.</p>
                  </>
                )}
                <fieldset className="equipment-return">
                  <legend>Hur lämnas fat och utrustning tillbaka?</legend>
                  {(['cleaned', 'not_cleaned'] as const).map((v, i) => (
                    <label key={v} className={`booking-check${form.equipmentReturn === v ? ' on' : ''}`}>
                      <input
                        type="radio"
                        name="equipmentReturn"
                        value={v}
                        checked={form.equipmentReturn === v}
                        {...(i === 0 ? field('equipmentReturn') : { 'aria-invalid': problemField === 'equipmentReturn' || undefined })}
                        onChange={() => update('equipmentReturn', v)}
                      />
                      <span>
                        {v === 'cleaned' ? 'Rengjord utrustning (ingen extra kostnad)' : 'Ej rengjord utrustning (rengöringsavgift tillkommer)'}
                        {v === 'not_cleaned' && (settings.cleaningFee ?? 0) > 0 && <span className="equipment-return-fee">{kr((settings.cleaningFee ?? 0) * 100)}</span>}
                      </span>
                    </label>
                  ))}
                </fieldset>
              </section>
              <section className="catering-details" aria-label="Dina uppgifter" ref={detailsRef}>
                <h2 className="catering-step-title">3. Dina uppgifter</h2>
                <div className="segmented" role="radiogroup" aria-label="Beställare">
                  <label className={form.customerType === 'private' ? 'on' : ''}>
                    <input type="radio" name="customerType" checked={form.customerType === 'private'} onChange={() => update('customerType', 'private')} />
                    Privatperson
                  </label>
                  <label className={form.customerType === 'company' ? 'on' : ''}>
                    <input type="radio" name="customerType" checked={form.customerType === 'company'} onChange={() => update('customerType', 'company')} />
                    Företag
                  </label>
                </div>
                <p className="cell-muted">
                  {form.customerType === 'private'
                    ? 'Du betalar med kort eller Swish efter att du godkänt offerten.'
                    : `Ni får en faktura med ${settings.paymentTermsDays} dagars betalningsvillkor.`}
                </p>
                <div className="booking-grid">
                  {form.customerType === 'company' && (
                    <>
                      <label className="booking-field">
                        Företag
                        <input autoComplete="organization" value={form.companyName} {...field('companyName')} onChange={(e) => update('companyName', e.target.value)} />
                      </label>
                      <label className="booking-field">
                        Organisationsnummer
                        <input placeholder="556677-8899" value={form.orgNumber} {...field('orgNumber')} onChange={(e) => update('orgNumber', e.target.value)} />
                      </label>
                      <label className="booking-field">
                        Fakturareferens (valfritt)
                        <input value={form.invoiceReference} onChange={(e) => update('invoiceReference', e.target.value)} />
                      </label>
                      <label className="booking-field">
                        Den som signerar
                        <input autoComplete="name" value={form.signatoryName} {...field('signatoryName')} onChange={(e) => update('signatoryName', e.target.value)} />
                      </label>
                      <label className="booking-field">
                        Roll (t.ex. VD, inköpare)
                        <input autoComplete="organization-title" value={form.signatoryRole} {...field('signatoryRole')} onChange={(e) => update('signatoryRole', e.target.value)} />
                      </label>
                      <label className="booking-check booking-field--wide">
                        <input type="checkbox" checked={form.signatoryAuthority} {...field('signatoryAuthority')} onChange={(e) => update('signatoryAuthority', e.target.checked)} />
                        <span>Jag intygar att den som signerar har rätt att teckna avtal för företaget.</span>
                      </label>
                    </>
                  )}
                  <label className="booking-field">
                    {form.customerType === 'company' ? 'Kontaktperson' : 'Namn'}
                    <input autoComplete="name" value={form.name} {...field('name')} onChange={(e) => update('name', e.target.value)} />
                  </label>
                  <label className="booking-field">
                    E-post
                    <input type="email" autoComplete="email" value={form.email} {...field('email')} onChange={(e) => update('email', e.target.value)} />
                  </label>
                  <label className="booking-field">
                    Mobilnummer
                    <PhoneInput value={form.phone} {...field('phone')} onChange={(v) => update('phone', v)} />
                  </label>
                  <label className="booking-field booking-field--wide">
                    Önskemål, allergier, servering (valfritt)
                    <textarea rows={3} maxLength={NOTES_MAX} value={form.notes} onChange={(e) => update('notes', e.target.value)} />
                  </label>
                </div>
              </section>
            </>
          )}
        </div>
        <aside className="order-cart" ref={setCart} aria-label="Kalkyl" aria-busy={quoting}>
          {/* Rubriken och antalet är två textnoder: "Kalkyl · 30 gäster" i ett stycke blev "Calculus" i översättningen, ensamt "Kalkyl" blir "Estimate". */}
          <h2>
            <span>Kalkyl</span>
            {guests > 0 && <span>{` · ${guests} gäster`}</span>}
          </h2>
          {quote && split ? (
            <>
              <ul className={`cart-list${quoting ? ' is-stale' : ''}`}>
                {split.foodOre > 0 && <SumRow label="Mat" value={`ca ${kr(approxOre(split.foodOre))}`} />}
                {split.drinkOre > 0 && <SumRow label="Dryck" value={`ca ${kr(approxOre(split.drinkOre))}`} />}
                {quote.discount > 0 && (
                  <SumRow
                    label={['Rabatt', quote.tierName, `(-${quote.discountPercent} %)`].filter(Boolean).join(' ')}
                    value={`ca -${kr(approxOre(quote.discount))}`}
                  />
                )}
                {delivery && (
                  <SumRow
                    label={`Leverans${quote.distanceKm != null ? ` (${String(quote.distanceKm).replace('.', ',')} km)` : ''}`}
                    value={quote.deliveryFeeManual ? (address ? 'Sätts i offerten' : 'Ange adress') : kr(quote.deliveryFee)}
                  />
                )}
                {(quote.cleaningFee ?? 0) > 0 && <SumRow label="Rengöringsavgift" value={kr(quote.cleaningFee)} />}
              </ul>
              <div className="cart-total">
                <span>Uppskattat pris inkl. moms</span>
                <span>ca {kr(approxOre(quote.total))}</span>
              </div>
              <p className="cart-note">
                {`Varav moms${quote.vatRate ? ` ${quote.vatRate} %` : ''}: ca ${kr(approxOre(quote.vat))}`}
              </p>
            </>
          ) : (
            !quoteError && (
              <p className="cart-empty" role="status">
                {payload ? 'Räknar…' : `Fyll i antal gäster (minst ${minGuests}) och välj vad du vill ha.`}
              </p>
            )
          )}
          {quoteError && (
            <p className="notice error" role="alert">
              {quoteError}
            </p>
          )}
          {nextTier && guests >= minGuests && (
            <p className="cart-note">
              {`${nextTier.fromPortions - guests} gäster till ger ${nextTier.discountPercent} % rabatt.`}
            </p>
          )}
          <p className="cart-note catering-estimate">Uppskattat pris. Mängden för varje maträtt räknas ut åt dig, och priset är bindande först när offerten signerats.</p>
          <label className="booking-check">
            <input type="checkbox" checked={form.accept} {...field('accept')} onChange={(e) => update('accept', e.target.checked)} />
            <span>Jag godkänner att restaurangen kontaktar mig om förfrågan.</span>
          </label>
          <MarketingConsent value={form.consent} onChange={(v) => update('consent', v)} />
          {/* Kort rad i stället för kitets långa text: hur uppgifterna används, hur länge de sparas och vem som ansvarar står i integritetspolicyn (en popup, LegalPopups). Två textnoder och en länk: en mening delad på flera noder översätts inte. */}
          <p className="guest-notice">
            Vill du veta hur vi använder dina kontaktuppgifter? <Link to="/integritetspolicy">Läs integritetspolicyn</Link>
          </p>
          {message && (
            <p className="notice error" role="alert" id={ERROR_ID}>
              {message}
            </p>
          )}
          <button type="submit" className={`btn-primary${busy ? ' is-busy' : ''}`} disabled={busy || selected === 0}>
            {busy ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Skickar förfrågan…
              </>
            ) : (
              'Skicka förfrågan'
            )}
          </button>
        </aside>
      </form>
    </>
  )
}
