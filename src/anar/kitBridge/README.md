# Temporary bridge: the floor plan starts in 2D

site-kit (0.5.0 too) starts the floor plan in booking step 3 in 3D
(`useState('3d')` in `BokaBordPage.tsx`, no setting). Anar wants 2D first,
with 3D as a choice, so `floorView.ts` presses the kit's "2D" button the
first time a view toggle (`.floor-view-toggle`) is drawn, before the first
frame. The guest's own choice is remembered until the page reloads.
Installed in `src/main.tsx` (`installDefault2dView()`).

When the site bumps to a site-kit release with its own default view (or a
setting for it), delete this folder and the `installDefault2dView()` call in
`src/main.tsx`.

Anar's table colours are the `--seat-*` tokens in `src/anar/styles/kit.css`;
the table picker itself (breathing tables, pick effect, glide) is the kit's
since 0.4.0.

## Second bridge: names on doors and windows (`planLabels.ts`)

The layout API gives every door a `kind` ("entrance", "kitchen"), but site-kit
draws all doors alike and its types leave `kind` out. `planLabels.ts` fetches
the same layout (`layoutApi.getPublicActiveLayout`) and puts a small text on
each door and window in the 2D and 3D plan (Entré, Kök, Dörr, Fönster). It is
installed from `SiteLayout.jsx` with the location id, the styles are in
`src/anar/styles/plan-labels.css`, and the kit's translator translates the
text because it is real text in the page.

It matches by order (the N-th door in the page is the N-th door in the data)
and names nothing when the counts differ. When site-kit names doors and
windows itself, delete `planLabels.ts`, its test, `plan-labels.css` and the
`installPlanLabels` call in `SiteLayout.jsx`.

## Third to fifth bridge: "Spelar ingen roll", the magnifying lens and the zoom buttons

Both work on booking step 3 ("Välj ert bord") and are installed together with
`planLabels.ts` from `SiteLayout.jsx`. `layoutData.ts` fetches the layout once
per location for all of them.

- `tableMode.ts` (+ `plan-mode.css`): two choices at the top of step 3,
  "Välj bord själv" and "Spelar ingen roll". In the second the bridge presses
  one of the kit's table buttons (a single table with the fewest seats that fit,
  random among equals), and the plan and the list are hidden until the guest
  switches back. It needs `fieldset.booking-step`, `.booking-table-list` and
  the `data-option` on its buttons.
- `planLens.ts` (+ `plan-lens.css`): a round lens that follows the mouse over the
  2D or 3D plan and shows a 2.2 times larger copy of it. Mouse only. It needs
  `.f3d-scene` and `.floor-svg-frame`.

- `planZoom.ts` (+ `plan-zoom.css`): "+" and "-" buttons on the plan for mobile
  (700 px and narrower, or a touch screen). 2D: the SVG gets bigger in a scroll
  box; 3D: the scene is scaled around the middle and an up and down drag moves
  it. It sets `--plan-zoom` and `data-plan-zoom` on `.floor-wrap`. It needs
  `.floor-wrap`, `.floor-svg-frame` and `.f3d-scene`.

When site-kit has its own "any table" choice, magnifier and zoom, delete the
modules, their tests, the CSS files and the calls in `SiteLayout.jsx`.
