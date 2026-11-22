import { act, fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useHideOnScroll from './useHideOnScroll'

function Probe({ paused = false }: { paused?: boolean }) {
  const ref = useRef<HTMLElement>(null)
  const { hidden, stuck } = useHideOnScroll(ref, { paused })
  return (
    <>
      <header ref={ref} data-testid="header" data-hidden={String(hidden)} data-stuck={String(stuck)}>
        <a href="#x">länk</a>
      </header>
      <nav>
        <a href="#sektion">hoppa</a>
        <a href="#saknas">hoppa till inget</a>
        <a href="#">upp</a>
      </nav>
      <section id="sektion" />
    </>
  )
}

const state = () => {
  const el = screen.getByTestId('header')
  return { hidden: el.dataset.hidden === 'true', stuck: el.dataset.stuck === 'true' }
}

// Bildrutorna körs för hand (som webbläsaren gör dem: efter händelsen, en gång per ruta).
let frames: FrameRequestCallback[] = []
const flushFrames = () =>
  act(() => {
    const due = frames
    frames = []
    due.forEach((cb) => cb(0))
  })

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true })
  act(() => {
    fireEvent.scroll(window)
  })
  flushFrames()
}

beforeEach(() => {
  frames = []
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true })
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb))
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  scrollTo(0)
})

describe('useHideOnScroll', () => {
  it('is shown at the top of the page, without a background fill', () => {
    render(<Probe />)
    expect(state()).toEqual({ hidden: false, stuck: false })
  })

  it('hides when the guest scrolls down and comes back when scrolling up', () => {
    render(<Probe />)
    scrollTo(300)
    expect(state()).toEqual({ hidden: true, stuck: true })
    scrollTo(200)
    expect(state()).toEqual({ hidden: false, stuck: true })
    scrollTo(500)
    expect(state().hidden).toBe(true)
  })

  it('counts several scroll events in one frame once', () => {
    render(<Probe />)
    Object.defineProperty(window, 'scrollY', { value: 300, configurable: true, writable: true })
    act(() => {
      fireEvent.scroll(window)
      fireEvent.scroll(window)
      fireEvent.scroll(window)
    })
    expect(frames).toHaveLength(1)
    flushFrames()
    expect(state().hidden).toBe(true)
  })

  it('stays put for a tiny movement (a shaky finger, a small bounce)', () => {
    render(<Probe />)
    scrollTo(300)
    expect(state().hidden).toBe(true)
    scrollTo(297)
    expect(state().hidden).toBe(true)
    scrollTo(600)
    scrollTo(603)
    expect(state().hidden).toBe(true)
  })

  it('collects small steps until they add up to a direction', () => {
    render(<Probe />)
    scrollTo(300)
    expect(state().hidden).toBe(true)
    // tre steg om 2 px uppåt (6 px tillsammans) räknas inte, men ett fjärde (8 px) gör det
    for (const y of [298, 296, 294]) scrollTo(y)
    expect(state().hidden).toBe(true)
    scrollTo(292)
    expect(state().hidden).toBe(false)
  })

  it('is always shown near the top, also when scrolling down', () => {
    render(<Probe />)
    scrollTo(60)
    expect(state()).toEqual({ hidden: false, stuck: true })
  })

  it('does not hide while a menu is open (paused)', () => {
    const { rerender } = render(<Probe />)
    scrollTo(400)
    expect(state().hidden).toBe(true)
    rerender(<Probe paused />)
    expect(state().hidden).toBe(false)
    rerender(<Probe />)
    expect(state().hidden).toBe(true)
  })

  it('shows itself when the keyboard moves focus into it', () => {
    render(<Probe />)
    scrollTo(400)
    expect(state().hidden).toBe(true)
    act(() => {
      screen.getByRole('link', { name: 'länk', hidden: true }).focus()
    })
    expect(state().hidden).toBe(false)
  })

  describe('anchor links (the category chips)', () => {
    const clickJump = (name: string) =>
      act(() => {
        fireEvent.click(screen.getByRole('link', { name }))
      })
    const wait = (ms: number) =>
      act(() => {
        vi.advanceTimersByTime(ms)
      })

    it('does not show the header for a jump up, so the section is not hidden behind it', () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      render(<Probe />)
      scrollTo(900)
      expect(state().hidden).toBe(true)
      clickJump('hoppa')
      scrollTo(500) // hoppet uppåt: utan lås skulle headern visas här
      scrollTo(120)
      expect(state().hidden).toBe(true)
      wait(200) // scrollen har stått still: hoppet är klart
      scrollTo(60)
      expect(state().hidden).toBe(false) // nära toppen visas den som vanligt
    })

    it('does not hide the header for a jump down, so there is no gap above the section', () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      render(<Probe />)
      scrollTo(60)
      expect(state().hidden).toBe(false)
      clickJump('hoppa')
      scrollTo(700)
      scrollTo(1400)
      expect(state().hidden).toBe(false)
      expect(state().stuck).toBe(true) // bakgrunden följer ändå med
    })

    it('keeps waiting while the jump scrolls, and takes the scroll position as the new start', () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      render(<Probe />)
      scrollTo(900)
      clickJump('hoppa')
      for (const y of [800, 600, 400, 300]) {
        wait(100) // kortare än stilleståndet: hoppet pågår fortfarande
        scrollTo(y)
        expect(state().hidden).toBe(true)
      }
      wait(200)
      // nästa riktiga scroll uppåt räknas från där hoppet slutade
      scrollTo(270)
      expect(state().hidden).toBe(false)
    })

    it('lets go when the target is already in view and nothing scrolls', () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      render(<Probe />)
      scrollTo(600)
      clickJump('hoppa')
      wait(700)
      scrollTo(500)
      expect(state().hidden).toBe(false)
    })

    it('ignores links to nothing on the page and a bare #', () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      render(<Probe />)
      scrollTo(600)
      clickJump('hoppa till inget')
      scrollTo(400)
      expect(state().hidden).toBe(false)
      scrollTo(700)
      expect(state().hidden).toBe(true)
      clickJump('upp')
      scrollTo(500)
      expect(state().hidden).toBe(false)
    })
  })

  it('starts "stuck" when the page is opened already scrolled', () => {
    scrollTo(500)
    render(<Probe />)
    expect(state()).toEqual({ hidden: false, stuck: true })
  })
})
