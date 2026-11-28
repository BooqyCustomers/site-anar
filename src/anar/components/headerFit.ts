import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { flushSync } from 'react-dom'

/**
 * Får Anars länkar plats på en rad? Mäts på riktigt i stället för att gissas
 * med brytpunkter, så att det fungerar i alla fem språk och på alla bredder.
 *
 * 0  länkarna i raden: vänsterlänkarna i vänster kolumn, loggan i mitten,
 *    högerlänkarna, Öppettider och språkväljaren i höger kolumn
 * 1  loggan i mitten, språkväljaren och menyknappen till höger; alla länkar
 *    och Öppettider i panelen bakom menyknappen
 *
 * Bandet är ett rutnät med två lika breda kolumner runt loggan
 * (`minmax(0, 1fr) auto minmax(0, 1fr)`, header.css), så den bredare sidan
 * bestämmer: raden får plats när båda sidorna ryms i en kolumn.
 */
export type HeaderFit = 0 | 1

/** Så mycket luft (px) som krävs innan bandet går tillbaka till länkarna: ingen växling fram och tillbaka vid kanten. */
export const FIT_SLACK = 8

/**
 * Medan panelen är öppen är sidan låst (ingen rullningslist), och bandet blir
 * en rullningslist bredare. Det räknas inte som att länkarna får plats.
 */
export const OPEN_PANEL_SLACK = 24

/**
 * Golvet: på telefoner och surfplattor (upp till 1023 px, samma gräns som
 * pekytorna i touch.css och e2e-testerna) är det alltid loggan, språkväljaren
 * och menyknappen, även när länkarna skulle få plats (t.ex. arabiska och
 * persiska på en iPad på högkant). Länkarna i raden är bara 29 px höga, för
 * små att träffa med fingret. Över golvet bestämmer måtten.
 */
export const HEADER_FIT_FLOOR_QUERY = '(max-width: 1023px)'

/** Under golvet (se ovan)? Utan matchMedia (jsdom) finns inget golv. */
export function belowHeaderFloor(win: Pick<Window, 'matchMedia'> | undefined = globalThis.window): boolean {
  if (!win || typeof win.matchMedia !== 'function') return false
  return win.matchMedia(HEADER_FIT_FLOOR_QUERY).matches
}

export interface HeaderSizes {
  /** Bandets bredd inklusive dess egen sidomarginal (samma i båda lägena). */
  outer: number
  /** Bandets sidomarginal (vänster + höger) när länkarna står i raden. */
  pad: number
  /** Avståndet mellan kolumnerna när länkarna står i raden. */
  gap: number
  /** Loggan. */
  brand: number
  /** Vänsterlänkarna i sin naturliga bredd (en rad). */
  left: number
  /** Högerlänkarna och Öppettider i sin naturliga bredd (en rad). */
  right: number
  /** Avståndet mellan högerlänkarna och språkväljaren. */
  endGap: number
  /** Språkväljaren. */
  tools: number
}

/** Bredden bandet behöver för länkarna på en rad. */
export function requiredWidth(s: HeaderSizes): number {
  const rightParts = [s.right, s.tools].filter((w) => w > 0)
  const rightCol = rightParts.reduce((a, b) => a + b, 0) + s.endGap * Math.max(0, rightParts.length - 1)
  const column = Math.max(s.left, rightCol)
  return s.pad + s.brand + 2 * s.gap + 2 * column
}

/**
 * Läget som får plats. Tillbaka till länkarna (från 1) krävs `slack` px över,
 * så att en bredd precis vid kanten inte växlar. Utan riktig layout (ingen
 * bredd, t.ex. jsdom eller en gömd flik) behålls `current`.
 */
export function pickHeaderFit(s: HeaderSizes, current: HeaderFit = 1, slack = FIT_SLACK): HeaderFit {
  if (!(s.outer > 0)) return current
  const room = s.outer - (current === 1 ? slack : 0)
  return requiredWidth(s) <= room ? 0 : 1
}

export interface HeaderFitRefs {
  header: RefObject<HTMLElement | null>
  /** Ett osynligt mått i bandet: bredd = sidomarginalen, höjd = kolumnavståndet, båda som i läge 0. */
  probe: RefObject<HTMLElement | null>
  brand: RefObject<HTMLElement | null>
  leftList: RefObject<HTMLElement | null>
  rightList: RefObject<HTMLElement | null>
  end: RefObject<HTMLElement | null>
  tools: RefObject<HTMLElement | null>
}

const px = (v: string | undefined) => {
  const n = parseFloat(v ?? '')
  return Number.isFinite(n) ? n : 0
}
const rectWidth = (el: Element | null | undefined) => (el ? el.getBoundingClientRect().width : 0)

/**
 * Läser delarnas naturliga bredder. Länkarna som läget gömmer ligger kvar i
 * sin fulla bredd utanför raden (`.site-header-off`, header.css), så måtten är
 * desamma i båda lägena och ett lägesbyte kan inte ge en slinga.
 */
export function measureHeader(r: HeaderFitRefs): HeaderSizes {
  const header = r.header.current
  const probe = r.probe.current
  const probeRect = probe?.getBoundingClientRect()
  const end = r.end.current
  // offsetWidth: loggan skalas upp vid hover (transform), det ska inte räknas
  const brand = r.brand.current?.offsetWidth ?? 0
  const nat = (el: HTMLElement | null) => (el ? Math.max(el.scrollWidth, rectWidth(el)) : 0)
  // +1 per del: bredderna är decimaltal, och en del som är 0,4 px för bred bryts ändå
  const plus = (w: number) => (w > 0 ? Math.ceil(w) + 1 : 0)
  return {
    outer: header?.clientWidth ?? 0,
    pad: 2 * (probeRect?.width ?? 0),
    gap: probeRect?.height ?? 0,
    brand: Math.ceil(brand),
    left: plus(nat(r.leftList.current)),
    right: plus(nat(r.rightList.current)),
    endGap: end ? px(getComputedStyle(end).columnGap) : 0,
    tools: plus(rectWidth(r.tools.current)),
  }
}

/**
 * Håller bandets läge i takt med de verkliga måtten (över golvet, se
 * HEADER_FIT_FLOOR_QUERY): före första målningen
 * (layout-effekt) och igen när bandet eller någon del ändrar storlek
 * (fönstrets bredd, typsnitt som laddas, ett översatt länknamn, ett annat språk
 * i väljaren). Startar i läge 1, där allt nås via panelen.
 */
export function useHeaderFit(
  refs: HeaderFitRefs,
  panelOpen = false,
  onChange?: (fit: HeaderFit) => void,
): HeaderFit {
  const [fit, setFit] = useState<HeaderFit>(1)
  const fitRef = useRef<HeaderFit>(1)
  const openRef = useRef(panelOpen)
  const onChangeRef = useRef(onChange)
  useLayoutEffect(() => {
    openRef.current = panelOpen
    onChangeRef.current = onChange
  })

  // refs: ref-objekten är desamma i varje rendering, de första räcker
  useLayoutEffect(() => {
    const decide = (): HeaderFit => {
      if (belowHeaderFloor()) return 1
      const slack = FIT_SLACK + (openRef.current ? OPEN_PANEL_SLACK : 0)
      return pickHeaderFit(measureHeader(refs), fitRef.current, slack)
    }
    const first = decide()
    if (first !== fitRef.current) {
      fitRef.current = first
      setFit(first)
    }
    const r = refs
    const els = [r.header, r.brand, r.leftList, r.rightList, r.tools]
      .map((x) => x.current)
      .filter((x): x is HTMLElement => !!x)
    let mounted = true
    const update = () => {
      if (!mounted) return
      const next = decide()
      if (next === fitRef.current) return
      fitRef.current = next
      // i observatörens anrop, före målningen: ingen bildruta med det gamla läget
      flushSync(() => {
        setFit(next)
        onChangeRef.current?.(next)
      })
    }
    const ro = new ResizeObserver(update)
    els.forEach((el) => ro.observe(el))
    // över eller under golvet: bestäm igen (bandets bredd kan vara oförändrad, t.ex. en zoomad sida)
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia(HEADER_FIT_FLOOR_QUERY) : null
    mq?.addEventListener?.('change', update)
    return () => {
      mounted = false
      ro.disconnect()
      mq?.removeEventListener?.('change', update)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return fit
}
