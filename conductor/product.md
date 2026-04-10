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

M2 complete. All dev tools are done: map editor (full terrain/elevation/edge/wedge editing,
LOS test panel, push/pull sync), scenario editor (turn structure, lighting schedule, rules
flags), OOB editor (command hierarchy, unit detail, leader succession, counter images), and
counter auto-detection script. All five JSON data files have Zod schemas and Vitest coverage.
Terrain digitization for South Mountain is in progress.

**Starting M3 — Rules Engine Foundation + Map Testing Tools.** This milestone delivers the
pure-JS engine core (`hex.js`, `scenario.js`, `movement.js`, `los.js`) with full test
coverage, plus a Movement Test Panel in the map editor for interactive validation of movement
paths on the digitized map. See `docs/designs/high-level-design.md` §2 for the full M3–M8
milestone plan.
