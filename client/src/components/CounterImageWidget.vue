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
  mode: {
    type: String,
    default: 'unit',
    validator: (v) => ['unit', 'leader'].includes(v),
  },
  // Explicit side replaces internal path-prefix detection (#486)
  side: {
    type: String,
    default: null,
    validator: (v) => v == null || ['union', 'confederate'].includes(v),
  },
});

const store = useOobStore();

// ── Side classification (driven by explicit `side` prop) ─────────────────────
const isUnion = computed(() => props.side === 'union');
const isConfederate = computed(() => props.side === 'confederate');

// ── Manifest allowlist for src validation (L1) ────────────────────────────────
// Guard against loading images from filenames not in the manifest (e.g. from
// tampered localStorage). O(1) lookup via Set.
const COUNTER_SET = new Set(ALL_COUNTERS);
function isKnownFile(name) {
  return name != null && COUNTER_SET.has(name);
}

// ── Face names ────────────────────────────────────────────────────────────────
// Single source of truth for all four face identifiers. Used to derive imgError
// shape and validate getList dispatch. Add a face here before using it elsewhere.

const FACE_NAMES = ['front', 'back', 'promotedFront', 'promotedBack'];

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
// Promoted faces share the same filtering rules as their non-promoted counterparts.

const IS_FRONT_FACE = new Set(['front', 'promotedFront']);
const IS_BACK_FACE = new Set(['back', 'promotedBack']);

function buildList(face) {
  const currentVal = props.counterRef?.[face] ?? null;
  return ALL_COUNTERS.filter((name) => {
    if (IS_FRONT_FACE.has(face) && !isFront(name)) return false;
    if (IS_BACK_FACE.has(face) && !isBack(name)) return false;
    // Exclude cut-outs from the wrong side
    if (IS_UNION_CUT.test(name) && isConfederate.value) return false;
    if (IS_CSA_CUT.test(name) && isUnion.value) return false;
    // Exclude files already assigned elsewhere (but keep the current value)
    if (store.usedCounterFiles.has(name) && name !== currentVal) return false;
    return true;
  });
}

const frontList = computed(() => buildList('front'));
const backList = computed(() => buildList('back'));
const promotedFrontList = computed(() => buildList('promotedFront'));
const promotedBackList = computed(() => buildList('promotedBack'));

const LIST_BY_FACE = {
  front: frontList,
  back: backList,
  promotedFront: promotedFrontList,
  promotedBack: promotedBackList,
};

function getList(face) {
  return LIST_BY_FACE[face]?.value ?? [];
}

// ── Active slot state ─────────────────────────────────────────────────────────

const activeFace = ref(null); // 'front' | 'back' | 'promotedFront' | 'promotedBack' | null
const activeIndex = ref(0);

// Reset active slot when the selected node changes (prevents stale activeIndex
// from writing out-of-bounds list entries as 'undefined' on the new node).
watch(
  () => props.nodePath,
  () => {
    activeFace.value = null;
    activeIndex.value = 0;
  }
);

// Per-face img error flags — reset together on any counterRef change (L3).
// Derived from FACE_NAMES so adding a face here automatically covers imgError.
const EMPTY_IMG_ERROR = Object.fromEntries(FACE_NAMES.map((f) => [f, false]));
const imgError = ref({ ...EMPTY_IMG_ERROR });
watch(
  () => props.counterRef,
  () => {
    imgError.value = { ...EMPTY_IMG_ERROR };
  }
);

function activate(face) {
  if (activeFace.value === face) {
    activeFace.value = null;
    return;
  }
  activeFace.value = face;
  const list = getList(face);
  const current = props.counterRef?.[face] ?? null;
  const idx = current ? list.indexOf(current) : 0;
  activeIndex.value = idx >= 0 ? idx : 0;
  // Activation is preview-only — use ↑/↓ to commit a selection (#211)
}

// ── Keyboard cycling ──────────────────────────────────────────────────────────
// Listener is on window so the user can click a slot to activate it and then
// cycle with arrow keys without maintaining explicit focus. ArrowDown/Up call
// preventDefault to suppress page scrolling while a slot is active. Deactivating
// (Escape or clicking the active slot) restores normal arrow-key behaviour.

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

// Returns the appropriate empty counterRef shape for this mode (HIGH-A1).
// Must be used as the null-fallback in both mutation paths (commit, clearFace)
// to prevent promoted fields being dropped by standard-face ops.
function getDefaultCounterRef() {
  const base = { front: null, frontConfidence: null, back: null, backConfidence: null };
  if (props.mode === 'leader') {
    return {
      ...base,
      promotedFront: null,
      promotedFrontConfidence: null,
      promotedBack: null,
      promotedBackConfidence: null,
    };
  }
  return base;
}

function commit() {
  if (!activeFace.value || !props.nodePath) return;
  const list = getList(activeFace.value);
  const filename = list[activeIndex.value];
  const base = props.counterRef ?? getDefaultCounterRef();
  store.updateCounterRef(props.nodePath, { ...base, [activeFace.value]: filename });
}

function clearFace(e, face) {
  e.stopPropagation();
  if (!props.nodePath) return;
  const base = props.counterRef ?? getDefaultCounterRef();
  store.updateCounterRef(props.nodePath, { ...base, [face]: null });
  if (activeFace.value === face) activeFace.value = null;
}

// ── Live announcement for screen readers ──────────────────────────────────────
const liveAnnouncement = computed(() => {
  if (!activeFace.value) return '';
  const list = getList(activeFace.value);
  const filename = list[activeIndex.value] ?? '—';
  return `${activeFace.value}: ${filename} (${activeIndex.value + 1} of ${list.length})`;
});

// ── Focus-out deactivation (#487) ─────────────────────────────────────────────
// When focus leaves the widget entirely, clear activeFace so Arrow keys no longer
// suppress page scrolling. relatedTarget is null when focus leaves the document, or
// an element outside the widget — both cases should clear.
// If focus moves to another element WITHIN the widget, relatedTarget is contained
// inside currentTarget, so activeFace is preserved.
function onFocusout(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    activeFace.value = null;
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="counter-widget" @focusout="onFocusout">
    <!-- Screen-reader live region announces the current selection as cycling occurs -->
    <span class="sr-only" aria-live="polite" aria-atomic="true">{{ liveAnnouncement }}</span>

    <p class="widget-label">Counter Images</p>
    <div class="counter-sides">
      <!-- Front -->
      <div
        class="counter-side"
        role="button"
        tabindex="0"
        :aria-pressed="activeFace === 'front'"
        :class="{ 'counter-side--active': activeFace === 'front' }"
        @click="activate('front')"
        @keydown.enter.prevent="activate('front')"
        @keydown.space.prevent="activate('front')"
      >
        <p class="side-label">Front</p>
        <div class="thumb-area">
          <img
            v-if="counterRef?.front && isKnownFile(counterRef.front) && !imgError.front"
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
            aria-label="Clear front counter"
            @click="clearFace($event, 'front')"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>

      <!-- Back -->
      <div
        class="counter-side"
        role="button"
        tabindex="0"
        :aria-pressed="activeFace === 'back'"
        :class="{ 'counter-side--active': activeFace === 'back' }"
        @click="activate('back')"
        @keydown.enter.prevent="activate('back')"
        @keydown.space.prevent="activate('back')"
      >
        <p class="side-label">Back</p>
        <div class="thumb-area">
          <img
            v-if="counterRef?.back && isKnownFile(counterRef.back) && !imgError.back"
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
            aria-label="Clear back counter"
            @click="clearFace($event, 'back')"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>
    </div>

    <p class="hint">Click a slot to activate, then ↑ / ↓ to assign a counter</p>

    <!-- Promoted row (leader mode only) -->
    <template v-if="mode === 'leader'">
      <p class="widget-label promoted-label">Promoted Counter</p>
      <div class="counter-sides promoted-row">
        <!-- Promoted Front -->
        <div
          class="counter-side"
          role="button"
          tabindex="0"
          :aria-pressed="activeFace === 'promotedFront'"
          :class="{ 'counter-side--active': activeFace === 'promotedFront' }"
          @click="activate('promotedFront')"
          @keydown.enter.prevent="activate('promotedFront')"
          @keydown.space.prevent="activate('promotedFront')"
        >
          <p class="side-label">Front</p>
          <div class="thumb-area">
            <img
              v-if="
                counterRef?.promotedFront &&
                isKnownFile(counterRef.promotedFront) &&
                !imgError.promotedFront
              "
              :src="`/counters/${counterRef.promotedFront}`"
              class="thumb"
              alt="Promoted front counter"
              @error="imgError.promotedFront = true"
            />
            <div v-else class="thumb-placeholder" />
          </div>
          <div class="slot-footer">
            <span class="slot-filename">{{ counterRef?.promotedFront ?? '—' }}</span>
            <span v-if="activeFace === 'promotedFront'" class="slot-count"
              >{{ activeIndex + 1 }}/{{ promotedFrontList.length }}</span
            >
            <button
              v-if="counterRef?.promotedFront"
              class="clear-btn"
              aria-label="Clear promoted front counter"
              @click="clearFace($event, 'promotedFront')"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </div>

        <!-- Promoted Back -->
        <div
          class="counter-side"
          role="button"
          tabindex="0"
          :aria-pressed="activeFace === 'promotedBack'"
          :class="{ 'counter-side--active': activeFace === 'promotedBack' }"
          @click="activate('promotedBack')"
          @keydown.enter.prevent="activate('promotedBack')"
          @keydown.space.prevent="activate('promotedBack')"
        >
          <p class="side-label">Back</p>
          <div class="thumb-area">
            <img
              v-if="
                counterRef?.promotedBack &&
                isKnownFile(counterRef.promotedBack) &&
                !imgError.promotedBack
              "
              :src="`/counters/${counterRef.promotedBack}`"
              class="thumb"
              alt="Promoted back counter"
              @error="imgError.promotedBack = true"
            />
            <div v-else class="thumb-placeholder" />
          </div>
          <div class="slot-footer">
            <span class="slot-filename">{{ counterRef?.promotedBack ?? '—' }}</span>
            <span v-if="activeFace === 'promotedBack'" class="slot-count"
              >{{ activeIndex + 1 }}/{{ promotedBackList.length }}</span
            >
            <button
              v-if="counterRef?.promotedBack"
              class="clear-btn"
              aria-label="Clear promoted back counter"
              @click="clearFace($event, 'promotedBack')"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.counter-widget {
  margin-top: 1rem;
  border-top: 1px solid #3a3020;
  padding-top: 0.75rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
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
  background: transparent;
  font: inherit;
  text-align: left;
  color: inherit;
}

.counter-side:hover {
  border-color: #4a4030;
}

.counter-side--active {
  border-color: #8a7040 !important;
  background: #1e1a10;
}

.counter-side:focus-visible {
  outline: 2px solid #8a7040;
  outline-offset: 1px;
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
