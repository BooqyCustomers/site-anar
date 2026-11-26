/**
 * Förstoringsglas på bokningens planritning: för man musen över planen (2D eller 3D) följer en rund lins med och visar
 * stället under pekaren förstorat och tydligare.
 *
 * Linsen är en kopia av planen (kitets DOM, `cloneNode`), skalad `ZOOM` gånger och flyttad så att pekarens punkt hamnar
 * mitt i linsen. Eftersom planen är vektorgrafik (SVG, CSS-transformer) blir kopian skarp, inte en uppsuddad bild.
 * Kopian byggs om när planen ändras (bord valda, planen vriden, nytt bord ledigt). Bara med mus: på en pekskärm finns
 * ingen pekare att hålla över planen. Medan man drar i 3D-planen för att vrida den göms linsen.
 *
 * Kopian gör inget: den är dold för skärmläsare (`aria-hidden`, `inert`), tar inga klick (`pointer-events: none`), har
 * inga id:n, roller, tangentbordsstopp eller data-attribut kvar (så inget i sidan kan ta kopian för ett riktigt bord)
 * och är `translate="no"` (texten är redan översatt i originalet, så kitets översättning ska inte ta den igen).
 *
 * Tas bort när kitet har ett eget förstoringsglas.
 */

const CONTAINERS = '.f3d-scene, .floor-svg-frame'
export const LENS_SIZE = 176
export const LENS_ZOOM = 2.2

/** Var linsen och kopian ska stå, i pixlar, när pekaren är på (px, py) i planens ruta. */
export function lensGeometry(px: number, py: number, size = LENS_SIZE, zoom = LENS_ZOOM) {
  const r = size / 2
  return {
    lens: { x: px - r, y: py - r },
    copy: { x: r - px * zoom, y: r - py * zoom, scale: zoom },
  }
}

const STRIPPED = /^(id|tabindex|role|title|name|aria-.*|data-.*)$/

/** Tar bort allt i kopian som skulle få den att se ut som ett riktigt, användbart bord. */
export function sanitizeCopy(root: Element): void {
  for (const el of [root, ...root.querySelectorAll('*')]) {
    for (const attr of [...el.attributes]) {
      if (STRIPPED.test(attr.name)) el.removeAttribute(attr.name)
    }
  }
}

/** En kopia av planen för linsen, utan linsen själv, hjälptexten och allt som gör den användbar. */
export function copyOfPlan(container: Element): HTMLElement {
  const copy = container.cloneNode(true) as HTMLElement
  copy.querySelectorAll('.plan-lens, .f3d-hint').forEach((n) => n.remove())
  sanitizeCopy(copy)
  copy.classList.add('plan-lens-copy')
  return copy
}

interface LensParts {
  lens: HTMLElement
  inner: HTMLElement
}

function createLens(): LensParts {
  const lens = document.createElement('div')
  lens.className = 'plan-lens'
  lens.setAttribute('aria-hidden', 'true')
  lens.setAttribute('inert', '')
  lens.setAttribute('translate', 'no')
  lens.style.width = `${LENS_SIZE}px`
  lens.style.height = `${LENS_SIZE}px`
  const inner = document.createElement('div')
  inner.className = 'plan-lens-inner'
  lens.appendChild(inner)
  return { lens, inner }
}

/** Sätter igång linsen. Returnerar en funktion som stänger av den och tar bort den. */
export function installPlanLens(): () => void {
  if (typeof window === 'undefined') return () => {}

  let parts: LensParts | null = null
  let container: Element | null = null
  let dirty = true
  let pressed = false
  let last: { x: number; y: number } | null = null
  let frame = 0

  const observer = new MutationObserver((records) => {
    const outside = records.some((r) => {
      const el = r.target instanceof Element ? r.target : r.target.parentElement
      return !el?.closest('.plan-lens')
    })
    if (!outside) return
    dirty = true
    if (parts?.lens.classList.contains('is-visible') && !frame) frame = requestAnimationFrame(refresh)
  })

  function hide() {
    parts?.lens.classList.remove('is-visible')
  }

  function attach(next: Element) {
    if (container === next && parts?.lens.parentElement === next) return
    observer.disconnect()
    parts?.lens.remove()
    parts ??= createLens()
    container = next
    next.appendChild(parts.lens)
    observer.observe(next, { subtree: true, childList: true, attributes: true, characterData: true })
    dirty = true
  }

  function show(next: Element, x: number, y: number) {
    attach(next)
    if (!parts) return
    if (dirty) {
      parts.inner.replaceChildren(copyOfPlan(next))
      dirty = false
    }
    const rect = next.getBoundingClientRect()
    const g = lensGeometry(x - rect.left, y - rect.top)
    parts.lens.style.transform = `translate(${g.lens.x}px, ${g.lens.y}px)`
    parts.inner.style.width = `${rect.width}px`
    parts.inner.style.height = `${rect.height}px`
    parts.inner.style.transform = `translate(${g.copy.x}px, ${g.copy.y}px) scale(${g.copy.scale})`
    parts.lens.classList.add('is-visible')
  }

  function refresh() {
    frame = 0
    if (container?.isConnected && last && !pressed) show(container, last.x, last.y)
  }

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return hide()
    const target = e.target instanceof Element ? e.target.closest(CONTAINERS) : null
    // Inzoomad plan (zoomknapparna, planZoom.ts): kopian har ingen rullning, så ingen lins då.
    if (!target || pressed || target.closest('.floor-wrap[data-plan-zoom]')) return hide()
    last = { x: e.clientX, y: e.clientY }
    show(target, e.clientX, e.clientY)
  }
  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    if (e.target instanceof Element && e.target.closest(CONTAINERS)) {
      pressed = true
      hide()
    }
  }
  const onUp = () => {
    pressed = false
  }
  const onLeave = () => {
    last = null
    hide()
  }
  // Sidan rullar under en stillastående pekare: planen flyttas, linsen ska följa med.
  const onScroll = () => {
    if (parts?.lens.classList.contains('is-visible') && !frame) frame = requestAnimationFrame(refresh)
  }

  document.addEventListener('pointermove', onMove, true)
  document.addEventListener('pointerdown', onDown, true)
  document.addEventListener('pointerup', onUp, true)
  document.addEventListener('pointercancel', onUp, true)
  document.documentElement.addEventListener('mouseleave', onLeave)
  window.addEventListener('scroll', onScroll, { passive: true })

  return () => {
    document.removeEventListener('pointermove', onMove, true)
    document.removeEventListener('pointerdown', onDown, true)
    document.removeEventListener('pointerup', onUp, true)
    document.removeEventListener('pointercancel', onUp, true)
    document.documentElement.removeEventListener('mouseleave', onLeave)
    window.removeEventListener('scroll', onScroll)
    observer.disconnect()
    if (frame) cancelAnimationFrame(frame)
    parts?.lens.remove()
  }
}
