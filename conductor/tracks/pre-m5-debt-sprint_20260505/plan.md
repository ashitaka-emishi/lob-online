# Implementation Plan: Pre-M5 Debt Sprint

**Track ID:** pre-m5-debt-sprint_20260505
**Spec:** [spec.md](./spec.md)
**Created:** 2026-05-05
**Status:** [ ] Not Started

## Overview

Close all nine score ≥ 3 deferred findings from PR #328 before M5 begins. Work proceeds in five
phases ordered by dependency: data-model fixes first (other phases reference the corrected schema),
then session infrastructure, then authorization, then database-layer cleanup, and finally the
storage abstraction shim. Each task follows the TDD workflow: write the failing test, implement,
refactor.

---

## Phase 1: Data Model Hardening (#333, #332)

Fix the `GameStateSchema` before any other code builds on it. Removing `'setup'` from the phase
enum and adding the version field are both schema-only changes that downstream phases depend on.

### Tasks

- [x] Task 1.1: Remove `'setup'` from the `phase` enum in `GameStateSchema`; change phase initial
      value to `null` in `initGameState`; update all tests that set `phase: 'setup'` — closes #333
- [ ] Task 1.2: Add `version: z.number().int().nonnegative()` to `GameStateSchema`; set `version: 0`
      in `initGameState` — closes #332 (schema half)
- [ ] Task 1.3: Update `saveGame` to accept an expected version, check it matches the stored value,
      increment before writing; update `loadGame` round-trip test to include version field — closes
      #332 (persistence half)

### Verification

- [ ] `npm run test` — schema tests and gameFile tests all green
- [ ] No test uses `phase: 'setup'` any longer

---

## Phase 2: Session Infrastructure (#335, #329)

Introduce the session abstraction helpers before the authorization middleware uses them, and swap
MemoryStore for a persistent SQLite-backed store in the same phase.

### Tasks

- [ ] Task 2.1: Create `server/src/auth/session.js` exporting `setPlayerSession(req, gameId, side,
token)` and `getPlayerSession(req)` (returns `{ gameId, side, token }` or `null`); write unit
      tests with a mock `req.session` — closes #335
- [ ] Task 2.2: Refactor `routes/games.js` to use `setPlayerSession` / `getPlayerSession` instead of
      direct `req.session` assignments; update route tests — closes #335 (route wiring)
- [ ] Task 2.3: Install `better-sqlite3-session-store`; configure in `server.js` with `cookie.maxAge`
      (14 days); write smoke test asserting the store constructor is called — closes #329

### Verification

- [ ] `npm run test` — all session and route tests green
- [ ] `server.js` no longer uses the default MemoryStore

---

## Phase 3: Authorization Gate (#330)

Add a `requireSide` middleware that reads the session and returns 401 for unauthenticated callers
on `GET /api/v1/games/:id`.

### Tasks

- [ ] Task 3.1: Create `server/src/auth/requireSide.js` middleware: reads `getPlayerSession(req)`;
      returns 401 if null or if `gameId` does not match the requested `:id`; write unit tests — closes
      #330 (middleware)
- [ ] Task 3.2: Mount `requireSide` on `router.get('/:id', requireSide, ...)` in `routes/games.js`;
      add route tests: 401 with no session, 401 with mismatched gameId, 200 with valid session —
      closes #330 (route wiring)

### Verification

- [ ] `npm run test` — auth and route tests green
- [ ] `GET /api/v1/games/:id` without a session returns 401

---

## Phase 4: Database Layer Cleanup (#331, #336, #338)

Refactor `gameSqlite.js` to a factory + DI pattern, fix the TOCTOU race in `joinGame`, and move
`initDb()` out of module-load scope.

### Tasks

- [ ] Task 4.1: Refactor `gameSqlite.js` to export a `createStore(db)` factory; hoist all prepared
      statement creation into the factory; update `server.js` and route tests to inject the db
      instance — closes #331
- [ ] Task 4.2: Rewrite `joinGame` as a single conditional `UPDATE games SET status = 'active',
side_b_token = ? WHERE id = ? AND status = 'open'`; check `changes === 1` for success; remove
      the SELECT + UPDATE pair; update tests — closes #336
- [ ] Task 4.3: Move `initDb()` call into the `startServer()` startup function (wrap `server.js`
      top-level code); register `process.on('SIGTERM', () => db.close())` handler; make DB path
      configurable via `DB_PATH` env var — closes #338

### Verification

- [ ] `npm run test` — gameSqlite and route tests green (no `vi.resetModules()` hacks needed)
- [ ] `joinGame` test: two concurrent joins — only one succeeds

---

## Phase 5: Storage Abstraction (#334)

Create the thin `store/index.js` re-export shim so routes import a stable interface rather than
implementation-specific files.

### Tasks

- [ ] Task 5.1: Create `server/src/store/index.js` that re-exports all public functions from
      `gameFile.js` and `gameSqlite.js` (via factory); update every `routes/*.js` file to import
      from `../store/index.js`; verify no route directly imports `gameFile.js` or `gameSqlite.js` —
      closes #334

### Verification

- [ ] `npm run test` — all route tests green
- [ ] `grep -r "from '../store/gameFile'" server/src/routes/` returns no matches
- [ ] `grep -r "from '../store/gameSqlite'" server/src/routes/` returns no matches

---

## Final Verification

- [ ] All 9 target GitHub issues closed: #329 #330 #331 #332 #333 #334 #335 #336 #338
- [ ] `npm run lint` passes
- [ ] `npm run format:check` passes
- [ ] `npm run test` passes with ≥ 70% coverage
- [ ] No new deferred findings (per coding-standards no-new-debt rule)
- [ ] Ready for `/pr-create`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
