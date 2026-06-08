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

// Default visibility in hexes per condition (day=unlimited, night=2, others=4)
const VISIBILITY_DEFAULTS = { day: 999, twilight: 4, night: 2, fog: 4, rain: 4 };

// Lighting schedule row being added
const newRow = ref({ startTurn: '', condition: 'day', visibilityHexes: 999 });

// ── Computed ──────────────────────────────────────────────────────────────────

const lightingSchedule = computed(() => scenarioData.value?.lightingSchedule ?? []);

// LOB §1.1 — day/twilight turns are 15 minutes, night turns are 30 minutes
const MINUTES_PER_CONDITION = { day: 15, twilight: 15, night: 30, fog: 15, rain: 15 };

// LOB §1.1 — totalTurns derived from firstTurn/lastTurn + lighting schedule turn durations.
// Walk turn-by-turn: each turn advances the clock by its condition's minutes/turn.
// The condition in effect for turn N is the last lighting entry with startTurn <= N.
const totalTurns = computed(() => {
  const ts = scenarioData.value?.turnStructure;
  const schedule = lightingSchedule.value;
  if (!ts?.firstTurn || !ts?.lastTurn) return null;

  const [fh, fm] = ts.firstTurn.split(':').map(Number);
  const [lh, lm] = ts.lastTurn.split(':').map(Number);
  const gameStartMin = fh * 60 + fm;
  const gameEndMin = lh * 60 + lm;
  if (isNaN(gameStartMin) || isNaN(gameEndMin) || gameEndMin <= gameStartMin) return null;

  const sorted = [...schedule].sort((a, b) => a.startTurn - b.startTurn);
  // Default condition if no schedule or first entry starts after turn 1
  const defaultCondition = sorted[0]?.startTurn === 1 ? sorted[0].condition : 'day';

  // turnStartMin tracks when the current turn begins. lastTurn is the START of the final turn,
  // so include turns starting at or before gameEndMin (the last-turn start time).
  let turnStartMin = gameStartMin;
  let turns = 0;
  let condIdx = 0;

  while (turnStartMin <= gameEndMin) {
    turns++;
    // Advance condIdx to the last lighting entry whose startTurn <= turns
    while (condIdx + 1 < sorted.length && sorted[condIdx + 1].startTurn <= turns) {
      condIdx++;
    }
    const condition =
      sorted.length && sorted[condIdx].startTurn <= turns
        ? sorted[condIdx].condition
        : defaultCondition;
    turnStartMin += MINUTES_PER_CONDITION[condition] ?? 15;
  }
  return turns;
});

// Returns a Map<startTurn, "HH:MM"> for every entry in the lighting schedule.
// Uses the same turn-walk logic as totalTurns to account for mixed day/night durations.
const lightingStartTimes = computed(() => {
  const ts = scenarioData.value?.turnStructure;
  const schedule = lightingSchedule.value;
  const result = new Map();
  if (!ts?.firstTurn || !schedule.length) return result;

  const [fh, fm] = ts.firstTurn.split(':').map(Number);
  const gameStartMin = fh * 60 + fm;
  if (isNaN(gameStartMin)) return result;

  const targets = new Set(schedule.map((r) => r.startTurn));
  const sorted = [...schedule].sort((a, b) => a.startTurn - b.startTurn);
  const defaultCondition = sorted[0]?.startTurn === 1 ? sorted[0].condition : 'day';

  let turnStartMin = gameStartMin;
  let turn = 1;
  let condIdx = 0;

  // Walk until all target turns have been mapped (or we've passed the last one)
  const maxTarget = Math.max(...targets);
  while (turn <= maxTarget) {
    if (targets.has(turn)) {
      const h = Math.floor(turnStartMin / 60);
      const m = turnStartMin % 60;
      result.set(turn, `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
    while (condIdx + 1 < sorted.length && sorted[condIdx + 1].startTurn <= turn) {
      condIdx++;
    }
    const condition =
      sorted.length && sorted[condIdx].startTurn <= turn
        ? sorted[condIdx].condition
        : defaultCondition;
    turnStartMin += MINUTES_PER_CONDITION[condition] ?? 15;
    turn++;
  }
  return result;
});

const gameDuration = computed(() => {
  const ts = scenarioData.value?.turnStructure;
  if (!ts) return '';
  const [fh, fm] = ts.firstTurn.split(':').map(Number);
  const [lh, lm] = ts.lastTurn.split(':').map(Number);
  const totalMin = lh * 60 + lm - (fh * 60 + fm);
  if (isNaN(totalMin) || totalMin < 0) return '';
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
    {
      startTurn: turn,
      condition: newRow.value.condition,
      visibilityHexes: newRow.value.visibilityHexes,
    },
  ].sort((a, b) => a.startTurn - b.startTurn);
  newRow.value = { startTurn: '', condition: 'day', visibilityHexes: 999 };
  markDirty();
}

function deleteLightingRow(index) {
  scenarioData.value.lightingSchedule = scenarioData.value.lightingSchedule.filter(
    (_, i) => i !== index
  );
  markDirty();
}

function updateLightingRow(index, field, value) {
  ensureLightingSchedule();
  const updated = [...scenarioData.value.lightingSchedule];
  const coerced = field === 'startTurn' || field === 'visibilityHexes' ? Number(value) : value;
  const patch = { [field]: coerced };
  // Auto-apply visibility default when condition changes
  if (field === 'condition') {
    patch.visibilityHexes = VISIBILITY_DEFAULTS[value];
  }
  updated[index] = { ...updated[index], ...patch };
  scenarioData.value.lightingSchedule = updated.sort((a, b) => a.startTurn - b.startTurn);
  markDirty();
}

function updateNewRowCondition(condition) {
  newRow.value.condition = condition;
  newRow.value.visibilityHexes = VISIBILITY_DEFAULTS[condition];
}

// ── Rules edits ───────────────────────────────────────────────────────────────

function updateField(path, value) {
  if (!scenarioData.value) return;
  const parts = path.split('.');
  if (parts.length === 1) {
    scenarioData.value[parts[0]] = value;
  } else if (parts.length === 2) {
    scenarioData.value[parts[0]] = { ...scenarioData.value[parts[0]], [parts[1]]: value };
  } else {
    return;
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
          <label class="derived-label">Total Turns</label>
          <span class="derived-value" data-testid="total-turns-display">{{
            totalTurns ?? '—'
          }}</span>
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
              <th>Time</th>
              <th>Condition</th>
              <th>Visibility (hexes)</th>
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
                <span class="derived-value" data-testid="lighting-time">{{
                  lightingStartTimes.get(row.startTurn) ?? '—'
                }}</span>
              </td>
              <td>
                <select
                  :value="row.condition"
                  @change="updateLightingRow(i, 'condition', $event.target.value)"
                >
                  <option value="day">Day</option>
                  <option value="twilight">Twilight</option>
                  <option value="night">Night</option>
                  <option value="fog">Fog</option>
                  <option value="rain">Rain</option>
                </select>
              </td>
              <td>
                <input
                  type="number"
                  class="turn-input"
                  :value="row.visibilityHexes"
                  min="1"
                  data-testid="visibility-input"
                  @change="updateLightingRow(i, 'visibilityHexes', $event.target.value)"
                />
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
          <select :value="newRow.condition" @change="updateNewRowCondition($event.target.value)">
            <option value="day">Day</option>
            <option value="twilight">Twilight</option>
            <option value="night">Night</option>
            <option value="fog">Fog</option>
            <option value="rain">Rain</option>
          </select>
          <input
            v-model.number="newRow.visibilityHexes"
            type="number"
            class="turn-input"
            min="1"
            data-testid="new-row-visibility"
          />
          <button class="add-btn" @click="addLightingRow">Add</button>
        </div>
      </section>

      <!-- Rules -->
      <section class="panel">
        <h2 class="panel-title">Rules</h2>
        <div class="field-grid">
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
