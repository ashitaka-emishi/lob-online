<script setup>
import { ref, computed, onMounted } from 'vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';

const STORAGE_KEY = 'lob-scenario-editor-south-mountain-v2';
const API_URL = '/api/tools/scenario-editor/data';

// ── State ─────────────────────────────────────────────────────────────────────

const scenarioData = ref(null);
const fetchError = ref('');
const unsaved = ref(false);
const saveStatus = ref(''); // '' | 'saving' | 'saved' | 'error'
const saveError = ref('');
const isOffline = ref(false);
const serverSavedAt = ref(0);
const isPulling = ref(false);
const pullError = ref('');
const showPushConfirm = ref(false);
const showPullConfirm = ref(false);

// Lighting schedule row being added
const newRow = ref({ startTurn: '', condition: 'day' });

// ── Computed ──────────────────────────────────────────────────────────────────

const lightingSchedule = computed(() => scenarioData.value?.lightingSchedule ?? []);

const gameDuration = computed(() => {
  const ts = scenarioData.value?.turnStructure;
  if (!ts) return '';
  const [fh, fm] = ts.firstTurn.split(':').map(Number);
  const [lh, lm] = ts.lastTurn.split(':').map(Number);
  const totalMin = lh * 60 + lm - (fh * 60 + fm);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
});

// ── Draft persistence ─────────────────────────────────────────────────────────

function saveDraft() {
  if (!scenarioData.value) return;
  try {
    const draft = { ...scenarioData.value, _savedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* ignore storage errors */
  }
}

function markDirty() {
  unsaved.value = true;
  saveDraft();
}

// ── Fetch / load ──────────────────────────────────────────────────────────────

async function fetchServerData() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchScenarioData() {
  try {
    const serverData = await fetchServerData();
    serverSavedAt.value = serverData._savedAt ?? 0;

    try {
      const draftStr = localStorage.getItem(STORAGE_KEY);
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        if ((draft._savedAt ?? 0) <= serverSavedAt.value) {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      /* ignore */
    }

    scenarioData.value = serverData;
  } catch (err) {
    // Offline fallback
    try {
      const draftStr = localStorage.getItem(STORAGE_KEY);
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        scenarioData.value = draft;
        isOffline.value = true;
        return;
      }
    } catch {
      /* ignore */
    }
    fetchError.value = err.message;
  }
}

// ── Push ──────────────────────────────────────────────────────────────────────

async function executePush() {
  if (!scenarioData.value) return;
  saveStatus.value = 'saving';
  saveError.value = '';
  try {
    const res = await fetch(API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenarioData.value),
    });
    const body = await res.json();
    if (res.ok) {
      serverSavedAt.value = body._savedAt ?? Date.now();
      unsaved.value = false;
      saveStatus.value = 'saved';
      localStorage.removeItem(STORAGE_KEY);
      setTimeout(() => {
        saveStatus.value = '';
      }, 2000);
    } else {
      saveStatus.value = 'error';
      saveError.value = body.message ?? 'Save failed';
    }
  } catch (err) {
    saveStatus.value = 'error';
    saveError.value = err.message;
  }
}

async function save() {
  if (isOffline.value) return;
  saveError.value = '';
  if (!scenarioData.value) return;

  let localDraftSavedAt = 0;
  try {
    const draftStr = localStorage.getItem(STORAGE_KEY);
    if (draftStr) localDraftSavedAt = JSON.parse(draftStr)._savedAt ?? 0;
  } catch {
    /* ignore */
  }

  if (serverSavedAt.value > localDraftSavedAt) {
    showPushConfirm.value = true;
    return;
  }

  await executePush();
}

// ── Pull ──────────────────────────────────────────────────────────────────────

async function executePull() {
  isPulling.value = true;
  pullError.value = '';
  try {
    const serverData = await fetchServerData();
    scenarioData.value = serverData;
    serverSavedAt.value = serverData._savedAt ?? 0;
    localStorage.removeItem(STORAGE_KEY);
    unsaved.value = false;
    isOffline.value = false;
  } catch (err) {
    pullError.value = err.message;
  } finally {
    isPulling.value = false;
  }
}

async function pullFromServer() {
  if (unsaved.value) {
    showPullConfirm.value = true;
    return;
  }
  await executePull();
}

// ── Turn structure edits ──────────────────────────────────────────────────────

function updateTurnStructure(field, value) {
  if (!scenarioData.value) return;
  scenarioData.value.turnStructure = { ...scenarioData.value.turnStructure, [field]: value };
  markDirty();
}

// ── Lighting schedule edits ───────────────────────────────────────────────────

function ensureLightingSchedule() {
  if (!scenarioData.value.lightingSchedule) {
    scenarioData.value.lightingSchedule = [];
  }
}

function addLightingRow() {
  const turn = parseInt(newRow.value.startTurn, 10);
  if (!turn || turn < 1) return;
  ensureLightingSchedule();
  scenarioData.value.lightingSchedule = [
    ...scenarioData.value.lightingSchedule,
    { startTurn: turn, condition: newRow.value.condition },
  ].sort((a, b) => a.startTurn - b.startTurn);
  newRow.value = { startTurn: '', condition: 'day' };
  markDirty();
}

function deleteLightingRow(index) {
  ensureLightingSchedule();
  scenarioData.value.lightingSchedule = scenarioData.value.lightingSchedule.filter(
    (_, i) => i !== index
  );
  markDirty();
}

function updateLightingRow(index, field, value) {
  ensureLightingSchedule();
  const updated = [...scenarioData.value.lightingSchedule];
  updated[index] = { ...updated[index], [field]: field === 'startTurn' ? Number(value) : value };
  scenarioData.value.lightingSchedule = updated.sort((a, b) => a.startTurn - b.startTurn);
  markDirty();
}

// ── Rules edits ───────────────────────────────────────────────────────────────

function updateField(path, value) {
  if (!scenarioData.value) return;
  const parts = path.split('.');
  if (parts.length === 1) {
    scenarioData.value[parts[0]] = value;
  } else if (parts.length === 2) {
    scenarioData.value[parts[0]] = { ...scenarioData.value[parts[0]], [parts[1]]: value };
  }
  markDirty();
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(fetchScenarioData);
</script>

<template>
  <div class="scenario-editor">
    <!-- Header -->
    <header class="editor-header">
      <span class="title">Scenario Editor</span>
      <span class="spacer" />
      <span v-if="saveStatus === 'saved'" class="save-flash">Saved</span>
      <span v-if="saveStatus === 'error'" class="save-error">Error</span>
      <span v-if="unsaved" class="unsaved-marker">* unsaved</span>
      <a class="nav-link" href="/tools/map-editor">Map Editor</a>
      <button
        class="pull-btn"
        :disabled="saveStatus === 'saving' || isPulling"
        @click="pullFromServer"
      >
        {{ isPulling ? 'Pulling…' : 'Pull from Server' }}
      </button>
      <button class="save-btn" :disabled="isOffline || saveStatus === 'saving'" @click="save">
        {{ isOffline ? 'Offline' : saveStatus === 'saving' ? 'Saving…' : 'Push to Server' }}
      </button>
    </header>

    <!-- Offline banner -->
    <div v-if="isOffline" class="offline-banner">
      <span>Server unreachable — working from local draft</span>
    </div>

    <!-- Errors -->
    <div v-if="fetchError" class="errors">
      <div class="error-line">Failed to load scenario data: {{ fetchError }}</div>
    </div>
    <div v-if="saveError" class="errors">
      <div class="error-line">{{ saveError }}</div>
    </div>
    <div v-if="pullError" class="errors">
      <div class="error-line">
        Pull failed: {{ pullError }}
        <button class="error-dismiss" @click="pullError = ''">×</button>
      </div>
    </div>

    <!-- Panels -->
    <div v-if="scenarioData" class="panels">
      <!-- Turn Structure -->
      <section class="panel">
        <h2 class="panel-title">Turn Structure</h2>
        <div class="field-grid">
          <label>First Turn</label>
          <input
            type="text"
            :value="scenarioData.turnStructure.firstTurn"
            @change="updateTurnStructure('firstTurn', $event.target.value)"
          />
          <label>Last Turn</label>
          <input
            type="text"
            :value="scenarioData.turnStructure.lastTurn"
            @change="updateTurnStructure('lastTurn', $event.target.value)"
          />
          <label>Minutes per Turn</label>
          <input
            type="number"
            :value="scenarioData.turnStructure.minutesPerTurn"
            @change="updateTurnStructure('minutesPerTurn', Number($event.target.value))"
          />
          <label>Total Turns</label>
          <input
            type="number"
            :value="scenarioData.turnStructure.totalTurns"
            @change="updateTurnStructure('totalTurns', Number($event.target.value))"
          />
          <label>First Player</label>
          <select
            :value="scenarioData.turnStructure.firstPlayer"
            @change="updateTurnStructure('firstPlayer', $event.target.value)"
          >
            <option value="union">Union</option>
            <option value="confederate">Confederate</option>
          </select>
          <label>Date</label>
          <input
            type="text"
            :value="scenarioData.turnStructure.date"
            @change="updateTurnStructure('date', $event.target.value)"
          />
          <label class="derived-label">Game Duration</label>
          <span class="derived-value">{{ gameDuration }}</span>
        </div>
      </section>

      <!-- Lighting Schedule -->
      <section class="panel">
        <h2 class="panel-title">Lighting Schedule</h2>
        <table class="lighting-table">
          <thead>
            <tr>
              <th>Start Turn</th>
              <th>Condition</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in lightingSchedule" :key="i" class="lighting-row">
              <td>
                <input
                  type="number"
                  class="turn-input"
                  :value="row.startTurn"
                  @change="updateLightingRow(i, 'startTurn', $event.target.value)"
                />
              </td>
              <td>
                <select
                  :value="row.condition"
                  @change="updateLightingRow(i, 'condition', $event.target.value)"
                >
                  <option value="day">Day</option>
                  <option value="twilight">Twilight</option>
                  <option value="night">Night</option>
                </select>
              </td>
              <td>
                <button class="delete-btn" @click="deleteLightingRow(i)">×</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="add-row">
          <input
            v-model.number="newRow.startTurn"
            type="number"
            class="turn-input"
            placeholder="Turn"
          />
          <select v-model="newRow.condition">
            <option value="day">Day</option>
            <option value="twilight">Twilight</option>
            <option value="night">Night</option>
          </select>
          <button class="add-btn" @click="addLightingRow">Add</button>
        </div>
      </section>

      <!-- Rules -->
      <section class="panel">
        <h2 class="panel-title">Rules</h2>
        <div class="field-grid">
          <label>Night Visibility Cap (hexes)</label>
          <input
            type="number"
            :value="scenarioData.nightVisibilityCap ?? 2"
            @change="updateField('nightVisibilityCap', Number($event.target.value))"
          />
          <label>Fluke Stoppage Grace Period (turns)</label>
          <input
            type="number"
            :value="scenarioData.flukeStoppageGracePeriodTurns ?? 8"
            @change="updateField('flukeStoppageGracePeriodTurns', Number($event.target.value))"
          />
          <label>Initiative System</label>
          <select
            :value="scenarioData.initiativeSystem ?? 'RSS'"
            @change="updateField('initiativeSystem', $event.target.value)"
          >
            <option value="RSS">RSS</option>
            <option value="LoB">LoB</option>
          </select>
          <label>Loose Cannon</label>
          <input
            type="checkbox"
            :checked="scenarioData.looseCannon ?? false"
            @change="updateField('looseCannon', $event.target.checked)"
          />
          <label>Loss Recovery Enabled</label>
          <input
            type="checkbox"
            :checked="scenarioData.lossRecovery?.enabled ?? false"
            @change="updateField('lossRecovery.enabled', $event.target.checked)"
          />
          <label>Loss Recovery Trigger Time</label>
          <input
            type="text"
            :value="scenarioData.lossRecovery?.triggerTime ?? ''"
            :disabled="!scenarioData.lossRecovery?.enabled"
            @change="updateField('lossRecovery.triggerTime', $event.target.value || null)"
          />
          <label>Random Events Enabled</label>
          <input
            type="checkbox"
            :checked="scenarioData.randomEventsEnabled ?? false"
            @change="updateField('randomEventsEnabled', $event.target.checked)"
          />
          <label>Random Events Timing</label>
          <input
            type="text"
            :value="scenarioData.randomEventsTiming ?? ''"
            @change="updateField('randomEventsTiming', $event.target.value)"
          />
        </div>
      </section>
    </div>

    <!-- Push confirmation -->
    <ConfirmDialog
      :show="showPushConfirm"
      message="Server data is newer. Overwrite?"
      confirm-label="Overwrite"
      cancel-label="Cancel"
      @confirm="
        showPushConfirm = false;
        executePush();
      "
      @cancel="showPushConfirm = false"
    />

    <!-- Pull confirmation -->
    <ConfirmDialog
      :show="showPullConfirm"
      message="Discard local changes and load server data?"
      confirm-label="Discard & Pull"
      cancel-label="Cancel"
      @confirm="
        showPullConfirm = false;
        executePull();
      "
      @cancel="showPullConfirm = false"
    />
  </div>
</template>

<style scoped>
.scenario-editor {
  display: flex;
  flex-direction: column;
  width: 100vw;
  min-height: 100vh;
  background: #1a1a1a;
  color: #e0d8c8;
  font-family: Georgia, serif;
}

.editor-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  background: #222;
  border-bottom: 1px solid #444;
  flex-shrink: 0;
}

.title {
  font-size: 1rem;
  font-weight: bold;
  color: #c8b89a;
}

.spacer {
  flex: 1;
}

.save-flash {
  color: #7aab6e;
  font-size: 0.85rem;
}

.save-error {
  color: #c06060;
  font-size: 0.85rem;
}

.unsaved-marker {
  color: #c8a060;
  font-size: 0.85rem;
}

.nav-link {
  color: #a09880;
  font-size: 0.8rem;
  text-decoration: none;
}

.nav-link:hover {
  color: #e0d8c8;
}

.pull-btn,
.save-btn {
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
  cursor: pointer;
  border: 1px solid #555;
  background: #2a2a2a;
  color: #c8b89a;
}

.save-btn:disabled,
.pull-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.offline-banner {
  background: #5a3a00;
  border-bottom: 1px solid #8a6a00;
  padding: 0.4rem 1rem;
  font-size: 0.85rem;
  color: #f0c060;
}

.errors {
  padding: 0.5rem 1rem;
}

.error-line {
  color: #c06060;
  font-size: 0.85rem;
}

.error-dismiss {
  background: none;
  border: none;
  color: #c06060;
  cursor: pointer;
  margin-left: 0.5rem;
}

.panels {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  max-width: 700px;
}

.panel {
  background: #222;
  border: 1px solid #444;
  padding: 1rem;
}

.panel-title {
  font-size: 0.9rem;
  color: #c8b89a;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid #444;
  padding-bottom: 0.4rem;
}

.field-grid {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 0.4rem 0.75rem;
  align-items: center;
}

.field-grid label {
  font-size: 0.82rem;
  color: #a09880;
}

.derived-label {
  color: #707060;
}

.derived-value {
  font-size: 0.82rem;
  color: #707060;
}

.field-grid input[type='text'],
.field-grid input[type='number'],
.field-grid select {
  background: #2a2a2a;
  border: 1px solid #555;
  color: #e0d8c8;
  padding: 0.2rem 0.4rem;
  font-size: 0.82rem;
  width: 100%;
}

.field-grid input[type='text']:disabled,
.field-grid input[type='number']:disabled {
  opacity: 0.4;
}

.lighting-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
  margin-bottom: 0.75rem;
}

.lighting-table th {
  text-align: left;
  color: #707060;
  padding: 0.2rem 0.4rem;
  border-bottom: 1px solid #444;
}

.lighting-table td {
  padding: 0.2rem 0.4rem;
}

.turn-input {
  width: 70px;
  background: #2a2a2a;
  border: 1px solid #555;
  color: #e0d8c8;
  padding: 0.2rem 0.4rem;
  font-size: 0.82rem;
}

.lighting-table select {
  background: #2a2a2a;
  border: 1px solid #555;
  color: #e0d8c8;
  font-size: 0.82rem;
  padding: 0.2rem 0.3rem;
}

.delete-btn {
  background: none;
  border: 1px solid #555;
  color: #c06060;
  cursor: pointer;
  padding: 0.1rem 0.4rem;
  font-size: 0.85rem;
}

.add-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.add-row select {
  background: #2a2a2a;
  border: 1px solid #555;
  color: #e0d8c8;
  font-size: 0.82rem;
  padding: 0.2rem 0.3rem;
}

.add-btn {
  background: #2a3a2a;
  border: 1px solid #4a6a4a;
  color: #7aab6e;
  cursor: pointer;
  padding: 0.2rem 0.6rem;
  font-size: 0.82rem;
}
</style>
