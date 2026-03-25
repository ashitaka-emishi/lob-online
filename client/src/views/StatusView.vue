<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { RouterLink } from 'vue-router';
import { io } from 'socket.io-client';

const devToolsEnabled = import.meta.env.VITE_MAP_EDITOR_ENABLED === 'true';

const status = ref('connecting…');
let socket;

onMounted(() => {
  socket = io();
  socket.on('connect', () => {
    status.value = 'connected';
  });
  socket.on('disconnect', () => {
    status.value = 'disconnected';
  });
  socket.on('connect_error', () => {
    status.value = 'connection error';
  });
});

onUnmounted(() => {
  socket?.disconnect();
});
</script>

<template>
  <main>
    <h1>Line of Battle Online</h1>
    <p>South Mountain — RSS #4</p>
    <p class="status" :class="status">Server: {{ status }}</p>
    <section v-if="devToolsEnabled" class="dev-tools">
      <h2>Dev Tools</h2>
      <RouterLink to="/tools/map-editor" class="tool-btn">Map Editor</RouterLink>
      <RouterLink to="/tools/oob-editor" class="tool-btn">OOB Editor</RouterLink>
    </section>
  </main>
</template>

<style scoped>
main {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

h1 {
  font-size: 2rem;
  letter-spacing: 0.05em;
}

p {
  color: #a09880;
}

.status {
  font-size: 0.85rem;
  margin-top: 0.5rem;
}

.status.connected {
  color: #7aab6e;
}

.status.disconnected,
.status.connection\ error {
  color: #c06060;
}

.dev-tools {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.dev-tools h2 {
  font-size: 0.9rem;
  color: #7a7060;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.tool-btn {
  display: inline-block;
  padding: 0.4rem 1.2rem;
  border: 1px solid #5a5040;
  border-radius: 4px;
  color: #c8b89a;
  text-decoration: none;
  font-size: 0.9rem;
}

.tool-btn:hover {
  background: #2a2418;
}
</style>
