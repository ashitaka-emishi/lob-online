<script setup>
import { ref, onMounted } from 'vue';
import { useOobStore } from '../../stores/useOobStore.js';
import OobHierarchyTree from '../../components/OobHierarchyTree.vue';

const store = useOobStore();
const activeSide = ref('union');

onMounted(() => {
  store.loadData();
});

function handlePull() {
  store.pullFromServer();
}

function handlePush() {
  store.pushToServer();
}
</script>

<template>
  <div class="oob-editor">
    <header class="toolbar">
      <span class="title">OOB Editor</span>
      <div class="side-toggle">
        <button :class="{ active: activeSide === 'union' }" @click="activeSide = 'union'">
          Union
        </button>
        <button
          :class="{ active: activeSide === 'confederate' }"
          @click="activeSide = 'confederate'"
        >
          Confederate
        </button>
      </div>
      <div class="toolbar-actions">
        <span v-if="store.dirty" class="unsaved-marker">●</span>
        <button class="pull-btn" @click="handlePull">Pull</button>
        <button class="push-btn" @click="handlePush">Push</button>
      </div>
    </header>
    <div class="panels">
      <aside class="sidebar">
        <OobHierarchyTree :side="activeSide" />
      </aside>
      <main class="detail-panel">
        <p v-if="!store.selectedNode" class="placeholder">Select a unit</p>
      </main>
    </div>
  </div>
</template>

<style scoped>
.oob-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1a1810;
  color: #c8b89a;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background: #13110e;
  border-bottom: 1px solid #3a3020;
}

.title {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  flex: 1;
}

.side-toggle {
  display: flex;
  gap: 0.25rem;
}

.side-toggle button {
  padding: 0.25rem 0.75rem;
  background: transparent;
  border: 1px solid #5a5040;
  color: #a09880;
  cursor: pointer;
  border-radius: 3px;
  font-size: 0.85rem;
}

.side-toggle button.active {
  background: #3a3020;
  color: #c8b89a;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.unsaved-marker {
  color: #d4a04a;
  font-size: 1rem;
}

.pull-btn,
.push-btn {
  padding: 0.25rem 0.75rem;
  background: transparent;
  border: 1px solid #5a5040;
  color: #a09880;
  cursor: pointer;
  border-radius: 3px;
  font-size: 0.85rem;
}

.pull-btn:hover,
.push-btn:hover {
  background: #2a2418;
}

.panels {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 480px;
  min-width: 480px;
  border-right: 1px solid #3a3020;
  overflow-y: auto;
  padding: 0.5rem;
}

.detail-panel {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.placeholder {
  color: #6a6050;
  font-style: italic;
}
</style>
