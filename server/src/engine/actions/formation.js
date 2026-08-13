// LOB §3 — shared unit-type/formation classification ladder. move.js (movement-table formation
// key) and activateStack.js (MP allowance lookup) previously each encoded this same
// unlimbered → limbered → cavalry/mounted → leader → infantry/line decision tree independently
// (#677) — a unit type added to one but not the other silently desynced MP init from the
// formation used for path costing. Single source of truth here; callers map the 'unlimbered'
// sentinel to whatever "cannot move" behavior they need (move.js throws, activateStack.js
// returns 0 MP), since that behavior differs by call site.
export function resolveFormationKey(unit, oobUnit) {
  if (unit.formation === 'unlimbered') return 'unlimbered';
  if (unit.formation === 'limbered') return 'limbered';
  const type = oobUnit?.type;
  if (type === 'cavalry') return 'mounted';
  if (type === 'leader') return 'leader';
  return 'line'; // infantry default
}
