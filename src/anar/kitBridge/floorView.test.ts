import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyPreferredView } from './floorView'

function toggle(active: '2d' | '3d') {
  const el = document.createElement('div')
  el.className = 'floor-view-toggle'
  el.innerHTML = `<button aria-pressed="${active === '2d'}">2D</button><button aria-pressed="${active === '3d'}">3D</button>`
  document.body.appendChild(el)
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('floor view', () => {
  it('starts in 2D when the kit draws the plan in 3D', () => {
    const el = toggle('3d')
    const [two, three] = [...el.querySelectorAll('button')]
    const click2d = vi.spyOn(two, 'click')
    const click3d = vi.spyOn(three, 'click')

    applyPreferredView()

    expect(click2d).toHaveBeenCalledOnce()
    expect(click3d).not.toHaveBeenCalled()
  })

  it('does nothing when 2D is already active, and never touches a toggle twice', () => {
    const el = toggle('2d')
    const [two] = [...el.querySelectorAll('button')]
    const click2d = vi.spyOn(two, 'click')

    applyPreferredView()
    applyPreferredView()

    expect(click2d).not.toHaveBeenCalled()
  })
})
