<script setup>
import { computed, defineAsyncComponent, ref } from 'vue';

// ── Panel registry — #311 lazy-load each panel SFC ───────────────────────────

const PANELS = [
  {
    id: 'combat',
    label: 'Combat',
    component: defineAsyncComponent(
      () => import('../../components/tools/table-test/CombatPanel.vue')
    ),
  },
  {
    id: 'opening-volley',
    label: 'Opening Volley',
    component: defineAsyncComponent(
      () => import('../../components/tools/table-test/OpeningVolleyPanel.vue')
    ),
  },
  {
    id: 'morale',
    label: 'Morale',
    component: defineAsyncComponent(
      () => import('../../components/tools/table-test/MoralePanel.vue')
    ),
  },
  {
    id: 'morale-transition',
    label: 'Morale Transition',
    component: defineAsyncComponent(
      () => import('../../components/tools/table-test/MoraleTransitionPanel.vue')
    ),
  },
  {
    id: 'closing-roll',
    label: 'Closing Roll',
    component: defineAsyncComponent(
      () => import('../../components/tools/table-test/ClosingRollPanel.vue')
    ),
  },
  {
    id: 'leader-loss',
    label: 'Leader Loss',
    component: defineAsyncComponent(
      () => import('../../components/tools/table-test/LeaderLossPanel.vue')
    ),
  },
  {
    id: 'command-roll',
    label: 'Command Roll',
    component: defineAsyncComponent(
      () => import('../../components/tools/table-test/CommandRollPanel.vue')
    ),
  },
  {
    id: 'order-delivery',
    label: 'Order Delivery',
    component: defineAsyncComponent(
      () => import('../../components/tools/table-test/OrderDeliveryPanel.vue')
    ),
  },
  {
    id: 'fluke-stoppage',
    label: 'Fluke Stoppage',
    component: defineAsyncComponent(
      () => import('../../components/tools/table-test/FlukeStoppagePanel.vue')
    ),
  },
  {
    id: 'attack-recovery',
    label: 'Attack Recovery',
    component: defineAsyncComponent(
      () => import('../../components/tools/table-test/AttackRecoveryPanel.vue')
    ),
  },
  {
    id: 'zero-rule',
    label: 'Zero Rule',
    component: defineAsyncComponent(
      () => import('../../components/tools/table-test/ZeroRulePanel.vue')
    ),
  },
];

// ── Active panel state ─────────────────────────────────────────────────────────

const activePanelId = ref('combat');

function selectPanel(id) {
  activePanelId.value = id;
}

// #310 — computed so Vue tracks activePanelId reactivity correctly
const activePanel = computed(
  () => PANELS.find((p) => p.id === activePanelId.value)?.component ?? null
);
</script>

<template>
  <div class="table-test-view">
    <!-- Header -->
    <header class="editor-header">
      <span class="title">Table Test Tool</span>
      <span class="spacer" />
      <a class="nav-link" href="/tools/map-test">Map Test</a>
    </header>

    <!-- Body: tab bar top, panel content below -->
    <div class="editor-body">
      <!-- Panel tab selector -->
      <nav class="panel-tabs" role="tablist">
        <button
          v-for="panel in PANELS"
          :key="panel.id"
          role="tab"
          class="tab-button"
          :class="{ active: activePanelId === panel.id }"
          :aria-selected="activePanelId === panel.id"
          @click="selectPanel(panel.id)"
        >
          {{ panel.label }}
        </button>
      </nav>

      <!-- Active panel content -->
      <div class="panel-content">
        <component :is="activePanel" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.table-test-view {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background: #1a1a1a;
  color: #e0d8c8;
  font-family: Georgia, serif;
}

.editor-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background: #2a2a2a;
  border-bottom: 1px solid #444;
  flex-shrink: 0;
}

.title {
  font-size: 1rem;
  font-weight: bold;
  letter-spacing: 0.05em;
}

.spacer {
  flex: 1;
}

.nav-link {
  color: #a09880;
  font-size: 0.8rem;
  text-decoration: none;
}

.nav-link:hover {
  color: #e0d8c8;
}

.editor-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.panel-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 0.4rem 0.75rem;
  background: #222;
  border-bottom: 1px solid #444;
  flex-shrink: 0;
}

.tab-button {
  padding: 0.3rem 0.75rem;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 3px;
  color: #a09880;
  cursor: pointer;
  font-size: 0.78rem;
  font-family: Georgia, serif;
}

.tab-button:hover {
  background: #333;
  color: #e0d8c8;
}

.tab-button.active {
  background: #3a3020;
  border-color: #8a7840;
  color: #e0d8c8;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}
</style>
