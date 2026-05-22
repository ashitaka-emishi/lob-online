<template>
  <div class="lobby">
    <h1>Game Lobby</h1>

    <div v-if="store.error" class="error">{{ store.error }}</div>

    <button data-testid="new-game-btn" :disabled="store.loading" @click="store.createGame()">
      New Game
    </button>

    <table v-if="store.games.length > 0" class="game-list">
      <thead>
        <tr>
          <th>Game ID</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="game in store.games" :key="game.id" data-testid="game-row">
          <td>{{ game.id }}</td>
          <td>{{ game.status }}</td>
          <td class="join-actions">
            <button
              data-testid="join-usa-btn"
              :disabled="game.status !== 'open'"
              @click="store.joinGame(game.id, 'union')"
            >
              Join as USA
            </button>
            <button
              data-testid="join-csa-btn"
              :disabled="game.status !== 'open'"
              @click="store.joinGame(game.id, 'confederate')"
            >
              Join as CSA
            </button>
            <button data-testid="delete-btn" @click="store.deleteGame(game.id)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else-if="!store.loading">No games yet.</p>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';

import { useLobbyStore } from '../stores/lobby.js';

const store = useLobbyStore();

onMounted(() => {
  store.fetchGames();
});
</script>

<style scoped>
.lobby {
  max-width: 640px;
  margin: 2rem auto;
  font-family: sans-serif;
}

.error {
  color: red;
  margin-bottom: 1rem;
}

.game-list {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.game-list th,
.game-list td {
  border: 1px solid #ccc;
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.join-actions {
  display: flex;
  gap: 0.5rem;
}
</style>
