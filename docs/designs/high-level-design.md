# lob-online — High-Level Design

**Version:** 0.1 (first draft)
**Date:** 2026-02-19
**Status:** Draft — awaiting review

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Phased Development Plan](#2-phased-development-plan)
3. [Backend Architecture](#3-backend-architecture)
4. [Data Persistence Strategy](#4-data-persistence-strategy)
5. [Multiplayer Coordination Model](#5-multiplayer-coordination-model)
6. [Game State Lifecycle](#6-game-state-lifecycle)
7. [Rules Engine Design](#7-rules-engine-design)
8. [API Contract](#8-api-contract)
9. [Project Directory Structure](#9-project-directory-structure)
10. [Data Preparation Tools](#10-data-preparation-tools)
11. [Tooling Configuration](#11-tooling-configuration)
12. [Open Questions and Risks](#12-open-questions-and-risks)

---

> **Implementation Status (as of 2026-04-10) — M2 Complete**
>
> **M1 — Scaffold (complete):** tech stack selection, server scaffold (Express + Socket.io),
> data models (five JSON files: map, scenario, oob, leaders, succession), Zod validation schemas,
> Vitest test suites (server + client), ESLint/Prettier configuration, GitHub Actions CI pipeline.
>
> **M2 — Dev Tools (complete):** map editor dev tool (full accordion panel suite: elevation,
> terrain, linear features, wedge editor, LOS test panel; click/paint modes; layer toggles;
> localStorage autosave; versioned server backups; offline fallback; push/pull sync UX);
> scenario editor dev tool (turn structure, lighting schedule, rules fields);
> OOB editor dev tool (command hierarchy tree, unit detail panel, leader succession, counter
> image widget); counter auto-detection script; extended `scenario.json` with full movement
> cost chart, lighting schedule, rules flags, setup positions, reinforcements, VP tables,
> and random event tables.
>
> **In progress:** terrain data digitization (ongoing hex entry for South Mountain map).
>
> **Next:** M3 — Rules Engine Foundation + Map Testing Tools (see §2 for full milestone plan).
>
> Sections describing completed work are accurate to the implementation. Sections describing
> planned work reflect design intent and may evolve.

---

## 1. System Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Vue 3)                          │
│                                                                 │
│  ┌─────────────────────┐    ┌──────────────────────────────┐    │
│  │   Game UI / Pinia   │    │   SVG Hex Map (Honeycomb.js) │    │
│  │   - action forms    │    │   - click-to-select unit     │    │
│  │   - unit panels     │    │   - click-to-move/fire       │    │
│  │   - VP tracker      │    │   - terrain overlay          │    │
│  └──────────┬──────────┘    └──────────────┬───────────────┘    │
│             │  REST (fetch)                │                    │
│             │  Socket.io client            │                    │
└─────────────┼────────────────────────────────────────────────── ┘
              │  HTTPS
              ▼
┌─────────────────────────────────────────────────────────────────┐
│              EXPRESS.JS SERVER  (DigitalOcean Droplet)          │
│                                                                 │
│  helmet → cors → morgan → cookieParser → express.json           │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐      │
│  │ /auth routes │  │  /api routes │  │  Socket.io server │      │
│  │              │  │ authenitcate │  │  (rooms per game) │      │
│  │ Discord OAuth│  │ JWT          |  └───────┬───────────┘      │
│  │ passport     │  │ loadGame     │          │ emit on action   │
│  │ JWT cookie   │  │ Zod validate │          │                  │
│  └──────────────┘  └──────┬───────┘          │                  │
│                           │                  │                  │
│                    ┌──────▼───────────────┐  │                  │
│                    │     Rules Engine     │  │                  │
│                    │  (pure JS, no I/O)   │  │                  │
│                    │  movement / combat   │  │                  │
│                    │  morale / orders     │  │                  │
│                    │  LOS / VP            │  │                  │
│                    └──────┬───────────────┘  │                  │
│                           │                  │                  │
│              ┌────────────┼───────────────┐  │                  │
│              ▼            ▼               ▼  │                  │
│        ┌──────────┐ ┌──────────┐  ┌────────────────┐            │
│        │  SQLite  │ │  Spaces  │  │Discord webhook │            │
│        │  users   │ │  client  │  │  (fetch POST)  │            │
│        │  games   │ │          │  └────────────────┘            │
│        └──────────┘ └──────────┘                                │
└─────────────────────────────────────────────────────────────────┘
              │                    │
              ▼                    ▼
   ┌──────────────────┐  ┌─────────────────────────────────────┐
   │  SQLite file     │  │     DigitalOcean Spaces             │
   │  (on Droplet)    │  │  games/{id}/state.json              │
   │                  │  │  games/{id}/history/{seq:06d}.json  │
   └──────────────────┘  └─────────────────────────────────────┘

              ┌─────────────────────────────┐
              │         DISCORD             │
              │  OAuth2 (identity)          │
              │  Webhook (notifications)    │
              └─────────────────────────────┘
```

### Async PBEM Flow

```
Player A (browser)          Server                  Player B (Discord)
      │                       │                           │
      │  POST /api/v1/        │                           │
      │  games/:id/actions    │                           │
      │──────────────────────►│                           │
      │                       │ 1. authenticate JWT       │
      │                       │ 2. load game from Spaces  │
      │                       │ 3. Zod validate body      │
      │                       │ 4. rules engine validates │
      │                       │ 5. produce new state      │
      │                       │ 6. write state.json       │
      │                       │ 7. write history/{n}.json │
      │                       │ 8. update SQLite          │
      │                       │ 9. POST Discord webhook   │
      │◄──────────────────────│                           │
      │  200 { result, state }│                           │
      │                       │──────────────────────────►│
      │                       │   "Your turn — Game X"    │
      │                       │                           │
      │                  (later)                    Player B opens app
      │                       │◄──────────────────────────│
      │                       │  GET /api/v1/games/:id    │
      │                       │──────────────────────────►│
      │                       │  200 { state }            │
```

### Real-Time Flow (Socket.io)

```
Player A (browser)          Server                Player B (browser)
      │                       │                           │
      │  socket.emit not used │                           │
      │  for actions — REST   │                           │
      │                       │                           │
      │  POST /api/v1/        │   both in room gameId     │
      │  games/:id/actions    │                           │
      │──────────────────────►│                           │
      │                       │ [validate + process]      │
      │◄──────────────────────│                           │
      │  200 { result, state }│                           │
      │                       │ io.to(gameId).emit(       │
      │                       │   'game:state-updated',   │
      │                       │   { state, lastAction }   │
      │                       │ )                         │
      │◄──────────────────────│──────────────────────────►│
      │  (own view updated    │  state-updated event      │
      │   from REST response) │  (Pinia store updated)    │
```

### Hybrid Play

Live and async modes are not mutually exclusive — a game naturally degrades to PBEM when one player is offline and upgrades to real-time when both reconnect. No explicit mode switch exists because none is needed:

- Actions always flow through `POST /api/v1/games/:id/actions` regardless of whether both players are present.
- Socket.io is a _notification layer_, not the action channel. When both players are in the same game room, state updates arrive instantly. When one disconnects, the room simply has fewer sockets — the emit still fires for those that remain.
- The Discord webhook fires on every action if configured. If the opponent is already online and watching via socket, the webhook is redundant but harmless.
- There is no `mode` field in the game state or SQLite schema.

A session that starts live on Saturday, continues asynchronously via Discord notifications through the week, and resumes live the following weekend requires no migration step and no user action.

---

## 2. Phased Development Plan

### Milestone Overview

| Milestone | Status  | Goal                                                |
| --------- | ------- | --------------------------------------------------- |
| M1        | ✅ Done | Initial scaffold — tech stack, server, CI, schemas  |
| M2        | ✅ Done | Dev tools — map editor, scenario editor, OOB editor |
| M3        | 🔜 Next | Rules engine foundation + map testing tools         |
| M4        | Planned | Auth + game API + local persistence                 |
| M5        | Planned | Turn structure + orders + game map UI               |
| M6        | Planned | Combat + morale                                     |
| M7        | Planned | Special rules + victory conditions                  |
| M8        | Planned | Production persistence + multiplayer                |

M3–M8 together deliver the playable South Mountain MVP. M9+ covers Enhanced Experience
(Discord DMs, replay viewer, mobile layout) and Extended Content (additional scenarios,
spectator mode, AI opponent).

### Rule Section Coverage

Tracks which LOB v2.0 and SM rule sections are covered in each milestone and their current
status. "Engine" = pure-JS module implemented and unit-tested (testable via dev tools).
"Loop" = wired into the live game dispatch/action pipeline.

| Rule Section      | Topic                                                                | Engine   | Loop  | Status  |
| ----------------- | -------------------------------------------------------------------- | -------- | ----- | ------- |
| LOB §2            | Sequence of Play — turn phases, Command/Activity/Rally               | —        | M5    | Planned |
| LOB §3            | Movement — terrain costs, formations, road movement, ZOC             | M3       | M5    | Planned |
| LOB §4            | Line of Sight — Slope Table, height modifiers                        | M3       | M3    | Planned |
| LOB §5            | Fire Combat — Combat Table, Opening Volley, column shifts, depletion | M3       | M6    | Planned |
| LOB §6            | Morale — Morale Table, state transitions, cascade                    | M3       | M6    | Planned |
| LOB §7            | Close Combat — Closing Roll, charge sequence, charge modifiers       | M3       | M6    | Planned |
| LOB §8            | Rally Phase — CBF removal, morale recovery                           | —        | M6    | Planned |
| LOB §9.1          | Artillery — limbering, supply, depletion, artillery leaders          | M3 (ref) | M7    | Planned |
| LOB §9.1a         | Leader Loss Table                                                    | M3       | M6    | Planned |
| LOB §9.1e         | Zero Rule (attack MA roll)                                           | M3       | M6    | Planned |
| LOB §9.3          | Loss Recovery (midnight 25% rule)                                    | —        | M7    | Planned |
| LOB §9.4          | Open Order — movement/combat/ZOC effects                             | M3 (ref) | M5/M6 | Planned |
| LOB §10.6         | Command Roll + Order Acceptance                                      | M3       | M5    | Planned |
| LOB §10.6a        | Order Delivery (turn delay calculator)                               | M3       | M5    | Planned |
| LOB §10.7b        | Fluke Stoppage                                                       | M3       | M5    | Planned |
| LOB §10.7c        | Reserve Requirements                                                 | M3 (ref) | M5    | Planned |
| LOB §10.8c        | Attack Recovery                                                      | M3       | M7    | Planned |
| LOB §11           | Victory Conditions — hex control, terrain VP, wreck VP               | —        | M7    | Planned |
| SM §1.1           | Special Slope Rule (50 ft contour, vertical impassable)              | M3       | M3    | Planned |
| SM Override       | Longstreet initiative, Normal army commander rating                  | —        | M5    | Planned |
| SM Override       | At-start Complex Defense → Move orders                               | —        | M4    | Planned |
| SM Override       | Trees +1 LOS height (not +3)                                         | M3       | M3    | Planned |
| SM §3.6           | Artillery supply trace + Pelham/Pleasonton replenishment             | M3 (ref) | M7    | Planned |
| SM §3.x           | Setup positions, detachment rules                                    | —        | M4    | Planned |
| SM Reinforcements | Fixed-time arrival scheduling                                        | —        | M4    | Planned |
| SM Reinforcements | Variable arrival (Force A/B roll)                                    | —        | M7    | Planned |
| SM Random Events  | Confederate and Union event tables                                   | M3 (ref) | M7    | Planned |
| SM VP             | Terrain hex VP, wreck VP, 7-outcome victory table                    | —        | M7    | Planned |
| SM Errata         | 5 official corrections (Chicago Dragoons, E/2 US, etc.)              | —        | M4    | Planned |

---

### M3 — Rules Engine Foundation + Testing Tools

**Goal:** Implement the complete LOB v2.0 rules engine foundation — all map-based rules
(movement, LOS) and all game tables (combat, morale, command, etc.) — delivered as pure-JS
modules with full test coverage. Two standalone dev tools expose them interactively:
`/tools/map-test` for map-based rules and `/tools/table-test` for all table lookups.

**Rule sections implemented:**

| Section                        | Coverage                                                                                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| §3 Terrain Effects on Movement | Full SM movement chart, formation rules, road movement, slope/stream hexsides                                                                       |
| §4 Line of Sight               | Full LOS algorithm with Slope Table; all terrain height modifiers (woods +3, orchards +1, town +2, crests +1); SM override: trees +1 not +3         |
| §5 Fire Combat                 | Combat Table (5.6), Opening Volley Table (5.4), all column shifts (range, firepower, weapon type, target), Threshold Value Chart                    |
| §6 Morale                      | Morale Table (6.1) with all modifiers; Morale State Effects Chart; Additive Morale Effects Chart (6.2a) — state transitions                         |
| §7 Close Combat                | Closing Roll Table (3.5); Additional Charge Modifiers (7.0g)                                                                                        |
| §9 Leader Loss + Special       | Leader Loss Table (9.1a); Zero Rule (9.1e); weapon and artillery type reference data                                                                |
| §10 Command                    | Command Roll Table (10.6); Order Delivery calculator (10.6a); Fluke Stoppage Table (10.7b); Attack Recovery Table (10.8c); Command Radius reference |
| Reference charts               | Formation Effects Chart; Activity Effects Chart; Morale State Effects Chart                                                                         |

**Deliverables — engine modules:**

Map-based (require loaded `map.json` + `scenario.json`):

- `server/src/engine/hex.js` — neighbor lookup, distance, path finding (Honeycomb.js wrappers)
- `server/src/engine/scenario.js` — load `scenario.json`; expose rule flags to all modules
- `server/src/engine/movement.js` — movement cost calculator (terrain + hexside + elevation);
  lowest-cost path finder (Dijkstra); movement range (all reachable hexes with costs)
- `server/src/engine/los.js` — LOS algorithm with full Slope Table; all height modifiers;
  SM tree height override (+1 not +3)

Table-based (pure functions, no map data required):

- `server/src/engine/tables/combat.js` — Combat Table §5.6, Opening Volley §5.4, all column
  shifts (range, weapon type, firepower shifts), Threshold Value Chart
- `server/src/engine/tables/morale.js` — Morale Table §6.1 with all modifiers; state effects;
  Additive Morale Effects Chart §6.2a (state transitions on new results)
- `server/src/engine/tables/charge.js` — Closing Roll Table §3.5; Additional Charge Modifiers §7.0g
- `server/src/engine/tables/command.js` — Command Roll Table §10.6; Order Delivery §10.6a;
  Fluke Stoppage §10.7b; Attack Recovery §10.8c; Zero Rule §9.1e
- `server/src/engine/tables/leader-loss.js` — Leader Loss Table §9.1a (Other/Capture/Defender/Attacker)
- `server/src/engine/tables/weapons.js` — weapon characteristics reference (small arms and
  artillery types, max ranges, ammo types); Formation Effects Chart; Activity Effects Chart
- Full Vitest coverage for all modules — every table cell verified with known inputs/outputs

**Deliverables — Map Test Tool (`/tools/map-test`):**

Standalone dev tool page with the hex map in read-only mode. Guarded by `MAP_EDITOR_ENABLED=true`.

- **Movement Path Panel** — click start/end hex, select unit type/formation; highlights
  lowest-cost path on map; shows per-hex cost table (terrain + hexside costs + running total);
  impassable paths shown explicitly
- **Movement Range Overlay** — click any hex, select unit type/formation; shades all reachable
  hexes by MP bucket (≤4, 5–6, at limit); vertical-slope hexes shown as unreachable
- **Hex Inspector Panel** — click any hex; shows terrain type, base elevation, hexside types
  per direction, and computed movement cost for every unit type
- **LOS Panel** (migrated from map editor) — click two hexes; shows can-see/blocked result
  plus plain-language explanation of the first blocking element (hex, terrain type, or
  elevation); uses `engine/los.js`

Server API (read-only):

```
GET /api/tools/map-test/movement-path   {startHex, endHex, unitType, formation}
    → { path, costs:[{hex,terrainCost,hexsideCost,total}], totalCost, impassable }

GET /api/tools/map-test/movement-range  {hex, unitType, formation}
    → { reachable:[{hex,cost}] }

GET /api/tools/map-test/los             {fromHex, toHex}
    → { canSee, blockedBy:{hex,reason}|null, trace:[hexId] }
```

**Deliverables — Table Test Tool (`/tools/table-test`):**

Standalone dev tool page — no hex map. Each panel inputs parameters and dice rolls, calls
a server endpoint, and displays the result with a step-by-step modifier breakdown.
Guarded by `MAP_EDITOR_ENABLED=true`. Launch with `npm run dev:map-editor`.

| Panel                   | Inputs                                                                                            | Output                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Combat Table            | effective SPs, column shifts (range/weapon/terrain/etc.), 2d6 roll                                | result cell (−/m/1–4), morale check flag, depletion flag |
| Opening Volley          | range, charge flag, shift-only flag, 1d6 roll                                                     | SP loss (0/1/2)                                          |
| Morale Table            | morale rating A–F, all modifiers (shaken, wrecked, rear, night, etc.), 2d6 roll                   | new state, retreat hexes, SP loss, leader loss check     |
| Morale State Transition | current state, new result                                                                         | resolved new state (Additive Morale chart)               |
| Closing Roll            | morale rating, modifiers (blood lust, rear, shaken, arty w/ canister, breastworks adj.), 1d6 roll | pass/fail                                                |
| Leader Loss             | situation (other/capture/defender/attacker), sharpshooter flag, 2d6 roll                          | no effect/captured/wounded/killed                        |
| Command Roll            | leader command value, reserve/deployment flag, 2d6 roll                                           | yes/no                                                   |
| Order Delivery          | army CO awareness type, distance category                                                         | turns to deliver                                         |
| Fluke Stoppage          | leader command value, has reserve, is night, 2d6 roll                                             | base check result + second roll if needed                |
| Attack Recovery         | division status (no wrecked/wrecked/has dead), leader command value, 2d6 roll                     | no recovery/attack recovery                              |
| Zero Rule               | —                                                                                                 | 1d6 roll → no MA / half MA / full MA                     |

Server API (POST — pure computation, no state):

```
POST /api/tools/table-test/combat          → result, modifierBreakdown
POST /api/tools/table-test/opening-volley  → spLoss
POST /api/tools/table-test/morale          → newState, retreats, losses, leaderLossCheck
POST /api/tools/table-test/morale-transition → resolvedState
POST /api/tools/table-test/closing-roll    → pass, threshold
POST /api/tools/table-test/leader-loss     → result
POST /api/tools/table-test/command-roll    → yes, modifiedRoll
POST /api/tools/table-test/order-delivery  → turnsToDeliver
POST /api/tools/table-test/fluke-stoppage  → basePass, stoppage, rolls
POST /api/tools/table-test/attack-recovery → result, rolls
POST /api/tools/table-test/zero-rule       → ma
```

**Acceptance criteria:**

- Every table cell verifiable: known (input → output) pairs tested for Combat Table, Morale
  Table, and all command tables using Vitest
- Table Test Tool panels reproduce known SM game results (cross-checked against rulebook examples)
- Movement costs match SM movement chart for all unit type + formation + terrain combinations
- LOS results and blocking reasons match manual verification on known SM map hex pairs
- Movement range overlay correctly marks vertical-slope hexes as unreachable

**Notes:**

- The `movementCosts` block in `scenario.json` is authoritative — fixed digitization of the
  SM Rules PDF, not tunable via the scenario editor
- The LOS panel migrates out of the map editor (`LosTestPanel.vue` removed from that tool)
  and is re-implemented in the Map Test Tool using the formal `engine/los.js`
- All combat/morale/command table modules are self-contained with no game-state dependencies —
  M5/M6 simply import and call them; no rework needed

---

### M4 — Auth + Game API + Local Persistence

**Goal:** Discord OAuth login, game creation/join, and a file-based game state store
(swapped for DigitalOcean Spaces in M8).

**Rule sections (loop):** No new engine tables. Scenario data wired into game state initialization.

| Section           | What gets wired                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| SM Override       | At-start Complex Defense → Move order substitution applied on game init                         |
| SM §3.x           | Unit setup positions read from `scenario.json setup`; units placed on board                     |
| SM Errata         | 5 corrections applied to initial unit state (Chicago Dragoons designation, E/2 US rating, etc.) |
| SM Reinforcements | Fixed-time arrival schedule loaded; units queued for entry on correct turn                      |

**Deliverables:**

- Discord OAuth2 + JWT cookie auth (`passport-discord`)
- SQLite schema: `users` and `games` tables (`better-sqlite3`)
- Game API routes: `POST /games`, `GET /games`, `GET /games/:id`, `POST /games/:id/join`
- Game state initializer — place units from `scenario.json` `setup`, schedule `reinforcements`
- Local file persistence (`data/games/{id}/state.json`) as a dev-time stand-in for Spaces
- Basic game lobby UI (Vue): list open games, create game, join game

**Acceptance criteria:**

- Two Discord accounts can log in and create/join a game
- `GET /games/:id` returns the correct initial unit positions from scenario setup data
- Game state persists across server restarts (local file)

---

### M5 — Turn Structure + Orders + Game Map UI

**Goal:** Turn phase state machine, order acceptance/initiative system, and the
basic frontend game view with units rendered on the hex map.

**Rule sections (loop):** M3 command/movement tables wired into the live game dispatch.

| Section     | What gets wired                                                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| LOB §2      | Full Sequence of Play — Command Phase (orders, fluke stoppage), Activity Phase (movement + combat gate), Rally Phase; first/second player alternation |
| LOB §3      | Movement enforcement — ZOC entry/exit costs, stacking limits, unit facing; road movement eligibility                                                  |
| LOB §9.4    | Open Order movement rules — free EZOC entry/exit, no Opening Volley on withdrawal                                                                     |
| LOB §10.6   | Command Roll gating order acceptance; order delivery turn delay                                                                                       |
| LOB §10.6a  | Order Delivery — turns-to-deliver calculator applied each Command Phase                                                                               |
| LOB §10.7b  | Fluke Stoppage — checked each Command Phase for divisions on Attack orders                                                                            |
| SM Override | Longstreet initiative rule — CSA never rolls initiative when Longstreet commands                                                                      |
| SM Override | RSS initiative system used (not standard LoB)                                                                                                         |

**Deliverables:**

- `server/src/engine/orders.js` — order types, acceptance check, initiative roll (RSS/LoB systems)
- `server/src/engine/index.js` — `dispatch(state, action)` router + turn phase state machine
- `POST /games/:id/actions` API endpoint
- Vue game view: SVG hex map with units rendered as counter images, click to select unit,
  selected unit panel showing unit stats
- Pinia game store: load state, submit action, apply server state

**Acceptance criteria:**

- Initiative roll correctly uses RSS system (per `scenario.json initiativeSystem`)
- Order acceptance table correctly gates unit activation
- Units appear on the map at their start positions; clicking selects them

---

### M6 — Combat + Morale

**Goal:** Fire combat, close combat, and morale cascade.

**Rule sections (loop):** M3 combat/morale tables wired into the live game dispatch.

| Section   | What gets wired                                                                                                                                                  |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LOB §5    | Fire combat — LOS + range validation, effective SP calculation (DG ×½), column shift resolution, Opening Volley on advance, depletion trigger, low/no ammo state |
| LOB §6    | Morale — check triggered by combat results; state transition via Additive Morale chart; cascade up brigade → division hierarchy; rout/wrecked determination      |
| LOB §7    | Close combat / charge — Closing Roll, Opening Volley, 1 SP defender loss, Additional Charge Modifiers, retreat-into-EZOC losses                                  |
| LOB §8    | Rally Phase — CBF marker removal; morale state improvement for rallied units                                                                                     |
| LOB §9.1a | Leader Loss — checked after any m+ combat result or close combat                                                                                                 |
| LOB §9.1e | Zero Rule — MA roll for brigades on Attack orders each activation                                                                                                |
| LOB §9.4  | Open Order in combat — Open Order Capable column on combat table; automatic Closing Roll success; no Opening Volley on withdrawal                                |

**Deliverables:**

- `server/src/engine/combat/fire.js` — fire combat table, range/LOS check, terrain modifiers,
  flank fire, ammo state (low ammo / no ammo)
- `server/src/engine/combat/melee.js` — close combat resolution
- `server/src/engine/morale.js` — morale check, straggler results, cascade up brigade →
  division hierarchy, rout/wrecked states
- Frontend: click enemy unit to fire (range/LOS validation highlighted on map), adjacent
  unit for melee, combat result panel, morale state display on counter

**Acceptance criteria:**

- Fire combat modifiers (terrain, range, flank, leader, ammo) match LOB v2.0 tables
- Morale cascade correctly propagates through brigade → division → corps hierarchy
- All SM-specific combat overrides enforced (e.g. SM movement chart, slope impassability)

---

### M7 — Special Rules + Victory Conditions

**Goal:** Artillery, VP tracking, random events, variable reinforcements, and victory
condition evaluation. A full South Mountain game can now be played to completion.

**Rule sections (loop):** Remaining SM-specific rules and all end-of-turn accounting wired in.

| Section           | What gets wired                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| LOB §9.1          | Artillery — limbering/unlimbering (5-hex / 4-hex with arty leader), canister vs shell selection, battery depletion, artillery leader posting and second/third shot rules |
| LOB §9.3          | Loss Recovery — 1 SP or 25% recovery per regiment/battery during midnight Rally Phase                                                                                    |
| LOB §10.8c        | Attack Recovery — divisional check at start of each Command Phase                                                                                                        |
| LOB §11           | Victory Conditions — end-of-turn VP tally, 7-outcome result lookup                                                                                                       |
| SM §3.6           | Artillery supply trace to Wing Wagon or west-edge road hex; Pelham + Pleasonton replenish from any friendly ammo reserve                                                 |
| SM §4+            | Random event resolution — 2d6 roll + table lookup for both sides each Command Phase                                                                                      |
| SM Reinforcements | Variable arrival — Force A/B 1d6 roll with lookup table; units enter on resolved turn                                                                                    |
| SM VP             | Terrain hex control VP, per-formation wreck VP (brigade, artillery, named formations)                                                                                    |

**Deliverables:**

- `server/src/engine/artillery.js` — limbering/unlimbering, canister vs shell selection,
  supply trace, artillery replenishment (SM §3.6: Pelham replenishes from any friendly reserve)
- `server/src/engine/vp.js` — hex control tracking, terrain VP, wreck VP per-formation,
  end-of-turn victory condition check against `scenario.json victoryConditions`
- Random event table resolution — roll + lookup for both confederate and union tables
- Variable reinforcement arrival — Force A/B dice roll with lookup table
- Frontend: VP tracker panel, reinforcement arrival notification toast, game-complete screen
  showing result label and final VP totals

**Acceptance criteria:**

- Artillery special rules enforced (SM §3.6 supply, Pelham/Pleasonton replenishment, wagon supply)
- VP totals match manual calculation after each turn
- Game correctly identifies all 7 victory outcome labels
- A full 45-turn South Mountain game can be played to completion with all rules enforced

---

### M8 — Production Persistence + Multiplayer

**Rule sections:** None — all LOB v2.0 and SM rules are complete after M7. This milestone
is infrastructure only: persistence, real-time communication, and notifications.

**Goal:** Swap local file persistence for DigitalOcean Spaces, add Socket.io real-time
updates, and Discord webhook async notifications. Production-ready MVP.

**Deliverables:**

- `server/src/store/spaces.js` — DO Spaces client (S3-compatible); `saveGameState`,
  `loadGameState`, `appendHistory`
- `server/src/store/sqlite.js` — `better-sqlite3` user + game index; all store queries
- `server/src/store/index.js` — unified store API (drop-in replacement for local file store)
- `server/src/notifications/discord.js` — `notifyWebhook(url, payload)` via plain fetch
- Socket.io server: room-per-game, `game:state-updated` emit after each action
- Vue: Socket.io client, real-time Pinia store update on `game:state-updated`
- Discord webhook URL stored in SQLite `games` table, configurable at game creation

**Acceptance criteria:**

- Game state survives server restart (loaded from Spaces on each request)
- Both players receive real-time map/state updates when both are online simultaneously
- Discord webhook fires on each action when configured; PBEM flow works without both players online
- History log grows correctly (`000001.json`, `000002.json`, …) in Spaces

---

## 3. Backend Architecture

### Route Hierarchy

```
/auth
  GET  /auth/discord              → redirect to Discord OAuth
  GET  /auth/discord/callback     → OAuth callback, issue JWT cookie
  POST /auth/logout               → clear JWT cookie
  GET  /auth/me                   → return current user from JWT

/api/v1
  /games
    POST   /                      → create game
    GET    /                      → list current user's games
    GET    /:id                   → get game state
    POST   /:id/join              → second player joins
    POST   /:id/actions           → submit action
    GET    /:id/history           → action log

  /map
    GET    /south-mountain        → hex grid data (coordinates, terrain, elevation)

/tools/map-editor                 (mounted only when MAP_EDITOR_ENABLED=true)
  GET  /api/tools/map-editor/data          → read map.json
  PUT  /api/tools/map-editor/data          → write map.json (Zod-validated)
  GET  /tools/map-editor/assets/*          → static serve docs/ (map image, PDFs)

/tools/scenario-editor            (mounted only when MAP_EDITOR_ENABLED=true)
  GET  /api/tools/scenario-editor/data     → read scenario.json
  PUT  /api/tools/scenario-editor/data     → write scenario.json (Zod-validated)

/tools/oob-editor                 (mounted only when MAP_EDITOR_ENABLED=true)
  GET  /api/oob/data               → read oob.json
  PUT  /api/oob/data               → write oob.json (Zod-validated)
  GET  /api/leaders/data           → read leaders.json
  PUT  /api/leaders/data           → write leaders.json (Zod-validated)
  GET  /api/counters/list          → list counter image filenames
  POST /api/counters/upload        → save counter image to client/public/counters/

/tools/map-test                   (mounted only when MAP_EDITOR_ENABLED=true) — M3
  GET  /api/tools/map-test/movement-path   → { path, costs, totalCost, impassable }
  GET  /api/tools/map-test/movement-range  → { reachable: [{ hex, cost }] }
  GET  /api/tools/map-test/los             → { canSee, blockedBy, trace }

/tools/table-test                 (mounted only when MAP_EDITOR_ENABLED=true) — M3
  POST /api/tools/table-test/combat          → { result, modifierBreakdown }
  POST /api/tools/table-test/opening-volley  → { spLoss }
  POST /api/tools/table-test/morale          → { newState, retreats, losses, leaderLossCheck }
  POST /api/tools/table-test/morale-transition → { resolvedState }
  POST /api/tools/table-test/closing-roll    → { pass, threshold }
  POST /api/tools/table-test/leader-loss     → { result }
  POST /api/tools/table-test/command-roll    → { yes, modifiedRoll }
  POST /api/tools/table-test/order-delivery  → { turnsToDeliver }
  POST /api/tools/table-test/fluke-stoppage  → { basePass, stoppage, rolls }
  POST /api/tools/table-test/attack-recovery → { result, rolls }
  POST /api/tools/table-test/zero-rule       → { ma }
```

> **Tool toggle pattern:** The map editor routes are guarded by a `MAP_EDITOR_ENABLED` environment variable. In `server.js`, if the flag is set, the router is imported with a dynamic `await import(...)` and mounted. This keeps the map editor completely absent from production bundles. The Vue route `/tools/map-editor` is always present in the client router but the API backing it requires the env flag.

### Middleware Chain

Applied globally in `app.js`:

```js
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cookieParser());
app.use(express.json());
```

Applied to protected routes:

```
authenticateJWT   → verifies JWT from httpOnly cookie; attaches req.user
loadGame          → loads game state from Spaces + SQLite; attaches req.game
validateAction    → Zod schema check for POST /games/:id/actions body
```

### Module Boundaries

```
server/src/
│
├── app.js              Entry point — wires Express + Socket.io
│
├── routes/             HTTP handlers only. Thin layer: validate input,
│   ├── auth.js         call store/engine, return response.
│   ├── games.js        No game logic here.
│   └── map.js
│
├── engine/             Pure JS rules engine. No HTTP, no I/O, no side effects.
│   │                   Input: (gameState, action, scenarioRules)
│   │                   Output: { newState, result, events }
│   ├── index.js        dispatch(gameState, action) → result
│   ├── movement.js
│   ├── los.js
│   ├── combat/
│   │   ├── fire.js
│   │   └── melee.js
│   ├── morale.js
│   ├── orders.js
│   ├── artillery.js
│   ├── vp.js
│   └── scenario.js     Loads scenario JSON; exposes rule flags to engine modules
│
├── store/              Persistence layer. Cleanly separated; either module
│   ├── spaces.js       can be swapped without touching the other.
│   ├── sqlite.js
│   └── index.js        re-exports { saveGameState, loadGameState,
│                         appendHistory, getUser, upsertUser, ... }
│
├── auth/
│   ├── discord.js      passport-discord strategy + callback handler
│   ├── jwt.js          sign/verify helpers
│   └── middleware.js   authenticateJWT express middleware
│
├── notifications/
│   └── discord.js      notifyWebhook(url, message) — plain fetch POST
│
└── middleware/
    ├── loadGame.js     loads game; 404 if not found; 403 if not a player
    └── validate.js     Zod wrapper factory
```

### In-Memory Game Session Model

Games are **not** cached in memory between requests. Each request loads state from Spaces on demand. This keeps the server stateless and restartable without data loss.

For real-time sessions, Socket.io maintains room membership in memory (just socket IDs, not game state). The game state always comes from Spaces.

```js
// What a loaded game looks like on req.game after loadGame middleware
req.game = {
  // From SQLite
  id: 'a1b2c3d4',
  scenario: 'south-mountain',
  status: 'in_progress',
  unionPlayerId: 'user-uuid-1',
  confederatePlayerId: 'user-uuid-2',
  activePlayerId: 'user-uuid-1',
  turnNumber: 4,
  discordWebhookUrl: 'https://discord.com/api/webhooks/...',

  // From Spaces (state.json)
  state: {
    turn: 4,
    phase: 'activation',
    oob: {
      /* full unit tree */
    },
    leaders: {
      /* leader states */
    },
    hexControl: {
      /* hex → side */
    },
    artilleryAmmo: {
      /* unit id → shots remaining */
    },
    vpTotals: { union: 3, confederate: 1 },
    activeOrders: {
      /* order group activations remaining */
    },
    log: [
      /* action results this turn */
    ],
  },
};
```

---

## 4. Data Persistence Strategy

### Two-Layer Design

| Concern                           | Layer          | Technology                |
| --------------------------------- | -------------- | ------------------------- |
| Game state (large, append-heavy)  | Object storage | DigitalOcean Spaces       |
| User records, game index, queries | Relational     | SQLite (`better-sqlite3`) |

The two layers are isolated behind `store/spaces.js` and `store/sqlite.js`. Routes and the engine never call the storage clients directly.

### DigitalOcean Spaces — Key Layout

```
lob-online-games/                         ← Spaces bucket
  games/
    {gameId}/
      state.json                          ← current game state snapshot
      history/
        000001.json                       ← first action
        000002.json
        000003.json                       ← ... zero-padded sequence
```

**`state.json`** — complete game state after the most recent action. Overwritten on each action. This is what GET /games/:id returns.

**`history/{seq}.json`** — one file per action, never overwritten. Sequence number is zero-padded to 6 digits for lexicographic ordering.

#### DO Spaces Client Configuration

```js
// store/spaces.js
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const client = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT, // e.g. https://nyc3.digitaloceanspaces.com
  region: process.env.DO_SPACES_REGION, // e.g. nyc3
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  },
});

const BUCKET = process.env.DO_SPACES_BUCKET; // e.g. lob-online-games

export async function saveGameState(gameId, state) {
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: `games/${gameId}/state.json`,
      Body: JSON.stringify(state),
      ContentType: 'application/json',
    })
  );
}

export async function loadGameState(gameId) {
  const response = await client.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: `games/${gameId}/state.json`,
    })
  );
  return JSON.parse(await response.Body.transformToString());
}

export async function appendHistory(gameId, seq, record) {
  const key = `games/${gameId}/history/${String(seq).padStart(6, '0')}.json`;
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: JSON.stringify(record),
      ContentType: 'application/json',
    })
  );
}
```

### SQLite Schema

```sql
CREATE TABLE users (
  id          TEXT PRIMARY KEY,         -- UUID v4
  discord_id  TEXT UNIQUE NOT NULL,
  username    TEXT NOT NULL,
  avatar_url  TEXT,
  created_at  INTEGER NOT NULL          -- Unix timestamp
);

CREATE TABLE games (
  id                    TEXT PRIMARY KEY,   -- UUID v4
  scenario              TEXT NOT NULL DEFAULT 'south-mountain',
  status                TEXT NOT NULL DEFAULT 'setup',
    -- setup | in_progress | suspended | complete
  union_player_id       TEXT REFERENCES users(id),
  confederate_player_id TEXT REFERENCES users(id),
  active_player_id      TEXT REFERENCES users(id),
  turn_number           INTEGER NOT NULL DEFAULT 1,
  action_seq            INTEGER NOT NULL DEFAULT 0,
  discord_webhook_url   TEXT,             -- nullable; optional per game
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL
);

CREATE INDEX idx_games_union_player    ON games(union_player_id);
CREATE INDEX idx_games_confederate     ON games(confederate_player_id);
CREATE INDEX idx_games_status          ON games(status);
```

### Concurrent Write Safety

Turn-based design makes concurrent writes structurally impossible. Before processing any action, the server checks `active_player_id` in SQLite. Only the active player's request proceeds. Because turns alternate and a player cannot submit two actions simultaneously (the first changes `active_player_id`), Spaces write conflicts cannot occur. No optimistic locking needed — turn enforcement is the serialisation mechanism.

---

## 5. Multiplayer Coordination Model

### Recommendation: Socket.io

**Decision: Socket.io** over SSE or polling.

Although the client submits actions via REST (not socket events), the server needs to push state updates to the opponent after each action. Socket.io is preferred over SSE for this project because:

1. **Room management** — `io.to(gameId).emit(...)` broadcasts to both players with one call; tracking which sockets belong to which game is automatic
2. **Presence detection** — the server can know whether the opponent is currently connected, enabling the UI to show "opponent online" vs "async mode"
3. **Automatic reconnection** — if a player's connection drops mid-session, Socket.io reconnects transparently without state loss
4. **Works alongside Express** — `socket.io` attaches to the same HTTP server; no separate process

SSE would work but requires manual room tracking and doesn't provide presence detection. Polling is ruled out — unacceptable latency for real-time play.

### Async Mode (PBEM) Flow

```
1. Player A — POST /api/v1/games/:id/actions
   Body: { type: 'MOVE', unitId: '3VA-1', path: ['1204','1205','1206'] }

2. Server:
   a. authenticateJWT → confirm Player A is logged in
   b. loadGame middleware → load state from Spaces + game record from SQLite
   c. Zod validation → confirm body matches MoveAction schema
   d. Check req.game.activePlayerId === req.user.id → it is Player A's turn
   e. engine.dispatch(state, action, scenarioRules) → { newState, result }
   f. store.saveGameState(gameId, newState)
   g. store.appendHistory(gameId, seq + 1, { action, result, timestamp })
   h. sqlite.updateGame(gameId, { activePlayerId: playerBId, actionSeq: seq+1 })
   i. If discordWebhookUrl set → notifications.discord.notify(url, message)
   j. If Player B has an active socket → io.to(gameId).emit('game:state-updated', ...)

3. Response to Player A:
   200 { result: { ... }, state: { ... } }

4. Player B (hours later):
   GET /api/v1/games/:id → 200 { state, meta }
   Player B sees updated state and submits their action
```

#### Discord Webhook Payload

```js
// notifications/discord.js
export async function notifyWebhook(url, { gameId, playerName, turnNumber, phase }) {
  if (!url) return;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: `⚔️ **${playerName}** has taken their action — it's your turn!`,
      embeds: [
        {
          title: 'South Mountain',
          description: `Turn ${turnNumber} · ${phase} phase`,
          url: `${process.env.APP_URL}/games/${gameId}`,
          color: 0x5865f2,
        },
      ],
    }),
  });
}
```

The `discord_webhook_url` is stored in the SQLite `games` table, set optionally during game creation.

### Real-Time Mode (Socket.io)

#### Server-Side Room Management

```js
// app.js (Socket.io setup)
io.use(authenticateSocketJWT); // verify JWT cookie on socket handshake

io.on('connection', (socket) => {
  const userId = socket.user.id;

  socket.on('game:join', (gameId) => {
    // verify user is a player in this game (SQLite lookup)
    socket.join(gameId);
    io.to(gameId).emit('game:player-online', { userId });
  });

  socket.on('game:leave', (gameId) => {
    socket.leave(gameId);
    io.to(gameId).emit('game:player-offline', { userId });
  });

  socket.on('disconnect', () => {
    // Socket.io handles room cleanup automatically
  });
});
```

#### Emitting After an Action (in games route)

```js
// routes/games.js — after successful action processing
res.json({ result, state: newState });

// Notify both players in the room
req.io.to(gameId).emit('game:state-updated', {
  state: newState,
  lastAction: { type: action.type, actorId: req.user.id, result },
});
```

#### Client-Side (Vue / Pinia)

```js
// stores/game.js
socket.on('game:state-updated', ({ state, lastAction }) => {
  gameStore.applyServerState(state);
  gameStore.addToLog(lastAction);
});
```

#### Event Catalogue

| Event                 | Direction       | Payload                 |
| --------------------- | --------------- | ----------------------- |
| `game:join`           | client → server | `{ gameId }`            |
| `game:leave`          | client → server | `{ gameId }`            |
| `game:state-updated`  | server → client | `{ state, lastAction }` |
| `game:player-online`  | server → client | `{ userId }`            |
| `game:player-offline` | server → client | `{ userId }`            |
| `game:complete`       | server → client | `{ state, winner }`     |

---

## 6. Game State Lifecycle

### State Machine

```
         POST /games
              │
              ▼
           ┌──────┐
           │ setup │  ← waiting for second player to join
           └──┬───┘
              │ POST /games/:id/join (second player)
              │ scenario initialised (units placed, orders set)
              ▼
        ┌───────────┐
        │ in_progress│◄─────────────────────┐
        └──────┬─────┘                      │
               │                            │ (turn advances,
    ┌──────────┼──────────────┐             │  not a new state)
    │          │              │             │
    │   POST /games/:id/      │             │
    │     actions             │             │
    │  (each action stays     │             │
    │   in_progress)          │             │
    │                         │             │
    ▼                         ▼             │
┌──────────┐           ┌───────────┐        │
│ suspended│           │ complete  │        │
│          │           │           │        │
│ mutual   │           │ VP thresh │        │
│ agreement│           │ or turn   │        │
│ or AFK   │           │ limit     │        │
└────┬─────┘           └───────────┘        │
     │                                      │
     └──────────────────────────────────────┘
       POST /games/:id/resume
```

### State Definitions

| State         | Data initialised                                                                                                             | Valid transitions           | Trigger                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------- |
| `setup`       | Game record created; Union player assigned; awaiting Confederate player                                                      | → `in_progress`             | Confederate player POSTs `/join`                         |
| `in_progress` | Scenario loaded: units at start positions, orders set per SM_SCENARIO_DATA (Complex defense → Move), all SM overrides active | → `suspended`, → `complete` | Each action POST; end-of-turn VP check                   |
| `suspended`   | Timestamp of suspension recorded                                                                                             | → `in_progress`             | Either player POSTs `/resume`                            |
| `complete`    | Final VP totals, winner recorded                                                                                             | terminal                    | End-of-turn VP check meets threshold, or player forfeits |

### LoB Turn Sequence Within `in_progress`

```
Turn N begins
  │
  ├─ 1. INITIATIVE PHASE
  │    │  Roll for initiative (unless Longstreet commanding — CSA always moves first per SM override)
  │    └─ Determines activation order for this turn
  │
  ├─ 2. ACTIVATION SEQUENCE  (repeats until all order groups activated)
  │    │
  │    ├─ Active player selects an order group to activate
  │    │
  │    ├─ MOVEMENT STEP
  │    │    Units in group may move per their order type
  │    │    SM movement chart + RSS Trail costs + slope rules applied
  │    │
  │    └─ COMBAT STEP
  │         Fire combat (range, LOS, terrain modifiers, fire table)
  │         Close combat (if adjacent)
  │         Morale checks triggered by losses
  │
  ├─ 3. MORALE PHASE
  │    Cascade morale checks up the hierarchy for routed units
  │
  ├─ 4. ADMINISTRATIVE PHASE
  │    Artillery replenishment (Pelham/Pleasonton: any friendly reserve)
  │    Reinforcement arrival (per SM schedule)
  │    VP hex control updated
  │
  └─ 5. END OF TURN
       Turn counter advances
       VP totals checked against victory conditions
       If turn limit reached → game:complete
```

Each step maps to one or more action types accepted by `POST /games/:id/actions`.

---

## 7. Rules Engine Design

### Principles

- **Pure functions only.** The engine has zero I/O dependencies. It takes `(gameState, action, scenarioRules)` and returns `{ newState, result, events }`. Persistence, HTTP, and Socket.io are the caller's responsibility.
- **Immutable state.** The engine never mutates `gameState` in place. It uses structured clone + spread to produce `newState`. This enables history replay by re-running actions against snapshots.
- **Scenario-driven overrides.** All SM-specific rule variations are read from `scenario.rules` (loaded from `data/scenarios/south-mountain/scenario.json`), not hardcoded in engine modules.

### Module Map

```
engine/
├── index.js          dispatch(state, action) → { newState, result, events }
├── scenario.js       loadScenario(name) → { units, leaders, hexMap, rules }
├── hex.js            wrappers around Honeycomb.js (offset↔cube conversion,
│                     neighbour lookup, distance, range ring)
├── los.js            lineOfSight(from, to, hexMap, scenarioRules) → boolean
│                     uses scenarioRules.treeLosHeight (1 for SM, not 3)
├── movement.js       validateMove(unit, path, state, scenarioRules) → ok | RulesError
│                     applies SM movement chart + RSS trail costs + slope rule
├── combat/
│   ├── fire.js       resolveFire(attacker, target, state, scenarioRules) → CombatResult
│   └── melee.js      resolveMelee(attacker, target, state, scenarioRules) → CombatResult
├── morale.js         checkMorale(unit, trigger, state) → MoraleResult
│                     cascade(unit, state) → propagates rout up hierarchy
├── orders.js         validateActivation(orderGroup, state) → ok | RulesError
│                     applyOrder(unit, newOrder, state) → newState
├── artillery.js      checkAmmo(unit, state) → boolean
│                     replenish(unit, state, scenarioRules) → newState
│                     SM override: Pelham/Pleasonton replenish from any friendly reserve
└── vp.js             updateControl(state, action) → newState
                      checkVictory(state, scenarioRules) → null | winner
```

### Action Processing Pipeline

```
POST /games/:id/actions
  │
  ├─ 1. authenticateJWT middleware
  │     Verify JWT cookie → req.user
  │
  ├─ 2. loadGame middleware
  │     SQLite: load game record (status, activePlayerId, actionSeq)
  │     Spaces: load state.json
  │     Attach to req.game
  │
  ├─ 3. Zod validation (middleware/validate.js)
  │     Check request body matches action schema for action.type
  │     400 on failure — returned before engine is touched
  │
  ├─ 4. Authorization check (in route handler)
  │     req.game.activePlayerId === req.user.id
  │     403 if not this player's turn
  │
  ├─ 5. engine.dispatch(req.game.state, action, scenarioRules)
  │     Returns { newState, result, events } or throws RulesError
  │     422 on RulesError — invalid move per the rules
  │
  ├─ 6. Persist
  │     store.saveGameState(gameId, newState)
  │     store.appendHistory(gameId, newSeq, { action, result, timestamp })
  │     sqlite.updateGame(gameId, { activePlayerId, actionSeq, updatedAt })
  │
  ├─ 7. Notify
  │     io.to(gameId).emit('game:state-updated', { state: newState, lastAction })
  │     notifications.discord.notifyWebhook(url, { ... })  (if configured)
  │
  └─ 8. Respond
        200 { result, state: newState }
```

### Error Model

```js
// engine/errors.js
export class RulesError extends Error {
  constructor(code, message, context = {}) {
    super(message);
    this.name = 'RulesError';
    this.code = code;
    this.context = context;
  }
}

// Example codes
// MOVE_INSUFFICIENT_MP      — not enough movement points
// MOVE_TERRAIN_IMPASSABLE   — vertical slope (SM rule 1.1)
// MOVE_ENTERS_ZOC           — illegal ZOC entry
// FIRE_OUT_OF_RANGE         — target hex beyond fire range
// FIRE_NO_LOS               — line of sight blocked
// FIRE_NO_AMMO              — artillery out of ammunition
// ACTIVATION_WRONG_PLAYER   — not this player's turn
// ACTIVATION_ORDER_INVALID  — unit's order type forbids this action
// MELEE_NOT_ADJACENT        — target not in adjacent hex
```

HTTP mapping: `RulesError` → `422 Unprocessable Entity` with body `{ error: { code, message, context } }`.

### Scenario Override Integration

`data/scenarios/south-mountain/scenario.json` contains a `rules` block:

```json
{
  "id": "south-mountain",
  "name": "South Mountain",
  "rules": {
    "treeLosHeight": 1,
    "armyCommanderRating": "Normal",
    "breastworksAllowed": false,
    "longstreetIsArmyCommander": true,
    "initialOrderOverride": { "complexDefense": "move" },
    "artilleryReplenishFromAnyReserve": ["Pelham", "Pleasonton"],
    "ignoreLobRules": ["4.2", "4.3"],
    "movementChart": "south-mountain",
    "trailMovementCosts": "rss",
    "slopeContourInterval": 50,
    "verticalSlopesImpassable": true
  }
}
```

Engine modules read from `scenarioRules` rather than hardcoding values:

```js
// engine/los.js
function treeHeight(scenarioRules) {
  return scenarioRules.treeLosHeight ?? 3; // default LoB: 3; SM: 1
}
```

---

## 8. API Contract

### Conventions

- Base path: `/api/v1`
- Auth: JWT in `httpOnly` cookie named `lob_session`
- All request bodies: `Content-Type: application/json`
- All responses: `Content-Type: application/json`
- Versioning: URL path (`/api/v1`). Breaking changes bump to `/api/v2`.

---

### Auth Endpoints

#### `GET /auth/discord`

Redirects browser to Discord authorization page. No request body.

#### `GET /auth/discord/callback`

Discord redirects here after user approves. Server exchanges code for Discord user profile, upserts user in SQLite, issues JWT cookie.

**Response (redirect to frontend):**

```
302 Found
Set-Cookie: lob_session=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/
Location: /
```

#### `POST /auth/logout`

Clears the JWT cookie.

**Response:**

```json
{ "ok": true }
```

```
Set-Cookie: lob_session=; Max-Age=0; HttpOnly; ...
```

#### `GET /auth/me`

Returns the authenticated user's profile.

**Response:**

```json
{
  "id": "usr_a1b2c3",
  "discordId": "123456789012345678",
  "username": "Generalissimo#1234",
  "avatarUrl": "https://cdn.discordapp.com/avatars/..."
}
```

---

### Game Endpoints

#### `POST /api/v1/games`

Create a new game. Creator is assigned Union by default (configurable).

**Request:**

```json
{
  "scenario": "south-mountain",
  "side": "union",
  "discordWebhookUrl": "https://discord.com/api/webhooks/..."
}
```

**Response `201`:**

```json
{
  "id": "gam_x9y8z7",
  "scenario": "south-mountain",
  "status": "setup",
  "unionPlayerId": "usr_a1b2c3",
  "confederatePlayerId": null,
  "joinUrl": "https://lob-online.example.com/games/gam_x9y8z7/join",
  "createdAt": "2026-02-19T10:00:00Z"
}
```

---

#### `POST /api/v1/games/:id/join`

Second player joins. Triggers scenario initialisation.

**Request:** (no body required — identity from JWT cookie)

**Response `200`:**

```json
{
  "id": "gam_x9y8z7",
  "status": "in_progress",
  "side": "confederate",
  "state": { "...initial game state..." }
}
```

---

#### `GET /api/v1/games/:id`

Get current game state. Available to both players.

**Response `200`:**

```json
{
  "id": "gam_x9y8z7",
  "scenario": "south-mountain",
  "status": "in_progress",
  "turnNumber": 4,
  "activePlayerId": "usr_a1b2c3",
  "myTurn": true,
  "state": {
    "turn": 4,
    "phase": "activation",
    "oob": {
      "union": {
        "IX Corps": {
          "1st Division": {
            "Garland Brigade": {
              "5th NC": {
                "id": "5NC",
                "strength": 340,
                "moraleClass": "B",
                "moraleState": "good",
                "hex": "1204",
                "order": "attack",
                "mp": 4
              }
            }
          }
        }
      },
      "confederate": { "...": "..." }
    },
    "leaders": {
      "Hill": { "hex": "1204", "rating": "Normal", "attached": "Garland Brigade" }
    },
    "hexControl": {
      "1204": "confederate",
      "1205": "union"
    },
    "artilleryAmmo": {
      "Pelham-btry": 6
    },
    "vpTotals": { "union": 3, "confederate": 1 },
    "log": []
  }
}
```

---

#### `POST /api/v1/games/:id/actions`

Submit a player action. All action types share this endpoint; the `type` field routes to the correct engine module.

**Request — Move action:**

```json
{
  "type": "MOVE",
  "unitId": "5NC",
  "path": ["1204", "1205", "1206"]
}
```

**Request — Fire action:**

```json
{
  "type": "FIRE",
  "unitId": "Pelham-btry",
  "targetHex": "1207",
  "targetUnitId": "2OH"
}
```

**Request — End activation:**

```json
{
  "type": "END_ACTIVATION",
  "orderGroupId": "Garland Brigade"
}
```

**Response `200` — Move:**

```json
{
  "result": {
    "type": "MOVE",
    "unitId": "5NC",
    "from": "1204",
    "to": "1206",
    "mpUsed": 3,
    "mpRemaining": 1
  },
  "state": { "...updated game state..." }
}
```

**Response `422` — Rules violation:**

```json
{
  "error": {
    "code": "MOVE_TERRAIN_IMPASSABLE",
    "message": "Hex 1205→1206 crosses a vertical slope (SM rule 1.1)",
    "context": {
      "unitId": "5NC",
      "fromHex": "1205",
      "toHex": "1206",
      "slopeGrade": "vertical"
    }
  }
}
```

---

#### `GET /api/v1/games/:id/history`

Full action log, oldest first.

**Response `200`:**

```json
{
  "gameId": "gam_x9y8z7",
  "actions": [
    {
      "seq": 1,
      "timestamp": "2026-02-19T10:05:00Z",
      "playerId": "usr_a1b2c3",
      "action": { "type": "MOVE", "unitId": "5NC", "path": ["1204", "1205"] },
      "result": { "mpUsed": 2, "mpRemaining": 2 }
    }
  ]
}
```

---

### Map Endpoint

#### `GET /api/v1/map/south-mountain`

Returns the hex grid data needed by the client to render the SVG map. Served from the static `data/scenarios/south-mountain/map.json` file; does not require authentication.

**Response `200`:**

```json
{
  "scenario": "south-mountain",
  "layout": "pointy-top",
  "hexes": [
    {
      "id": "1204",
      "q": 12,
      "r": 4,
      "terrain": "woods",
      "elevation": 2,
      "road": false,
      "trail": true,
      "vpHex": false
    },
    {
      "id": "1205",
      "q": 12,
      "r": 5,
      "terrain": "clear",
      "elevation": 1,
      "road": true,
      "trail": false,
      "vpHex": true
    }
  ]
}
```

---

### Developer Tools Endpoints

These endpoints are **only mounted when `MAP_EDITOR_ENABLED=true`**. They are never present in production.

#### `GET /api/tools/map-editor/data`

Returns the current contents of `data/scenarios/south-mountain/map.json`.

**Response `200`:** the full map JSON object (same shape as `map.json`).

No authentication required.

---

#### `PUT /api/tools/map-editor/data`

Overwrites `map.json` with the request body after Zod validation against `MapSchema`.

**Request:** full map JSON object.

**Response `200`:**

```json
{ "ok": true }
```

**Response `400` (validation failure):**

```json
{ "ok": false, "issues": [{ "path": ["hexes", 0, "terrain"], "message": "Invalid enum value" }] }
```

---

### Standard Error Envelope

All error responses use this shape:

```json
{
  "error": {
    "code": "GAME_NOT_FOUND",
    "message": "No game with id gam_x9y8z7",
    "context": {}
  }
}
```

| HTTP Status | When                                                                             |
| ----------- | -------------------------------------------------------------------------------- |
| 400         | Malformed request / Zod validation failure                                       |
| 401         | Missing or expired JWT                                                           |
| 403         | Authenticated but not authorised (e.g. not a player in this game, not your turn) |
| 404         | Resource not found                                                               |
| 422         | Valid request, rejected by rules engine                                          |
| 500         | Unexpected server error                                                          |

---

## 9. Project Directory Structure

Tests are **co-located** (`*.test.js` alongside the module). Reason: when a module changes, its test file is in the same directory — no hunting across a `tests/` tree.

The tree below reflects the **actual current layout** of the repository.

```
lob-online/
│
├── package.json              ← root workspace manifest (workspaces: ["server", "client"])
├── eslint.config.js          ← flat config; scoped rules for server/ vs client/
├── .prettierrc               ← root Prettier config
├── vitest.workspace.js       ← workspace: server (node) + client (jsdom + Vue plugin)
├── vitest.config.js          ← coverage provider v8, 70% lines threshold
├── .env.example              ← documents all required env vars
├── .gitignore
├── ecosystem.config.cjs      ← PM2 production config
│
├── docs/
│   ├── reference/            ← source reference material (rules PDFs, map image)
│   │   └── *.pdf / *.jpg
│   ├── ailog/                ← AI execution logs (YYYY_MM_DD-LOB-{####}.md)
│   ├── agents/               ← agent design docs and prompts
│   ├── designs/              ← component design docs (TEMPLATE.md + {slug}.md)
│   ├── devlog/               ← devlog entries (YYYY-MM-DD-HHMM-*.md)
│   ├── devlog.md             ← devlog index
│   ├── high-level-design.md  ← this document
│   ├── library.md            ← human-readable reference library manifest
│   ├── library.json          ← machine-readable catalog
│   ├── map-editor-design.md  ← map editor detailed design spec
│   └── migration-wshobson-agents.md ← old-to-new command mapping (LOB-0082)
│
├── data/
│   └── scenarios/
│       └── south-mountain/
│           ├── map.json          ← hex terrain, gridSpec, VP/entry hexes
│           ├── oob.json          ← 219 units, brigade/division hierarchy
│           ├── leaders.json      ← 48 leaders, ratings, special flags
│           └── scenario.json     ← turn structure, reinforcements, VP conditions
│
├── scripts/
│   ├── map-editor.sh         ← launches server + client with MAP_EDITOR_ENABLED=true
│   └── validate-data.js      ← cross-validates all JSON data files against Zod schemas
│
├── server/
│   ├── package.json
│   └── src/
│       ├── server.js            ← http.createServer(); listen(); map editor guard
│       │
│       ├── routes/
│       │   └── mapEditor.js     ← GET/PUT /api/tools/map-editor/data
│       │       mapEditor.test.js
│       │
│       └── schemas/
│           ├── map.schema.js        ← Zod schema for map.json
│           │   map.schema.test.js
│           ├── oob.schema.js        ← Zod schema for oob.json
│           ├── leaders.schema.js    ← Zod schema for leaders.json
│           └── scenario.schema.js   ← Zod schema for scenario.json
│
└── client/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.js
        ├── App.vue
        │
        ├── components/
        │   ├── HexMapOverlay.vue        ← SVG hex grid overlay on the map image
        │   │   HexMapOverlay.test.js
        │   ├── CalibrationControls.vue  ← gridSpec calibration UI
        │   │   CalibrationControls.test.js
        │   └── HexEditPanel.vue         ← terrain/hexside/VP editor for a clicked hex
        │       HexEditPanel.test.js
        │
        ├── views/
        │   ├── StatusView.vue           ← server health / status page
        │   │   StatusView.test.js
        │   └── tools/
        │       ├── MapEditorView.vue    ← map editor root view
        │       └── MapEditorView.test.js
        │
        └── router/
            ├── index.js                ← Vue Router config (includes /tools/map-editor)
            └── index.test.js
```

---

## 10. Data Preparation Tools

This section describes the dev-only tooling required to prepare accurate game data and
validate rules engine behaviour. All tools are guarded by `MAP_EDITOR_ENABLED=true` in `.env`
and are never active in production.

- **Map digitisation** — convert the paper map image to `map.json` hex terrain data _(Map Editor — implemented)_
- **Scenario configuration** — edit turn structure, lighting schedule, visibility settings, and scenario-level rules overrides in `scenario.json` _(Scenario Editor — implemented)_
- **Order of battle editing** — inspect and correct unit stats, brigade/division hierarchy, wreck thresholds, and leader ratings across `oob.json` and `leaders.json` _(OOB Editor — implemented)_
- **Rules engine validation** — interactively test movement costs, movement range, and LOS against the digitized map using the live engine _(Map Test Tool — M3)_
- **AI-generated data inspection** — review AI-produced datasets (tables, reinforcement schedules, terrain assignments) before committing them to the canonical data files

### Map Editor

The map editor is a dev-only tool for digitizing `docs/reference/sm-map.jpg` into structured hex terrain data in `data/scenarios/south-mountain/map.json`. It is not part of the game itself and is never active in production.

**Purpose:** Digitize `docs/reference/sm-map.jpg` into `map.json` hex data using a set of
focused single-pass tools — one full map pass per data type (elevation, terrain, roads, etc.).

**Toggle:** set `MAP_EDITOR_ENABLED=true` in `.env`. The guard in `server.js` uses a dynamic import:

```js
if (process.env.MAP_EDITOR_ENABLED === 'true') {
  const { default: mapEditorRouter } = await import('./routes/mapEditor.js');
  app.use('/tools/map-editor/assets', express.static(...));
  app.use('/api/tools/map-editor', mapEditorRouter);
}
```

**Launch:**

```bash
npm run dev:map-editor    # runs scripts/map-editor.sh
```

**Architecture:**

```
MapEditorView.vue              ← orchestrator; owns mapData, calibration, openPanel
  ├── HexMapOverlay.vue        ← declarative overlay renderer; zero tool-specific logic
  ├── BaseToolPanel.vue        ← shared shell: clear-all, help popup, overlay toggles
  │   └── ToolChooser.vue      ← shared button-toggle group chooser
  ├── CalibrationControls.vue  ← gridSpec inputs, north offset picker
  ├── ElevationToolPanel.vue   ← useHexPaintTool; slider + tint overlay
  ├── TerrainToolPanel.vue     ← useHexPaintTool; terrain + building chooser
  ├── RoadToolPanel.vue        ← useEdgePaintTool + useClickHexside (bridge)
  ├── StreamWallToolPanel.vue  ← useEdgePaintTool + useClickHexside (ford)
  ├── ContourToolPanel.vue     ← useEdgePaintTool; auto-detect from elevation data
  └── LosTestPanel.vue         ← read-only; useLosTest
```

**Data flow:**

```
1. Load      GET /api/tools/map-editor/data → map.json into Vue state
             offer localStorage draft restore if draft._savedAt > server._savedAt
2. Calibrate CalibrationControls adjusts gridSpec; hex grid redraws live
3. Edit      Open a tool panel → activates that tool's overlays and interaction gate
             paint/click hexes or edges → tool composable writes canonical hex entry
             right-click → remove / reset selected value
4. Autosave  Every stroke-end writes working copy to localStorage
5. Save      PUT /api/tools/map-editor/data → Zod validation → write map.json
6. Export    "Export" strips _-prefixed fields → client-side file download
```

**Note:** The Vue route `/tools/map-editor` is always registered in the client router. Visiting
it without `MAP_EDITOR_ENABLED=true` will result in API 404s.

#### Detailed Design

See `docs/designs/map-editor-design.md` for the full specification:

- **§2 Hex Data Model** — `HexEntry` with `hexFeature` (single building flag), canonical edge
  ownership (faces 0–2 stored on hex; faces 3–5 on neighbour), integer face indices independent
  of `northOffset`, and edge feature coexistence rules.
- **§4 Tool Panel Framework** — component/composable diagram, declarative overlay system
  (`overlayConfig`), shared composable contracts (`useHexPaintTool`, `useEdgePaintTool`,
  `useClickHexside`, `usePaintStroke`), and `BaseToolPanel` common controls.
- **§6–§10 Tool sections** — per-tool `overlayConfig` declarations and unique controls.
- **§14 Save Model** — three-tier save (localStorage → server → engine export).
- **§15 Formula and Config Modules** — `config/feature-types.js` (single source of truth for
  colors/styles), `formulas/hex-geometry.js`, `formulas/compass.js`, `formulas/edge-model.js`,
  `formulas/elevation.js`, `formulas/los.js`.

---

### Scenario Editor

The scenario editor is a dev-only tool for editing `data/scenarios/south-mountain/scenario.json`
— the companion to the map editor. It covers fields that cannot be derived from the physical map:
turn structure, lighting schedule (day/twilight/night turn ranges), visibility settings, and
scenario-level rules flags (Fluke Stoppage grace period, initiative system, loss recovery,
random events).

Follows the same push/pull sync pattern as the map editor: versioned server backups, offline
localStorage fallback, `_savedAt` staleness detection, and ConfirmDialog on overwrite/discard.
Guarded by the same `MAP_EDITOR_ENABLED` env flag.

Route: `/tools/scenario-editor` (client) · `GET/PUT /api/tools/scenario-editor/data` (server).

See `docs/designs/scenario-editor-design.md` for the full specification.

---

### OOB Editor

The OOB editor is a dev-only tool for inspecting and correcting `oob.json` and `leaders.json`
— the unit order-of-battle and leader data files. The primary use case is reviewing and adjusting
AI-generated unit statistics (combat ratings, morale, wreck thresholds, brigade hierarchy) and
leader ratings before the rules engine is built and relies on them.

See `docs/designs/oob-editor-design.md` for the full specification. Follows the same `MAP_EDITOR_ENABLED`
guard and push/pull sync pattern as the map and scenario editors. Adds `successionIds` to
brigade/division/corps nodes in `oob.json` and `counterRef` filename linkage to all unit and
leader records. A `scripts/detect-counters.js` script will use AI image analysis to
pre-populate counter linkages from `docs/reference/src-counters-sm/`.

Routes: `/api/oob/data`, `/api/leaders/data`, `/api/counters/list|upload`.

---

### Map Test Tool

The Map Test Tool is a read-only dev tool for validating the M3 rules engine against the
digitized South Mountain map. It shares the hex map renderer with the map editor but has
no editing capability — its sole purpose is interactive rule verification.

**Route:** `/tools/map-test` (client) · `GET /api/tools/map-test/*` (server)

**Launch:** same server process as the map editor (`npm run dev:map-editor`); accessible
at `http://localhost:5173/tools/map-test` when `MAP_EDITOR_ENABLED=true`.

**Architecture:**

```
MapTestView.vue              ← orchestrator; reads map.json + scenario.json (read-only)
  ├── HexMapOverlay.vue      ← shared component from map editor (read-only mode)
  ├── MovementTestPanel.vue  ← path calculator + range overlay; calls /api/tools/map-test/*
  ├── HexInspectorPanel.vue  ← shows raw engine-visible data for clicked hex
  └── LosTestPanel.vue       ← migrated from map editor; uses engine/los.js via API
```

**Panels:**

| Panel          | Inputs                                   | Output                                                                             |
| -------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| Movement Path  | start hex, end hex, unit type, formation | Path highlighted on map; per-hex cost table; total MP                              |
| Movement Range | hex, unit type, formation                | All reachable hexes shaded by cost bucket; impassable hexes shown                  |
| Hex Inspector  | clicked hex                              | Terrain type, elevation, hexside types per direction, computed costs per unit type |
| LOS            | from hex, to hex                         | Can-see / blocked; first blocking element (hex, terrain, or elevation); full trace |

**Server routes:**

```
GET /api/tools/map-test/movement-path
  Query: startHex, endHex, unitType, formation
  Returns: { path: [hexId], costs: [{hex, terrainCost, hexsideCost, total}], totalCost, impassable }

GET /api/tools/map-test/movement-range
  Query: hex, unitType, formation
  Returns: { reachable: [{ hex, cost }] }

GET /api/tools/map-test/los
  Query: fromHex, toHex
  Returns: { canSee: boolean, blockedBy: { hex, reason } | null, trace: [hexId] }
```

All three endpoints call the corresponding `engine/movement.js` and `engine/los.js` functions
directly — no game state required, only the loaded `map.json` and `scenario.json`.

**Note:** The `LosTestPanel.vue` that previously lived in the map editor is removed from
that tool and re-implemented here using the formal `engine/los.js` rather than the ad-hoc
prototype. The map editor loses its LOS tab; the Map Test Tool becomes the single place
for map-based rules validation.

---

### Table Test Tool

The Table Test Tool is a standalone dev tool for interactively testing all LOB v2.0 game
tables — combat, morale, command, and leader loss — against the formal engine implementations.
No hex map is displayed; each panel is a self-contained form that inputs parameters and dice
rolls, calls a server endpoint, and returns a result with a full modifier breakdown.

**Route:** `/tools/table-test` (client) · `POST /api/tools/table-test/*` (server)

**Launch:** same server process as the map editor (`npm run dev:map-editor`); accessible
at `http://localhost:5173/tools/table-test` when `MAP_EDITOR_ENABLED=true`.

**Architecture:**

```
TableTestView.vue
  ├── CombatTablePanel.vue        ← §5.6: SPs, column shifts, 2d6 → result + depletion flag
  ├── OpeningVolleyPanel.vue      ← §5.4: range, charge flag, 1d6 → SP loss
  ├── MoraleTablePanel.vue        ← §6.1: rating A–F, all modifiers, 2d6 → state + retreats/losses
  ├── MoraleTransitionPanel.vue   ← §6.2a: current state × new result → resolved state
  ├── ClosingRollPanel.vue        ← §3.5: morale rating, modifiers, 1d6 → pass/fail
  ├── LeaderLossPanel.vue         ← §9.1a: situation, sharpshooter flag, 2d6 → result
  ├── CommandRollPanel.vue        ← §10.6: command value, reserve flag, 2d6 → yes/no
  ├── OrderDeliveryPanel.vue      ← §10.6a: CO awareness, distance → turns to deliver
  ├── FlukeStoppagePanel.vue      ← §10.7b: command value, reserve, night, 2d6 → pass/stoppage
  ├── AttackRecoveryPanel.vue     ← §10.8c: division status, command value, 2d6 → result
  └── ZeroRulePanel.vue           ← §9.1e: 1d6 → no MA / half MA / full MA
```

Each panel shows:

1. Input fields for all parameters (dropdowns, checkboxes, or numeric dice roll entry)
2. An optional "Roll for me" button that generates random dice
3. The result, with a step-by-step modifier breakdown listing each modifier applied and its value

**Server routes:** all POST, pure computation, no game state:

```
POST /api/tools/table-test/combat
  Body: { sps, columnShifts:[{reason, amount}], roll }
  Returns: { result, finalColumn, modifierBreakdown, moraleCheckRequired, depletionFlag }

POST /api/tools/table-test/opening-volley
  Body: { range, isCharge, isShiftOnly, roll }
  Returns: { spLoss }

POST /api/tools/table-test/morale
  Body: { rating, modifiers:{shaken,wrecked,rear,night,small,cowardlyLegs,artyCav,...}, roll }
  Returns: { newState, retreatHexes, spLoss, leaderLossCheck }

POST /api/tools/table-test/morale-transition
  Body: { currentState, newResult }
  Returns: { resolvedState }

POST /api/tools/table-test/closing-roll
  Body: { morale, modifiers:{bloodLust,rear,shaken,artryCanister,breastworksAdj}, roll }
  Returns: { pass, threshold, modifiedRoll }

POST /api/tools/table-test/leader-loss
  Body: { situation, sharpshooterCapable, roll }
  Returns: { result }   -- "noEffect" | "captured" | "wounded" | "killed"

POST /api/tools/table-test/command-roll
  Body: { commandValue, isReserveOrDeployment, roll }
  Returns: { yes, modifiedRoll }

POST /api/tools/table-test/order-delivery
  Body: { awarenessType, distanceCategory }
  Returns: { turnsToDeliver }

POST /api/tools/table-test/fluke-stoppage
  Body: { commandValue, hasReserve, isNight, roll }
  Returns: { basePass, stoppage, secondRoll }

POST /api/tools/table-test/attack-recovery
  Body: { divisionStatus, commandValue, roll }
  Returns: { result, secondRoll }   -- "noRecovery" | "attackRecovery"

POST /api/tools/table-test/zero-rule
  Body: { roll }
  Returns: { ma }   -- "none" | "half" | "full"
```

---

## 11. Tooling Configuration

### `eslint.config.js` (root)

Uses ESLint flat config. Key structure:

```js
import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import pluginN from 'eslint-plugin-n';
import pluginImport from 'eslint-plugin-import';
import configPrettier from 'eslint-config-prettier';

export default [
  // Global ignores
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'docs/**',
      'coverage/**',
      'ecosystem.config.cjs',
      'scripts/**',
    ],
  },

  // Base JS rules — all files
  js.configs.recommended,

  // Server — Node.js rules
  {
    files: ['server/src/**/*.js'],
    plugins: { n: pluginN, import: pluginImport },
    rules: {
      ...pluginN.configs['flat/recommended'].rules,
      'n/no-missing-import': 'error',
      'n/no-extraneous-import': 'error',
      'no-console': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'import/order': [
        'warn',
        { groups: ['builtin', 'external', 'internal'], 'newlines-between': 'always' },
      ],
    },
  },

  // Server test files — relax Node.js import restrictions (vitest/supertest are root devDeps)
  {
    files: ['server/src/**/*.test.js'],
    rules: { 'n/no-extraneous-import': 'off', 'n/no-missing-import': 'off' },
  },

  // Client — Vue 3 rules via flat/recommended (applies to .vue files via plugin processor)
  ...pluginVue.configs['flat/recommended'],

  // Client — additional overrides scoped to client/src
  {
    files: ['client/src/**/*.{js,vue}'],
    rules: {
      'vue/multi-word-component-names': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    },
  },

  // Prettier — must be last; disables all formatting rules
  configPrettier,
];
```

---

### `.prettierrc` (root)

```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100,
  "trailingComma": "es5",
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

---

### `vitest.workspace.js` (root)

Defines the two test environments. The `@vitejs/plugin-vue` plugin is added for the client workspace so Vue SFCs are compiled correctly.

```js
import { defineWorkspace } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineWorkspace([
  // Server-side tests — Node environment
  {
    test: {
      name: 'server',
      include: ['server/src/**/*.test.js'],
      environment: 'node',
      globals: true,
    },
  },
  // Client-side tests — jsdom environment
  {
    plugins: [vue()],
    test: {
      name: 'client',
      include: ['client/src/**/*.test.js'],
      environment: 'jsdom',
      globals: true,
    },
  },
]);
```

### `vitest.config.js` (root)

Coverage configuration (separate from workspace so it applies to the whole suite):

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['server/src/**/*.js', 'client/src/**/*.{js,vue}'],
      exclude: [
        '**/*.test.js',
        'server/src/server.js', // entry point; not unit-testable
        'client/src/main.js',
        'client/src/App.vue',
        'server/src/schemas/leaders.schema.js', // data-only schemas
        'server/src/schemas/oob.schema.js',
        'server/src/schemas/scenario.schema.js',
      ],
      thresholds: { lines: 70 }, // raise as engine matures
    },
  },
});
```

---

### `.env.example` (root)

```bash
# Node
NODE_ENV=development
PORT=3000

# Client (Vite dev server)
CLIENT_ORIGIN=http://localhost:5173

# App
APP_URL=http://localhost:3000

# JWT
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d

# SQLite
SQLITE_PATH=./data/lob.db

# DigitalOcean Spaces
DO_SPACES_KEY=your-spaces-access-key
DO_SPACES_SECRET=your-spaces-secret-key
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_REGION=nyc3
DO_SPACES_BUCKET=lob-online-games

# Discord OAuth
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_CALLBACK_URL=http://localhost:3000/auth/discord/callback
```

---

## 12. Open Questions and Risks

### Rules Engine Complexity

| Risk                                                                                                                                                                                                    | Severity | Mitigation                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LOS calculation** — SM has elevation contours, woods (+1 height per SM override), ridge hexsides. Getting LOS exactly right for all terrain combinations is the hardest single problem in the engine. | High     | Build `los.test.js` with an exhaustive set of known-correct LOS pairs drawn from the physical rulebook examples. Implement and test before combat. |
| **ZOC rules** — Zone of Control entry, exit, and the many exceptions (roads, friendly units, routed units) are notoriously fiddly in LoB.                                                               | Medium   | Implement ZOC in isolation with a dedicated test suite. Add each exception as a named test case keyed to the rule number in LOB_RULES.             |
| **Morale cascade** — rout propagation up the unit hierarchy (regiment → brigade → division) has complex stop conditions.                                                                                | Medium   | Model the hierarchy explicitly in GS_OOB. Test cascade with a mock game state that forces rout at each level.                                      |

---

### Data Modeling

| Risk                                                                                                                                                                                                                                                                        | Severity              | Mitigation                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Map digitisation** — Converting `sm-map.jpg` to `map.json` (every hex with coordinates, terrain type, elevation, road/trail flags) is manual work for ~600+ hexes.                                                                                                        | ~~High~~ **Resolved** | Map editor dev tool built (`MapEditorView` + `HexMapOverlay` + `CalibrationControls` + `HexEditPanel`). Terrain digitization is in progress via the tool.                  |
| **GS_OOB hierarchy depth** — Leader attachment/detachment mid-game, the difference between in-command and out-of-command ranges, and the exact OOB hierarchy (army → corps → division → brigade → regiment) needs careful schema design before any combat logic is written. | Medium                | `oob.json` and `leaders.json` are built and Zod-validated. Schema reviewed against sm-regimental-roster.pdf. Hierarchy encoding confirmed before rules engine work begins. |

---

### Persistence

| Risk                                                                                                                                                                                                        | Severity | Mitigation                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DO Spaces latency** — Each action does at least one Spaces write (state.json) and one read (on load). Round-trip to nyc3 from a co-located Droplet should be 10–50ms, but this adds up in real-time play. | Low      | Co-locate Droplet and Spaces in the same region (nyc3). Profile early. If latency is noticeable, batch state + history write in parallel with `Promise.all`.                                    |
| **state.json growing large** — After many actions, `state.json` may become large (detailed OOB).                                                                                                            | Low      | State is always a full snapshot, not a diff. Keep GS_OOB lean — store only the mutable fields (strength, moraleState, hex, order); derive immutable stats from the static `oob.json` data file. |

---

### Auth

| Risk                                                                        | Severity | Mitigation                                                                                                                                                                           |
| --------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Discord OAuth outage** — If Discord is down, new logins fail.             | Low      | Existing JWTs remain valid until expiry (7 days). Players mid-session are unaffected. Show a clear "Login unavailable" message on failure. Not worth a fallback for a hobby project. |
| **User revokes Discord access** — The Discord access token becomes invalid. | Low      | The app uses Discord only for identity at login time. The JWT is the active session credential. Revocation only affects the next login, not active sessions.                         |

---

### Hex Map

| Risk                                                                                                                                           | Severity | Mitigation                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **SVG performance on large maps** — ~600 hexes × multiple SVG elements each = potentially thousands of DOM nodes.                              | Medium   | Use Vue's `v-for` with stable `:key` values so the virtual DOM patches minimally. Benchmark on a mid-range tablet early. If needed, switch hex terrain to a static SVG background image and overlay only units + UI elements as interactive DOM nodes. |
| **Honeycomb.js LOS integration** — Honeycomb.js provides hex geometry but not LOS ray-casting with terrain height. Custom LOS must be written. | Medium   | LOS is server-side only (in `engine/los.js`). The client highlights valid targets based on the server's response; it does not compute LOS itself. This separation keeps the client simple.                                                             |

---

### Multiplayer

| Risk                                                                                                   | Severity | Mitigation                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Game abandonment** — A player goes silent in an async game indefinitely.                             | Medium   | Phase 2: add a forfeit endpoint (`POST /games/:id/forfeit`). For MVP, games can simply remain `in_progress` indefinitely without harm.                                                                                               |
| **Real-time desync** — A player submits an action while a Socket.io event is in flight.                | Low      | Actions are serialised by turn enforcement in SQLite. The REST response is the authoritative state; the socket event is a convenience notification. The client always reconciles from the REST response, not the socket event alone. |
| **Socket.io reconnection gap** — Player reconnects after a brief drop and misses a state update event. | Low      | On reconnect, the client calls `GET /games/:id` to re-sync from Spaces. The socket room just delivers live updates; it is not the source of truth.                                                                                   |

---

### Scope

| Risk                                                                                             | Severity | Mitigation                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Rules engine underestimated** — LoB has many interacting systems. The full rules are 36 pages. | High     | Build incrementally: movement first, then fire combat, then close combat, then morale. Each phase must have passing tests before the next begins. Do not attempt to implement all rules simultaneously. |
| **Map data entry underestimated** — See above.                                                   | High     | Start map digitisation in parallel with engine development; it does not block engine work.                                                                                                              |
| **Phase 1 scope drift** — "Just one more feature" pressure during MVP development.               | Medium   | Hold the Phase 1 acceptance criteria firm. Anything not in the criteria list goes on the Phase 2 backlog.                                                                                               |

---

### Testing

| Concern                     | Approach                                                                                                                                                                                                         |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Rules correctness**       | Golden-path integration tests: feed known game situations (from the rulebook examples and sm-rules.pdf) into the engine and assert the exact expected outcome. These are the most valuable tests in the project. |
| **Regression safety**       | Every bug found during playtesting gets a test case added before the fix is applied.                                                                                                                             |
| **LOS / movement coverage** | Property-based tests (fast-check or similar) to fuzz hex coordinates and movement paths and check that the engine never throws unexpected errors.                                                                |
| **API contract**            | Supertest integration tests for each route covering happy path, auth failure, rules violation, and not-found cases.                                                                                              |

---

## 13. SDLC Workflow

The AI-assisted development lifecycle follows a four-phase cycle. Each phase has a dedicated
skill that drives it conversationally.

### Four-Phase Cycle

```
/design  →  /conductor:new-track (×N)  →  loop(/conductor:implement)  →  /plan-wrap
```

| Phase              | Command                | Output                                                                  |
| ------------------ | ---------------------- | ----------------------------------------------------------------------- |
| **Design**         | `/design`              | `docs/designs/{slug}.md` merged on PR                                   |
| **Track creation** | `/conductor:new-track` | Track spec + phased plan; replaces `/issue-intake` + `/issue-implement` |
| **Implementation** | `/conductor:implement` | PR merged, issue closed, ailog committed                                |
| **After-action**   | `/plan-wrap`           | Devlog entry, CLAUDE.md and HLD up to date                              |

### Design Phase Detail

Run `/design` when work involves a new or changed component (orchestrator, skill, or agent)
and the right solution needs to be reasoned through before issues are written. The skill:

1. Asks for the intent of the component in plain language
2. Infers the component type (`orchestrator`, `skill`, or `agent`) and asks for confirmation
3. Creates `docs/designs/{slug}.md` from `docs/designs/TEMPLATE.md`
4. Iterates via chat (agent edits file) or direct file edits (agent re-reads and confirms)
5. On approval: commits on `design/{slug}` branch, opens a PR, waits for "merge", then merges
6. Reports: "Design merged. Run `/conductor:new-track` to create an implementation track."

### Implementation Loop

After each `/conductor:implement` merge:

- If implementation revealed new scope → update the design doc and run `/conductor:new-track` again
- If all track tasks are closed → run `/plan-wrap` to close out the cycle

### Technical Debt Tracking

After resolving findings from a `/team-review`, run `/tech-debt-report` to score any deferred
items and update the project debt register.

**Resolution standard:** every review finding must be either fixed in place (resolved in the
PR) or deferred (filed as a GitHub issue with a debt score and written assessment).

**Debt score scale (1–5 logarithmic):**

| Score | Label       | Meaning                                                   |
| ----- | ----------- | --------------------------------------------------------- |
| 1     | Trivial     | Style/naming. No functional risk.                         |
| 2     | Minor       | Duplicated logic, small inconsistency.                    |
| 3     | Moderate    | Missing abstraction, workaround. Slows future work.       |
| 4     | Significant | Architectural compromise, risky coupling.                 |
| 5     | Critical    | Security risk, correctness hazard, or blocks future work. |

**Reports:**

- `docs/tech-debt/reports/pr-{number}_{YYYY-MM-DD}.md` — per-PR report generated by `/tech-debt-report`
- `docs/tech-debt/report.md` — aggregated project-wide register (executive summary, debt-over-time chart, risk assessment, open items ordered by score)
- `docs/tech-debt/README.md` — conventions, scale reference, and report templates
