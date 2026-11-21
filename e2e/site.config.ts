/**
 * This site's own knobs for the shared test suite. The specs are the same in
 * every site repo (they come from site-template); only this file differs.
 */
export const site = {
  /**
   * The site's own pages. The kit's flows (booking, order, catering, gift
   * cards, events, legal) are added from the plan in site-config. A test
   * fails when the site links to a page missing from this list.
   */
  pages: ['/', '/meny', '/kolgrill', '/drinkmeny', '/dagens-lunch', '/historia', '/parkering', '/kontakt', '/bestall-hem', '/catering'],
  /** The page with the contact form or details, and the parking page (null when the site has none). */
  contactPath: '/kontakt' as string | null,
  parkingPath: '/parkering' as string | null,
  /** Light and dark mode with a toggle (booqy-theme). Anar has one look (dark). */
  themes: [] as ('light' | 'dark')[],
  /** The language switch: site-kit's picker in the top bar (sv, en, es, ar, fa). */
  language: {
    /** The branded dropdown's trigger. */
    trigger: '.language-switcher button',
    /** Option to pick, and text that then shows in the header. */
    option: 'English',
    expectText: /Contact/,
    expectLang: 'en',
  } as { trigger: string; option: string; expectText: RegExp; expectLang: string } | null,
  /** Parts of pages that change from run to run (masked in screenshots). */
  visualMasks: ['.guest-reviews'],
  /**
   * Decorative layers hidden in screenshots: full-page photos make every
   * baseline megabytes big and say nothing about the layout.
   */
  visualHide: ['.landing-bg', '.landing-bg-cycle'],
  /** Budgets on the dev site (Core Web Vitals "good" thresholds). */
  budgets: { lcpMs: 2500, cls: 0.1 },
}
