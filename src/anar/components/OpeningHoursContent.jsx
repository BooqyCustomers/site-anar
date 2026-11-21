import { useLocationInfo, useSite } from '@bookingsystemadvancedorg/site-kit';
import { DAY_ORDER, MEAL_SECTIONS } from '../data/openingHours';
import { useLanguage } from '../i18n/LanguageContext';

/** "11:00" -> "11", "14:30" blir kvar, som i Anars egna tider. */
const short = (time) => time.replace(/:00$/, '');

/** Platsens veckotider i Booqy, en rad per dag i Anars ordning. */
function bookingRows(businessHours) {
  return DAY_ORDER.map((dayKey) => {
    const ranges = businessHours?.[dayKey] ?? [];
    return ranges.length
      ? { dayKey, hours: ranges.map((r) => `${short(r.opensAt)}-${short(r.closesAt)}`).join(', ') }
      : { dayKey, closed: true };
  });
}

/**
 * Restaurangens och avhämtningens tider kommer från platsen i Booqy, liksom
 * avvikande dagar; lunch och middag är Anars fasta tider (data/openingHours.js).
 */
function useHoursSections() {
  const { location } = useSite();
  const { specialDays } = useLocationInfo();
  const rows = bookingRows(location.businessHours);
  return [
    { id: 'restaurant', rows },
    ...(location.ordering?.pickup ? [{ id: 'avhamtning', rows }] : []),
    ...MEAL_SECTIONS,
    ...(specialDays.length
      ? [{ id: 'special', rows: specialDays.map((d) => ({ dayKey: d.date, label: d.label, hours: d.text })) }]
      : []),
  ];
}

export default function OpeningHoursContent({
  className = '',
  sectionIds = null,
  allSectionsOpen = false,
  staticSections = false,
}) {
  const { t } = useLanguage();
  const all = useHoursSections();

  const sections =
    sectionIds && sectionIds.length > 0
      ? sectionIds.map((id) => all.find((s) => s.id === id)).filter(Boolean)
      : all;

  const tableFor = (section) => (
    <table className="opening-hours-table">
      <tbody>
        {section.rows.map((row) => (
          <tr key={`${section.id}-${row.dayKey}`}>
            <th scope="row">{row.label ?? t(`days.${row.dayKey}`)}</th>
            <td>{row.closed ? t('hours.closed') : row.hours}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className={`opening-hours ${className}`.trim()}>
      {sections.map((section, i) =>
        staticSections ? (
          <div
            key={section.id}
            className="opening-hours-section opening-hours-section--static"
          >
            <h3 className="opening-hours-section-title">
              {t(`hours.sections.${section.id}`)}
            </h3>
            {tableFor(section)}
          </div>
        ) : (
          <details
            key={section.id}
            className="opening-hours-section"
            open={allSectionsOpen || i === 0}
          >
            <summary className="opening-hours-summary">
              {t(`hours.sections.${section.id}`)}
            </summary>
            {tableFor(section)}
          </details>
        )
      )}
    </div>
  );
}
