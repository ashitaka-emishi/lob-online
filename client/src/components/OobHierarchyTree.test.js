import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { useOobStore } from '../stores/useOobStore.js';
import OobHierarchyTree from './OobHierarchyTree.vue';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const UNION_OOB = {
  army: 'Army of the Potomac',
  supplyTrain: { id: 'usa-supply', name: 'US Army of the Potomac Supply' },
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
    name: 'F/Cav (Farnsworth)',
    brigades: [
      {
        id: 'fcav',
        regiments: [{ id: '8ill', name: '8 Ill', type: 'cavalry' }],
      },
    ],
    artillery: {
      'arty-fcav': { batteries: [{ id: 'cg3us', name: 'C&G 3 US' }] },
    },
  },
};

const CSA_OOB = {
  army: 'Army of Northern Virginia',
  wing: "Longstreet's Wing",
  supplyWagon: { id: 'csa-supply', name: 'Wing Supply Wagon' },
  divisions: [
    {
      id: 'dh-div',
      name: "D.H. Hill's Division",
      brigades: [{ id: 'rodes-bde', name: "Rodes' Brigade", regiments: [] }],
    },
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
  army: [
    { id: 'mcclellan', name: 'George B. McClellan', commandsId: null },
    { id: 'burnside', name: 'Ambrose E. Burnside', commandsId: null },
  ],
  corps: [{ id: 'hooker', name: 'Joseph Hooker', commandsId: '1c' }],
  cavalry: [{ id: 'pleasonton', name: 'Alfred Pleasonton', commandsId: 'cav-div' }],
  divisions: [
    { id: 'hatch', name: 'John P. Hatch', commandsId: '1d-1c' },
    { id: 'ricketts', name: 'James B. Ricketts', commandsId: '2d-1c' },
  ],
  brigades: [
    { id: 'phelps', name: 'Walter Phelps', commandsId: '1b-1d-1c' },
    { id: 'farnsworth', name: 'Elon J. Farnsworth', commandsId: 'fcav' },
  ],
};

const CSA_LEADERS = {
  wing: [{ id: 'longstreet', name: 'James Longstreet', commandsId: 'csa-wing' }],
  divisions: [{ id: 'dh-hill', name: 'D.H. Hill', commandsId: 'dh-div' }],
  brigades: [{ id: 'rodes', name: 'Robert Rodes', commandsId: 'rodes-bde' }],
};

const MINIMAL_OOB = { _status: 'available', union: UNION_OOB, confederate: CSA_OOB };
const MINIMAL_LEADERS = {
  _status: 'available',
  union: UNION_LEADERS,
  confederate: CSA_LEADERS,
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

  it('renders single Army of the Potomac army node at top level', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('Army of the Potomac');
    expect(wrapper.find('.badge-army').exists()).toBe(true);
    expect(wrapper.find('.badge-army').text()).toBe('Army');
  });

  it('shows McClellan and Burnside under army node', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('George B. McClellan');
    expect(wrapper.text()).toContain('Ambrose E. Burnside');
  });

  it('shows army HQ and supply under army node', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.find('.badge-hq').exists()).toBe(true);
    expect(wrapper.find('.badge-supply').exists()).toBe(true);
    expect(wrapper.find('.badge-supply').text()).toBe('SUPP');
    expect(wrapper.text()).toContain('US Army of the Potomac Supply');
  });

  it('renders corps nodes under army node', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('1 Corps');
    expect(wrapper.find('.badge-corps').exists()).toBe(true);
  });

  it('injects Hooker as corps leader', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('Joseph Hooker');
    expect(wrapper.find('.badge-leader').exists()).toBe(true);
  });

  it('injects division leaders', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('John P. Hatch');
    expect(wrapper.text()).toContain('James B. Ricketts');
  });

  it('injects brigade leader (Phelps)', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('Walter Phelps');
  });

  it('renders Cavalry Division under army node with Pleasonton leader', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('Cavalry Division');
    expect(wrapper.text()).toContain('Alfred Pleasonton');
  });

  it('renders F/Cav as brigade under Cavalry Division with Farnsworth leader', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('F/Cav');
    expect(wrapper.text()).toContain('Elon J. Farnsworth');
  });

  it('shows cavalry battery under F/Cav brigade', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('C&G 3 US');
  });

  it('shows cavalry regiment under F/Cav brigade', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('8 Ill');
  });

  it('distributes artillery battery under its matching division', () => {
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

  it('renders single wing node at top level', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'confederate' } });
    expect(wrapper.text()).toContain("Longstreet's Wing");
    expect(wrapper.find('.badge-wing').exists()).toBe(true);
    expect(wrapper.find('.badge-wing').text()).toBe('Wing');
  });

  it('shows Longstreet as wing leader', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'confederate' } });
    expect(wrapper.text()).toContain('James Longstreet');
  });

  it('shows supply wagon under wing node', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'confederate' } });
    expect(wrapper.text()).toContain('Wing Supply Wagon');
    expect(wrapper.find('.badge-supply').exists()).toBe(true);
  });

  it('renders division nodes under wing node', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'confederate' } });
    expect(wrapper.text()).toContain("D.H. Hill's Division");
    expect(wrapper.text()).toContain("McLaws' Division");
  });

  it('injects CSA division leader (D.H. Hill)', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'confederate' } });
    expect(wrapper.text()).toContain('D.H. Hill');
  });

  it('shows HQ node under CSA division', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'confederate' } });
    expect(wrapper.find('.badge-hq').exists()).toBe(true);
    expect(wrapper.find('.badge-hq').text()).toBe('HQ');
  });

  it('injects CSA brigade leader (Rodes)', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'confederate' } });
    expect(wrapper.text()).toContain('Robert Rodes');
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
    expect(wrapper.text()).toContain('1 Corps');
    const collapseBtn = wrapper.findAll('.control-btn').find((b) => b.text() === 'Collapse all');
    await collapseBtn.trigger('click');
    expect(wrapper.text()).not.toContain('1 Corps');
  });

  it('expands all nodes after collapsing', async () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    const collapseBtn = wrapper.findAll('.control-btn').find((b) => b.text() === 'Collapse all');
    const expandBtn = wrapper.findAll('.control-btn').find((b) => b.text() === 'Expand all');
    await collapseBtn.trigger('click');
    expect(wrapper.text()).not.toContain('1 Corps');
    await expandBtn.trigger('click');
    expect(wrapper.text()).toContain('1 Corps');
  });
});

// ── Node interaction ──────────────────────────────────────────────────────────

describe('OobTreeNode via OobHierarchyTree', () => {
  beforeEach(setupStore);

  it('collapses children when expand button is clicked on army node', async () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    const expandBtn = wrapper.find('.expand-btn');
    expect(wrapper.text()).toContain('1 Corps');
    await expandBtn.trigger('click');
    expect(wrapper.text()).not.toContain('1 Corps');
  });

  it('selects node on row click', async () => {
    const store = setupStore();
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    const armyRow = wrapper.find('.node-army');
    await armyRow.trigger('click');
    expect(store.selectedNode).toBeTruthy();
    expect(store.selectedNode.name).toBe('Army of the Potomac');
  });

  it('shows army type badge', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.find('.badge-army').exists()).toBe(true);
  });

  it('shows corps type badge under army node', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.find('.badge-corps').exists()).toBe(true);
  });
});
