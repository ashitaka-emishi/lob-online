/**
 * VP computation and victory-condition evaluation for South Mountain (RSS #4).
 *
 * SM §5.0  — VP formula: Union VP total minus Confederate VP total.
 * SM §5.1  — Terrain VP: last qualifying unit to occupy/pass through a VP hex claims control.
 *            Qualifying: non-Routed infantry or unlimbered artillery. Cavalry, leaders, wagons excluded.
 * SM §5.2  — Wreck VP: per-brigade wrecked and per-artillery eliminated, plus formation bonuses.
 * SM §5.3  — Seven outcome bands keyed on net VP difference.
 */

// ─── Terrain VP helpers ───────────────────────────────────────────────────────

/**
 * Compute terrain VP for both sides given the current hexControl map and scenario VP table.
 *
 * SM §5.1 — terrain VP is evaluated at game end from the control state snapshot.
 * Control is set during movement by updateHexControl(); this function only sums what
 * is already recorded in hexControl.
 *
 * @param {object} hexControl  — Map hex → 'union'|'confederate'|null (from state.hexControl)
 * @param {Array}  terrainVP   — scenario.victoryPoints.terrain entries
 * @returns {{ union: number, confederate: number, log: Array }}
 */
export function computeTerrainVP(hexControl, terrainVP) {
  let union = 0;
  let confederate = 0;
  const log = [];

  for (const entry of terrainVP) {
    const control = hexControl?.[entry.hex] ?? null;
    if (control === 'union' && entry.unionVP > 0) {
      union += entry.unionVP;
      log.push({ hex: entry.hex, side: 'union', vp: entry.unionVP, reason: 'terrain control' });
    } else if (control === 'confederate' && entry.confederateVP > 0) {
      confederate += entry.confederateVP;
      log.push({
        hex: entry.hex,
        side: 'confederate',
        vp: entry.confederateVP,
        reason: 'terrain control',
      });
    }
  }

  return { union, confederate, log };
}

// ─── Hex control update ───────────────────────────────────────────────────────

/**
 * Return whether a unit qualifies to claim terrain VP hex control.
 *
 * SM §5.1 — non-Routed infantry or unlimbered artillery only.
 * Cavalry (mounted or dismounted), leaders, supply wagons, and Routed units do not count.
 *
 * @param {object} unit    — UnitState
 * @param {object} oobUnit — OOB entry for the unit (for type lookup)
 * @returns {boolean}
 */
export function isVpControlEligible(unit, oobUnit) {
  if (!unit || !unit.isOnBoard) return false;
  if (unit.moraleState === 'routed') return false;

  const type = oobUnit?.type;
  const gunType = oobUnit?.gunType;

  // SM §5.1 — artillery: must be unlimbered to count for VP control
  if (gunType !== undefined) {
    return (unit.formation ?? 'unlimbered') === 'unlimbered';
  }

  // SM §5.1 — infantry only (cavalry excluded even when dismounted)
  if (type === 'infantry') return true;

  return false;
}

/**
 * Return an updated hexControl map after a unit moves to (or through) newHex.
 *
 * SM §5.1 — "the player who last occupied or moved through the hex" claims control.
 * Called by the movement handler whenever a qualifying unit enters a VP hex.
 * The vpHexSet is a Set of hex IDs that award VP (derived from scenario.victoryPoints.terrain).
 *
 * @param {object} hexControl  — current { hex: 'union'|'confederate'|null } map
 * @param {string} hex         — hex the unit moved into
 * @param {string} side        — 'union'|'confederate'
 * @param {object} unit        — UnitState
 * @param {object} oobUnit     — OOB entry for the unit
 * @param {Set}    vpHexSet    — Set of hex IDs that are VP hexes
 * @returns {object}           — updated hexControl (new object, no mutation)
 */
export function updateHexControl(hexControl, hex, side, unit, oobUnit, vpHexSet) {
  if (!vpHexSet.has(hex)) return hexControl; // not a VP hex — no change
  if (!isVpControlEligible(unit, oobUnit)) return hexControl; // not a qualifying unit
  return { ...hexControl, [hex]: side };
}

// ─── Wreck VP helpers ─────────────────────────────────────────────────────────

/**
 * Compute wreck VP for both sides from the current unit state and OOB.
 *
 * SM §5.2 — wreck VP structure:
 *   Union earns VP by wrecking Confederate formations (per brigade + division bonus).
 *   Confederate earns VP by wrecking Union formations (per brigade + division bonus).
 *   Per-artillery VP awarded for eliminated batteries (strengthPoints === 0).
 *
 * Division bonus VP (dhDivisionWrecked, etc.) is ADDITIONAL to and cumulative with
 * per-brigade VP already earned for each brigade within that division (SM §5.2 — additive).
 *
 * @param {object} units      — state.units map
 * @param {object} oob        — loaded OOB object
 * @param {object} wreckVP    — scenario.victoryPoints.wreck
 * @returns {{ union: number, confederate: number, log: Array }}
 */
export function computeWreckVP(units, oob, wreckVP) {
  let union = 0;
  let confederate = 0;
  const log = [];

  // ── Union earns VP by wrecking Confederate formations ──────────────────────

  const csaConf = wreckVP?.confederate ?? {};

  // Per-brigade wrecked (LOB §5.7 — less than 50% of printed SPs)
  for (const div of oob.confederate?.divisions ?? []) {
    for (const brig of div.brigades ?? []) {
      if (_isBrigadeWrecked(brig.id, brig, units)) {
        union += csaConf.perBrigadeWrecked ?? 0;
        log.push({
          side: 'union',
          vp: csaConf.perBrigadeWrecked,
          reason: `brigade wrecked: ${brig.id}`,
        });
      }
    }
  }

  // D.H. Hill Division bonus — SM §5.2 (additive with per-brigade VP above)
  const dhDiv = oob.confederate?.divisions?.find((d) => d.id === 'dh-div');
  if (dhDiv && _isDivisionWrecked(dhDiv, units)) {
    const bonus = csaConf.dhDivisionWrecked ?? 0;
    union += bonus;
    log.push({ side: 'union', vp: bonus, reason: 'dh-div division wrecked (bonus)' });
  }

  // Jones Division bonus
  const jDiv = oob.confederate?.divisions?.find((d) => d.id === 'j-div');
  if (jDiv && _isDivisionWrecked(jDiv, units)) {
    const bonus = csaConf.jDivisionWrecked ?? 0;
    union += bonus;
    log.push({ side: 'union', vp: bonus, reason: 'j-div division wrecked (bonus)' });
  }

  // Hood Division bonus
  const hDiv = oob.confederate?.divisions?.find((d) => d.id === 'h-div');
  if (hDiv && _isDivisionWrecked(hDiv, units)) {
    const bonus = csaConf.hDivisionWrecked ?? 0;
    union += bonus;
    log.push({ side: 'union', vp: bonus, reason: 'h-div division wrecked (bonus)' });
  }

  // 5th Va Cavalry wrecked — SM §5.2 (treated as brigade for VP purposes)
  const cav5thVa = oob.confederate?.independent?.cavalry?.find((u) => u.id === '5va-cav');
  if (cav5thVa && _isUnitWrecked('5va-cav', cav5thVa, units)) {
    const vp = csaConf['5thVaCavWrecked'] ?? 0;
    union += vp;
    log.push({ side: 'union', vp, reason: '5va-cav wrecked' });
  }

  // Confederate artillery eliminated (strengthPoints === 0)
  const perCsaArty = csaConf.perArtilleryEliminated ?? 0;
  if (perCsaArty > 0) {
    for (const side of ['reserveArtillery', 'independent']) {
      const batteries =
        side === 'reserveArtillery'
          ? (oob.confederate?.reserveArtillery?.batteries ?? [])
          : (oob.confederate?.independent?.artillery ?? []);
      for (const btry of batteries) {
        if (_isArtilleryEliminated(btry.id, units)) {
          union += perCsaArty;
          log.push({ side: 'union', vp: perCsaArty, reason: `arty eliminated: ${btry.id}` });
        }
      }
    }
    // Divisional artillery batteries
    for (const div of oob.confederate?.divisions ?? []) {
      for (const btry of div.batteries ?? []) {
        if (_isArtilleryEliminated(btry.id, units)) {
          union += perCsaArty;
          log.push({ side: 'union', vp: perCsaArty, reason: `arty eliminated: ${btry.id}` });
        }
      }
    }
  }

  // ── Confederate earns VP by wrecking Union formations ─────────────────────

  const unionConf = wreckVP?.union ?? {};

  // Per-brigade wrecked across all Union corps
  const UNION_DIV_BONUSES = {
    '1d-1c': unionConf.div1of1Wrecked ?? 0,
    '2d-1c': unionConf.div2of1Wrecked ?? 0,
    '3d-1c': unionConf.div3of1Wrecked ?? 0,
    '1d-9c': unionConf.div1of9Wrecked ?? 0,
    '2d-9c': unionConf.div2of9Wrecked ?? 0,
    '3d-9c': unionConf.div3of9Wrecked ?? 0,
    'kd-9c': unionConf.divKof9Wrecked ?? 0,
  };

  for (const corps of oob.union?.corps ?? []) {
    for (const div of corps.divisions ?? []) {
      for (const brig of div.brigades ?? []) {
        if (_isBrigadeWrecked(brig.id, brig, units)) {
          confederate += unionConf.perBrigadeWrecked ?? 0;
          log.push({
            side: 'confederate',
            vp: unionConf.perBrigadeWrecked,
            reason: `brigade wrecked: ${brig.id}`,
          });
        }
      }
      // Division bonus VP (additive with per-brigade VP above)
      const bonus = UNION_DIV_BONUSES[div.id] ?? 0;
      if (bonus > 0 && _isDivisionWrecked(div, units)) {
        confederate += bonus;
        log.push({ side: 'confederate', vp: bonus, reason: `${div.id} division wrecked (bonus)` });
      }
    }
  }

  // F/Cav brigade wrecked — SM §5.2
  const fcavBrig = oob.union?.cavalryDivision?.brigades?.find((b) => b.id === 'fcav');
  if (fcavBrig && _isBrigadeWrecked('fcav', fcavBrig, units)) {
    const vp = unionConf.fcavBrigadeWrecked ?? 0;
    confederate += vp;
    log.push({ side: 'confederate', vp, reason: 'fcav brigade wrecked' });
  }

  // Union artillery eliminated
  const perUnionArty = unionConf.perArtilleryEliminated ?? 0;
  if (perUnionArty > 0) {
    // Corps artillery
    for (const corps of oob.union?.corps ?? []) {
      for (const div of corps.divisions ?? []) {
        for (const btry of div.batteries ?? []) {
          if (_isArtilleryEliminated(btry.id, units)) {
            confederate += perUnionArty;
            log.push({
              side: 'confederate',
              vp: perUnionArty,
              reason: `arty eliminated: ${btry.id}`,
            });
          }
        }
      }
    }
    // F/Cav artillery
    for (const grp of Object.values(oob.union?.cavalryDivision?.artillery ?? {})) {
      for (const btry of grp.batteries ?? []) {
        if (_isArtilleryEliminated(btry.id, units)) {
          confederate += perUnionArty;
          log.push({
            side: 'confederate',
            vp: perUnionArty,
            reason: `arty eliminated: ${btry.id}`,
          });
        }
      }
    }
  }

  return { union, confederate, log };
}

// ─── Internal wreck-check helpers ─────────────────────────────────────────────

/**
 * True when a brigade is wrecked: at least one regiment in it is below 50% printed SPs.
 * LOB §5.7 — unit is wrecked when current SPs < 50% of printed SPs.
 * SM §5.2 — brigade VP awarded when the formation-level wreck point is exceeded.
 * For M7 we use the simplest approximation: any regiment wrecked → brigade wrecked.
 */
function _isBrigadeWrecked(_brigId, brig, units) {
  for (const regiment of brig.regiments ?? []) {
    if (_isUnitWrecked(regiment.id, regiment, units)) return true;
  }
  return false;
}

/**
 * True when a division is wrecked: all brigades in it are wrecked.
 * SM §5.2 — division bonus awarded when the whole division is wrecked.
 */
function _isDivisionWrecked(div, units) {
  const brigades = div.brigades ?? [];
  if (brigades.length === 0) return false;
  return brigades.every((brig) => _isBrigadeWrecked(brig.id, brig, units));
}

/**
 * True when a single unit (regiment / cavalry) is wrecked per LOB §5.7.
 * LOB §5.7 — less than 50% of printed SPs.
 */
function _isUnitWrecked(unitId, oobUnit, units) {
  const unitState = units[unitId];
  if (!unitState) return false;
  const printedSPs = oobUnit?.strengthPoints ?? 0;
  if (printedSPs === 0) return false;
  const currentSPs = unitState.strengthPoints ?? printedSPs;
  return currentSPs < printedSPs * 0.5;
}

/**
 * True when an artillery battery has been eliminated (strengthPoints === 0).
 * LOB §8.2 — artillery units never become Wrecked; they can only be eliminated.
 */
function _isArtilleryEliminated(unitId, units) {
  const unitState = units[unitId];
  if (!unitState) return false;
  return (unitState.strengthPoints ?? 1) === 0;
}

// ─── Full VP computation ──────────────────────────────────────────────────────

/**
 * Compute total VP for both sides at game end (or on demand for display).
 *
 * SM §5.0 — VP formula: Union VP total minus Confederate VP total.
 * Both terrain and wreck VP contribute.
 *
 * @param {object} state    — current GameState
 * @param {object} oob      — loaded OOB object
 * @param {object} scenario — loaded scenario object
 * @returns {{ union: number, confederate: number, net: number, vpLog: Array }}
 */
export function computeVP(state, oob, scenario) {
  const terrain = computeTerrainVP(state.hexControl ?? {}, scenario?.victoryPoints?.terrain ?? []);
  const wreck = computeWreckVP(state.units, oob, scenario?.victoryPoints?.wreck ?? {});

  const union = terrain.union + wreck.union;
  const confederate = terrain.confederate + wreck.confederate;
  const net = union - confederate; // SM §5.0 — positive = Union advantage

  return {
    union,
    confederate,
    net,
    vpLog: [...terrain.log, ...wreck.log],
  };
}

// ─── Victory evaluation ───────────────────────────────────────────────────────

/**
 * Evaluate the victory outcome label for a given net VP.
 *
 * SM §5.3 — seven outcome bands (Confederate Massive Victory through Union Massive Victory).
 * null min/max represent open-ended bounds (negative/positive infinity).
 *
 * @param {number} net       — net VP (union minus confederate)
 * @param {Array}  results   — scenario.victoryConditions.results entries
 * @returns {string|null}    — outcome label, or null if no band matches (data error)
 */
export function evaluateVictory(net, results) {
  if (!results || results.length === 0) return null;

  for (const band of results) {
    const min = band.min ?? -Infinity; // SM §5.3 — null min = no lower bound
    const max = band.max ?? Infinity; // SM §5.3 — null max = no upper bound
    if (net >= min && net <= max) return band.label;
  }

  return null; // should not be reached with a complete SM results table
}
