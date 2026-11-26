import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LENS_SIZE, LENS_ZOOM, copyOfPlan, installPlanLens, lensGeometry, sanitizeCopy } from './planLens'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('where the lens and the copy stand', () => {
  it('puts the pointer\'s point in the middle of the lens', () => {
    const r = LENS_SIZE / 2
    const g = lensGeometry(300, 120)
    // Linsen är centrerad på pekaren ...
    expect(g.lens).toEqual({ x: 300 - r, y: 120 - r })
    // ... och kopian, förstorad, har pekarens punkt mitt i linsen: punkt * zoom + förskjutning = mitten.
    expect(300 * g.copy.scale + g.copy.x).toBeCloseTo(r, 5)
    expect(120 * g.copy.scale + g.copy.y).toBeCloseTo(r, 5)
    expect(g.copy.scale).toBe(LENS_ZOOM)
  })
})

/** Ett kitbord: id, roller, tangentbordsstopp och data som får ett bord att fungera. */
function scene(): HTMLElement {
  const el = document.createElement('div')
  el.className = 'f3d-scene'
  el.setAttribute('role', 'group')
  el.setAttribute('aria-label', '3D-planritning')
  el.innerHTML = `<div class="f3d-world" style="--spin: 35deg">
      <div class="f3d-table is-free f3d-pick" id="t-1" data-table-id="abc" role="button" tabindex="0" aria-pressed="false" title="Bord 1">
        <span class="f3d-table-label">1</span>
      </div>
      <span class="plan-label plan-label--3d"><span class="plan-label-text">Entré</span></span>
    </div>
    <p class="f3d-hint">Dra för att rotera</p>
    <div class="plan-lens"><div class="plan-lens-inner">old</div></div>`
  document.body.appendChild(el)
  return el
}

describe('the copy of the plan', () => {
  it('keeps what you see (classes, texts, the spin) and drops what makes it usable', () => {
    const copy = copyOfPlan(scene())

    expect(copy.classList.contains('f3d-scene')).toBe(true)
    expect(copy.classList.contains('plan-lens-copy')).toBe(true)
    expect(copy.querySelector('.f3d-table.is-free')).not.toBeNull()
    expect(copy.querySelector('.f3d-table-label')?.textContent).toBe('1')
    expect(copy.querySelector('.plan-label-text')?.textContent).toBe('Entré')
    expect(copy.querySelector<HTMLElement>('.f3d-world')?.style.getPropertyValue('--spin')).toBe('35deg')

    // Ingen hjälptext, ingen lins i linsen.
    expect(copy.querySelector('.f3d-hint')).toBeNull()
    expect(copy.querySelector('.plan-lens')).toBeNull()

    for (const el of [copy, ...copy.querySelectorAll('*')]) {
      for (const attr of ['id', 'role', 'tabindex', 'title', 'aria-pressed', 'aria-label', 'data-table-id']) {
        expect(el.hasAttribute(attr), `${el.className} ${attr}`).toBe(false)
      }
    }
  })

  it('does not change the real plan', () => {
    const original = scene()
    copyOfPlan(original)
    expect(original.querySelector('.f3d-table')?.getAttribute('data-table-id')).toBe('abc')
    expect(original.querySelector('.f3d-hint')).not.toBeNull()
  })

  it('sanitizes SVG elements too', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('class', 'floor-svg-table')
    rect.setAttribute('data-table-id', 'x')
    rect.setAttribute('role', 'button')
    rect.setAttribute('width', '1')
    svg.appendChild(rect)
    sanitizeCopy(svg)
    expect(rect.hasAttribute('data-table-id')).toBe(false)
    expect(rect.hasAttribute('role')).toBe(false)
    expect(rect.getAttribute('width')).toBe('1')
    expect(rect.getAttribute('class')).toBe('floor-svg-table')
  })
})

function move(target: Element, type: string, x: number, y: number, pointerType = 'mouse') {
  const e = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y })
  Object.defineProperty(e, 'pointerType', { value: pointerType })
  target.dispatchEvent(e)
}

describe('the lens on the page', () => {
  let stop: () => void
  let plan: HTMLElement
  beforeEach(() => {
    plan = scene()
    plan.querySelector('.plan-lens')?.remove()
    plan.getBoundingClientRect = () => ({ left: 100, top: 50, width: 400, height: 300, right: 500, bottom: 350, x: 100, y: 50, toJSON: () => ({}) })
    stop = installPlanLens()
  })
  afterEach(() => stop())

  it('shows a lens inside the plan under the mouse, translated and not translatable', () => {
    move(plan.querySelector('.f3d-table')!, 'pointermove', 250, 150)
    const lens = plan.querySelector<HTMLElement>('.plan-lens')!
    expect(lens).not.toBeNull()
    expect(lens.classList.contains('is-visible')).toBe(true)
    expect(lens.getAttribute('aria-hidden')).toBe('true')
    expect(lens.hasAttribute('inert')).toBe(true)
    expect(lens.getAttribute('translate')).toBe('no')
    // Pekaren är 150, 100 in i planen.
    expect(lens.style.transform).toBe(`translate(${150 - LENS_SIZE / 2}px, ${100 - LENS_SIZE / 2}px)`)
    expect(lens.querySelector('.plan-lens-copy .f3d-table-label')?.textContent).toBe('1')
  })

  it('follows the mouse without making a second lens', () => {
    const table = plan.querySelector('.f3d-table')!
    move(table, 'pointermove', 250, 150)
    move(table, 'pointermove', 300, 200)
    expect(plan.querySelectorAll('.plan-lens').length).toBe(1)
    expect(plan.querySelector<HTMLElement>('.plan-lens')!.style.transform).toBe(
      `translate(${200 - LENS_SIZE / 2}px, ${150 - LENS_SIZE / 2}px)`,
    )
  })

  it('is hidden for a finger or a pen, while dragging, and when the mouse leaves the plan', () => {
    const table = plan.querySelector('.f3d-table')!
    const lens = () => plan.querySelector('.plan-lens')

    move(table, 'pointermove', 250, 150, 'touch')
    expect(lens()?.classList.contains('is-visible') ?? false).toBe(false)

    move(table, 'pointermove', 250, 150)
    expect(lens()?.classList.contains('is-visible')).toBe(true)

    move(table, 'pointerdown', 250, 150) // börjar dra för att vrida
    expect(lens()?.classList.contains('is-visible')).toBe(false)
    move(table, 'pointermove', 260, 150) // dras
    expect(lens()?.classList.contains('is-visible')).toBe(false)
    move(table, 'pointerup', 260, 150)
    move(table, 'pointermove', 262, 150)
    expect(lens()?.classList.contains('is-visible')).toBe(true)

    move(document.body, 'pointermove', 20, 20) // utanför planen
    expect(lens()?.classList.contains('is-visible')).toBe(false)
  })

  it('removes the lens when it is switched off', () => {
    move(plan.querySelector('.f3d-table')!, 'pointermove', 250, 150)
    stop()
    expect(plan.querySelector('.plan-lens')).toBeNull()
    stop = () => {}
  })
})
