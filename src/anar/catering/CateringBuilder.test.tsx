import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SiteProvider, cateringApi, configureSiteKit } from '@bookingsystemadvancedorg/site-kit'
import { LOCATION_ID, json, siteConfig } from '@bookingsystemadvancedorg/site-kit/testing'
import CateringBuilder from './CateringBuilder'
import { ESTIMATE_NOTE } from './selection'

const settings = {
  enabled: true, minPortions: 10, maxPortions: 300, advanceDays: 5, pickup: true, delivery: true, deliveryArea: 'Linköping',
  maxDistanceKm: 25, priceWithinLimit: 395, priceBeyondLimit: 395, allowOutsideArea: false, cleaningFee: 300, terms: '',
  offerValidDays: 7, paymentTermsDays: 30, minGuests: 15,
}
const PRICES: Record<string, [string, number]> = {
  d1: ['Burrata', 135], d2: ['Toast Skagen', 145], d3: ['Grillad lax', 245], d4: ['Kladdkaka', 95], d5: ['Äppelmust', 45], d6: ['Lättöl', 45],
}
const cateringMenu = { packages: [], dishes: Object.entries(PRICES).map(([dishId, [name, pricePerPortion]]) => ({ dishId, name, pricePerPortion })) }
const CATEGORY_OF: Record<string, string> = { d1: 'starters', d2: 'starters', d3: 'mains', d4: 'desserts', d5: 'drinks', d6: 'drinks' }
const regularMenu = {
  items: Object.entries(PRICES).map(([id, [name, price]]) => ({ menuItemId: `m-${id}`, name, description: '', price, category: CATEGORY_OF[id], imageKey: null })),
  categories: [
    { categoryId: 'starters', name: 'Förrätter' }, { categoryId: 'mains', name: 'Varmrätter' },
    { categoryId: 'desserts', name: 'Efterrätter' }, { categoryId: 'drinks', name: 'Drycker' },
  ],
}

type Body = { guests: number; dishes?: { dishId: string; quantity: number }[]; [key: string]: unknown }
let fetchMock: ReturnType<typeof vi.fn>

/** Servern i miniatyr: räknar priset som den riktiga (öre) och nekar över 300 portioner. */
function quoteFor(body: Body) {
  const lines = (body.dishes ?? []).map((d) => ({ kind: 'dish', dishId: d.dishId, name: PRICES[d.dishId][0], unitPrice: PRICES[d.dishId][1] * 100, quantity: d.quantity }))
  const portions = lines.reduce((n, l) => n + l.quantity, 0)
  if (portions > 300) return json({ error: 'at most 300 portions', code: 'invalid_request' }, 400)
  const subtotal = lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0)
  const deliveryFee = body.fulfilment === 'delivery' ? 39500 : 0
  const total = subtotal + deliveryFee
  return json({
    lines, guests: body.guests, portions, tierName: null, subtotal, discountPercent: 0, discount: 0, deliveryFee, total,
    vat: Math.round((total * 12) / 112), vatRate: 12, serviceIncluded: true, distanceKm: 4.2, deliveryFeeManual: false, earliestDate: '2026-11-25',
  })
}

const posts = (suffix: string) =>
  fetchMock.mock.calls.filter(([url, init]) => String(url).endsWith(suffix) && init?.method === 'POST').map(([, init]) => JSON.parse(String(init.body)) as Body)
const lastQuote = () => posts('/catering/quote').at(-1)

beforeEach(() => {
  window.history.replaceState(null, '', '/?restaurang=testkrogen')
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes('/site-config')) return json(siteConfig())
    if (url.endsWith('/catering/settings')) return json(settings)
    if (url.endsWith('/catering/menu')) return json(cateringMenu)
    if (url.endsWith('/catering/discount-tiers')) return json({ tiers: [] })
    if (url.endsWith('/catering/quote')) return quoteFor(JSON.parse(String(init?.body)))
    if (url.endsWith('/catering/requests')) return json({ requestId: 'r1', locationId: LOCATION_ID, token: 'tok' }, 201)
    if (url.endsWith('/menu')) return json(regularMenu)
    return json({})
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  configureSiteKit({ apiBaseUrl: 'https://api.test', menuImageBaseUrl: undefined })
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

function renderBuilder() {
  return render(
    <MemoryRouter initialEntries={['/catering']}>
      <SiteProvider>
        <Routes>
          <Route path="catering" element={<CateringBuilder />} />
          <Route path="catering/:locationId/:requestId" element={<p>Gästens sida</p>} />
        </Routes>
      </SiteProvider>
    </MemoryRouter>,
  )
}

const flat = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim()
/** Kalkylens rader som gästen läser dem: namn och belopp med ett mellanrum. */
const rowsOf = (el: HTMLElement) => [...el.querySelectorAll('li, .cart-total')].map((r) => flat([...r.children].map((c) => c.textContent).join(' ')))
const GROUP_OF: Record<string, string> = {
  Burrata: 'Förrätter', 'Toast Skagen': 'Förrätter', 'Grillad lax': 'Varmrätter', Kladdkaka: 'Efterrätter', Äppelmust: 'Drycker', Lättöl: 'Drycker',
}
type User = ReturnType<typeof userEvent.setup>
/** Gästens val av en del av menyn: kryssar delen (om den inte redan är vald) och öppnar dess flik. */
async function openGroup(user: User, group: string) {
  const chip = screen.getByRole('checkbox', { name: group }) as HTMLInputElement
  if (!chip.checked) await user.click(chip)
  const tab = screen.getByRole('tab', { name: new RegExp(`^${group}`) })
  if (tab.getAttribute('aria-selected') !== 'true') await user.click(tab)
}
/** Väljer rätternas delar av menyn, öppnar flikarna och kryssar rätterna. */
async function tick(user: User, ...names: string[]) {
  for (const name of names) {
    await openGroup(user, GROUP_OF[name])
    await user.click(screen.getByRole('checkbox', { name }))
  }
}

async function openWith30Guests() {
  const user = userEvent.setup()
  const view = renderBuilder()
  await user.type(await screen.findByLabelText('Antal gäster'), '30')
  return { user, ...view }
}

describe('Catering: tick what you want', () => {
  it('asks first which parts of the menu the guest wants, and shows no dishes before that', async () => {
    const { container } = await openWith30Guests()
    for (const name of ['Förrätter', 'Varmrätter', 'Efterrätter', 'Drycker']) expect(screen.getByRole('checkbox', { name })).not.toBeChecked()
    expect(screen.getByRole('heading', { name: 'Vad vill du ha?' })).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Burrata' })).not.toBeInTheDocument()
    expect(container.querySelectorAll('input[type="number"]')).toHaveLength(0)
  })

  it('opens a part when it is chosen and closes the others: one group at a time, with no quantity field to fill in', async () => {
    const { user, container } = await openWith30Guests()
    await openGroup(user, 'Förrätter')
    expect(screen.getByRole('tab', { name: 'Förrätter' })).toHaveAttribute('aria-selected', 'true')
    expect(within(screen.getByRole('tabpanel', { name: 'Förrätter' })).getAllByRole('checkbox')).toHaveLength(2)

    // väljs varmrätt öppnas den, och förrätterna stängs (kvar i sidan men dolda)
    await openGroup(user, 'Varmrätter')
    expect(screen.getAllByRole('tab')).toHaveLength(2)
    expect(screen.getByRole('tab', { name: 'Varmrätter' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('checkbox', { name: 'Grillad lax' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Burrata' })).not.toBeInTheDocument()
    expect(container.querySelectorAll('[role="tabpanel"][hidden]')).toHaveLength(1)

    // och med ett klick på fliken är det tvärtom
    await user.click(screen.getByRole('tab', { name: 'Förrätter' }))
    expect(screen.getByRole('checkbox', { name: 'Burrata' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Grillad lax' })).not.toBeInTheDocument()
    expect(container.querySelectorAll('input[type="number"]')).toHaveLength(0)
  })

  it('shows how many are picked in each tab, and keeps the picks when a part is unticked and ticked again', async () => {
    const { user } = await openWith30Guests()
    await tick(user, 'Burrata', 'Toast Skagen')
    await waitFor(() => expect(lastQuote()?.dishes?.length).toBe(2), { timeout: 3000 })
    expect(screen.getByRole('tab', { name: 'Förrätter Valda: 2' })).toBeInTheDocument()

    // förrätt bort: fliken och kalkylens innehåll försvinner, rätterna ligger kvar bakom kulisserna
    await user.click(screen.getByRole('checkbox', { name: 'Förrätter' }))
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.getByText(/Fyll i antal gäster och välj vad du vill ha/)).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Förrätter' }))
    expect(screen.getByRole('checkbox', { name: 'Burrata' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Toast Skagen' })).toBeChecked()
    expect(screen.getByRole('tab', { name: 'Förrätter Valda: 2' })).toBeInTheDocument()
  })

  it('moves between the tabs with the arrow keys', async () => {
    const { user } = await openWith30Guests()
    await openGroup(user, 'Förrätter')
    await openGroup(user, 'Efterrätter')
    await user.click(screen.getByRole('tab', { name: 'Förrätter' }))
    screen.getByRole('tab', { name: 'Förrätter' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Efterrätter' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Efterrätter' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Förrätter' })).toHaveFocus() // runt
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Efterrätter' })).toHaveFocus()
  })

  it('works out the quantities itself: starters share the guests, 1 per guest for main, dessert and each drink', async () => {
    const { user } = await openWith30Guests()
    await tick(user, 'Burrata', 'Toast Skagen', 'Grillad lax', 'Kladdkaka', 'Äppelmust', 'Lättöl')

    await waitFor(() => expect(lastQuote()?.dishes?.length).toBe(6), { timeout: 3000 })
    const q = Object.fromEntries(lastQuote()!.dishes!.map((d) => [d.dishId, d.quantity]))
    expect(q).toEqual({ d1: 15, d2: 15, d3: 30, d4: 30, d5: 30, d6: 30 })
    expect(lastQuote()!.guests).toBe(30)
  })

  it('shows an approximate price, split in food and drink, and never the quantity per dish', async () => {
    const { user } = await openWith30Guests()
    await tick(user, 'Burrata', 'Toast Skagen', 'Grillad lax', 'Kladdkaka', 'Äppelmust', 'Lättöl')

    const cart = screen.getByRole('complementary', { name: 'Kalkyl' })
    await waitFor(() => expect(flat(cart.textContent)).toContain('ca 17 500 kr'), { timeout: 3000 })
    // mat 14 400 kr och dryck 2 700 kr avrundade till 100 kr, leverans 395 kr exakt
    expect(rowsOf(cart)).toEqual(['Mat ca 14 400 kr', 'Dryck ca 2 700 kr', 'Leverans (4,2 km) 395 kr', 'Uppskattat pris inkl. moms ca 17 500 kr'])
    expect(flat(cart.textContent)).not.toMatch(/\d+ × /)
    expect(flat(cart.textContent)).not.toContain('Burrata')
  })

  it('drinks: one per guest of each, or the guest decides how many of each', async () => {
    const { user } = await openWith30Guests()
    await tick(user, 'Grillad lax', 'Äppelmust', 'Lättöl')

    // en per gäst av varje är förvalt, och antalet syns vid varje dryck
    expect(screen.getByRole('radio', { name: 'En per gäst av varje' })).toBeChecked()
    expect(screen.getByText('En per gäst av varje vald dryck.')).toBeInTheDocument()
    expect(screen.getAllByText('× 30')).toHaveLength(2)

    await user.click(screen.getByRole('radio', { name: 'Jag väljer antal själv' }))
    const must = screen.getByLabelText('Antal Äppelmust')
    expect(must).toHaveValue(30)
    await user.clear(must)
    await user.type(must, '12')

    await waitFor(() => {
      const q = Object.fromEntries((lastQuote()?.dishes ?? []).map((d) => [d.dishId, d.quantity]))
      expect(q).toEqual({ d3: 30, d5: 12, d6: 30 })
    }, { timeout: 3000 })
  })

  it('has no drink choice until a drink is ticked', async () => {
    await openWith30Guests()
    expect(screen.queryByRole('radiogroup', { name: 'Hur många av varje dryck?' })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'En per gäst av varje' })).not.toBeInTheDocument()
  })

  it('shows the next steps only when there are guests and something ticked', async () => {
    const { user } = await openWith30Guests()
    expect(screen.queryByRole('heading', { name: '2. När och var' })).not.toBeInTheDocument()
    expect(screen.getByText(/Fyll i antal gäster och välj vad du vill ha/)).toBeInTheDocument()
    await tick(user, 'Grillad lax')
    expect(await screen.findByRole('heading', { name: '2. När och var' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '3. Dina uppgifter' })).toBeInTheDocument()
  })

  it('explains in words a guest follows when the choice is too big for one request', async () => {
    const user = userEvent.setup()
    renderBuilder()
    await user.type(await screen.findByLabelText('Antal gäster'), '100')
    await tick(user, 'Burrata', 'Grillad lax', 'Kladdkaka', 'Äppelmust', 'Lättöl')

    // 5 x 100 = 500 portioner, tak 300
    const alert = await screen.findByText(/högst 300 portioner/, undefined, { timeout: 3000 })
    expect(alert).toHaveAttribute('role', 'alert')
    expect(alert.textContent).toContain('varje dryck räknas som en portion')
  })

  it('does not send anything and says what is missing when the form is incomplete', async () => {
    const { user } = await openWith30Guests()
    await tick(user, 'Grillad lax')
    await user.click(await screen.findByRole('button', { name: 'Skicka förfrågan' }))

    expect(await screen.findByText('Fyll i leveransadressen (gata, postnummer och ort).')).toBeInTheDocument()
    expect(posts('/catering/requests')).toHaveLength(0)
  })

  it('has one short line about the contact details, with a link to the privacy policy, instead of the long notice', async () => {
    await openWith30Guests()
    expect(screen.getByText(/Vill du veta hur vi använder dina kontaktuppgifter/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Läs integritetspolicyn' })).toHaveAttribute('href', '/integritetspolicy')
    expect(screen.queryByText(/personuppgiftsansvarig/)).not.toBeInTheDocument()
  })

  it('keeps the consent boxes unticked and sends the request with the computed quantities and a note about them', async () => {
    const { user } = await openWith30Guests()
    await tick(user, 'Burrata', 'Toast Skagen', 'Grillad lax', 'Äppelmust')

    const accept = await screen.findByRole('checkbox', { name: 'Jag godkänner att restaurangen kontaktar mig om förfrågan.' })
    expect(accept).not.toBeChecked()

    await user.click(screen.getByRole('radio', { name: 'Avhämtning' }))
    await user.click(screen.getByRole('radio', { name: /Rengjord utrustning/ }))
    await user.type(screen.getByLabelText('Namn'), 'Anna Svensson')
    await user.type(screen.getByLabelText('E-post'), 'anna@example.se')
    await user.type(screen.getByLabelText('Mobilnummer'), '0701234567')
    await user.type(screen.getByLabelText(/Önskemål/), 'Utan nötter, tack.')
    await user.click(accept)
    await user.click(screen.getByRole('button', { name: 'Skicka förfrågan' }))

    expect(await screen.findByText('Gästens sida')).toBeInTheDocument()
    const [sent] = posts('/catering/requests')
    expect(sent).toMatchObject({
      guests: 30, fulfilment: 'pickup', equipmentReturn: 'cleaned', customerType: 'private', name: 'Anna Svensson',
      email: 'anna@example.se', phone: '+46701234567', acceptTerms: true, language: 'sv',
    })
    expect(Object.fromEntries(sent.dishes!.map((d) => [d.dishId, d.quantity]))).toEqual({ d1: 15, d2: 15, d3: 30, d5: 30 })
    expect(sent.notes).toBe(`Utan nötter, tack.\n\n${ESTIMATE_NOTE}`)
    expect(sent).not.toHaveProperty('marketingConsent')
    // gästens sida hittar länkens token efter skickandet
    expect(cateringApi.tokenFor('r1', '')).toBe('tok')
  })
})
