<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';

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
</style>
