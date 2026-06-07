<script setup>
import { RouterLink } from 'vue-router';

const editorsEnabled = import.meta.env.VITE_MAP_EDITOR_ENABLED === 'true';
const editorTarget = editorsEnabled ? '/tools/map-editor' : '/lobby';
</script>

<template>
  <div class="home">
    <div class="menu-card">
      <h1>Line of Battle Online</h1>
      <p class="subtitle">South Mountain — RSS #4</p>
      <nav class="menu">
        <RouterLink to="/lobby" class="menu-btn">Lobby</RouterLink>
        <RouterLink :to="editorTarget" data-testid="editor-link" class="menu-btn editor-btn">
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

.subtitle {
  font-size: 0.9rem;
  color: #8a7a60;
  letter-spacing: 0.08em;
  margin-top: -1rem;
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
