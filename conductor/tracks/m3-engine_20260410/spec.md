# Specification: M3 Engine Modules

**Track ID:** m3-engine_20260410
**Type:** Feature
**Created:** 2026-04-10
**Status:** Draft

## Summary

Implement the complete LOB v2.0 rules engine as pure-JS server modules with full Vitest
coverage: four map-based modules (`hex.js`, `scenario.js`, `movement.js`, `los.js`) and
six table modules (`weapons.js`, `combat.js`, `morale.js`, `charge.js`, `command.js`,
`leader-loss.js`). All modules live in `server/src/engine/` and are self-contained with no
game-state dependencies — M5/M6 will import and call them without rework.

## Context

M2 is complete. All five JSON data files (`map.json`, `scenario.json`, `oob.json`,
`leaders.json`, `succession.json`) have Zod schemas and Vitest coverage. M3 begins the
rules engine. This track delivers the engine foundation only — the Map Test Tool and Table
Test Tool (which call these modules via API) are separate tracks.

The authoritative movement cost data is already encoded in `scenario.json` under
`movementCosts` (digitized from the SM Rules PDF). The engine reads it — never hardcodes it.

## User Story

As a rules engine developer, I want a complete set of pure-JS LOB v2.0 rule modules so that
M5/M6 can wire them into the live game dispatch without rework.

## Acceptance Criteria

- [ ] `hex.js` provides neighbor lookup, hex distance, and Dijkstra shortest-path over the
      map graph — all verified by Vitest with known SM hex pairs
- [ ] `scenario.js` loads `scenario.json` and exposes rule flags (lighting schedule,
      visibility cap, movement costs, etc.) to all engine modules
- [ ] `movement.js` computes terrain + hexside + elevation costs per unit type/formation,
      finds the lowest-cost path (Dijkstra), and enumerates all reachable hexes within a
      movement allowance — cross-verified against the SM movement chart
- [ ] `los.js` implements the full LOS algorithm with the LOB v2.0 Slope Table, all SM
      terrain height modifiers (woods +1 not +3), and the Special Slope Rule (§1.1 —
      50-ft contour, vertical slopes impassable to LOS)
- [ ] `tables/weapons.js` encodes all weapon characteristics, max ranges, ammo types,
      Formation Effects Chart, and Activity Effects Chart from the SM rules
- [ ] `tables/combat.js` implements the Combat Table §5.6 and Opening Volley Table §5.4
      with all column shifts (range, weapon type, firepower, target terrain/formation)
- [ ] `tables/morale.js` implements Morale Table §6.1 with all modifiers and the Additive
      Morale Effects Chart §6.2a (state transitions on new results)
- [ ] `tables/charge.js` implements the Closing Roll Table §3.5 and Additional Charge
      Modifiers §7.0g
- [ ] `tables/command.js` implements Command Roll §10.6, Order Delivery §10.6a, Fluke
      Stoppage §10.7b, Attack Recovery §10.8c, and Zero Rule §9.1e
- [ ] `tables/leader-loss.js` implements the Leader Loss Table §9.1a (Other / Capture /
      Defender / Attacker variants)
- [ ] All table modules have every known (input → output) cell verified by Vitest
- [ ] Every rule implemented in code has an inline comment citing the exact rule reference
      (e.g., `// LOB §3.2`, `// SM §1.1`); no rule implementation is left without a citation
- [ ] 70% line coverage threshold met across the engine directory
- [ ] `npm run lint`, `npm run format:check`, and `npm run test` all pass

## Dependencies

- `scenario.json` — already digitized; `movementCosts` block is the authoritative movement
  chart source
- `map.json` — already digitized; `hex.js`/`movement.js`/`los.js` load it at runtime
- No Honeycomb.js — hex math (cube coordinates, neighbor lookup, distance) will be
  implemented from scratch as a lightweight internal utility; avoids a client-side library
  dependency in server code

## Out of Scope

- Map Test Tool (`/tools/map-test`) and Table Test Tool (`/tools/table-test`) — separate tracks
- Game dispatch / action pipeline (M5/M6)
- Scenario editor or OOB editor changes
- LOS panel migration from the map editor (handled in the Map Test Tool track)

## Technical Notes

- All engine modules use ES modules (`export`/`import`), no CommonJS
- Map hex IDs use `col.row` format (e.g., `"19.23"`) — `hex.js` must parse and reconstruct
  these, not treat them as opaque strings
- `gridSpec.orientation: "flat"` in `map.json` means flat-top hexagons; the `layout:
"pointy-top"` field in the same file is a legacy renderer label and should be ignored by
  the engine
- `elevationSystem.verticalSlopesImpassable: true` must be enforced in movement cost
  computation (null cost → prohibited) and in LOS (vertical hexsides block)
- `scenario.json` `movementCosts.terrainCosts` uses sentinel values: `null` = prohibited,
  `"ot"` = other terrain cost (road overlay applies), `0.5` = half MA (round up)
- Table modules export pure functions only — no module-level I/O or side effects
- **Rule traceability is mandatory:** every function, constant, or branch that implements a
  game rule must carry an inline comment citing the exact rule reference. Format:
  `// LOB §5.6 — Combat Table`, `// SM §1.1 — Special Slope Rule`. Cite at each location
  where a rule is implemented, even if the same rule appears in multiple places.
- Consult the `domain-expert` agent before coding each table to verify table cell values
  against the SM rulebook and any known errata

---

_Generated by Conductor. Review and edit as needed._
