/**
 * LOS algorithm for Line of Battle wargame — South Mountain scenario.
 * Pure functions; no framework dependencies.
 *
 * Hex coordinate system: flat-top hexes, ODD_Q offset convention
 * (evenColUp: false → honeycomb-grid offset: -1).
 * Game IDs are "CC.RR" (1-indexed, row 1 = bottom).
 */

// Terrain LOS height bonuses.
// Woods/orchard/woodedSloping use the configurable treeLosHeight (SM override: +1, not +3).
const TERRAIN_HEIGHT = {
  clear: 0,
  slopingGround: 0,
  orchard: 1,
  woods: 1,
  woodedSloping: 1,
  marsh: 0,
  unknown: 0,
};

// Cube direction deltas for flat-top hexes (dq, dr only — ds = -dq-dr)
const DIR_DELTAS = [
  { name: 'N', dq: 0, dr: -1 },
  { name: 'NE', dq: 1, dr: -1 },
  { name: 'SE', dq: 1, dr: 0 },
  { name: 'S', dq: 0, dr: 1 },
  { name: 'SW', dq: -1, dr: 1 },
  { name: 'NW', dq: -1, dr: 0 },
];

/**
 * Parse "19.23" → { col: 19, row: 23 }
 */
export function parseHexId(id) {
  const [col, row] = id.split('.').map(Number);
  return { col, row };
}

/**
 * Format { col, row } → "CC.RR" (zero-padded to 2 digits)
 */
function formatHexId(col, row) {
  return `${String(col).padStart(2, '0')}.${String(row).padStart(2, '0')}`;
}

/**
 * Game col/row → cube { q, r, s }
 * Flat-top ODD_Q offset convention (evenColUp: false).
 */
export function colRowToCube(col, row, gridSpec) {
  const hcCol = col - 1;
  const hcRow = gridSpec.rows - row;
  const q = hcCol;
  const r = hcRow - Math.floor((hcCol - (hcCol & 1)) / 2);
  const s = -q - r;
  return { q, r, s };
}

/**
 * Cube { q, r, s } → game { col, row }
 */
export function cubeToColRow(cube, gridSpec) {
  const { q, r } = cube;
  const hcCol = q;
  const hcRow = r + Math.floor((q - (q & 1)) / 2);
  const col = hcCol + 1;
  const row = gridSpec.rows - hcRow;
  return { col, row };
}

/**
 * Round fractional cube coordinates to the nearest integer cube.
 */
export function cubeRound(frac) {
  let q = Math.round(frac.q);
  let r = Math.round(frac.r);
  let s = Math.round(frac.s);
  const dq = Math.abs(q - frac.q);
  const dr = Math.abs(r - frac.r);
  const ds = Math.abs(s - frac.s);
  if (dq > dr && dq > ds) {
    q = -r - s;
  } else if (dr > ds) {
    r = -q - s;
  } else {
    s = -q - r;
  }
  return { q, r, s };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * List all hexes along the straight line from hexAId to hexBId (inclusive).
 * Returns game hex ID strings in order from A to B.
 */
export function hexLine(hexAId, hexBId, gridSpec) {
  const a = parseHexId(hexAId);
  const b = parseHexId(hexBId);
  const cubeA = colRowToCube(a.col, a.row, gridSpec);
  const cubeB = colRowToCube(b.col, b.row, gridSpec);

  const n = Math.max(
    Math.abs(cubeB.q - cubeA.q),
    Math.abs(cubeB.r - cubeA.r),
    Math.abs(cubeB.s - cubeA.s)
  );

  if (n === 0) return [hexAId];

  // Nudge to avoid ambiguous half-way points between two hexes
  const NUDGE = 1e-6;
  const aq = cubeA.q + NUDGE;
  const ar = cubeA.r + NUDGE;
  const as_ = cubeA.s - 2 * NUDGE;
  const bq = cubeB.q + NUDGE;
  const br = cubeB.r + NUDGE;
  const bs = cubeB.s - 2 * NUDGE;

  const results = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const frac = { q: lerp(aq, bq, t), r: lerp(ar, br, t), s: lerp(as_, bs, t) };
    const rounded = cubeRound(frac);
    const { col, row } = cubeToColRow(rounded, gridSpec);
    results.push(formatHexId(col, row));
  }
  return results;
}

/**
 * Return the terrain LOS height bonus for the given terrain type.
 * treeLosHeight is configurable (default 1 per SM override).
 */
function terrainBonus(terrain, treeLosHeight) {
  const base = TERRAIN_HEIGHT[terrain] ?? 0;
  return base > 0 ? treeLosHeight : 0;
}

/**
 * Find the compass direction name for a cube delta (dq, dr).
 * Returns null if the delta doesn't match any of the 6 directions.
 */
function dirFromDelta(dq, dr) {
  for (const d of DIR_DELTAS) {
    if (d.dq === dq && d.dr === dr) return d.name;
  }
  return null;
}

/**
 * Evaluate LOS between two hexes.
 *
 * @param {string} hexAId - Observer hex ID e.g. "19.23"
 * @param {string} hexBId - Target hex ID e.g. "24.18"
 * @param {Object} mapData - { hexes: HexEntry[], gridSpec: GridSpec }
 * @param {Object} [options]
 * @param {number} [options.treeLosHeight=1] - Height bonus for wooded terrain (SM: 1, base LoB: 3)
 * @returns {{ clear: boolean, steps: Step[], summary: string }}
 *
 * Step: {
 *   hexId, role, elevation, terrainBonus, effectiveHeight,
 *   losLineHeight, edgeFeatures, blocked, blockReason, noData
 * }
 */
export function evaluateLos(hexAId, hexBId, mapData, options = {}) {
  const { treeLosHeight = 1 } = options;
  const gridSpec = mapData.gridSpec ?? { cols: 64, rows: 35, evenColUp: false };

  // Build hex lookup index
  const hexIndex = {};
  for (const h of mapData.hexes ?? []) {
    hexIndex[h.hex] = h;
  }

  function getHexData(id) {
    return hexIndex[id] ?? null;
  }

  const hexAData = getHexData(hexAId);
  const hexBData = getHexData(hexBId);

  const observerElev = hexAData?.elevation ?? 0;
  const targetElev = hexBData?.elevation ?? 0;
  const observerTerrain = hexAData?.terrain ?? 'unknown';
  const targetTerrain = hexBData?.terrain ?? 'unknown';

  const observerHeight = observerElev + terrainBonus(observerTerrain, treeLosHeight);
  const targetHeight = targetElev + terrainBonus(targetTerrain, treeLosHeight);

  const line = hexLine(hexAId, hexBId, gridSpec);
  const n = line.length;

  const steps = [];
  let blocked = false;
  let blockHex = null;

  for (let i = 0; i < n; i++) {
    const id = line[i];
    const hexData = getHexData(id);
    const elev = hexData?.elevation ?? 0;
    const terrain = hexData?.terrain ?? 'unknown';
    const bonus = terrainBonus(terrain, treeLosHeight);

    const role = i === 0 ? 'observer' : i === n - 1 ? 'target' : 'intermediate';

    // t=0 at observer, t=1 at target
    const t = n > 1 ? i / (n - 1) : 0;
    const losLineHeight = lerp(observerHeight, targetHeight, t);

    // Look up entering edge features (for all hexes after the first)
    const edgeFeatures = [];
    let stepBlocked = false;
    let blockReason = null;

    if (i > 0 && !blocked) {
      const prevId = line[i - 1];
      const prev = parseHexId(prevId);
      const cur = parseHexId(id);
      const cubeP = colRowToCube(prev.col, prev.row, gridSpec);
      const cubeC = colRowToCube(cur.col, cur.row, gridSpec);

      // Direction from current hex toward previous hex = the entering edge of current hex
      const dq = cubeP.q - cubeC.q;
      const dr = cubeP.r - cubeC.r;
      const enteringDir = dirFromDelta(dq, dr);

      if (enteringDir && hexData?.edges?.[enteringDir]) {
        for (const feat of hexData.edges[enteringDir]) {
          edgeFeatures.push({ ...feat, dir: enteringDir });
          if (feat.losBlocking) {
            stepBlocked = true;
            blockReason = `edge '${feat.type}' on ${enteringDir} side blocks LOS`;
          }
        }
      }
    }

    // Edge height bonuses add to effective height
    const edgeHeightBonus = edgeFeatures.reduce((sum, f) => sum + (f.losHeightBonus ?? 0), 0);
    const effectiveHeight = elev + bonus + edgeHeightBonus;

    // Intermediate hexes also block if their effective height exceeds the LOS line
    if (!blocked && !stepBlocked && role === 'intermediate') {
      if (effectiveHeight > losLineHeight) {
        stepBlocked = true;
        blockReason = `height ${effectiveHeight} > LOS line ${losLineHeight.toFixed(1)}`;
      }
    }

    if (stepBlocked && !blocked) {
      blocked = true;
      blockHex = id;
    }

    steps.push({
      hexId: id,
      role,
      elevation: hexData?.elevation ?? null,
      terrainBonus: bonus,
      effectiveHeight,
      losLineHeight,
      edgeFeatures,
      blocked: stepBlocked,
      blockReason,
      noData: hexData === null,
    });
  }

  const clear = !blocked;
  const summary = clear
    ? `LOS clear from ${hexAId} to ${hexBId}`
    : `LOS blocked at ${blockHex} — from ${hexAId} to ${hexBId}`;

  return { clear, steps, summary };
}
