# Implementation Plan: M8 Faction Binding — Derive Player Side from Token, Enforce on Join/Re-Join

**Track ID:** m8-faction-binding_20260624
**Spec:** [spec.md](./spec.md)
**Created:** 2026-06-24
**Status:** [x] Complete

## Overview

Three-phase change: (1) extend `requireSide` to derive and expose `req.side` from the DB
token/faction columns, (2) update all guarded route handlers to use `req.side` instead of
`player.side`, (3) harden the join route — reject duplicate faction on new join, validate
DB-bound faction on re-join. All changes are in `requireSide.js` and `games.js`; no DB
migration required.

## Interaction Mode

**Mode:** Checkpointed
**Human control points:**

- After Phase 1 (requireSide change) before Phase 2 (route handler updates) — confirm `req.side` is correctly derived and the `requireSide` test suite is green
- After Phase 3 (join hardening) before marking complete — confirm join/re-join behavior matches spec

## Risk Classification

**Risk:** High
**Reason:** Touches auth surface — `requireSide` middleware gates every state-modifying route; join/re-join hardening changes how player identity is established.

## Quality Gates

- [x] `npm run validate-data`
- [x] `npm run lint`
- [x] `npm run format:check`
- [x] `npm run test`
- [x] `npm run build`
- [x] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0.

## Completion Contract

- [ ] Closes #562 and #563
- [ ] All acceptance criteria in spec.md met
- [ ] `req.side` populated by `requireSide` on every authorized request
- [ ] Duplicate-faction join rejected with 409
- [ ] Re-join side mismatch rejected with 403 using DB-bound faction
- [ ] `npm run quality:strict` passes
- [ ] Ready for `/team-review`

---

## Phase 1: Extend requireSide to Derive and Expose req.side

### Tasks

- [x] Task 1.1: In `server/src/auth/requireSide.js`, after the token check passes (line 41),
      derive the player's faction from the DB columns:
      `js
const derivedSide =
  player.sideToken === row.side_a_token ? row.side_a_faction : row.side_b_faction;
`
      Set `req.side = derivedSide` before calling `next()`. Update the JSDoc response-code
      matrix to document the `req.side` contract.

- [x] Task 1.2: In `server/src/auth/requireSide.test.js` (or create it if it doesn't exist),
      add test cases: - Token matches `side_a_token` → `req.side === row.side_a_faction` - Token matches `side_b_token` → `req.side === row.side_b_faction` - Verify existing 401/403/404/409 paths are unaffected

### Verification

- **HUMAN CONTROL POINT:** Review the requireSide diff and confirm `req.side` derivation
  is correct before proceeding to Phase 2.
- [ ] `npm run test` — requireSide test suite green, no regressions

---

## Phase 2: Update Route Handlers to Use req.side

### Tasks

- [x] Task 2.1: In `server/src/routes/games.js`, locate all uses of `player.side` inside
      guarded handlers (`GET /:id/actions` line ~215, `POST /:id/actions` line ~236).
      Replace with `req.side`. The comment on line ~236 ("session-sourced; body playerSide
      is intentionally ignored") should be updated to "DB-derived via requireSide".

- [x] Task 2.2: In `server/src/routes/games.test.js`, confirm that the mock setup for
      `getPlayerSession` (returning `{ gameId: TEST_UUID, side: 'union', sideToken: 'tok' }`)
      and `getGame` (returning `{ side_a_token: 'tok', side_a_faction: 'union', ... }`) align
      so that `req.side` resolves to `'union'` in existing tests. Add `side_a_faction: 'union'`
      and `side_b_faction: 'confederate'` to the default `getGame` mock if not already present.

- [x] Task 2.3: Run `npm run test` — all existing action-route tests must pass without
      modification (the mock alignment from 2.2 should cover them).

### Verification

- [ ] `npm run test` — all action route tests pass; `req.side` is the source of truth for
      player authorization in all handlers

---

## Phase 3: Harden Join Route — Duplicate Faction + Re-join Faction Validation

### Tasks

- [x] Task 3.1: In `server/src/routes/games.js`, in the new-join path (after `joinLimiter`,
      before `joinGame`), fetch the game row and reject with 409 if `row.side_a_faction ===
side`:
      `js
const row = getGame(id);
if (!row) return res.status(404).json({ error: 'Game not found' });
if (row.side_a_faction === side) {
  return res.status(409).json({ error: 'Side already taken' });
}
`
      This must only apply to the new-join path (no existing session for this game), not the
      re-join path.

- [x] Task 3.2: In the re-join path (lines 129–135), replace the session-side check with a
      DB-derived faction check:
      `js
const row = getGame(id);
if (!row) return res.status(404).json({ error: 'Game not found' });
const boundFaction =
  existingSession.sideToken === row.side_a_token
    ? row.side_a_faction
    : row.side_b_faction;
if (boundFaction !== side) {
  return res.status(403).json({ error: 'Side already bound — cannot switch factions' });
}
`

- [x] Task 3.3: Add test cases in `games.test.js` for: - New join: `side_a_faction` already equals requested side → 409 `'Side already taken'` - Re-join: requested side doesn't match DB-bound faction → 403 - Re-join: requested side matches DB-bound faction → 200 (happy path)

- [x] Task 3.4: Run `npm run test` — all join tests pass including new cases.

### Verification

- **HUMAN CONTROL POINT:** Review the join-path diff and confirm faction enforcement is
  correct for both new-join and re-join paths.
- [ ] `npm run test` passes with new join auth assertions
- [ ] No existing join tests broken

---

## Final Verification

- [x] `npm run quality:strict` passes
- [x] `req.side` set by `requireSide` on all authorized requests
- [x] Duplicate-faction new-join returns 409
- [x] Re-join with wrong faction returns 403 (DB-bound, not session-bound)
- [x] `player.side` no longer used for authorization in any guarded handler
- [x] No unexpected warnings in test output
- [x] Ready for `/team-review`

---

_Generated by Conductor on 2026-06-24._
