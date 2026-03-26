import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { useOobStore } from '../stores/useOobStore.js';
import OobDetailPanel from './OobDetailPanel.vue';

// Stub CounterImageWidget to keep tests focused on field rendering
vi.mock('./CounterImageWidget.vue', () => ({
  default: { template: '<div class="counter-widget-stub" />' },
}));

function setup() {
  setActivePinia(createPinia());
  return useOobStore();
}

const REGIMENT_NODE = {
  id: '22ny',
  name: '22 NY',
  type: 'infantry',
  morale: 'B',
  weapon: 'R',
  strengthPoints: 4,
  stragglerBoxes: 9,
  counterRef: null,
};

const CAVALRY_NODE = {
  id: '2ny-cav',
  name: '2 NY Cav',
  type: 'cavalry',
  morale: 'D',
  weapon: 'C',
  strengthPoints: 3,
  stragglerBoxes: 9,
  counterRef: null,
};

const BATTERY_NODE = {
  id: '1nh-lt',
  name: '1 NH Lt',
  gunType: 'R',
  strengthPoints: 4,
  ammoClass: 'C',
  counterRef: null,
};

const BRIGADE_NODE = {
  id: '1b-1d-1c',
  name: '1/1/1',
  morale: 'B',
  wreckThreshold: 3,
  wreckTrackTotal: 5,
  counterRef: null,
};

const DIVISION_NODE = {
  id: '1d-1c',
  name: '1/1 Division',
  divisionStragglerBoxes: 5,
  divisionWreckThreshold: 3,
  counterRef: null,
};

const CORPS_NODE = {
  id: '1c',
  name: '1 Corps',
  divisionStragglerBoxes: 0,
  divisionWreckThreshold: 0,
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
    const nameInput = wrapper.find('.field-input[type="text"]');
    expect(nameInput.element.value).toBe('22 NY');
  });

  it('renders type, morale, weapon selects', () => {
    const wrapper = mount(OobDetailPanel, {
      props: { node: REGIMENT_NODE, nodeType: 'regiment', nodePath: 'union.corps.0' },
    });
    const selects = wrapper.findAll('.field-select');
    expect(selects.length).toBeGreaterThanOrEqual(3);
    // type select has infantry selected
    expect(selects[0].element.value).toBe('infantry');
    // morale select
    expect(selects[1].element.value).toBe('B');
    // weapon select
    expect(selects[2].element.value).toBe('R');
  });

  it('renders strengthPoints and stragglerBoxes numbers', () => {
    const wrapper = mount(OobDetailPanel, {
      props: { node: REGIMENT_NODE, nodeType: 'infantry', nodePath: 'union.corps.0' },
    });
    const numbers = wrapper.findAll('.field-number');
    const vals = numbers.map((n) => n.element.value);
    expect(vals).toContain('4'); // strengthPoints
    expect(vals).toContain('9'); // stragglerBoxes
  });

  it('calls store.updateField on name change', async () => {
    const store = setup();
    store.updateField = vi.fn();
    const wrapper = mount(OobDetailPanel, {
      props: { node: REGIMENT_NODE, nodeType: 'regiment', nodePath: 'union.corps.0.regiments.0' },
    });
    const nameInput = wrapper.find('.field-input[type="text"]');
    await nameInput.setValue('Updated Name');
    await nameInput.trigger('change');
    expect(store.updateField).toHaveBeenCalledWith(
      'union.corps.0.regiments.0.name',
      'Updated Name'
    );
  });

  it('calls store.updateField on morale select change', async () => {
    const store = setup();
    store.updateField = vi.fn();
    const wrapper = mount(OobDetailPanel, {
      props: { node: REGIMENT_NODE, nodeType: 'regiment', nodePath: 'union.corps.0.regiments.0' },
    });
    const moraleSelect = wrapper.findAll('.field-select')[1];
    await moraleSelect.setValue('C');
    await moraleSelect.trigger('change');
    expect(store.updateField).toHaveBeenCalledWith('union.corps.0.regiments.0.morale', 'C');
  });
});

// ── Cavalry (regiment type) ────────────────────────────────────────────────────

describe('OobDetailPanel — cavalry node', () => {
  beforeEach(setup);

  it('renders straggler boxes for cavalry', () => {
    const wrapper = mount(OobDetailPanel, {
      props: { node: CAVALRY_NODE, nodeType: 'cavalry', nodePath: 'union.corps.0' },
    });
    const numbers = wrapper.findAll('.field-number');
    const vals = numbers.map((n) => n.element.value);
    expect(vals).toContain('9');
  });
});

// ── Battery ────────────────────────────────────────────────────────────────────

describe('OobDetailPanel — battery node', () => {
  beforeEach(setup);

  it('renders gunType, strengthPoints, ammoClass — no straggler boxes', () => {
    const wrapper = mount(OobDetailPanel, {
      props: {
        node: BATTERY_NODE,
        nodeType: 'battery',
        nodePath: 'union.corps.0.artillery.arty1-1c.batteries.0',
      },
    });
    expect(wrapper.find('.field-readonly').text()).toBe('1nh-lt');
    const selects = wrapper.findAll('.field-select');
    // gunType and ammoClass
    expect(selects[0].element.value).toBe('R'); // gunType
    expect(selects[1].element.value).toBe('C'); // ammoClass
    expect(wrapper.find('.field-number').element.value).toBe('4');
  });

  it('does not render type or weapon selects for battery', () => {
    const wrapper = mount(OobDetailPanel, {
      props: { node: BATTERY_NODE, nodeType: 'battery', nodePath: 'union.corps.0.batteries.0' },
    });
    const selects = wrapper.findAll('.field-select');
    // Only gunType + ammoClass (2 selects for battery)
    expect(selects.length).toBe(2);
  });

  it('calls updateField on ammoClass change', async () => {
    const store = setup();
    store.updateField = vi.fn();
    const wrapper = mount(OobDetailPanel, {
      props: { node: BATTERY_NODE, nodeType: 'battery', nodePath: 'union.corps.0.batteries.0' },
    });
    const ammoSelect = wrapper.findAll('.field-select')[1];
    await ammoSelect.setValue('B');
    await ammoSelect.trigger('change');
    expect(store.updateField).toHaveBeenCalledWith('union.corps.0.batteries.0.ammoClass', 'B');
  });
});

// ── Brigade ────────────────────────────────────────────────────────────────────

describe('OobDetailPanel — brigade node', () => {
  beforeEach(setup);

  it('renders morale, wreckThreshold, wreckTrackTotal, succession placeholder', () => {
    const wrapper = mount(OobDetailPanel, {
      props: {
        node: BRIGADE_NODE,
        nodeType: 'brigade',
        nodePath: 'union.corps.0.divisions.0.brigades.0',
      },
    });
    expect(wrapper.find('.field-select').element.value).toBe('B'); // morale
    const numbers = wrapper.findAll('.field-number');
    expect(numbers.map((n) => n.element.value)).toContain('3'); // wreckThreshold
    expect(numbers.map((n) => n.element.value)).toContain('5'); // wreckTrackTotal
    expect(wrapper.find('.field-placeholder').text()).toContain('SuccessionList');
  });

  it('does not render type or weapon fields', () => {
    const wrapper = mount(OobDetailPanel, {
      props: {
        node: BRIGADE_NODE,
        nodeType: 'brigade',
        nodePath: 'union.corps.0.divisions.0.brigades.0',
      },
    });
    const selects = wrapper.findAll('.field-select');
    // Only morale (1 select)
    expect(selects.length).toBe(1);
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
    const wtInput = wrapper.findAll('.field-number')[0];
    await wtInput.setValue('4');
    await wtInput.trigger('change');
    expect(store.updateField).toHaveBeenCalledWith(
      'union.corps.0.divisions.0.brigades.0.wreckThreshold',
      4
    );
  });
});

// ── Division ───────────────────────────────────────────────────────────────────

describe('OobDetailPanel — division node', () => {
  beforeEach(setup);

  it('renders divisionStragglerBoxes and divisionWreckThreshold', () => {
    const wrapper = mount(OobDetailPanel, {
      props: { node: DIVISION_NODE, nodeType: 'division', nodePath: 'union.corps.0.divisions.0' },
    });
    const numbers = wrapper.findAll('.field-number');
    expect(numbers.map((n) => n.element.value)).toContain('5');
    expect(numbers.map((n) => n.element.value)).toContain('3');
    expect(wrapper.find('.field-placeholder').text()).toContain('SuccessionList');
  });

  it('does not render morale select for division', () => {
    const wrapper = mount(OobDetailPanel, {
      props: { node: DIVISION_NODE, nodeType: 'division', nodePath: 'union.corps.0.divisions.0' },
    });
    expect(wrapper.findAll('.field-select').length).toBe(0);
  });
});

// ── Corps ──────────────────────────────────────────────────────────────────────

describe('OobDetailPanel — corps node', () => {
  beforeEach(setup);

  it('renders same fields as division', () => {
    const wrapper = mount(OobDetailPanel, {
      props: { node: CORPS_NODE, nodeType: 'corps', nodePath: 'union.corps.0' },
    });
    const numbers = wrapper.findAll('.field-number');
    expect(numbers.length).toBeGreaterThanOrEqual(2);
    expect(wrapper.find('.field-placeholder').text()).toContain('SuccessionList');
  });
});

// ── Counter widget integration ─────────────────────────────────────────────────

describe('OobDetailPanel — counter widget', () => {
  beforeEach(setup);

  it('renders CounterImageWidget stub when nodePath is provided', () => {
    const wrapper = mount(OobDetailPanel, {
      props: { node: REGIMENT_NODE, nodeType: 'regiment', nodePath: 'union.corps.0.regiments.0' },
    });
    expect(wrapper.find('.counter-widget-stub').exists()).toBe(true);
  });

  it('shows no-path notice when nodePath is null', () => {
    const wrapper = mount(OobDetailPanel, {
      props: { node: REGIMENT_NODE, nodeType: 'regiment', nodePath: null },
    });
    expect(wrapper.find('.no-path-notice').exists()).toBe(true);
    expect(wrapper.find('.counter-widget-stub').exists()).toBe(false);
  });
});
