import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ZOOM_LEVELS, clampPan, getZoom, installPlanZoom, panLimit, resetZoom, stepZoom, syncZoom } from './planZoom'

describe('zoom levels', () => {
  it('steps up and down through 1, 1.5, 2 and 3 and stops at the ends', () => {
    expect([...ZOOM_LEVELS]).toEqual([1, 1.5, 2, 3])
    expect(stepZoom(1, 1)).toBe(1.5)
    expect(stepZoom(1.5, 1)).toBe(2)
    expect(stepZoom(2, 1)).toBe(3)
    expect(stepZoom(3, 1)).toBe(3)
    expect(stepZoom(3, -1)).toBe(2)
    expect(stepZoom(1.5, -1)).toBe(1)
    expect(stepZoom(1, -1)).toBe(1)
  })

  it('lets the 3D plan move only as far as the zoom makes it bigger than the box', () => {
    expect(panLimit(1, 400)).toBe(0)
    expect(panLimit(2, 400)).toBe(200)
    expect(panLimit(3, 400)).toBe(400)
    expect(clampPan(500, 2, 400)).toBe(200)
    expect(clampPan(-500, 2, 400)).toBe(-200)
    expect(clampPan(60, 2, 400)).toBe(60)
    expect(clampPan(60, 1, 400)).toBe(0)
  })
})

/** Kitets 2D- eller 3D-plan i sin ruta. */
function plan(kind: '2d' | '3d'): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'floor-wrap'
  wrap.innerHTML =
    kind === '2d'
      ? '<div class="floor-svg-frame"><svg class="floor-svg"></svg></div>'
      : '<div class="f3d-scene"><div class="f3d-world"><div class="f3d-table"></div></div></div>'
  document.body.appendChild(wrap)
  return wrap
}

const buttons = (wrap: Element) => {
  const [zoomIn, zoomOut] = wrap.querySelectorAll<HTMLButtonElement>('.plan-zoom-button')
  return { zoomIn, zoomOut }
}
const press = (el: Element) => el.dispatchEvent(new MouseEvent('click', { bubbles: true }))

let stop: () => void = () => {}
beforeEach(() => resetZoom())
afterEach(() => {
  stop()
  stop = () => {}
  document.body.innerHTML = ''
})

describe('the zoom buttons', () => {
  it('puts one pair of buttons on each plan, named for screen readers, once', () => {
    const wrap = plan('2d')
    syncZoom()
    syncZoom()
    expect(wrap.querySelectorAll('.plan-zoom').length).toBe(1)
    const { zoomIn, zoomOut } = buttons(wrap)
    expect(zoomIn.getAttribute('aria-label')).toBe('Zooma in')
    expect(zoomOut.getAttribute('aria-label')).toBe('Zooma ut')
    expect(zoomIn.disabled).toBe(false)
    expect(zoomOut.disabled).toBe(true) // ingen mindre än hela planen
  })

  it('zooms in and out, and the plan is back to normal at 1', () => {
    const wrap = plan('2d')
    stop = installPlanZoom()
    const { zoomIn, zoomOut } = buttons(wrap)
    expect(wrap.hasAttribute('data-plan-zoom')).toBe(false)

    press(zoomIn)
    expect(getZoom()).toBe(1.5)
    expect(wrap.getAttribute('data-plan-zoom')).toBe('1.5')
    expect(wrap.style.getPropertyValue('--plan-zoom')).toBe('1.5')
    expect(zoomOut.disabled).toBe(false)

    press(zoomIn)
    press(zoomIn)
    expect(getZoom()).toBe(3)
    expect(zoomIn.disabled).toBe(true)
    press(zoomIn) // stannar vid största nivån
    expect(getZoom()).toBe(3)

    press(zoomOut)
    press(zoomOut)
    press(zoomOut)
    expect(getZoom()).toBe(1)
    expect(wrap.hasAttribute('data-plan-zoom')).toBe(false)
    expect(wrap.style.getPropertyValue('--plan-zoom')).toBe('')
    expect(zoomOut.disabled).toBe(true)
  })

  it('keeps the zoom when the kit draws a new plan (2D to 3D)', () => {
    const first = plan('2d')
    stop = installPlanZoom()
    press(buttons(first).zoomIn)
    press(buttons(first).zoomIn)

    first.remove()
    const second = plan('3d')
    syncZoom()
    expect(second.getAttribute('data-plan-zoom')).toBe('2')
    expect(buttons(second).zoomIn.disabled).toBe(false)
  })

  it('ignores copies of the plan inside the magnifying lens', () => {
    const host = document.createElement('div')
    host.className = 'plan-lens'
    document.body.appendChild(host)
    const copy = document.createElement('div')
    copy.className = 'floor-wrap'
    copy.innerHTML = '<div class="floor-svg-frame"></div>'
    host.appendChild(copy)
    syncZoom()
    expect(copy.querySelector('.plan-zoom')).toBeNull()
  })

  it('removes the buttons when it is switched off', () => {
    const wrap = plan('2d')
    stop = installPlanZoom()
    expect(wrap.querySelector('.plan-zoom')).not.toBeNull()
    stop()
    expect(wrap.querySelector('.plan-zoom')).toBeNull()
    stop = () => {}
  })
})

function pointer(target: Element, type: string, y: number, id = 1) {
  const e = new MouseEvent(type, { bubbles: true, clientX: 100, clientY: y })
  Object.defineProperty(e, 'pointerId', { value: id })
  target.dispatchEvent(e)
}

describe('moving the zoomed 3D plan up and down', () => {
  let wrap: HTMLElement
  let table: Element
  let clicks: number

  beforeEach(() => {
    wrap = plan('3d')
    Object.defineProperty(wrap.querySelector('.f3d-scene'), 'clientHeight', { value: 400 })
    table = wrap.querySelector('.f3d-table')!
    clicks = 0
    // Det kitet gör vid ett tryck på ett bord (React lyssnar högre upp i trädet än bordet).
    wrap.addEventListener('click', () => (clicks += 1))
    stop = installPlanZoom()
  })
  const zoomTo = (n: number) => {
    for (let i = 0; i < n; i++) press(buttons(wrap).zoomIn)
  }

  it('does nothing while the plan is not zoomed', () => {
    pointer(table, 'pointerdown', 100)
    pointer(table, 'pointermove', 180)
    pointer(table, 'pointerup', 180)
    expect(wrap.style.getPropertyValue('--plan-pan')).toBe('')
    press(table)
    expect(clicks).toBe(1)
  })

  it('follows a vertical drag, within the room the zoom gives, and the drag does not pick the table under the finger', () => {
    zoomTo(2) // 2 gånger: får flyttas 200 px
    clicks = 0
    pointer(table, 'pointerdown', 100)
    pointer(table, 'pointermove', 140)
    expect(wrap.style.getPropertyValue('--plan-pan')).toBe('40px')
    pointer(table, 'pointermove', 500)
    expect(wrap.style.getPropertyValue('--plan-pan')).toBe('200px')
    pointer(table, 'pointerup', 500)

    press(table) // klicket som följer på draget
    expect(clicks).toBe(0)
    press(table) // ett nytt, riktigt tryck
    expect(clicks).toBe(1)
  })

  it('treats a tiny movement as a tap on the table', () => {
    zoomTo(2)
    clicks = 0
    pointer(table, 'pointerdown', 100)
    pointer(table, 'pointermove', 103)
    pointer(table, 'pointerup', 103)
    expect(wrap.style.getPropertyValue('--plan-pan')).toBe('')
    press(table)
    expect(clicks).toBe(1)
  })

  it('does not swallow a press on a zoom button right after a drag', () => {
    zoomTo(2)
    pointer(table, 'pointerdown', 100)
    pointer(table, 'pointermove', 150)
    pointer(table, 'pointerup', 150)
    press(buttons(wrap).zoomIn)
    expect(getZoom()).toBe(3)
  })

  it('continues from where the plan was left, and goes back to the middle at 1', () => {
    zoomTo(2)
    pointer(table, 'pointerdown', 100)
    pointer(table, 'pointermove', 150)
    pointer(table, 'pointerup', 150)
    pointer(table, 'pointerdown', 300)
    pointer(table, 'pointermove', 320)
    pointer(table, 'pointerup', 320)
    expect(wrap.style.getPropertyValue('--plan-pan')).toBe('70px')

    press(buttons(wrap).zoomOut)
    press(buttons(wrap).zoomOut)
    expect(wrap.style.getPropertyValue('--plan-pan')).toBe('')
  })
})
