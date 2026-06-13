import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useModuleStore, MODULES } from './useModuleStore.js';

const LS_KEY = 'lob-selected-module';

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('MODULES catalog', () => {
  it('contains nine entries', () => {
    expect(MODULES).toHaveLength(9);
  });

  it('has slug and displayName on every entry', () => {
    for (const s of MODULES) {
      expect(s.slug).toBeTruthy();
      expect(s.displayName).toBeTruthy();
    }
  });

  it('includes SM and THG', () => {
    const slugs = MODULES.map((s) => s.slug);
    expect(slugs).toContain('SM');
    expect(slugs).toContain('THG');
  });
});

describe('useModuleStore — defaults', () => {
  it('defaults to THG when localStorage is empty', () => {
    const store = useModuleStore();
    expect(store.selectedSlug).toBe('THG');
  });

  it('hydrates from localStorage on init', () => {
    localStorage.setItem(LS_KEY, 'SM');
    const store = useModuleStore();
    expect(store.selectedSlug).toBe('SM');
  });

  it('ignores unknown slug in localStorage and falls back to THG', () => {
    localStorage.setItem(LS_KEY, 'BOGUS');
    const store = useModuleStore();
    expect(store.selectedSlug).toBe('THG');
  });
});

describe('useModuleStore — setModule', () => {
  it('updates selectedSlug', () => {
    const store = useModuleStore();
    store.setModule('SM');
    expect(store.selectedSlug).toBe('SM');
  });

  it('persists to localStorage', () => {
    const store = useModuleStore();
    store.setModule('TTS');
    expect(localStorage.getItem(LS_KEY)).toBe('TTS');
  });

  it('ignores unknown slug and keeps current value', () => {
    const store = useModuleStore();
    store.setModule('SM');
    store.setModule('BOGUS');
    expect(store.selectedSlug).toBe('SM');
  });
});

describe('useModuleStore — modulePath helper', () => {
  it('returns slug-prefixed path', () => {
    const store = useModuleStore();
    store.setModule('SM');
    expect(store.modulePath('/tools/map-editor')).toBe('/modules/SM/tools/map-editor');
  });

  it('strips leading slash from suffix', () => {
    const store = useModuleStore();
    expect(store.modulePath('/tools/map-editor')).toBe('/modules/THG/tools/map-editor');
  });

  it('returns default full-battle scenario path', () => {
    const store = useModuleStore();
    store.setModule('SM');
    expect(store.defaultScenarioPath('/lobby')).toBe('/modules/SM/scenarios/full-battle/lobby');
  });
});
