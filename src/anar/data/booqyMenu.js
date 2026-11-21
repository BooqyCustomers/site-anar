import { useMemo } from 'react';
import { useMenuList } from '@bookingsystemadvancedorg/site-kit';

/**
 * Anars menyer kommer från Booqy (GET /locations/{id}/menu via kitets
 * useMenuList). Restaurangen lägger in allt i Booqy admin; varje kategori
 * hamnar på en av sajtens sidor efter sitt namn:
 *
 * - "Dagens lunch: ..." (eller namn med "lunch")  -> Dagens lunch
 * - "Kolgrill", "Kabab ..."                        -> Kolgrill
 * - Drinkar, vin, mousserande, shots, öl och cider -> Drinkmeny
 * - allt annat                                     -> Meny (a la carte)
 *
 * Rätterna visas i den ordning Booqy skickar dem. Ett tillval med pris
 * (t.ex. Glas/Flaska) blir "89 / 359 kr"; tillval utan pris (t.ex. sorter
 * läsk) blir en punktlista.
 */

const DRINK_RE = /(drink|cocktail|vin\b|vin$|rött|vitt|rosé|mousserande|champagne|shots?\b|(^|[\s&])öl([\s&]|$)|cider)/i;

export function pageOfCategory(name = '') {
  const n = name.trim();
  if (/lunch/i.test(n)) return 'dagens';
  if (/kolgrill|kabab|kebab/i.test(n)) return 'kolgrill';
  if (DRINK_RE.test(n)) return 'drink';
  return 'meny';
}

/** Sidorna delar kategorier. Drinkmeny visar sina egna drinkkategorier och dessutom Drycker (samma data som på Meny). */
export function sectionsForPage(sections, page) {
  if (page === 'drink') return sections.filter((s) => s.page === 'drink' || /dryck/i.test(s.name));
  return sections.filter((s) => s.page === page);
}

/** Rubriken utan "Dagens lunch:" framför (på lunchsidan står det redan överst). */
export function lunchTitle(name = '') {
  return name.replace(/^\s*dagens\s+lunch\s*[:-]?\s*/i, '').trim() || name;
}

/** Priser för en rätt: grundpriset, plus ett per tillval med pris i den första prisgruppen. */
export function priceList(item) {
  const group = (item.options ?? []).find((g) => g.choices?.some((c) => c.price > 0));
  if (!group) return [item.price];
  return group.choices.map((c) => item.price + (c.price || 0));
}

export function priceText(item) {
  const prices = priceList(item).filter((p) => typeof p === 'number' && p > 0);
  if (!prices.length) return '';
  return `${prices.map((p) => (Number.isInteger(p) ? p : p.toFixed(2).replace('.', ','))).join(' / ')} kr`;
}

/** Tillval utan pris (sorter), visas som punktlista. */
export function varietyList(item) {
  const group = (item.options ?? []).find((g) => g.choices?.length && g.choices.every((c) => !c.price));
  return group ? group.choices.map((c) => c.name) : [];
}

/** Beskrivningen per rad; sista raden blir en kursiv not när det finns fler. */
export function descriptionParts(item) {
  const lines = (item.description ?? '')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return { text: lines, note: null };
  return { text: lines.slice(0, -1), note: lines[lines.length - 1] };
}

/** Booqys meny uppdelad per sida: [{ id, name, page, items }]. */
export function useBooqyMenu() {
  const { configured, loading, error, retry, items, categories } = useMenuList();
  const sections = useMemo(() => {
    const known = new Set(categories.map((c) => c.categoryId));
    const list = categories.map((c) => ({
      id: c.categoryId,
      name: c.name,
      page: pageOfCategory(c.name),
      items: items.filter((i) => i.category === c.categoryId),
    }));
    const rest = items.filter((i) => !known.has(i.category));
    if (rest.length) list.push({ id: 'ovrigt', name: 'Övrigt', page: 'meny', items: rest });
    return list.filter((s) => s.items.length > 0);
  }, [items, categories]);
  return { configured, loading, error, retry, sections };
}

/** Kort fast introtext från designen för kategorier med det namnet (Booqy har ingen kategoritext). */
export const CATEGORY_INTROS = {
  förrätter: [
    'Våra förrätter är baserade på gamla recept från olika delar av Iran. Med färska örter, aubergine, vitlök, yoghurt och persiska smaksättningar bjuder vi på rätter som passar både nyfikna och vana matälskare. Serveras alltid med traditionellt persiskt bröd - sangak.',
    '( Det går även att beställa som huvudrätt för 150 kr.)',
  ],
  'helgens kulinariska urval': [
    'Omsorgsfullt komponerade helgrätter som balanserar tradition och modern elegans - skapade för en raffinerad helgupplevelse.',
  ],
  'rött vin': ['Glas / flaska'],
  'öl & cider': ['Flaska 330 ml'],
};

export function categoryIntro(name = '') {
  return CATEGORY_INTROS[name.trim().toLowerCase()] ?? [];
}
