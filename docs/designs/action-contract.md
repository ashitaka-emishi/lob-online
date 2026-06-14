# Action Contract — Engine ↔ API ↔ Store ↔ UI

**Status:** M5.5 (current implementation)
**Track:** turn-loop-polish_20260613 (#556)

## Overview

This document specifies the full contract between the pure engine action layer, the Express
API, the Pinia game store, and the ActionPanel UI component. It is the M6 handoff reference:
combat authors should read this before touching any action type or adding a new handler.

---

## 1. Action Shape

Every action submitted to the server has this shape:

```json
{
  "type": "END_PHASE",
  "payload": null,
  "expectedVersion": 7
}
```

| Field             | Type             | Required | Description                                                                       |
| ----------------- | ---------------- | -------- | --------------------------------------------------------------------------------- |
| `type`            | `string`         | yes      | Action type identifier (see §4 for valid values)                                  |
| `payload`         | `object \| null` | yes      | Action-specific parameters; `null` for zero-arity actions (see §4 per-type)       |
| `expectedVersion` | `number \| omit` | no       | If present and numeric, server rejects with 409 if current `state.version` ≠ this |

`playerSide` must **not** be included in the body — the server sources it exclusively from
the authenticated session. Any `playerSide` field in the request body is silently ignored.

---

## 2. Server-Authoritative Boundary

```
Client                      Server
──────────────────────────────────────────────────────────
ActionPanel.vue             POST /api/v1/games/:id/actions
 │  emits submit-action      │
 │                           │  requireSide middleware
 │                           │   ├─ 401 no session
 │                           │   ├─ 403 session is for a different game
 │                           │   ├─ 404 game deleted
 │                           │   ├─ 409 game not active
 │                           │   └─ 403 bad sideToken
 │                           │
 │                           │  version guard (optional, §2.1)
 │                           │
 │                           │  dispatch(state, { type, payload, playerSide })
 │                           │   ├─ side check (whose turn?)
 │                           │   ├─ getValidActions() type gate
 │                           │   ├─ handler (per-type payload validation)
 │                           │   ├─ drainAutoSteps()
 │                           │   └─ GameStateSchema.safeParse()  ← terminal guard
 │                           │
 │                           │  saveGame() → increments state.version
 │                           │  io.emit('game:state-updated', { version })
 │                           └─ JSON response: full saved game state
```

The server is the sole arbiter of game state. The client never writes state locally —
`submitAction` in `useGameStore` replaces `gameState` with the server response.

### 2.1 Optimistic Concurrency / Version Guard

`saveGame` atomically increments `state.version` on every write. If the client submits
`expectedVersion` and it does not match the current stored version, the server returns:

```
409 Conflict
{ "error": "Version conflict: expected 7, current 8" }
```

The client can omit `expectedVersion` (or pass a non-numeric value) to skip the guard.
`useGameStore.submitAction` always sends `expectedVersion: gameState.value.version`.

---

## 3. Client vs. Engine Responsibility

| Concern                                | Owner                           |
| -------------------------------------- | ------------------------------- |
| Which action types are valid right now | Engine (`getValidActions`)      |
| What concrete payloads are available   | Engine (`getValidActions`)      |
| Payload validation                     | Each handler (server-side)      |
| Turn ownership / whose turn it is      | Engine (`dispatch` side check)  |
| Pending state (spinner, aria-disabled) | `useGameStore.pendingAction`    |
| Focus restoration after submission     | `ActionPanel.vue`               |
| Socket-triggered state refresh         | `GameView.vue` + `useGameStore` |
| Version incrementing                   | `saveGame` (server)             |

The client **does not** compute valid actions locally. `serverValidActions` in
`useGameStore` is populated exclusively from `GET /api/v1/games/:id/actions`.

---

## 4. Valid Action Types and Payload Expectations

All types are strings. Unregistered types return 422.

### `END_PHASE`

Ends the current interactive step and advances the turn sequence.

```json
{ "type": "END_PHASE", "payload": null }
```

Valid in:

- `COMMAND / orders` — transitions to ATTACK_RECOVERY (then auto-drains to ACTIVITY/activation)
- `ACTIVITY / activation` — ends current player's activation; if both sides done, drains through RALLY to next turn

Cannot be submitted while `activityPhase.currentActivation !== null` (mid-stack guard).

### `ROLL_INITIATIVE`

Rolls Command for a leader against a target unit. M5 always succeeds.

```json
{ "type": "ROLL_INITIATIVE", "payload": { "leaderId": "hill", "unitId": "13GA" } }
```

Valid in: `COMMAND / orders` when `pendingOrderIssuance === null`.

`getValidActions` returns one candidate per eligible (not-yet-rolled, on-board) leader ×
on-board unit combination. Falls back to `{ type: 'ROLL_INITIATIVE', payload: null }` when
`leaderState` is empty (M5 steel-thread only — to be removed in M6).

Handler validates: `leaderId` and `unitId` are both present; leader has not already rolled
this turn.

### `ISSUE_ORDER`

Issues an attack or move order to the unit named in the pending initiative result.

```json
{ "type": "ISSUE_ORDER", "payload": { "unitId": "13GA", "orderType": "attack" } }
```

Valid in: `COMMAND / orders` when `ordersPhase.pendingOrderIssuance !== null`.

`getValidActions` returns exactly two candidates: one for `orderType: "attack"` and one for
`orderType: "move"`, both targeting `pendingOrderIssuance.unitId`.

Handler validates: `unitId` matches `pendingOrderIssuance.unitId`; `orderType` is present;
unit exists in state.

### `ACTIVATE_STACK`

Marks a hex's stack as mid-activation.

```json
{ "type": "ACTIVATE_STACK", "payload": { "hex": "0304" } }
```

Valid in: `ACTIVITY / activation` when `currentActivation === null`.

`getValidActions` returns one candidate per occupied, not-yet-activated hex. Also includes
`END_PHASE` in the same candidate list.

Handler validates: `hex` is present; no stack already mid-activation; hex not already
activated this phase.

### `END_ACTIVATION`

Completes the current stack's activation.

```json
{ "type": "END_ACTIVATION", "payload": null }
```

Valid in: `ACTIVITY / activation` when `currentActivation !== null`. Replaces `END_PHASE`
in the valid-actions list while a stack is mid-activation.

Handler validates: `activityPhase` is present; `currentActivation !== null`.

---

## 5. Valid-Actions Candidate Shape

`GET /api/v1/games/:id/actions` returns:

```json
{
  "validActions": [
    { "type": "ROLL_INITIATIVE", "payload": { "leaderId": "hill", "unitId": "13GA" } },
    { "type": "END_PHASE", "payload": null }
  ]
}
```

Each candidate has `{ type: string, payload: object | null }`.

The candidate list is **informational for the UI** — it shows which concrete moves are
available. The server does not enforce payload exactly from this list. Each handler
re-validates its own payload independently against state. Submitting a payload not in
the candidate list but otherwise valid will succeed.

The type-only gate in `dispatch` checks `validActions.some(a => a.type === type)` — so
the type must match a candidate, but the payload can differ from the suggestion.

---

## 6. Socket Refresh Behavior

After every successful `POST /api/v1/games/:id/actions`, the server emits:

```js
io.to(gameId).emit('game:state-updated', { version: saved.version });
```

`GameView.vue` listens:

```js
socket.on('game:state-updated', async () => {
  await gameStore.loadGame(gameId);
  await gameStore.refreshValidActions(gameId);
});
```

Both fetches use generation counters (`_loadGeneration`, `_actionsGeneration`) to discard
stale responses from burst events. The submitting client also reads the full game state
from the POST response body — it does not wait for the socket event to update its own
`gameState`. The socket event primarily refreshes the **opposing player's** view.

If `io` is unavailable (e.g., during server-side integration tests), the route logs a
warning and skips the emit — no error is returned.

---

## 7. Error Response Codes

| Code | Meaning                                                                                                |
| ---- | ------------------------------------------------------------------------------------------------------ |
| 400  | `type` is missing or not a string; `INVALID_PAYLOAD` from a handler                                    |
| 401  | No player session                                                                                      |
| 403  | Session is for a different game, or sideToken invalid                                                  |
| 404  | Game not found                                                                                         |
| 409  | Game not active, or version conflict                                                                   |
| 422  | `INVALID_ACTION` or `UNKNOWN_ACTION` — wrong turn, not in valid-actions list, or no handler registered |
| 500  | `INVALID_STATE` or `DRAIN_LOOP` — server fault; message is sanitized before reaching client            |

---

## 8. M5.5 Limitations

- **ROLL_INITIATIVE always succeeds.** No dice resolution or Command Rating modifiers yet.
  The `diceResult` field in the payload is accepted but ignored. M6 will consult the
  Command Roll table (LOB §10.3) and may fail the roll.
- **No side-filtering on ROLL_INITIATIVE targets.** Unit affiliation is OOB data not yet
  co-located with the engine; all on-board units are eligible targets. See #560.
- **ACTIVATE_STACK / END_ACTIVATION are movement stubs.** No movement points or hex
  transitions are resolved. M6 will add movement resolution before `END_ACTIVATION` can
  advance.
- **Attack Recovery and Fluke Stoppage auto-advance.** No orders to roll against yet; both
  steps drain instantly. M6 will insert real dice rolls.
- **Rally Phase auto-advances.** No DG/Routed units exist in M5 state. M6 morale work will
  add real rally resolution.
- **`ROLL_INITIATIVE` null-payload fallback.** When `leaderState` is empty, the engine
  returns a single `{ payload: null }` candidate. Clients should treat this as a
  "no-leader" steel-thread escape hatch, not a real game state. Will be removed in M6 when
  leader data is seeded from OOB.

---

## 9. M6 Handoff

The following surfaces must be extended or replaced in M6:

1. **`handleRollInitiative`** — add Command Rating lookup (OOB data) and dice resolution
   against LOB §10.3 Command Roll table. A failed roll must not set `pendingOrderIssuance`.
2. **`handleActivateStack` / `handleEndActivation`** — add movement resolution: MP budget
   from OOB, terrain costs from `map.json`, and hex transition writes to `unit.hex`.
3. **`getValidActions` (COMMAND / orders)** — filter ROLL_INITIATIVE candidates to friendly
   units only once OOB side data is co-located with the engine (#560).
4. **drainAutoSteps (Attack Recovery)** — roll per stopped attack order (LOB §10.6b).
5. **drainAutoSteps (Fluke Stoppage)** — roll per accepted attack order (LOB §10.7).
6. **drainAutoSteps (Rally)** — roll Rally for each DG/Routed unit (LOB §6.3).
7. **New action types** — `FIRE` (ranged combat), `MELEE` (close combat), `ROUT_CHECK`,
   `LEADER_LOSS` — each will need handler registration in `ACTION_HANDLERS`.
8. **Remove null-payload ROLL_INITIATIVE fallback** once leader data is seeded.
