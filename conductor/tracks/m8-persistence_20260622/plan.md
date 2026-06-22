# Implementation Plan: M8 Persistence + Auth Hardening

**Track ID:** m8-persistence_20260622
**Spec:** [spec.md](./spec.md)
**Created:** 2026-06-22
**Status:** [x] Complete

## Overview

Three phases: install the S3 client and implement `spaces.js`, swap `store/index.js` to use
it, then harden the SQLite schema and faction-binding auth. Checkpointed after Phase 2
(store live) and after Phase 3 (auth hardened).

## Interaction Mode

**Mode:** Checkpointed
**Human control points:** After Phase 2 (store swap live), after Phase 3 (auth hardening live)

## Risk Classification

**Risk:** High
**Reason:** Replaces the persistence layer (game state survival), migrates the SQLite schema,
and enforces auth binding — all paths that can break running games.

## Quality Gates

- [x] `npm run validate-data`
- [x] `npm run lint`
- [x] `npm run format:check`
- [x] `npm run test`
- [x] `npm run build`
- [x] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0 unless explicitly approved.

## Completion Contract

- [x] All plan tasks complete
- [x] All acceptance criteria in spec.md met
- [x] Warnings fixed or explicitly classified as accepted prototype noise
- [x] Debt register updated if any debt was accepted
- [x] Ready for `/team-review`

---

## Phase 1: S3 Client + spaces.js

Install the AWS SDK v3 S3 client and implement the Spaces store module with full test coverage
against MinIO.

### Tasks

- [x] Task 1.1: Install `@aws-sdk/client-s3` in `server/` workspace (`npm install --workspace=server @aws-sdk/client-s3`)
- [x] Task 1.2: Write `server/src/store/spaces.js`:
  - `createSpacesClient()` — builds `S3Client` from env vars (`SPACES_KEY`, `SPACES_SECRET`,
    `SPACES_ENDPOINT`, `SPACES_BUCKET`, `SPACES_FORCE_PATH_STYLE`)
  - `saveGameState(id, state)` — PutObject to `games/<id>/state.json`; read ETag first for
    optimistic version check; increment `state.version`; return updated state
  - `loadGameState(id)` — GetObject, parse JSON, validate with `GameStateSchema`; throw
    `GameNotFoundError` on 404
  - `deleteGameState(id)` — DeleteObject on `games/<id>/state.json`
  - `appendHistory(id, seq, payload)` — PutObject to `games/<id>/history/<seq>.json`
    (zero-padded 6 digits)
  - Module-level client singleton; `initSpaces()` factory for test injection
- [x] Task 1.3: Write `server/src/store/spaces.test.js` — integration tests against MinIO:
  - Save/load round-trip
  - Version conflict rejection
  - History append produces correctly named objects
  - Load missing game throws `GameNotFoundError`
  - Schema version mismatch throws with clear message

### Verification

- [x] All `spaces.test.js` tests pass with MinIO running
- [x] `npm run lint` clean

---

## Phase 2: Store Index Swap

Replace `store/index.js` exports so the rest of the server uses `spaces.js` transparently.
Wire `appendHistory` into the actions route.

### Tasks

- [x] Task 2.1: Update `server/src/store/index.js` — export `saveGame`, `loadGame`,
      `deleteGameFile`, `appendHistory` from `spaces.js`; remove `gameFile.js` exports
- [x] Task 2.2: Update `server/src/routes/games.js` actions route — call `appendHistory`
      after each successful `saveGame`; pass `updatedState.version` as sequence number
- [x] Task 2.3: Update any test files that stub or import `gameFile` to stub `spaces` instead
- [x] Task 2.4: Verify `gameFile.js` is no longer imported anywhere (grep check)

### Verification

- [x] `npm run test` fully green with MinIO running
- [x] Manual smoke: create game → `node -e "process.kill(process.pid)"` → restart server →
      `GET /api/v1/games/:id` returns the same state
- [x] History bucket shows `000001.json`, `000002.json` after two actions

**→ CHECKPOINT: human review of store swap before proceeding**

---

## Phase 3: SQLite Schema Migration + Faction Binding

Add three new columns to the `games` table and enforce side-token faction binding at join/re-join.

### Tasks

- [x] Task 3.1: Update `gameSqlite.js` schema migration — use `PRAGMA user_version` to detect
      uninitialized vs v1 schema; run `ALTER TABLE games ADD COLUMN side_a_faction TEXT`,
      `ALTER TABLE games ADD COLUMN side_b_faction TEXT`,
      `ALTER TABLE games ADD COLUMN discord_webhook TEXT` if upgrading; bump `user_version` to 1
- [x] Task 3.2: Update `createGame(id, sideAToken, faction, discordWebhook)` — write
      `side_a_faction` and `discord_webhook` at insert time
- [x] Task 3.3: Update `joinGame(id, sideBToken, faction)` — write `side_b_faction` at
      update time
- [x] Task 3.4: Update `getGame(id)` — return `side_a_faction`, `side_b_faction`,
      `discord_webhook` in the row object
- [x] Task 3.5: Update `games.js` POST `/` — pass `SIDES.UNION` as faction; accept optional
      `discordWebhook` in request body (validate URL format if present); pass to `createGame`
- [x] Task 3.6: Update `games.js` POST `/:id/join` — enforce faction binding on re-join:
      if `existingSession.gameId === id` AND `existingSession.side !== side`, return 403
      `{ error: 'Side already bound — cannot switch factions' }`; pass chosen `side` as faction
      to `joinGame`
- [x] Task 3.7: Update `gameSqlite.test.js` — cover faction columns, migration idempotency
      (run twice → no error), re-join side-switch returns 403, `discord_webhook` stored and
      retrieved correctly

### Verification

- [x] `npm run test` fully green
- [x] Manual: create game as union → join same game as confederate → succeeds; re-join as
      union → 403
- [x] Migration idempotency: delete `data/games.db`, restart server, run tests — schema
      created fresh; restart again — migration skipped cleanly

**→ CHECKPOINT: human review of auth hardening before proceeding to Track 3**

---

## Final Verification

- [x] All acceptance criteria in spec.md met
- [x] `npm run quality:strict` passes
- [x] No unexpected warnings in test output
- [x] Debt register updated if any debt was accepted
- [x] Ready for `/team-review`

---

_Generated by Conductor on 2026-06-22._
