import { expect, test } from '@playwright/test'
import { CONFIGURED, NOT_CONFIGURED } from '../lib/site'

/**
 * Omdömen deck on the home page (projects ui-390 .. ui-1440): through two
 * corner swings, every card keeps opacity 1 on every frame, and the moving
 * card never leaves the reviews column or makes the page scroll sideways.
 */

test.skip(!CONFIGURED, NOT_CONFIGURED)

test('review cards stay fully visible through two swings @ux', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  const stack = page.locator('.guest-reviews-stack')
  test.skip((await stack.count()) === 0, 'no review deck on this site')
  await stack.scrollIntoViewIfNeeded()
  await page.mouse.move(0, 0)
  const result = await page.evaluate(
    () =>
      new Promise<{ minOpacity: number; swings: number; outside: number; scrollW: number; vw: number }>((done) => {
        const col = document.querySelector('.reviews-column')!.getBoundingClientRect()
        let minOpacity = 1
        let outside = 0
        const seen = new Set<Element>()
        const end = performance.now() + 8500
        const frame = () => {
          for (const card of document.querySelectorAll('.guest-reviews-card')) {
            minOpacity = Math.min(minOpacity, Number(getComputedStyle(card).opacity))
            if (card.classList.contains('guest-reviews-card--leaving')) {
              seen.add(card)
              const r = card.getBoundingClientRect()
              if (r.left < col.left - 1 || r.right > col.right + 1) outside++
            }
          }
          if (performance.now() < end) requestAnimationFrame(frame)
          else
            done({
              minOpacity,
              swings: seen.size,
              outside,
              scrollW: document.documentElement.scrollWidth,
              vw: window.innerWidth,
            })
        }
        requestAnimationFrame(frame)
      }),
  )
  expect(result.swings, 'two swings sampled').toBeGreaterThanOrEqual(2)
  expect(result.minOpacity, 'lowest card opacity').toBe(1)
  expect(result.outside, 'frames with the moving card outside the column').toBe(0)
  expect(result.scrollW).toBeLessThanOrEqual(result.vw)
})
