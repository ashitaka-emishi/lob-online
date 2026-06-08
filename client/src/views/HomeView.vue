<script setup>
import { RouterLink } from 'vue-router';
import { useEditorsEnabled } from '../composables/useEditorsEnabled.js';
import { useScenarioStore, SCENARIOS } from '../stores/useScenarioStore.js';

const editorsEnabled = useEditorsEnabled();
const scenarioStore = useScenarioStore();
</script>

<template>
  <div class="home">
    <div class="menu-card">
      <h1>Line of Battle Online</h1>
      <div class="scenario-selector">
        <label for="scenario-select" class="scenario-label">Scenario</label>
        <select
          id="scenario-select"
          data-testid="scenario-select"
          :value="scenarioStore.selectedSlug"
          @change="scenarioStore.setScenario($event.target.value)"
          class="scenario-select"
        >
          <option v-for="s in SCENARIOS" :key="s.slug" :value="s.slug">
            {{ s.displayName }}
          </option>
        </select>
      </div>
      <nav class="menu" aria-label="Main menu">
        <RouterLink
          :to="scenarioStore.scenarioPath('/lobby')"
          data-testid="lobby-link"
          class="menu-btn"
        >
          Lobby
        </RouterLink>
        <RouterLink
          v-if="editorsEnabled"
          :to="scenarioStore.scenarioPath('/tools/map-editor')"
          data-testid="editor-link"
          class="menu-btn editor-btn"
        >
          Editor
        </RouterLink>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh;
  background-image: url('/menu-bg.png');
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-card {
  background: rgba(10, 8, 5, 0.82);
  border: 1px solid #3a3020;
  border-radius: 6px;
  padding: 3rem 4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  min-width: 320px;
}

h1 {
  font-size: 2rem;
  letter-spacing: 0.06em;
  color: #e8d8b8;
  text-align: center;
}

.scenario-selector {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
}

.scenario-label {
  font-size: 0.75rem;
  color: #a89a7a;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.scenario-select {
  width: 100%;
  padding: 0.45rem 0.75rem;
  background: rgba(20, 15, 8, 0.85);
  border: 1px solid #5a4a30;
  border-radius: 4px;
  color: #c8b890;
  font-size: 0.95rem;
  letter-spacing: 0.03em;
  cursor: pointer;
  appearance: none;
  text-align: center;
}

.scenario-select:focus {
  outline: none;
  border-color: #8a7a50;
}

.menu {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

.menu-btn {
  display: block;
  text-align: center;
  padding: 0.6rem 2rem;
  border: 1px solid #5a4a30;
  border-radius: 4px;
  background: rgba(40, 32, 18, 0.6);
  color: #c8b890;
  text-decoration: none;
  font-size: 1rem;
  letter-spacing: 0.05em;
  transition: background 0.15s;
}

.menu-btn:hover {
  background: rgba(60, 48, 24, 0.9);
  color: #e8d8b0;
}
</style>
