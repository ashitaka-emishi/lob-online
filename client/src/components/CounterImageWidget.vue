<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useOobStore } from '../stores/useOobStore.js';
import ALL_COUNTERS from '../assets/countersManifest.js';

const props = defineProps({
  counterRef: {
    type: Object,
    default: null,
  },
  nodePath: {
    type: String,
    default: null,
  },
});

const store = useOobStore();

// ── Side detection ────────────────────────────────────────────────────────────

const isUnion = computed(() => props.nodePath?.startsWith('union.') ?? false);
const isConfederate = computed(() => props.nodePath?.startsWith('confederate.') ?? false);

// ── Already-used filenames ────────────────────────────────────────────────────

function collectUsed(obj, out) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach((item) => collectUsed(item, out));
    return;
  }
  if (obj.counterRef) {
    if (obj.counterRef.front) out.add(obj.counterRef.front);
    if (obj.counterRef.back) out.add(obj.counterRef.back);
  }
  Object.values(obj).forEach((v) => collectUsed(v, out));
}

const usedFiles = computed(() => {
  const out = new Set();
  if (store.oob) collectUsed(store.oob, out);
  if (store.leaders) collectUsed(store.leaders, out);
  return out;
});

// ── File classification ───────────────────────────────────────────────────────
// Front: files with "Front" in name, or cut-outs (U## / C##)
// Back:  files with "Back" in name
// U## = Union cut-out fronts, C## = CSA cut-out fronts (CS1- files are neutral)

const IS_UNION_CUT = /^U\d/;
const IS_CSA_CUT = /^C\d/; // matches C## but NOT CS1- (next char after C is a digit)

function isFront(name) {
  return name.includes('Front') || IS_UNION_CUT.test(name) || IS_CSA_CUT.test(name);
}

function isBack(name) {
  return name.includes('Back');
}

// ── Filtered counter lists ────────────────────────────────────────────────────

function buildList(face) {
  const currentVal = face === 'front' ? props.counterRef?.front : props.counterRef?.back;
  return ALL_COUNTERS.filter((name) => {
    if (face === 'front' && !isFront(name)) return false;
    if (face === 'back' && !isBack(name)) return false;
    // Exclude cut-outs from the wrong side
    if (IS_UNION_CUT.test(name) && isConfederate.value) return false;
    if (IS_CSA_CUT.test(name) && isUnion.value) return false;
    // Exclude files already assigned elsewhere (but keep the current value)
    if (usedFiles.value.has(name) && name !== currentVal) return false;
    return true;
  });
}

const frontList = computed(() => buildList('front'));
const backList = computed(() => buildList('back'));

function getList(face) {
  return face === 'front' ? frontList.value : backList.value;
}

// ── Active slot state ─────────────────────────────────────────────────────────

const activeFace = ref(null); // 'front' | 'back' | null
const activeIndex = ref(0);

// Per-face img error flags (cleared when counterRef changes)
const imgError = ref({ front: false, back: false });
watch(
  () => props.counterRef?.front,
  () => {
    imgError.value = { ...imgError.value, front: false };
  }
);
watch(
  () => props.counterRef?.back,
  () => {
    imgError.value = { ...imgError.value, back: false };
  }
);

function activate(face) {
  if (activeFace.value === face) {
    activeFace.value = null;
    return;
  }
  activeFace.value = face;
  const list = getList(face);
  const current = face === 'front' ? props.counterRef?.front : props.counterRef?.back;
  const idx = current ? list.indexOf(current) : 0;
  activeIndex.value = idx >= 0 ? idx : 0;
  // If nothing is assigned yet, immediately show the first candidate so the
  // image is visible without requiring a keypress.
  if (!current && list.length > 0) commit();
}

// ── Keyboard cycling ──────────────────────────────────────────────────────────

function onKeydown(e) {
  if (!activeFace.value) return;
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target?.tagName)) return;
  const list = getList(activeFace.value);
  if (list.length === 0) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeIndex.value = (activeIndex.value + 1) % list.length;
    commit();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeIndex.value = (activeIndex.value - 1 + list.length) % list.length;
    commit();
  } else if (e.key === 'Escape') {
    activeFace.value = null;
  }
}

function commit() {
  if (!activeFace.value || !props.nodePath) return;
  const list = getList(activeFace.value);
  const filename = list[activeIndex.value];
  const base = props.counterRef ?? {
    front: null,
    frontConfidence: null,
    back: null,
    backConfidence: null,
  };
  store.updateCounterRef(props.nodePath, { ...base, [activeFace.value]: filename });
}

function clearFace(e, face) {
  e.stopPropagation();
  if (!props.nodePath) return;
  const base = props.counterRef ?? {
    front: null,
    frontConfidence: null,
    back: null,
    backConfidence: null,
  };
  store.updateCounterRef(props.nodePath, { ...base, [face]: null });
  if (activeFace.value === face) activeFace.value = null;
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="counter-widget">
    <p class="widget-label">Counter Images</p>
    <div class="counter-sides">
      <!-- Front -->
      <div
        class="counter-side"
        :class="{ 'counter-side--active': activeFace === 'front' }"
        @click="activate('front')"
      >
        <p class="side-label">Front</p>
        <div class="thumb-area">
          <img
            v-if="counterRef?.front && !imgError.front"
            :src="`/counters/${counterRef.front}`"
            class="thumb"
            alt="Front counter"
            @error="imgError.front = true"
          />
          <div v-else class="thumb-placeholder" />
        </div>
        <div class="slot-footer">
          <span class="slot-filename">{{ counterRef?.front ?? '—' }}</span>
          <span v-if="activeFace === 'front'" class="slot-count"
            >{{ activeIndex + 1 }}/{{ frontList.length }}</span
          >
          <button
            v-if="counterRef?.front"
            class="clear-btn"
            title="Clear"
            @click="clearFace($event, 'front')"
          >
            ×
          </button>
        </div>
      </div>

      <!-- Back -->
      <div
        class="counter-side"
        :class="{ 'counter-side--active': activeFace === 'back' }"
        @click="activate('back')"
      >
        <p class="side-label">Back</p>
        <div class="thumb-area">
          <img
            v-if="counterRef?.back && !imgError.back"
            :src="`/counters/${counterRef.back}`"
            class="thumb"
            alt="Back counter"
            @error="imgError.back = true"
          />
          <div v-else class="thumb-placeholder" />
        </div>
        <div class="slot-footer">
          <span class="slot-filename">{{ counterRef?.back ?? '—' }}</span>
          <span v-if="activeFace === 'back'" class="slot-count"
            >{{ activeIndex + 1 }}/{{ backList.length }}</span
          >
          <button
            v-if="counterRef?.back"
            class="clear-btn"
            title="Clear"
            @click="clearFace($event, 'back')"
          >
            ×
          </button>
        </div>
      </div>
    </div>
    <p class="hint">Click a slot to select, then ↑ / ↓ to cycle counters</p>
  </div>
</template>

<style scoped>
.counter-widget {
  margin-top: 1rem;
  border-top: 1px solid #3a3020;
  padding-top: 0.75rem;
}

.widget-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #8a7860;
  margin: 0 0 0.5rem;
}

.counter-sides {
  display: flex;
  gap: 0.75rem;
}

.counter-side {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 3px;
  border: 1px solid transparent;
  user-select: none;
}

.counter-side:hover {
  border-color: #4a4030;
}

.counter-side--active {
  border-color: #8a7040 !important;
  background: #1e1a10;
}

.side-label {
  font-size: 0.7rem;
  color: #7a6a50;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.thumb-area {
  width: 80px;
  height: 80px;
}

.thumb {
  width: 80px;
  height: 80px;
  object-fit: contain;
  background: #13110e;
  border: 1px solid #3a3020;
  border-radius: 3px;
}

.thumb-placeholder {
  width: 80px;
  height: 80px;
  background: #2a2418;
  border: 1px dashed #4a4030;
  border-radius: 3px;
}

.slot-footer {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 1.2rem;
}

.slot-filename {
  font-size: 0.65rem;
  color: #8a7860;
  word-break: break-all;
  flex: 1;
}

.slot-count {
  font-size: 0.65rem;
  color: #a09050;
  white-space: nowrap;
}

.clear-btn {
  background: transparent;
  border: 1px solid #5a4030;
  color: #906050;
  font-size: 0.75rem;
  line-height: 1;
  padding: 0 0.3rem;
  border-radius: 2px;
  cursor: pointer;
  flex-shrink: 0;
}

.clear-btn:hover {
  background: #3a2010;
  color: #c07050;
}

.hint {
  font-size: 0.65rem;
  color: #6a5a40;
  margin: 0.5rem 0 0;
  font-style: italic;
}
</style>
