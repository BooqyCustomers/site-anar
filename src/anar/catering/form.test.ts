import { describe, expect, it } from 'vitest'
import { ApiError, NO_CONSENT } from '@bookingsystemadvancedorg/site-kit'
import { INITIAL_FORM, currentStep, guestError, hasAddress, showDate, validate } from './form'
import type { FormState } from './form'

const dates = { min: '2026-11-25', max: '2027-11-20' }
const ctx = { guests: 30, minGuests: 15, selected: 3, dates }
const complete: FormState = {
  ...INITIAL_FORM,
  deliveryDate: '2026-12-01',
  fulfilment: 'delivery',
  street: 'Storgatan 1',
  postalCode: '582 23',
  city: 'Linköping',
  equipmentReturn: 'cleaned',
  name: 'Anna Svensson',
  email: 'anna@example.se',
  phone: '+46701234567',
  accept: true,
}

describe('validate', () => {
  it('passes a complete private request', () => {
    expect(validate(complete, ctx)).toBeNull()
  })

  it('asks for things in the order the guest fills them in, with the kit wording', () => {
    expect(validate(complete, { ...ctx, guests: 0 })).toEqual({ field: 'guests', message: 'Fyll i antal gäster.' })
    expect(validate(complete, { ...ctx, guests: 10 })).toEqual({ field: 'guests', message: 'Minst 15 gäster.' })
    expect(validate(complete, { ...ctx, selected: 0 })).toEqual({ field: null, message: 'Välj minst en rätt eller dryck.' })
    expect(validate({ ...complete, deliveryDate: '' }, ctx)?.message).toBe('Välj ett datum mellan 25/11/2026 och 20/11/2027.')
    expect(validate({ ...complete, street: '' }, ctx)).toEqual({ field: 'street', message: 'Fyll i leveransadressen (gata, postnummer och ort).' })
    expect(validate({ ...complete, postalCode: '12' }, ctx)?.field).toBe('postalCode')
    expect(validate({ ...complete, city: '' }, ctx)?.field).toBe('city')
    expect(validate({ ...complete, equipmentReturn: '' }, ctx)?.field).toBe('equipmentReturn')
    expect(validate({ ...complete, name: ' ' }, ctx)?.field).toBe('name')
    expect(validate({ ...complete, email: 'anna@' }, ctx)?.field).toBe('email')
    expect(validate({ ...complete, phone: '0701234567' }, ctx)?.field).toBe('phone')
    expect(validate({ ...complete, accept: false }, ctx)).toEqual({ field: 'accept', message: 'Godkänn villkoren för att skicka förfrågan.' })
  })

  it('needs no address for pickup', () => {
    expect(validate({ ...complete, fulfilment: 'pickup', street: '', postalCode: '', city: '' }, ctx)).toBeNull()
  })

  it('asks a company for its details and for the signatory to confirm authority', () => {
    const company: FormState = { ...complete, customerType: 'company' }
    expect(validate(company, ctx)?.field).toBe('companyName')
    expect(validate({ ...company, companyName: 'Anar AB', orgNumber: '12' }, ctx)?.field).toBe('orgNumber')
    const named = { ...company, companyName: 'Anar AB', orgNumber: '556677-8899' }
    expect(validate(named, ctx)?.field).toBe('signatoryName')
    expect(validate({ ...named, signatoryName: 'Anna' }, ctx)?.field).toBe('signatoryRole')
    expect(validate({ ...named, signatoryName: 'Anna', signatoryRole: 'VD' }, ctx)?.field).toBe('signatoryAuthority')
    expect(validate({ ...named, signatoryName: 'Anna', signatoryRole: 'VD', signatoryAuthority: true }, ctx)).toBeNull()
  })

  it('starts with the booking consent boxes unticked (GDPR: never pre-ticked)', () => {
    expect(INITIAL_FORM.accept).toBe(false)
    expect(INITIAL_FORM.consent).toBe(NO_CONSENT)
    expect(INITIAL_FORM.consent.checked).toBe(false)
  })
})

describe('helpers', () => {
  it('knows when an address is complete', () => {
    expect(hasAddress({ street: 'Storgatan 1', postalCode: '58223', city: 'Linköping' })).toBe(true)
    expect(hasAddress({ street: 'Storgatan 1', postalCode: '5822', city: 'Linköping' })).toBe(false)
  })

  it('shows dates the Swedish way', () => {
    expect(showDate('2026-10-22')).toBe('22/10/2026')
  })

  it('follows the guest through the steps', () => {
    expect(currentStep(INITIAL_FORM, false)).toBe(1)
    expect(currentStep({ ...INITIAL_FORM, deliveryDate: '2026-12-01' }, true)).toBe(2)
    expect(currentStep({ ...complete, name: '', email: '', phone: '' }, true)).toBe(3)
    expect(currentStep(complete, true)).toBe(4)
  })
})

describe('guestError', () => {
  it('explains the portion limit in words a guest who never sees portions can follow', () => {
    const text = guestError(new ApiError(400, 'at most 300 portions', { error: 'at most 300 portions' }), '013-123 45 67')
    expect(text).toContain('högst 300 portioner')
    expect(text).toContain('varje dryck räknas som en portion')
    expect(text).toContain('013-123 45 67')
    expect(guestError(new ApiError(400, 'at most 300 portions'))).not.toContain('ring restaurangen')
  })

  it('explains a minimum the same way', () => {
    expect(guestError(new ApiError(400, 'at least 10 portions'))).toContain('minst 10 portioner')
  })

  it("leaves every other error to the kit's own messages", () => {
    expect(guestError(new ApiError(404, 'not found'))).toBe('Förfrågan hittades inte. Kontrollera länken.')
    expect(guestError(new Error('boom'))).toBe('Något gick fel. Försök igen.')
  })
})
