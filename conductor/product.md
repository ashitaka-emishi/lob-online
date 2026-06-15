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

M6 complete. All prior milestones delivered (M3–M5.5). M6 added: fire combat handler
(`FIRE_COMBAT`), close combat handler (`CLOSE_COMBAT`), morale cascade engine
(`engine/morale.js`) with `RESOLVE_MORALE` handler, leader casualty resolution
(`RESOLVE_LEADER_CASUALTY`), CBF marker clearing in Rally Phase (`drainAutoSteps`),
and unified morale state vocabulary (normal/bloodlust/shaken/disorganized/routed —
NM/BL/SH/DG/RT). `GameStateSchema` bumped to v3 with `currentActivation` object shape
and `PendingResolutionSchema` extended for combatResult/closingRoll/moraleCheck/leaderCasualty.
`buildUnitSideMap()` added to `engine/oob.js` for OOB side-affiliation in action gating.

**Starting M7 — Movement, Formation, and Full Combat Resolution.** See
`docs/designs/high-level-design.md` §2 for the M7–M8 milestone plan.
