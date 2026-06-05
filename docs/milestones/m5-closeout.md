# M5 Closeout Note

**Milestone:** M5 — Turn Structure, Orders, and Game Map UI
**Sealed:** 2026-06-05
**PRs:** #472 #473 #474 #493 #507 #516 (feature + debt cleanup)

---

## What M5 Delivered

M5 connected the rules engine to a live, multiplayer-capable game loop:

- **`UnitOrderState` schema** — Zod schema with cross-field refinements; `isDetached` field for
  leader attachment tracking.
- **Turn reducer + phase engine** (`engine/phase.js`) — covers the full
  Command → Activity → Rally cycle. `dispatch()` advances phase/step; `getValidActions()` returns
  the action list for the active player.
- **`POST /api/v1/games/:id/actions`** — authenticated action submission endpoint with
  optimistic-version guard (`expectedVersion`). Emits `game:state-updated` to all room members via
  Socket.io after a successful dispatch.
- **Socket.io plumbing** — `game:join` / `game:leave` / `game:state-updated` events; room-scoped
  broadcast on state change.
- **`GameView`** — main game client view with:
  - `UnitCounterLayer` — SVG counter rendering from game state, click-to-select routing.
  - `UnitStatsPanel` — sidebar stats display for the selected unit.
  - `ActionPanel` — turn/phase/step summary + action buttons with spinner targeting, `aria-disabled`
    pending state, and focus restoration on action completion.
- **`useGameStore`** Pinia store — `loadGame`, `submitAction`, `pendingAction`,
  `refreshGame`, `refreshValidActions` (with `_actionsGeneration` burst guard),
  `serverValidActions`, `selectUnit`, `deselectUnit`.
- **Leader counter images** — assignable via OOB editor (`selectNode` correctly paths synthetic
  nodes; all four counter slots use manifest cycling).

---

## Intentional Stubs (not bugs)

These surfaces are stubbed by design at M5 depth and require M6 data to complete:

| Surface                 | Stub behaviour                                                                                | Unblocked by                                  |
| ----------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `getValidActions`       | Returns a partial action list (END_PHASE always available; unit-level actions not enumerated) | M6 unit/leader position data                  |
| Rally phase handler     | No-op step advance; no per-unit rally rolls                                                   | M6 morale state (DG/Routed tracking)          |
| Fluke Stoppage handler  | No-op step advance                                                                            | M6 accepted attack order data                 |
| Attack Recovery handler | No-op step advance                                                                            | M6 combat result data (stopped attack orders) |
| Combat resolution       | Not implemented                                                                               | M6                                            |

---

## What Moved to M5.5

M5.5 is a short polish pass before M6 planning begins:

- Turn-loop end-to-end smoke test (E2E, not just unit tests)
- Full `getValidActions` action enumeration (unit activation, order submission)
- Minor GameView polish (counter selection highlight, viewport scroll-to-unit)

---

## What Remains for M6 / M7

| Phase | Scope                                                                                                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M6    | Combat resolution (Combat Table, Opening Volley, Closing Roll); morale checks and transitions; orders pipeline (issue order → command roll → delivery delay); leader loss rolls |
| M7    | Special rules (Loose Cannon, Random Events, Fluke Stoppage full implementation); victory conditions; scenario end detection                                                     |

---

## Debt entering M6

Six open debt items remain, all milestone-blocked:

| Issue | Score | Milestone                               |
| ----- | ----- | --------------------------------------- |
| #379  | 2     | M6 — `getValidActions` full enumeration |
| #381  | 2     | M6 — Attack Recovery handler            |
| #382  | 2     | M6 — Fluke Stoppage handler             |
| #383  | 2     | M6 — Rally Phase handler                |
| #403  | 2     | M8 — CSP headers                        |
| #350  | 2     | M8 — rate limiting                      |

Net open debt score entering M6: **12**.

---

_See `docs/testing/m5-closeout-checklist.md` for the manual verification checklist._
