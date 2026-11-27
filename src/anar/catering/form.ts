import { ApiError, NO_CONSENT, cateringApi } from '@bookingsystemadvancedorg/site-kit'
import type { ConsentChoice } from '@bookingsystemadvancedorg/site-kit'

/**
 * Cateringformulärets fält och kontroller. Texterna och reglerna är kitets egna
 * (samma mejl- och telefonregler som servern), så att gästen möter samma krav
 * och samma meddelanden som i kitets formulär.
 */

export interface FormState {
  customerType: 'private' | 'company'
  name: string
  email: string
  phone: string
  companyName: string
  orgNumber: string
  invoiceReference: string
  signatoryName: string
  signatoryRole: string
  signatoryAuthority: boolean
  deliveryDate: string
  deliveryTime: string
  fulfilment: 'pickup' | 'delivery'
  equipmentReturn: '' | cateringApi.EquipmentReturn
  street: string
  postalCode: string
  city: string
  guests: string
  notes: string
  accept: boolean
  consent: ConsentChoice
}

export const INITIAL_FORM: FormState = {
  customerType: 'private',
  name: '',
  email: '',
  phone: '',
  companyName: '',
  orgNumber: '',
  invoiceReference: '',
  signatoryName: '',
  signatoryRole: '',
  signatoryAuthority: false,
  deliveryDate: '',
  deliveryTime: '12:00',
  fulfilment: 'delivery',
  equipmentReturn: '',
  street: '',
  postalCode: '',
  city: '',
  guests: '',
  notes: '',
  accept: false,
  consent: NO_CONSENT,
}

/** Gästens eget meddelande får vara så långt; sajtens automatiska rad (ESTIMATE_NOTE) ryms under serverns tak på 1000 tecken. */
export const NOTES_MAX = 800

export const STEPS = [{ label: 'Meny' }, { label: 'När & var' }, { label: 'Uppgifter' }, { label: 'Skicka' }]

const POSTAL = /^\d{3} ?\d{2}$/
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
/** PhoneInput ger alltid E.164. */
const PHONE = /^\+[1-9]\d{7,14}$/

export const hasAddress = (f: Pick<FormState, 'street' | 'postalCode' | 'city'>) =>
  Boolean(f.street.trim() && POSTAL.test(f.postalCode.trim()) && f.city.trim())

/** "2026-10-22" -> "22/10/2026", som datumfältet visar det. */
export const showDate = (iso: string) => iso.split('-').reverse().join('/')

export interface Problem {
  /** Fältet att sätta fokus på (id = catering-<field>), null när det är valet som saknas. */
  field: string | null
  message: string
}

const problem = (field: string | null, message: string): Problem => ({ field, message })

/** Första felet i "När och var" (datum, tid, adress vid leverans, utrustningen), eller null när steget är klart. */
function whenWhereProblem(f: FormState, dates: { min: string; max: string }): Problem | null {
  if (!f.deliveryDate) {
    return problem('deliveryDate', `Välj ett datum mellan ${showDate(dates.min)} och ${showDate(dates.max)}.`)
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(f.deliveryTime)) return problem('deliveryTime', 'Välj en tid.')
  if (f.fulfilment === 'delivery' && !hasAddress(f)) {
    const field = f.street.trim() ? (POSTAL.test(f.postalCode.trim()) ? 'city' : 'postalCode') : 'street'
    return problem(field, 'Fyll i leveransadressen (gata, postnummer och ort).')
  }
  if (!f.equipmentReturn) return problem('equipmentReturn', 'Välj hur fat och utrustning lämnas tillbaka.')
  return null
}

/** Första felet i "Dina uppgifter" (kontaktuppgifter, och företagets uppgifter för ett företag), eller null när steget är klart. */
function detailsProblem(f: FormState): Problem | null {
  if (!f.name.trim()) return problem('name', 'Fyll i ditt namn.')
  if (!EMAIL.test(f.email)) return problem('email', 'Fyll i en giltig e-postadress, offerten skickas dit.')
  if (!PHONE.test(f.phone)) return problem('phone', 'Fyll i ett giltigt mobilnummer, t.ex. 070-123 45 67.')
  if (f.customerType === 'company') {
    if (!f.companyName.trim()) return problem('companyName', 'Fyll i företagets namn.')
    if (!/^\d{6}-?\d{4}$/.test(f.orgNumber.trim())) return problem('orgNumber', 'Fyll i organisationsnummer (NNNNNN-NNNN).')
    if (!f.signatoryName.trim() || !f.signatoryRole.trim()) {
      return problem(f.signatoryName.trim() ? 'signatoryRole' : 'signatoryName', 'Fyll i vem som signerar för företaget och hens roll.')
    }
    if (!f.signatoryAuthority) return problem('signatoryAuthority', 'Bekräfta att den som signerar får teckna avtal för företaget.')
  }
  return null
}

/** "När och var" är ifyllt (samma krav som valideringen vid Skicka). */
export const whenWhereDone = (f: FormState): boolean => whenWhereProblem(f, { min: '', max: '' }) === null

/** "Dina uppgifter" är ifyllt (samma krav som valideringen vid Skicka). */
export const detailsDone = (f: FormState): boolean => detailsProblem(f) === null

/** Första felet i formuläret, i den ordning gästen fyller i det, eller null. */
export function validate(
  f: FormState,
  ctx: { guests: number; minGuests: number; selected: number; dates: { min: string; max: string } },
): Problem | null {
  if (!ctx.guests) return problem('guests', 'Fyll i antal gäster.')
  if (ctx.guests < ctx.minGuests) return problem('guests', `Minst ${ctx.minGuests} gäster.`)
  if (ctx.selected === 0) return problem(null, 'Välj minst en maträtt eller dryck.')
  const early = whenWhereProblem(f, ctx.dates) ?? detailsProblem(f)
  if (early) return early
  return f.accept ? null : problem('accept', 'Godkänn villkoren för att skicka förfrågan.')
}

/**
 * Meddelandet till gästen för ett API-fel. Gästen ser inga portioner, så
 * serverns "högst/minst N portioner" förklaras i stället för att visas rakt av
 * (kitets text är bara "Högst 300 portioner."). Övriga fel är kitets.
 */
export function guestError(err: unknown, phone?: string): string {
  if (err instanceof ApiError && err.status === 400) {
    const most = /^at most (\d+) portions/.exec(err.message)
    if (most) {
      return `Det här blir för mycket för en förfrågan på webben: restaurangen tar emot högst ${most[1]} portioner åt gången, och varje dryck räknas som en portion. Välj färre maträtter eller drycker${phone ? `, eller ring restaurangen på ${phone}` : ''}.`
    }
    const least = /^at least (\d+) portions/.exec(err.message)
    if (least) {
      return `Det här blir för litet för en förfrågan: restaurangen behöver minst ${least[1]} portioner, och varje dryck räknas som en portion. Välj fler maträtter eller drycker.`
    }
  }
  return cateringApi.errorMessage(err, phone)
}

/** Vilket steg gästen är på i stegraden. */
export function currentStep(f: FormState, ready: boolean): 1 | 2 | 3 | 4 {
  if (!ready) return 1
  if (!f.deliveryDate || !f.equipmentReturn) return 2
  return f.name.trim() && f.email.trim() && f.phone ? 4 : 3
}
