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

// Expand/collapse all — inject-able signals consumed by every OobTreeNode
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

// Build the list of top-level tree entries for the active side.
const topNodes = computed(() => {
  if (!store.oob) return [];
  const side = store.oob[props.side];
  if (!side) return [];

  if (props.side === 'union') {
    const entries = [];

    // Regular corps
    (side.corps ?? []).forEach((c) => entries.push({ node: c, nodeType: 'corps' }));

    // Cavalry Division appears at the same level as corps
    if (side.cavalryDivision) {
      entries.push({ node: side.cavalryDivision, nodeType: 'division' });
    }

    return entries;
  }

  // ── Confederate ─────────────────────────────────────────────────────────
  const entries = [];

  // Top-level divisions (D.H. Hill, Hood, McLaws, etc.)
  (side.divisions ?? []).forEach((d) => entries.push({ node: d, nodeType: 'division' }));

  // Independent formation — synthetic node; cavalry → regiments, artillery → batteries
  if (side.independent) {
    const indNode = {
      id: 'independent',
      name: 'Independent',
      regiments: side.independent.cavalry ?? [],
      batteries: side.independent.artillery ?? [],
    };
    entries.push({ node: indNode, nodeType: 'division' });
  }

  // Reserve Artillery — synthetic node; batteries as leaf children
  if (side.reserveArtillery) {
    const reserveNode = {
      id: 'reserve-artillery',
      name: 'Reserve Artillery',
      batteries: side.reserveArtillery.batteries ?? [],
    };
    entries.push({ node: reserveNode, nodeType: 'division' });
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
