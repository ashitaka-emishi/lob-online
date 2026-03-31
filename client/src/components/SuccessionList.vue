<script setup>
import { ref, computed } from 'vue';
import { useOobStore } from '../stores/useOobStore.js';

const props = defineProps({
  unitPath: {
    type: String,
    required: true,
  },
  side: {
    type: String,
    required: true, // 'union' | 'confederate'
  },
  successionIds: {
    type: Array,
    default: () => [],
  },
});

const store = useOobStore();

// ── All leaders for this side, flattened across command levels ────────────────
// 'army' is intentionally excluded — it is a plain string (army name), not an array of leaders.
const LEADER_ARRAY_KEYS = ['corps', 'cavalry', 'divisions', 'brigades'];

const allLeaders = computed(() => {
  const sideData = store.leaders?.[props.side];
  if (!sideData) return [];
  return LEADER_ARRAY_KEYS.flatMap((key) => sideData[key] ?? []);
});

// ── Resolve IDs to display names ──────────────────────────────────────────────

const resolvedItems = computed(() =>
  props.successionIds.map((id) => ({
    id,
    name: allLeaders.value.find((l) => l.id === id)?.name ?? id,
  }))
);

// ── Type-ahead search ─────────────────────────────────────────────────────────

const query = ref('');

const suggestions = computed(() => {
  if (!query.value.trim()) return [];
  const q = query.value.toLowerCase();
  return allLeaders.value
    .filter((l) => !props.successionIds.includes(l.id))
    .filter((l) => l.name?.toLowerCase().includes(q) || l.id.toLowerCase().includes(q));
});

function addLeader(leaderId) {
  store.updateSuccession(props.unitPath, [...props.successionIds, leaderId]);
  query.value = '';
}

// ── Remove and reorder ────────────────────────────────────────────────────────

function remove(idx) {
  const newIds = [...props.successionIds];
  newIds.splice(idx, 1);
  store.updateSuccession(props.unitPath, newIds);
}

function moveUp(idx) {
  if (idx === 0) return;
  const newIds = [...props.successionIds];
  [newIds[idx - 1], newIds[idx]] = [newIds[idx], newIds[idx - 1]];
  store.updateSuccession(props.unitPath, newIds);
}

function moveDown(idx) {
  if (idx === props.successionIds.length - 1) return;
  const newIds = [...props.successionIds];
  [newIds[idx], newIds[idx + 1]] = [newIds[idx + 1], newIds[idx]];
  store.updateSuccession(props.unitPath, newIds);
}
</script>

<template>
  <div class="succession-list">
    <p v-if="resolvedItems.length === 0" class="empty-notice">no succession defined</p>

    <div v-for="(item, idx) in resolvedItems" :key="item.id" class="succession-item">
      <span class="item-name">{{ item.name }}</span>
      <div class="item-actions">
        <button class="move-up-btn" title="Move up" @click="moveUp(idx)">↑</button>
        <button class="move-down-btn" title="Move down" @click="moveDown(idx)">↓</button>
        <button class="remove-btn" title="Remove" @click="remove(idx)">×</button>
      </div>
    </div>

    <div class="search-row">
      <input v-model="query" type="text" class="succession-search" placeholder="Add leader…" />
      <div v-if="suggestions.length > 0" class="suggestions">
        <button
          v-for="l in suggestions"
          :key="l.id"
          class="suggestion-item"
          @click="addLeader(l.id)"
        >
          {{ l.name }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.succession-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  width: 100%;
}

.empty-notice {
  font-size: 0.8rem;
  color: #6a6050;
  font-style: italic;
  margin: 0;
}

.succession-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: #1a1810;
  border: 1px solid #3a3020;
  border-radius: 2px;
  padding: 0.2rem 0.4rem;
}

.item-name {
  flex: 1;
  font-size: 0.8rem;
  color: #c8b89a;
}

.item-actions {
  display: flex;
  gap: 0.2rem;
}

.move-up-btn,
.move-down-btn,
.remove-btn {
  background: transparent;
  border: 1px solid #4a4030;
  color: #8a7860;
  font-size: 0.75rem;
  line-height: 1;
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
  cursor: pointer;
}

.move-up-btn:hover,
.move-down-btn:hover {
  background: #2a2418;
  color: #c8b89a;
}

.remove-btn:hover {
  background: #3a2010;
  color: #c07050;
}

.search-row {
  position: relative;
  margin-top: 0.25rem;
}

.succession-search {
  width: 100%;
  background: #1a1810;
  border: 1px solid #3a3020;
  color: #c8b89a;
  font-size: 0.8rem;
  padding: 0.25rem 0.4rem;
  border-radius: 2px;
  box-sizing: border-box;
}

.succession-search:focus {
  outline: none;
  border-color: #6a6050;
}

.suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #1e1c14;
  border: 1px solid #4a4030;
  border-top: none;
  border-radius: 0 0 2px 2px;
  z-index: 10;
  max-height: 120px;
  overflow-y: auto;
}

.suggestion-item {
  display: block;
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid #2a2818;
  color: #c8b89a;
  font-size: 0.8rem;
  text-align: left;
  padding: 0.3rem 0.5rem;
  cursor: pointer;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover {
  background: #2a2820;
  color: #e8d8ba;
}
</style>
