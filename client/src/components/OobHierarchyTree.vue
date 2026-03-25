<script setup>
import { computed } from 'vue';
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

// Union: organized as corps → divisions → brigades
// Confederate (SM): no corps wrapper — divisions are the top-level nodes
const topNodes = computed(() => {
  if (!store.oob) return [];
  const side = store.oob[props.side];
  if (!side) return [];
  if (props.side === 'union') {
    return side.corps?.map((n) => ({ node: n, nodeType: 'corps' })) ?? [];
  }
  return side.divisions?.map((n) => ({ node: n, nodeType: 'division' })) ?? [];
});
</script>

<template>
  <div class="oob-hierarchy-tree">
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

.empty {
  color: #6a6050;
  font-style: italic;
  font-size: 0.85rem;
  padding: 0.5rem;
}
</style>
