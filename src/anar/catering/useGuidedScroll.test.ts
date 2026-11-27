import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { glideTo } from './glide'
import { DELAYS, QUICK_DELAY } from './guidedFlow'
import type { StepId, TargetId } from './guidedFlow'
import { useGuidedScroll } from './useGuidedScroll'

vi.mock('./glide', () => ({ glideTo: vi.fn(async () => true) }))
const glide = vi.mocked(glideTo)

const NONE: Record<StepId, boolean> = { guests: false, parts: false, dishes: false, when: false, details: false }
const targets: Record<TargetId, HTMLElement> = {} as Record<TargetId, HTMLElement>
const resolve = (t: TargetId) => targets[t] ?? null

beforeEach(() => {
  vi.useFakeTimers()
  glide.mockClear()
  for (const id of ['parts', 'dishes', 'when', 'details', 'send'] as const) {
    targets[id] = document.createElement(id === 'send' ? 'aside' : 'section')
    document.body.appendChild(targets[id])
  }
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

function setup(done: Partial<Record<StepId, boolean>>) {
  const hook = renderHook((props: { done: Record<StepId, boolean> }) => useGuidedScroll(props.done, resolve), {
    initialProps: { done: { ...NONE, ...done } },
  })
  return { ...hook, set: (patch: Partial<Record<StepId, boolean>>) => hook.rerender({ done: { ...NONE, ...patch } }) }
}

// En millisekund extra: rullningen startar i nästa tick (useGuidedScroll.ts), och en 0-ms-timer inne i en tick räknas som 1 ms.
const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms)
    vi.advanceTimersByTime(1)
  })

describe('goes on by itself', () => {
  it('rolls to the next part after the pause, when the step is done', () => {
    const { result } = setup({ guests: true })
    act(() => result.current.touch('guests'))
    wait(DELAYS.guests - 1)
    expect(glide).not.toHaveBeenCalled()
    wait(1)
    expect(glide).toHaveBeenCalledOnce()
    expect(glide.mock.calls[0][0]).toBe(targets.parts)
  })

  it('goes through every step in order, each to its own part, ending at the Kalkyl', () => {
    const { result } = setup({ guests: true, parts: true, dishes: true, when: true, details: true })
    for (const step of ['guests', 'parts', 'dishes', 'when', 'details'] as const) {
      act(() => result.current.touch(step))
      wait(DELAYS[step])
    }
    expect(glide.mock.calls.map(([el]) => el)).toEqual([targets.parts, targets.dishes, targets.when, targets.details, targets.send])
  })

  it('waits while the guest keeps changing things: every change starts the pause again', () => {
    const { result } = setup({ guests: true })
    act(() => result.current.touch('guests'))
    wait(1000)
    act(() => result.current.touch('guests')) // en siffra till
    wait(1000)
    expect(glide).not.toHaveBeenCalled()
    wait(500)
    expect(glide).toHaveBeenCalledOnce()
  })

  it('does not go on while the step is not done, and goes on when it becomes done', () => {
    const { result, set } = setup({})
    act(() => result.current.touch('dishes'))
    wait(DELAYS.dishes + 100)
    expect(glide).not.toHaveBeenCalled()

    set({ dishes: true })
    act(() => result.current.touch('dishes'))
    wait(DELAYS.dishes)
    expect(glide).toHaveBeenCalledOnce()
  })

  it('looks at what is done when the pause is over, not when the guest made the change', () => {
    const { result, set } = setup({})
    act(() => result.current.touch('when'))
    wait(300)
    set({ when: true }) // klart under pausen
    wait(DELAYS.when)
    expect(glide).toHaveBeenCalledOnce()
  })

  it('uses a shorter pause for a button choice', () => {
    const { result } = setup({ when: true })
    act(() => result.current.touch('when', QUICK_DELAY))
    wait(QUICK_DELAY)
    expect(glide).toHaveBeenCalledOnce()
  })
})

describe('keeps out of the way', () => {
  it('goes on only once per step: changing the guests again does not roll the page', () => {
    const { result } = setup({ guests: true })
    act(() => result.current.touch('guests'))
    wait(DELAYS.guests)
    act(() => result.current.touch('guests'))
    wait(DELAYS.guests * 2)
    expect(glide).toHaveBeenCalledOnce()
  })

  it('does not roll the page for a step the guest did not touch', () => {
    setup({ guests: true, parts: true, dishes: true, when: true, details: true })
    wait(10_000)
    expect(glide).not.toHaveBeenCalled()
  })

  it('stays where it is when the guest has scrolled by themselves after the change', () => {
    const { result } = setup({ guests: true })
    act(() => result.current.touch('guests'))
    wait(500)
    window.dispatchEvent(new Event('wheel'))
    wait(DELAYS.guests)
    expect(glide).not.toHaveBeenCalled()
    // en ny ändring efteråt får sidan gå vidare som vanligt
    wait(10)
    act(() => result.current.touch('guests'))
    wait(DELAYS.guests)
    expect(glide).toHaveBeenCalledOnce()
  })

  it('treats PageDown and End like scrolling, but ordinary typing is not scrolling', () => {
    const { result } = setup({ guests: true })
    act(() => result.current.touch('guests'))
    wait(300)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }))
    wait(DELAYS.guests)
    expect(glide).toHaveBeenCalledOnce()

    glide.mockClear()
    const second = setup({ parts: true })
    act(() => second.result.current.touch('parts'))
    wait(300)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown' }))
    wait(DELAYS.parts)
    expect(glide).not.toHaveBeenCalled()
  })

  it('waits while the guest is still writing a wish in the last field of the details', () => {
    const { result } = setup({ details: true })
    const notes = document.createElement('textarea')
    document.body.appendChild(notes)
    notes.focus()
    act(() => result.current.touch('details'))
    wait(DELAYS.details + 3000)
    expect(glide).not.toHaveBeenCalled()
    notes.blur()
    wait(1500)
    expect(glide).toHaveBeenCalledOnce()
  })

  it('lets go of a text field so that the keyboard on a phone closes', () => {
    const { result } = setup({ guests: true })
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    expect(document.activeElement).toBe(input)
    act(() => result.current.touch('guests'))
    wait(DELAYS.guests)
    expect(document.activeElement).not.toBe(input)
  })

  it('does not take focus from another field the guest has moved on to (a keyboard user tabbing on)', () => {
    const { result } = setup({ guests: true })
    const guests = document.createElement('input')
    const next = document.createElement('input')
    document.body.append(guests, next)
    guests.focus()
    act(() => result.current.touch('guests'))
    next.focus() // gästen tabbar vidare under pausen
    wait(DELAYS.guests)
    expect(glide).toHaveBeenCalledOnce() // sidan går ändå vidare
    expect(document.activeElement).toBe(next) // men fokus rörs inte
  })

  it('does nothing when the next part is not on the page yet, and tries again at the next change', () => {
    const { result } = setup({ parts: true })
    const dishes = targets.dishes
    delete (targets as Partial<typeof targets>).dishes
    act(() => result.current.touch('parts'))
    wait(DELAYS.parts)
    expect(glide).not.toHaveBeenCalled()

    targets.dishes = dishes
    act(() => result.current.touch('parts'))
    wait(DELAYS.parts)
    expect(glide).toHaveBeenCalledOnce()
  })

  it('stops all waiting when the page is left', () => {
    const { result, unmount } = setup({ guests: true })
    act(() => result.current.touch('guests'))
    unmount()
    wait(DELAYS.guests * 2)
    expect(glide).not.toHaveBeenCalled()
  })

  it('skips the roll to the Kalkyl when it is already in view (checked by glideTo)', () => {
    const { result } = setup({ details: true })
    act(() => result.current.touch('details'))
    wait(DELAYS.details)
    expect(glide).toHaveBeenCalledWith(targets.send, { skipIfInView: true })
  })
})

describe('a key press that goes on', () => {
  it('starts the roll after the key press is over, so that the same key press does not stop it', () => {
    const { result } = setup({ guests: true })
    act(() => result.current.advance('guests'))
    expect(glide).not.toHaveBeenCalled() // inte inne i händelsen
    wait(0)
    expect(glide).toHaveBeenCalledOnce()
  })
})

describe('the button', () => {
  it('goes on at once, even when the step has already gone on by itself, and never stops the next time', () => {
    const { result } = setup({ dishes: true })
    act(() => result.current.touch('dishes'))
    wait(DELAYS.dishes)
    expect(glide).toHaveBeenCalledOnce()

    act(() => result.current.advance('dishes'))
    wait(0) // rullningen startar i nästa tick
    expect(glide).toHaveBeenCalledTimes(2)
    expect(glide.mock.calls[1][0]).toBe(targets.when)
  })

  it('cancels the pause that was running, so the page does not roll twice', () => {
    const { result } = setup({ dishes: true })
    act(() => result.current.touch('dishes'))
    wait(500)
    act(() => result.current.advance('dishes'))
    wait(DELAYS.dishes * 2)
    expect(glide).toHaveBeenCalledOnce()
  })
})
