# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**lob-online** is an online game implementation of the _Line of Battle v2.0_ wargame system (Multi-Man Publishing). The first game being implemented is _South Mountain_ (RSS #4), chosen because it is a smaller, more tractable battle.

**Current state:** Phase 1 scaffold complete. The tech stack is established (Node.js/Express/Socket.io server, Vue 3/Vite/Pinia client), and the following are all built and tested: four data JSON files with Zod schemas, a hex map editor dev tool, Vitest test suites for both server and client, ESLint/Prettier config, and a GitHub Actions CI pipeline. Game logic (rules engine, auth, multiplayer) is planned for subsequent phases.

## Reference Library

All source material lives in `docs/`. The library is tracked in two parallel files that must stay in sync:

- `docs/library.md` — human-readable manifest with status indicators (✅ available, ⬜ needed, 🔧 to be built)
- `docs/library.json` — machine-readable catalog (`"available"`, `"missing"`, `"todo"`)

### Available Source Documents

| ID               | File                            | Contents                                                                  |
| ---------------- | ------------------------------- | ------------------------------------------------------------------------- |
| LOB_RULES        | `lob-rules.pdf`                 | Complete 36-page LoB v2.0 series rulebook                                 |
| LOB_CHARTS       | `lob-tables.pdf`                | 6-page combat/morale/terrain tables                                       |
| LOB_GAME_UPDATES | `lob-game-specific-updates.pdf` | RSS-to-LoB conversions + SM-specific rule overrides                       |
| SM_RULES         | `sm-rules.pdf`                  | 28-page South Mountain scenario rules, terrain, reinforcements, VP system |
| SM_ROSTER        | `sm-regimental-roster.pdf`      | All unit statistics for both sides                                        |
| SM_ERRATA        | `sm-errata.pdf`                 | 5 official corrections (all applied to canonical data)                    |
| SM_MAP           | `sm-map.jpg`                    | South Mountain hex map (high-resolution image)                            |

### Data Models

All four data files exist under `data/scenarios/south-mountain/` and are validated by Zod schemas in `server/src/schemas/`.

| ID               | File                                          | Contents                                                                                                                                                                |
| ---------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SM_MAP_DATA      | `data/scenarios/south-mountain/map.json`      | Hex terrain, gridSpec calibration, VP/entry hexes, type registries (hexsideTypes, hexFeatureTypes, edgeFeatureTypes) — partial, digitization in progress via map editor |
| GS_OOB           | `data/scenarios/south-mountain/oob.json`      | 219 units, brigade/division hierarchy, wreck thresholds                                                                                                                 |
| GS_LEADERS       | `data/scenarios/south-mountain/leaders.json`  | 48 leaders, ratings, special rule flags                                                                                                                                 |
| SM_SCENARIO_DATA | `data/scenarios/south-mountain/scenario.json` | Turn structure, reinforcements, VP conditions, movement costs, random events                                                                                            |

### Developer Tools

A hex map editor is available as a dev-only tool for digitizing `docs/reference/sm-map.jpg` into `map.json` terrain data.

- **Enable:** set `MAP_EDITOR_ENABLED=true` in `.env`
- **Launch:** `npm run dev:map-editor` (starts both server and client with the env flag set)

## South Mountain Rule Overrides

These SM-specific rules override base LoB v2.0:

1. Trees add **+1** (not +3) to LOS height
2. All army commanders rated **Normal**
3. **No breastworks** allowed
4. **Longstreet** acts as army commander — no initiative required
5. At-start "Complex defense" orders replaced by **Move orders**
6. **Pelham and Pleasonton** artillery replenish from any friendly ammo reserve
7. **Ignore LoB rules 4.2 and 4.3** — use SM game-specific versions
8. Use **SM Terrain Effects on Movement chart** (not standard LoB)
9. Use **RSS Trail movement costs**
10. **SM Special Slope rule (1.1)**: 50ft contour interval; vertical slopes impassable

## Errata (canonical corrections)

- Chicago Dragoons → **2/K/9** (not 1/K/9)
- E/2 US Artillery → rated **HvR** (not R)
- 28 Ohio Regimental Loss Chart → **15 boxes** (not 14)
- 5th Va Cavalry Brigade Loss Chart morale → **C** (not B)

## Rules Reference Guidance

When answering rules or data questions, cite which source document applies and flag:

- Whether an SM override or errata correction changes the base LoB answer
- Whether the relevant data file is still missing or not yet built
- Whether the answer comes from LOB_RULES, LOB_GAME_UPDATES, or SM_RULES (the source matters)

## Post-Plan Protocol

After any plan is implemented, run `/wrap-plan` to verify lint, formatting, and tests pass; write
a devlog entry; review CLAUDE.md for needed updates; and assess whether high-level-design.md requires
architectural revision. Do not skip this step before ending a working session.

When creating a pull request, run `/create-pr` instead of `gh pr create` directly. The command
writes a diary entry for the PR, runs the build checks, and then opens the PR.

Devlog entries are appended to a per-day file in `docs/devlog/YYYY-MM-DD.md`. Each entry
within the file is a `## HH:MM — Title` section. `docs/devlog.md` is an index only.
