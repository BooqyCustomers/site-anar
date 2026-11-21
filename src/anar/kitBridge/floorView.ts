/**
 * Planritningen i bokningens steg 3 börjar i 2D; 3D är ett val.
 *
 * site-kit (också 0.5.0) startar planen i 3D (`useState("3d")`, ingen inställning), så
 * den här modulen trycker på kitets "2D"-knapp första gången en växlare
 * (`.floor-view-toggle`) ritas. Klicket sker i samma ögonblick som växlaren
 * kommer in i sidan, före första bildrutan, så ingen ser 3D blinka förbi.
 *
 * Väljer gästen själv 3D (eller 2D) kommer valet ihåg tills sidan laddas om:
 * en ny växlare (nästa steg, annan dag) startar i gästens senaste val.
 *
 * Tas bort när kitet har en egen standardvy (då slutar växlaren vara
 * "ny" för kitet och knappen är redan aktiv, så modulen gör ingenting).
 */

type View = '2d' | '3d'

let installed = false
let preferred: View = '2d'
const handled = new WeakSet<Element>()

const viewOf = (button: Element): View | null => {
  const label = button.textContent?.trim().toLowerCase()
  return label === '2d' || label === '3d' ? label : null
}

/** Gästens eget val (ett riktigt klick, inte vårt): kom ihåg det. */
function onClick(e: MouseEvent) {
  if (!e.isTrusted) return
  const button = (e.target as Element | null)?.closest('.floor-view-toggle button')
  const view = button && viewOf(button)
  if (view) preferred = view
}

/** Nya växlare: tryck på knappen för önskad vy om den inte redan är aktiv. */
export function applyPreferredView(root: ParentNode = document): void {
  for (const toggle of root.querySelectorAll('.floor-view-toggle')) {
    if (handled.has(toggle)) continue
    handled.add(toggle)
    const wanted = [...toggle.querySelectorAll('button')].find((b) => viewOf(b) === preferred)
    if (wanted && wanted.getAttribute('aria-pressed') !== 'true') wanted.click()
  }
}

export function installDefault2dView(): void {
  if (installed || typeof window === 'undefined') return
  installed = true
  document.addEventListener('click', onClick, true)
  new MutationObserver(() => applyPreferredView()).observe(document.documentElement, {
    childList: true,
    subtree: true,
  })
}
