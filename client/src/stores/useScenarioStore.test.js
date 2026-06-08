import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useScenarioStore, SCENARIOS } from './useScenarioStore.js';

const LS_KEY = 'lob-selected-scenario';

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('SCENARIOS catalog', () => {
  it('contains nine entries', () => {
    expect(SCENARIOS).toHaveLength(9);
  });

  it('has slug and displayName on every entry', () => {
    for (const s of SCENARIOS) {
      expect(s.slug).toBeTruthy();
      expect(s.displayName).toBeTruthy();
    }
  });

  it('includes SM and THG', () => {
    const slugs = SCENARIOS.map((s) => s.slug);
    expect(slugs).toContain('SM');
    expect(slugs).toContain('THG');
  });
});

describe('useScenarioStore — defaults', () => {
  it('defaults to THG when localStorage is empty', () => {
    const store = useScenarioStore();
    expect(store.selectedSlug).toBe('THG');
  });

  it('hydrates from localStorage on init', () => {
    localStorage.setItem(LS_KEY, 'SM');
    const store = useScenarioStore();
    expect(store.selectedSlug).toBe('SM');
  });

  it('ignores unknown slug in localStorage and falls back to THG', () => {
    localStorage.setItem(LS_KEY, 'BOGUS');
    const store = useScenarioStore();
    expect(store.selectedSlug).toBe('THG');
  });
});

describe('useScenarioStore — setScenario', () => {
  it('updates selectedSlug', () => {
    const store = useScenarioStore();
    store.setScenario('SM');
    expect(store.selectedSlug).toBe('SM');
  });

  it('persists to localStorage', () => {
    const store = useScenarioStore();
    store.setScenario('TTS');
    expect(localStorage.getItem(LS_KEY)).toBe('TTS');
  });

  it('ignores unknown slug and keeps current value', () => {
    const store = useScenarioStore();
    store.setScenario('SM');
    store.setScenario('BOGUS');
    expect(store.selectedSlug).toBe('SM');
  });
});

describe('useScenarioStore — scenarioPath helper', () => {
  it('returns slug-prefixed path', () => {
    const store = useScenarioStore();
    store.setScenario('SM');
    expect(store.scenarioPath('/lobby')).toBe('/scenarios/SM/lobby');
  });

  it('strips leading slash from suffix', () => {
    const store = useScenarioStore();
    expect(store.scenarioPath('/tools/map-editor')).toBe('/scenarios/THG/tools/map-editor');
  });
});
