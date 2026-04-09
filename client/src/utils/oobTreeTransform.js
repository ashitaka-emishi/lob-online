// Pure data-transformation utilities that build the OOB display tree from raw oob.json /
// leaders.json data.  No Vue reactivity here — these are plain functions that can be
// unit-tested without mounting any component.

// ── Leaders lookup ─────────────────────────────────────────────────────────────────────

function buildLeadersMap(leaders, side) {
  const map = {};
  if (!leaders) return map;
  const sideLeaders = leaders[side];
  if (!sideLeaders) return map;
  Object.values(sideLeaders).forEach((group) => {
    if (Array.isArray(group)) {
      group.forEach((l) => {
        if (l.commandsId) map[l.commandsId] = l;
      });
    }
  });
  return map;
}

// Build a map of baseLeaderId → [variant, ...] from succession data.
function buildVariantsMap(succession, side) {
  const map = {};
  if (!succession) return map;
  const variants = succession[side];
  if (!Array.isArray(variants)) return map;
  variants.forEach((v) => {
    if (!map[v.baseLeaderId]) map[v.baseLeaderId] = [];
    map[v.baseLeaderId].push(v);
  });
  return map;
}

// _variants is attached to the leader object itself (node._leader._variants) rather than
// as a flat sibling on the parent node alongside _supply/_hq/_leader. This is intentional:
// variants are properties of the leader — who can command the unit — not of the unit itself.
// OobTreeNode renders them as siblings beneath the base leader row, not beneath the unit row.
function withLeader(node, leadersMap, variantsMap = {}) {
  const leader = leadersMap[node.id];
  if (!leader) return node;
  const variants = variantsMap[leader.id];
  const leaderWithVariants = variants?.length ? { ...leader, _variants: variants } : leader;
  return { ...node, _leader: leaderWithVariants };
}

// ── Artillery flattening ───────────────────────────────────────────────────────────────
// Flatten an artillery object (keyed groups with batteries[]) into a plain batteries[] on
// the node, removing the intermediate group level.

function flattenArtillery(node) {
  if (!node.artillery || typeof node.artillery !== 'object' || Array.isArray(node.artillery)) {
    return node;
  }
  const extra = Object.values(node.artillery).flatMap((g) => g.batteries ?? []);
  return { ...node, artillery: undefined, batteries: [...(node.batteries ?? []), ...extra] };
}

// ── Corps artillery distribution ───────────────────────────────────────────────────────
// For Union corps: distribute arty to divisions and brigades, leave unmatched at corps
// level.
//
// Division matching (two patterns):
//   • New:    key ends with `-{div.id}`         e.g. arty1-1d-9c  → 1d-9c
//   • Legacy: key = arty{divNum}-{corpsId}      e.g. arty1-1c     → 1d-1c
//
// Brigade matching (Kanawha-style, applied after division pass):
//   • arty-{bdeNum}{divPrefix}g-{corpsId}       e.g. arty-1kg-9c  → 1b-kd-9c

// Acceptable at South Mountain scale (~15 divisions, ~40 brigades, ~20 arty entries).
// If used with a significantly larger OOB, pre-index artyEntries into a Map for O(1)
// lookups instead of the current linear scan. (#201)
function distributeCorpsArtillery(corps) {
  if (!corps.artillery || !corps.divisions?.length) return corps;
  const artyEntries = Object.entries(corps.artillery);
  const matchedKeys = new Set();

  const divisions = corps.divisions.map((div) => {
    const divPrefix = div.id.match(/^([^d]+)d-/)?.[1];

    // Division-level match
    const divMatch = artyEntries.find(
      ([k]) =>
        !matchedKeys.has(k) &&
        (k.endsWith(`-${div.id}`) || (divPrefix && k === `arty${divPrefix}-${corps.id}`))
    );
    if (divMatch) matchedKeys.add(divMatch[0]);

    // Brigade-level match: arty-{bdeNum}{divPrefix}g-{corpsId} → {bdeNum}b-{div.id}
    const brigades = (div.brigades ?? []).map((bde) => {
      const bdeNum = bde.id.match(/^(\d+)b-/)?.[1];
      if (!bdeNum || !divPrefix) return bde;
      const bdeMatch = artyEntries.find(
        ([k]) => !matchedKeys.has(k) && k === `arty-${bdeNum}${divPrefix}g-${corps.id}`
      );
      if (!bdeMatch) return bde;
      matchedKeys.add(bdeMatch[0]);
      return { ...bde, batteries: [...(bde.batteries ?? []), ...(bdeMatch[1].batteries ?? [])] };
    });

    const divBatteries = divMatch
      ? [...(div.batteries ?? []), ...(divMatch[1].batteries ?? [])]
      : div.batteries;
    return { ...div, ...(divBatteries ? { batteries: divBatteries } : {}), brigades };
  });

  const remainingArty = Object.fromEntries(artyEntries.filter(([k]) => !matchedKeys.has(k)));
  return {
    ...corps,
    artillery: Object.keys(remainingArty).length ? remainingArty : undefined,
    divisions,
  };
}

// ── Union processing ───────────────────────────────────────────────────────────────────

function processUSABrigade(bde, leadersMap, variantsMap) {
  return withLeader(bde, leadersMap, variantsMap);
}

function processUSADivision(div, leadersMap, variantsMap) {
  const withArty = flattenArtillery(div);
  const brigades = (withArty.brigades ?? []).map((b) =>
    processUSABrigade(b, leadersMap, variantsMap)
  );
  return withLeader({ ...withArty, brigades }, leadersMap, variantsMap);
}

function processUSACorps(corps, leadersMap, variantsMap) {
  const distributed = distributeCorpsArtillery(corps);
  const withArty = flattenArtillery(distributed);
  const divisions = (withArty.divisions ?? []).map((d) =>
    processUSADivision(d, leadersMap, variantsMap)
  );
  const hqNode = corps.hq ?? { id: corps.id + '-hq', name: `${corps.name} HQ` };
  return withLeader(
    {
      ...withArty,
      divisions,
      _hq: hqNode,
      ...(corps.supply ? { _supply: corps.supply } : {}),
    },
    leadersMap,
    variantsMap
  );
}

// Cavalry Division: "Cavalry Division" wrapper with Pleasonton leader + HQ.
// F/cav is a brigade child with Farnsworth leader (including variants) and all batteries.
function processUSACavDiv(cd, leadersMap, variantsMap) {
  const cavArty = cd.artillery?.['arty-fcav'];
  const fcavBde = cd.brigades?.[0];
  const processedFcav = withLeader(
    { ...(fcavBde ?? { id: 'fcav' }), name: 'F/Cav', batteries: cavArty?.batteries ?? [] },
    leadersMap,
    variantsMap
  );
  const hqNode = cd.hq ?? { id: cd.id + '-hq', name: 'Cavalry Div HQ' };
  return withLeader(
    { id: cd.id, name: 'Cavalry Division', _hq: hqNode, brigades: [processedFcav] },
    leadersMap,
    variantsMap
  );
}

// ── Confederate processing ─────────────────────────────────────────────────────────────

function processCSABrigade(bde, leadersMap, variantsMap) {
  return withLeader(bde, leadersMap, variantsMap);
}

function divHqName(divName) {
  return divName
    .replace(/\s*\([^)]*\)/, '')
    .replace('Division', 'Div HQ')
    .trim();
}

function processCSADivision(div, leadersMap, variantsMap) {
  const withArty = flattenArtillery(div);
  const brigades = (withArty.brigades ?? []).map((b) =>
    processCSABrigade(b, leadersMap, variantsMap)
  );
  const hqNode = div.hq ?? { id: div.id + '-hq', name: divHqName(div.name) };
  return withLeader(
    {
      ...withArty,
      brigades,
      _hq: hqNode,
    },
    leadersMap,
    variantsMap
  );
}

// ── Top-level entry point ──────────────────────────────────────────────────────────────

/**
 * Build the display tree for one side from raw oob.json, leaders.json, and succession.json data.
 * Returns an array of { node, nodeType } entries suitable for OobTreeNode.
 */
export function buildDisplayTree(oob, leaders, succession, side) {
  if (!oob || !leaders) return [];
  const sideData = oob[side];
  if (!sideData) return [];

  const leadersMap = buildLeadersMap(leaders, side);
  const variantsMap = buildVariantsMap(succession, side);

  if (side === 'union') {
    // Army leaders (McClellan, Burnside) — commandsId is null so not in leadersMap
    const armyLeaders = leaders?.union?.army ?? [];

    const armyNode = {
      id: 'usa-army',
      name: sideData.army ?? 'Army of the Potomac',
      _leaders: armyLeaders,
      _hq: { id: 'usa-army-hq', name: 'AotP HQ' },
      _supply: sideData.supplyTrain,
      corps: (sideData.corps ?? []).map((c) => processUSACorps(c, leadersMap, variantsMap)),
      cavalryDivision: sideData.cavalryDivision
        ? processUSACavDiv(sideData.cavalryDivision, leadersMap, variantsMap)
        : undefined,
    };

    return [{ node: armyNode, nodeType: 'army' }];
  }

  // ── Confederate ──────────────────────────────────────────────────────────────────────
  // Wing leader (Longstreet) — commandsId "csa-wing"
  const wingLeader = leaders?.confederate?.wing?.[0] ?? null;

  const independent = sideData.independent
    ? {
        node: {
          id: 'independent',
          name: 'Independent',
          regiments: sideData.independent.cavalry ?? [],
          batteries: sideData.independent.artillery ?? [],
        },
        nodeType: 'independent',
      }
    : null;

  const reserveArty = sideData.reserveArtillery
    ? {
        node: {
          id: 'reserve-artillery',
          name: 'Reserve Artillery',
          batteries: sideData.reserveArtillery.batteries ?? [],
        },
        nodeType: 'reserve-arty',
      }
    : null;

  const wingNode = {
    id: 'csa-wing',
    name: sideData.wing ?? sideData.army ?? 'Left Wing',
    ...(wingLeader ? { _leader: wingLeader } : {}),
    _supply: sideData.supplyWagon,
    divisions: (sideData.divisions ?? []).map((d) =>
      processCSADivision(d, leadersMap, variantsMap)
    ),
    _formations: [independent, reserveArty].filter(Boolean),
  };

  return [{ node: wingNode, nodeType: 'wing' }];
}
