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
