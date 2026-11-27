import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OFFSET_PX, glideTo } from './glide'

/** Ett element på ett bestämt avstånd från fönstrets överkant. */
function elementAt(top: number, height = 300): HTMLElement {
  const el = document.createElement('div')
  el.getBoundingClientRect = () => ({ top, bottom: top + height, left: 0, right: 100, width: 100, height, x: 0, y: top, toJSON: () => ({}) })
  document.body.appendChild(el)
  return el
}

let scrollTo: ReturnType<typeof vi.fn>

beforeEach(() => {
  scrollTo = vi.fn()
  Object.defineProperty(window, 'scrollTo', { value: scrollTo, configurable: true, writable: true })
  Object.defineProperty(window, 'scrollY', { value: 100, configurable: true, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true, writable: true })
  Object.defineProperty(document.documentElement, 'scrollHeight', { value: 5000, configurable: true })
  // Reducerad rörelse: sidan flyttas direkt, så att testet inte väntar på bildrutor.
  window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('glideTo', () => {
  it('puts the top of the element a little under the top of the window', async () => {
    const arrived = await glideTo(elementAt(600))
    expect(arrived).toBe(true)
    expect(scrollTo).toHaveBeenCalledWith({ top: 100 + 600 - OFFSET_PX, behavior: 'instant' })
  })

  it('never scrolls past the end of the page', async () => {
    await glideTo(elementAt(9000))
    expect(scrollTo).toHaveBeenCalledWith({ top: 5000 - 800, behavior: 'instant' })
  })

  it('does nothing when the element is already where it should be', async () => {
    const arrived = await glideTo(elementAt(OFFSET_PX))
    expect(arrived).toBe(false)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('does nothing without an element', async () => {
    expect(await glideTo(null)).toBe(false)
    expect(await glideTo(undefined)).toBe(false)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('can skip an element that is already in view (the sticky Kalkyl on a desktop)', async () => {
    expect(await glideTo(elementAt(120, 400), { skipIfInView: true })).toBe(false)
    expect(scrollTo).not.toHaveBeenCalled()
    // en del som ligger långt nedanför rullas fram även med skipIfInView
    expect(await glideTo(elementAt(1500, 400), { skipIfInView: true })).toBe(true)
    expect(scrollTo).toHaveBeenCalledOnce()
  })
})

describe('glideTo with motion', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia
  })

  it('moves in steps and arrives at the target', async () => {
    let now = 0
    const frames: FrameRequestCallback[] = []
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb))
    vi.stubGlobal('cancelAnimationFrame', () => {})

    const done = glideTo(elementAt(600), { duration: 400 })
    const to = 100 + 600 - OFFSET_PX
    for (const t of [100, 200, 300, 400]) {
      now = t
      frames.shift()?.(now)
    }
    expect(await done).toBe(true)
    const tops = scrollTo.mock.calls.map(([arg]) => (arg as { top: number }).top)
    expect(tops.length).toBeGreaterThan(2)
    expect(tops).toEqual([...tops].sort((a, b) => a - b)) // alltid nedåt
    expect(tops.at(-1)).toBe(to)
    vi.unstubAllGlobals()
  })

  it('stops at once when the guest scrolls by themselves', async () => {
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb))
    vi.stubGlobal('cancelAnimationFrame', () => {})
    const done = glideTo(elementAt(600), { duration: 400 })
    window.dispatchEvent(new Event('wheel'))
    expect(await done).toBe(false)
    vi.unstubAllGlobals()
  })
})
