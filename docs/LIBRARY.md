# Line of Battle — South Mountain: File Library

**System:** Line of Battle v2.0 (Multi-Man Publishing)
**Game:** South Mountain, RSS #4
**Last Updated:** 2026-02-20

---

## Status Key

| Symbol | Meaning                                  |
| ------ | ---------------------------------------- |
| ✅     | File available and uploaded              |
| ⬜     | File needed but not yet sourced          |
| 🔧     | To be built (JSON model or derived data) |

---

## Series Rules & Reference

| ID               | File                            | Status | Notes                                                                                                                 |
| ---------------- | ------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------- |
| LOB_RULES        | `LOBv2_Rules.pdf`               | ✅     | Complete 36-page rulebook. Covers movement, command, morale, fire, close combat, artillery, fluke stoppage, skedaddle |
| LOB_CHARTS       | `LOBv2_Tables.pdf`              | ✅     | 6-page charts reference. Fire table, morale table, terrain effects, leader loss, order acceptance                     |
| LOB_GAME_UPDATES | `LOBv2_GameSpecificUpdates.pdf` | ✅     | RSS-to-LoB conversion rules plus SM-specific overrides for slopes, ammo reserves, command, and rule replacements      |

---

## South Mountain Game Files

| ID               | File                                          | Status | Notes                                                                                                                                                                              |
| ---------------- | --------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SM_RULES         | `SM_Rules.pdf`                                | ✅     | Full game rules, terrain, union/CSA special rules, scenario setup, reinforcement schedule, random events, VP system, loss charts, terrain movement chart                           |
| SM_ROSTER        | `SM_Regimental_Roster.pdf`                    | ✅     | All unit stats — infantry morale/weapon/strength, artillery ratings and ammo, brigade/division loss chart data                                                                     |
| SM_ERRATA        | `SM_Errata.pdf`                               | ✅     | 5 corrections: Chicago Dragoons brigade, E/2 US arty rating, 28 Ohio loss chart, 5 Va Cav morale                                                                                   |
| SM_COVER         | `SM_Cover.jpg`                                | ✅     | Game box cover art                                                                                                                                                                 |
| SM_MAP           | `SM_Map.jpg`                                  | ✅     | Hex map with terrain, elevation contours, slope hexsides, roads, VP hexes, entry area hexes                                                                                        |
| SM_SCENARIO_DATA | `data/scenarios/south-mountain/scenario.json` | ✅     | At-start positions, reinforcement schedule (with variable arrival rolls), VP hexes + thresholds, ammo reserves, random event tables, terrain movement chart. All 4 errata applied. |

---

## Data Models (M0 — built)

| ID          | File                                         | Status | Notes                                                                                                                                                                                                                                             |
| ----------- | -------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GS_OOB      | `data/scenarios/south-mountain/oob.json`     | ✅     | Full OOB JSON — 219 unit IDs. All units (infantry, cavalry, artillery) with morale/weapon/strength/straggler boxes, brigade/division hierarchy, wreck thresholds. Evans Brigade in `independentBrigades`. All errata applied.                     |
| GS_LEADERS  | `data/scenarios/south-mountain/leaders.json` | ✅     | 48 leader IDs. Army through brigade level, both sides. Special rule flags: Longstreet army-commander, Hill loose-cannon immunity, Burnside restrictions, Pleasonton replenishment, Gibbon Iron Brigade event. Counter ratings null (not in PDFs). |
| SM_MAP_DATA | `data/scenarios/south-mountain/map.json`     | 🔧     | Hex scaffold with 31 known hexes (VP hexes, setup hexes, entry hexes). Full terrain digitization from SM_Map.jpg required to reach `available`.                                                                                                   |
| GS_TURN     | _(to be built)_                              | 🔧     | Turn/game state JSON — active orders, fluke stoppage tracking, arty depletion, VP totals                                                                                                                                                          |

## Schemas & Tooling (M0 — built)

| File                                    | Purpose                                                     |
| --------------------------------------- | ----------------------------------------------------------- |
| `server/src/schemas/oob.schema.js`      | Zod schema for oob.json                                     |
| `server/src/schemas/leaders.schema.js`  | Zod schema for leaders.json                                 |
| `server/src/schemas/scenario.schema.js` | Zod schema for scenario.json                                |
| `server/src/schemas/map.schema.js`      | Zod schema for map.json                                     |
| `scripts/validate-data.js`              | Cross-reference integrity checker (`npm run validate-data`) |

---

## LoB Overrides Active for South Mountain

These replace or supplement standard LoB v2.0 rules when playing SM:

1. Trees add **+1** (not +3) to LOS height
2. All army commanders rated **Normal**
3. **No breastworks** allowed
4. **Longstreet** acts as army commander — no initiative required to issue orders
5. All "Complex defense" at-start orders replaced by **Move orders**
6. **Pelham and Pleasonton** artillery can replenish from any friendly ammo reserve
7. **Ignore LoB rules 4.2 and 4.3** — use SM game-specific versions instead
8. Use **SM Terrain Effects on Movement chart** (not standard LoB chart)
9. Use **RSS Trail movement costs**
10. Use **SM Special Slope rule (1.1)** — 50ft contour interval, vertical slopes impassable

---

## Errata Applied

All corrections from `SM_Errata.pdf` are incorporated:

- Chicago Dragoons → **2/K/9** (not 1/K/9)
- E/2 US Artillery → rated **HvR** (not R)
- 28 Ohio Regimental Loss Chart → **15 boxes** (not 14)
- 5th Va Cavalry Brigade Loss Chart morale → **C** (not B)

---

## Librarian Agent System Prompt

> You are the librarian for the Line of Battle — South Mountain wargame implementation project. Your job is to help the development team quickly locate rules, data, and reference material.
>
> You have access to the File Library manifest above. When asked a question, tell the user:
>
> - Which file(s) contain the relevant information
> - Which section or rule number to look in (if known)
> - Whether the information is in a file that's still missing or yet to be built
> - Any LoB overrides that apply to the topic for South Mountain specifically
>
> Always flag errata corrections that are relevant to the question. When answering rules questions, note whether the answer comes from the base LoB rules, the SM game-specific rules, or the LOBv2 game updates document.
