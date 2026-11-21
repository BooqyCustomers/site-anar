import { describe, expect, it } from 'vitest'
import { STRINGS } from './strings'
import { t, useLanguage } from './LanguageContext'

describe('texter (ett språk, svenska)', () => {
  it('slår upp svenska texter och faller tillbaka på nyckeln', () => {
    expect(t('nav.meny')).toBe('Meny')
    expect(t('finns.inte')).toBe('finns.inte')
  })

  it('fyller i {platshållare} och lämnar okända orörda', () => {
    expect(t('kontakt.mailSubject', { label: 'Klagomål' })).toContain('Klagomål')
    expect(t('kontakt.mailSubject', {})).toContain('{label}')
  })

  it('har en platt ordlista utan andra språk, och inga texter för ett språkval', () => {
    const strings: Record<string, unknown> = STRINGS
    expect(Object.values(strings).every((v) => typeof v === 'string')).toBe(true)
    expect('lang.switch' in strings).toBe(false)
  })

  it('useLanguage ger samma t överallt (ingen provider behövs)', () => {
    expect(useLanguage().t).toBe(t)
    expect(useLanguage()).toBe(useLanguage())
  })
})
