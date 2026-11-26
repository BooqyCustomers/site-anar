import { afterEach, describe, expect, it } from 'vitest'
import { doorName, labelPlans, openingNames } from './planLabels'

const SVG_NS = 'http://www.w3.org/2000/svg'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Kitets 3D-plan: dörrar och fönster är `.f3d-wall.f3d-opening` med klassen f3d-door eller f3d-window. */
function plan3d(doors: number, windows: number): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'floor-wrap'
  const opening = (kind: 'door' | 'window') => `<div class="f3d-wall f3d-opening f3d-${kind}"></div>`
  wrap.innerHTML = `<div class="f3d-scene"><div class="f3d-world"><div class="f3d-plane">
    <div class="f3d-wall"></div>${opening('door').repeat(doors)}${opening('window').repeat(windows)}
  </div></div></div>`
  document.body.appendChild(wrap)
  return wrap
}

/** Kitets 2D-plan: `rect.floor-svg-door` och `rect.floor-svg-window` i en SVG med klassen floor-svg. */
function plan2d(rects: { cls: 'door' | 'window'; x: number; y: number; w: number; h: number }[]): SVGSVGElement {
  const wrap = document.createElement('div')
  wrap.className = 'floor-wrap'
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('class', 'floor-svg')
  for (const r of rects) {
    const rect = document.createElementNS(SVG_NS, 'rect')
    rect.setAttribute('class', `floor-svg-${r.cls}`)
    rect.setAttribute('x', String(r.x))
    rect.setAttribute('y', String(r.y))
    rect.setAttribute('width', String(r.w))
    rect.setAttribute('height', String(r.h))
    svg.appendChild(rect)
  }
  wrap.appendChild(svg)
  document.body.appendChild(wrap)
  return svg
}

const labelsOf = (root: Element, sel: string) => [...root.querySelectorAll(sel)].map((n) => n.textContent)

describe('names from the backend', () => {
  it('names a door after its kind, and any other kind "Dörr"', () => {
    expect(doorName('entrance')).toBe('Entré')
    expect(doorName('kitchen')).toBe('Kök')
    expect(doorName(' Kitchen ')).toBe('Kök')
    expect(doorName('toilet')).toBe('Dörr')
    expect(doorName(undefined)).toBe('Dörr')
    expect(doorName(7)).toBe('Dörr')
  })

  it('lists doors and windows per floor, in the backend order', () => {
    const names = openingNames([
      {
        elements: [
          { type: 'wall' },
          { type: 'door', kind: 'entrance' },
          { type: 'window' },
          { type: 'door', kind: 'kitchen' },
          { type: 'table' },
        ],
      },
      { elements: [{ type: 'door' }] },
    ])
    expect(names).toEqual([
      { doors: ['Entré', 'Kök'], windows: ['Fönster'] },
      { doors: ['Dörr'], windows: [] },
    ])
  })
})

describe('3D plan', () => {
  it('puts the name on each door and window, in order', () => {
    const wrap = plan3d(2, 1)
    labelPlans([{ doors: ['Entré', 'Kök'], windows: ['Fönster'] }])

    const doors = [...wrap.querySelectorAll('.f3d-door')]
    expect(doors.map((d) => d.querySelector('.plan-label-text')?.textContent)).toEqual(['Entré', 'Kök'])
    expect(wrap.querySelector('.f3d-window .plan-label-text')?.textContent).toBe('Fönster')
    // Bara bild: ingen skärmläsartext, ingen klickbar yta.
    expect(wrap.querySelector('.plan-label')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('never doubles a name, however often it runs, even after the text has been translated', () => {
    const wrap = plan3d(1, 0)
    labelPlans([{ doors: ['Entré'], windows: [] }])
    const text = wrap.querySelector('.plan-label-text')!
    text.textContent = 'Entrance' // kitets översättare byter texten på plats
    labelPlans([{ doors: ['Entré'], windows: [] }])
    labelPlans([{ doors: ['Entré'], windows: [] }])

    expect(wrap.querySelectorAll('.plan-label').length).toBe(1)
    expect(wrap.querySelector('.plan-label-text')?.textContent).toBe('Entrance')
  })

  it('names nothing when the plan does not match the data', () => {
    const wrap = plan3d(1, 1)
    labelPlans([{ doors: ['Entré', 'Kök'], windows: ['Fönster'] }])
    expect(wrap.querySelectorAll('.plan-label').length).toBe(0)
  })

  it('names new doors that the kit draws later (another floor)', () => {
    const wrap = plan3d(1, 0)
    labelPlans([{ doors: ['Entré'], windows: [] }])
    wrap.querySelector('.f3d-door')!.replaceWith(Object.assign(document.createElement('div'), { className: 'f3d-wall f3d-opening f3d-door' }))
    labelPlans([{ doors: ['Kök'], windows: [] }])
    expect(labelsOf(wrap, '.plan-label-text')).toEqual(['Kök'])
  })
})

describe('2D plan', () => {
  it('puts the name in the middle of each door and window', () => {
    const svg = plan2d([
      { cls: 'door', x: 4.2, y: 5.86, w: 1.6, h: 0.28 },
      { cls: 'window', x: 0, y: 2, w: 0.2, h: 1.5 },
    ])
    labelPlans([{ doors: ['Entré'], windows: ['Fönster'] }])

    const [door, win] = [...svg.querySelectorAll('text.plan-label-2d')]
    expect(door.textContent).toBe('Entré')
    expect(Number(door.getAttribute('x'))).toBeCloseTo(5, 5)
    expect(Number(door.getAttribute('y'))).toBeCloseTo(6, 5)
    expect(win.textContent).toBe('Fönster')
    expect(Number(win.getAttribute('x'))).toBeCloseTo(0.1, 5)
    expect(Number(win.getAttribute('y'))).toBeCloseTo(2.75, 5)
  })

  it('does not double the names, and removes a name when its door has been redrawn', () => {
    const svg = plan2d([{ cls: 'door', x: 0, y: 0, w: 1, h: 0.2 }])
    labelPlans([{ doors: ['Entré'], windows: [] }])
    labelPlans([{ doors: ['Entré'], windows: [] }])
    expect(svg.querySelectorAll('text.plan-label-2d').length).toBe(1)

    // Kitet ritar en annan våning: den gamla dörren är borta, en ny kommer.
    svg.querySelector('rect')!.remove()
    const next = document.createElementNS(SVG_NS, 'rect')
    next.setAttribute('class', 'floor-svg-door')
    for (const [k, v] of Object.entries({ x: 2, y: 2, width: 1, height: 0.2 })) next.setAttribute(k, String(v))
    svg.appendChild(next)
    labelPlans([{ doors: ['Kök'], windows: [] }])

    expect(labelsOf(svg, 'text.plan-label-2d')).toEqual(['Kök'])
  })
})

describe('several floors', () => {
  function withFloorButtons(active: number): void {
    const toggle = document.createElement('div')
    toggle.className = 'floor-view-toggle'
    const pills = document.createElement('div')
    pills.className = 'filter-row'
    pills.innerHTML = [0, 1]
      .map((i) => `<button class="filter-pill" aria-pressed="${i === active}">Våning ${i}</button>`)
      .join('')
    const wrap = document.querySelector('.floor-wrap')!
    wrap.before(pills, toggle)
  }

  it('uses the names of the floor whose button is active', () => {
    const wrap = plan3d(1, 0)
    withFloorButtons(1)
    labelPlans([
      { doors: ['Entré'], windows: [] },
      { doors: ['Kök'], windows: [] },
    ])
    expect(labelsOf(wrap, '.plan-label-text')).toEqual(['Kök'])
  })

  it('names nothing when it cannot tell which floor is shown', () => {
    const wrap = plan3d(1, 0)
    labelPlans([
      { doors: ['Entré'], windows: [] },
      { doors: ['Kök'], windows: [] },
    ])
    expect(wrap.querySelectorAll('.plan-label').length).toBe(0)
  })
})
