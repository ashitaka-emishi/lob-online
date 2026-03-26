<script setup>
import { ref, computed, provide } from 'vue';
import { useOobStore } from '../stores/useOobStore.js';
import { buildDisplayTree } from '../utils/oobTreeTransform.js';
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
// Counter-based signal: watchers on each OobTreeNode react to value changes.
// Incrementing avoids the need for a reset step after each expand/collapse cycle.
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

// ── Top-level node list ───────────────────────────────────────────────────────
const topNodes = computed(() => buildDisplayTree(store.oob, store.leaders, props.side));
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
