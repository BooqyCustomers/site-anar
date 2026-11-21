import { STRINGS } from './strings';

/**
 * Sajten har ett språk (svenska) tills Booqys översättningar (AWS Translate,
 * via Booqy) finns; då byggs språkvalet upp här igen. useLanguage är kvar så
 * att komponenterna inte behöver ändras.
 */
export function t(key, params) {
  let s = STRINGS[key] ?? key;
  if (params && typeof s === 'string') {
    s = s.replace(/\{(\w+)\}/g, (_, k) =>
      Object.prototype.hasOwnProperty.call(params, k) ? String(params[k]) : `{${k}}`
    );
  }
  return s;
}

const LANGUAGE = { t };

export function useLanguage() {
  return LANGUAGE;
}
