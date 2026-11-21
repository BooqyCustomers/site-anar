import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../i18n/LanguageContext', async () => {
  const { STRINGS } = await import('../i18n/strings')
  return { useLanguage: () => ({ t: (key: string) => (STRINGS as Record<string, string>)[key] ?? key }) }
})

import ReviewsPanel from './ReviewsPanel'
import BestallHemPage from '../pages/BestallHemPage'

const untranslated = (root: Element) => [...root.querySelectorAll('[translate="no"]')].map((el) => el.textContent)

describe('platform names', () => {
  it('keeps Google and foodora out of machine translation in the reviews', () => {
    const { container } = render(<ReviewsPanel />)
    expect(untranslated(container)).toEqual(expect.arrayContaining(['Google', 'foodora']))
  })

  it('keeps Uber Eats and foodora out of machine translation on Beställ hem', () => {
    const { container } = render(<BestallHemPage />)
    expect(untranslated(container)).toEqual(expect.arrayContaining(['Uber Eats', 'foodora']))
  })
})
