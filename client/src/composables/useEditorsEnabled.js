export function useEditorsEnabled() {
  return import.meta.env.VITE_MAP_EDITOR_ENABLED === 'true';
}
