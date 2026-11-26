/**
 * Namn på dörrar och fönster i planritningen (bokningens steg 3), hämtade från backenden.
 *
 * Planritnings-API:t ger varje dörr ett `kind` ("entrance" och så vidare) och varje element en `type`, men site-kit
 * (0.5.1) ritar alla dörrar likadant och skriver aldrig ut vad något är ("alla dörrar ritas likadant", FloorPlan3D.tsx).
 * Den här modulen hämtar samma planritning som kitet (`layoutApi.getPublicActiveLayout`, en publik GET) och lägger en
 * liten text på varje dörr och varje fönster, i både 2D och 3D: Entré, Kök, Dörr eller Fönster. En dörr med ett
 * `kind` som vi inte känner igen heter "Dörr".
 *
 * Kitet ritar elementen i samma ordning som backenden ger dem (dörrar för sig och fönster för sig), så nr N dörr i
 * planen är nr N dörr i datan. Stämmer antalet inte (planen ritas om, eller kitet ändrat sin ritning) märks ingenting,
 * hellre inga namn än fel namn. Med flera våningar väljs våningen efter den aktiva våningsknappen ("Välj våning").
 *
 * Texten är riktig text i sidan (inte `content` i CSS), så kitets översättning tar den: "Entré" blir "Entrance" på
 * engelska. Den är dold för skärmläsare (planen är en bild, bordsknapparna är det som går att använda).
 *
 * Tas bort när kitet själv skriver ut vad dörrar och fönster är (då ska `kind` finnas i `LayoutDoorElement`).
 */
import { layoutApi } from '@bookingsystemadvancedorg/site-kit'
import { loadLayout } from './layoutData'

export interface OpeningNames {
  doors: string[]
  windows: string[]
}

interface RawElement {
  type: string
  /** Finns i API-svaret för dörrar men inte i kitets typ. */
  kind?: unknown
}

const DOOR_NAMES: Record<string, string> = { entrance: 'Entré', kitchen: 'Kök' }
const WINDOW_NAME = 'Fönster'
const PLAN_SELECTOR = '.f3d-scene, .floor-svg'
const SVG_NS = 'http://www.w3.org/2000/svg'

export function doorName(kind: unknown): string {
  return (typeof kind === 'string' && DOOR_NAMES[kind.trim().toLowerCase()]) || 'Dörr'
}

/** Namnen per våning, i samma ordning som kitets våningsknappar (`groupElementsByFloor`). */
export function openingNames(groups: readonly { elements: readonly RawElement[] }[]): OpeningNames[] {
  return groups.map((g) => ({
    doors: g.elements.filter((el) => el.type === 'door').map((el) => doorName(el.kind)),
    windows: g.elements.filter((el) => el.type === 'window').map(() => WINDOW_NAME),
  }))
}

/** Dörr eller fönster i planen som redan har sin text, och 2D-texter med sin rektangel (för städning). */
const handled = new WeakSet<Element>()
const ownerOf = new WeakMap<Element, Element>()

/** Vilken våning planen visar: 0 med en enda våning, annars den aktiva våningsknappen. Null om det inte går att se. */
function floorIndex(plan: Element, count: number): number | null {
  if (count === 1) return 0
  const toggle = plan.closest('.floor-wrap')?.previousElementSibling
  const pills = toggle?.previousElementSibling
  if (!pills?.matches('.filter-row')) return null
  const index = [...pills.querySelectorAll('button')].findIndex((b) => b.getAttribute('aria-pressed') === 'true')
  return index >= 0 && index < count ? index : null
}

function label3d(name: string): HTMLElement {
  const anchor = document.createElement('span')
  anchor.className = 'plan-label plan-label--3d'
  anchor.setAttribute('aria-hidden', 'true')
  const text = document.createElement('span')
  text.className = 'plan-label-text'
  text.textContent = name
  anchor.appendChild(text)
  return anchor
}

/** 2D: en text i SVG:n, mitt på rektangeln (en rotation av dörren går runt dess mitt, så mitten flyttar sig inte). */
function label2d(rect: Element, name: string): SVGTextElement | null {
  const num = (attr: string) => Number.parseFloat(rect.getAttribute(attr) ?? '')
  const x = num('x') + num('width') / 2
  const y = num('y') + num('height') / 2
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  const text = document.createElementNS(SVG_NS, 'text')
  text.setAttribute('class', 'plan-label-2d')
  text.setAttribute('aria-hidden', 'true')
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(y))
  text.textContent = name
  return text
}

/** Lägger namnen på alla planer som finns i sidan just nu. Säker att köra många gånger. */
export function labelPlans(names: readonly OpeningNames[], root: ParentNode = document): void {
  for (const plan of root.querySelectorAll(PLAN_SELECTOR)) {
    // Kopian i förstoringsglaset (planLens.ts) har redan sina texter med sig.
    if (plan.closest('.plan-lens')) continue
    const is3d = plan.classList.contains('f3d-scene')

    // 2D: texter vars dörr eller fönster har ritats om (annan våning) tas bort.
    if (!is3d) {
      for (const old of plan.querySelectorAll('.plan-label-2d')) {
        if (!ownerOf.get(old)?.isConnected) old.remove()
      }
    }

    const index = floorIndex(plan, names.length)
    if (index === null) continue
    const wanted = names[index]
    const doors = [...plan.querySelectorAll(is3d ? '.f3d-door' : 'rect.floor-svg-door')]
    const windows = [...plan.querySelectorAll(is3d ? '.f3d-window' : 'rect.floor-svg-window')]
    if (doors.length !== wanted.doors.length || windows.length !== wanted.windows.length) continue

    const place = (nodes: Element[], list: string[]) => {
      nodes.forEach((node, i) => {
        if (handled.has(node)) return
        handled.add(node)
        if (is3d) {
          node.appendChild(label3d(list[i]))
        } else {
          const text = label2d(node, list[i])
          if (!text) return
          ownerOf.set(text, node)
          plan.appendChild(text)
        }
      })
    }
    place(doors, wanted.doors)
    place(windows, wanted.windows)
  }
}

/** Planritningen hämtas en gång per plats och bara när en plan visas (ett fel ger inga namn, inget annat händer). */
function loadNames(locationId: string): Promise<OpeningNames[]> {
  return loadLayout(locationId).then((layout) => (layout ? openingNames(layoutApi.groupElementsByFloor(layout)) : []))
}

/** Sätter igång: ser till att varje plan som ritas får sina namn. Returnerar en funktion som stänger av det. */
export function installPlanLabels(locationId: string): () => void {
  if (typeof window === 'undefined') return () => {}
  let stopped = false
  let frame = 0

  const scan = () => {
    frame = 0
    if (stopped || !document.querySelector(PLAN_SELECTOR)) return
    void loadNames(locationId).then((names) => {
      if (!stopped) labelPlans(names)
    })
  }
  const observer = new MutationObserver(() => {
    if (!frame) frame = requestAnimationFrame(scan)
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
  scan()

  return () => {
    stopped = true
    observer.disconnect()
    if (frame) cancelAnimationFrame(frame)
  }
}
