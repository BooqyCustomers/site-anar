import { describe, expect, it } from 'vitest'
import { DELAYS, NEXT_TARGET, QUICK_DELAY, dishesDone, guestsDone, partsDone, wantedRoles } from './guidedFlow'
import { EMPTY_CHOICE } from './selection'
import type { Choice, Role, Unit } from './selection'
import { INITIAL_FORM, detailsDone, validate, whenWhereDone } from './form'
import type { FormState } from './form'

const unit = (id: string, role: Role): Unit => ({ id, kind: 'dish', name: id, price: 100, role })
const units: Unit[] = [unit('s1', 'starter'), unit('s2', 'starter'), unit('m1', 'main'), unit('d1', 'drink'), unit('o1', 'other')]
const choice = (over: Partial<Choice> = {}): Choice => ({ ...EMPTY_CHOICE, ...over })

describe('the order of the steps', () => {
  it('goes guests, parts of the menu, dishes, when and where, details, and last the Kalkyl with Skicka', () => {
    expect(NEXT_TARGET).toEqual({ guests: 'parts', parts: 'dishes', dishes: 'when', when: 'details', details: 'send' })
  })

  it('waits longest after dishes (several can be picked) and shortest after a button choice', () => {
    expect(DELAYS.dishes).toBeGreaterThan(DELAYS.parts)
    expect(QUICK_DELAY).toBeLessThan(DELAYS.when)
  })
})

describe('guests', () => {
  it('are done at the minimum, not before', () => {
    expect(guestsDone(0, 1)).toBe(false)
    expect(guestsDone(14, 15)).toBe(false)
    expect(guestsDone(15, 15)).toBe(true)
    expect(guestsDone(1, 1)).toBe(true)
  })
})

describe('parts of the menu', () => {
  it('lists the parts that are wanted and exist, in the order they are shown', () => {
    expect(wantedRoles(units, choice({ wanted: new Set<Role>(['drink', 'starter']) }))).toEqual(['starter', 'drink'])
    // en del utan rätter (efterrätt) visas inte, så den räknas inte
    expect(wantedRoles(units, choice({ wanted: new Set<Role>(['dessert', 'main']) }))).toEqual(['main'])
  })

  it('are done when at least one part is wanted', () => {
    expect(partsDone(units, choice())).toBe(false)
    expect(partsDone(units, choice({ wanted: new Set<Role>(['main']) }))).toBe(true)
    expect(partsDone(units, choice({ wanted: new Set<Role>(['dessert']) }))).toBe(false)
  })
})

describe('dishes', () => {
  const wanted = new Set<Role>(['starter', 'main'])

  it('are done when every wanted part has something picked', () => {
    expect(dishesDone(units, choice({ wanted }))).toBe(false)
    expect(dishesDone(units, choice({ wanted, picked: new Set(['s1']) }))).toBe(false)
    expect(dishesDone(units, choice({ wanted, picked: new Set(['s1', 'm1']) }))).toBe(true)
    expect(dishesDone(units, choice({ wanted, picked: new Set(['s1', 's2', 'm1']) }))).toBe(true)
  })

  it('ignore picks in a part the guest does not want', () => {
    expect(dishesDone(units, choice({ wanted: new Set<Role>(['main']), picked: new Set(['s1']) }))).toBe(false)
  })

  it('count a side dish only with a quantity', () => {
    const other = new Set<Role>(['other'])
    expect(dishesDone(units, choice({ wanted: other, otherQty: { o1: 0 } }))).toBe(false)
    expect(dishesDone(units, choice({ wanted: other, otherQty: { o1: 12 } }))).toBe(true)
  })

  it('are never done with no part wanted', () => {
    expect(dishesDone(units, choice({ picked: new Set(['s1']) }))).toBe(false)
  })
})

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

describe('when and where', () => {
  it('is done with a date, a time, the address for a delivery and the equipment return', () => {
    expect(whenWhereDone(complete)).toBe(true)
    expect(whenWhereDone({ ...complete, deliveryDate: '' })).toBe(false)
    expect(whenWhereDone({ ...complete, deliveryTime: '' })).toBe(false)
    expect(whenWhereDone({ ...complete, equipmentReturn: '' })).toBe(false)
    expect(whenWhereDone({ ...complete, street: '' })).toBe(false)
    expect(whenWhereDone({ ...complete, postalCode: '12' })).toBe(false)
  })

  it('needs no address for a pickup', () => {
    expect(whenWhereDone({ ...complete, fulfilment: 'pickup', street: '', postalCode: '', city: '' })).toBe(true)
  })
})

describe('details', () => {
  it('are done with a name, an e-mail and a mobile number', () => {
    expect(detailsDone(complete)).toBe(true)
    expect(detailsDone({ ...complete, name: ' ' })).toBe(false)
    expect(detailsDone({ ...complete, email: 'anna@' })).toBe(false)
    expect(detailsDone({ ...complete, phone: '' })).toBe(false)
  })

  it('also need the company details for a company', () => {
    const company: FormState = { ...complete, customerType: 'company' }
    expect(detailsDone(company)).toBe(false)
    expect(
      detailsDone({ ...company, companyName: 'Anars AB', orgNumber: '556677-8899', signatoryName: 'Anna Svensson', signatoryRole: 'VD', signatoryAuthority: true }),
    ).toBe(true)
  })
})

describe('the same rules as the validation on Skicka', () => {
  it('says "done" exactly when the validation finds nothing wrong in that part', () => {
    const ctx = { guests: 30, minGuests: 15, selected: 3, dates: { min: '2026-11-25', max: '2027-11-20' } }
    const broken: Partial<FormState>[] = [{ deliveryDate: '' }, { equipmentReturn: '' }, { street: '' }, { name: '' }, { email: 'x' }, { phone: '' }, { deliveryTime: '' }]
    for (const patch of broken) {
      const f = { ...complete, ...patch }
      const problem = validate(f, ctx)
      expect(problem, JSON.stringify(patch)).not.toBeNull()
      expect(whenWhereDone(f) && detailsDone(f), JSON.stringify(patch)).toBe(false)
    }
    expect(validate(complete, ctx)).toBeNull()
    expect(whenWhereDone(complete) && detailsDone(complete)).toBe(true)
  })
})
