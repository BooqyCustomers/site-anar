import { useCallback, useEffect, useMemo, useRef } from 'react'
import { glideTo } from './glide'
import { DELAYS, NEXT_TARGET } from './guidedFlow'
import type { StepId, TargetId } from './guidedFlow'

/**
 * Får cateringformuläret att gå vidare av sig självt: när gästen fyllt i ett steg och varit stilla en liten stund rullar
 * sidan mjukt till nästa del (guidedFlow.ts har stegen och reglerna).
 *
 * Händelsestyrt: bara steget gästen just ändrat något i får flytta sidan (`touch`). Det gör att sidan aldrig rycker iväg
 * för ett steg längre ner som råkar vara klart, och aldrig hoppar tillbaka när gästen går upp och ändrar något.
 *
 * - Varje steg går vidare högst en gång av sig självt (ändrar gästen antalet gäster en gång till, rullar inte sidan igen).
 * - Rullar gästen själv (mushjul, finger, PageDown, Home, End) efter sin ändring väntar sidan: gästen styr.
 * - Skriver gästen fortfarande i "Önskemål" (sista fältet i "Dina uppgifter") väntar den med att gå vidare.
 * - Fältet gästen skrev i lämnas (så att tangentbordet på en telefon stängs och nästa del syns hel), men bara om det
 *   fortfarande har fokus: har gästen gått vidare till ett annat fält rörs inte fokus.
 * - Knappen "Gå vidare" (`advance`) går vidare direkt, även om steget redan gått vidare en gång.
 */

export interface GuidedScroll {
  /** Gästen har ändrat något i steget: gå vidare när steget är klart och det varit stilla `delay` ms (annars stegets vanliga paus). */
  touch: (step: StepId, delay?: number) => void
  /** Gå vidare nu, till steget efter `step`. */
  advance: (step: StepId) => void
}

/** Så ofta ett skrivande i "Önskemål" kontrolleras igen innan sidan går vidare. */
const RETRY_MS = 1500

export function useGuidedScroll(done: Record<StepId, boolean>, resolve: (target: TargetId) => HTMLElement | null): GuidedScroll {
  // Senaste värdena, så att en timer som startade vid gästens ändring ser vad som är klart när den går av.
  const doneRef = useRef(done)
  const resolveRef = useRef(resolve)
  useEffect(() => {
    doneRef.current = done
    resolveRef.current = resolve
  })

  const advanced = useRef(new Set<StepId>())
  const timers = useRef(new Map<StepId, number>())
  const lastManualScroll = useRef(0)

  useEffect(() => {
    const note = () => {
      lastManualScroll.current = Date.now()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'PageDown' || e.key === 'PageUp' || e.key === 'Home' || e.key === 'End') note()
    }
    window.addEventListener('wheel', note, { passive: true })
    window.addEventListener('touchmove', note, { passive: true })
    window.addEventListener('keydown', onKey)
    const pending = timers.current
    return () => {
      window.removeEventListener('wheel', note)
      window.removeEventListener('touchmove', note)
      window.removeEventListener('keydown', onKey)
      for (const id of pending.values()) window.clearTimeout(id)
      pending.clear()
    }
  }, [])

  /** `source`: fältet som hade fokus när gästen gjorde sin ändring (eller tryckte på knappen). */
  const go = useCallback((step: StepId, source: Element | null) => {
    const target = resolveRef.current(NEXT_TARGET[step])
    if (!target) return
    advanced.current.add(step)
    // Tangentbordet på en telefon täcker halva skärmen: lämna fältet så att nästa del syns hel. Bara fältet gästen skrev i,
    // och bara om hen är kvar i det: hos en som tabbar eller redan gått vidare får fokus vara där det är.
    const active = document.activeElement
    if (active && active === source && (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) active.blur()
    // Rullningen startar i nästa tick: sker det i en tangent- eller musapåverkan (Enter i antalsfältet) skulle samma händelse
    // räknas som att gästen avbryter den (glide.ts avbryter vid tangenttryck och tryck).
    // Kalkylen är en klistrad kolumn på en dator och syns redan: då behövs ingen rullning.
    window.setTimeout(() => void glideTo(target, { skipIfInView: NEXT_TARGET[step] === 'send' }), 0)
  }, [])

  const schedule = useCallback(
    (step: StepId, delay: number, touchedAt: number, source: Element | null) => {
      function attempt() {
        timers.current.delete(step)
        if (advanced.current.has(step) || !doneRef.current[step]) return
        if (lastManualScroll.current > touchedAt) return
        if (typeof document !== 'undefined' && document.hidden) return
        if (step === 'details' && document.activeElement instanceof HTMLTextAreaElement) {
          timers.current.set(step, window.setTimeout(attempt, RETRY_MS))
          return
        }
        go(step, source)
      }
      timers.current.set(step, window.setTimeout(attempt, delay))
    },
    [go],
  )

  const touch = useCallback(
    (step: StepId, delay: number = DELAYS[step]) => {
      if (advanced.current.has(step)) return
      window.clearTimeout(timers.current.get(step))
      schedule(step, delay, Date.now(), document.activeElement)
    },
    [schedule],
  )

  const advance = useCallback(
    (step: StepId) => {
      window.clearTimeout(timers.current.get(step))
      timers.current.delete(step)
      go(step, document.activeElement)
    },
    [go],
  )

  return useMemo(() => ({ touch, advance }), [touch, advance])
}
