<script setup>
import { ref } from 'vue';
import { useOobStore } from '../stores/useOobStore.js';

const props = defineProps({
  counterRef: {
    type: Object,
    default: null,
  },
  nodePath: {
    type: String,
    required: true,
  },
});

const store = useOobStore();

// Track per-side image load errors
const frontError = ref(false);
const backError = ref(false);

function onFrontError() {
  frontError.value = true;
}
function onBackError() {
  backError.value = true;
}

// Reset error flag when filename changes so the img re-attempts load
function frontSrc() {
  frontError.value = false;
  return props.counterRef?.front ? `/counters/${props.counterRef.front}` : null;
}
function backSrc() {
  backError.value = false;
  return props.counterRef?.back ? `/counters/${props.counterRef.back}` : null;
}

// ── Upload ────────────────────────────────────────────────────────────────────

const frontFileInput = ref(null);
const backFileInput = ref(null);
const uploadError = ref(null);

async function uploadFile(file, side) {
  uploadError.value = null;
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res = await fetch('/api/counters/upload', { method: 'POST', body: fd });
    if (!res.ok) {
      uploadError.value = `Upload failed (${res.status})`;
      return;
    }
    const { filename } = await res.json();
    store.updateCounterRef(props.nodePath, { ...props.counterRef, [side]: filename });
  } catch (err) {
    uploadError.value = err?.message ?? 'Upload failed';
  }
}

function onFrontFileChange(e) {
  const file = e.target.files?.[0];
  if (file) uploadFile(file, 'front');
}
function onBackFileChange(e) {
  const file = e.target.files?.[0];
  if (file) uploadFile(file, 'back');
}

// ── Manual filename editing ───────────────────────────────────────────────────

function onFrontNameChange(e) {
  store.updateCounterRef(props.nodePath, { ...props.counterRef, front: e.target.value || null });
}
function onBackNameChange(e) {
  store.updateCounterRef(props.nodePath, { ...props.counterRef, back: e.target.value || null });
}
</script>

<template>
  <div class="counter-widget">
    <p class="widget-label">Counter Images</p>
    <p v-if="uploadError" class="upload-error">{{ uploadError }}</p>

    <div class="counter-sides">
      <!-- Front -->
      <div class="counter-side">
        <p class="side-label">Front</p>
        <div class="thumb-area">
          <img
            v-if="counterRef?.front && !frontError"
            :src="`/counters/${counterRef.front}`"
            class="thumb"
            alt="Front counter"
            @error="onFrontError"
          />
          <div v-else class="thumb-placeholder">
            <span>No image</span>
            <button class="browse-btn" @click="frontFileInput.click()">Browse…</button>
          </div>
        </div>
        <input
          ref="frontFileInput"
          type="file"
          accept="image/*"
          class="file-input-hidden"
          @change="onFrontFileChange"
        />
        <input
          type="text"
          class="filename-input"
          :value="counterRef?.front ?? ''"
          placeholder="filename.png"
          @change="onFrontNameChange"
        />
      </div>

      <!-- Back -->
      <div class="counter-side">
        <p class="side-label">Back</p>
        <div class="thumb-area">
          <img
            v-if="counterRef?.back && !backError"
            :src="`/counters/${counterRef.back}`"
            class="thumb"
            alt="Back counter"
            @error="onBackError"
          />
          <div v-else class="thumb-placeholder">
            <span>No image</span>
            <button class="browse-btn" @click="backFileInput.click()">Browse…</button>
          </div>
        </div>
        <input
          ref="backFileInput"
          type="file"
          accept="image/*"
          class="file-input-hidden"
          @change="onBackFileChange"
        />
        <input
          type="text"
          class="filename-input"
          :value="counterRef?.back ?? ''"
          placeholder="filename.png"
          @change="onBackNameChange"
        />
      </div>
    </div>
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

.upload-error {
  color: #c04040;
  font-size: 0.8rem;
  margin: 0 0 0.5rem;
}

.counter-sides {
  display: flex;
  gap: 1rem;
}

.counter-side {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
}

.thumb-placeholder span {
  font-size: 0.65rem;
  color: #6a6050;
}

.browse-btn {
  background: transparent;
  border: 1px solid #5a5040;
  color: #a09880;
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
  border-radius: 2px;
  cursor: pointer;
}

.browse-btn:hover {
  background: #3a3020;
}

.file-input-hidden {
  display: none;
}

.filename-input {
  width: 100%;
  background: #1a1810;
  border: 1px solid #3a3020;
  color: #c8b89a;
  font-size: 0.7rem;
  padding: 0.2rem 0.35rem;
  border-radius: 2px;
  box-sizing: border-box;
}

.filename-input:focus {
  outline: none;
  border-color: #6a6050;
}
</style>
