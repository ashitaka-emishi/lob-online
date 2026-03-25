# OOB Editor Design

**Component Type:** web-feature (dev tool)
**Status:** draft
**Created:** 2026-03-25

---

## Intent

The OOB Editor is a standalone developer tool that lets developers view and edit all Order of
Battle data for the South Mountain scenario — command hierarchy, unit stats, leader succession,
and counter image linkages — in a single visual interface. It fills the same role for `oob.json`
and `leaders.json` that the Map Editor fills for `map.json` and the Scenario Editor fills for
`scenario.json`: a purpose-built UI for data that is too large and too structured to edit
comfortably by hand. The editor is guarded by `MAP_EDITOR_ENABLED=true` and has zero impact on
game runtime.

---

## Proposed Solution

### Page & Launch

| Item          | Value                                                                                |
| ------------- | ------------------------------------------------------------------------------------ |
| Route         | `/tools/oob-editor`                                                                  |
| Guard         | `MAP_EDITOR_ENABLED=true` (same as map editor)                                       |
| Launch script | `scripts/oob-editor.sh` (copy of `scripts/map-editor.sh`, opens `/tools/oob-editor`) |
| npm script    | `npm run dev:oob-editor` in root `package.json`                                      |

The home page (`StatusView.vue`) gains a **Dev Tools** section with router-link buttons to
`/tools/map-editor` and `/tools/oob-editor`. Buttons are only rendered when
`import.meta.env.VITE_MAP_EDITOR_ENABLED === 'true'` (passed via `.env`/Vite).

### Counter Image Storage

All counter images (pre-processed from `docs/reference/src-counters-sm/` or uploaded via the
editor) are stored in `client/public/counters/` and tracked in git. Vite serves this directory
as static in dev; Express static middleware serves it in production. The existing
`docs/reference/src-counters-sm/` directory remains the raw source; the auto-detection script
(see below) copies and renames files into `client/public/counters/`.

### Data Model Changes

Two existing files are edited; no new data files are added.

#### `counterRef` schema (shared by all node types)

All unit nodes (regiment, battery, brigade, division, corps) and all leader records gain a
`counterRef` field. The shape is a direct filename reference — no sheet/number indirection:

```jsonc
// Regiment, battery, brigade, division, corps
"counterRef": {
  "front": "CS1-Front_07.jpg",   // filename in client/public/counters/, or null
  "back":  "CS1-Back_07.jpg"     // filename in client/public/counters/, or null
}

// Leader — same base shape plus optional promoted-leader images
"counterRef": {
  "front":         "CS1-Front_42.jpg",
  "back":          "CS1-Back_42.jpg",
  "promotedFront": "Hooker Promoted.jpg",   // null if no promoted variant
  "promotedBack":  "Hooker Promoted2.jpg"   // null if no promoted variant
}
```

`counterRef` is nullable at the top level (null = not yet linked). Individual filename fields
within it are also nullable (null = that face not yet assigned).

#### `oob.json` — add `successionIds` and `counterRef` to all unit nodes

`successionIds` applies to brigade, division, and corps nodes only. `counterRef` applies to
all node types (regiment, battery, brigade, division, corps).

```jsonc
// Brigade example
{
  "id": "1b-1d-1c",
  "name": "1/1/1 (Phelps)",
  "successionIds": ["phelps", "coulter", "lyle"],
  "counterRef": { "front": "CS1-Front_15.jpg", "back": "CS1-Back_15.jpg" },
  ...
}

// Regiment example
{
  "id": "22ny",
  "name": "22 NY",
  "counterRef": { "front": "CS1-Front_07.jpg", "back": "CS1-Back_07.jpg" },
  ...
}
```

`successionIds` is an ordered array of leader IDs from `leaders.json`. The first entry is the
primary commander; subsequent entries take command in order as earlier leaders become casualties.
Empty array = no succession defined. Placing succession on the command slot (not the leader
record) directly supports the casualty replacement flow: when a leader is lost, look up the
owning unit's `successionIds`, find the next entry, promote that leader's counter, and continue
the chain. If the list is exhausted, the unit receives a generic leader counter with 0
initiative.

#### `leaders.json` — add `counterRef` to every leader record

```jsonc
{
  "id": "hooker",
  "name": "Joseph Hooker",
  ...
  "counterRef": {
    "front":         "CS1-Front_42.jpg",
    "back":          "CS1-Back_42.jpg",
    "promotedFront": null,
    "promotedBack":  null
  }
}
```

### Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  OOB Editor          [Union] [Confederate]      [Pull] [Push] [💾] │
├───────────────────┬────────────────────────────────────────────────┤
│  Hierarchy Tree   │  Detail Panel                                  │
│                   │                                                │
│  ▶ 1 Corps        │  [ selected unit fields ]                      │
│    ▼ 1/1 Div      │                                                │
│      ▼ 1/1/1 Brig │                                                │
│        ● Phelps   │                                                │
│        22 NY      │                                                │
│  ▶ 2 Corps        │                                                │
│  ...              │                                                │
└───────────────────┴────────────────────────────────────────────────┘
```

- **Sidebar** (≈320 px): collapsible tree — Corps → Division → Brigade → Leader + Regiments/Batteries.
  Each node shows unit name and a coloured type badge (infantry / cavalry / artillery / leader).
  Clicking a node selects it and populates the detail panel.
- **Detail panel**: scrollable form, content varies by node type (see below).
- **Toolbar**: side toggle (Union / Confederate), Pull / Push buttons, unsaved-changes indicator.
- The unit hierarchy structure is **fixed** — the editor does not support moving units between
  parents.

### Hierarchy Tree

- Rendered with recursive `OobTreeNode.vue` component.
- Expand/collapse state is local (not persisted).
- Leader nodes are shown **inline under the unit they command** (resolved via `commandsId`),
  displayed above the regiment/battery list for that unit.
- Visual type badges use CSS classes: `.badge-infantry`, `.badge-cavalry`, `.badge-arty`,
  `.badge-leader`.
- The active selection is highlighted; the path from root to selection is shown as a breadcrumb
  above the detail panel.

### Detail Panel — field sets by node type

**Regiment / Battery**

| Field            | Type                 | Notes                                                      |
| ---------------- | -------------------- | ---------------------------------------------------------- |
| id               | read-only text       |                                                            |
| name             | text input           |                                                            |
| type             | select               | infantry / cavalry / artillery                             |
| morale           | select               | A / B / C / D                                              |
| weapon / gunType | select               | R / M / SR / C (infantry); R / N / H / L / HvR (artillery) |
| strengthPoints   | number               |                                                            |
| stragglerBoxes   | number               | infantry/cavalry only                                      |
| ammoClass        | select               | B / C / D — artillery only                                 |
| counterRef       | counter image widget | front and back counter images                              |

**Brigade**

| Field           | Type                 | Notes                                  |
| --------------- | -------------------- | -------------------------------------- |
| id              | read-only text       |                                        |
| name            | text input           |                                        |
| morale          | select               | A / B / C / D                          |
| wreckThreshold  | number               |                                        |
| wreckTrackTotal | number               |                                        |
| successionIds   | succession editor    | ordered list of leader IDs (see below) |
| counterRef      | counter image widget | front and back counter images          |

**Division**

| Field                  | Type                 | Notes                         |
| ---------------------- | -------------------- | ----------------------------- |
| id                     | read-only text       |                               |
| name                   | text input           |                               |
| divisionStragglerBoxes | number               |                               |
| divisionWreckThreshold | number               |                               |
| successionIds          | succession editor    | ordered list of leader IDs    |
| counterRef             | counter image widget | front and back counter images |

**Corps** — same shape as division plus `successionIds` and `counterRef`.

**Leader**

| Field            | Type                 | Notes                                         |
| ---------------- | -------------------- | --------------------------------------------- |
| id               | read-only text       |                                               |
| name             | text input           |                                               |
| rank             | text input           |                                               |
| commandLevel     | select               | army / wing / corps / division / brigade      |
| commandsId       | text input           | ID of the unit this leader commands           |
| initiativeRating | number (nullable)    |                                               |
| specialRules     | textarea (JSON)      | free-form JSON blob                           |
| counterRef       | counter image widget | front, back, and optional promoted front/back |

### Succession Editor (reusable component `SuccessionList.vue`)

- Renders an ordered list of leader names resolved from `successionIds`.
- Add: type-ahead search over all leaders for the same side → appends to list.
- Remove: click × on any entry.
- Reorder: up/down arrow buttons (no drag-and-drop).
- Displays "no succession defined" when the array is empty.

### Counter Image Widget (`CounterImageWidget.vue`)

Shown on all detail panels (regiment, battery, brigade, division, corps, and leader).

- Displays front and back image thumbnails resolved from `counterRef` filenames via the static
  `client/public/counters/` path.
- For leader nodes, shows an additional promoted-leader row (front + back) when
  `promotedFront`/`promotedBack` are non-null.
- If a filename is null or the image 404s: shows a grey placeholder with a **Browse…** button.
- **Browse…** opens a native file picker; on selection, POSTs the file to
  `/api/counters/upload`, which saves it into `client/public/counters/` and returns the saved
  filename. The widget then updates `counterRef` with the returned filename.
- Each filename is displayed as an editable text input below its thumbnail so developers can
  point a unit at an existing file without uploading.

### Counter Auto-Detection Script

A one-time developer script (`scripts/detect-counters.js`) uses AI image analysis (Claude
vision API) to scan all images in `docs/reference/src-counters-sm/`, match each counter to a
unit or leader in `oob.json` / `leaders.json` based on the printed text and insignia visible
on the counter face, and write the resolved `counterRef` filenames back to both data files.
Matched source images are copied into `client/public/counters/` with their original names
(e.g., `CS1-Front_42.jpg`). The script produces a summary report of matched and unmatched
counters for manual review. Unmatched entries are left as `null` for the editor to fill in.

The script is run once by a developer (`node scripts/detect-counters.js`) and is not part of
any automated build or CI pipeline.

### Pinia Store (`useOobStore.js`)

```
state
  oob          — full parsed oob.json object
  leaders      — full parsed leaders.json object
  selectedNode — { type: 'oob'|'leader', path: string } — dot-path to selected node
  dirty        — boolean

actions
  loadFromServer()               — GET /api/oob/data + /api/leaders/data
  loadFromStorage()              — reads localStorage keys
  saveToStorage()                — writes localStorage keys (debounced 500 ms)
  pushToServer()                 — PUT /api/oob/data + /api/leaders/data
  updateField(path, value)       — deep update + sets dirty=true
  updateSuccession(unitPath, newIds)
  updateCounterRef(nodePath, counterRef)
```

### Server Routes

**`/api/oob`** — mirrors `mapEditor.js` pattern exactly

| Method | Path                | Action                                            |
| ------ | ------------------- | ------------------------------------------------- |
| GET    | `/api/oob/data`     | Read `data/scenarios/south-mountain/oob.json`     |
| PUT    | `/api/oob/data`     | Validate (OobSchema), backup, write               |
| GET    | `/api/leaders/data` | Read `data/scenarios/south-mountain/leaders.json` |
| PUT    | `/api/leaders/data` | Validate (LeadersSchema), backup, write           |

Both routes use the same rate-limiter (60 req/min), backup rotation (max 20), and
`_savedAt` timestamp pattern as `mapEditor.js`.

**`/api/counters`** — upload only (serving handled by Vite/Express static middleware)

| Method | Path                   | Action                                                                       |
| ------ | ---------------------- | ---------------------------------------------------------------------------- |
| GET    | `/api/counters/list`   | Return array of all filenames in `client/public/counters/`                   |
| POST   | `/api/counters/upload` | Accept `multipart/form-data`; validate and save to `client/public/counters/` |

### Zod Schemas

- `OobSchema` — validates full `oob.json` including `successionIds` (string array, optional,
  default `[]`) and `counterRef` (`{ front, back }`, nullable) on all node types.
- `LeadersSchema` — validates full `leaders.json` including `counterRef`
  (`{ front, back, promotedFront, promotedBack }`, all string|null), nullable at top level.
- Both schemas live in `server/src/schemas/` alongside the existing `map.schema.js`.

### Persistence Strategy (same as map editor)

1. On mount: try `GET /api/oob/data` + `GET /api/leaders/data`; on failure fall back to
   localStorage keys `lob-oob-editor-v1` / `lob-leaders-editor-v1`; on failure use bundled
   default (import of the JSON files).
2. Every edit: debounced auto-save to localStorage.
3. **Pull button**: re-fetches from server, overwrites local state (confirms if dirty).
4. **Push button**: validates and PUTs to server; shows success/error toast.

### Files to Create

```
client/src/views/tools/OobEditorView.vue
client/src/components/OobHierarchyTree.vue
client/src/components/OobTreeNode.vue
client/src/components/OobDetailPanel.vue
client/src/components/SuccessionList.vue
client/src/components/CounterImageWidget.vue
client/src/stores/useOobStore.js
server/src/routes/oobEditor.js
server/src/routes/oobEditor.test.js
server/src/routes/leadersEditor.js
server/src/routes/leadersEditor.test.js
server/src/routes/counters.js
server/src/routes/counters.test.js
server/src/schemas/oob.schema.js
server/src/schemas/leaders.schema.js
scripts/oob-editor.sh
scripts/detect-counters.js
client/public/counters/              — counter image assets (tracked in git)
```

### Files to Modify

```
client/src/router/index.js          — add /tools/oob-editor route
client/src/views/StatusView.vue     — add Dev Tools nav buttons
server/src/index.js                 — mount /api/oob, /api/leaders, /api/counters routes
package.json                        — add dev:oob-editor script
data/scenarios/south-mountain/oob.json      — add successionIds + counterRef fields
data/scenarios/south-mountain/leaders.json  — add counterRef fields
```

---

## Open Questions

- [ ] **detect-counters.js confidence threshold**: Should the auto-detection script write all
      matches (including low-confidence ones) to the data files and flag them, or only write
      high-confidence matches and leave the rest null for manual resolution in the editor?

---

## Issues

- #189 — add `successionIds` and `counterRef` to OOB schema and data
- #190 — add `counterRef` to leaders schema and data
- #191 — server routes: `/api/oob`, `/api/leaders`, `/api/counters`
- #192 — OOB editor: hierarchy tree and Pinia store
- #193 — OOB editor: detail panel — all unit types with counter image widget
- #194 — OOB editor: leader detail panel with counter image widget (incl. promoted images)
- #195 — OOB editor: succession list component
- #196 — `npm run dev:oob-editor` launch script and home page nav buttons
- #197 — counter auto-detection script (`scripts/detect-counters.js`)
