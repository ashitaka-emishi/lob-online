# Implementation Plan: Pre-M6 Debt Sprint #2 — Debt, Doc Sync, Stubs

**Track ID:** debt-sprint-2_20260613
**Spec:** [spec.md](./spec.md)
**Created:** 2026-06-13
**Status:** [ ] Not Started

## Overview

Four phases: (1) close the four actionable score-2 debt items, (2) update stub scenario.json
files for 8 non-SM modules, (3) sync project documentation, (4) update the domain-expert
agent design doc. All work on a feature branch; quality:strict gates at end of each phase.

## Interaction Mode

**Mode:** Checkpointed
**Human control points:** Approval between each phase (schema change in Phase 1 and data
file changes in Phase 2 require explicit review before proceeding).

## Risk Classification

**Risk:** Medium
**Reason:** Phase 1 touches schema validation and Express middleware; Phase 2 edits data
files validated at server startup; Phases 3–4 are docs-only.

## Quality Gates

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0 unless explicitly approved.

## Completion Contract

- [ ] All plan tasks complete
- [ ] All acceptance criteria in spec.md met
- [ ] Warnings fixed or explicitly classified as accepted prototype noise
- [ ] Debt register updated if any debt was accepted
- [ ] Ready for `/team-review`

---

## Phase 1: Close Score-2 Debt Items

Close #542, #545, #546, and #533. Schema change (#533) requires validate-data to pass.

### Tasks

- [x] Task 1.1 (#542): Audit all editor views (`ScenarioEditorView`, `MapEditorView`,
      `OobEditorView`) for non-reactive moduleSlug capture at setup time; replace with
      `computed(() => route.params.moduleSlug)` and add `onBeforeRouteUpdate` guard if needed.
- [x] Task 1.2 (#545): Create or extend `ModuleNotFoundError` class with an identifiable
      property; register it in the central Express error-handler middleware (`server/src/app.js`
      or equivalent) to return `404 { error: 'Not found' }` without needing inline catches;
      update existing inline catches to re-throw or remove them.
- [x] Task 1.3 (#545): Add a unit test for the error-handler middleware confirming
      `ModuleNotFoundError` → 404 JSON response; non-matching errors → 500.
- [x] Task 1.4 (#546): Add `moduleData` route tests: unknown slug → 404, valid slug + nested
      scenario sub-route → 200, invalid scenarioSlug → 400/404.
- [x] Task 1.5 (#533): Remove `totalTurns` from `ScenarioSchema` (or make it `.strip()`-ignored
      optional with a deprecation note); update `server/src/engine/init.js` to derive total
      turns from `firstTurn`/`lastTurn`/turn duration using `MINUTES_PER_CONDITION`.
- [x] Task 1.6 (#533): Remove `totalTurns` field from
      `data/modules/south-mountain/scenarios/full-battle/scenario.json`; verify all 8 scaffold
      `scenario.json` files still pass `npm run validate-data` after schema change.

### Verification

- [x] `npm run validate-data` passes for all 9 modules
- [x] `npm run test` passes with no unexpected warnings
- [x] New tests for #545 and #546 are green

---

## Phase 2: Update Non-SM Module Stubs

Update the 8 scaffold scenario.json files with real game names and known battle metadata.
`_status` stays `"scaffold"`; no OOB, map, or game data is added.

### Tasks

- [x] Task 2.1: For each of afs, ib, lcv, nbh, ntb, thg, tts, ttw — update `scenario.json`: - `name` → real game name from `module.json` (e.g. `"A Fearful Slaughter"`) - `id` → lowercase slug (e.g. `"afs"`) - Add `_battle` field with battle name from `module.json` - Add `_publication` field from `module.json` - Keep `_status: "scaffold"` and all existing structure intact
- [x] Task 2.2: Run `npm run validate-data` and fix any schema rejections from the stub
      updates.

### Verification

- [x] `npm run validate-data` passes for all 9 modules
- [x] All 8 updated scenario.json files have real names; `_status` remains `"scaffold"`

---

## Phase 3: Documentation Sync

Update CLAUDE.md and high-level-design.md to reflect M5.5-complete state.

### Tasks

- [x] Task 3.1: Update CLAUDE.md "Current state" paragraph: M5.5 ✅ complete, starting M6
      (combat, morale, orders resolution); remove any "Starting M5.5" language.
- [x] Task 3.2: Update `docs/designs/high-level-design.md` milestone table: M5.5 → ✅ Done,
      M6 → 🔜 Next; update Rule Section Coverage table if any sections were covered in M5.5.
- [x] Task 3.3: Run Prettier on both files: `npx prettier --write CLAUDE.md
docs/designs/high-level-design.md`.

### Verification

- [ ] `npm run format:check` passes
- [ ] No stale milestone references remain in CLAUDE.md or HLD

---

## Phase 4: Domain-Expert Agent Update

Update `docs/agents/domain-expert/design.md` with rule references and implementation
patterns added in M5–M5.5 that the agent should be aware of when advising on future work.

### Tasks

- [x] Task 4.1: Add to the Known South Mountain Rule Overrides table (or a new "Implemented
      Rule References" section): fog/rain condition turn durations (LOB §1.1 — inherits base
      15-min duration, no separate clause), VISIBILITY_UNLIMITED sentinel 999 (LOB §6.1),
      lightingSchedule schema with startTurn uniqueness enforcement.
- [x] Task 4.2: Add a note on the sister-module pattern (server `engine/turnTime.js` +
      client `config/turnTime.js`, `config/visibility.js`) so future agents know where to
      look when advising on turn-time or visibility constant changes.
- [x] Task 4.3: Review the Data Files table — update paths if any moved to `data/modules/`
      structure (previously pointed at `data/scenarios/south-mountain/`).
- [x] Task 4.4: Run Prettier: `npx prettier --write docs/agents/domain-expert/design.md`.

### Verification

- [x] `npm run format:check` passes
- [x] Domain-expert design doc accurately reflects current data file paths and rule additions

---

## Final Verification

- [ ] All acceptance criteria in spec.md met
- [ ] `npm run quality:strict` passes
- [ ] No unexpected warnings in test output
- [ ] Closed issues: #542, #545, #546, #533 (close via commit messages)
- [ ] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
