/**
 * Planritningen från backenden, hämtad en gång per plats för sajtens egna tillägg till bokningens planritning
 * (planLabels.ts, tableMode.ts). Samma publika GET som kitet gör (`layoutApi.getPublicActiveLayout`).
 * Ett fel ger null: tilläggen gör då ingenting och planen fungerar som kitet ritar den.
 */
import { layoutApi } from '@bookingsystemadvancedorg/site-kit'

export type ActiveLayout = layoutApi.PublicActiveLayout

const cache = new Map<string, Promise<ActiveLayout | null>>()

export function loadLayout(locationId: string): Promise<ActiveLayout | null> {
  let layout = cache.get(locationId)
  if (!layout) {
    layout = layoutApi.getPublicActiveLayout(locationId).catch(() => null)
    cache.set(locationId, layout)
  }
  return layout
}

/** Antal platser per bord (elementId -> platser), för alla våningar. */
export function seatsByTable(layout: ActiveLayout): Map<string, number> {
  const seats = new Map<string, number>()
  for (const el of layout.elements) {
    if (el.type === 'table') seats.set(el.elementId, el.seats)
  }
  return seats
}
