---
issue: 27
title: Add scenario editor E2E tests and Cypress code coverage
date: 2026-03-16
milestone: v1.0 — MVP
---

## Description

The Cypress E2E suite currently covers only the map editor tool (push/pull sync, offline fallback, and server backup creation). The scenario editor tool has no E2E tests despite having the same push/pull sync pattern and its own server route pair (`GET/PUT /api/tools/scenario-editor/data`). This issue adds a scenario editor E2E suite at parity with the map editor suite, and instruments both client and server code with `@cypress/code-coverage` so that E2E runs enforce a minimum 50% line coverage threshold — scoped on the server side to the two dev-tool route files that have client-implemented endpoints.

## Acceptance Criteria

- [ ] `cypress/e2e/scenario-editor/sync.cy.js` — push happy path, push overwrite confirm, pull happy path, pull no-op (local newer), network error handling
- [ ] `cypress/e2e/scenario-editor/offline.cy.js` — server unavailable on load falls back to localStorage; reconnect restores sync controls
- [ ] `cypress/e2e/scenario-editor/backups.cy.js` — at least one backup file is created after a successful push; `cy.task('listBackups')` returns a non-empty array scoped to `scenario-` prefix
- [ ] `@cypress/code-coverage`, `babel-plugin-istanbul` (client) and `istanbul-lib-instrument` (server) installed and configured
- [ ] Vite dev-server configured to instrument `client/src/` via `vite-plugin-istanbul` (dev/test only, not production build)
- [ ] Express server configured to instrument `server/src/routes/mapEditor.js` and `server/src/routes/scenarioEditor.js` when `CYPRESS_COVERAGE=true`
- [ ] `cypress/support/e2e.js` imports `@cypress/code-coverage/support`
- [ ] `cypress.config.js` registers `@cypress/code-coverage/task`
- [ ] `npm run test:e2e:coverage` script added — runs `cypress run` with coverage collection and prints a summary
- [ ] Coverage check task verifies ≥ 50% line coverage for `client/src/views/tools/MapEditorView.vue`, `client/src/views/tools/ScenarioEditorView.vue`, `server/src/routes/mapEditor.js`, and `server/src/routes/scenarioEditor.js`; exits non-zero if threshold is not met
- [ ] CI workflow (`.github/workflows/e2e.yml`) updated to run `test:e2e:coverage` and upload the coverage report as an artifact
- [ ] `npm run test:e2e` (non-coverage run) still works unchanged for local quick runs

## Files to Create / Modify

| File | Action |
| ---- | ------ |
| `cypress/e2e/scenario-editor/sync.cy.js` | CREATE |
| `cypress/e2e/scenario-editor/offline.cy.js` | CREATE |
| `cypress/e2e/scenario-editor/backups.cy.js` | CREATE |
| `cypress/fixtures/scenario-editor.js` | CREATE |
| `cypress/support/e2e.js` | MODIFY — add coverage import |
| `cypress.config.js` | MODIFY — add coverage task, vite-plugin-istanbul |
| `client/vite.config.js` | MODIFY — add vite-plugin-istanbul (dev only) |
| `server/src/server.js` | MODIFY — instrument routes when `CYPRESS_COVERAGE=true` |
| `package.json` | MODIFY — add `test:e2e:coverage` script and new dev dependencies |
| `.github/workflows/e2e.yml` | MODIFY — use `test:e2e:coverage`, upload artifact |

## Tests Required

- All new `.cy.js` files are themselves the tests; no Vitest tests required for E2E infrastructure
- `npm run test:e2e:coverage` must exit 0 with ≥ 50% line coverage on all four scoped files
- `npm run test:e2e` must still exit 0

## Rules / Data Dependencies

None — no game mechanics involved.

## Depends On

None.

## Milestone

v1.0 — MVP
