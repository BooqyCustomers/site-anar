/**
 * Steg 3 i bokningen, "Välj ert bord": ett val mellan "Välj bord själv" (planritningen och listan, som förut) och
 * "Spelar ingen roll" (sajten väljer ett bord åt gästen).
 *
 * Kitet har inget sådant val, så den här modulen sätter in två knappar överst i steg 3 och, i läget "Spelar ingen roll",
 * trycker på en av kitets egna bordsknappar (`.booking-table-list`, en knapp per bord eller bordskombination som går att
 * boka för sällskapet). Då tar kitets vanliga flöde vid: "Ditt val", "Bekräfta bord", hållning av bordet. Planritningen
 * och listan göms så länge läget är "Spelar ingen roll" (CSS, plan-mode.css); byter gästen tillbaka syns de igen med
 * det valda bordet markerat.
 *
 * Vilket bord: ett enda bord framför bord som ställs ihop, och bland dem det med minst platser som ändå räcker (så ett
 * sällskap på två inte får ett bord för åtta); finns flera lika bra väljs ett slumpmässigt. Antal platser kommer från
 * planritningen i backenden (bordets id finns i knappens `data-option`), inte från knappens text, som kitet översätter.
 *
 * Gästens val kommer ihåg tills sidan laddas om (inget sparas i webbläsaren). Byter gästen dag, tid eller sällskap
 * nollställer kitet bordsvalet, och i läget "Spelar ingen roll" väljs ett nytt bord direkt.
 *
 * Tas bort när kitet har ett eget val för "valfritt bord".
 */
import { loadLayout, seatsByTable } from './layoutData'

export type TableMode = 'self' | 'any'

export interface Candidate {
  /** Borden i alternativet (ett, eller flera som ställs ihop). */
  ids: string[]
  chip: HTMLElement
}

const LIST = '.booking-table-list'
let mode: TableMode = 'self'

export const getTableMode = (): TableMode => mode
export function setTableMode(next: TableMode): void {
  mode = next
}

/**
 * Bästa alternativet: ett enda bord (annars en kombination), med minst antal platser, slumpmässigt bland lika bra.
 * Okänt antal platser räknas som oändligt många, så är inget känt blir alla lika bra och det slumpas bland alla.
 */
export function chooseCandidate(
  candidates: readonly Candidate[],
  seatsOf: ReadonlyMap<string, number>,
  random: () => number = Math.random,
): Candidate | null {
  if (candidates.length === 0) return null
  const single = candidates.filter((c) => c.ids.length === 1)
  const pool = single.length > 0 ? single : candidates
  const seats = (c: Candidate) => c.ids.reduce((sum, id) => sum + (seatsOf.get(id) ?? Number.POSITIVE_INFINITY), 0)
  const fewest = Math.min(...pool.map(seats))
  const best = pool.filter((c) => seats(c) === fewest)
  return best[Math.min(best.length - 1, Math.floor(random() * best.length))]
}

function candidatesOf(list: Element): Candidate[] {
  const result: Candidate[] = []
  for (const chip of list.querySelectorAll<HTMLElement>('button[data-option]')) {
    const ids = (chip.dataset.option ?? '').split('+').filter(Boolean)
    if (ids.length > 0) result.push({ ids, chip })
  }
  return result
}

function setAttr(el: Element, name: string, value: string): void {
  if (el.getAttribute(name) !== value) el.setAttribute(name, value)
}

const OPTIONS: { mode: TableMode; title: string; sub: string }[] = [
  { mode: 'self', title: 'Välj bord själv', sub: 'Tryck på ett bord i planen' },
  { mode: 'any', title: 'Spelar ingen roll', sub: 'Vi väljer ett bord åt er' },
]

function buildSwitch(): HTMLElement {
  const group = document.createElement('div')
  group.className = 'plan-mode'
  group.setAttribute('role', 'group')
  group.setAttribute('aria-label', 'Hur vill ni välja bord?')
  for (const o of OPTIONS) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'filter-pill plan-mode-option'
    button.dataset.tableMode = o.mode
    const title = document.createElement('span')
    title.className = 'plan-mode-title'
    title.textContent = o.title
    const sub = document.createElement('span')
    sub.className = 'plan-mode-sub'
    sub.textContent = o.sub
    button.append(title, sub)
    group.appendChild(button)
  }
  return group
}

/** Tidigast när nästa automatiska val får göras (skyddar mot att välja två gånger medan kitet ritar om). */
let nextPickAt = 0
const PICK_GAP_MS = 250

/** Tillbaka till början (för testerna): "Välj bord själv" och ingen väntetid. */
export function resetTableMode(): void {
  mode = 'self'
  nextPickAt = 0
}

/**
 * Ser till att varje steg 3 har sitt val och, i läget "Spelar ingen roll", ett valt bord. Säker att köra många gånger.
 * Returnerar true om en ny körning behövs strax (ett val gjordes nyss, eller antalet platser hämtas).
 */
export function syncTableMode(
  seatsOf: ReadonlyMap<string, number> | null,
  root: ParentNode = document,
  now: number = Date.now(),
  random: () => number = Math.random,
): boolean {
  let again = false
  for (const list of root.querySelectorAll(LIST)) {
    const step = list.closest<HTMLFieldSetElement>('fieldset.booking-step')
    if (!step) continue

    let group = step.querySelector<HTMLElement>(':scope > .plan-mode')
    if (!group) {
      group = buildSwitch()
      const legend = step.querySelector(':scope > legend')
      if (legend) legend.after(group)
      else step.prepend(group)
    }
    for (const button of group.querySelectorAll<HTMLElement>('.plan-mode-option')) {
      const on = button.dataset.tableMode === mode
      setAttr(button, 'aria-pressed', String(on))
      button.classList.toggle('active', on)
    }

    const candidates = candidatesOf(list)
    // Finns inget att välja bland lämnas planen och listan synliga, så kitets egna förklaringar syns.
    const any = mode === 'any' && candidates.length > 0
    setAttr(step, 'data-table-mode', any ? 'any' : 'self')
    if (!any || step.disabled) continue
    if (list.querySelector('[aria-pressed="true"]')) continue

    if (!seatsOf) {
      again = true
      continue
    }
    if (now < nextPickAt) {
      again = true
      continue
    }
    const best = chooseCandidate(candidates, seatsOf, random)
    if (best) {
      nextPickAt = now + PICK_GAP_MS
      best.chip.click()
      again = true
    }
  }
  return again
}

/** Sätter igång: knapparna i steg 3 och valet av bord. Returnerar en funktion som stänger av det. */
export function installTableMode(locationId: string): () => void {
  if (typeof window === 'undefined') return () => {}
  let stopped = false
  let frame = 0
  let timer = 0
  let seats: ReadonlyMap<string, number> | null = null
  let loading = false

  const schedule = () => {
    if (!frame && !stopped) frame = requestAnimationFrame(run)
  }
  const run = () => {
    frame = 0
    if (stopped) return
    if (!seats && !loading && document.querySelector(LIST)) {
      loading = true
      void loadLayout(locationId).then((layout) => {
        seats = layout ? seatsByTable(layout) : new Map()
        schedule()
      })
    }
    if (syncTableMode(seats) && !timer) {
      timer = window.setTimeout(() => {
        timer = 0
        schedule()
      }, PICK_GAP_MS + 50)
    }
  }

  const onClick = (e: MouseEvent) => {
    const button = (e.target as Element | null)?.closest<HTMLElement>('.plan-mode-option')
    const next = button?.dataset.tableMode
    if (next === 'self' || next === 'any') {
      mode = next
      schedule()
    }
  }

  const observer = new MutationObserver(schedule)
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-pressed', 'disabled'],
  })
  document.addEventListener('click', onClick)
  schedule()

  return () => {
    stopped = true
    observer.disconnect()
    document.removeEventListener('click', onClick)
    if (frame) cancelAnimationFrame(frame)
    if (timer) window.clearTimeout(timer)
  }
}
