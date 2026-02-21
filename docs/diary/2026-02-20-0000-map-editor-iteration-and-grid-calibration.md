# 2026-02-20 — Map editor iteration and the grid calibration tool

The big push today was getting the map editor into a genuinely usable state. The problem with digitizing a hex map from a scanned image is purely one of alignment: the hex grid you draw in code has to line up precisely with the printed grid on the physical map, and even small errors in origin offset or hex radius accumulate badly over 64 columns. So before any terrain data is useful, you need to be able to calibrate the overlay.

### The calibration tool

`CalibrationControls.vue` ended up being the centrepiece of today's work. It exposes eight numeric parameters that fully describe the hex grid geometry: `cols` and `rows` (the grid dimensions), `dx` and `dy` (the anchor offset from the image's lower-left corner), `hexWidth` and `hexHeight` (the x and y radii of each hex), `imageScale` (zoom factor for the image itself, useful for fine work), and `strokeWidth` (overlay line weight). Alongside those, two toggle buttons handle the two degrees of orientation freedom: flat-top vs. pointy-top, and the `evenColUp` flag that controls which columns offset upward in the staggered grid layout.

Every change emits immediately to `MapEditorView`, which writes the updated calibration to `localStorage` under the key `lob-map-editor-calibration-v4`. That persistence matters — the calibration survives page refreshes and is also embedded into `map.json` as the `gridSpec` field whenever you save. When the editor loads, it reads `gridSpec` back from the server and initialises from there. The effect is that calibration is always in sync with the data file; there's no separate calibration state to manage.

The **calibration mode** toggle in `CalibrationControls` is the key tool for actually aligning the grid. When it's on, `HexMapOverlay` renders all hex borders (purple) and prints each hex's coordinate label in yellow at the cell centre. When it's off, only VP hexes (red outline) and the currently selected hex (yellow outline) are rendered — which keeps the overlay clean during terrain editing. Switching back and forth between the two modes is how you verify alignment as you tweak the parameters.

### HexMapOverlay and the coordinate system

`HexMapOverlay.vue` does the geometry work. It uses the `honeycomb-grid` library — `defineHex`, `Grid`, `rectangle`, `Orientation` — to construct a grid of hex objects from the calibration parameters, then translates them onto an SVG that sits absolutely positioned over the map image.

The coordinate mapping took some thought. The South Mountain map uses a column-row convention where column 01, row 01 is the lower-left hex. The honeycomb-grid library's internal `col`/`row` origin is the upper-left. To bridge these: the anchor hex in the honeycomb grid is `col=0, row=gridRows-1` (bottom-left), and the translation (`tx`, `ty`) is computed so that anchor hex lands at `(dx, imageHeight * imageScale - dy)` in image space. Game hex IDs are formatted as `col.row` with zero-padding to two digits — `19.23`, `01.01`, etc.

One performance detail: the overlay only renders a subset of hexes. In calibration mode all cells are visible. In edit mode the filter keeps only VP hexes and the selected hex. For a 64×35 grid that's 2,240 SVG polygons suppressed most of the time, which matters for responsiveness given that calibration changes trigger a full recompute.

Clicks on the SVG are handled by transforming the client-space click point through `svg.getScreenCTM().inverse()` to get SVG-local coordinates, then calling `grid.pointToHex()` to identify the hex. The resulting game ID is emitted up to `MapEditorView` as `hex-click`.

### The hex edit panel

`HexEditPanel.vue` handles all the terrain data for a clicked hex. The field set matches the SM terrain model directly:

- **Terrain**: `clear`, `woods`, `slopingGround`, `woodedSloping`, `orchard`, `marsh`, `unknown`
- **Elevation**: numeric, corresponding to contour level (SM uses 50ft intervals per rule 1.1)
- **Hexsides**: six directions (N, NE, SE, S, SW, NW), each a dropdown — `stream`, `road`, `pike`, `trail`, `slope`, `extremeSlope`, `verticalSlope`, `stoneWall`
- **VP Hex** and **Entry Hex** checkboxes, the latter paired with a Union/Confederate side selector
- A free-text **Note** field for anything that doesn't fit the schema
- A read-only **Setup Units** list populated from `scenario.json` data

The panel serialises its output compactly — only non-empty and non-false fields are included in the emitted object. That keeps `map.json` lean; unset hexsides are simply absent rather than stored as empty strings.

### Server side: the map editor route and toggle pattern

`server/src/routes/mapEditor.js` is simple: `GET /data` reads `map.json` synchronously and responds with the JSON; `PUT /data` runs the body through `MapSchema.safeParse` and either writes the file or returns a 400 with the Zod issue array. The synchronous file I/O is intentional for a dev tool — no concurrency concerns, no async error surface.

The route is only mounted when `MAP_EDITOR_ENABLED=true`. In `server.js` this is guarded with a dynamic `await import(...)`:

```js
if (process.env.MAP_EDITOR_ENABLED === 'true') {
  const { default: mapEditorRouter } = await import('./routes/mapEditor.js');
  app.use('/tools/map-editor/assets', express.static(join(__dirname, '../../docs'), ...));
  app.use('/api/tools/map-editor', mapEditorRouter);
}
```

The static middleware serves the `docs/` directory at `/tools/map-editor/assets`, which gives the client access to `SM_Map.jpg` and the PDFs without any separate asset pipeline. The `scripts/map-editor.sh` launcher sets the env flag, starts server and client in parallel background processes, polls port 5173 until the Vite dev server is ready, then calls `open` to bring up the browser. A `trap` on EXIT/INT/TERM ensures both child processes are killed cleanly on Ctrl-C.

### Docs resync

Wrapped up the day by bringing all the documentation into alignment with the actual codebase. `CLAUDE.md` no longer says "no code exists." `README.md` gained Architecture, Project Structure, Developer Tools, and Testing sections. `HLD.md` got an implementation status callout, map editor route entries in the backend architecture section, developer tools API documentation, an accurate directory tree, and updated ESLint/Vitest config excerpts. The `HLD_PROMPT.md` was marked as an archived template. All changes passed `npm run lint` and `npm run format:check` clean.
