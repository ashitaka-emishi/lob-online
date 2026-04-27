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

M3 complete. The rules engine foundation is fully delivered: `engine/hex.js` (hex grid math,
neighbors, distance), `engine/scenario.js` (turn structure, lighting, reinforcement lookup),
`engine/movement.js` (MP costs, path-finding, terrain/formation rules), `engine/los.js` (LOS
blocking by terrain and elevation), and `engine/command-range.js` (zone shading by commander
level). All engine modules have full Vitest coverage and rule-reference comments. Two
validation tools are live: Map Test Tool (`/tools/map-test` — movement paths, hex inspector,
LOS, command range) and Table Test Tool (`/tools/table-test` — all LOB v2.0 game tables with
modifier breakdowns). Game tables cover: Combat, Opening Volley, Morale, Morale Transition,
Closing Roll, Leader Loss, Command Roll, Order Delivery, Fluke Stoppage, Attack Recovery, and
Zero Rule.

**Starting M4 — Game State Model + Initializer + Initial Setup Phase.** This milestone
delivers the in-memory game state model (unit positions, morale states, orders, ammo, facing),
a game state initializer that reads `scenario.json` setup data (both zone-constraint and
fixed-hex placement formats), the initial setup phase (union placement within zone constraints,
CSA fixed positions per SM §3.x), a minimal "pick a side" session for local dev (no OAuth),
and file persistence (`data/games/{id}/state.json`) with a games table in SQLite. A basic
game lobby UI (list/create/join) will wire it together. See
`docs/designs/high-level-design.md` §2 for the full milestone plan.
