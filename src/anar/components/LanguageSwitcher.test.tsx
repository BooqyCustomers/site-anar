import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import Header from './Header'
import LanguageSwitcher from './LanguageSwitcher'

vi.mock('@bookingsystemadvancedorg/site-kit', async (importOriginal) => {
  const original = await importOriginal<typeof import('@bookingsystemadvancedorg/site-kit')>()
  return {
    ...original,
    LanguagePicker: ({ className }: { className?: string }) => <span data-testid="kit-picker" className={className} />,
    useSite: () => ({
      config: { tenant: { features: {} } },
      location: { locationId: 'loc-1', name: 'Anar', waitlist: null },
    }),
  }
})

vi.mock('./OpeningHoursDropdown', () => ({ default: () => null }))
vi.mock('./OpeningHoursModal', () => ({ default: () => null }))

const renderHeader = () =>
  render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  )

describe('LanguageSwitcher', () => {
  it('shows the kit picker, left to right', () => {
    const { getByTestId } = render(<LanguageSwitcher />)
    expect(getByTestId('kit-picker').closest('.language-switcher')).toHaveAttribute('dir', 'ltr')
  })

  it('puts the kit picker in the top bar at the right, next to the menu button', () => {
    const { getByTestId, container } = renderHeader()
    const picker = getByTestId('kit-picker')
    expect(picker).toHaveClass('language-switcher-picker')
    const tools = container.querySelector('.site-header .site-header-end .site-header-tools')!
    expect(tools).toContainElement(picker)
    // Väljaren först, menyknappen sist (längst till höger), allt vänster till höger.
    expect(tools.lastElementChild).toHaveClass('site-header-burger')
    expect(picker.closest('.language-switcher')).toHaveAttribute('dir', 'ltr')
    // Efter länkarna på dator.
    const nav = container.querySelector('.site-header-nav--right')!
    expect(nav.compareDocumentPosition(picker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
