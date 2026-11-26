import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { chooseCandidate, getTableMode, resetTableMode, setTableMode, syncTableMode } from './tableMode'
import type { Candidate } from './tableMode'

const chip = () => document.createElement('button')
const cand = (...ids: string[]): Candidate => ({ ids, chip: chip() })

describe('which table the site picks', () => {
  const seats = new Map([
    ['a', 2],
    ['b', 2],
    ['c', 4],
    ['d', 8],
  ])

  it('takes the single table with the fewest seats', () => {
    const best = chooseCandidate([cand('d'), cand('c'), cand('a')], seats, () => 0)
    expect(best?.ids).toEqual(['a'])
  })

  it('picks at random among equally good tables', () => {
    const list = [cand('a'), cand('c'), cand('b')]
    expect(chooseCandidate(list, seats, () => 0)?.ids).toEqual(['a'])
    expect(chooseCandidate(list, seats, () => 0.99)?.ids).toEqual(['b'])
  })

  it('prefers one table over tables put together, even if the combination has fewer seats', () => {
    const best = chooseCandidate([cand('a', 'b'), cand('d')], seats, () => 0)
    expect(best?.ids).toEqual(['d'])
  })

  it('takes a combination when there is no single table', () => {
    const best = chooseCandidate([cand('c', 'd'), cand('a', 'b')], seats, () => 0)
    expect(best?.ids).toEqual(['a', 'b'])
  })

  it('picks at random among all when the seats are not known', () => {
    const list = [cand('x'), cand('y'), cand('z')]
    expect(chooseCandidate(list, new Map(), () => 0.5)?.ids).toEqual(['y'])
  })

  it('picks nothing when there is nothing to pick from', () => {
    expect(chooseCandidate([], seats)).toBeNull()
  })
})

/** Kitets steg 3: ett fieldset med legend, planen, en lista med en knapp per alternativ. */
function step(options: { id: string; pressed?: boolean }[], disabled = false): HTMLFieldSetElement {
  const fs = document.createElement('fieldset')
  fs.className = 'booking-step'
  fs.disabled = disabled
  fs.innerHTML = `<legend>Välj ert bord</legend><p class="cell-muted">Intro</p><div class="floor-wrap"></div>
    <div class="booking-table-list" role="group">${options
      .map((o) => `<button type="button" class="filter-pill" data-option="${o.id}" aria-pressed="${Boolean(o.pressed)}">Bord</button>`)
      .join('')}</div>`
  document.body.appendChild(fs)
  return fs
}

const seats = new Map([
  ['t1', 2],
  ['t2', 4],
  ['t3', 4],
])

beforeEach(() => resetTableMode())
afterEach(() => {
  document.body.innerHTML = ''
})

describe('the choice in step 3', () => {
  it('adds the two choices under the heading, once, with "Välj bord själv" active', () => {
    const fs = step([{ id: 't1' }, { id: 't2' }])
    syncTableMode(seats)
    syncTableMode(seats)

    expect(fs.querySelectorAll('.plan-mode').length).toBe(1)
    expect(fs.querySelector('legend')?.nextElementSibling?.classList.contains('plan-mode')).toBe(true)
    const [self, any] = [...fs.querySelectorAll<HTMLElement>('.plan-mode-option')]
    expect(self.textContent).toContain('Välj bord själv')
    expect(any.textContent).toContain('Spelar ingen roll')
    expect(self.getAttribute('aria-pressed')).toBe('true')
    expect(any.getAttribute('aria-pressed')).toBe('false')
    expect(fs.getAttribute('data-table-mode')).toBe('self')
  })

  it('picks nothing in "Välj bord själv"', () => {
    const fs = step([{ id: 't1' }])
    const click = vi.spyOn(fs.querySelector<HTMLElement>('[data-option]')!, 'click')
    syncTableMode(seats)
    expect(click).not.toHaveBeenCalled()
  })

  it('presses the best table for the guest in "Spelar ingen roll", once', () => {
    setTableMode('any')
    const fs = step([{ id: 't2' }, { id: 't1' }, { id: 't3' }])
    const chips = [...fs.querySelectorAll<HTMLElement>('[data-option]')]
    const clicks = chips.map((c) => vi.spyOn(c, 'click').mockImplementation(() => c.setAttribute('aria-pressed', 'true')))

    const again = syncTableMode(seats, document, 1000, () => 0)
    expect(again).toBe(true)
    expect(fs.getAttribute('data-table-mode')).toBe('any')
    expect(clicks.map((c) => c.mock.calls.length)).toEqual([0, 1, 0]) // t1 has the fewest seats

    // Kitet har valt bordet: ingen ny knapptryckning.
    syncTableMode(seats, document, 5000, () => 0)
    expect(clicks.map((c) => c.mock.calls.length)).toEqual([0, 1, 0])
  })

  it('keeps a table the guest has already chosen', () => {
    setTableMode('any')
    const fs = step([{ id: 't1' }, { id: 't2', pressed: true }])
    const clicks = [...fs.querySelectorAll<HTMLElement>('[data-option]')].map((c) => vi.spyOn(c, 'click'))
    syncTableMode(seats, document, 1000)
    expect(clicks.every((c) => c.mock.calls.length === 0)).toBe(true)
  })

  it('picks again when the kit has cleared the choice (another time or party size)', () => {
    setTableMode('any')
    const fs = step([{ id: 't1' }, { id: 't2' }])
    const first = fs.querySelector<HTMLElement>('[data-option="t1"]')!
    const click = vi.spyOn(first, 'click').mockImplementation(() => first.setAttribute('aria-pressed', 'true'))
    syncTableMode(seats, document, 1000, () => 0)
    first.setAttribute('aria-pressed', 'false') // kitet nollställer valet
    syncTableMode(seats, document, 5000, () => 0)
    expect(click).toHaveBeenCalledTimes(2)
  })

  it('does not pick while the kit holds the step (disabled) or the seats are still being fetched', () => {
    setTableMode('any')
    const held = step([{ id: 't1' }], true)
    const heldClick = vi.spyOn(held.querySelector<HTMLElement>('[data-option]')!, 'click')
    syncTableMode(seats, document, 1000)
    expect(heldClick).not.toHaveBeenCalled()
    held.remove()

    const open = step([{ id: 't1' }])
    const openClick = vi.spyOn(open.querySelector<HTMLElement>('[data-option]')!, 'click')
    expect(syncTableMode(null, document, 9000)).toBe(true) // ask to run again
    expect(openClick).not.toHaveBeenCalled()
  })

  it('leaves the plan visible when there is nothing to pick from', () => {
    setTableMode('any')
    const fs = step([])
    syncTableMode(seats)
    expect(fs.getAttribute('data-table-mode')).toBe('self')
  })

  it('remembers the guest\'s choice', () => {
    setTableMode('any')
    expect(getTableMode()).toBe('any')
    const fs = step([{ id: 't1', pressed: true }])
    syncTableMode(seats)
    expect(fs.querySelector('.plan-mode-option[data-table-mode="any"]')?.getAttribute('aria-pressed')).toBe('true')
  })
})
