<script setup>
import { ref, computed, provide } from 'vue';
import { useOobStore } from '../stores/useOobStore.js';
import OobTreeNode from './OobTreeNode.vue';

const props = defineProps({
  side: {
    type: String,
    required: true,
    validator: (v) => ['union', 'confederate'].includes(v),
  },
});

const store = useOobStore();

// ── Expand/collapse all ───────────────────────────────────────────────────────
const expandSignal = ref(0);
const collapseSignal = ref(0);
provide('expandSignal', expandSignal);
provide('collapseSignal', collapseSignal);
function expandAll() {
  expandSignal.value++;
}
function collapseAll() {
  collapseSignal.value++;
}

// ── Leaders lookup (commandsId → leader) ─────────────────────────────────────
const leadersMap = computed(() => {
  const map = {};
  if (!store.leaders) return map;
  const sideLeaders = store.leaders[props.side];
  if (!sideLeaders) return map;
  Object.values(sideLeaders).forEach((group) => {
    if (Array.isArray(group)) {
      group.forEach((l) => {
        if (l.commandsId) map[l.commandsId] = l;
      });
    }
  });
  return map;
});

function withLeader(node) {
  const leader = leadersMap.value[node.id];
  return leader ? { ...node, _leader: leader } : node;
}

// ── Artillery flattening ──────────────────────────────────────────────────────
// Flatten an artillery object (keyed groups with batteries[]) into a plain
// batteries[] on the node, removing the intermediate group level.
function flattenArtillery(node) {
  if (!node.artillery || typeof node.artillery !== 'object' || Array.isArray(node.artillery)) {
    return node;
  }
  const extra = Object.values(node.artillery).flatMap((g) => g.batteries ?? []);
  return { ...node, artillery: undefined, batteries: [...(node.batteries ?? []), ...extra] };
}

// For Union corps: distribute arty to divisions and brigades, leave unmatched at corps level.
//
// Division matching (two patterns):
//   • New:    key ends with `-{div.id}`           e.g. arty1-1d-9c  → 1d-9c
//   • Legacy: key = arty{divNum}-{corpsId}        e.g. arty1-1c     → 1d-1c
//
// Brigade matching (Kanawha-style, applied after division pass):
//   • arty-{bdeNum}{divPrefix}g-{corpsId}         e.g. arty-1kg-9c  → 1b-kd-9c
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

// ── Union processing ──────────────────────────────────────────────────────────
function processUSABrigade(bde) {
  return withLeader(bde);
}

function processUSADivision(div) {
  const withArty = flattenArtillery(div);
  const brigades = (withArty.brigades ?? []).map(processUSABrigade);
  return withLeader({ ...withArty, brigades });
}

function processUSACorps(corps) {
  const distributed = distributeCorpsArtillery(corps);
  const withArty = flattenArtillery(distributed);
  const divisions = (withArty.divisions ?? []).map(processUSADivision);
  return withLeader({
    ...withArty,
    divisions,
    _hq: { id: corps.id + '-hq', name: `${corps.name} HQ` },
  });
}

// Cavalry Division: "Cavalry Division" wrapper with Pleasonton leader + HQ.
// F/cav is a brigade child with Farnsworth leader and all batteries.
function processUSACavDiv(cd) {
  const pleasonton = leadersMap.value[cd.id];
  const cavArty = cd.artillery?.['arty-fcav'];
  const fcavBde = cd.brigades?.[0];
  const farnsworth = fcavBde ? leadersMap.value[fcavBde.id] : null;
  const processedFcav = {
    ...(fcavBde ?? { id: 'fcav' }),
    name: 'F/Cav',
    ...(farnsworth ? { _leader: farnsworth } : {}),
    batteries: cavArty?.batteries ?? [],
  };
  return {
    id: cd.id,
    name: 'Cavalry Division',
    ...(pleasonton ? { _leader: pleasonton } : {}),
    _hq: { id: cd.id + '-hq', name: 'Cavalry Div HQ' },
    brigades: [processedFcav],
  };
}

// ── Confederate processing ────────────────────────────────────────────────────
function processCSABrigade(bde) {
  return withLeader(bde);
}

function divHqName(divName) {
  return divName
    .replace(/\s*\([^)]*\)/, '')
    .replace('Division', 'Div HQ')
    .trim();
}

function processCSADivision(div) {
  const withArty = flattenArtillery(div);
  const brigades = (withArty.brigades ?? []).map(processCSABrigade);
  return withLeader({
    ...withArty,
    brigades,
    _hq: { id: div.id + '-hq', name: divHqName(div.name) },
  });
}

// ── Top-level node list ───────────────────────────────────────────────────────
const topNodes = computed(() => {
  if (!store.oob) return [];
  const side = store.oob[props.side];
  if (!side) return [];

  if (props.side === 'union') {
    // Army leaders (McClellan, Burnside) — commandsId is null so not in leadersMap
    const armyLeaders = store.leaders?.union?.army ?? [];

    const armyNode = {
      id: 'usa-army',
      name: side.army ?? 'Army of the Potomac',
      _leaders: armyLeaders,
      _hq: { id: 'usa-army-hq', name: 'AotP HQ' },
      _supply: side.supplyTrain,
      corps: (side.corps ?? []).map(processUSACorps),
      cavalryDivision: side.cavalryDivision ? processUSACavDiv(side.cavalryDivision) : undefined,
    };

    return [{ node: armyNode, nodeType: 'army' }];
  }

  // ── Confederate ─────────────────────────────────────────────────────────
  // Wing leader (Longstreet) — commandsId "csa-wing"
  const wingLeader = store.leaders?.confederate?.wing?.[0] ?? null;

  const independent = side.independent
    ? {
        node: {
          id: 'independent',
          name: 'Independent',
          regiments: side.independent.cavalry ?? [],
          batteries: side.independent.artillery ?? [],
        },
        nodeType: 'independent',
      }
    : null;

  const reserveArty = side.reserveArtillery
    ? {
        node: {
          id: 'reserve-artillery',
          name: 'Reserve Artillery',
          batteries: side.reserveArtillery.batteries ?? [],
        },
        nodeType: 'reserve-arty',
      }
    : null;

  const wingNode = {
    id: 'csa-wing',
    name: side.wing ?? side.army ?? 'Left Wing',
    ...(wingLeader ? { _leader: wingLeader } : {}),
    _supply: side.supplyWagon,
    divisions: (side.divisions ?? []).map(processCSADivision),
    _formations: [independent, reserveArty].filter(Boolean),
  };

  return [{ node: wingNode, nodeType: 'wing' }];
});
</script>

<template>
  <div class="oob-hierarchy-tree">
    <div class="tree-controls">
      <button class="control-btn" @click="expandAll">Expand all</button>
      <button class="control-btn" @click="collapseAll">Collapse all</button>
    </div>
    <p v-if="topNodes.length === 0" class="empty">No data loaded.</p>
    <OobTreeNode
      v-for="entry in topNodes"
      :key="entry.node.id"
      :node="entry.node"
      :node-type="entry.nodeType"
      :depth="0"
    />
  </div>
</template>

<style scoped>
.oob-hierarchy-tree {
  padding: 0.25rem 0;
}

.tree-controls {
  display: flex;
  gap: 0.4rem;
  padding: 0.25rem 0.5rem 0.5rem;
  border-bottom: 1px solid #2a2418;
  margin-bottom: 0.25rem;
}

.control-btn {
  background: transparent;
  border: 1px solid #4a4030;
  color: #8a7860;
  font-size: 0.75rem;
  padding: 0.15rem 0.6rem;
  border-radius: 3px;
  cursor: pointer;
}

.control-btn:hover {
  background: #2a2418;
  color: #c8b89a;
}

.empty {
  color: #6a6050;
  font-style: italic;
  font-size: 0.85rem;
  padding: 0.5rem;
}
</style>
