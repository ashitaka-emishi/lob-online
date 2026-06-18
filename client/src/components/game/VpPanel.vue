<script setup>
// SM §5.0–5.3 — VP display panel showing current VP totals for both sides.

defineProps({
  vp: { type: Object, default: null },
  gameOver: { type: Boolean, default: false },
  victoryResult: { type: String, default: null },
});
</script>

<template>
  <section v-if="vp || gameOver" class="vp-panel" aria-label="Victory Points">
    <div class="vp-title">Victory Points</div>
    <div v-if="vp" class="vp-totals">
      <div class="vp-row">
        <span class="vp-side union">Union</span>
        <span class="vp-value">{{ vp.union }}</span>
      </div>
      <div class="vp-row">
        <span class="vp-side confederate">Confederate</span>
        <span class="vp-value">{{ vp.confederate }}</span>
      </div>
      <div class="vp-row net">
        <span class="vp-side">Net</span>
        <span class="vp-value" :class="{ positive: vp.net > 0, negative: vp.net < 0 }">
          {{ vp.net > 0 ? '+' : '' }}{{ vp.net }}
        </span>
      </div>
    </div>
    <div v-if="gameOver && victoryResult" class="vp-result">
      {{ victoryResult }}
    </div>
  </section>
</template>

<style scoped>
.vp-panel {
  padding: 0.5rem 0;
  border-top: 1px solid #2a2418;
  color: #c8b89a;
  font-size: 0.8rem;
}

.vp-title {
  font-size: 0.75rem;
  color: #8a7a6a;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.4rem;
}

.vp-totals {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.vp-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.vp-row.net {
  border-top: 1px solid #2a2418;
  margin-top: 0.2rem;
  padding-top: 0.2rem;
  font-weight: 600;
}

.vp-side {
  color: #8a7a6a;
}

/* WCAG AA: #88a8e0 on #12100c ≈ 5.3:1 (union blue) */
.vp-side.union {
  color: #88a8e0;
}

/* WCAG AA: #e08a66 on #12100c ≈ 5.1:1 (confederate orange) */
.vp-side.confederate {
  color: #e08a66;
}

.vp-value {
  font-variant-numeric: tabular-nums;
}

.vp-value.positive {
  color: #88a8e0;
}

.vp-value.negative {
  color: #e08a66;
}

.vp-result {
  margin-top: 0.5rem;
  padding: 0.4rem 0.5rem;
  background: #1a1610;
  border: 1px solid #5a4a38;
  color: #d4b870;
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
}
</style>
