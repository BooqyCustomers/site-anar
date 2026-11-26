/**
 * Zoomknappar (+ och -) på bokningens planritning, för mobil och pekskärm (CSS visar dem bara under 700 px bredd eller
 * med pekskärm; med mus finns förstoringsglaset, planLens.ts). Kitets 3D-plan har ingen zoom alls ("ingen zoom, varken
 * via mus-hjul eller knappar", FloorPlan3D.tsx) och 2D-planen skalas bara ner för att få plats.
 *
 * Nivåerna är 1, 1,5, 2 och 3 gånger. Bryggan ändrar bara en CSS-variabel (`--plan-zoom`) och ett attribut
 * (`data-plan-zoom`) på planens ruta (`.floor-wrap`), och planritningens eget utseende styrs av plan-zoom.css:
 *
 * - 2D: SVG:n blir `--plan-zoom` gånger större inuti sin ruta, som får rulla. Man flyttar planen med fingret (vanlig
 *   rullning) och bordstryck fungerar som förut. Zoomen håller planens mitt kvar när nivån ändras.
 * - 3D: scenen skalas runt mitten (CSS-egenskapen `scale`, som läggs före kitets egen transform). Sidledsdrag vrider som
 *   förut (kitet läser bara x), och ett upp-och-ner-drag flyttar planen (`--plan-pan`), eftersom kitet inte använder
 *   den axeln. Ett drag som flyttat planen räknas inte som ett tryck på ett bord under fingret.
 *
 * Vald nivå kommer ihåg tills sidan laddas om (byte mellan 2D och 3D behåller den). Tas bort när kitet har egen zoom.
 */

export const ZOOM_LEVELS = [1, 1.5, 2, 3] as const
/** Så långt ett drag får röra sig innan det räknas som en flytt av planen och inte som ett tryck. */
const PAN_THRESHOLD_PX = 6

let index = 0

export const getZoom = (): number => ZOOM_LEVELS[index]
export function resetZoom(): void {
  index = 0
}

/** Nästa nivå, åt det håll knappen pekar; stannar vid ändarna. */
export function stepZoom(current: number, direction: 1 | -1): number {
  const at = ZOOM_LEVELS.findIndex((z) => z === current)
  const next = Math.min(ZOOM_LEVELS.length - 1, Math.max(0, (at < 0 ? 0 : at) + direction))
  return ZOOM_LEVELS[next]
}

/** Hur långt 3D-planen får flyttas upp eller ner: så mycket som zoomen gör den större än rutan. */
export function panLimit(zoom: number, sceneHeight: number): number {
  return Math.max(0, ((zoom - 1) * sceneHeight) / 2)
}

export const clampPan = (pan: number, zoom: number, sceneHeight: number): number => {
  const limit = panLimit(zoom, sceneHeight)
  return Math.max(-limit, Math.min(limit, pan))
}

const ICONS = {
  in: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>',
  out: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>',
}

function buildControls(): HTMLElement {
  const group = document.createElement('div')
  group.className = 'plan-zoom'
  group.setAttribute('role', 'group')
  group.setAttribute('aria-label', 'Zoom')
  for (const [dir, label] of [
    ['in', 'Zooma in'],
    ['out', 'Zooma ut'],
  ] as const) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'plan-zoom-button'
    button.dataset.zoom = dir
    button.setAttribute('aria-label', label)
    button.innerHTML = ICONS[dir]
    group.appendChild(button)
  }
  return group
}

const frameZoom = new WeakMap<Element, number>()

/** 2D: var i rutans innehåll mitten av det som syns ligger (0 till 1), innan storleken ändras. */
function centerOf(frame: HTMLElement): { x: number; y: number } {
  return {
    x: (frame.scrollLeft + frame.clientWidth / 2) / (frame.scrollWidth || 1),
    y: (frame.scrollTop + frame.clientHeight / 2) / (frame.scrollHeight || 1),
  }
}

/** 2D: efter storleksändringen, ställ rutan så att samma punkt ligger mitt i den. */
function restoreCenter(frame: HTMLElement, center: { x: number; y: number }): void {
  frame.scrollLeft = center.x * frame.scrollWidth - frame.clientWidth / 2
  frame.scrollTop = center.y * frame.scrollHeight - frame.clientHeight / 2
}

/** Lägger zoomen på alla planer och sätter in knapparna. Säker att köra många gånger. */
export function syncZoom(root: ParentNode = document): void {
  const zoom = getZoom()
  for (const wrap of root.querySelectorAll<HTMLElement>('.floor-wrap')) {
    if (wrap.closest('.plan-lens')) continue
    if (!wrap.querySelector('.f3d-scene, .floor-svg-frame')) continue

    let controls = wrap.querySelector<HTMLElement>(':scope > .plan-zoom')
    if (!controls) {
      controls = buildControls()
      wrap.appendChild(controls)
    }
    const [zoomIn, zoomOut] = controls.querySelectorAll<HTMLButtonElement>('button')
    zoomIn.disabled = zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]
    zoomOut.disabled = zoom <= 1

    const frame = wrap.querySelector<HTMLElement>(':scope > .floor-svg-frame')
    // 2D: mitten av det som syns ska ligga kvar när storleken ändras, så mät den innan variabeln sätts.
    const center = frame && frameZoom.get(frame) !== zoom ? centerOf(frame) : null
    if (zoom > 1) {
      if (wrap.style.getPropertyValue('--plan-zoom') !== String(zoom)) wrap.style.setProperty('--plan-zoom', String(zoom))
      if (wrap.getAttribute('data-plan-zoom') !== String(zoom)) wrap.setAttribute('data-plan-zoom', String(zoom))
    } else {
      wrap.style.removeProperty('--plan-zoom')
      wrap.style.removeProperty('--plan-pan')
      wrap.removeAttribute('data-plan-zoom')
    }
    if (frame) {
      if (center) restoreCenter(frame, center)
      frameZoom.set(frame, zoom)
    }
    // Flytten ryms bara så länge zoomen gör planen större än rutan.
    const scene = wrap.querySelector<HTMLElement>(':scope > .f3d-scene')
    const pan = Number.parseFloat(wrap.style.getPropertyValue('--plan-pan'))
    if (scene && Number.isFinite(pan)) {
      const clamped = clampPan(pan, zoom, scene.clientHeight)
      if (clamped !== pan) wrap.style.setProperty('--plan-pan', `${clamped}px`)
    }
  }
}

/** Sätter igång knapparna och flytten av 3D-planen. Returnerar en funktion som stänger av dem. */
export function installPlanZoom(): () => void {
  if (typeof window === 'undefined') return () => {}
  let frame = 0
  const schedule = () => {
    if (!frame) {
      frame = requestAnimationFrame(() => {
        frame = 0
        syncZoom()
      })
    }
  }

  let suppressClick = false
  let pan: { wrap: HTMLElement; scene: HTMLElement; startY: number; startPan: number; id: number; moved: boolean } | null = null

  const onClick = (e: MouseEvent) => {
    const target = e.target as Element | null
    if (suppressClick) {
      suppressClick = false
      // Bara klicket inne i 3D-scenen, där draget började, räknas som en del av draget.
      if (target?.closest('.f3d-scene')) {
        e.stopPropagation()
        e.preventDefault()
        return
      }
    }
    const button = target?.closest<HTMLElement>('.plan-zoom-button')
    if (!button) return
    const next = stepZoom(getZoom(), button.dataset.zoom === 'in' ? 1 : -1)
    index = ZOOM_LEVELS.findIndex((z) => z === next)
    syncZoom()
  }

  // 3D: flytta planen upp och ner när den är inzoomad. Kitets egen dragning vrider vid sidledsdrag och rör inte y.
  const onDown = (e: PointerEvent) => {
    const scene = e.target instanceof Element ? e.target.closest<HTMLElement>('.f3d-scene') : null
    const wrap = scene?.closest<HTMLElement>('.floor-wrap[data-plan-zoom]')
    if (!scene || !wrap || scene.closest('.plan-lens')) return
    const startPan = Number.parseFloat(wrap.style.getPropertyValue('--plan-pan'))
    pan = { wrap, scene, startY: e.clientY, startPan: Number.isFinite(startPan) ? startPan : 0, id: e.pointerId, moved: false }
    suppressClick = false
  }
  const onMove = (e: PointerEvent) => {
    if (!pan || e.pointerId !== pan.id) return
    const dy = e.clientY - pan.startY
    if (!pan.moved) {
      if (Math.abs(dy) < PAN_THRESHOLD_PX) return
      pan.moved = true
    }
    const next = clampPan(pan.startPan + dy, getZoom(), pan.scene.clientHeight)
    pan.wrap.style.setProperty('--plan-pan', `${next}px`)
  }
  const onUp = (e: PointerEvent) => {
    if (!pan || e.pointerId !== pan.id) return
    // Klicket som följer på ett drag ska inte välja bordet under fingret.
    suppressClick = pan.moved
    pan = null
    if (suppressClick) window.setTimeout(() => (suppressClick = false), 60)
  }

  const observer = new MutationObserver(schedule)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  document.addEventListener('click', onClick, true)
  document.addEventListener('pointerdown', onDown, true)
  document.addEventListener('pointermove', onMove, true)
  document.addEventListener('pointerup', onUp, true)
  document.addEventListener('pointercancel', onUp, true)
  syncZoom()

  return () => {
    observer.disconnect()
    document.removeEventListener('click', onClick, true)
    document.removeEventListener('pointerdown', onDown, true)
    document.removeEventListener('pointermove', onMove, true)
    document.removeEventListener('pointerup', onUp, true)
    document.removeEventListener('pointercancel', onUp, true)
    if (frame) cancelAnimationFrame(frame)
    document.querySelectorAll('.plan-zoom').forEach((n) => n.remove())
  }
}
