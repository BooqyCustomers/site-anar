import { describe, expect, it } from 'vitest'
import { descriptionParts, lunchTitle, pageOfCategory, priceText, sectionsForPage, varietyList } from './booqyMenu'

const item = (over: Record<string, unknown> = {}) => ({
  menuItemId: 'x',
  name: 'RÃ¤tt',
  description: '',
  price: 100,
  category: 'c',
  imageKey: null,
  ...over,
})

describe('booqyMenu', () => {
  it('lÃ¤gger kategorierna pÃ¥ rÃ¤tt sida efter namnet', () => {
    expect(pageOfCategory('Dagens lunch: Kabab')).toBe('dagens')
    expect(pageOfCategory('Kolgrill')).toBe('kolgrill')
    expect(pageOfCategory('RÃ¶tt vin')).toBe('drink')
    expect(pageOfCategory('Ã–l & cider')).toBe('drink')
    expect(pageOfCategory('Shots')).toBe('drink')
    expect(pageOfCategory('Traditionella drycker')).toBe('meny')
    expect(pageOfCategory('FÃ¶rrÃ¤tter')).toBe('meny')
  })

  it('tar bort "Dagens lunch:" ur rubriken', () => {
    expect(lunchTitle('Dagens lunch: Klassiska varmrÃ¤tter')).toBe('Klassiska varmrÃ¤tter')
  })

  it('visar glas/flaska som tvÃ¥ priser och sorter som lista', () => {
    const wine = item({ price: 89, options: [{ name: 'Storlek', required: true, maxChoices: 1, choices: [{ name: 'Glas', price: 0 }, { name: 'Flaska', price: 270 }] }] })
    expect(priceText(wine)).toBe('89 / 359 kr')
    const soda = item({ price: 25, options: [{ name: 'Sort', required: true, maxChoices: 1, choices: [{ name: 'Fanta', price: 0 }] }] })
    expect(priceText(soda)).toBe('25 kr')
    expect(varietyList(soda)).toEqual(['Fanta'])
  })

  it('gÃ¶r sista raden i beskrivningen till en not', () => {
    expect(descriptionParts(item({ description: 'Text.\nNot.' }))).toEqual({ text: ['Text.'], note: 'Not.' })
    expect(descriptionParts(item({ description: 'Bara text.' }))).toEqual({ text: ['Bara text.'], note: null })
  })

  it('Drinkmeny visar Drycker och drinkkategorierna, Meny behÃ¥ller Drycker', () => {
    const sec = (id: string, name: string) => ({ id, name, page: pageOfCategory(name), items: [item()] })
    const all = [sec('1', 'FÃ¶rrÃ¤tter'), sec('2', 'Drycker'), sec('3', 'Traditionella drycker'), sec('4', 'RÃ¶tt vin'), sec('5', 'Kolgrill')]

    expect(sectionsForPage(all, 'drink').map((s: { name: string }) => s.name)).toEqual(['Drycker', 'Traditionella drycker', 'RÃ¶tt vin'])
    expect(sectionsForPage(all, 'meny').map((s: { name: string }) => s.name)).toEqual(['FÃ¶rrÃ¤tter', 'Drycker', 'Traditionella drycker'])
  })
})
