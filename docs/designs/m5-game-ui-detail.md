# M5 Game UI Detail Design

**Created:** 2026-05-28  
**Status:** Final  
**Closes:** #357  
**Companion design:** `docs/designs/m5-turn-structure-orders-game-map-ui.md`

---

## 1. What Is Already Delivered

The M5 implementation sprint delivered more than the original design doc described. These
components and modules exist and are functional:

| File                                         | Status                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| `client/src/views/GameView.vue`              | ✅ Delivered — layout, map, OOB enrichment, click handling              |
| `client/src/stores/useGameStore.js`          | ✅ Delivered — loadGame, selectUnit, generation guard                   |
| `client/src/components/HexMapOverlay.vue`    | ✅ Reused — serves as the map canvas                                    |
| `client/src/components/UnitCounterLayer.vue` | ✅ Reused — renders unit counters on map                                |
| `client/src/components/UnitStatsPanel.vue`   | ✅ Partial — missing counter image, weapon type, faction colors, paging |

The original design doc referenced `MapCanvas.vue` and `game.js` as new files. The
implementation correctly reused `HexMapOverlay` directly and named the store
`useGameStore.js`. This document supersedes those naming decisions.

---

## 2. Component Responsibilities

### `GameView.vue` — top-level layout and orchestration

**Current responsibilities (done):**

- Loads game state and OOB data in parallel on mount
- Derives `displayUnits` (on-board units enriched with OOB counter file + side)
- Derives `selectedDisplayUnit` (selected unit enriched with OOB stats)
- Routes hex clicks and unit clicks to store selection
- Renders `HexMapOverlay` with calibration, hexes, and units
- Renders `UnitStatsPanel` in the sidebar
- Shows loading/error banners

**Additions needed (follow-up tickets):**

- Socket.io client setup — connect on mount, listen to `game:state-updated`, call `gameStore.refreshGame()`
- Render `ActionPanel` in the sidebar beneath `UnitStatsPanel`
- Pass `gameStore.pendingAction !== null` to disable action panel during in-flight requests

### `HexMapOverlay.vue` + `UnitCounterLayer.vue` — map canvas (no new component needed)

The map test tool and game view already share `HexMapOverlay`. The game view passes
`:interaction-enabled="true"` and binds `@hex-click` / `@unit-click`. No new `MapCanvas.vue`
abstraction is required for M5 or M6; if the map rendering needs game-specific behaviour
(e.g. LOS highlighting during targeting), add a prop to `HexMapOverlay` at that point.

### `UnitStatsPanel.vue` → enhanced InfoPanel (in-place, #408)

Renamed conceptually to InfoPanel in the design doc but kept as `UnitStatsPanel.vue`
in code to avoid a rename refactor. Enhancements tracked in #408 (Phase 3 of this track):

- Counter image from `oob.json` counterFile linkage
- Weapon type from OOB data
- Faction header color: CSA red (`#8b2020`) / Union blue (`#1a3a6a`)
- Previous/next paging when multiple units occupy the same hex

### `ActionPanel.vue` — new component (follow-up ticket)

Displays current game phase context and submittable actions.

**Props:**

```js
defineProps({
  phase: String, // e.g. 'command', 'activity', 'rally'
  step: String, // e.g. 'orders', 'activation'
  turn: Number,
  activePlayer: String, // 'union' | 'confederate'
  validActions: Array, // [{ type, payload }]
  pending: Boolean, // true while POST /actions in-flight
});
defineEmits(['submit-action']);
```

**Behaviour:**

- Shows "Waiting for [other player]…" when it is not the local player's turn
- Renders one button per entry in `validActions`; all disabled when `pending` is true
- Spinner overlays the active button while `pending`
- Emits `submit-action` with `{ type, payload }` — parent calls `gameStore.submitAction()`

**Visual treatment (M5):** monochrome sidebar panel matching existing dark palette. Action
buttons use the standard border style, no icons. Labels are the action type in title-case
(e.g. "End Phase", "Roll Initiative").

### `useGameStore.js` — store additions (follow-up ticket)

**New state:**

```js
const pendingAction = ref(null); // { type, payload } | null
const validActions = ref([]); // [{ type, payload }]
```

**New actions:**

```js
async function submitAction(gameId, type, payload = null) {
  pendingAction.value = { type, payload };
  try {
    const res = await fetch(`/api/v1/games/${gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload, expectedVersion: gameState.value.version }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Action failed: ${res.status}`);
    }
    const saved = await res.json();
    gameState.value = saved;
    // validActions is derived from the response or re-queried; see §3
  } catch (err) {
    error.value = err.message;
  } finally {
    pendingAction.value = null;
  }
}

function refreshGame(gameId) {
  // Called when game:state-updated fires; re-uses loadGame with generation guard
  loadGame(gameId);
}
```

**Socket setup (wired in `GameView.vue`):**

```js
// GameView.vue onMounted
import { io } from 'socket.io-client';
const socket = io();
socket.emit('game:join', { gameId: route.params.id });
socket.on('game:state-updated', () => gameStore.refreshGame(route.params.id));
onUnmounted(() => {
  socket.emit('game:leave', { gameId: route.params.id });
  socket.disconnect();
});
```

Socket setup belongs in `GameView.vue`, not the store — the store is server-unaware by
design. The store's `refreshGame()` is the re-entry point, identical to `loadGame()`.

---

## 3. API / Socket Client Contract

Aligns with Phase 1 implementation (PR from this track).

### REST

| Endpoint                         | Purpose                                                   |
| -------------------------------- | --------------------------------------------------------- |
| `GET /api/v1/games/:id`          | Load full game state (used by `loadGame` + `refreshGame`) |
| `POST /api/v1/games/:id/actions` | Submit action; returns saved state on success             |

**Action request body:**

```json
{ "type": "END_PHASE", "payload": null, "expectedVersion": 7 }
```

**Conflict response (409):** client increments version via `loadGame` then retries.  
**Client error (422):** surface `body.error` to the user; do not retry automatically.  
**Server error (500):** surface a generic message; do not retry automatically.

### Socket.io

| Event                | Direction       | Payload       |
| -------------------- | --------------- | ------------- |
| `game:join`          | client → server | `{ gameId }`  |
| `game:leave`         | client → server | `{ gameId }`  |
| `game:joined`        | server → client | `{ gameId }`  |
| `game:error`         | server → client | `{ error }`   |
| `game:state-updated` | server → client | `{ version }` |

`game:state-updated` is a notification only — the client always fetches authoritative state
via `GET /api/v1/games/:id`. The `version` field in the event is for optimistic-UI
freshness checks only and should not be used to update `gameState` directly.

### `validActions` sourcing (M5 decision)

For M5, `validActions` is not fetched from a dedicated endpoint. The server's
`getValidActions()` is a pure function of state, so the client derives it by reading
`gameState` fields:

- If `gameState.activePlayer !== localPlayerSide` → empty (other player's turn)
- Otherwise → inferred from `gameState.phase` + `gameState.step` using the same logic
  as the server's `getValidActions()`

A dedicated `GET /api/v1/games/:id/valid-actions` endpoint is deferred to M6, when
per-stack activation granularity makes client-side derivation impractical.

---

## 4. MapCanvas Reuse Strategy

`HexMapOverlay` is shared between the map editor, map test tool, and `GameView`. The
sharing contract is enforced through props:

- `GameView` passes `:interaction-enabled="true"` and binds click events
- Dev tools pass their own overlay configs and click handlers
- No game-specific logic lives inside `HexMapOverlay`

If M6 needs LOS highlighting during a fire-combat targeting flow, add a
`:highlight-hexes` prop to `HexMapOverlay` with a Set of hex IDs. Do not couple
`HexMapOverlay` to the game store.

---

## 5. Visual Treatment (M5 Scope)

- **Counter art:** Real counter images from `oob.json` counterFile, served as static assets.
  Placeholder coloured squares are replaced in `UnitStatsPanel` (#408, Phase 3).
- **Action buttons:** Text-only, title-cased action type label, dark palette.
- **Other-player turn state:** ActionPanel shows "Waiting for [side]…" message, all
  buttons hidden/disabled.
- **Loading state:** Existing `.loading-banner` in `GameView`. `ActionPanel` disables and
  shows spinner on `pending`.
- **Error state:** Existing `.error-banner` in `GameView`. Action errors surface via
  `gameStore.error`.
- **Phase/turn display:** One-line summary at top of ActionPanel: "Turn 3 — Command Phase
  (Orders)" — no separate header component for M5.

---

## 6. Required Tests

### Store (`useGameStore`)

- `submitAction` sends correct body (type, payload, expectedVersion)
- `pendingAction` is set during in-flight request and cleared on success and on error
- `gameState` is updated to returned state on success
- `error` is set on 422 / 500 responses
- `refreshGame` calls `loadGame` with the correct game id

### `ActionPanel.vue`

- Renders one button per `validActions` entry
- Buttons are disabled when `pending` is true
- Shows waiting message when `activePlayer` does not match local side
- `submit-action` event is emitted with the correct `{ type, payload }` on click
- Empty render when `validActions` is empty and it is the local player's turn

### `GameView.vue` integration

- Socket join emitted on mount
- Socket leave emitted on unmount
- `refreshGame` called when `game:state-updated` fires
- Error banner shown when `gameStore.error` is non-null

### `UnitStatsPanel.vue` (#408 — Phase 3 of this track)

- Counter image renders for selected unit
- Weapon type visible
- Header color matches faction
- Paging controls appear for stacked hexes; paging updates displayed unit

---

## 7. Follow-up Tickets

| Issue | Component            | Description                                                                           |
| ----- | -------------------- | ------------------------------------------------------------------------------------- |
| #472  | `useGameStore`       | Add `submitAction`, `pendingAction`, socket `game:state-updated` listener             |
| #473  | `ActionPanel.vue`    | New component — phase/turn/step display + action buttons                              |
| #474  | `GameView.vue`       | Wire socket setup, `ActionPanel`, `pendingAction` pass-through                        |
| #408  | `UnitStatsPanel.vue` | Counter image, weapon type, faction colors, multi-unit paging (Phase 3 of this track) |
