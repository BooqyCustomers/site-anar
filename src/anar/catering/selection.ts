import type { MenuCategoryEntry, PublicMenuItem, cateringApi } from '@bookingsystemadvancedorg/site-kit'

/**
 * Cateringvalet: gästen kryssar i rätter och drycker, och mängden per rätt
 * räknas ut åt dem (visas inte). Här finns bara logiken, utan React, så att
 * den går att testa för sig. CateringBuilder.tsx ritar och skickar.
 */

/** Vilken sorts rätt: styr hur mängden räknas ut. */
export type Role = 'starter' | 'main' | 'dessert' | 'drink' | 'package' | 'other'

/** Något gästen kan välja: en cateringrätt, ett paket eller (innan cateringmenyn är upplagd) en rätt ur vanliga menyn. */
export interface Unit {
  /** Nyckel i valet: d:<dishId>, m:<menuItemId> eller p:<packageId>. */
  id: string
  kind: 'dish' | 'menu' | 'package'
  name: string
  description?: string
  /** Kronor per portion (paket: per gäst). */
  price: number
  role: Role
  allergens?: string[]
  dietary?: string[]
  /** Paketets rätter, för visning. */
  includes?: string[]
  minGuests?: number
  /** Foto från vanliga menyn när rätten finns där under samma namn. */
  photo?: { imageKey: string | null; imageFocus?: { x: number; y: number } | null }
}

export type DrinkMode = 'perGuest' | 'custom'

export interface Choice {
  /** Valda förrätter, huvudrätter, efterrätter, drycker och paket (inte "övrigt"). */
  picked: ReadonlySet<string>
  /** Drycker: en av varje per gäst, eller gästens egna antal. */
  drinkMode: DrinkMode
  drinkQty: Readonly<Record<string, number>>
  /** "Övrigt" (sidorätter m.m.): gästen anger antal själv, ingen automatik. */
  otherQty: Readonly<Record<string, number>>
}

export const EMPTY_CHOICE: Choice = { picked: new Set(), drinkMode: 'perGuest', drinkQty: {}, otherQty: {} }

/** Servern tar högst så här många av en rätt (samma gräns som kitets antalsfält). */
export const MAX_QUANTITY = 5000

/** Standardkategorierna i Booqy: id:t följer med även om restaurangen döper om rubriken. */
const ROLE_OF_CATEGORY_ID: Record<string, Role> = {
  starters: 'starter',
  mains: 'main',
  desserts: 'dessert',
  drinks: 'drink',
}

/**
 * Vilken sorts rätt en kategori är, av rubriken restaurangen gett den.
 * Cateringmenyn i Booqy har inga kategorier, så de hämtas från vanliga menyn.
 * Det som inte känns igen blir "övrigt" (gästen anger antal själv): hellre det
 * än en gissning som ger fel mängd.
 */
export function roleOfCategory(name: string): Role {
  const n = name.toLowerCase()
  if (/förrätt/.test(n)) return 'starter'
  if (/efterrätt|dessert/.test(n)) return 'dessert'
  // öl och vin som hela ord, så att t.ex. "Svin" inte räknas som dryck
  if (/dryck|drink|läsk|cocktail|(^|[^\p{L}])(öl|vin)($|[^\p{L}])/u.test(n)) return 'drink'
  if (/sido|tillbehör|tillval/.test(n)) return 'other'
  if (/varmrätt|huvudrätt|klassisk|helgens|dagens|lunch|kabab|kebab|kolgrill|grillrätt|meny/.test(n)) return 'main'
  return 'other'
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

/**
 * Det gästen kan välja bland. Har restaurangen en cateringmeny (rätter och/eller
 * paket) används den, med sort och foto från vanliga menyns rätt med samma
 * namn. Annars används vanliga menyn (utan alkohol), som i kitets eget formulär.
 */
export function buildUnits(
  menu: cateringApi.CateringMenu,
  regular: { items: PublicMenuItem[]; categories: MenuCategoryEntry[] },
): Unit[] {
  const categoryName = new Map(regular.categories.map((c) => [c.categoryId, c.name]))
  const roleOf = (i: PublicMenuItem): Role =>
    ROLE_OF_CATEGORY_ID[i.category] ?? roleOfCategory(categoryName.get(i.category) ?? '')
  const byName = new Map(regular.items.map((i) => [norm(i.name), i]))
  const photoOf = (i: PublicMenuItem | undefined): Unit['photo'] =>
    i ? { imageKey: i.imageKey ?? null, imageFocus: i.imageFocus ?? null } : undefined

  const units: Unit[] = []
  const dishName = new Map(menu.dishes.map((d) => [d.dishId, d.name]))

  for (const p of menu.packages) {
    units.push({
      id: `p:${p.packageId}`,
      kind: 'package',
      name: p.name,
      description: p.description,
      price: p.pricePerGuest,
      role: 'package',
      minGuests: p.minGuests,
      includes: p.dishIds.map((id) => dishName.get(id)).filter((n): n is string => Boolean(n)),
    })
  }

  if (menu.dishes.length > 0 || menu.packages.length > 0) {
    for (const d of menu.dishes) {
      const match = byName.get(norm(d.name))
      units.push({
        id: `d:${d.dishId}`,
        kind: 'dish',
        name: d.name,
        description: d.description,
        price: d.pricePerPortion,
        role: match ? roleOf(match) : 'other',
        allergens: d.allergens,
        dietary: d.dietary,
        photo: photoOf(match),
      })
    }
  } else {
    for (const i of regular.items.filter((it) => !it.alcohol)) {
      units.push({
        id: `m:${i.menuItemId}`,
        kind: 'menu',
        name: i.name,
        description: i.description,
        price: i.price,
        role: roleOf(i),
        allergens: i.allergens,
        photo: photoOf(i),
      })
    }
  }
  return units
}

/** Grupperna i den ordning de visas, med rubriker som på Anars menysidor. */
export const GROUPS: { role: Role; title: string }[] = [
  { role: 'package', title: 'Paket' },
  { role: 'starter', title: 'Förrätter' },
  { role: 'main', title: 'Varmrätter' },
  { role: 'dessert', title: 'Efterrätter' },
  { role: 'drink', title: 'Drycker' },
  { role: 'other', title: 'Övrigt' },
]

/**
 * Mängden per vald enhet. Förrätt, varmrätt, efterrätt och paket: en portion
 * per gäst och grupp, så gästerna delas jämnt på det som valts i gruppen (blir
 * det rest får de första en extra). Drycker: en av varje per gäst, eller
 * gästens egna antal. "Övrigt": gästens egna antal. Enheter utan mängd utelämnas.
 */
export function quantities(units: readonly Unit[], choice: Choice, guests: number): Map<string, number> {
  const out = new Map<string, number>()
  if (!(guests > 0)) return out

  for (const role of ['package', 'starter', 'main', 'dessert'] as const) {
    const picked = units.filter((u) => u.role === role && choice.picked.has(u.id))
    const n = picked.length
    if (n === 0) continue
    // Fler val än gäster: en portion vardera hellre än att ett valt val försvinner ur kalkylen.
    const base = Math.max(1, Math.floor(guests / n))
    const extra = guests >= n ? guests % n : 0
    picked.forEach((u, i) => out.set(u.id, Math.min(MAX_QUANTITY, base + (i < extra ? 1 : 0))))
  }
  for (const u of units.filter((x) => x.role === 'drink' && choice.picked.has(x.id))) {
    const q = choice.drinkMode === 'perGuest' ? guests : (choice.drinkQty[u.id] ?? guests)
    if (q > 0) out.set(u.id, Math.min(MAX_QUANTITY, Math.round(q)))
  }
  for (const u of units.filter((x) => x.role === 'other')) {
    const q = choice.otherQty[u.id] ?? 0
    if (q > 0) out.set(u.id, Math.min(MAX_QUANTITY, Math.round(q)))
  }
  return out
}

/** Valet i den form kitets /catering/quote och /catering/requests tar emot (bara de delar som har innehåll). */
export function selectionFields(
  units: readonly Unit[],
  qty: ReadonlyMap<string, number>,
  guests: number,
): Pick<cateringApi.QuoteInput, 'guests' | 'packages' | 'dishes' | 'items'> | null {
  const packages: NonNullable<cateringApi.QuoteInput['packages']> = []
  const dishes: NonNullable<cateringApi.QuoteInput['dishes']> = []
  const items: NonNullable<cateringApi.QuoteInput['items']> = []
  for (const u of units) {
    const quantity = qty.get(u.id)
    if (!quantity) continue
    const ref = u.id.slice(2)
    if (u.kind === 'package') packages.push({ packageId: ref, quantity })
    else if (u.kind === 'dish') dishes.push({ dishId: ref, quantity })
    else items.push({ menuItemId: ref, quantity })
  }
  if (packages.length + dishes.length + items.length === 0) return null
  return {
    guests,
    ...(packages.length ? { packages } : {}),
    ...(dishes.length ? { dishes } : {}),
    ...(items.length ? { items } : {}),
  }
}

/** Offertens rader delade i mat och dryck (öre), för den ungefärliga kalkylen. */
export function breakdown(units: readonly Unit[], lines: readonly cateringApi.Line[]): { foodOre: number; drinkOre: number } {
  const roleOf = new Map(units.map((u) => [u.id, u.role]))
  let foodOre = 0
  let drinkOre = 0
  for (const l of lines) {
    const id = l.packageId ? `p:${l.packageId}` : l.dishId ? `d:${l.dishId}` : l.menuItemId ? `m:${l.menuItemId}` : ''
    const amount = l.unitPrice * l.quantity
    if (roleOf.get(id) === 'drink') drinkOre += amount
    else foodOre += amount
  }
  return { foodOre, drinkOre }
}

/**
 * Avrundat till närmaste 100 kr (öre in och ut): kalkylen visar en ungefärlig
 * siffra, inte det som räknats ut per rätt. Ett belopp över noll blir aldrig 0 kr.
 */
export const approxOre = (ore: number): number =>
  ore > 0 ? Math.max(10000, Math.round(ore / 10000) * 10000) : ore < 0 ? -approxOre(-ore) : 0

/** Följer med förfrågan när mängder räknats ut åt gästen, så att restaurangen inte tror att gästen valt dem. */
export const ESTIMATE_NOTE =
  'Antal portioner per rätt är en uppskattning som sajten räknat ut: gästerna är fördelade lika på de valda rätterna i varje grupp.'

/** Har någon mängd räknats ut åt gästen (alltså inte bara drycker och eget antal)? */
export function hasAutoQuantities(units: readonly Unit[], qty: ReadonlyMap<string, number>): boolean {
  return units.some((u) => qty.has(u.id) && (u.role === 'starter' || u.role === 'main' || u.role === 'dessert' || u.role === 'package'))
}
