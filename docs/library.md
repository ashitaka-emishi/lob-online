# Line of Battle — File Library

**System:** Line of Battle v2.0 (Multi-Man Publishing)
**Last Updated:** 2026-06-09

---

## Status Key

| Symbol | Meaning                                  |
| ------ | ---------------------------------------- |
| ✅     | File available and uploaded              |
| ⬜     | File needed but not yet sourced          |
| 🔧     | To be built (JSON model or derived data) |

---

## Series Rules & Reference

Stored in `docs/reference/` (root level — shared across all games).

| ID               | File                            | Status | Notes                                                                                                                 |
| ---------------- | ------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------- |
| LOB_RULES        | `lob-rules.pdf`                 | ✅     | Complete 36-page rulebook. Covers movement, command, morale, fire, close combat, artillery, fluke stoppage, skedaddle |
| LOB_CHARTS       | `lob-tables.pdf`                | ✅     | 6-page charts reference. Fire table, morale table, terrain effects, leader loss, order acceptance                     |
| LOB_GAME_UPDATES | `lob-game-specific-updates.pdf` | ✅     | RSS-to-LoB conversion rules plus SM-specific overrides for slopes, ammo reserves, command, and rule replacements      |

---

## South Mountain (SM) — `docs/reference/south-mountain/`

RSS #4. The first game implemented in lob-online.

| ID               | File                                                              | Status | Notes                                                                                                                                                                              |
| ---------------- | ----------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SM_RULES         | `sm-rules.pdf`                                                    | ✅     | Full game rules, terrain, union/CSA special rules, scenario setup, reinforcement schedule, random events, VP system, loss charts, terrain movement chart                           |
| SM_ERRATA        | `sm-errata.pdf`                                                   | ✅     | 5 corrections: Chicago Dragoons brigade, E/2 US arty rating, 28 Ohio loss chart, 5 Va Cav morale                                                                                   |
| SM_ROSTER        | `sm-regimental-roster.pdf`                                        | ✅     | All unit stats — infantry morale/weapon/strength, artillery ratings and ammo, brigade/division loss chart data                                                                     |
| SM_COUNTERS      | `sm-counters.pdf`                                                 | ✅     | Extra counter sheet                                                                                                                                                                |
| SM_COUNTERS_LG   | `sm-counters-large.pdf`                                           | ✅     | Extra counter sheet (large format)                                                                                                                                                 |
| SM_COVER         | `sm-cover.jpg`                                                    | ✅     | Game box cover art                                                                                                                                                                 |
| SM_MAP           | `sm-map.jpg`                                                      | ✅     | Hex map with terrain, elevation contours, slope hexsides, roads, VP hexes, entry area hexes                                                                                        |
| SM_SCENARIO_DATA | `data/modules/south-mountain/scenarios/full-battle/scenario.json` | ✅     | At-start positions, reinforcement schedule (with variable arrival rolls), VP hexes + thresholds, ammo reserves, random event tables, terrain movement chart. All 4 errata applied. |

### SM Data Models

| ID          | File                                       | Status | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------- | ------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GS_OOB      | `data/modules/south-mountain/oob.json`     | ✅     | Full OOB JSON — 219 unit IDs. All units (infantry, cavalry, artillery) with morale/weapon/strength/straggler boxes, brigade/division hierarchy, wreck thresholds. Evans Brigade in `independentBrigades`. All errata applied.                                                                                                                                                                                                                         |
| GS_LEADERS  | `data/modules/south-mountain/leaders.json` | ✅     | 48 leader IDs. Army through brigade level, both sides. Special rule flags: Longstreet army-commander, Hill loose-cannon immunity, Burnside restrictions, Pleasonton replenishment, Gibbon Iron Brigade event. Counter ratings null (not in PDFs).                                                                                                                                                                                                     |
| SM_MAP_DATA | `data/modules/south-mountain/map.json`     | 🔧     | 2261 hexes, 0 `unknown` (map-data-recovery_20260811, #689). 100% in-grid coverage (2205/2205, 63x35 grid — #691 found the map's apparent 64th column is an unplayable partial-sliver edge hex, `gridSpec.cols` corrected accordingly). All 10/10 VP hexes reachable, 100% elevation completeness among playable hexes. 757 hexes carry real hexside features (1213 populated faces) but not yet visually audited against sm-map.jpg; tracked in #685. |
| GS_TURN     | _(to be built)_                            | 🔧     | Turn/game state JSON — active orders, fluke stoppage tracking, arty depletion, VP totals                                                                                                                                                                                                                                                                                                                                                              |

### SM LoB Overrides

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

### SM Errata Applied

All corrections from `sm-errata.pdf` are incorporated:

- Chicago Dragoons → **2/K/9** (not 1/K/9)
- E/2 US Artillery → rated **HvR** (not R)
- 28 Ohio Regimental Loss Chart → **15 boxes** (not 14)
- 5th Va Cavalry Brigade Loss Chart morale → **C** (not B)

---

## This Hallowed Ground (THG) — `docs/reference/this-hallowed-ground/`

| ID              | File                          | Status | Notes               |
| --------------- | ----------------------------- | ------ | ------------------- |
| THG_RULES       | `thg-rules.pdf`               | ✅     | Game-specific rules |
| THG_ERRATA      | `thg-errata.pdf`              | ✅     | Official errata     |
| THG_LOSS_CHARTS | `thg-brigade-loss-charts.pdf` | ✅     | Brigade loss charts |
| THG_ROSTER      | `thg-regimental-roster.pdf`   | ✅     | Regimental roster   |
| THG_ARTY        | `thg-artillery-logs.pdf`      | ✅     | Artillery logs      |
| THG_MAP_FIX     | `thg-map-correction.pdf`      | ✅     | Map corrections     |

---

## This Terrible Sound (TTS) — `docs/reference/this-terrible-sound/`

| ID              | File                        | Status | Notes               |
| --------------- | --------------------------- | ------ | ------------------- |
| TTS_RULES       | `tts-rules.pdf`             | ✅     | Game-specific rules |
| TTS_ERRATA      | `tts-errata.pdf`            | ✅     | Official errata     |
| TTS_LOSS_CHARTS | `tts-loss-charts.pdf`       | ✅     | Loss charts         |
| TTS_ROSTER      | `tts-regimental-roster.pdf` | ✅     | Regimental roster   |
| TTS_ARTY        | `tts-artillery-logs.pdf`    | ✅     | Artillery logs      |

---

## A Fearful Slaughter (AFS) — `docs/reference/a-fearful-slaughter/`

| ID                 | File                          | Status | Notes                        |
| ------------------ | ----------------------------- | ------ | ---------------------------- |
| AFS_RULES          | `afs-rules.pdf`               | ✅     | Game-specific rules          |
| AFS_ERRATA         | `afs-errata.pdf`              | ✅     | Official errata              |
| AFS_LOSS_CHARTS    | `afs-brigade-loss-charts.pdf` | ✅     | Brigade roster / loss charts |
| AFS_ROSTER         | `afs-regimental-roster.pdf`   | ✅     | Regimental roster            |
| AFS_ARTY           | `afs-artillery.pdf`           | ✅     | Artillery sheets             |
| AFS_REINFORCEMENTS | `afs-reinforcement-list.pdf`  | ✅     | Reinforcement charts         |

---

## Last Chance for Victory (LCV) — `docs/reference/last-chance-for-victory/`

| ID                 | File                             | Status | Notes                                |
| ------------------ | -------------------------------- | ------ | ------------------------------------ |
| LCV_RULES          | `lcv-rules.pdf`                  | ✅     | Game-specific rules                  |
| LCV_SCENARIOS      | `lcv-scenarios.pdf`              | ✅     | Scenarios booklet                    |
| LCV_ERRATA         | `lcv-errata.pdf`                 | ✅     | Official errata                      |
| LCV_CLARIFICATIONS | `lcv-clarifications-errata.pdf`  | ✅     | Compiled CSW clarifications + errata |
| LCV_OOA_REB        | `lcv-rebel-ooa.pdf`              | ✅     | Rebel order of appearance            |
| LCV_OOA_UNION      | `lcv-union-ooa.pdf`              | ✅     | Union order of appearance            |
| LCV_LOSS_CHARTS    | `lcv-regimental-loss-charts.pdf` | ✅     | Regimental loss charts               |
| LCV_MAP_C          | `lcv-map-c-stoney-hill-cut.pdf`  | ✅     | Map C — Stoney Hill Cut              |
| LCV_SCENARIO_7_5   | `lcv-scenario-7-5.pdf`           | ✅     | Original scenario 7.5 + map          |
| LCV_BONUS          | `lcv-cold-steel-scenario.jpg`    | ✅     | Bonus Cold Steel scenario            |

---

## None But Heroes (NBH) — `docs/reference/none-but-heroes/`

| ID            | File                             | Status | Notes                  |
| ------------- | -------------------------------- | ------ | ---------------------- |
| NBH_RULES     | `nbh-rules.pdf`                  | ✅     | Game-specific rules    |
| NBH_ERRATA    | `nbh-errata.pdf`                 | ✅     | Official errata        |
| NBH_LOSS_BRIG | `nbh-brigade-loss-charts.pdf`    | ✅     | Brigade loss charts    |
| NBH_LOSS_REG  | `nbh-regimental-loss-charts.pdf` | ✅     | Regimental loss charts |

---

## To Take Washington (TTW) — `docs/reference/to-take-washington/`

| ID           | File                    | Status | Notes                      |
| ------------ | ----------------------- | ------ | -------------------------- |
| TTW_RULES    | `ttw-rules.pdf`         | ✅     | Game-specific rules        |
| TTW_ERRATA   | `ttw-errata.pdf`        | ✅     | Official errata            |
| TTW_ROSTER_C | `ttw-roster-cissel.pdf` | ✅     | Regimental roster (Cissel) |
| TTW_ROSTER_R | `ttw-roster-roser.pdf`  | ✅     | Regimental roster (Roser)  |

---

## Schemas & Tooling

| File                                    | Purpose                                                     |
| --------------------------------------- | ----------------------------------------------------------- |
| `server/src/schemas/oob.schema.js`      | Zod schema for oob.json                                     |
| `server/src/schemas/leaders.schema.js`  | Zod schema for leaders.json                                 |
| `server/src/schemas/scenario.schema.js` | Zod schema for scenario.json                                |
| `server/src/schemas/map.schema.js`      | Zod schema for map.json                                     |
| `scripts/validate-data.js`              | Cross-reference integrity checker (`npm run validate-data`) |

---

## Librarian Agent System Prompt

> You are the librarian for the Line of Battle wargame implementation project. Your job is to help the development team quickly locate rules, data, and reference material.
>
> You have access to the File Library manifest above. When asked a question, tell the user:
>
> - Which file(s) contain the relevant information
> - Which section or rule number to look in (if known)
> - Whether the information is in a file that's still missing or yet to be built
> - Any LoB overrides that apply to the topic for the specific game in question
>
> Always flag errata corrections that are relevant to the question. When answering rules questions, note whether the answer comes from the base LoB rules, the game-specific rules, or the LOBv2 game updates document.
