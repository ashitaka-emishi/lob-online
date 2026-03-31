import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { useOobStore } from '../stores/useOobStore.js';
import SuccessionList from './SuccessionList.vue';

// Minimal leaders fixture: three union leaders, two confederate
const LEADERS_FIXTURE = {
  union: {
    corps: [
      { id: 'hooker', name: 'Joseph Hooker', commandLevel: 'corps' },
      { id: 'reno', name: 'Jesse Reno', commandLevel: 'corps' },
    ],
    divisions: [{ id: 'meade', name: 'George Meade', commandLevel: 'division' }],
    brigades: [],
    cavalry: [],
    army: 'Army of the Potomac',
  },
  confederate: {
    corps: [{ id: 'hill-d', name: 'D.H. Hill', commandLevel: 'corps' }],
    divisions: [],
    brigades: [],
    cavalry: [],
    army: 'Army of Northern Virginia',
  },
};

function setup() {
  setActivePinia(createPinia());
  const store = useOobStore();
  store.leaders = LEADERS_FIXTURE;
  return store;
}

const UNIT_PATH = 'union.corps.0';

// ── Rendering ──────────────────────────────────────────────────────────────────

describe('SuccessionList — rendering', () => {
  beforeEach(setup);

  it('shows "no succession defined" when successionIds is empty', () => {
    const wrapper = mount(SuccessionList, {
      props: { unitPath: UNIT_PATH, side: 'union', successionIds: [] },
    });
    expect(wrapper.text()).toContain('no succession defined');
    expect(wrapper.findAll('.succession-item').length).toBe(0);
  });

  it('renders resolved leader names for each ID', () => {
    const wrapper = mount(SuccessionList, {
      props: { unitPath: UNIT_PATH, side: 'union', successionIds: ['hooker', 'reno'] },
    });
    expect(wrapper.findAll('.succession-item').length).toBe(2);
    const text = wrapper.text();
    expect(text).toContain('Joseph Hooker');
    expect(text).toContain('Jesse Reno');
  });

  it('falls back to showing the raw ID when leader not found', () => {
    const wrapper = mount(SuccessionList, {
      props: { unitPath: UNIT_PATH, side: 'union', successionIds: ['unknown-id'] },
    });
    expect(wrapper.text()).toContain('unknown-id');
  });

  it('renders items in order', () => {
    const wrapper = mount(SuccessionList, {
      props: { unitPath: UNIT_PATH, side: 'union', successionIds: ['reno', 'hooker'] },
    });
    const items = wrapper.findAll('.succession-item');
    expect(items[0].text()).toContain('Jesse Reno');
    expect(items[1].text()).toContain('Joseph Hooker');
  });
});

// ── Remove ─────────────────────────────────────────────────────────────────────

describe('SuccessionList — remove', () => {
  it('× button calls updateSuccession with item removed', async () => {
    const store = setup();
    store.updateSuccession = vi.fn();
    const wrapper = mount(SuccessionList, {
      props: { unitPath: UNIT_PATH, side: 'union', successionIds: ['hooker', 'reno'] },
    });
    await wrapper.findAll('.remove-btn')[0].trigger('click');
    expect(store.updateSuccession).toHaveBeenCalledWith(UNIT_PATH, ['reno']);
  });

  it('removing the last item yields an empty array', async () => {
    const store = setup();
    store.updateSuccession = vi.fn();
    const wrapper = mount(SuccessionList, {
      props: { unitPath: UNIT_PATH, side: 'union', successionIds: ['hooker'] },
    });
    await wrapper.find('.remove-btn').trigger('click');
    expect(store.updateSuccession).toHaveBeenCalledWith(UNIT_PATH, []);
  });
});

// ── Reorder ────────────────────────────────────────────────────────────────────

describe('SuccessionList — reorder', () => {
  it('↑ button moves item up', async () => {
    const store = setup();
    store.updateSuccession = vi.fn();
    const wrapper = mount(SuccessionList, {
      props: { unitPath: UNIT_PATH, side: 'union', successionIds: ['hooker', 'reno'] },
    });
    // Click ↑ on second item (index 1) → should become ['reno', 'hooker']
    await wrapper.findAll('.move-up-btn')[1].trigger('click');
    expect(store.updateSuccession).toHaveBeenCalledWith(UNIT_PATH, ['reno', 'hooker']);
  });

  it('↓ button moves item down', async () => {
    const store = setup();
    store.updateSuccession = vi.fn();
    const wrapper = mount(SuccessionList, {
      props: { unitPath: UNIT_PATH, side: 'union', successionIds: ['hooker', 'reno'] },
    });
    // Click ↓ on first item (index 0) → should become ['reno', 'hooker']
    await wrapper.findAll('.move-down-btn')[0].trigger('click');
    expect(store.updateSuccession).toHaveBeenCalledWith(UNIT_PATH, ['reno', 'hooker']);
  });

  it('↑ on first item is a no-op', async () => {
    const store = setup();
    store.updateSuccession = vi.fn();
    const wrapper = mount(SuccessionList, {
      props: { unitPath: UNIT_PATH, side: 'union', successionIds: ['hooker', 'reno'] },
    });
    await wrapper.findAll('.move-up-btn')[0].trigger('click');
    expect(store.updateSuccession).not.toHaveBeenCalled();
  });

  it('↓ on last item is a no-op', async () => {
    const store = setup();
    store.updateSuccession = vi.fn();
    const wrapper = mount(SuccessionList, {
      props: { unitPath: UNIT_PATH, side: 'union', successionIds: ['hooker', 'reno'] },
    });
    await wrapper.findAll('.move-down-btn')[1].trigger('click');
    expect(store.updateSuccession).not.toHaveBeenCalled();
  });
});

// ── Type-ahead add ─────────────────────────────────────────────────────────────

describe('SuccessionList — type-ahead add', () => {
  it('typing in search input shows matching leaders', async () => {
    setup();
    const wrapper = mount(SuccessionList, {
      props: { unitPath: UNIT_PATH, side: 'union', successionIds: [] },
    });
    await wrapper.find('.succession-search').setValue('hoo');
    expect(wrapper.find('.suggestions').exists()).toBe(true);
    expect(wrapper.text()).toContain('Joseph Hooker');
    expect(wrapper.text()).not.toContain('Jesse Reno');
  });

  it('search is filtered to the correct side only', async () => {
    setup();
    const wrapper = mount(SuccessionList, {
      props: { unitPath: 'confederate.corps.0', side: 'confederate', successionIds: [] },
    });
    await wrapper.find('.succession-search').setValue('hi');
    expect(wrapper.text()).toContain('D.H. Hill');
    expect(wrapper.text()).not.toContain('Joseph Hooker');
  });

  it('clicking a suggestion calls updateSuccession with ID appended', async () => {
    const store = setup();
    store.updateSuccession = vi.fn();
    const wrapper = mount(SuccessionList, {
      props: { unitPath: UNIT_PATH, side: 'union', successionIds: ['reno'] },
    });
    await wrapper.find('.succession-search').setValue('meade');
    await wrapper.find('.suggestion-item').trigger('click');
    expect(store.updateSuccession).toHaveBeenCalledWith(UNIT_PATH, ['reno', 'meade']);
  });

  it('already-listed leaders are excluded from suggestions', async () => {
    setup();
    const wrapper = mount(SuccessionList, {
      props: { unitPath: UNIT_PATH, side: 'union', successionIds: ['hooker'] },
    });
    await wrapper.find('.succession-search').setValue('hooker');
    // hooker is already in the list — should not appear as a suggestion
    expect(wrapper.findAll('.suggestion-item').length).toBe(0);
  });

  it('search input is cleared after adding', async () => {
    const store = setup();
    store.updateSuccession = vi.fn();
    const wrapper = mount(SuccessionList, {
      props: { unitPath: UNIT_PATH, side: 'union', successionIds: [] },
    });
    await wrapper.find('.succession-search').setValue('reno');
    await wrapper.find('.suggestion-item').trigger('click');
    expect(wrapper.find('.succession-search').element.value).toBe('');
  });
});
