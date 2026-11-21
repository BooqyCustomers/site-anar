# Instructions for Claude and developers

This file is read automatically by Claude Code. Keep it current: when you finish a task, update "State of this repo" (date, what changed, what is left) in the same commit.

## State of this repo (updated 2026-11-21)

- Anar's site. Dev preview: https://anar.dev.booqy.se. Production from `main`.
- Uses site-kit 0.5.0 (`package.json`).
- Swedish copy, five languages for guests (owner 2026-11-20): Swedish (default), English, Spanish, Arabic and Persian, translated by site-kit with Amazon Translate (cached, `/api/translate` behind AWS WAF). Anar writes only Swedish: `src/anar/i18n/strings.js` (`t()` and `useLanguage()` stay). The picker is the kit's `LanguagePicker`, placed by `src/anar/components/LanguageSwitcher.jsx` in the top bar at the right (`Header.jsx` `.site-header-tools`: after the links on desktop, next to the menu button on phones and tablets, the logo stays centred; black glass pill, `language-switcher.css`, `header.css`), a normal import from site-kit. After any site-kit bump: check every page at 390, 820 and 1440 in all five languages (Arabic and Persian in right-to-left). The header stays left to right in every language (`header.css`) so the burger and the panel stay on the right. Never translate with your own code; mark names, address and contact data with `translate="no"`. Anar's name (`meta.brand`, "ANAR") and the catering dish names are protected with the kit's `useKeepTerms` (`SiteLayout.jsx`, `MenuPicker.tsx`); catering dish names and package contents are `translate="no"`, prices read "per portion" / "per gäst". The footer credit's company name (IT Hjälparna Nordic AB, `DEVELOPER` in `Footer.jsx`) is `translate="no"`; only the sentence before it is translated. Site language rules: site-template `CLAUDE.md`, section Languages. The old English and Persian texts and the Persian font stay gone.
- Menus (Meny, Drinkmeny, Dagens lunch, and Kolgrill by URL only) are read from Booqy. Dish photos come from Booqy too (`src/anar/components/DishPhoto.jsx`, image CDN `menuImageBaseUrl` in `booqy.json`).
- The header has a Catering button that is always shown. `/catering` shows Anar's own catering form (`src/anar/catering/`, loaded on demand) when the location has catering switched on in Booqy (`location.catering`), otherwise "Under utveckling" (`src/anar/pages/CateringPage.jsx`). Dev has catering on; prod has no catering settings yet. When prod is ready, set `CATERING_PLACEHOLDER_UNTIL_ENABLED` to `false` in `src/App.tsx`. The offer, BankID signing and payment after sending are still the kit's (`CateringRequest`).
- The catering form: the guest ticks what they want instead of typing a quantity per dish. Starters, mains, desserts and packages have no quantity: the site gives each guest one portion per group and splits the guests evenly over what is ticked, and the "Kalkyl" shows only an approximate price ("ca", rounded to 100 kr, split in Mat and Dryck). Drinks: tick which, then "one per guest of each" (default) or the guest's own number per drink. Dishes the site cannot place in a group ("Övrigt") get a quantity field. A catering dish's group (and photo) comes from the regular-menu dish with the same name, because the catering menu in Booqy has no categories. The request carries a note (`ESTIMATE_NOTE`) that the quantities are an estimate. Drinks count as portions against the location's `maxPortions` (300 in dev); the form explains that limit in plain words (`guestError` in `form.ts`). Logic: `selection.ts` and `form.ts` (unit tests). Page: `CateringBuilder.tsx` and `MenuPicker.tsx`. Styles: `src/anar/styles/catering-builder.css`.
- Temporary: the form repeats the kit's CateringPage (same API calls, fields and Swedish texts) because the kit has no way to tick instead of type. site-kit 0.5.0 still has no tick-to-select catering flow. When site-kit has it, go back to the kit's flow and delete `src/anar/catering/` and `catering-builder.css` in the same PR as the bump.
- Beställ hem has no "Ring och beställ" section, and `/kolgrill` is no longer linked from the menus.
- The floor plan in the booking starts in 2D (`src/anar/kitBridge/floorView.ts`, see its README): temporary, because site-kit 0.5.0 still starts in 3D with no setting. Remove the folder when the site bumps to a site-kit release with its own default view, in the same PR as the bump. The table picker (breathing tables, pick effect, glide) and the visible checkboxes are the kit's since 0.5.0; Anar's table colours are the `--seat-*` tokens in `kit.css`.
- `main` and `dev` have no common history. Do not merge or rebase one onto the other without the Booqy owner.
- Open: the catering terms (`terms`) are empty in dev; prod has no catering settings or catering menu yet; the catering menu has no categories (ask Booqy for a `category` on catering dishes, then the name lookup can go); no real request has been sent from the new form because a request cannot be withdrawn, so the Booqy owner should send one in dev and delete it; site-kit's `MarketingConsent` has an `aria-controls` that points at an element that does not exist (axe critical, fails the e2e `ui` test for `/catering` at every width, also with the kit's own form) and the kit's date field has a 32 px calendar button (under 44 px on touch): both belong in site-kit.
- Last work (2026-11-21): site-kit 0.3.0 to 0.5.0 (the language picker now shows for guests; the version-safe language bridge, the table picker bridge and the checkbox override removed; the 2D floor plan bridge stays; header links a little tighter so they fit on one row next to the picker from 1366 px, except Spanish; Google, foodora and Uber Eats marked `translate="no"`). Checked at 375, 390, 820 and 1440 in sv, en, es, ar and fa, light and dark. Before that (2026-11-20) site languages live-test fixes (picker moved into the top bar at the right on all widths, Anar's name and catering dish names never translated, no split sentences in the catering form; checked at 390, 820 and 1440 in sv, en, ar and fa with a local build of the next site-kit: no layout shift on /meny and /catering); before that site languages (picker and right-to-left safe styles, on top of the Swedish-only site); before that the catering form where the guest ticks dishes and drinks (hidden quantities, approximate calculation); before that Anar's design ported from the old site, site-kit 0.3.0, language removed, catering and dish photos wired up.

## Rules for every BooqyCustomers repo

Booqy is a multi-tenant restaurant SaaS (booking, ordering, catering, marketing). Each `site-<slug>` repo is one restaurant's own website: only the look (layout, pages, styles). Booking, menu, ordering, payment, catering and GDPR pages come from the npm package `@bookingsystemadvancedorg/site-kit` (repo `BookingSystemAdvancedOrg/site-kit`). Read `README.md` and `docs/DATA-RULES.md` before changing anything.

**Branches and merging (avoid conflicts):**
- Only `dev` and `main` exist. Work on `dev`, or on a short-lived branch merged into `dev` the same day and then deleted. Never push directly to `main`; going live is a PR `dev` -> `main` that the Booqy owner approves.
- Before you start, and again before every push: `git fetch origin && git rebase origin/dev`. Keep commits small and focused; push each finished piece at once.
- Push to `dev` deploys to the dev preview (`https://<slug>.dev.booqy.se`); push to `main` deploys to production. Watch the `Deploy` run after every push and fix what you broke.
- `.github/` (workflows, Dependabot) belongs to the Booqy owner: propose changes, do not edit.
- In some repos `main` and `dev` have no common history (they were created separately). Do not try to merge or rebase them onto each other; ask the owner how to go live.

**Data:**
- `dev` only ever uses fake data: the restaurant's dev twin in the dev Booqy Admin (`https://restaurang.dev.booqy.se`) plus the dev-only example data in `src/devPlaceholders/` (only where the repo has it). Stripe is test mode (`4242 4242 4242 4242`).
- `main` only ever uses the restaurant's real production data. Production never shows example data.
- The restaurant enters its own location, menu, opening hours and contact details in its Booqy Admin. Never create or edit that data, not even in dev; if something is missing, rely on the placeholders and note it.
- Delete any test bookings or orders you create in dev right after the test.

**Copy and style:**
- All site copy is Swedish.
- Never use the em dash (U+2014) or en dash (U+2013), not even as `&mdash;` or `&ndash;`. Use a comma, colon, parentheses or a hyphen.
- Check every UI change yourself at phone (390), tablet (820) and desktop (1440) widths, in every theme the site has.
- Never put secrets in the repo (deploys use OIDC; `booqy.json` holds nothing secret).

**Consent checkboxes (owner decision 2026-11-19, applies to every site):**
- The booking terms box ("Jag godkänner bokningsvillkoren") starts unticked; the guest must tick it.
- The marketing consent box also starts unticked, always. A pre-ticked box is not valid consent under GDPR (CJEU Planet49). Never pre-tick it; raise sign-ups only with better wording.
- Both boxes must be visible without hover (fix below).

**site-kit and fixes that every site needs:**
- Anything every site needs belongs in site-kit, not here. A site-kit change also has to be copied to `customer-front-end/packages/site-kit` (CI sync check).
- Sites build from the published site-kit version in `package.json`. Publishing is a tag `vX.Y.Z` on site-kit `main`, done by the Booqy owner; then each site bumps the dependency (Dependabot opens the PR to `dev`).
- New sites need site-kit 0.3.0 or later: guest form posts go through AWS WAF via `/api/*` on the site's own domain.
- Guest links use the restaurant's own domain once it is live (`<slug>.booqy.se` then 301-redirects to it).

**Temporary overrides to remove later:**
- Checkbox visibility (2026-11-19). site-kit up to 0.4.0 drew `.booking-check` checkboxes with CSS variables no theme defines, so the boxes were invisible until hover. Fixed in site-kit 0.5.0. Until a site runs 0.5.0 or later, it carries an override; when it bumps, delete the override in the same PR and check that the boxes still show. This site runs 0.5.0 and has no override.
