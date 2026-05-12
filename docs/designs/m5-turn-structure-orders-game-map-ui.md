# M5: Turn Structure, Orders, and Game Map UI Design

**Component Type:** orchestrator (server phase engine + Vue game view)
**Status:** draft
**Created:** 2026-05-07

---

## Intent

M5 delivers the first fully playable game loop: a two-player session where each player can
see the map, issue orders via the LOB v2.0 Command Phase, and step through the Activity and
Rally phases turn by turn. M4 established the game state model and initializer; M5 wires
that state to a live socket session, adds the turn/phase/step state machine, and builds the
Vue game map view that players will interact with.

The goal is a "steel thread" from session join → Command Phase → Activity Phase → Rally Phase
→ next turn, with full schema validation at every state transition and all game logic on the
server.

---

## Proposed Solution

### 1. Game State Schema Changes

Nine additions to `server/src/schemas/gameState.schema.js`, applied as a single batch:

**a. `UnitOrderState.status` — add `'stopped'`**

```js
status: z.enum(['none', 'delay', 'accepted', 'stopped']);
```

Add refinement: `stopped` status requires `type` to be non-null (a stopped order must have
a type to restore). LOB §10.6b — Attack Recovery restores a stopped order without a new
Command Roll.

**b. `phase` enum — rename to LOB §2 sequence**

```js
phase: z.enum(['command', 'activity', 'rally']).nullable();
```

Replaces the previous 6-phase enum. Null when `status === 'setup'` (cross-field constraint
already enforced by existing refine).

**c. `activePlayer` field**

```js
activePlayer: z.enum(['union', 'confederate']).nullable();
```

Null during setup. Set to `firstPlayer` from scenario turn structure at game start; alternates
each turn after the Rally phase completes.

**d. `step` field — within-phase step tracking**

```js
step: z.string().nullable();
```

String key identifying the current interactive step within a phase. Null between phases.
Examples: `'orders'`, `'attackRecovery'`, `'flukeStoppage'`, `'activation'`, `'rally'`.
Steps are phase-scoped; the same key in different phases is independent.

**e. `completedSteps` field**

```js
completedSteps: z.array(z.string());
```

Ordered list of step keys completed in the current phase. Reset to `[]` on each phase
transition. Used to enforce step ordering and prevent re-entry.

**f. `leaderState` record**

```js
// LeaderStateSchema
const LeaderStateSchema = z.object({
  casualtyRollPending: z.boolean(),
  replacedBy: z.string().nullable(), // successor leaderId if leader is lost
});

leaderState: z.record(z.string(), LeaderStateSchema);
```

Per-leader transient runtime state. Keyed by leaderId. Reset on scenarios where leaders
are restored (per SM rules).

**g. `pendingResolution` field**

```js
// PendingResolutionSchema
const PendingResolutionSchema = z.object({
  type: z.enum(['looseCannonRoll', 'variableReinforcement', 'leaderCasualty']),
  context: z.record(z.string(), z.unknown()),
});

pendingResolution: PendingResolutionSchema.nullable();
```

Non-null when a mid-step interrupt requires a dice roll or player decision before the step
can complete. The socket handler refuses all other actions while this is set.

**h. `activityPhase` envelope**

```js
activityPhase: z.object({
  activatedUnits: z.array(z.string()), // unitIds that have completed activation this phase
}).nullable();
```

Non-null only during the Activity Phase. `activatedUnits` enforces LOB §3.0d — one stack
must complete its activity before another starts. Reset to null when Activity Phase ends.

**i. `ordersPhase` envelope**

```js
ordersPhase: z.object({
  leaderRollUsed: z.record(z.string(), z.boolean()), // leaderId → used this turn
}).nullable();
```

Non-null only during the Orders step of the Command Phase. Enforces the one-Command-Roll-
per-leader-per-turn constraint (LOB §10.6). Reset to null when Orders step ends.

---

### 2. Server Phase Engine

#### 2a. Turn/Phase/Step State Machine

The sequence of play (LOB §2.1) maps to three phases, each with ordered steps:

**Command Phase** (`phase: 'command'`)

1. `orders` — leader Initiative rolls → order issuance (LOB §10.3–10.6)
2. `attackRecovery` — stopped Attack orders restored without new Command Roll (LOB §10.6b)
3. `flukeStoppage` — active orders that roll for Fluke Stoppage (LOB §10.7)

**Activity Phase** (`phase: 'activity'`) — active player only

1. `activation` — repeated: active player activates one stack at a time (LOB §3.0d)

**Rally Phase** (`phase: 'rally'`)

1. `rally` — morale recovery rolls for DG/Routed units (LOB §6.3)

Phase transitions:

- Command → Activity: after active player's Command Phase steps complete (LOB §2.0 — active player
  only; inactive player has no Command Phase during the active player's Player Turn)
- Activity (active player) → Activity (inactive player): on `END_PHASE` by active player
- Activity (inactive player) → Rally: on `END_PHASE` by inactive player
- Rally → next turn Command: auto-drain; increment `turn`, flip `activePlayer`

#### 2b. Pure Reducer Pattern

```
server/src/engine/actions/
  index.js          — dispatch(state, action) → newState
  endPhase.js       — END_PHASE handler
  issueOrder.js     — ISSUE_ORDER handler
  activateStack.js  — ACTIVATE_STACK handler (M5 stub — move declaration only)
  endActivation.js  — END_ACTIVATION handler
```

`dispatch(state, { type, payload, playerId })`:

1. Validates action is in `getValidActions(state, playerId)`
2. Routes to action handler
3. Calls `drainAutoSteps(state)` — chains automatic steps until the next interactive step
4. Returns new state (throws `ActionError` on invalid)

`drainAutoSteps(state)` advances through steps that have no player decision (e.g., automatic
Fluke Stoppage rolls) and persists once when it reaches an interactive step.

`getValidActions(state, playerId)` returns the list of legal `{ type, payload }` objects for
the given player given the current state. Used both to populate `validActions` in API responses
and to validate incoming REST actions.

#### 2c. Optimistic Concurrency

Every `saveGame` increments `state.version`. The action route checks:

```js
if (loaded.state.version !== action.expectedVersion) {
  res.status(409).json({ error: { code: 'VERSION_CONFLICT', message: '...' } });
  return;
}
```

#### 2d. HTTP Action Endpoint + Socket Notifications

`POST /api/v1/games/:id/actions` is the authoritative action submission path:

```
load → check expectedVersion → dispatch → saveGame → HTTP response with authoritative state/result
```

After a successful action, the route emits `game:state-updated` to the Socket.io game room so
connected clients can refetch or apply the latest state. Socket.io also owns room membership and
presence events (`game:join`, `game:leave`, player online/offline notifications). It does not own
authoritative action submission.

Both players can receive the full `gameState` once authorized. `validActions` is player-scoped
(only legal actions for the token holder; inactive player receives `[]` except during their
Activity Phase).

---

### 3. API and Socket Contract

**HTTP:**

| Endpoint                         | Payload                                                      | Response                                   |
| -------------------------------- | ------------------------------------------------------------ | ------------------------------------------ |
| `POST /api/v1/games/:id/actions` | `{ type: string, payload: object, expectedVersion: number }` | `{ result: object, gameState: GameState }` |

**Server → Client:**

| Event                 | Payload                             | When                            |
| --------------------- | ----------------------------------- | ------------------------------- |
| `game:state-updated`  | `{ state, lastAction }`             | After successful REST action    |
| `game:player-online`  | `{ side: 'union'\|'confederate' }`  | Other player joins socket room  |
| `game:player-offline` | `{ side: 'union'\|'confederate' }`  | Other player leaves/disconnects |
| `game:error`          | `{ code: string, message: string }` | Socket room/presence error      |

**Client → Server:**

| Event        | Payload                                 | When               |
| ------------ | --------------------------------------- | ------------------ |
| `game:join`  | `{ gameId: string, sideToken: string }` | On game view mount |
| `game:leave` | `{ gameId: string }`                    | On game view leave |

---

### 4. Vue Game View

**Route:** `/game/:gameId`  
**Files:** `client/src/views/GameView.vue`, `client/src/stores/game.js`

#### 4a. Pinia Store — `useGameStore`

```js
// client/src/stores/game.js
const gameState = ref(null); // full GameState, null until joined
const validActions = ref([]); // Action[] from server, player-scoped
const pendingAction = ref(null); // action submitted, awaiting ack

// socket.on('game:state-updated') → refetch/apply latest state
// POST action submit → set pendingAction; clear on response/error
```

One store, full-replace on initial load, REST action responses, or `game:state-updated` refresh.
No client-side game logic.

#### 4b. GameView Layout

Three-panel layout:

- **Map canvas** (centre) — hex grid + unit counters at `unit.hex` positions. Click a unit
  to select it. Hexes and counters rendered from `gameState.units`.
- **Action panel** (right) — lists `validActions` as buttons. Disabled + spinner while
  `pendingAction` is set. Empty when it is the other player's turn.
- **Info panel** (left) — current phase, step, active player, turn number. Selected-unit
  detail: orders, moraleState, ammo, wrecked, isDetached.

Map canvas reuses the hex grid rendering from the Map Test Tool
(`client/src/components/MapCanvas.vue` or equivalent). Unit counters are overlaid as SVG
or absolutely-positioned elements keyed by `unitId`.

#### 4c. Component Inventory

```
client/src/views/GameView.vue          — top-level layout, socket setup, store wiring
client/src/stores/game.js              — useGameStore
client/src/components/game/
  MapCanvas.vue                        — hex grid + unit counter overlay
  ActionPanel.vue                      — valid actions list
  InfoPanel.vue                        — phase/step/turn + selected unit detail
  UnitCounter.vue                      — single unit counter (counter art + state indicators)
```

---

### 5. Files to Create or Modify

**Server:**

- `server/src/schemas/gameState.schema.js` — 9 schema additions (§1 above)
- `server/src/schemas/gameState.schema.test.js` — tests for new fields
- `server/src/engine/actions/index.js` — new: dispatch + getValidActions
- `server/src/engine/actions/endPhase.js` — new
- `server/src/engine/actions/issueOrder.js` — new
- `server/src/engine/actions/activateStack.js` — new (M5 stub)
- `server/src/engine/actions/endActivation.js` — new
- `server/src/engine/actions/*.test.js` — unit tests for each handler
- `server/src/routes/games.js` — add POST action route
- `server/src/server.js` or socket helper — add game room/presence notifications

**Client:**

- `client/src/views/GameView.vue` — new
- `client/src/stores/game.js` — new
- `client/src/components/game/MapCanvas.vue` — new (or adapt from map test tool)
- `client/src/components/game/ActionPanel.vue` — new
- `client/src/components/game/InfoPanel.vue` — new
- `client/src/components/game/UnitCounter.vue` — new

---

### 6. Out of Scope for M5

- Opening Volleys (inactive player reaction) — M6
- Combat resolution — M6
- Morale rolls — M6
- Reinforcement arrival UI — M6
- Army CO order pipeline (McClellan) — M7 (arrives turn 25; Initiative dominates all of early SM)
- Observer/spectator view — M7
- Replay / audit log — M7+

---

## Resolved Design Decisions

- **Rally Phase scope:** Stub as auto-drain pass-through in M5. All units start `normal` so
  Rally is a no-op for early turns. Full morale recovery rolls implemented in M6 alongside
  combat/morale.

- **Unit counter art:** Colored square placeholders with unit ID text in M5. Real counter
  images (already linked in `oob.json`) wired in M6 when asset pipeline work is scoped.

- **`getValidActions` granularity for Orders step:** Two-step sequence — `ROLL_INITIATIVE`
  first (one action per eligible leader), then `ISSUE_ORDER` if the roll succeeds (player
  picks order type). Mirrors the actual rule sequence (LOB §10.6). Server holds the die
  result in state between the two actions.

- **Army CO stub boundary:** `issueOrder.js` handles Leader Initiative orders only. No Army
  CO routing in M5. McClellan's pipeline (turn 25) added as a separate handler in M7.

## Open Questions

None.

---

## Issues

- #354 — Apply M5 schema changes (9 additions to gameState.schema.js + tests)
- #355 — Implement server phase engine (dispatch, getValidActions, action handlers)
- #356 — Add game action endpoint and socket room notifications
- #357 — Detail GameView component architecture and split UI tickets
