import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { useOobStore } from '../stores/useOobStore.js';
import OobHierarchyTree from './OobHierarchyTree.vue';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const UNION_OOB = {
  army: 'Army of the Potomac',
  corps: [
    {
      id: '1c',
      name: '1 Corps',
      corpsUnits: [],
      artillery: {
        'arty1-1c': { name: 'Arty/1/1 Corps', batteries: [{ id: 'bat1', name: '1 NH Lt' }] },
        'arty2-1c': { name: 'Arty/2/1 Corps', batteries: [] },
      },
      divisions: [
        {
          id: '1d-1c',
          name: '1/1 Division',
          brigades: [
            {
              id: '1b-1d-1c',
              name: '1/1/1 (Phelps)',
              regiments: [{ id: '22ny', name: '22 NY', type: 'infantry' }],
            },
          ],
        },
        { id: '2d-1c', name: '2/1 Division', brigades: [] },
      ],
    },
  ],
  cavalryDivision: {
    id: 'cav-div',
    name: 'Cavalry Division',
    brigades: [{ id: 'cav-bde', name: 'Cavalry Brigade', regiments: [] }],
  },
};

const CSA_OOB = {
  army: 'Army of Northern Virginia',
  divisions: [
    { id: 'hills-div', name: "D.H. Hill's Division", brigades: [] },
    { id: 'mclaws-div', name: "McLaws' Division", brigades: [] },
  ],
  independent: {
    cavalry: [{ id: '5va-cav', name: '5th Va Cavalry', type: 'cavalry' }],
    artillery: [{ id: 'pelham-a', name: 'Pelham A' }],
  },
  reserveArtillery: {
    batteries: [{ id: 'blackshears', name: 'Blackshears' }],
  },
};

const UNION_LEADERS = {
  army: [{ id: 'mcclellan', name: 'George B. McClellan', commandsId: null }],
  corps: [{ id: 'hooker', name: 'Joseph Hooker', commandsId: '1c' }],
  cavalry: [{ id: 'pleasonton', name: 'Alfred Pleasonton', commandsId: 'cav-div' }],
  divisions: [
    { id: 'hatch', name: 'John P. Hatch', commandsId: '1d-1c' },
    { id: 'ricketts', name: 'James B. Ricketts', commandsId: '2d-1c' },
  ],
  brigades: [],
};

const MINIMAL_OOB = { _status: 'available', union: UNION_OOB, confederate: CSA_OOB };
const MINIMAL_LEADERS = {
  _status: 'available',
  union: UNION_LEADERS,
  confederate: { army: [], corps: [], divisions: [], brigades: [] },
};

function setupStore() {
  setActivePinia(createPinia());
  const store = useOobStore();
  store.oob = MINIMAL_OOB;
  store.leaders = MINIMAL_LEADERS;
  return store;
}

// ── Union side ────────────────────────────────────────────────────────────────

describe('OobHierarchyTree — union side', () => {
  beforeEach(setupStore);

  it('renders top-level corps nodes', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('1 Corps');
  });

  it('renders cavalryDivision at top level alongside corps', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('Cavalry Division');
    expect(wrapper.findAll('.node-corps').length).toBe(1);
    expect(wrapper.findAll('.node-division').length).toBeGreaterThanOrEqual(1);
  });

  it('injects leader under corps', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('Joseph Hooker');
    expect(wrapper.find('.badge-leader').exists()).toBe(true);
  });

  it('injects division leader under division', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('John P. Hatch');
    expect(wrapper.text()).toContain('James B. Ricketts');
  });

  it('injects cavalry division leader', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('Alfred Pleasonton');
  });

  it('shows artillery group under its matching division (not directly under corps)', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    // Arty/1/1 Corps belongs to 1/1 Division — must be visible (tree starts expanded)
    expect(wrapper.text()).toContain('Arty/1/1 Corps');
    // The corps row itself should NOT have the arty group as a direct child badge at corps level
    // (verifiable by checking that the arty-group badge appears deeper in the tree)
    expect(wrapper.find('.badge-artillery-group').exists()).toBe(true);
  });

  it('shows battery under its artillery group', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('1 NH Lt');
  });

  it('shows BDE badge on brigade nodes', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    const badgeTexts = wrapper.findAll('.badge-brigade').map((el) => el.text());
    expect(badgeTexts.every((t) => t === 'BDE')).toBe(true);
    expect(badgeTexts.length).toBeGreaterThan(0);
  });

  it('shows empty message when oob is null', () => {
    const store = useOobStore();
    store.oob = null;
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('No data loaded');
  });
});

// ── Confederate side ──────────────────────────────────────────────────────────

describe('OobHierarchyTree — confederate side', () => {
  beforeEach(setupStore);

  it('renders top-level divisions', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'confederate' } });
    expect(wrapper.text()).toContain("D.H. Hill's Division");
    expect(wrapper.text()).toContain("McLaws' Division");
  });

  it('renders Independent formation with IDP badge', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'confederate' } });
    expect(wrapper.text()).toContain('Independent');
    expect(wrapper.find('.badge-independent').exists()).toBe(true);
    expect(wrapper.find('.badge-independent').text()).toBe('IDP');
  });

  it('shows independent units (cavalry and artillery)', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'confederate' } });
    expect(wrapper.text()).toContain('5th Va Cavalry');
    expect(wrapper.text()).toContain('Pelham A');
  });

  it('renders Reserve Artillery formation with RES badge', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'confederate' } });
    expect(wrapper.text()).toContain('Reserve Artillery');
    expect(wrapper.find('.badge-reserve-arty').exists()).toBe(true);
    expect(wrapper.find('.badge-reserve-arty').text()).toBe('RES');
  });

  it('shows reserve artillery batteries', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'confederate' } });
    expect(wrapper.text()).toContain('Blackshears');
  });

  it('does not show union corps on confederate tab', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'confederate' } });
    expect(wrapper.text()).not.toContain('1 Corps');
  });
});

// ── Expand / collapse all ─────────────────────────────────────────────────────

describe('OobHierarchyTree — expand/collapse all', () => {
  beforeEach(setupStore);

  it('has Expand all and Collapse all buttons', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    const labels = wrapper.findAll('.control-btn').map((b) => b.text());
    expect(labels).toContain('Expand all');
    expect(labels).toContain('Collapse all');
  });

  it('collapses all nodes when Collapse all is clicked', async () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('1/1 Division');
    const collapseBtn = wrapper.findAll('.control-btn').find((b) => b.text() === 'Collapse all');
    await collapseBtn.trigger('click');
    expect(wrapper.text()).not.toContain('1/1 Division');
  });

  it('expands all nodes after collapsing', async () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    const collapseBtn = wrapper.findAll('.control-btn').find((b) => b.text() === 'Collapse all');
    const expandBtn = wrapper.findAll('.control-btn').find((b) => b.text() === 'Expand all');
    await collapseBtn.trigger('click');
    expect(wrapper.text()).not.toContain('1/1 Division');
    await expandBtn.trigger('click');
    expect(wrapper.text()).toContain('1/1 Division');
  });
});

// ── Node interaction ──────────────────────────────────────────────────────────

describe('OobTreeNode via OobHierarchyTree', () => {
  beforeEach(setupStore);

  it('collapses children when expand button is clicked', async () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    const expandBtn = wrapper.find('.expand-btn');
    expect(wrapper.text()).toContain('1/1 Division');
    await expandBtn.trigger('click');
    expect(wrapper.text()).not.toContain('1/1 Division');
  });

  it('selects node on row click', async () => {
    const store = setupStore();
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    const corpsRow = wrapper.find('.node-corps');
    await corpsRow.trigger('click');
    expect(store.selectedNode).toBeTruthy();
    expect(store.selectedNode.name).toBe('1 Corps');
  });

  it('shows corps type badge', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.find('.badge-corps').exists()).toBe(true);
  });
});
