import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { SiteProvider, configureSiteKit } from '@bookingsystemadvancedorg/site-kit'
import { json, siteConfig } from '@bookingsystemadvancedorg/site-kit/testing'
import App from '../../App'
import { resetWeeklyOffer } from './weeklyOfferState'

const offerMenu = {
  categories: [
    { categoryId: 'mains', name: 'Varmrätter' },
    { categoryId: 'wk', name: 'veckans erbjudande' },
  ],
  items: [
    { menuItemId: 'm1', name: 'Grillad lax', description: '', price: 245, category: 'mains', imageKey: null },
    { menuItemId: 'w1', name: 'shishlig kebab', description: 'Med bulgur och rostade grönsaker.', price: 150, category: 'wk', imageKey: null },
  ],
}

function stubSite(menu: unknown) {
  window.history.replaceState(null, '', '/?restaurang=testkrogen')
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.includes('/site-config')) return json(siteConfig())
      if (url.endsWith('/menu')) return json(menu)
      return json({ items: [] })
    }),
  )
}

function renderSite(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SiteProvider>
        <App />
      </SiteProvider>
    </MemoryRouter>,
  )
}

const OFFER = { name: 'veckans erbjudande' }

beforeEach(() => resetWeeklyOffer())
afterEach(() => {
  configureSiteKit({ apiBaseUrl: 'https://api.test', menuImageBaseUrl: undefined })
  vi.unstubAllGlobals()
})

describe('Veckans erbjudande på startsidan', () => {
  it('shows the category from the menu as a pop-up with its dishes, prices and descriptions, and closes', async () => {
    stubSite(offerMenu)
    const user = userEvent.setup()
    renderSite('/')

    // Visas en stund efter att sidan öppnats.
    const popup = await screen.findByRole('complementary', OFFER, { timeout: 4000 })
    expect(within(popup).getByRole('heading', { level: 2, name: 'veckans erbjudande' })).toBeInTheDocument()
    expect(within(popup).getByText('shishlig kebab')).toBeInTheDocument()
    expect(within(popup).getByText('150 kr')).toBeInTheDocument()
    expect(within(popup).getByText('Med bulgur och rostade grönsaker.')).toBeInTheDocument()
    // bara erbjudandets rätter, inte menyns andra
    expect(within(popup).queryByText('Grillad lax')).not.toBeInTheDocument()

    await user.click(within(popup).getByRole('button', { name: 'Stäng erbjudandet' }))
    expect(screen.queryByRole('complementary', OFFER)).not.toBeInTheDocument()
  })

  it('closes with Escape too', async () => {
    stubSite(offerMenu)
    const user = userEvent.setup()
    renderSite('/')
    const popup = await screen.findByRole('complementary', OFFER, { timeout: 4000 })
    within(popup).getByRole('button', { name: 'Stäng erbjudandet' }).focus()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('complementary', OFFER)).not.toBeInTheDocument())
  })

  it('gets out of the way as soon as the guest starts using the booking', async () => {
    stubSite(offerMenu)
    renderSite('/')
    await screen.findByRole('complementary', OFFER, { timeout: 4000 })
    const booking = document.querySelector('.kit-panel')
    expect(booking).not.toBeNull()
    fireEvent.pointerDown(booking as Element)
    await waitFor(() => expect(screen.queryByRole('complementary', OFFER)).not.toBeInTheDocument())
  })

  it('shows nothing when the menu has no such category', async () => {
    stubSite({ categories: offerMenu.categories.slice(0, 1), items: offerMenu.items.slice(0, 1) })
    renderSite('/')
    await screen.findAllByRole('link', { name: 'Meny' })
    await new Promise((r) => setTimeout(r, 1800))
    expect(screen.queryByRole('complementary', OFFER)).not.toBeInTheDocument()
  })

  it('is only on the start page, not on the other pages', async () => {
    stubSite(offerMenu)
    renderSite('/meny')
    await screen.findAllByRole('link', { name: 'Meny' })
    await new Promise((r) => setTimeout(r, 1800))
    expect(screen.queryByRole('complementary', OFFER)).not.toBeInTheDocument()
  })
})
