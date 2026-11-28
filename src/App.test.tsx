import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

// jsdom har ingen layout, så headern står i läget med menyknappen (headerFit.ts): länkarna i raden är
// dolda (aria-hidden, inert) och nås genom panelen, som på en telefon. Header.test.tsx provar båda lägena.
async function clickMenuLink(name: string) {
  await userEvent.click(screen.getByRole('button', { name: 'Öppna meny' }))
  await userEvent.click(within(document.getElementById('mobile-drawer') as HTMLElement).getByRole('link', { name }))
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
    expect(screen.getByRole('link', { name: 'Beställ hem' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Integritetspolicy' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cookies' })).toBeInTheDocument()
  })

  it('shows the order bar buttons for the other pages only: each page hides its own', async () => {
    window.history.replaceState(null, '', '/?restaurang=testkrogen')
    const cfg = siteConfig({ features: { reservations: true, ordering: true } })
    cfg.locations[0] = { ...cfg.locations[0], ordering: { pickup: true, prepMinutes: 20 } }
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.includes('/site-config') ? json(cfg) : json({ items: [] }))))
    const bar = () => within(screen.getByRole('region', { name: 'Beställ och boka' })).getAllByRole('link').map((l) => l.textContent)

    for (const [path, expected] of [
      ['/', ['Beställ avhämtning', 'Beställ hem']],
      ['/meny', ['Boka bord', 'Beställ avhämtning', 'Beställ hem']],
      ['/bestall', ['Boka bord', 'Beställ hem']],
      ['/bestall-hem', ['Boka bord', 'Beställ avhämtning']],
    ] as const) {
      const view = renderSite(path)
      await screen.findByRole('region', { name: 'Beställ och boka' })
      expect(bar(), path).toEqual(expected)
      view.unmount()
    }
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
    const header = screen.getByRole('banner', { hidden: true })
    const drawer = document.getElementById('mobile-drawer') as HTMLElement
    for (const name of ['Presentkort', 'Evenemang']) {
      expect(within(header).getByRole('link', { name, hidden: true })).toBeInTheDocument()
      expect(within(drawer).getByRole('link', { name, hidden: true })).toBeInTheDocument()
    }
  })

  it('has a Catering link in the header that opens "Under utveckling" while the location has not switched catering on, header kept', async () => {
    window.history.replaceState(null, '', '/?restaurang=testkrogen')
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.includes('/site-config') ? json(siteConfig({ features: { catering: true } })) : json({ items: [] }))))

    renderSite()

    await screen.findAllByRole('link', { name: 'Meny' })
    const link = within(screen.getByRole('banner')).getByRole('link', { name: 'Catering', hidden: true })
    expect(link).toHaveAttribute('href', '/catering')

    await clickMenuLink('Catering')

    expect(await screen.findByRole('heading', { level: 1, name: 'Catering' })).toBeInTheDocument()
    expect(screen.getByText('Under utveckling')).toBeInTheDocument()
    // Headern och menyn finns kvar på sidan.
    expect(screen.getAllByRole('link', { name: 'Meny' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Catering', hidden: true }).length).toBeGreaterThan(0)
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
    await clickMenuLink('Catering')

    expect(await screen.findByRole('heading', { level: 1, name: 'Räkna på catering' })).toBeInTheDocument()
    // Först vilka delar av menyn gästen vill ha, sedan rätterna att kryssa i (inte ett antal att skriva: mängden räknas ut åt gästen).
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Varmrätter' }))
    expect(await screen.findByRole('checkbox', { name: 'Grillad lax' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Portioner Grillad lax')).not.toBeInTheDocument()
    expect(screen.queryByText('Under utveckling')).not.toBeInTheDocument()
    // Headern finns kvar även här.
    expect(screen.getAllByRole('link', { name: 'Meny' }).length).toBeGreaterThan(0)
  })

  it('slides the header away while the phone menu is open, hides the sticky rows, and gives the menu its own close button', async () => {
    window.history.replaceState(null, '', '/?restaurang=testkrogen')
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.includes('/site-config') ? json(siteConfig()) : json({ items: [] }))))
    const user = userEvent.setup()
    renderSite()
    const html = document.documentElement
    const header = () => document.querySelector('header.site-header') as HTMLElement
    const drawerClose = () => within(document.getElementById('mobile-drawer') as HTMLElement).getByRole('button', { name: 'Stäng meny' })

    const burger = await screen.findByRole('button', { name: 'Öppna meny' })
    expect(html).not.toHaveClass('nav-open')
    expect(header()).not.toHaveClass('site-header--menu-open')

    await user.click(burger)
    expect(html).toHaveClass('nav-open')
    expect(header()).toHaveClass('site-header--menu-open')
    expect(header()).toHaveAttribute('inert')
    expect(drawerClose()).toHaveFocus() // fokus flyttas till menyns egen knapp

    await user.click(drawerClose())
    expect(html).not.toHaveClass('nav-open')
    expect(header()).not.toHaveClass('site-header--menu-open')
    expect(header()).not.toHaveAttribute('inert')
    expect(screen.getByRole('button', { name: 'Öppna meny' })).toHaveFocus() // och tillbaka när den stängs

    await user.click(screen.getByRole('button', { name: 'Öppna meny' }))
    expect(header()).toHaveClass('site-header--menu-open')
    await user.keyboard('{Escape}')
    expect(header()).not.toHaveClass('site-header--menu-open')
    expect(html).not.toHaveClass('nav-open')
  })

  it('has Vår historia and Kontakt in the footer, not in the header or the phone menu, and says who designed the site', async () => {
    window.history.replaceState(null, '', '/?restaurang=testkrogen')
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.includes('/site-config') ? json(siteConfig()) : json({ items: [] }))))

    renderSite()

    await screen.findAllByRole('link', { name: 'Meny' })
    const header = screen.getByRole('banner')
    expect(within(header).getByRole('link', { name: 'Parkering', hidden: true })).toBeInTheDocument()
    expect(within(header).queryByRole('link', { name: 'Vår historia', hidden: true })).not.toBeInTheDocument()
    expect(within(header).queryByRole('link', { name: 'Kontakt', hidden: true })).not.toBeInTheDocument()
    const drawer = [...document.querySelectorAll('#mobile-drawer a')].map((a) => a.textContent)
    expect(drawer).toContain('Parkering')
    expect(drawer).not.toContain('Vår historia')
    expect(drawer).not.toContain('Kontakt')

    const footer = screen.getByRole('contentinfo')
    // Sidfoten har länkarna två gånger: på mobil i blocket överst (öppettider och länkar), på dator i raden längst ned.
    for (const [name, href] of [['Vår historia', '/historia'], ['Kontakt', '/kontakt']]) {
      const links = within(footer).getAllByRole('link', { name })
      expect(links.length).toBeGreaterThan(0)
      for (const link of links) expect(link).toHaveAttribute('href', href)
    }
    expect(within(footer).getByText(/Designat av/)).toHaveTextContent('Designat av IT Hjälparna Nordic AB')
    expect(within(footer).getByRole('link', { name: 'www.ithjalparna.se' })).toHaveAttribute('href', 'https://www.ithjalparna.se')
    expect(footer).not.toHaveTextContent('fullt utvecklad')
  })

  it('has the opening hours and then the page links inside the black footer, for phones', async () => {
    window.history.replaceState(null, '', '/?restaurang=testkrogen')
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.includes('/site-config') ? json(siteConfig()) : json({ items: [] }))))

    renderSite('/meny')

    await screen.findAllByRole('link', { name: 'Meny' })
    const footer = screen.getByRole('contentinfo')
    const nav = within(footer).getByRole('navigation', { name: 'Snabblänkar och öppettider' })
    // Först öppettiderna (ett dragspel), sedan länkarna under dem.
    expect([...nav.children].map((c) => c.className)).toEqual(['mobile-pre-footer-hours', 'mobile-pre-footer-links'])
    expect(within(nav).getByRole('button', { name: 'ANAR Restaurang & Bar' })).toHaveAttribute('aria-expanded', 'false')
    expect(within(nav).getAllByRole('link').map((l) => l.textContent)).toEqual(['Meny', 'Drinkmeny', 'Vår historia', 'Parkering', 'Kontakt'])
  })

  it('opens Integritetspolicy, Cookies and Bokningsvillkor as pop-ups over the page, and keeps them as pages for direct links', async () => {
    window.history.replaceState(null, '', '/?restaurang=testkrogen')
    const cfg = siteConfig({ features: { reservations: true } })
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.includes('/site-config') ? json(cfg) : json({ items: [] }))))
    const user = userEvent.setup()
    const view = renderSite('/')
    const legal = within(await screen.findByRole('navigation', { name: 'Juridiskt' }))

    // Länken öppnar kitets sida i en ruta ovanpå, inte som en hel sida (ingen kitsida i flödet).
    await user.click(legal.getByRole('link', { name: 'Integritetspolicy' }))
    const privacy = await screen.findByRole('dialog', { name: 'Integritetspolicy' })
    expect(await within(privacy).findByRole('heading', { name: 'Personuppgiftsansvarig' })).toBeInTheDocument()
    expect(document.querySelector('main.kit-page')).toBeNull()
    await user.click(within(privacy).getByRole('button', { name: 'Stäng' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.click(legal.getByRole('link', { name: 'Cookies' }))
    expect(await screen.findByRole('dialog', { name: 'Cookies' })).toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Stäng' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.click(legal.getByRole('link', { name: 'Bokningsvillkor' }))
    expect(await screen.findByRole('dialog', { name: 'Bokningsvillkor' })).toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Stäng' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    // Ctrl-klick (ny flik) lämnas åt webbläsaren: ingen ruta.
    fireEvent.click(legal.getByRole('link', { name: 'Integritetspolicy' }), { ctrlKey: true })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    view.unmount()

    // Adressen är kvar som en hel sida för direktlänkar och mejl.
    renderSite('/integritetspolicy')
    expect(await screen.findByRole('heading', { level: 1, name: 'Integritetspolicy' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('puts "Drivs av Booqy" last in the panel with the booking flow, not in the footer', async () => {
    window.history.replaceState(null, '', '/?restaurang=testkrogen')
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.includes('/site-config') ? json(siteConfig()) : json({ items: [] }))))

    const { container } = renderSite()

    await screen.findAllByRole('link', { name: 'Meny' })
    const panel = container.querySelector('.kit-panel') as HTMLElement
    expect(panel.lastElementChild).toHaveTextContent('Drivs av')
    expect(within(panel).getByTitle('Booqy')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).not.toHaveTextContent('Drivs av')
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
