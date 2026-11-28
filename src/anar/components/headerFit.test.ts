import { describe, expect, it } from 'vitest'
import { FIT_SLACK, HEADER_FIT_FLOOR_QUERY, belowHeaderFloor, pickHeaderFit, requiredWidth, type HeaderSizes } from './headerFit'

// Ungefär Anar på 1440 px i svenska: logga 88, sidomarginal 2 x 48, kolumnavstånd 29.
const base: HeaderSizes = {
  outer: 1440,
  pad: 96,
  gap: 29,
  brand: 88,
  left: 420,
  right: 260,
  endGap: 16,
  tools: 96,
}

describe('requiredWidth', () => {
  it('takes the wider side twice, since both columns around the logo are equally wide', () => {
    // höger: 260 + 16 + 96 = 372 < vänster 420
    expect(requiredWidth(base)).toBe(96 + 88 + 2 * 29 + 2 * 420)
    // höger bredast
    expect(requiredWidth({ ...base, right: 400 })).toBe(96 + 88 + 2 * 29 + 2 * (400 + 16 + 96))
  })

  it('leaves out the gap next to a part that is missing', () => {
    expect(requiredWidth({ ...base, left: 0, tools: 0 })).toBe(96 + 88 + 2 * 29 + 2 * 260)
  })
})

describe('pickHeaderFit', () => {
  const need = requiredWidth(base)

  it('keeps the links in the row when they fit, and moves them to the panel when they do not', () => {
    expect(pickHeaderFit({ ...base, outer: need }, 0)).toBe(0)
    expect(pickHeaderFit({ ...base, outer: need - 1 }, 0)).toBe(1)
  })

  it('needs some room to spare before it goes back to the links (no flip-flop at the edge)', () => {
    expect(pickHeaderFit({ ...base, outer: need }, 1)).toBe(1)
    expect(pickHeaderFit({ ...base, outer: need + FIT_SLACK - 1 }, 1)).toBe(1)
    expect(pickHeaderFit({ ...base, outer: need + FIT_SLACK }, 1)).toBe(0)
    // och tillbaka till panelen direkt när det inte längre får plats
    expect(pickHeaderFit({ ...base, outer: need - 1 }, 0)).toBe(1)
  })

  it('takes a wider slack when asked (the open panel hides the scrollbar)', () => {
    expect(pickHeaderFit({ ...base, outer: need + 20 }, 1, 30)).toBe(1)
    expect(pickHeaderFit({ ...base, outer: need + 30 }, 1, 30)).toBe(0)
  })

  it('keeps the current level without a real layout', () => {
    expect(pickHeaderFit({ ...base, outer: 0 }, 0)).toBe(0)
    expect(pickHeaderFit({ ...base, outer: 0 }, 1)).toBe(1)
  })

  it('follows the longest language: a longer label moves the links to the panel', () => {
    // spanska: vänsterlänkarna 700 px i stället för 420
    expect(pickHeaderFit({ ...base, left: 700 }, 0)).toBe(1)
    expect(pickHeaderFit({ ...base, left: 700, outer: 1920 }, 0)).toBe(0)
  })

  it('moves the links to the panel on a phone', () => {
    expect(pickHeaderFit({ ...base, outer: 390, pad: 32, gap: 15, brand: 64 }, 0)).toBe(1)
  })
})

describe('belowHeaderFloor', () => {
  const win = (matches: boolean, seen: string[] = []) =>
    ({
      matchMedia: (q: string) => {
        seen.push(q)
        return { matches } as MediaQueryList
      },
    }) as Pick<Window, 'matchMedia'>

  it('asks for phones and tablets up to 1023 px, the same limit as the touch targets', () => {
    const seen: string[] = []
    expect(belowHeaderFloor(win(true, seen))).toBe(true)
    expect(seen).toEqual([HEADER_FIT_FLOOR_QUERY])
    expect(HEADER_FIT_FLOOR_QUERY).toBe('(max-width: 1023px)')
  })

  it('is off above the floor and without matchMedia', () => {
    expect(belowHeaderFloor(win(false))).toBe(false)
    expect(belowHeaderFloor({} as Pick<Window, 'matchMedia'>)).toBe(false)
    expect(belowHeaderFloor(undefined)).toBe(false)
  })
})
