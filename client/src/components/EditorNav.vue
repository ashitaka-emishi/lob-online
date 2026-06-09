<script setup>
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useEditorsEnabled } from '../composables/useEditorsEnabled.js';

const editorsEnabled = useEditorsEnabled();
const route = useRoute();

const slug = computed(() => route.params.scenarioSlug ?? 'THG');
const base = computed(() => `/scenarios/${slug.value}`);
</script>

<template>
  <nav class="editor-nav" aria-label="Editor tools">
    <template v-if="editorsEnabled">
      <RouterLink
        :to="`${base}/tools/scenario-editor`"
        data-testid="nav-scenario-editor"
        class="nav-link"
      >
        Scenario Editor
      </RouterLink>
      <RouterLink :to="`${base}/tools/map-editor`" data-testid="nav-map-editor" class="nav-link">
        Map Editor
      </RouterLink>
      <RouterLink :to="`${base}/tools/oob-editor`" data-testid="nav-oob-editor" class="nav-link">
        OOB Editor
      </RouterLink>
      <RouterLink :to="`${base}/tools/map-test`" data-testid="nav-map-test" class="nav-link">
        Map Test
      </RouterLink>
      <RouterLink :to="`${base}/tools/table-test`" data-testid="nav-table-test" class="nav-link">
        Table Test
      </RouterLink>
      <span class="nav-sep" />
    </template>
    <RouterLink to="/" data-testid="nav-home" class="nav-link nav-home">Home</RouterLink>
  </nav>
</template>

<style scoped>
.editor-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  background: rgba(10, 8, 5, 0.75);
  border-bottom: 1px solid #2a2418;
  font-size: 0.8rem;
}

.nav-link {
  color: #b8a888;
  text-decoration: none;
  padding: 0.2rem 0.5rem;
  border-radius: 3px;
  transition: background 0.12s;
  white-space: nowrap;
}

.nav-link:hover,
.nav-link.router-link-active {
  background: rgba(60, 48, 24, 0.8);
  color: #d8c8a0;
}

.nav-sep {
  flex: 1;
}

.nav-home {
  margin-left: auto;
}
</style>
