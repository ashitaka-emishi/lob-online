# Implementation Plan: M4 — Game State Model + Initializer + Setup Phase

**Track ID:** m4-game-state_20260505
**Spec:** [spec.md](./spec.md)
**Created:** 2026-05-05
**Status:** [ ] Not Started

## Overview

Four phases following TDD. Phase 1 establishes the data model and new dependencies. Phase 2
builds the game state initializer (the engine core of M4). Phase 3 delivers the server layer
— SQLite, file persistence, and API routes. Phase 4 completes the lobby UI and session wiring.

---

## Phase 1: Game State Schema + Dependencies

Add new runtime dependencies and define the canonical `GameState` Zod schema that all
downstream code targets.

### Tasks

- [x] Task 1.1: Add `better-sqlite3` and `express-session` to `server/package.json`
  - Run `npm install better-sqlite3 express-session` in `server/`
  - Verify imports work in a Node 20 ES-module context

- [x] Task 1.2: Define `GameState` Zod schema (`server/src/schemas/gameState.schema.js`)
  - `UnitState`: `id`, `hex`, `facing` (0–5), `morale` (enum: normal/shaken/DG/wrecked/routed),
    `orders` (enum), `ammo` (full/low/none), `isOnBoard`, `entryTurn`
  - `GameState`: `id`, `scenarioId`, `turn`, `phase` (enum), `initiative`, `sides`
    (union/csa player tokens), `units` (map of unitId → UnitState),
    `reinforcementQueue` (array of `{unitId, turn, entryHex}`), `status` (setup/active/complete)

- [x] Task 1.3: Write Vitest tests for `GameState` schema (`gameState.schema.test.js`)
  - Valid full game state parses without error
  - Missing required fields throw `ZodError`
  - Enum violations throw `ZodError`
  - Unit morale and ammo enum exhaustiveness

### Verification

- [ ] `npm run test` passes with new schema tests
- [ ] Schema file exports `GameStateSchema` and `UnitStateSchema`

---

## Phase 2: Game State Initializer (TDD)

Build `server/src/engine/init.js` — the function that reads `scenario.json` setup data and
produces a valid `GameState` ready for Turn 1.

### Tasks

- [ ] Task 2.1: Write failing tests for `initGameState()` (`init.test.js`)
  - Union units appear in their zone-constraint hex area (within N hexes of reference hex
    per `setupZone`)
  - CSA units appear at their fixed hexes from `scenario.json setup`
  - SM Errata corrections applied: Chicago Dragoons designation, E/2 US rating (consult
    domain-expert for the 5 errata items)
  - Reinforcements queued by arrival turn from `scenario.json reinforcements`
  - Returned state validates against `GameStateSchema`

- [ ] Task 2.2: Implement `initGameState()` — fixed-hex CSA placement
  - Read `scenario.json setup` array; filter for fixed-hex format `{ unitId, hex }`
  - Place each CSA unit at its hex with `isOnBoard: true`, default morale/orders/ammo

- [ ] Task 2.3: Implement union zone-constraint placement
  - For `{ setupZone: "within5Of", referenceHex }` entries: compute valid hex set using
    `engine/hex.js` distance; pick a placement hex (initial pass: place at reference hex
    itself; setup phase UI will let player move within zone in M5)
  - Apply SM Errata corrections to affected unit states

- [ ] Task 2.4: Implement reinforcement pre-queuing
  - Read `scenario.json reinforcements`; build `reinforcementQueue` array with
    `{ unitId, turn, entryHex }`
  - Reinforcement units have `isOnBoard: false`

### Verification

- [ ] All `init.test.js` tests pass
- [ ] `initGameState(scenario)` returns object that validates against `GameStateSchema`
- [ ] Domain-expert consulted on SM Errata 5 corrections; each applied with rule-reference
      comment

---

## Phase 3: Server Layer — SQLite, File Persistence, API Routes

Wire the initializer into real storage and expose the game API.

### Tasks

- [ ] Task 3.1: Write tests for file game store (`gameFile.test.js`)
  - `saveGame(id, state)` writes `data/games/{id}/state.json`
  - `loadGame(id)` reads it back; round-trips correctly
  - `loadGame` throws if file not found

- [ ] Task 3.2: Implement `server/src/store/gameFile.js`
  - `saveGame(id, state)` — `JSON.stringify` + atomic write (tmp file + rename)
  - `loadGame(id)` — `fs.readFileSync` + `JSON.parse` + `GameStateSchema.parse()`
  - Ensure `data/games/` directory created on first write

- [ ] Task 3.3: Write tests for SQLite games store (`gameSqlite.test.js`)
  - `createGame(id, sideAToken)` inserts row
  - `joinGame(id, sideBToken)` updates row
  - `getGame(id)` returns row; returns null for unknown id
  - `listGames()` returns all rows

- [ ] Task 3.4: Implement `server/src/store/gameSqlite.js`
  - Schema: `games(id TEXT PK, side_a_token TEXT, side_b_token TEXT, status TEXT,
created_at INTEGER, state_path TEXT)`
  - Use `better-sqlite3` synchronous API; open DB at `data/games.db`
  - `initDb()` runs `CREATE TABLE IF NOT EXISTS`

- [ ] Task 3.5: Write tests for game API routes (`games.test.js`)
  - `POST /api/v1/games` creates game, returns `{ id, side: 'union' }`
  - `POST /api/v1/games/:id/join` joins as CSA, returns `{ id, side: 'csa' }`
  - `GET /api/v1/games` returns list
  - `GET /api/v1/games/:id` returns game state; 404 for unknown id
  - Joining a full game returns 409

- [ ] Task 3.6: Implement `server/src/routes/games.js` + wire express-session
  - `POST /games`: call `initGameState(scenario)`, `saveGame`, `createGame`; store
    `sideToken` in session
  - `POST /games/:id/join`: `joinGame`; store `sideToken` in session
  - `GET /games`: `listGames()`
  - `GET /games/:id`: `loadGame(id)` + schema parse
  - Mount `express-session` in `server.js` (in-memory store, `secret` from env)
  - Mount games router at `/api/v1/games`

### Verification

- [ ] All store and route tests pass
- [ ] `GET /api/v1/games/:id` returns correct initial unit positions
- [ ] State round-trips through file store correctly (save → restart → load)

---

## Phase 4: Lobby UI

Vue lobby that lets two browser sessions create, join, and pick a side.

### Tasks

- [ ] Task 4.1: Write tests for `useLobbyStore` Pinia store (`lobby.store.test.js`)
  - `createGame()` calls `POST /api/v1/games`, sets `myGameId` and `mySide`
  - `joinGame(id)` calls `POST /api/v1/games/:id/join`, sets `mySide`
  - `fetchGames()` calls `GET /api/v1/games`, populates `games` list

- [ ] Task 4.2: Implement `client/src/stores/lobby.js` Pinia store
  - State: `games[]`, `myGameId`, `mySide`, `loading`, `error`
  - Actions: `fetchGames()`, `createGame()`, `joinGame(id)`

- [ ] Task 4.3: Write tests for `LobbyView.vue`
  - Renders game list from store
  - "New Game" button calls `createGame()` and navigates to setup placeholder
  - "Join" button on a game calls `joinGame(id)`

- [ ] Task 4.4: Implement `client/src/views/LobbyView.vue`
  - Game list table: id, status, join button (disabled if full)
  - "New Game" button
  - Shows `mySide` assignment after create/join
  - Minimal styling — functional, not polished

- [ ] Task 4.5: Add Vue Router routes
  - `/lobby` → `LobbyView.vue`
  - `/games/:id` → `GameView.vue` stub (placeholder for M5 game map)
  - Update `client/src/router/index.js`

### Verification

- [ ] Lobby renders game list fetched from server
- [ ] Two browser sessions can create and join a game end-to-end
- [ ] After join, each session shows its assigned side

---

## Final Verification

- [ ] All acceptance criteria in spec.md met
- [ ] `npm run lint`, `npm run format:check`, `npm run test` all pass
- [ ] `GET /api/v1/games/:id` returns correct initial unit positions from `scenario.json`
- [ ] Game state persists across server restart
- [ ] Both players can create/join without OAuth
- [ ] Ready for PR

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
