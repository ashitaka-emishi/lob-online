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

| Field             | Type             | Required | Description                                                                                                              |
| ----------------- | ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `type`            | `string`         | yes      | Action type identifier (see §4 for valid values)                                                                         |
| `payload`         | `object \| null` | yes      | Action-specific parameters; `null` for zero-arity actions (see §4 per-type)                                              |
| `expectedVersion` | `number`         | no       | If present and numeric, server rejects with 409 if current `state.version` ≠ this; absent or non-numeric = guard skipped |

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

**⚠ M5.5 limitation — concrete-candidate branch is currently dead code.** `getValidActions`
is intended to return one candidate per eligible (not-yet-rolled, on-board) leader × on-board
unit combination (`index.js:46-51`). However, `LeaderStateSchema` (`gameState.schema.js:99-104`)
is `.strict()` with only `{ casualtyRollPending, replacedBy }` — it has no `isOnBoard` field.
The engine reads `ls.isOnBoard` (`index.js:37`), which is always `undefined` on any schema-valid
entry, making `eligibleLeaders` always empty regardless of whether `leaderState` is populated.
The result: the engine **always** falls to the null-payload fallback (`index.js:52`) under the
current schema. Seeding `leaderState` entries does not produce concrete candidates until
`LeaderStateSchema` gains `isOnBoard` (see §9 item 0 and #560). See §8 for the null-payload
fallback behaviour.

<!-- TODO(M6): update this paragraph when LeaderStateSchema gains isOnBoard and the concrete-
     candidate path becomes live. Remove the dead-code warning. Ref: §9 item 0, #560. -->

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

`pendingOrderIssuance` shape: `{ leaderId: string, unitId: string }`. Both fields are set by
`handleRollInitiative` and are available to M6 Command Rating lookup when resolving the roll.

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

`GameView.vue` listens for `'game:state-updated'` — see
[`client/src/views/GameView.vue`](../../client/src/views/GameView.vue) for the current
implementation. Both fetches use generation counters (`_loadGeneration`, `_actionsGeneration`)
to discard stale responses from burst events. The submitting client also reads the full game
state from the POST response body — it does not wait for the socket event to update its own
`gameState`. The socket event primarily refreshes the **opposing player's** view.

<!-- TODO(M6): update this section when the socket contract changes (e.g. side-scoped events,
     partial-state diffs, or FIRE/MELEE action types are added). -->

If `io` is unavailable (e.g., during server-side integration tests), the route logs a
warning and skips the emit — no error is returned.

---

## 7. Error Response Codes

| Code | Source                        | Meaning                                                                                     |
| ---- | ----------------------------- | ------------------------------------------------------------------------------------------- |
| 400  | Route type-check              | `type` is missing or not a string (`games.js:169`) — bare error, not an `ActionError`       |
| 400  | `ActionError INVALID_PAYLOAD` | Handler-side payload validation failed; message reaches client verbatim (`games.js:203`)    |
| 401  | `requireSide`                 | No player session                                                                           |
| 403  | `requireSide`                 | Session is for a different game, or sideToken invalid                                       |
| 404  | `requireSide`                 | Game not found                                                                              |
| 409  | `requireSide` / route         | Game not active, or version conflict                                                        |
| 422  | `ActionError INVALID_ACTION`  | Wrong turn, type not in valid-actions list, or no handler registered (`UNKNOWN_ACTION`)     |
| 500  | `ActionError INVALID_STATE`   | Server fault (Zod parse failure or drain loop); message is sanitized before reaching client |

Note: the two 400 paths have different message contracts. `INVALID_PAYLOAD` messages are written
by handler authors and reach the client as-is — keep them client-safe (no internal state, tokens,
or opponent data).

---

## 8. M5.5 Limitations

- **ROLL_INITIATIVE always succeeds.** No dice resolution or Command Rating modifiers yet.
  M6 will consult the Command Roll table (LOB §10.3) and may fail the roll.
- **`ROLL_INITIATIVE` concrete-candidate branch is dead code under the current schema.**
  `LeaderStateSchema` has no `isOnBoard` field, so `eligibleLeaders` is always empty and the
  null-payload fallback fires for every game state — even populated `leaderState` entries
  produce no candidates. See §4 `ROLL_INITIATIVE` and §9 item 0 for the M6 fix path (#560).
- **No side-filtering on ROLL_INITIATIVE targets.** Unit affiliation is OOB data not yet
  co-located with the engine; all on-board units are eligible targets. Gated on #560.
- **ACTIVATE_STACK / END_ACTIVATION are movement stubs.** No movement points or hex
  transitions are resolved. M6 will add movement resolution before `END_ACTIVATION` can
  advance.
- **Attack Recovery and Fluke Stoppage auto-advance.** No orders to roll against yet; both
  steps drain instantly. M6 will insert real dice rolls.
- **Rally Phase auto-advances.** No DG/Routed units exist in M5 state. M6 morale work will
  add real rally resolution.
- **`ROLL_INITIATIVE` null-payload fallback.** The engine currently always returns
  `{ type: 'ROLL_INITIATIVE', payload: null }` (see dead-code note above). Clients must
  supply `leaderId` and `unitId` in the submission payload; the handler validates them
  against state. Will be replaced by concrete candidates once §9 item 0 is done.

---

## 9. M6 Handoff

The following surfaces must be extended or replaced in M6:

0. **`LeaderStateSchema` extension (prerequisite for items 1 and 3).** Add `isOnBoard: boolean`
   (and eventually `side: 'union' | 'confederate'`) to `LeaderStateSchema`
   (`server/src/schemas/gameState.schema.js`). If the change is not backwards-compatible with
   existing persisted state, bump `STATE_SCHEMA_VERSION` (same file) and add a migration note.
   Without this, items 1 and 3 cannot produce concrete candidates.
1. **`handleRollInitiative`** — add Command Rating lookup (OOB data) and dice resolution
   against LOB §10.3 Command Roll table. A failed roll must not set `pendingOrderIssuance`.
   `pendingOrderIssuance.leaderId` is already threaded through for this lookup.
2. **`handleActivateStack` / `handleEndActivation`** — add movement resolution: MP budget
   from OOB, terrain costs from `map.json`, and hex transition writes to `unit.hex`.
3. **`getValidActions` (COMMAND / orders)** — filter ROLL_INITIATIVE candidates to friendly
   units only once OOB side data is co-located with the engine (#560). Depends on item 0.
4. **drainAutoSteps (Attack Recovery)** — roll per stopped attack order (LOB §10.6b).
5. **drainAutoSteps (Fluke Stoppage)** — roll per accepted attack order (LOB §10.7).
6. **drainAutoSteps (Rally)** — roll Rally for each DG/Routed unit (LOB §6.3).
7. **New action types** — `FIRE` (ranged combat), `MELEE` (close combat), `ROUT_CHECK`,
   `LEADER_LOSS` — each will need handler registration in `ACTION_HANDLERS`.
8. **Remove null-payload ROLL_INITIATIVE fallback** once item 0 and item 3 are done. Also
   update `smoke.test.js` fixture to seed a valid `leaderState` entry and assert concrete
   candidates.

<!-- TODO(M6): update §8 item list when new action types (FIRE, MELEE, ROUT_CHECK,
     LEADER_LOSS) are registered. Remove items 0-3 as they are implemented. -->
