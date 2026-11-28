import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Header from './Header'

vi.mock('@bookingsystemadvancedorg/site-kit', async (importOriginal) => {
  const original = await importOriginal<typeof import('@bookingsystemadvancedorg/site-kit')>()
  return {
    ...original,
    LanguagePicker: ({ className }: { className?: string }) => (
      <button type="button" className={className}>
        SV
      </button>
    ),
    useSite: () => ({
      config: { tenant: { features: {} } },
      location: { locationId: 'loc-1', name: 'Anar', waitlist: null },
    }),
  }
})

vi.mock('./OpeningHoursModal', () => ({ default: () => null }))

/*
 * jsdom har ingen layout: bredderna sätts här per del (bandet, måttet, loggan,
 * länklistorna, språkväljaren), och ResizeObserver körs för hand.
 */
const sizes = { outer: 1440, left: 420, right: 260 }
const PAD_X = 48
const GAP = 29
const BRAND = 88
const TOOLS = 96
const END_GAP = 16
// länkarna behöver: 2*48 + 88 + 2*29 + 2*max(420, 260+16+96) = 1082
// (+1 per uppmätt del, headerFit.ts measureHeader)
const NEED = 2 * PAD_X + BRAND + 2 * GAP + 2 * (420 + 1)

function widthOf(el: Element): number {
  if (el.matches('header.site-header')) return sizes.outer
  if (el.matches('.site-header-nav--left ul')) return sizes.left
  if (el.matches('.site-header-nav--right ul')) return sizes.right
  if (el.matches('.language-switcher')) return TOOLS
  if (el.matches('.site-header-brand')) return BRAND
  return 0
}

let observers: ResizeObserverCallback[] = []
const resize = (outer: number, more: Partial<typeof sizes> = {}) => {
  Object.assign(sizes, { outer }, more)
  act(() => observers.forEach((cb) => cb([], {} as ResizeObserver)))
}

const restore: (() => void)[] = []
function patch<T extends object>(proto: T, key: string, desc: PropertyDescriptor) {
  const prev = Object.getOwnPropertyDescriptor(proto, key)
  Object.defineProperty(proto, key, { configurable: true, ...desc })
  restore.push(() => (prev ? Object.defineProperty(proto, key, prev) : delete (proto as Record<string, unknown>)[key]))
}

beforeEach(() => {
  Object.assign(sizes, { outer: 1440, left: 420, right: 260 })
  observers = []
  vi.stubGlobal(
    'ResizeObserver',
    class {
      cb: ResizeObserverCallback
      constructor(cb: ResizeObserverCallback) {
        this.cb = cb
        observers.push(cb)
      }
      observe() {}
      unobserve() {}
      disconnect() {
        observers = observers.filter((cb) => cb !== this.cb)
      }
    },
  )
  patch(HTMLElement.prototype, 'clientWidth', { get(this: HTMLElement) { return widthOf(this) } })
  patch(HTMLElement.prototype, 'offsetWidth', { get(this: HTMLElement) { return widthOf(this) } })
  patch(HTMLElement.prototype, 'scrollWidth', { get(this: HTMLElement) { return widthOf(this) } })
  patch(Element.prototype, 'getBoundingClientRect', {
    value(this: Element) {
      if (this.matches('.site-header-probe')) return { width: PAD_X, height: GAP } as DOMRect
      return { width: widthOf(this), height: 0 } as DOMRect
    },
  })
  const cs = window.getComputedStyle
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element, pseudo?: string | null) => {
    const style = cs(el, pseudo)
    if (el.matches('.site-header-end')) return { ...style, columnGap: `${END_GAP}px` } as CSSStyleDeclaration
    return style
  })
})

afterEach(() => {
  restore.splice(0).reverse().forEach((f) => f())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const renderHeader = () =>
  render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  )
const header = () => document.querySelector('header.site-header') as HTMLElement
const leftNav = () => document.querySelector('.site-header-nav--left') as HTMLElement
const rightNav = () => document.querySelector('.site-header-nav--right') as HTMLElement
const burger = () => document.querySelector('.site-header-burger') as HTMLElement
const drawer = () => document.getElementById('mobile-drawer') as HTMLElement

describe('Header fit', () => {
  it('shows every link in the row when they fit, decided before the first paint, and hides the menu button', () => {
    renderHeader()
    expect(header()).toHaveAttribute('data-fit', '0')
    for (const nav of [leftNav(), rightNav()]) {
      expect(nav).not.toHaveClass('site-header-off')
      expect(nav).not.toHaveAttribute('aria-hidden')
      expect(nav).not.toHaveAttribute('inert')
    }
    expect(burger()).toHaveAttribute('aria-hidden', 'true')
    expect(burger()).toHaveAttribute('inert')
    expect(within(header()).getByRole('link', { name: 'Drinkmeny' })).toBeInTheDocument()
    expect(within(header()).getByRole('button', { name: 'Öppettider' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Öppna meny' })).not.toBeInTheDocument()
  })

  it('moves the links to the panel when they do not fit, and keeps them out of reach in the row', () => {
    sizes.outer = 820
    renderHeader()
    expect(header()).toHaveAttribute('data-fit', '1')
    for (const nav of [leftNav(), rightNav()]) {
      expect(nav).toHaveClass('site-header-off')
      expect(nav).toHaveAttribute('aria-hidden', 'true')
      expect(nav).toHaveAttribute('inert')
    }
    expect(screen.getByRole('button', { name: 'Öppna meny' })).toBeInTheDocument()
    // språkväljaren finns kvar i raden
    expect(within(header()).getByRole('button', { name: 'SV' })).toBeInTheDocument()
  })

  it('follows the width with some slack before it goes back to the links', () => {
    renderHeader()
    resize(NEED - 1)
    expect(header()).toHaveAttribute('data-fit', '1')
    resize(NEED + 3)
    expect(header()).toHaveAttribute('data-fit', '1')
    resize(NEED + 8)
    expect(header()).toHaveAttribute('data-fit', '0')
  })

  it('moves the links to the panel when a translated label gets longer', () => {
    renderHeader()
    expect(header()).toHaveAttribute('data-fit', '0')
    resize(1100, { left: 520 }) // t.ex. spanska
    expect(header()).toHaveAttribute('data-fit', '1')
  })

  it('has every hidden link and Öppettider in the panel', () => {
    sizes.outer = 390
    renderHeader()
    const rowLinks = [...leftNav().querySelectorAll('a'), ...rightNav().querySelectorAll('a')].map((a) => a.textContent)
    const panel = within(drawer())
    expect(panel.getAllByRole('link', { hidden: true }).map((a) => a.textContent)).toEqual(rowLinks)
    expect(panel.getByRole('button', { name: 'Öppettider', hidden: true })).toBeInTheDocument()
  })

  it('keeps Tab inside the open panel, both ways, and Escape gives focus back to the menu button', async () => {
    sizes.outer = 820
    const user = userEvent.setup()
    renderHeader()
    await user.click(screen.getByRole('button', { name: 'Öppna meny' }))
    const panel = within(drawer())
    const close = panel.getByRole('button', { name: 'Stäng meny' })
    expect(close).toHaveFocus()
    const items = [close, ...panel.getAllByRole('link'), panel.getByRole('button', { name: 'Öppettider' })]
    for (let i = 1; i < items.length; i += 1) {
      await user.tab()
      expect(items[i]).toHaveFocus()
    }
    await user.tab() // från sista tillbaka till första
    expect(close).toHaveFocus()
    await user.tab({ shift: true }) // och baklänges till sista
    expect(items.at(-1)).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(drawer()).not.toHaveClass('mobile-drawer--open')
    expect(burger()).toHaveFocus()
  })

  it('closes the panel when the links fit in the row again, and puts focus on the first link', async () => {
    sizes.outer = 820
    const user = userEvent.setup()
    renderHeader()
    await user.click(screen.getByRole('button', { name: 'Öppna meny' }))
    expect(drawer()).toHaveClass('mobile-drawer--open')
    resize(1440)
    expect(header()).toHaveAttribute('data-fit', '0')
    expect(drawer()).not.toHaveClass('mobile-drawer--open')
    expect(within(leftNav()).getByRole('link', { name: 'Meny' })).toHaveFocus()
  })

  it('does not take the links back while the panel is open for a few pixels (the scrollbar it hides)', async () => {
    sizes.outer = NEED - 1
    const user = userEvent.setup()
    renderHeader()
    await user.click(screen.getByRole('button', { name: 'Öppna meny' }))
    resize(NEED + 15)
    expect(header()).toHaveAttribute('data-fit', '1')
    expect(drawer()).toHaveClass('mobile-drawer--open')
  })

  describe('floor on phones and tablets (up to 1023 px)', () => {
    let floor = false
    let listeners: (() => void)[] = []
    beforeEach(() => {
      floor = true
      listeners = []
      vi.stubGlobal('matchMedia', (q: string) => ({
        media: q,
        get matches() {
          return q === '(max-width: 1023px)' && floor
        },
        addEventListener: (_: string, cb: () => void) => listeners.push(cb),
        removeEventListener: (_: string, cb: () => void) => {
          listeners = listeners.filter((l) => l !== cb)
        },
      }))
    })

    it('keeps the menu button under 1024 px even when the links would fit (Arabic on an iPad)', () => {
      sizes.outer = 820
      Object.assign(sizes, { left: 200, right: 150 }) // kortare etiketter: NEED långt under 820
      renderHeader()
      expect(header()).toHaveAttribute('data-fit', '1')
      expect(screen.getByRole('button', { name: 'Öppna meny' })).toBeInTheDocument()
      resize(1000)
      expect(header()).toHaveAttribute('data-fit', '1')
    })

    it('decides again when the floor stops matching, and measures above it', () => {
      sizes.outer = 1440
      renderHeader()
      expect(header()).toHaveAttribute('data-fit', '1')
      floor = false
      act(() => listeners.forEach((l) => l()))
      expect(header()).toHaveAttribute('data-fit', '0')
      floor = true
      act(() => listeners.forEach((l) => l()))
      expect(header()).toHaveAttribute('data-fit', '1')
    })
  })
})
