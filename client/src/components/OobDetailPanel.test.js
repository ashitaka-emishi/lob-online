import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { useOobStore } from '../stores/useOobStore.js';
import OobDetailPanel from './OobDetailPanel.vue';

// Stub CounterImageWidget and SuccessionList to keep tests focused on field rendering
vi.mock('./CounterImageWidget.vue', () => ({
  default: { template: '<div class="counter-widget-stub" />' },
}));

vi.mock('./SuccessionList.vue', () => ({
  default: {
    props: ['unitPath', 'side', 'successionIds'],
    template: '<div class="succession-list-stub" :data-unit-path="unitPath" :data-side="side" />',
  },
}));

function setup() {
  setActivePinia(createPinia());
  return useOobStore();
}

const REGIMENT_NODE = {
  id: '22ny',
  name: '22nd NY',
  type: 'infantry',
  morale: 'B',
  weapon: 'R',
  strengthPoints: 4,
  counterRef: null,
};

const CAVALRY_NODE = {
  id: '2ny-cav',
  name: '2nd NY Cav',
  type: 'cavalry',
  morale: 'D',
  weapon: 'C',
  strengthPoints: 3,
  counterRef: null,
};

const BATTERY_NODE = {
  id: '1nh-lt',
  name: '1st NH Lt',
  gunType: 'R',
  strengthPoints: 4,
  morale: 'C',
  counterRef: null,
};

const BRIGADE_NODE = {
  id: '1b-1d-1c',
  name: '1/1/1',
  wreckThreshold: 3,
};

const DIVISION_NODE = {
  id: '1d-1c',
  name: '1/1 Division',
  wreckThreshold: 3,
};

const CORPS_NODE = {
  id: '1c',
  name: '1 Corps',
};

const HQ_NODE = {
  id: '1c-hq',
  name: '1 Corps HQ',
  counterRef: null,
};

const SUPPLY_NODE = {
  id: 'usa-train',
  name: 'AotP Supply',
  counterRef: null,
};

// ── Non-editable types ─────────────────────────────────────────────────────────

describe('OobDetailPanel — non-editable node types', () => {
  beforeEach(setup);

  it('shows not-editable message for army type', () => {
    const wrapper = mount(OobDetailPanel, {
      props: { node: { id: 'usa-army', name: 'Army' }, nodeType: 'army', nodePath: null },
    });
    expect(wrapper.find('.not-editable').exists()).toBe(true);
    expect(wrapper.find('.field-row').exists()).toBe(false);
  });

  it('shows not-editable message for leader type', () => {
    const wrapper = mount(OobDetailPanel, {
      props: { node: { id: 'hooker', name: 'Hooker' }, nodeType: 'leader', nodePath: null },
    });
    expect(wrapper.find('.not-editable').exists()).toBe(true);
  });
});

// ── Regiment / infantry ────────────────────────────────────────────────────────

describe('OobDetailPanel — regiment node', () => {
  beforeEach(setup);

  it('shows id as read-only', () => {
    const wrapper = mount(OobDetailPanel, {
      props: {
        node: REGIMENT_NODE,
        nodeType: 'regiment',
        nodePath: 'union.corps.0.divisions.0.brigades.0.regiments.0',
      },
    });
    expect(wrapper.find('.field-readonly').text()).toBe('22ny');
  });

  it('renders name input with correct value', () => {
    const wrapper = mount(OobDetailPanel, {
      props: {
        node: REGIMENT_NODE,
        nodeType: 'regiment',
        nodePath: 'union.corps.0.divisions.0.brigades.0.regiments.0',
      },
    });
    expect(wrapper.find('.field-input[type="text"]').element.value).toBe('22nd NY');
  });

  it('renders type, morale, weapon selects — no straggler boxes', () => {
    const wrapper = mount(OobDetailPanel, {
      props: { node: REGIMENT_NODE, nodeType: 'regiment', nodePath: 'union.corps.0' },
    });
    const selects = wrapper.findAll('.field-select');
    expect(selects.length).toBe(3); // type, morale, weapon
    expect(selects[0].element.value).toBe('infantry');
    expect(selects[1].element.value).toBe('B');
    expect(selects[2].element.value).toBe('R');
    // No straggler boxes number input
    expect(wrapper.findAll('.field-number').length).toBe(1); // only strengthPoints
  });

  it('calls store.updateField on name change', async () => {
    const store = setup();
    store.updateField = vi.fn();
    const wrapper = mount(OobDetailPanel, {
      props: { node: REGIMENT_NODE, nodeType: 'regiment', nodePath: 'union.corps.0.regiments.0' },
    });
    await wrapper.find('.field-input[type="text"]').setValue('Updated Name');
    await wrapper.find('.field-input[type="text"]').trigger('change');
    expect(store.updateField).toHaveBeenCalledWith(
      'union.corps.0.regiments.0.name',
      'Updated Name'
    );
  });

  it('renders counter image widget', () => {
    const wrapper = mount(OobDetailPanel, {
      props: { node: REGIMENT_NODE, nodeType: 'regiment', nodePath: 'union.corps.0.regiments.0' },
    });
    expect(wrapper.find('.counter-widget-stub').exists()).toBe(true);
  });
});

// ── Cavalry ────────────────────────────────────────────────────────────────────

describe('OobDetailPanel — cavalry node', () => {
  beforeEach(setup);

  it('shows type/morale/weapon/strengthPoints only — no straggler boxes', () => {
    const wrapper = mount(OobDetailPanel, {
      props: { node: CAVALRY_NODE, nodeType: 'cavalry', nodePath: 'union.corps.0' },
    });
    expect(wrapper.findAll('.field-select').length).toBe(3);
    expect(wrapper.findAll('.field-number').length).toBe(1);
  });
});

// ── Battery ────────────────────────────────────────────────────────────────────

describe('OobDetailPanel — battery node', () => {
  beforeEach(setup);

  it('renders gunType, strengthPoints, morale (renamed from ammoClass)', () => {
    const wrapper = mount(OobDetailPanel, {
      props: {
        node: BATTERY_NODE,
        nodeType: 'battery',
        nodePath: 'union.corps.0.artillery.arty1-1c.batteries.0',
      },
    });
    const selects = wrapper.findAll('.field-select');
    expect(selects.length).toBe(2); // gunType + morale
    expect(selects[0].element.value).toBe('R'); // gunType
    expect(selects[1].element.value).toBe('C'); // morale
    expect(wrapper.find('.field-number').element.value).toBe('4');
  });

  it('calls updateField on morale change', async () => {
    const store = setup();
    store.updateField = vi.fn();
    const wrapper = mount(OobDetailPanel, {
      props: { node: BATTERY_NODE, nodeType: 'battery', nodePath: 'union.corps.0.batteries.0' },
    });
    const moraleSelect = wrapper.findAll('.field-select')[1];
    await moraleSelect.setValue('B');
    await moraleSelect.trigger('change');
    expect(store.updateField).toHaveBeenCalledWith('union.corps.0.batteries.0.morale', 'B');
  });

  it('renders counter image widget', () => {
    const wrapper = mount(OobDetailPanel, {
      props: { node: BATTERY_NODE, nodeType: 'battery', nodePath: 'union.corps.0.batteries.0' },
    });
    expect(wrapper.find('.counter-widget-stub').exists()).toBe(true);
  });
});

// ── Brigade ────────────────────────────────────────────────────────────────────

describe('OobDetailPanel — brigade node', () => {
  beforeEach(setup);

  it('renders name + wreckThreshold only — no morale, no counter', () => {
    const wrapper = mount(OobDetailPanel, {
      props: {
        node: BRIGADE_NODE,
        nodeType: 'brigade',
        nodePath: 'union.corps.0.divisions.0.brigades.0',
      },
    });
    // No selects (no morale)
    expect(wrapper.findAll('.field-select').length).toBe(0);
    // One number input: wreckThreshold
    expect(wrapper.findAll('.field-number').length).toBe(1);
    expect(wrapper.find('.field-number').element.value).toBe('3');
    // SuccessionList stub rendered
    expect(wrapper.find('.succession-list-stub').exists()).toBe(true);
    // No counter widget
    expect(wrapper.find('.counter-widget-stub').exists()).toBe(false);
  });

  it('calls updateField on wreckThreshold change', async () => {
    const store = setup();
    store.updateField = vi.fn();
    const wrapper = mount(OobDetailPanel, {
      props: {
        node: BRIGADE_NODE,
        nodeType: 'brigade',
        nodePath: 'union.corps.0.divisions.0.brigades.0',
      },
    });
    await wrapper.find('.field-number').setValue('4');
    await wrapper.find('.field-number').trigger('change');
    expect(store.updateField).toHaveBeenCalledWith(
      'union.corps.0.divisions.0.brigades.0.wreckThreshold',
      4
    );
  });
});

// ── Division ───────────────────────────────────────────────────────────────────

describe('OobDetailPanel — division node', () => {
  beforeEach(setup);

  it('renders name + wreckThreshold only — no morale, no straggler boxes, no counter', () => {
    const wrapper = mount(OobDetailPanel, {
      props: { node: DIVISION_NODE, nodeType: 'division', nodePath: 'union.corps.0.divisions.0' },
    });
    expect(wrapper.findAll('.field-select').length).toBe(0);
    expect(wrapper.findAll('.field-number').length).toBe(1);
    expect(wrapper.find('.field-number').element.value).toBe('3');
    expect(wrapper.find('.counter-widget-stub').exists()).toBe(false);
  });
});

// ── Corps ──────────────────────────────────────────────────────────────────────

describe('OobDetailPanel — corps node', () => {
  beforeEach(setup);

  it('renders name only — no counters, no numeric fields', () => {
    const wrapper = mount(OobDetailPanel, {
      props: { node: CORPS_NODE, nodeType: 'corps', nodePath: 'union.corps.0' },
    });
    // Only name input — no selects, no numbers, no counter widget
    expect(wrapper.findAll('.field-select').length).toBe(0);
    expect(wrapper.findAll('.field-number').length).toBe(0);
    expect(wrapper.find('.counter-widget-stub').exists()).toBe(false);
  });
});

// ── HQ ─────────────────────────────────────────────────────────────────────────

describe('OobDetailPanel — hq node', () => {
  beforeEach(setup);

  it('renders name + counter image widget for HQ nodes', () => {
    const wrapper = mount(OobDetailPanel, {
      props: { node: HQ_NODE, nodeType: 'hq', nodePath: 'union.corps.0.hq' },
    });
    expect(wrapper.find('.field-input[type="text"]').element.value).toBe('1 Corps HQ');
    expect(wrapper.find('.counter-widget-stub').exists()).toBe(true);
    expect(wrapper.findAll('.field-select').length).toBe(0);
    expect(wrapper.findAll('.field-number').length).toBe(0);
  });
});

// ── Supply ─────────────────────────────────────────────────────────────────────

describe('OobDetailPanel — supply node', () => {
  beforeEach(setup);

  it('renders name + counter image widget for supply nodes', () => {
    const wrapper = mount(OobDetailPanel, {
      props: { node: SUPPLY_NODE, nodeType: 'supply', nodePath: 'union.supplyTrain' },
    });
    expect(wrapper.find('.field-input[type="text"]').element.value).toBe('AotP Supply');
    expect(wrapper.find('.counter-widget-stub').exists()).toBe(true);
  });
});

// ── Number field type coercion ─────────────────────────────────────────────────

describe('OobDetailPanel — number field handling', () => {
  beforeEach(setup);

  it('passes a parsed number (not a string) to updateField', async () => {
    const store = setup();
    store.updateField = vi.fn();
    const wrapper = mount(OobDetailPanel, {
      props: {
        node: BRIGADE_NODE,
        nodeType: 'brigade',
        nodePath: 'union.corps.0.divisions.0.brigades.0',
      },
    });
    // Set value directly on the element and trigger change once
    wrapper.find('.field-number').element.value = '7';
    await wrapper.find('.field-number').trigger('change');
    expect(store.updateField).toHaveBeenCalledWith(
      'union.corps.0.divisions.0.brigades.0.wreckThreshold',
      7 // number, not string '7'
    );
  });
});

// ── No-path notice ─────────────────────────────────────────────────────────────

describe('OobDetailPanel — path edge cases', () => {
  beforeEach(setup);

  it('shows no-path notice for regiment when nodePath is null', () => {
    const wrapper = mount(OobDetailPanel, {
      props: { node: REGIMENT_NODE, nodeType: 'regiment', nodePath: null },
    });
    expect(wrapper.find('.no-path-notice').exists()).toBe(true);
    expect(wrapper.find('.counter-widget-stub').exists()).toBe(false);
  });
});

// ── SuccessionList wiring ──────────────────────────────────────────────────────

describe('OobDetailPanel — SuccessionList wiring', () => {
  beforeEach(setup);

  it('renders SuccessionList for brigade with correct unitPath and side', () => {
    const wrapper = mount(OobDetailPanel, {
      props: {
        node: { ...BRIGADE_NODE, successionIds: ['hooker'] },
        nodeType: 'brigade',
        nodePath: 'union.corps.0.divisions.0.brigades.0',
      },
    });
    const stub = wrapper.find('.succession-list-stub');
    expect(stub.exists()).toBe(true);
    expect(stub.attributes('data-unit-path')).toBe('union.corps.0.divisions.0.brigades.0');
    expect(stub.attributes('data-side')).toBe('union');
  });

  it('renders SuccessionList for division with confederate side', () => {
    const wrapper = mount(OobDetailPanel, {
      props: {
        node: { ...DIVISION_NODE, successionIds: [] },
        nodeType: 'division',
        nodePath: 'confederate.corps.0.divisions.0',
      },
    });
    const stub = wrapper.find('.succession-list-stub');
    expect(stub.exists()).toBe(true);
    expect(stub.attributes('data-side')).toBe('confederate');
  });

  it('renders SuccessionList for corps', () => {
    const wrapper = mount(OobDetailPanel, {
      props: {
        node: { ...CORPS_NODE, successionIds: [] },
        nodeType: 'corps',
        nodePath: 'union.corps.0',
      },
    });
    expect(wrapper.find('.succession-list-stub').exists()).toBe(true);
  });

  it('does not render SuccessionList for regiment', () => {
    const wrapper = mount(OobDetailPanel, {
      props: { node: REGIMENT_NODE, nodeType: 'regiment', nodePath: 'union.corps.0.regiments.0' },
    });
    expect(wrapper.find('.succession-list-stub').exists()).toBe(false);
  });
});
