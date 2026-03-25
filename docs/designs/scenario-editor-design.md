# Scenario Editor Design

**Component Type:** web-feature (dev tool)
**Status:** implemented
**Created:** 2026-03-16

Dev-only tool for editing `data/scenarios/south-mountain/scenario.json`.
Guarded by `MAP_EDITOR_ENABLED=true`. Route: `/tools/scenario-editor`.

---

## §1 Data Model

The scenario editor extends `scenario.json` with fields that affect game behaviour but cannot
be derived from the physical map. All new fields are optional (backward compatible) and validated
by `ScenarioSchema` in `server/src/schemas/scenario.schema.js`.

### Turn Structure (existing)

| Field            | Type    | Description                    |
| ---------------- | ------- | ------------------------------ |
| `firstTurn`      | string  | HH:MM clock time of first turn |
| `lastTurn`       | string  | HH:MM clock time of last turn  |
| `totalTurns`     | integer | Count of playable turns        |
| `minutesPerTurn` | integer | Game-clock minutes per turn    |
| `firstPlayer`    | enum    | `"union"` or `"confederate"`   |
| `date`           | string  | ISO date `"YYYY-MM-DD"`        |

### Lighting Schedule (new)

Array of `{ startTurn: integer, condition: "day" | "twilight" | "night" }` entries sorted by
`startTurn`. Each entry takes effect from `startTurn` until the next entry or end of game.

```json
"lightingSchedule": [
  { "startTurn": 1,  "condition": "day"      },
  { "startTurn": 28, "condition": "twilight"  },
  { "startTurn": 31, "condition": "night"     }
]
```

### Rules Fields (new, all optional)

| Field                           | Type               | Default | Description                                                            |
| ------------------------------- | ------------------ | ------- | ---------------------------------------------------------------------- |
| `nightVisibilityCap`            | positive integer   | —       | Maximum visibility range (hexes) during night                          |
| `flukeStoppageGracePeriodTurns` | non-negative int   | —       | Turns of grace after fluke stoppage trigger                            |
| `initiativeSystem`              | `"RSS"` \| `"LoB"` | —       | Which initiative rules apply                                           |
| `looseCannon`                   | boolean            | —       | Enable Loose Cannon rule (SM §X)                                       |
| `lossRecovery`                  | object             | —       | `{ enabled: boolean, triggerTime: string \| null }`                    |
| `randomEventsEnabled`           | boolean            | —       | Whether random events are in play                                      |
| `randomEventsTiming`            | string             | —       | When random events resolve (e.g. `"commandPhaseAfterOrderAcceptance"`) |

### Server-injected Field

| Field      | Type   | Description                                              |
| ---------- | ------ | -------------------------------------------------------- |
| `_savedAt` | number | Unix timestamp (ms) injected by the server on each `PUT` |

---

## §2 Architecture

```
ScenarioEditorView.vue          ← Vue 3 <script setup> SFC; owns all editor state
  └── ConfirmDialog.vue         ← shared push-overwrite and pull-discard dialogs

server/src/routes/scenarioEditor.js   ← Express Router; GET + PUT /api/tools/scenario-editor/data
server/src/schemas/scenario.schema.js ← Zod schema; validates PUT body
data/scenarios/south-mountain/
  scenario.json                 ← canonical source; written by PUT
  backups/scenario-<ts>.json    ← versioned server backups (max 20, trimmed automatically)
```

The scenario editor is registered in `server.js` alongside the map editor under the same
`MAP_EDITOR_ENABLED` guard:

```js
if (process.env.MAP_EDITOR_ENABLED === 'true') {
  const { default: scenarioEditorRouter } = await import('./routes/scenarioEditor.js');
  app.use('/api/tools/scenario-editor', scenarioEditorRouter);
}
```

The Vue route `/tools/scenario-editor` is always present in `client/src/router/index.js`.
Visiting without `MAP_EDITOR_ENABLED=true` on the server will produce API 404s.

---

## §3 Save Model

Identical to the map editor save model:

```
1. Mount       GET /api/tools/scenario-editor/data → load scenario.json into Vue state
               If fetch fails, fall back to localStorage draft (isOffline = true)
               If draft._savedAt > server._savedAt, keep using draft (newer local changes)
               If draft._savedAt ≤ server._savedAt, discard draft (server is authoritative)

2. Edit        Every field change → saveDraft() writes JSON to localStorage
               STORAGE_KEY = 'lob-scenario-editor-south-mountain-v2'
               unsaved = true while local changes are not yet pushed

3. Push        save() checks serverSavedAt vs. local draft._savedAt:
               - If server is newer → show ConfirmDialog ("Server data is newer. Overwrite?")
               - Otherwise → executePush(): PUT /api/tools/scenario-editor/data
               PUT body is Zod-validated; server injects _savedAt and writes scenario.json
               On success: localStorage draft cleared, unsaved = false

4. Pull        pullFromServer():
               - If unsaved → show ConfirmDialog ("Discard local changes and load server data?")
               - Otherwise → executePull(): GET /api/tools/scenario-editor/data, replace state

5. Backup      Server creates versioned backup before each write:
               data/scenarios/south-mountain/backups/scenario-<ISO-timestamp>.json
               Trims oldest files when count exceeds 20
```

---

## §4 Field Reference

### Editing Panels

**Turn Structure panel** — editable fields: First Turn, Last Turn, Minutes per Turn,
Total Turns, First Player (select), Date. Computed read-only: Game Duration.

**Lighting Schedule panel** — table of `{ startTurn, condition }` rows:

- Edit start turn via number input; edit condition via select (Day / Twilight / Night)
- Delete row with `×` button
- Add row with the Add form below the table; rows auto-sort by `startTurn`

**Rules panel** — editable fields: Night Visibility Cap, Fluke Stoppage Grace Period,
Initiative System (select: RSS / LoB), Loose Cannon (checkbox), Loss Recovery Enabled
(checkbox), Loss Recovery Trigger Time (text, disabled when Loss Recovery not enabled),
Random Events Enabled (checkbox), Random Events Timing (text).

### Dot-path `updateField`

Nested fields like `lossRecovery.enabled` are handled by the `updateField(path, value)`
function, which splits on `.` and applies the update one or two levels deep:

```js
updateField('lossRecovery.enabled', true);
// → scenarioData.lossRecovery = { ...scenarioData.lossRecovery, enabled: true }
```

---

## §5 Zod Schema

`ScenarioSchema` in `server/src/schemas/scenario.schema.js` validates the full document
on every `PUT`. All new fields are `.optional()` to preserve backward compatibility with
documents that predate this editor.

Key sub-schemas:

```js
const LightingCondition = z.enum(['day', 'twilight', 'night']);
const LightingEntry = z.object({
  startTurn: z.number().int().positive(),
  condition: LightingCondition,
  _note: z.string().optional(),
});
const LossRecovery = z.object({
  enabled: z.boolean(),
  triggerTime: z.string().nullable(),
  _note: z.string().optional(),
});
```

`initiativeSystem` is validated as `z.enum(['RSS', 'LoB'])`. Unknown values are rejected
with a 400 response.

---

## §6 Tests

| File                                                | Coverage                                                                                                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/src/schemas/scenario.schema.test.js`        | Base document, all new fields, backward compat, lighting schedule validation, nightVisibilityCap, initiativeSystem, lossRecovery                                    |
| `server/src/routes/scenarioEditor.test.js`          | GET, PUT valid/invalid, backup creation, `scenario-` prefix, `_savedAt` injection, 500 on backup failure, trim at 21 entries, new fields accepted                   |
| `client/src/views/tools/ScenarioEditorView.test.js` | Title/buttons, fetch error, offline banner, push/pull confirm dialogs, PUT fires, localStorage cleared, lighting CRUD, turn edit marks dirty, gameDuration computed |
