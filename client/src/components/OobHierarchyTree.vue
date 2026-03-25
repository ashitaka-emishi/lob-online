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

// Expand/collapse all — signals consumed by every OobTreeNode via inject
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

// ── Leaders lookup ────────────────────────────────────────────────────────────
// Flatten all leader records for the active side into a commandsId → leader map.
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

// Inject the commander (if known) into a node as _leader.
function withLeader(node) {
  const leader = leadersMap.value[node.id];
  if (!leader) return node;
  return { ...node, _leader: leader };
}

// ── Artillery distribution (Union) ────────────────────────────────────────────
// Corps-level artillery is keyed as artyN-Mc (e.g., arty1-1c).
// Division ids follow the pattern Nd-Mc (e.g., 1d-1c).
// Match by extracting N from both sides and inject the group into the division.
// Any unmatched groups remain at corps level.
function distributeArtillery(corps) {
  if (!corps.artillery || !corps.divisions?.length) return corps;

  const artyEntries = Object.entries(corps.artillery);
  const matchedKeys = new Set();

  const divisions = corps.divisions.map((div) => {
    const divPrefix = div.id.match(/^([^d]+)d-/)?.[1];
    if (!divPrefix) return div;
    const match = artyEntries.find(([k]) => k === `arty${divPrefix}-${corps.id}`);
    if (!match) return div;
    matchedKeys.add(match[0]);
    return { ...div, artillery: { [match[0]]: match[1] } };
  });

  const remainingArty = Object.fromEntries(artyEntries.filter(([k]) => !matchedKeys.has(k)));
  return {
    ...corps,
    artillery: Object.keys(remainingArty).length ? remainingArty : undefined,
    divisions,
  };
}

// Apply artillery distribution + leader injection to a corps and its divisions.
function processUnionCorps(corps) {
  const distributed = distributeArtillery(corps);
  const divisions = distributed.divisions?.map(withLeader) ?? distributed.divisions;
  return withLeader({ ...distributed, divisions });
}

// ── Top-level node list ───────────────────────────────────────────────────────
const topNodes = computed(() => {
  if (!store.oob) return [];
  const side = store.oob[props.side];
  if (!side) return [];

  if (props.side === 'union') {
    const entries = [];
    (side.corps ?? []).forEach((c) =>
      entries.push({ node: processUnionCorps(c), nodeType: 'corps' })
    );
    if (side.cavalryDivision) {
      entries.push({ node: withLeader(side.cavalryDivision), nodeType: 'division' });
    }
    return entries;
  }

  // ── Confederate ─────────────────────────────────────────────────────────
  const entries = [];
  (side.divisions ?? []).forEach((d) => entries.push({ node: d, nodeType: 'division' }));

  if (side.independent) {
    entries.push({
      node: {
        id: 'independent',
        name: 'Independent',
        regiments: side.independent.cavalry ?? [],
        batteries: side.independent.artillery ?? [],
      },
      nodeType: 'independent',
    });
  }

  if (side.reserveArtillery) {
    entries.push({
      node: {
        id: 'reserve-artillery',
        name: 'Reserve Artillery',
        batteries: side.reserveArtillery.batteries ?? [],
      },
      nodeType: 'reserve-arty',
    });
  }

  return entries;
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
