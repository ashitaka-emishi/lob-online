# Specification: Multi-Scenario Platform — Scenario-Scoped Routes and Data Folders

**Track ID:** multi-scenario-platform_20260608
**Type:** Feature
**Created:** 2026-06-08
**Status:** Draft
**GitHub Issue:** #529
**Milestone:** M5.5 — Turn Loop Cleanup

## Summary

Add first-class multi-scenario support so the app can select, remember, route, load, and edit
scenario-specific data instead of assuming South Mountain everywhere. Each scenario lives in its
own data folder; client routes and API paths include an explicit scenario slug.

## Context

lob-online is built to support the full Line of Battle v2.0 series. Currently the server hardcodes
paths to `data/scenarios/south-mountain/` and the client has no scenario selector. All routes
(`/lobby`, `/tools/map-editor`, etc.) are scenario-agnostic. This track lays the platform
groundwork so that any LOB/RSS scenario can be selected, navigated to, and edited without
changing code. It does NOT require full data entry for non-SM scenarios — scaffold folders with
placeholder JSON are sufficient.

## User Story

As a game developer, I want to select a scenario from the main menu so that all app navigation,
API calls, and editor saves target the correct scenario's data files.

## Acceptance Criteria

- [ ] Main menu includes a scenario dropdown populated with the supported scenario list.
- [ ] Scenario selection is persisted in `localStorage` and survives page reload.
- [ ] A fresh browser / no saved selection defaults to `THG` (This Hallowed Ground).
- [ ] Main menu navigation uses the selected scenario slug in generated URLs.
- [ ] Client routes include a scenario slug for lobby, gameplay, and all editor pages.
- [ ] API routes include a scenario slug for map, OOB, and scenario data reads/writes.
- [ ] Map editor loads and saves the selected scenario's `map.json`.
- [ ] Scenario editor loads and saves the selected scenario's `scenario.json`.
- [ ] OOB editor loads and saves the selected scenario's `oob.json` / `leaders.json`.
- [ ] Each supported scenario has its own data folder; non-SM folders contain scaffold JSON.
- [ ] Existing South Mountain behavior still works when `SM` is selected.
- [ ] Tests cover: default scenario selection, persisted selection, route generation,
      API slug routing, and editor data isolation by scenario.

## Scenario Catalog

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

Note: `SM` maps to the existing `data/scenarios/south-mountain/` folder (keep the long name to
avoid breaking any existing file references; the slug just maps to it).

## Route / API Shape

### Client routes (Vue Router)

```
/scenarios/:scenarioSlug/lobby
/scenarios/:scenarioSlug/games/:id
/scenarios/:scenarioSlug/tools/map-editor
/scenarios/:scenarioSlug/tools/scenario-editor
/scenarios/:scenarioSlug/tools/oob-editor
/scenarios/:scenarioSlug/tools/map-test
/scenarios/:scenarioSlug/tools/table-test
```

Legacy routes (`/lobby`, `/tools/map-editor`, etc.) redirect to the
selected/default scenario slug.

### API routes (Express)

```
GET/PUT  /api/v1/scenarios/:scenarioSlug/map
GET/PUT  /api/v1/scenarios/:scenarioSlug/oob
GET/PUT  /api/v1/scenarios/:scenarioSlug/scenario
GET/PUT  /api/v1/scenarios/:scenarioSlug/leaders
```

Existing route paths can be preserved as deprecated aliases or removed per implementation judgment.

## Data Layout

```
data/scenarios/
  south-mountain/    ← existing SM data (SM slug maps here)
    map.json
    oob.json
    scenario.json
    leaders.json
    succession.json
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

- Use a `useScenarioStore` Pinia store (or a lightweight composable) to hold the selected slug
  and persist it to `localStorage`.
- The scenario slug in the URL is the canonical source for API calls; `localStorage` is used
  only on the home page to auto-redirect.
- Server slug → folder mapping lives in a single `SCENARIO_FOLDERS` map in a shared server
  util (e.g., `server/src/utils/scenarioFolders.js`).
- Scaffold JSON for non-SM scenarios: minimal valid files (empty arrays / null fields) that
  pass Zod validation.

---

_Generated by Conductor. Review and edit as needed._
