import { useId } from 'react'
import { cateringApi, useKeepTerms } from '@bookingsystemadvancedorg/site-kit'
import DishPhoto from '../components/DishPhoto'
import { GROUPS, MAX_QUANTITY } from './selection'
import type { Choice, DrinkMode, Unit } from './selection'

/**
 * Valet av rätter och drycker: gästen kryssar i det de vill ha. Förrätt,
 * varmrätt och efterrätt (och paket) har inget antal att fylla i, mängden
 * räknas ut åt dem (selection.ts). Drycker: en av varje per gäst, eller eget
 * antal per dryck. "Övrigt" (det som inte går att räkna ut) har ett eget antal.
 */

// "per portion" i klartext: "/port" blev obegripligt i översättningen.
const priceText = (u: Unit) => `${cateringApi.kronor(Math.round(u.price * 100))} per ${u.kind === 'package' ? 'gäst' : 'portion'}`

function Tags({ allergens, dietary }: { allergens?: string[]; dietary?: string[] }) {
  if (!allergens?.length && !dietary?.length) return null
  return (
    <span className="dish-tags">
      {dietary?.map((d) => (
        <span className="dish-tag" key={d}>
          {cateringApi.DIETARY_LABEL[d] ?? d}
        </span>
      ))}
      {allergens?.length ? (
        <span className="dish-allergens">Innehåller {allergens.map((a) => cateringApi.ALLERGEN_LABEL[a] ?? a).join(', ')}</span>
      ) : null}
    </span>
  )
}

function QuantityInput({ value, label, caption, onChange }: { value: number | undefined; label: string; caption: string; onChange: (n: number) => void }) {
  return (
    <span className="cb-qty">
      <span className="cb-qty-caption" aria-hidden="true">
        {caption}
      </span>
      <input
        type="number"
        min={0}
        max={MAX_QUANTITY}
        inputMode="numeric"
        aria-label={label}
        value={value || ''}
        placeholder="0"
        onChange={(e) => onChange(Math.max(0, Math.min(MAX_QUANTITY, Math.round(Number(e.target.value)) || 0)))}
      />
    </span>
  )
}

export default function MenuPicker({
  units,
  choice,
  guests,
  onChange,
}: {
  units: readonly Unit[]
  choice: Choice
  guests: number
  onChange: (next: Choice) => void
}) {
  const uid = useId()
  // Rätternas namn översätts aldrig, inte heller i "Portioner Burrata".
  useKeepTerms(units.flatMap((u) => [u.name, ...(u.includes ?? [])]))
  const toggle = (id: string) => {
    const picked = new Set(choice.picked)
    if (picked.has(id)) picked.delete(id)
    else picked.add(id)
    onChange({ ...choice, picked })
  }
  const setMode = (drinkMode: DrinkMode) => onChange({ ...choice, drinkMode })

  return (
    <>
      {GROUPS.map(({ role, title }) => {
        const items = units.filter((u) => u.role === role).sort((a, b) => a.name.localeCompare(b.name, 'sv'))
        if (items.length === 0) return null
        const pickedDrinks = role === 'drink' ? items.filter((u) => choice.picked.has(u.id)) : []
        return (
          <section className="cb-group" aria-label={title} key={role}>
            <h2 className="menu-content-title">{title}</h2>
            {role === 'package' && <p className="cb-note">Pris per gäst. Gästerna delas jämnt på de paket du kryssar i.</p>}
            {role === 'other' && <p className="cb-note">Skriv hur många portioner du vill ha av det du vill lägga till.</p>}
            <ul className="cb-list">
              {items.map((u) => {
                const picked = choice.picked.has(u.id)
                const base = `${uid}-${u.id.replace(/\W/g, '')}`
                const text = (
                  <>
                    {u.photo && (
                      <span className="cb-thumb">
                        <DishPhoto item={u.photo} />
                      </span>
                    )}
                    <span className="cb-text">
                      <span className="cb-head">
                        <strong id={`${base}-n`} translate="no">{u.name}</strong>
                        <span className="dish-price" id={`${base}-p`}>
                          {priceText(u)}
                        </span>
                      </span>
                      {u.description && <span className="dish-desc">{u.description}</span>}
                      {u.includes && u.includes.length > 0 && <span className="dish-desc" translate="no">{u.includes.join(' · ')}</span>}
                      {u.minGuests ? <span className="dish-desc">{`Från ${u.minGuests} gäster`}</span> : null}
                      <Tags allergens={u.allergens} dietary={u.dietary} />
                    </span>
                  </>
                )
                if (role === 'other') {
                  return (
                    <li className="cb-row" key={u.id}>
                      <div className="cb-pick">{text}</div>
                      <QuantityInput
                        value={choice.otherQty[u.id]}
                        label={`Portioner ${u.name}`}
                        caption="Portioner"
                        onChange={(n) => onChange({ ...choice, otherQty: { ...choice.otherQty, [u.id]: n } })}
                      />
                    </li>
                  )
                }
                return (
                  <li className={`cb-row${picked ? ' is-picked' : ''}`} key={u.id}>
                    <label className="cb-pick booking-check">
                      <input type="checkbox" checked={picked} onChange={() => toggle(u.id)} aria-labelledby={`${base}-n`} aria-describedby={`${base}-p`} />
                      {text}
                    </label>
                    {role === 'drink' && picked && choice.drinkMode === 'custom' && (
                      <QuantityInput
                        value={choice.drinkQty[u.id] ?? (guests || undefined)}
                        label={`Antal ${u.name}`}
                        caption="Antal"
                        onChange={(n) => onChange({ ...choice, drinkQty: { ...choice.drinkQty, [u.id]: n } })}
                      />
                    )}
                    {role === 'drink' && picked && choice.drinkMode === 'perGuest' && guests > 0 && <span className="cb-count">{guests} st</span>}
                  </li>
                )
              })}
            </ul>
            {pickedDrinks.length > 0 && (
              <div className="cb-drinkmode">
                <p className="cb-drinkmode-title" id={`${uid}-mode`}>
                  Hur många av varje dryck?
                </p>
                <div className="segmented" role="radiogroup" aria-labelledby={`${uid}-mode`}>
                  <label className={choice.drinkMode === 'perGuest' ? 'on' : ''}>
                    <input type="radio" name={`${uid}-drinkmode`} checked={choice.drinkMode === 'perGuest'} onChange={() => setMode('perGuest')} />
                    En per gäst av varje
                  </label>
                  <label className={choice.drinkMode === 'custom' ? 'on' : ''}>
                    <input type="radio" name={`${uid}-drinkmode`} checked={choice.drinkMode === 'custom'} onChange={() => setMode('custom')} />
                    Jag väljer antal själv
                  </label>
                </div>
                <p className="cb-note">
                  {choice.drinkMode === 'perGuest'
                    ? guests > 0
                      ? `Med ${guests} gäster blir det ${guests} av varje dryck du kryssat i.`
                      : 'Fyll i antal gäster, så blir det lika många av varje dryck.'
                    : 'Skriv hur många du vill ha av varje dryck.'}
                </p>
              </div>
            )}
          </section>
        )
      })}
    </>
  )
}
