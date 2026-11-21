import { describe, expect, it } from 'vitest'
import type { MenuCategoryEntry, PublicMenuItem, cateringApi } from '@bookingsystemadvancedorg/site-kit'
import { EMPTY_CHOICE, ESTIMATE_NOTE, approxOre, breakdown, buildUnits, hasAutoQuantities, quantities, roleOfCategory, selectionFields } from './selection'
import type { Choice } from './selection'

const category = (categoryId: string, name: string): MenuCategoryEntry => ({ categoryId, name })
const item = (menuItemId: string, name: string, cat: string, price: number, extra: Partial<PublicMenuItem> = {}): PublicMenuItem => ({
  menuItemId,
  name,
  description: '',
  price,
  category: cat,
  imageKey: null,
  ...extra,
})

const regular = {
  categories: [category('starters', 'Förrätter'), category('mains', 'Varmrätter'), category('desserts', 'Efterrätter'), category('drinks', 'Drycker'), category('c1', 'Dagens lunch'), category('x', 'Smått och gott')],
  items: [
    item('m1', 'Burrata', 'starters', 135, { imageKey: 'menu-images/b.jpg', imageFocus: { x: 30, y: 70 } }),
    item('m2', 'Toast Skagen', 'starters', 145),
    item('m3', 'Grillad lax', 'mains', 245),
    item('m4', 'Pannbiff med lök', 'mains', 215),
    item('m5', 'Kladdkaka', 'desserts', 95),
    item('m6', 'Äppelmust', 'drinks', 45),
    item('m7', 'Lättöl', 'drinks', 45),
    item('m8', 'Husets röda, glas', 'drinks', 115, { alcohol: true }),
    item('m9', 'Dagens fisk', 'c1', 135),
    item('m10', 'Mystisk rätt', 'x', 99),
  ],
}

const dish = (dishId: string, name: string, pricePerPortion: number): cateringApi.CateringDish => ({ dishId, name, pricePerPortion })
const cateringMenu: cateringApi.CateringMenu = {
  packages: [],
  dishes: [dish('d1', 'Burrata', 135), dish('d2', 'Toast Skagen', 145), dish('d3', 'Grillad lax', 245), dish('d4', 'Kladdkaka', 95), dish('d5', 'Äppelmust', 45), dish('d6', 'Lättöl', 45), dish('d7', 'Dagens fisk', 135), dish('d8', 'Finns inte i menyn', 50)],
}

const choose = (ids: string[], over: Partial<Choice> = {}): Choice => ({ ...EMPTY_CHOICE, picked: new Set(ids), ...over })

describe('roleOfCategory', () => {
  it('knows courses and drinks by the heading the restaurant gave the category', () => {
    expect(roleOfCategory('Förrätter')).toBe('starter')
    expect(roleOfCategory('Efterrätter')).toBe('dessert')
    expect(roleOfCategory('Desserter')).toBe('dessert')
    expect(roleOfCategory('Drycker')).toBe('drink')
    expect(roleOfCategory('Läsk')).toBe('drink')
    expect(roleOfCategory('Öl & vin')).toBe('drink')
    expect(roleOfCategory('Varmrätter')).toBe('main')
    expect(roleOfCategory('Dagens lunch')).toBe('main')
    expect(roleOfCategory('Kolgrill')).toBe('main')
  })

  it('does not take a word that merely contains vin or öl for a drink', () => {
    expect(roleOfCategory('Svin')).toBe('other')
    expect(roleOfCategory('Kötträtter')).toBe('other')
  })

  it('leaves what it cannot place as "other" (the guest then types a quantity) instead of guessing', () => {
    expect(roleOfCategory('')).toBe('other')
    expect(roleOfCategory('Smått och gott')).toBe('other')
    expect(roleOfCategory('Sidorätter')).toBe('other')
  })
})

describe('buildUnits', () => {
  it("uses the restaurant's catering menu and takes sort and photo from the regular dish with the same name", () => {
    const units = buildUnits(cateringMenu, regular)
    const byName = (n: string) => units.find((u) => u.name === n)!
    expect(byName('Burrata')).toMatchObject({ id: 'd:d1', kind: 'dish', role: 'starter', price: 135, photo: { imageKey: 'menu-images/b.jpg', imageFocus: { x: 30, y: 70 } } })
    expect(byName('Grillad lax').role).toBe('main')
    expect(byName('Kladdkaka').role).toBe('dessert')
    expect(byName('Äppelmust').role).toBe('drink')
    expect(byName('Dagens fisk').role).toBe('main')
    // utan träff i vanliga menyn: eget antal, inget foto
    expect(byName('Finns inte i menyn')).toMatchObject({ role: 'other', photo: undefined })
    expect(units.every((u) => u.kind === 'dish')).toBe(true)
  })

  it('goes by the standard category id even when the restaurant renamed the heading', () => {
    const renamed = { ...regular, categories: [category('starters', 'Smått'), ...regular.categories.slice(1)] }
    const units = buildUnits(cateringMenu, renamed)
    expect(units.find((u) => u.name === 'Burrata')!.role).toBe('starter')
  })

  it('makes every dish "other" when the regular menu could not be read, so nothing gets a made-up quantity', () => {
    const units = buildUnits(cateringMenu, { items: [], categories: [] })
    expect(units.every((u) => u.role === 'other')).toBe(true)
  })

  it('lists packages first, with the names of their dishes', () => {
    const units = buildUnits(
      { ...cateringMenu, packages: [{ packageId: 'p1', name: 'Buffé', pricePerGuest: 320, dishIds: ['d1', 'd3', 'saknas'], minGuests: 20 }] },
      regular,
    )
    expect(units[0]).toMatchObject({ id: 'p:p1', kind: 'package', role: 'package', price: 320, minGuests: 20, includes: ['Burrata', 'Grillad lax'] })
  })

  it('falls back on the regular menu without alcohol while the restaurant has no catering menu', () => {
    const units = buildUnits({ dishes: [], packages: [] }, regular)
    expect(units.every((u) => u.kind === 'menu')).toBe(true)
    expect(units.map((u) => u.name)).not.toContain('Husets röda, glas')
    expect(units.find((u) => u.name === 'Pannbiff med lök')).toMatchObject({ id: 'm:m4', role: 'main', price: 215 })
  })
})

describe('quantities', () => {
  const units = buildUnits(cateringMenu, regular)
  const id = (name: string) => units.find((u) => u.name === name)!.id

  it('gives each guest one portion per course: guests are split evenly over what is picked in the group', () => {
    const q = quantities(units, choose([id('Burrata'), id('Toast Skagen'), id('Grillad lax'), id('Kladdkaka')]), 30)
    expect([q.get(id('Burrata')), q.get(id('Toast Skagen'))]).toEqual([15, 15])
    expect(q.get(id('Grillad lax'))).toBe(30)
    expect(q.get(id('Kladdkaka'))).toBe(30)
  })

  it('never loses a guest to rounding: the rest goes to the first dishes', () => {
    const picks = choose([id('Burrata'), id('Toast Skagen')])
    const q = quantities(units, picks, 31)
    const total = [...q.values()].reduce((a, b) => a + b, 0)
    expect(total).toBe(31)
    expect(Math.abs(q.get(id('Burrata'))! - q.get(id('Toast Skagen'))!)).toBeLessThanOrEqual(1)
  })

  it('gives each pick at least one portion when there are more picks than guests', () => {
    const q = quantities(units, choose([id('Burrata'), id('Toast Skagen')]), 1)
    expect([...q.values()]).toEqual([1, 1])
  })

  it('has no quantities before the number of guests is filled in, or for what is not picked', () => {
    expect(quantities(units, choose([id('Burrata')]), 0).size).toBe(0)
    expect(quantities(units, choose([]), 30).size).toBe(0)
  })

  it('drinks, one of each per guest: 30 cola and 30 fanta for 30 guests', () => {
    const q = quantities(units, choose([id('Äppelmust'), id('Lättöl')]), 30)
    expect([q.get(id('Äppelmust')), q.get(id('Lättöl'))]).toEqual([30, 30])
  })

  it("drinks, the guest decides: their own number per drink, 'one per guest' where they have not typed one", () => {
    const picks = choose([id('Äppelmust'), id('Lättöl')], { drinkMode: 'custom', drinkQty: { [id('Äppelmust')]: 12 } })
    const q = quantities(units, picks, 30)
    expect([q.get(id('Äppelmust')), q.get(id('Lättöl'))]).toEqual([12, 30])
    // 0 = ingen av den drycken
    const none = quantities(units, choose([id('Äppelmust')], { drinkMode: 'custom', drinkQty: { [id('Äppelmust')]: 0 } }), 30)
    expect(none.size).toBe(0)
  })

  it('"other" (what cannot be worked out) only counts what the guest types, picked or not', () => {
    const q = quantities(units, choose([], { otherQty: { [id('Finns inte i menyn')]: 40 } }), 30)
    expect([...q.entries()]).toEqual([[id('Finns inte i menyn'), 40]])
  })

  it('keeps every quantity within what the server accepts', () => {
    const q = quantities(units, choose([id('Äppelmust')], { drinkMode: 'custom', drinkQty: { [id('Äppelmust')]: 99999 } }), 30)
    expect(q.get(id('Äppelmust'))).toBe(5000)
  })

  it('splits guests over picked packages like over dishes', () => {
    const withPackages = buildUnits({ ...cateringMenu, packages: [{ packageId: 'p1', name: 'A', pricePerGuest: 300, dishIds: [] }, { packageId: 'p2', name: 'B', pricePerGuest: 400, dishIds: [] }] }, regular)
    const q = quantities(withPackages, choose(['p:p1', 'p:p2']), 40)
    expect([q.get('p:p1'), q.get('p:p2')]).toEqual([20, 20])
  })
})

describe('selectionFields', () => {
  const units = buildUnits(cateringMenu, regular)
  it("builds what the quote and the request take, with only the parts that have content, and nothing when nothing is chosen", () => {
    const qty = new Map([
      ['d:d1', 15],
      ['d:d5', 30],
    ])
    expect(selectionFields(units, qty, 30)).toEqual({
      guests: 30,
      dishes: [
        { dishId: 'd1', quantity: 15 },
        { dishId: 'd5', quantity: 30 },
      ],
    })
    expect(selectionFields(units, new Map(), 30)).toBeNull()
  })

  it('sends a regular-menu pick as items, and a package as packages', () => {
    const fallback = buildUnits({ dishes: [], packages: [] }, regular)
    expect(selectionFields(fallback, new Map([['m:m4', 12]]), 12)).toEqual({ guests: 12, items: [{ menuItemId: 'm4', quantity: 12 }] })
    const pk = buildUnits({ dishes: [], packages: [{ packageId: 'p1', name: 'A', pricePerGuest: 300, dishIds: [] }] }, regular)
    expect(selectionFields(pk, new Map([['p:p1', 12]]), 12)).toEqual({ guests: 12, packages: [{ packageId: 'p1', quantity: 12 }] })
  })
})

describe('breakdown, approxOre and the note', () => {
  const units = buildUnits(cateringMenu, regular)
  it('splits the quote lines in food and drink', () => {
    const lines: cateringApi.Line[] = [
      { kind: 'dish', dishId: 'd1', name: 'Burrata', unitPrice: 13500, quantity: 15 },
      { kind: 'dish', dishId: 'd5', name: 'Äppelmust', unitPrice: 4500, quantity: 30 },
    ]
    expect(breakdown(units, lines)).toEqual({ foodOre: 202500, drinkOre: 135000 })
  })

  it('rounds to the nearest 100 kr and never shows a positive amount as 0 kr', () => {
    expect(approxOre(570000)).toBe(570000)
    expect(approxOre(574999)).toBe(570000)
    expect(approxOre(575000)).toBe(580000)
    expect(approxOre(4000)).toBe(10000)
    expect(approxOre(0)).toBe(0)
    expect(approxOre(-575000)).toBe(-580000)
  })

  it('adds the note only when the site worked out quantities, and the note fits next to the guest text', () => {
    const id = (name: string) => units.find((u) => u.name === name)!.id
    expect(hasAutoQuantities(units, quantities(units, choose([id('Burrata')]), 20))).toBe(true)
    expect(hasAutoQuantities(units, quantities(units, choose([id('Äppelmust')]), 20))).toBe(false)
    expect(ESTIMATE_NOTE.length).toBeLessThanOrEqual(200)
  })
})
