// LOB §3 / §3.6 / §3.6a — shared unit-type/formation classification ladder. move.js
// (movement-table formation key) and activateStack.js (MP allowance lookup) previously each
// encoded this same unlimbered → limbered → cavalry/mounted → leader → infantry/line decision
// tree independently (#677) — a unit type added to one but not the other silently desynced MP
// init from the formation used for path costing. Single source of truth here; callers map the
// 'unlimbered' sentinel to whatever "cannot move" behavior they need (move.js throws,
// activateStack.js returns 0 MP), since that behavior differs by call site.
//
// NOT the same key space as two similarly-named things nearby: server/src/engine/movement.js
// has a private, differently-signatured resolveFormationKey(formation) that normalizes a
// formation STRING (e.g. 'horseArtillery' -> 'mounted') for pathCost's terrain-chart lookup.
// server/src/engine/tables/formations.js owns the LOB_CHARTS Formation Effects Chart, keyed
// '<unitType>/<formation>' (combat/facing effects, not movement allowance). This module's
// resolveMovementFormationKey classifies a game-state UNIT (not a formation string) into the
// key used to index scenario.movementCosts.movementAllowances.
export function resolveMovementFormationKey(unit, oobUnit) {
  // LOB §3.6 — unit.formation is only ever meaningful for artillery, and is trusted directly
  // (independent of OOB availability) so this classification stays correct in degraded mode
  // (ctx.oob absent — see move.js/activateStack.js's existing fallback handling).
  if (unit.formation === 'unlimbered') return 'unlimbered';
  if (unit.formation === 'limbered') return 'limbered';

  const type = oobUnit?.type;
  const isArtillery = type === 'artillery' || oobUnit?.gunType !== undefined;
  // LOB §3.6a — an artillery unit whose formation field hasn't been initialized yet (e.g. a
  // freshly set-up battery, before any LIMBER/UNLIMBER action) defaults to unlimbered, matching
  // every other artillery call site in this codebase (vp.js, actions/index.js, artillery.js all
  // use `unit.formation ?? 'unlimbered'`). Without this, such a unit would silently
  // misclassify as movable 'line' infantry — real batteries carry gunType, not type:'artillery'
  // (verified against data/modules/south-mountain/oob.json), so gunType is checked too.
  if (isArtillery) return 'unlimbered';

  if (type === 'cavalry') return 'mounted';
  if (type === 'leader') return 'leader';
  return 'line'; // infantry default
}
