import { fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { configureSiteKit } from '@bookingsystemadvancedorg/site-kit'
import DishPhoto from './DishPhoto'

beforeEach(() => configureSiteKit({ apiBaseUrl: 'https://api.test', menuImageBaseUrl: 'https://cdn.test/' }))
afterEach(() => configureSiteKit({ apiBaseUrl: 'https://api.test', menuImageBaseUrl: undefined }))

const dish = (over: Record<string, unknown> = {}) => ({
  menuItemId: 'a',
  name: 'Burrata',
  imageKey: 'menu-images/burrata.jpg',
  ...over,
})

describe('DishPhoto', () => {
  it('shows the photo from the image CDN, lazy and decorative, cropped at the restaurant\'s focal point', () => {
    const { container } = render(<DishPhoto item={dish({ imageFocus: { x: 30, y: 70 } })} />)
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('src', 'https://cdn.test/menu-images/burrata.jpg')
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('alt', '')
    expect(img.style.getPropertyValue('--dish-photo-position')).toBe('30% 70%')
  })

  it('crops around the middle when the restaurant has not picked a focal point', () => {
    const { container } = render(<DishPhoto item={dish()} />)
    expect(container.querySelector('img')!.style.getPropertyValue('--dish-photo-position')).toBe('50% 50%')
  })

  it('shows nothing for a dish without a photo', () => {
    const { container } = render(<DishPhoto item={dish({ imageKey: null })} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows nothing when the image CDN is not configured', () => {
    configureSiteKit({ menuImageBaseUrl: undefined })
    const { container } = render(<DishPhoto item={dish()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('hides itself when the photo cannot be fetched, and tries a new photo', () => {
    const { container, rerender } = render(<DishPhoto item={dish()} />)
    fireEvent.error(container.querySelector('img')!)
    expect(container).toBeEmptyDOMElement()

    rerender(<DishPhoto item={dish({ imageKey: 'menu-images/new.jpg' })} />)
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://cdn.test/menu-images/new.jpg')
  })
})
