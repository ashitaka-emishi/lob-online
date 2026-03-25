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

const corpsNodes = computed(() => {
  if (!store.oob) return [];
  return store.oob[props.side]?.corps ?? [];
});
</script>

<template>
  <div class="oob-hierarchy-tree">
    <p v-if="corpsNodes.length === 0" class="empty">No data loaded.</p>
    <OobTreeNode v-for="corps in corpsNodes" :key="corps.id" :node="corps" node-type="corps" />
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
