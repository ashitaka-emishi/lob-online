# Product Definition: lob-online

## Project Name

lob-online

## Description

An online multiplayer implementation of the _Line of Battle v2.0_ wargame system (Multi-Man Publishing), starting with the _South Mountain_ scenario (RSS #4).

## Problem Statement

Wargame players have no way to play _Line of Battle_ scenarios online — the game exists only in physical tabletop form. Digitizing it removes the barrier of needing players in the same room and enables features like rule enforcement, undo, and replay.

## Target Users

Wargame enthusiasts familiar with the _Line of Battle_ ruleset who want to play South Mountain (and future scenarios) asynchronously or in real time over the internet.

## Key Goals

1. Faithfully implement the LOB v2.0 rules for South Mountain with automated rule enforcement.
2. Support multiplayer (2-player) via real-time Socket.io sessions.
3. Provide dev tools (map editor, scenario editor) for accurate scenario digitization.
4. Build a maintainable, tested foundation that scales to future LOB scenarios.

## Current Phase

M5.5 complete. The rules engine foundation (M3), game state model + persistence + lobby UI
(M4), turn reducer + valid-actions engine + action API + `GameView` (M5), and multi-module
platform + scenario editor enhancements + `HomeView` (M5.5) are all fully delivered. Key
deliverables include: `GameStateSchema`/`UnitStateSchema` Zod schemas, `initGameState()`
engine, `gameFile`/`gameSqlite` stores, games API routes with express-session, `LobbyView` +
`useLobbyStore`, `UnitOrderState` schema, `engine/phase.js` turn reducer and valid-actions
engine, `POST /api/v1/games/:id/actions` with Socket.io room events, `GameView` with
`UnitCounterLayer` + `UnitStatsPanel`, `useGameStore`, `resolveModulePath` utility,
module-level map/OOB data under `data/modules/`, and scenario start states under
`scenarios/full-battle/`.

**Starting M6 — Combat, Morale, and Orders Resolution.** See
`docs/designs/high-level-design.md` §2 for the full M6–M8 milestone plan.
