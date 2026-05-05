import { ref } from 'vue';
import { defineStore } from 'pinia';

export const useLobbyStore = defineStore('lobby', () => {
  const games = ref([]);
  const myGameId = ref(null);
  const mySide = ref(null);
  const loading = ref(false);
  const error = ref(null);

  async function fetchGames() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/v1/games');
      if (!res.ok) throw new Error(`Failed to fetch games: ${res.status}`);
      games.value = await res.json();
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  async function createGame() {
    error.value = null;
    try {
      const res = await fetch('/api/v1/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`Failed to create game: ${res.status}`);
      const data = await res.json();
      myGameId.value = data.id;
      mySide.value = data.side;
    } catch (err) {
      error.value = err.message;
    }
  }

  async function joinGame(id) {
    error.value = null;
    try {
      const res = await fetch(`/api/v1/games/${id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to join game: ${res.status}`);
      }
      const data = await res.json();
      myGameId.value = data.id;
      mySide.value = data.side;
    } catch (err) {
      error.value = err.message;
    }
  }

  return { games, myGameId, mySide, loading, error, fetchGames, createGame, joinGame };
});
