import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SiteProvider, configureSiteKit } from '@bookingsystemadvancedorg/site-kit'
import { json, siteConfig } from '@bookingsystemadvancedorg/site-kit/testing'
import App from './App'

function renderSite(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SiteProvider>
        <App />
      </SiteProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  configureSiteKit({ apiBaseUrl: 'https://api.test', menuImageBaseUrl: undefined })
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  sessionStorage.clear()
})

describe('App on SiteProvider', () => {
  it("renders Anar's shell on the restaurant from /site-config - nav, booking button and legal links", async () => {
    window.history.replaceState(null, '', '/?restaurang=testkrogen')
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/site-config')) return json(siteConfig())
      return json({ items: [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    renderSite()

    expect((await screen.findAllByRole('link', { name: 'Meny' })).length).toBeGreaterThan(0)
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/site-config?slug=testkrogen')
    expect(screen.getAllByRole('link', { name: 'Boka bord' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Beställ hem' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Integritetspolicy' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cookies' })).toBeInTheDocument()
  })

  it('hides booking when the plan has no reservations', async () => {
    window.history.replaceState(null, '', '/?restaurang=testkrogen')
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      url.includes('/site-config')
        ? json(siteConfig({ features: { reservations: false } }))
        : json({ items: [] })))

    renderSite()

    await screen.findAllByRole('link', { name: 'Meny' })
    expect(screen.queryByRole('link', { name: 'Boka bord' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Bokningsvillkor' })).not.toBeInTheDocument()
  })

  it('shows Presentkort and Evenemang only with those features in the plan', async () => {
    window.history.replaceState(null, '', '/?restaurang=testkrogen')
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      url.includes('/site-config')
        ? json(siteConfig({ features: { giftCards: true, events: true } }))
        : json({ items: [] })))

    renderSite()

    await screen.findAllByRole('link', { name: 'Meny' })
    expect(screen.getAllByRole('link', { name: 'Presentkort' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Evenemang' }).length).toBeGreaterThan(0)
  })

  it('has a Catering link in the header that opens "Under utveckling" while the location has not switched catering on, header kept', async () => {
    window.history.replaceState(null, '', '/?restaurang=testkrogen')
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.includes('/site-config') ? json(siteConfig({ features: { catering: true } })) : json({ items: [] }))))

    renderSite()

    await screen.findAllByRole('link', { name: 'Meny' })
    const link = screen.getAllByRole('link', { name: 'Catering' })[0]
    expect(link).toHaveAttribute('href', '/catering')

    await userEvent.click(link)

    expect(await screen.findByRole('heading', { level: 1, name: 'Catering' })).toBeInTheDocument()
    expect(screen.getByText('Under utveckling')).toBeInTheDocument()
    // Headern och menyn finns kvar på sidan.
    expect(screen.getAllByRole('link', { name: 'Meny' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Catering' }).length).toBeGreaterThan(0)
  })

  it("opens Anar's catering form (tick what you want) from the same button once the location has catering switched on", async () => {
    window.history.replaceState(null, '', '/?restaurang=testkrogen')
    const cfg = siteConfig({ features: { catering: true } })
    cfg.locations[0] = { ...cfg.locations[0], catering: true }
    const settings = {
      enabled: true, minPortions: 10, maxPortions: 300, advanceDays: 5, pickup: true, delivery: true, deliveryArea: 'Linköping',
      maxDistanceKm: 25, priceWithinLimit: 395, priceBeyondLimit: 395, allowOutsideArea: false, terms: '', offerValidDays: 7, paymentTermsDays: 30,
    }
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/site-config')) return json(cfg)
      if (url.includes('/catering/settings')) return json(settings)
      if (url.includes('/catering/menu')) return json({ dishes: [{ dishId: 'd1', name: 'Grillad lax', pricePerPortion: 245 }], packages: [] })
      if (url.includes('/catering/discount-tiers')) return json({ tiers: [] })
      if (url.endsWith('/menu')) {
        return json({ items: [{ menuItemId: 'm1', name: 'Grillad lax', description: '', price: 245, category: 'mains', imageKey: null }], categories: [{ categoryId: 'mains', name: 'Varmrätter' }] })
      }
      return json({ items: [] })
    }))

    renderSite()

    await screen.findAllByRole('link', { name: 'Meny' })
    await userEvent.click(screen.getAllByRole('link', { name: 'Catering' })[0])

    expect(await screen.findByRole('heading', { level: 1, name: 'Räkna på catering' })).toBeInTheDocument()
    // Att kryssa i, inte ett antal att skriva: mängden räknas ut åt gästen.
    expect(await screen.findByRole('checkbox', { name: 'Grillad lax' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Portioner Grillad lax')).not.toBeInTheDocument()
    expect(screen.queryByText('Under utveckling')).not.toBeInTheDocument()
    // Headern finns kvar även här.
    expect(screen.getAllByRole('link', { name: 'Meny' }).length).toBeGreaterThan(0)
  })

  it("shows the dishes' photos from Booqy on the menu, and nothing for a dish without one", async () => {
    window.history.replaceState(null, '', '/?restaurang=testkrogen')
    configureSiteKit({ apiBaseUrl: 'https://api.test', menuImageBaseUrl: 'https://cdn.test' })
    const menu = {
      items: [
        { menuItemId: 'a', name: 'Burrata', description: 'Färsk ost.', price: 135, category: 'starters', imageKey: 'menu-images/burrata.jpg', imageFocus: { x: 30, y: 70 } },
        { menuItemId: 'b', name: 'Toast Skagen', description: 'Räkor.', price: 145, category: 'starters', imageKey: null },
      ],
      categories: [{ categoryId: 'starters', name: 'Förrätter' }],
    }
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/site-config')) return json(siteConfig())
      if (url.includes('/menu')) return json(menu)
      return json({ items: [] })
    }))

    const { container } = renderSite('/meny')

    expect(await screen.findByText(/Toast Skagen/)).toBeInTheDocument()
    const photos = container.querySelectorAll<HTMLImageElement>('img.dish-photo')
    expect(photos).toHaveLength(1)
    expect(photos[0]).toHaveAttribute('src', 'https://cdn.test/menu-images/burrata.jpg')
    expect(photos[0].style.getPropertyValue('--dish-photo-position')).toBe('30% 70%')
  })

  it('an unknown or suspended restaurant shows a neutral page, nothing else', async () => {
    window.history.replaceState(null, '', '/?restaurang=nobody')
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: 'not found' }, 404)))

    renderSite()

    expect(await screen.findByRole('heading', { name: 'Sidan är inte tillgänglig' })).toBeInTheDocument()
  })

  it('a network error offers a retry instead of another restaurant', async () => {
    window.history.replaceState(null, '', '/?restaurang=testkrogen')
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))

    renderSite()

    expect(await screen.findByRole('button', { name: 'Försök igen' }, { timeout: 5000 })).toBeInTheDocument()
  })
})
