import { GROUPS } from './selection'
import type { Choice, Role, Unit } from './selection'

/**
 * Cateringformuläret går vidare av sig självt: när ett steg är klart rullar sidan mjukt till nästa (useGuidedScroll.ts).
 * Här finns reglerna utan React: vilka steg det finns, när ett steg räknas som klart och hur länge sidan väntar efter
 * gästens senaste ändring innan den går vidare.
 */

/** Stegen gästen fyller i, i ordning. */
export type StepId = 'guests' | 'parts' | 'dishes' | 'when' | 'details'

/** Det som sidan rullar till när steget är klart. 'send' är Kalkylen med Skicka förfrågan, sist. */
export type TargetId = 'parts' | 'dishes' | 'when' | 'details' | 'send'

export const NEXT_TARGET: Record<StepId, TargetId> = {
  guests: 'parts',
  parts: 'dishes',
  dishes: 'when',
  when: 'details',
  details: 'send',
}

/**
 * Så länge sidan väntar efter gästens senaste ändring (ms) innan den går vidare, så att den inte rycker iväg medan
 * gästen fortfarande skriver eller väljer: en siffra till i antalet, en rätt till i delen.
 */
export const DELAYS: Record<StepId, number> = {
  guests: 1500,
  parts: 1500,
  dishes: 2500,
  when: 1200,
  details: 2500,
}

/** Ett enkelt val (en knapp i en grupp) behöver inte vänta lika länge som text som skrivs. */
export const QUICK_DELAY = 700

/** Delarna av menyn som finns och som gästen har valt, i den ordning de visas. */
export function wantedRoles(units: readonly Unit[], choice: Choice): Role[] {
  return GROUPS.filter(({ role }) => choice.wanted.has(role) && units.some((u) => u.role === role)).map(({ role }) => role)
}

/** Antal valda rätter i en del (för "Övrigt": rätter med ett antal ifyllt). */
function pickedIn(units: readonly Unit[], choice: Choice, role: Role): number {
  return role === 'other'
    ? units.filter((u) => u.role === 'other' && (choice.otherQty[u.id] ?? 0) > 0).length
    : units.filter((u) => u.role === role && choice.picked.has(u.id)).length
}

/** Antal gäster är ifyllt och når minimum. */
export const guestsDone = (guests: number, minGuests: number): boolean => guests > 0 && guests >= minGuests

/** Gästen har valt minst en del av menyn att välja rätter i. */
export const partsDone = (units: readonly Unit[], choice: Choice): boolean => wantedRoles(units, choice).length > 0

/** Det finns minst en vald rätt i varje del gästen vill ha. */
export function dishesDone(units: readonly Unit[], choice: Choice): boolean {
  const roles = wantedRoles(units, choice)
  return roles.length > 0 && roles.every((role) => pickedIn(units, choice, role) > 0)
}
