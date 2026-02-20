# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**lob-online** is an online game implementation of the _Line of Battle v2.0_ wargame system (Multi-Man Publishing). The first game being implemented is _South Mountain_ (RSS #4), chosen because it is a smaller, more tractable battle.

**Current state:** Pre-implementation. No tech stack or architecture decisions have been made. The repo is in a documentation and scoping phase — establishing the reference library, understanding the rules system, and defining data models before any code is written.

## Reference Library

All source material lives in `docs/`. The library is tracked in two parallel files that must stay in sync:

- `docs/LIBRARY.md` — human-readable manifest with status indicators (✅ available, ⬜ needed, 🔧 to be built)
- `docs/library.json` — machine-readable catalog (`"available"`, `"missing"`, `"todo"`)

### Available Source Documents

| ID               | File                            | Contents                                                                  |
| ---------------- | ------------------------------- | ------------------------------------------------------------------------- |
| LOB_RULES        | `LOBv2_Rules.pdf`               | Complete 36-page LoB v2.0 series rulebook                                 |
| LOB_CHARTS       | `LOBv2_Tables.pdf`              | 6-page combat/morale/terrain tables                                       |
| LOB_GAME_UPDATES | `LOBv2_GameSpecificUpdates.pdf` | RSS-to-LoB conversions + SM-specific rule overrides                       |
| SM_RULES         | `SM_Rules.pdf`                  | 28-page South Mountain scenario rules, terrain, reinforcements, VP system |
| SM_ROSTER        | `SM_Regimental_Roster.pdf`      | All unit statistics for both sides                                        |
| SM_ERRATA        | `SM_Errata.pdf`                 | 5 official corrections (all applied to canonical data)                    |
| SM_MAP           | `SM_Map.jpg`                    | South Mountain hex map (high-resolution image)                            |

### Planned Data Models (not yet built)

- **SM_SCENARIO_DATA**: Structured JSON from SM_Rules — at-start positions, orders, reinforcement schedule, VP hexes, ammo reserves
- **GS_OOB**: Order of Battle JSON — all units with LoB stats, morale state, full hierarchy (army > corps > division > brigade > regiment)
- **GS_LEADERS**: Leader data — ratings, command/morale values, special rule flags
- **GS_TURN**: Game state — active orders, fluke stoppage, artillery depletion, VP totals, random event log

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
