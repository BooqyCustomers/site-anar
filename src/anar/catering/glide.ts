/**
 * Mjuk rullning till ett element, för cateringformulärets "gå vidare till nästa steg" (guidedFlow.ts).
 *
 * Kitet har en egen (glideTo i bokningen) men exporterar den inte, så här är en liten motsvarighet med samma idé:
 * egen easing i stället för webbläsarens `scrollIntoView({ behavior: 'smooth' })`, som i vissa webbläsare hoppar på en
 * enda bildruta, och rullningen avbryts direkt om gästen själv rullar, trycker eller skriver. Med reducerad rörelse
 * flyttas sidan utan animation.
 *
 * Sidan rullar nedåt när formuläret går vidare, och Header.jsx gömmer sig då (useHideOnScroll), så elementets överkant
 * läggs `OFFSET_PX` under fönstrets överkant utan att räkna med headern.
 */

/** Avstånd mellan fönstrets överkant och elementets överkant när rullningen är klar. */
export const OFFSET_PX = 20

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

/** Lugn start, snabb mitt, mjuk landning. */
const easeInOutCubic = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Gästens egna rörelser som avbryter en pågående rullning. */
const INTERRUPTS = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const

let stopActive: (() => void) | null = null

/** Är minst `share` av elementets höjd redan synlig, och ligger dess överkant i fönstrets övre del? */
function mostlyInView(el: HTMLElement, share = 0.6): boolean {
  const rect = el.getBoundingClientRect()
  const height = Math.max(1, rect.height)
  const visible = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)
  return rect.top >= 0 && rect.top < window.innerHeight * 0.6 && visible / Math.min(height, window.innerHeight) >= share
}

export interface GlideOptions {
  duration?: number
  /** Rulla inte om elementet redan är i stort sett synligt (en klistrad kolumn som Kalkylen behöver ingen rullning). */
  skipIfInView?: boolean
}

/**
 * Rullar så att `el` hamnar högst upp. Löser sig med true när rullningen kom fram, false när den avbröts av gästen eller
 * inte behövdes.
 */
export function glideTo(el: HTMLElement | null | undefined, { duration = 650, skipIfInView = false }: GlideOptions = {}): Promise<boolean> {
  if (!el || typeof window === 'undefined') return Promise.resolve(false)
  stopActive?.()
  if (skipIfInView && mostlyInView(el)) return Promise.resolve(false)

  const root = (document.scrollingElement ?? document.documentElement) as HTMLElement
  const from = window.scrollY
  const max = Math.max(0, root.scrollHeight - window.innerHeight)
  const to = Math.max(0, Math.min(max, from + el.getBoundingClientRect().top - OFFSET_PX))
  if (Math.abs(to - from) < 1) return Promise.resolve(false)

  const jump = (top: number) => window.scrollTo({ top, behavior: 'instant' as ScrollBehavior })
  if (prefersReducedMotion() || duration <= 0 || typeof requestAnimationFrame !== 'function') {
    jump(to)
    return Promise.resolve(true)
  }

  return new Promise((resolve) => {
    const start = performance.now()
    let frame = 0
    const finish = (arrived: boolean) => {
      cancelAnimationFrame(frame)
      for (const type of INTERRUPTS) window.removeEventListener(type, interrupt)
      if (stopActive === interrupt) stopActive = null
      resolve(arrived)
    }
    const interrupt = () => finish(false)
    for (const type of INTERRUPTS) window.addEventListener(type, interrupt, { passive: true })
    stopActive = interrupt
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      jump(from + (to - from) * easeInOutCubic(t))
      if (t < 1) frame = requestAnimationFrame(step)
      else finish(true)
    }
    frame = requestAnimationFrame(step)
  })
}
