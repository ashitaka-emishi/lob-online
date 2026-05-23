import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';

import { useOobData } from './useOobData.js';

const STUB_OOB = {
  union: {
    id: 'corps-1',
    name: 'I Corps',
    brigades: [
      { id: 'unit-a', name: '1st Brigade', counterRef: { front: 'unit-a.png' }, strengthPoints: 6 },
      { id: 'unit-b', name: '2nd Brigade' }, // no counterRef
    ],
  },
  confederate: {
    id: 'div-1',
    name: "Longstreet's Division",
    brigades: [
      { id: 'unit-c', name: 'Hood', counterRef: { front: 'unit-c.png' }, strengthPoints: 8 },
    ],
  },
};

function mockFetch(data) {
  return vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(data) });
}

function mockFetchFail(msg = 'Network error') {
  return vi.fn().mockRejectedValue(new Error(msg));
}

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useOobData — fetchOob', () => {
  it('sets oobData after a successful fetch', async () => {
    vi.stubGlobal('fetch', mockFetch(STUB_OOB));
    const { oobData, oobError, fetchOob } = useOobData();
    await fetchOob();
    expect(oobData.value).toEqual(STUB_OOB);
    expect(oobError.value).toBeNull();
  });

  it('sets oobError when fetch rejects', async () => {
    vi.stubGlobal('fetch', mockFetchFail('timeout'));
    const { oobData, oobError, fetchOob } = useOobData();
    await fetchOob();
    expect(oobData.value).toBeNull();
    expect(oobError.value).toContain('timeout');
  });

  it('fetches from /api/v1/oob by default', async () => {
    const fetchMock = mockFetch(STUB_OOB);
    vi.stubGlobal('fetch', fetchMock);
    const { fetchOob } = useOobData();
    await fetchOob();
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/oob');
  });

  it('sets oobError when server responds with non-ok status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ error: 'OOB data unavailable' }),
      })
    );
    const { oobData, oobError, fetchOob } = useOobData();
    await fetchOob();
    expect(oobError.value).toContain('503');
    expect(oobData.value).toBeNull();
  });

  it('clears oobError on success after a previous failure', async () => {
    vi.stubGlobal('fetch', mockFetchFail('initial error'));
    const { oobError, fetchOob } = useOobData();
    await fetchOob();
    expect(oobError.value).toContain('initial error');

    vi.stubGlobal('fetch', mockFetch(STUB_OOB));
    await fetchOob();
    expect(oobError.value).toBeNull();
  });
});

describe('useOobData — oobUnitMap', () => {
  it('returns empty map when oobData is null', () => {
    const { oobUnitMap } = useOobData();
    expect(oobUnitMap.value.size).toBe(0);
  });

  it('flattens union and confederate units into a single Map', async () => {
    vi.stubGlobal('fetch', mockFetch(STUB_OOB));
    const { fetchOob, oobUnitMap } = useOobData();
    await fetchOob();
    await nextTick();
    expect(oobUnitMap.value.has('unit-a')).toBe(true);
    expect(oobUnitMap.value.has('unit-b')).toBe(true);
    expect(oobUnitMap.value.has('unit-c')).toBe(true);
  });

  it('includes name, side, strengthPoints, and counterFile for each unit', async () => {
    vi.stubGlobal('fetch', mockFetch(STUB_OOB));
    const { fetchOob, oobUnitMap } = useOobData();
    await fetchOob();
    await nextTick();
    const unitA = oobUnitMap.value.get('unit-a');
    expect(unitA).toEqual({
      name: '1st Brigade',
      side: 'union',
      strengthPoints: 6,
      counterFile: 'unit-a.png',
    });
  });

  it('uses unit id as fallback name when name is absent', async () => {
    const oobWithNoName = {
      union: { id: 'u1', brigades: [{ id: 'nameless' }] },
      confederate: {},
    };
    vi.stubGlobal('fetch', mockFetch(oobWithNoName));
    const { fetchOob, oobUnitMap } = useOobData();
    await fetchOob();
    await nextTick();
    expect(oobUnitMap.value.get('nameless')?.name).toBe('nameless');
  });

  it('sets counterFile to null when counterRef is absent', async () => {
    vi.stubGlobal('fetch', mockFetch(STUB_OOB));
    const { fetchOob, oobUnitMap } = useOobData();
    await fetchOob();
    await nextTick();
    const unitB = oobUnitMap.value.get('unit-b');
    expect(unitB?.counterFile).toBeNull();
  });

  it('flattens 3-level nesting (corps → division → brigade) — all leaf unit IDs appear in map (#436)', async () => {
    const deepOob = {
      union: {
        id: 'corps-1',
        name: 'I Corps',
        divisions: [
          {
            id: 'div-1',
            name: '1st Division',
            brigades: [
              {
                id: 'bde-a',
                name: '1st Bde',
                counterRef: { front: 'bde-a.png' },
                strengthPoints: 4,
              },
              {
                id: 'bde-b',
                name: '2nd Bde',
                counterRef: { front: 'bde-b.png' },
                strengthPoints: 5,
              },
            ],
          },
        ],
      },
      confederate: {},
    };
    vi.stubGlobal('fetch', mockFetch(deepOob));
    const { fetchOob, oobUnitMap } = useOobData();
    await fetchOob();
    await nextTick();
    // All three id-bearing nodes (corps, division, two brigades) must be in the map
    expect(oobUnitMap.value.has('corps-1')).toBe(true);
    expect(oobUnitMap.value.has('div-1')).toBe(true);
    expect(oobUnitMap.value.has('bde-a')).toBe(true);
    expect(oobUnitMap.value.has('bde-b')).toBe(true);
    expect(oobUnitMap.value.get('bde-a')).toEqual({
      name: '1st Bde',
      side: 'union',
      strengthPoints: 4,
      counterFile: 'bde-a.png',
    });
  });
});
