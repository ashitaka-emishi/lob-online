# Specification: Multi-Module Platform — Module-Scoped Routes and Scenario Starts

**Track ID:** multi-scenario-platform_20260608
**Type:** Feature
**Created:** 2026-06-08
**Status:** Draft
**GitHub Issue:** #529
**Milestone:** M5.5 — Turn Loop Cleanup

## Summary

Add first-class multi-module support so the app can select, remember, route, load, and edit
published-game/module data instead of assuming South Mountain everywhere. Each LoB/RSS module
has shared map/OOB data and one or more playable scenario start states; client routes and API paths
include an explicit module slug.

## Context

lob-online is built to support the full Line of Battle v2.0 series. Currently the server hardcodes
paths to `data/modules/south-mountain/` and the client has no module selector. All routes
(`/lobby`, `/tools/map-editor`, etc.) are module-agnostic. This track lays the platform
groundwork so that any LOB/RSS module can be selected, navigated to, and edited without changing
code. It does NOT require full data entry for non-SM modules — scaffold folders with placeholder
JSON are sufficient.

## User Story

As a game developer, I want to select a game/module from the main menu so that app navigation,
API calls, and editor saves target the correct module data and default scenario start state.

## Acceptance Criteria

- [ ] Main menu includes a game/module dropdown populated with the supported module list.
- [ ] Module selection is persisted in `localStorage` and survives page reload.
- [ ] A fresh browser / no saved selection defaults to `THG` (This Hallowed Ground).
- [ ] Main menu navigation uses the selected module slug in generated URLs.
- [ ] Client routes include a module slug for shared editor pages and a module + scenario slug for playable starts.
- [ ] API routes include a module slug for map/OOB data and a module + scenario slug for scenario data reads/writes.
- [ ] Map editor loads and saves the selected module's `map.json`.
- [ ] Scenario editor loads and saves the selected module's selected scenario `scenario.json`.
- [ ] OOB editor loads and saves the selected module's `oob.json` / `leaders.json`.
- [ ] Each supported module has its own data folder; non-SM folders contain scaffold JSON.
- [ ] Existing South Mountain behavior still works when `SM` is selected.
- [ ] Tests cover: default module selection, persisted selection, route generation,
      API slug routing, and editor data isolation by module/scenario.

## Module Catalog

| Slug  | Folder | Display Name             | Battle                  |
| ----- | ------ | ------------------------ | ----------------------- |
| `THG` | `thg`  | This Hallowed Ground     | Gettysburg              |
| `TTS` | `tts`  | This Terrible Sound      | Chickamauga             |
| `AFS` | `afs`  | A Fearful Slaughter      | Shiloh                  |
| `SM`  | `sm`   | South Mountain           | South Mountain          |
| `LCV` | `lcv`  | Last Chance for Victory  | Gettysburg              |
| `NBH` | `nbh`  | None But Heroes          | Antietam                |
| `TTW` | `ttw`  | To Take Washington       | Monocacy / Fort Stevens |
| `NTB` | `ntb`  | No Turning Back          | Wilderness              |
| `IB`  | `ib`   | Inferno in the Bluegrass | Perryville              |

Note: `SM` maps to the existing `data/modules/south-mountain/` folder (keep the long name to
avoid breaking any existing file references; the slug just maps to it).

## Route / API Shape

### Client routes (Vue Router)

```
/modules/:moduleSlug/scenarios/:scenarioSlug/lobby
/modules/:moduleSlug/scenarios/:scenarioSlug/games/:id
/modules/:moduleSlug/tools/map-editor
/modules/:moduleSlug/scenarios/:scenarioSlug/tools/scenario-editor
/modules/:moduleSlug/tools/oob-editor
/modules/:moduleSlug/tools/map-test
/modules/:moduleSlug/tools/table-test
```

Legacy routes (`/lobby`, `/tools/map-editor`, etc.) redirect to the
selected/default module slug.

### API routes (Express)

```
GET/PUT  /api/v1/modules/:moduleSlug/map
GET/PUT  /api/v1/modules/:moduleSlug/oob
GET      /api/v1/modules/:moduleSlug/module
GET/PUT  /api/v1/modules/:moduleSlug/scenarios/:scenarioSlug/scenario
GET/PUT  /api/v1/modules/:moduleSlug/leaders
GET/PUT  /api/v1/modules/:moduleSlug/succession
```

Existing route paths can be preserved as deprecated aliases or removed per implementation judgment.

## Data Layout

```
data/modules/
  south-mountain/    ← existing SM data (SM slug maps here)
    module.json
    map.json
    oob.json
    leaders.json
    succession.json
    scenarios/
      full-battle/
        scenario.json
    backups/
  thg/               ← scaffold (placeholder JSON)
  tts/
  afs/
  lcv/
  nbh/
  ttw/
  ntb/
  ib/
```

## Dependencies

- Existing `editorRouteFactory.js`, `mapEditor.js`, `oobEditor.js`, `scenarioEditor.js` routes
- `client/src/router/index.js`
- `client/src/views/HomeView.vue`
- `client/src/stores/` (Pinia)

## Out of Scope

- Full data entry (maps, OOBs, rules) for non-SM scenarios
- Scenario-specific rule overrides or engine changes
- Per-scenario game creation or matchmaking
- Any M6 combat/morale logic

## Technical Notes

- Use a `useModuleStore` Pinia store (or a lightweight composable) to hold the selected slug
  and persist it to `localStorage`.
- The module slug in the URL is the canonical source for API calls; `localStorage` is used
  only on the home page to auto-redirect.
- Server slug → folder mapping lives in a single `MODULE_FOLDERS` map in a shared server
  util (e.g., `server/src/utils/moduleFolders.js`).
- Scaffold JSON for non-SM scenarios: minimal valid files (empty arrays / null fields) that
  pass Zod validation.

---

_Generated by Conductor. Review and edit as needed._
