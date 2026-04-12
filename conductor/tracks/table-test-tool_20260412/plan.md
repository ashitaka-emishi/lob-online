# Implementation Plan: Table Test Tool

**Track ID:** table-test-tool_20260412
**Spec:** [spec.md](./spec.md)
**Created:** 2026-04-12
**Status:** [~] In Progress

## Overview

Three phases. Phase 1 creates the server route module (`tableTest.js`) with all 11
POST endpoints and mounts it in `server.js`. Phase 2 wires the client shell (router
entry + `TableTestView.vue` with panel selector). Phase 3 implements all 11 panel
components. No engine work — all six table modules already exist and are tested.

All server routes follow the POST pattern (body params, pure computation, no map
data). All client components follow the existing pattern in
`client/src/components/tools/`.

---

## Phase 1: Server Routes

Create `server/src/routes/tableTest.js` with all 11 POST endpoints backed by the
existing `engine/tables/*` modules. Mount it inside the `MAP_EDITOR_ENABLED` guard.

### Tasks

- [x] Task 1.1: Create `server/src/routes/tableTest.js`
  - Import from all six table modules
  - `POST /combat` — body: `{ effectiveSPs, netColumnShifts, diceRoll }`
    → `{ column, result, moraleCheckRequired, depletionRequired, modifierBreakdown }`
  - `POST /opening-volley` — body: `{ condition, diceRoll }`
    → `{ spLoss }`
  - `POST /morale` — body: `{ rating, modifiers, diceRoll }`
    → `{ rawResult, effectiveRoll, newState, retreatHexes, spLoss, leaderLossCheck, modifierBreakdown }`
  - `POST /morale-transition` — body: `{ currentState, incomingResult }`
    → `{ resolvedState }`
  - `POST /closing-roll` — body: `{ moraleRating, mods, diceRoll }`
    → `{ pass, threshold, modifiedRoll, modifierBreakdown }`
  - `POST /leader-loss` — body: `{ situation, isSharpshooter, diceRoll }`
    → `{ result }`
  - `POST /command-roll` — body: `{ commandValue, isReserve, isDeployment, diceRoll }`
    → `{ pass, modifiedRoll, threshold }`
  - `POST /order-delivery` — body: `{ armyCOType, distanceCategory, isReserveOrder }`
    → `{ turnsToDeliver }`
  - `POST /fluke-stoppage` — body: `{ commandValue, hasReserve, isNight, diceRoll }`
    → `{ basePass, stoppage, rolls }`
  - `POST /attack-recovery` — body: `{ divisionStatus, commandValue, step1Roll, step2Roll }`
    → `{ result, rolls }`
  - `POST /zero-rule` — body: `{ diceRoll }`
    → `{ ma }`
  - 400 on missing required params for every endpoint
  - Rule citation on every endpoint handler

- [x] Task 1.2: Write Vitest tests for `tableTest.js`
  - Each endpoint returns correct shape with valid inputs
  - Each endpoint returns 400 on missing required params
  - At least one known-good input/output pair per endpoint (cross-checked against
    rulebook or engine unit tests)

- [x] Task 1.3: Mount router in `server/src/server.js`
  - Inside the existing `MAP_EDITOR_ENABLED` block:
    `app.use('/api/tools/table-test', tableTestRouter)`
  - Add console log: `[server] table test tool enabled at /tools/table-test`

### Verification

- [x] `npm run test` — all table-test route tests green (1752 total, 40 new)
- [x] `npm run lint && npm run format:check` — clean

---

## Phase 2: Client Shell

Register the route and create the `TableTestView.vue` orchestrator. No panels yet —
just the page with a panel selector and an active panel slot.

### Tasks

- [x] Task 2.1: Add route in `client/src/router/index.js`
  - `{ path: '/tools/table-test', component: () => import('../views/tools/TableTestView.vue') }`

- [x] Task 2.2: Add router test in `client/src/router/index.test.js`
  - `has a route for /tools/table-test`

- [x] Task 2.3: Create `client/src/views/tools/TableTestView.vue`
  - `<script setup>` — no map data needed
  - Panel selector (tabs): Combat | Opening Volley | Morale | Morale Transition |
    Closing Roll | Leader Loss | Command Roll | Order Delivery | Fluke Stoppage |
    Attack Recovery | Zero Rule
  - Active panel rendered via `<component :is="activePanel" />`
  - No hex map, no hex click events

- [x] Task 2.4: Create `client/src/views/tools/TableTestView.test.js`
  - Renders without error
  - Panel selector shows all 11 panel names
  - Switching panel tabs updates the active panel

### Verification

- [x] `npm run test` — shell tests green (1758 total, 6 new)
- [x] `npm run lint && npm run format:check` — clean

---

## Phase 3: Panel Components

One SFC per panel. Each panel owns its inputs, calls its POST endpoint on submit,
and renders the result with a modifier breakdown. Panels are stateless between
navigations — no cross-panel state.

### Tasks

- [x] Task 3.1: Create `CombatPanel.vue`
  - Inputs: effectiveSPs (number), netColumnShifts (number), diceRoll (2d6 = 2–12)
  - Submit → POST `/api/tools/table-test/combat`
  - Display: final column, result cell (−/m/1–4), morale check flag, depletion flag,
    modifier breakdown list

- [x] Task 3.2: Create `OpeningVolleyPanel.vue`
  - Inputs: condition select (`chargeInProgress` | `rangeOnly` | `shiftOnly`), diceRoll (1d6)
  - Submit → POST `/api/tools/table-test/opening-volley`
  - Display: SP loss (0/1/2)

- [x] Task 3.3: Create `MoralePanel.vue`
  - Inputs: rating select (A–F), modifier checkboxes (shaken, wrecked, rear, night,
    etc. from `MORALE_MODIFIERS`), diceRoll (2d6)
  - Submit → POST `/api/tools/table-test/morale`
  - Display: raw result, effective roll, new state, retreat hexes, SP loss,
    leader loss check, modifier breakdown

- [x] Task 3.4: Create `MoraleTransitionPanel.vue`
  - Inputs: currentState select (`bl`/`normal`/`shaken`/`dg`/`rout`), incomingResult
    select (same set)
  - Submit → POST `/api/tools/table-test/morale-transition`
  - Display: resolved new state

- [x] Task 3.5: Create `ClosingRollPanel.vue`
  - Inputs: moraleRating select (A–F), modifier checkboxes (bloodLust, rear, shaken,
    artilleryWithCanister, breastworksAdjacent, from `CLOSING_ROLL_MODIFIERS`), diceRoll (1d6)
  - Submit → POST `/api/tools/table-test/closing-roll`
  - Display: pass/fail badge, threshold, modified roll, modifier breakdown

- [x] Task 3.6: Create `LeaderLossPanel.vue`
  - Inputs: situation select (`other`/`capture`/`defender`/`attacker`),
    isSharpshooter toggle, diceRoll (2d6)
  - Submit → POST `/api/tools/table-test/leader-loss`
  - Display: result (no effect / captured / wounded / killed)

- [x] Task 3.7: Create `CommandRollPanel.vue`
  - Inputs: commandValue (number 1–6), isReserve toggle, isDeployment toggle, diceRoll (2d6)
  - Submit → POST `/api/tools/table-test/command-roll`
  - Display: pass/fail badge, modified roll, threshold

- [x] Task 3.8: Create `OrderDeliveryPanel.vue`
  - Inputs: armyCOType select (from `AWARENESS_TURNS` keys), distanceCategory select
    (from `DISTANCE_TURNS` keys), isReserveOrder toggle
  - Submit → POST `/api/tools/table-test/order-delivery`
  - Display: turns to deliver

- [x] Task 3.9: Create `FlukestoppagePanel.vue`
  - Inputs: commandValue (number 1–6), hasReserve toggle, isNight toggle, diceRoll (2d6)
  - Submit → POST `/api/tools/table-test/fluke-stoppage`
  - Display: base pass result, stoppage flag, all dice rolls used

- [x] Task 3.10: Create `AttackRecoveryPanel.vue`
  - Inputs: divisionStatus select (`noWrecked`/`wrecked`/`hasDead`), commandValue
    (number 1–6), step1Roll (2d6), step2Roll (2d6, shown only if step 1 passes)
  - Submit → POST `/api/tools/table-test/attack-recovery`
  - Display: result (no recovery / attack recovery), rolls used

- [x] Task 3.11: Create `ZeroRulePanel.vue`
  - Inputs: diceRoll (1d6)
  - Submit → POST `/api/tools/table-test/zero-rule`
  - Display: MA result (no MA / half MA / full MA)

- [x] Task 3.12: Write Vitest tests for each panel (one file per panel)
  - Renders without error with no submission
  - Displays loading state while POST in flight
  - Displays result correctly given mocked API response
  - Required-field validation prevents submission

### Verification

- [x] `npm run test` — all panel tests green (1827 total, 69 new)
- [x] `npm run lint && npm run format:check` — clean

---

## Final Verification

- [ ] All acceptance criteria in spec.md met
- [x] `npm run test` — full suite green (1827 passing)
- [x] `npm run lint && npm run format:check` — clean
- [ ] Manual: navigate to `/tools/table-test`; all 11 panels reachable and functional
- [ ] Ready for `/pr-create`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
