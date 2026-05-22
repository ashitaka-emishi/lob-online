import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useRouter } from 'vue-router';

export const useLobbyStore = defineStore('lobby', () => {
  const router = useRouter();
  const games = ref([]);
  const myGameId = ref(null);
  const mySide = ref(null);
  const loading = ref(false);
  const error = ref(null);

  async function fetchGames() {
    loading.value = true;
    error.value = null;
    try {
      const [gamesRes, meRes] = await Promise.all([
        fetch('/api/v1/games'),
        fetch('/api/v1/games/me'),
      ]);
      if (!gamesRes.ok) throw new Error(`Failed to fetch games: ${gamesRes.status}`);
      games.value = await gamesRes.json();
      if (meRes.ok) {
        const me = await meRes.json();
        myGameId.value = me.gameId;
        mySide.value = me.side;
      } else {
        myGameId.value = null;
        mySide.value = null;
      }
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
      router.push(`/games/${data.id}`);
    } catch (err) {
      error.value = err.message;
    }
  }

  async function deleteGame(id) {
    error.value = null;
    try {
      const res = await fetch(`/api/v1/games/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to delete game: ${res.status}`);
      }
      await fetchGames();
    } catch (err) {
      error.value = err.message;
    }
  }

  async function joinGame(id, side) {
    error.value = null;
    try {
      const res = await fetch(`/api/v1/games/${id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ side }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to join game: ${res.status}`);
      }
      const data = await res.json();
      myGameId.value = data.id;
      mySide.value = data.side;
      router.push(`/games/${data.id}`);
    } catch (err) {
      error.value = err.message;
    }
  }

  return { games, myGameId, mySide, loading, error, fetchGames, createGame, deleteGame, joinGame };
});
