import { computed, ref } from 'vue';

import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref(null);
  const loading = ref(false);
  const initialized = ref(false);

  const isLoggedIn = computed(() => currentUser.value !== null);

  async function fetchMe() {
    loading.value = true;
    try {
      const res = await fetch('/auth/me', { credentials: 'include' });
      currentUser.value = res.ok ? await res.json() : null;
    } catch {
      currentUser.value = null;
    } finally {
      loading.value = false;
      initialized.value = true;
    }
  }

  async function logout() {
    try {
      await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Network failures are non-fatal — client-side state is cleared regardless
    } finally {
      currentUser.value = null;
    }
  }

  return { currentUser, isLoggedIn, loading, initialized, fetchMe, logout };
});
