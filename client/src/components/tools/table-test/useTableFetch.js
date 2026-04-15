import { ref } from 'vue';

/**
 * Shared fetch logic for all Table Test Tool panels.
 *
 * Returns { result, loading, error, submit(body), reset() }.
 * Each panel calls submit() with its endpoint-specific body object and
 * calls reset() to clear result/error (alongside clearing its own form fields).
 */
export function useTableFetch(endpoint) {
  const result = ref(null);
  const loading = ref(false);
  const error = ref(null);

  async function submit(body) {
    loading.value = true;
    error.value = null;
    result.value = null;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      result.value = await res.json();
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    result.value = null;
    error.value = null;
  }

  return { result, loading, error, submit, reset };
}
