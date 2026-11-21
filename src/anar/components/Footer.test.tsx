import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@bookingsystemadvancedorg/site-kit', () => ({
  useSite: () => ({
    config: {
      legal: { legalName: 'Anar AB', orgNumber: '559000-0000' },
      tenant: { name: 'Anar', features: { reservations: true } },
    },
  }),
}))
vi.mock('../i18n/LanguageContext', async () => {
  const { STRINGS } = await import('../i18n/strings')
  return { useLanguage: () => ({ t: (key: string) => (STRINGS as Record<string, string>)[key] ?? key }) }
})

import Footer, { DEVELOPER } from './Footer'

describe('Footer', () => {
  it('keeps the developer credit name out of machine translation', () => {
    const { container } = render(<MemoryRouter><Footer /></MemoryRouter>)
    const credit = container.querySelector('.site-footer-credit')!
    expect(credit.textContent).toBe(`Denna hemsida är fullt utvecklad av ${DEVELOPER}`)
    const name = [...credit.querySelectorAll('[translate="no"]')].map((el) => el.textContent)
    expect(name).toContain('IT Hjälparna Nordic AB')
  })
})
