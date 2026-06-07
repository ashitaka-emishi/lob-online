<script setup>
import { RouterLink } from 'vue-router';

const editorsEnabled = import.meta.env.VITE_MAP_EDITOR_ENABLED === 'true';
</script>

<template>
  <nav class="editor-nav">
    <template v-if="editorsEnabled">
      <RouterLink to="/tools/map-editor" data-testid="nav-map-editor" class="nav-link">
        Map Editor
      </RouterLink>
      <RouterLink to="/tools/oob-editor" data-testid="nav-oob-editor" class="nav-link">
        OOB Editor
      </RouterLink>
      <RouterLink to="/tools/map-test" data-testid="nav-map-test" class="nav-link">
        Map Test
      </RouterLink>
      <RouterLink to="/tools/table-test" data-testid="nav-table-test" class="nav-link">
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
  color: #a09070;
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
