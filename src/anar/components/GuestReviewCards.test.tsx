import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import GuestReviewCards from './GuestReviewCards'

/**
 * Omdömen deck (corner swing): the owner's rule is that a card stays fully
 * visible the whole way. Nothing may fade: no opacity in the deck's CSS
 * (rules, transitions or keyframes) and none in the swing's keyframes.
 * e2e/specs/deck.spec.ts samples the live page as well.
 */

const css = readFileSync(resolve(process.cwd(), 'src/anar/styles/guest-reviews.css'), 'utf8')

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('GuestReviewCards', () => {
  it('has no opacity, fade or old keyframes in the deck CSS', () => {
    expect(css).toMatch(/\.guest-reviews-stack/)
    const code = css.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(code).not.toMatch(/opacity/i)
    expect(code).not.toMatch(/@keyframes/)
    expect(code).not.toMatch(/(^|[;{\s])animation\s*:/)
  })

  it('swings the front card to the back without touching opacity', () => {
    vi.useFakeTimers()
    const frames: Keyframe[][] = []
    const animate = vi.fn(function (this: Element, kf: Keyframe[]) {
      frames.push(kf)
      return { cancel: vi.fn(), onfinish: null } as unknown as Animation
    })
    Object.defineProperty(Element.prototype, 'animate', { value: animate, configurable: true, writable: true })
    const { container } = render(<GuestReviewCards />)
    act(() => {
      vi.advanceTimersByTime(3600)
    })
    expect(animate).toHaveBeenCalledTimes(1)
    expect(frames[0]).toHaveLength(4)
    for (const f of frames[0]) expect(Object.keys(f)).not.toContain('opacity')
    for (const card of container.querySelectorAll<HTMLElement>('.guest-reviews-card')) {
      expect(card.style.opacity).toBe('')
      expect(card.getAttribute('style') ?? '').not.toMatch(/opacity/)
    }
    // @ts-expect-error test stub removed again
    delete Element.prototype.animate
  })
})
