import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

import ScenarioEditorView from './ScenarioEditorView.vue';

const VALID_SCENARIO = {
  _status: 'available',
  _source: 'test',
  id: 'south-mountain',
  name: 'South Mountain',
  system: 'Line of Battle v2.0',
  publication: 'RSS #4',
  turnStructure: {
    firstTurn: '09:00',
    lastTurn: '20:00',
    totalTurns: 45,
    minutesPerTurn: 20,
    firstPlayer: 'union',
    date: '1862-09-14',
  },
  rules: {},
  movementCosts: {
    movementAllowances: {},
    terrainCosts: {},
    hexsideCosts: {},
    noEffectTerrain: [],
  },
  ammoReserves: { confederate: {}, union: {} },
  setup: { union: [], confederate: [] },
  reinforcements: { union: [], confederate: [] },
  victoryPoints: { terrain: [], wreck: { confederate: {}, union: {} } },
  victoryConditions: { results: [] },
  randomEvents: { confederate: { table: [] }, union: { table: [] } },
};

const SCENARIO_WITH_LIGHTING = {
  ...VALID_SCENARIO,
  lightingSchedule: [
    { startTurn: 1, condition: 'day' },
    { startTurn: 28, condition: 'twilight' },
  ],
};

const STORAGE_KEY = 'lob-scenario-editor-south-mountain-v2';

function mockFetch(data, ok = true) {
  return vi.fn().mockImplementation(() =>
    Promise.resolve({
      ok,
      status: ok ? 200 : 500,
      json: () => Promise.resolve(JSON.parse(JSON.stringify(data))), // deep clone prevents mutation of shared fixture
    })
  );
}

describe('ScenarioEditorView', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders "Scenario Editor" title', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_SCENARIO));
    const wrapper = mount(ScenarioEditorView, { attachTo: document.body });
    await flushPromises();
    expect(wrapper.text()).toContain('Scenario Editor');
    wrapper.unmount();
  });

  it('renders Push to Server button', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_SCENARIO));
    const wrapper = mount(ScenarioEditorView, { attachTo: document.body });
    await flushPromises();
    const saveBtn = wrapper.find('button.save-btn');
    expect(saveBtn.exists()).toBe(true);
    expect(saveBtn.text()).toBe('Push to Server');
    wrapper.unmount();
  });

  it('renders Pull from Server button', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_SCENARIO));
    const wrapper = mount(ScenarioEditorView, { attachTo: document.body });
    await flushPromises();
    expect(wrapper.find('button.pull-btn').exists()).toBe(true);
    wrapper.unmount();
  });

  it('shows fetch error when API fails and no draft exists', async () => {
    vi.stubGlobal('fetch', mockFetch({}, false));
    const wrapper = mount(ScenarioEditorView, { attachTo: document.body });
    await flushPromises();
    expect(wrapper.text()).toContain('Failed to load');
    wrapper.unmount();
  });

  it('shows offline banner when fetch throws and draft exists', async () => {
    const draft = { ...VALID_SCENARIO, _savedAt: Date.now() };
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => (key === STORAGE_KEY ? JSON.stringify(draft) : null)),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const wrapper = mount(ScenarioEditorView, { attachTo: document.body });
    await flushPromises();
    expect(wrapper.find('.offline-banner').exists()).toBe(true);
    expect(wrapper.text()).toContain('Server unreachable');
    wrapper.unmount();
  });

  it('shows fetch error when fetch throws and no draft exists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const wrapper = mount(ScenarioEditorView, { attachTo: document.body });
    await flushPromises();
    expect(wrapper.find('.offline-banner').exists()).toBe(false);
    expect(wrapper.text()).toContain('Failed to load');
    wrapper.unmount();
  });

  it('Push button shows "Offline" and is disabled when isOffline', async () => {
    const draft = { ...VALID_SCENARIO, _savedAt: Date.now() };
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => (key === STORAGE_KEY ? JSON.stringify(draft) : null)),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const wrapper = mount(ScenarioEditorView, { attachTo: document.body });
    await flushPromises();
    const saveBtn = wrapper.find('button.save-btn');
    expect(saveBtn.text()).toBe('Offline');
    expect(saveBtn.attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('push shows confirm dialog when server data is newer than local draft', async () => {
    const serverScenario = { ...VALID_SCENARIO, _savedAt: 2000 };
    const localDraft = { ...VALID_SCENARIO, _savedAt: 1000 };
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => (key === STORAGE_KEY ? JSON.stringify(localDraft) : null)),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.stubGlobal('fetch', mockFetch(serverScenario));
    const wrapper = mount(ScenarioEditorView, { attachTo: document.body });
    await flushPromises();

    await wrapper.find('button.save-btn').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Server data is newer');
    wrapper.unmount();
  });

  it('push confirm → Overwrite → PUT fires', async () => {
    const serverScenario = { ...VALID_SCENARIO, _savedAt: 2000 };
    const localDraft = { ...VALID_SCENARIO, _savedAt: 1000 };
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => (key === STORAGE_KEY ? JSON.stringify(localDraft) : null)),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(serverScenario),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true, _savedAt: Date.now() }),
      });
    vi.stubGlobal('fetch', fetchMock);
    const wrapper = mount(ScenarioEditorView, { attachTo: document.body });
    await flushPromises();

    await wrapper.find('button.save-btn').trigger('click');
    await flushPromises();

    const overwriteBtn = wrapper.findAll('button').find((b) => b.text() === 'Overwrite');
    await overwriteBtn.trigger('click');
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('push button calls PUT when no staleness conflict', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(VALID_SCENARIO) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true, _savedAt: Date.now() }),
      });
    vi.stubGlobal('fetch', fetchMock);
    const wrapper = mount(ScenarioEditorView, { attachTo: document.body });
    await flushPromises();

    await wrapper.find('button.save-btn').trigger('click');
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('save success clears localStorage draft key', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(VALID_SCENARIO) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true, _savedAt: Date.now() }),
      });
    vi.stubGlobal('fetch', fetchMock);
    const wrapper = mount(ScenarioEditorView, { attachTo: document.body });
    await flushPromises();

    await wrapper.find('button.save-btn').trigger('click');
    await flushPromises();

    expect(localStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    wrapper.unmount();
  });

  it('pull when dirty shows confirm dialog', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_SCENARIO));
    const wrapper = mount(ScenarioEditorView, { attachTo: document.body });
    await flushPromises();

    // Trigger a turn structure change to mark dirty
    const firstTurnInput = wrapper.find('input[type="text"]');
    await firstTurnInput.setValue('08:00');
    await firstTurnInput.trigger('change');
    await flushPromises();

    await wrapper.find('button.pull-btn').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Discard local changes');
    wrapper.unmount();
  });

  it('pull when not dirty: no dialog, fetches directly', async () => {
    const fetchMock = mockFetch(VALID_SCENARIO);
    vi.stubGlobal('fetch', fetchMock);
    const wrapper = mount(ScenarioEditorView, { attachTo: document.body });
    await flushPromises();

    await wrapper.find('button.pull-btn').trigger('click');
    await flushPromises();

    expect(wrapper.text()).not.toContain('Discard local changes');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('gameDuration computed from firstTurn and lastTurn', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_SCENARIO));
    const wrapper = mount(ScenarioEditorView, { attachTo: document.body });
    await flushPromises();
    // 09:00 to 20:00 = 11h
    expect(wrapper.text()).toContain('11h');
    wrapper.unmount();
  });

  it('turn structure edit marks unsaved', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_SCENARIO));
    const wrapper = mount(ScenarioEditorView, { attachTo: document.body });
    await flushPromises();

    expect(wrapper.find('.unsaved-marker').exists()).toBe(false);

    const firstTurnInput = wrapper.find('input[type="text"]');
    await firstTurnInput.setValue('08:00');
    await firstTurnInput.trigger('change');
    await flushPromises();

    expect(wrapper.find('.unsaved-marker').exists()).toBe(true);
    wrapper.unmount();
  });

  it('turn structure edit calls localStorage.setItem', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_SCENARIO));
    const wrapper = mount(ScenarioEditorView, { attachTo: document.body });
    await flushPromises();

    const firstTurnInput = wrapper.find('input[type="text"]');
    await firstTurnInput.setValue('08:00');
    await firstTurnInput.trigger('change');
    await flushPromises();

    expect(localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
    wrapper.unmount();
  });

  describe('Lighting schedule', () => {
    it('renders existing lighting rows', async () => {
      vi.stubGlobal('fetch', mockFetch(SCENARIO_WITH_LIGHTING));
      const wrapper = mount(ScenarioEditorView, { attachTo: document.body });
      await flushPromises();
      expect(wrapper.findAll('.lighting-row').length).toBe(2);
      wrapper.unmount();
    });

    it('deletes a lighting row on × click', async () => {
      vi.stubGlobal('fetch', mockFetch(SCENARIO_WITH_LIGHTING));
      const wrapper = mount(ScenarioEditorView, { attachTo: document.body });
      await flushPromises();

      await wrapper.find('.delete-btn').trigger('click');
      await flushPromises();

      expect(wrapper.findAll('.lighting-row').length).toBe(1);
      wrapper.unmount();
    });

    it('adds a new lighting row when startTurn > 0', async () => {
      vi.stubGlobal('fetch', mockFetch(VALID_SCENARIO));
      const wrapper = mount(ScenarioEditorView, { attachTo: document.body });
      await flushPromises();

      expect(wrapper.findAll('.lighting-row').length).toBe(0);

      const turnInput = wrapper.find('.add-row .turn-input');
      await turnInput.setValue(5);
      await flushPromises();

      await wrapper.find('.add-btn').trigger('click');
      await flushPromises();

      expect(wrapper.findAll('.lighting-row').length).toBe(1);
      wrapper.unmount();
    });

    it('does not add row when startTurn is 0', async () => {
      vi.stubGlobal('fetch', mockFetch(VALID_SCENARIO));
      const wrapper = mount(ScenarioEditorView, { attachTo: document.body });
      await flushPromises();

      const turnInput = wrapper.find('.add-row .turn-input');
      await turnInput.setValue(0);
      await flushPromises();

      await wrapper.find('.add-btn').trigger('click');
      await flushPromises();

      expect(wrapper.findAll('.lighting-row').length).toBe(0);
      wrapper.unmount();
    });

    it('adding a row marks dirty', async () => {
      vi.stubGlobal('fetch', mockFetch(VALID_SCENARIO));
      const wrapper = mount(ScenarioEditorView, { attachTo: document.body });
      await flushPromises();

      const turnInput = wrapper.find('.add-row .turn-input');
      await turnInput.setValue(5);
      await flushPromises();
      await wrapper.find('.add-btn').trigger('click');
      await flushPromises();

      expect(wrapper.find('.unsaved-marker').exists()).toBe(true);
      wrapper.unmount();
    });

    it('deleting a row marks dirty', async () => {
      vi.stubGlobal('fetch', mockFetch(SCENARIO_WITH_LIGHTING));
      const wrapper = mount(ScenarioEditorView, { attachTo: document.body });
      await flushPromises();

      await wrapper.find('.delete-btn').trigger('click');
      await flushPromises();

      expect(wrapper.find('.unsaved-marker').exists()).toBe(true);
      wrapper.unmount();
    });
  });

  it('rules panel renders Night Visibility Cap input', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_SCENARIO));
    const wrapper = mount(ScenarioEditorView, { attachTo: document.body });
    await flushPromises();
    expect(wrapper.text()).toContain('Night Visibility Cap');
    wrapper.unmount();
  });
});
