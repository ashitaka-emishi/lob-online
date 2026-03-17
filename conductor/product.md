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

Phase 1 scaffold complete. Tech stack established, data JSON files and Zod schemas built, map editor and scenario editor dev tools complete with full test coverage. Game logic (rules engine, auth, multiplayer) planned for subsequent phases.
