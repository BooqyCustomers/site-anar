import { expect, test } from '@playwright/test'
import { CONFIGURED, NOT_CONFIGURED } from '../lib/site'

/**
 * Home page booking (projects ui-390 .. ui-1440): the booking card grows with
 * its steps and pushes the page down. At step 3 the table picker is fully
 * visible, nothing lies on top of it (elementFromPoint at its centre and near
 * its corners), "Hitta hit" starts below the booking, and a table can be
 * picked: bookable tables breathe, and after a pick focus moves on to
 * Bekräfta bord. Nothing is held or booked.
 */

test.skip(!CONFIGURED, NOT_CONFIGURED)

test('booking step 3: the table picker is visible, not covered and clickable @ux', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  const main = page.locator('main')
  const days = main.getByRole('group', { name: /datum/i }).getByRole('button')
  test.skip((await days.count()) === 0, 'no booking on the home page')
  // Day after tomorrow, the latest time: clear of today's cut-offs.
  await days.nth(2).click()
  const times = main.getByRole('group', { name: 'Välj tid' }).getByRole('button')
  await expect(times.first()).toBeVisible()
  await times.last().click()
  const free = main.getByRole('group', { name: 'Lediga bord' }).getByRole('button')
  await expect(free.first()).toBeAttached()

  const step = main.locator('fieldset.booking-step', { has: page.getByRole('group', { name: 'Lediga bord' }) })
  const plan = step.locator('.floor-wrap')
  const picker = (await plan.count()) ? plan.first() : main.getByRole('group', { name: 'Lediga bord' })
  await picker.scrollIntoViewIfNeeded()

  const result = await picker.evaluate((el) => {
    const step = el.closest('fieldset')!
    const form = el.closest('form')!
    const split = form.closest('.desk-split')
    const next = split?.nextElementSibling ?? null
    const r = el.getBoundingClientRect()
    const points: [number, number][] = [
      [r.left + r.width / 2, r.top + r.height / 2],
      [r.left + 12, r.top + 12],
      [r.right - 12, r.top + 12],
      [r.left + 12, r.bottom - 12],
      [r.right - 12, r.bottom - 12],
    ]
    const covered = points
      .filter(([x, y]) => y >= 0 && y <= innerHeight && x >= 0 && x <= innerWidth)
      .map(([x, y]) => document.elementFromPoint(x, y))
      .filter((hit) => !hit || !step.contains(hit))
      .map((hit) => (hit ? `${hit.tagName}.${hit.className}` : 'nothing'))
    return {
      covered,
      height: r.height,
      formBottom: form.getBoundingClientRect().bottom,
      nextTop: next ? next.getBoundingClientRect().top : Infinity,
      formOverflow: form.scrollHeight - form.clientHeight,
    }
  })
  expect(result.height, 'picker height').toBeGreaterThan(100)
  expect(result.covered, 'elements on top of the table picker').toEqual([])
  expect(result.formOverflow, 'booking content cut off by its own box').toBeLessThanOrEqual(2)
  expect(result.formBottom, 'the next section starts below the booking').toBeLessThanOrEqual(result.nextTop + 1)

  // Bookable tables breathe (a slow glow), all in step.
  const breathing = await page.evaluate(() =>
    document.getAnimations().filter((a) => (a as CSSAnimation).animationName?.startsWith('plan-breathe')).length,
  )
  expect(breathing, 'bookable tables that breathe').toBeGreaterThan(0)

  await free.first().click()
  // After the half-second pick effect the page glides on and focus lands on the next step.
  await expect(main.getByRole('button', { name: 'Bekräfta bord' })).toBeFocused({ timeout: 4000 })
})

/**
 * After a table is picked (its button below the plan, or the table on the
 * plan), the page waits for the half-second pick effect and then glides to
 * Bekräfta bord: scrollY sampled every frame never moves in the first
 * 400 ms and never more than 60 px in one frame. The click is a real mouse
 * click on a target already in view, so the test tool does not scroll first.
 */
for (const target of ['chip', 'plan'] as const) {
  test(`picking a table (${target}) glides to Bekräfta bord, no jump @ux`, async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    const main = page.locator('main')
    const days = main.getByRole('group', { name: /datum/i }).getByRole('button')
    test.skip((await days.count()) === 0, 'no booking on the home page')
    await days.nth(2).click()
    const times = main.getByRole('group', { name: 'Välj tid' }).getByRole('button')
    await expect(times.first()).toBeVisible()
    await times.last().click()
    const chips = main.getByRole('group', { name: 'Lediga bord' }).getByRole('button')
    await expect(chips.first()).toBeAttached()
    const plan = main.locator('.floor-wrap')
    test.skip(target === 'plan' && (await plan.count()) === 0, 'no floor plan')
    // Put the target in the middle of the screen, then let the page settle.
    const selector = target === 'chip' ? '.booking-table-list .filter-pill' : '.f3d-table.is-free, .floor-svg-pick'
    await page.locator(selector).first().evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await page.waitForTimeout(400)
    const box = await page.locator(selector).first().boundingBox()
    expect(box, 'target in view').not.toBeNull()

    await page.evaluate(() => {
      const w = window as unknown as { __samples: [number, number][] }
      w.__samples = []
      const t0 = performance.now()
      const frame = () => {
        w.__samples.push([performance.now() - t0, window.scrollY])
        if (performance.now() - t0 < 2000) requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    })
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await page.waitForTimeout(2100)
    const samples = await page.evaluate(() => (window as unknown as { __samples: [number, number][] }).__samples)

    const start = samples[0][1]
    const early = samples.filter(([ms]) => ms < 400).map(([, y]) => Math.abs(y - start))
    expect(Math.max(...early), 'page moved during the pick effect (first 400 ms)').toBeLessThanOrEqual(1)
    let maxStep = 0
    for (let i = 1; i < samples.length; i++) maxStep = Math.max(maxStep, Math.abs(samples[i][1] - samples[i - 1][1]))
    expect(maxStep, 'largest scroll in one frame (px)').toBeLessThanOrEqual(60)
    await expect(main.getByRole('button', { name: 'Bekräfta bord' })).toBeFocused()
  })
}
