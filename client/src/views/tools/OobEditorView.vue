<script setup>
import { ref, onMounted } from 'vue';
import { useOobStore } from '../../stores/useOobStore.js';
import OobHierarchyTree from '../../components/OobHierarchyTree.vue';
import OobDetailPanel from '../../components/OobDetailPanel.vue';

const store = useOobStore();
const activeSide = ref('union');

onMounted(() => {
  store.loadData();
});

async function handlePull() {
  await store.pullFromServer();
}

function handlePush() {
  store.requestPush();
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
        <span v-if="store.syncError" class="sync-error" :title="store.syncError"
          >⚠ Sync failed</span
        >
        <span v-if="store.dirty" class="unsaved-marker">●</span>
        <button class="pull-btn" :disabled="store.isSyncing" @click="handlePull">
          {{ store.isSyncing ? '…' : 'Pull' }}
        </button>
        <button class="push-btn" :disabled="store.isSyncing" @click="handlePush">
          {{ store.isSyncing ? '…' : 'Push' }}
        </button>
      </div>
    </header>
    <div class="panels">
      <aside class="sidebar">
        <OobHierarchyTree :side="activeSide" />
      </aside>
      <main class="detail-panel">
        <p v-if="!store.selectedNode" class="placeholder">Select a unit</p>
        <OobDetailPanel
          v-else
          :node="store.selectedNode"
          :node-type="store.selectedNodeType"
          :node-path="store.selectedNodePath"
        />
      </main>
    </div>

    <!-- Push confirmation dialog (#207) -->
    <div v-if="store.showPushConfirm" class="confirm-overlay" @click.self="store.cancelPush()">
      <div class="confirm-dialog">
        <p class="confirm-msg">Overwrite server data with local changes?</p>
        <p class="confirm-sub">This will replace oob.json and leaders.json on the server.</p>
        <div class="confirm-actions">
          <button class="confirm-cancel" @click="store.cancelPush()">Cancel</button>
          <button class="confirm-ok" @click="store.confirmPush()">Push</button>
        </div>
      </div>
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

.sync-error {
  color: #c04040;
  font-size: 0.8rem;
  cursor: default;
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

.pull-btn:disabled,
.push-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.confirm-dialog {
  background: #1e1c14;
  border: 1px solid #5a5040;
  border-radius: 4px;
  padding: 1.5rem;
  min-width: 320px;
  max-width: 420px;
}

.confirm-msg {
  margin: 0 0 0.4rem;
  font-size: 0.95rem;
  color: #c8b89a;
}

.confirm-sub {
  margin: 0 0 1.2rem;
  font-size: 0.8rem;
  color: #7a6a50;
}

.confirm-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.confirm-cancel,
.confirm-ok {
  padding: 0.3rem 0.9rem;
  border-radius: 3px;
  font-size: 0.85rem;
  cursor: pointer;
  border: 1px solid #5a5040;
  background: transparent;
  color: #a09880;
}

.confirm-cancel:hover {
  background: #2a2418;
}

.confirm-ok {
  border-color: #8a7040;
  color: #c8a850;
}

.confirm-ok:hover {
  background: #3a2c10;
}
</style>
