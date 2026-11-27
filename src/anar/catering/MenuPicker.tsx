import { useId, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { cateringApi, useKeepTerms } from '@bookingsystemadvancedorg/site-kit'
import DishPhoto from '../components/DishPhoto'
import { GROUPS, MAX_QUANTITY } from './selection'
import type { Choice, DrinkMode, Role, Unit } from './selection'

/**
 * Valet av rätter och drycker i två steg, så att gästen slipper scrolla genom hela menyn:
 *  1. Gästen väljer vilka delar av menyn hen vill ha (förrätt, varmrätt, efterrätt, dryck, ...).
 *  2. Rätterna i de delarna visas i flikar: en del åt gången, de andra är stängda.
 * Förrätt, varmrätt och efterrätt (och paket) har inget antal att fylla i, mängden
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
  // Vilken flik som är öppen. Ändras bara av gästens klick; om delen försvinner öppnas den första som finns kvar.
  const [active, setActive] = useState<Role | null>(null)
  // Rätternas namn översätts aldrig, inte heller i "Portioner Burrata".
  useKeepTerms(units.flatMap((u) => [u.name, ...(u.includes ?? [])]))

  const available = GROUPS.filter(({ role }) => units.some((u) => u.role === role))
  const wanted = available.filter(({ role }) => choice.wanted.has(role))
  const current: Role | null = wanted.find((g) => g.role === active)?.role ?? wanted[0]?.role ?? null

  const tabId = (role: Role) => `${uid}-tab-${role}`
  const panelId = (role: Role) => `${uid}-panel-${role}`
  const countOf = (role: Role) =>
    role === 'other'
      ? units.filter((u) => u.role === 'other' && (choice.otherQty[u.id] ?? 0) > 0).length
      : units.filter((u) => u.role === role && choice.picked.has(u.id)).length

  const toggle = (id: string) => {
    const picked = new Set(choice.picked)
    if (picked.has(id)) picked.delete(id)
    else picked.add(id)
    onChange({ ...choice, picked })
  }
  const setMode = (drinkMode: DrinkMode) => onChange({ ...choice, drinkMode })
  // Väljs en del öppnas dess flik direkt, så att gästen ser rätterna utan att leta.
  const toggleWanted = (role: Role) => {
    const next = new Set(choice.wanted)
    if (next.has(role)) next.delete(role)
    else {
      next.add(role)
      setActive(role)
    }
    onChange({ ...choice, wanted: next })
  }

  // Piltangenter flyttar mellan flikarna (som i en vanlig flikrad); i höger-till-vänster-språk är pilarna spegelvända.
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
    const step = e.key === 'ArrowRight' ? (rtl ? -1 : 1) : e.key === 'ArrowLeft' ? (rtl ? 1 : -1) : 0
    let target = -1
    if (step) target = (index + step + wanted.length) % wanted.length
    else if (e.key === 'Home') target = 0
    else if (e.key === 'End') target = wanted.length - 1
    if (target < 0) return
    e.preventDefault()
    const role = wanted[target].role
    setActive(role)
    document.getElementById(tabId(role))?.focus()
  }

  const renderList = (role: Role) => {
    const items = units.filter((u) => u.role === role).sort((a, b) => a.name.localeCompare(b.name, 'sv'))
    const pickedDrinks = role === 'drink' ? items.filter((u) => choice.picked.has(u.id)) : []
    return (
      <>
        {role === 'package' && <p className="cb-note">Pris per gäst. Gästerna delas jämnt på de paket du väljer.</p>}
        {role === 'other' && <p className="cb-note">Ange antal portioner för det du vill lägga till.</p>}
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
                {role === 'drink' && picked && choice.drinkMode === 'perGuest' && guests > 0 && <span className="cb-count">{`× ${guests}`}</span>}
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
                ? // Utan siffra i meningen: antalet står vid varje dryck, och en siffra först i en mening
                  // blir fel ordföljd på spanska och arabiska i översättningen.
                  guests > 0
                  ? 'En per gäst av varje vald dryck.'
                  : 'Fyll i antal gäster, så räknas en per gäst av varje vald dryck.'
                : 'Välj hur många du vill ha av varje dryck.'}
            </p>
          </div>
        )}
      </>
    )
  }

  if (available.length === 0) return null

  return (
    <>
      <div className="cb-want" id="cb-want" role="group" aria-labelledby={`${uid}-want`}>
        <h3 className="cb-sub" id={`${uid}-want`}>
          Vad vill du ha?
        </h3>
        <p className="cb-note">Välj vilka delar av menyn du vill ha. Därefter visas rätterna.</p>
        <div className="cb-chips">
          {available.map(({ role, title }) => {
            const on = choice.wanted.has(role)
            return (
              <label className={`cb-chip${on ? ' is-on' : ''}`} key={role}>
                <input type="checkbox" checked={on} onChange={() => toggleWanted(role)} />
                <span>{title}</span>
              </label>
            )
          })}
        </div>
      </div>

      {wanted.length > 0 && (
        <div className="cb-browse" id="cb-browse">
          <div className="cb-tabs" role="tablist" aria-label="Delar av menyn">
            {wanted.map(({ role, title }, index) => {
              const n = countOf(role)
              const selected = role === current
              return (
                <button
                  type="button"
                  role="tab"
                  key={role}
                  id={tabId(role)}
                  className={`cb-tab${selected ? ' is-active' : ''}`}
                  aria-selected={selected}
                  aria-controls={panelId(role)}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(role)}
                  onKeyDown={(e) => onTabKey(e, index)}
                >
                  <span>{title}</span>
                  {n > 0 && (
                    <>
                      {' '}
                      <span className="sr-only">Valda:</span>
                      {' '}
                      <span className="cb-tab-count">{n}</span>
                    </>
                  )}
                </button>
              )
            })}
          </div>
          {wanted.map(({ role }) => (
            <div className="cb-panel" role="tabpanel" id={panelId(role)} aria-labelledby={tabId(role)} hidden={role !== current} key={role}>
              {renderList(role)}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
