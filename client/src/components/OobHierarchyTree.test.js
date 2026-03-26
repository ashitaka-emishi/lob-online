import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { useOobStore } from '../stores/useOobStore.js';
import OobHierarchyTree from './OobHierarchyTree.vue';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const UNION_OOB = {
  army: 'Army of the Potomac',
  supplyTrain: { id: 'usa-supply', name: 'AotP Supply' },
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
      name: 'dH Division',
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

  it('shows AotP HQ and AotP Supply under army node', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.find('.badge-hq').exists()).toBe(true);
    expect(wrapper.text()).toContain('AotP HQ');
    expect(wrapper.find('.badge-supply').exists()).toBe(true);
    expect(wrapper.find('.badge-supply').text()).toBe('SUPP');
    expect(wrapper.text()).toContain('AotP Supply');
    // Corps HQ uses corps name
    expect(wrapper.text()).toContain('1 Corps HQ');
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
    expect(wrapper.text()).toContain('8th Ill');
  });

  it('distributes artillery battery under its matching division', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('1st NH Lt');
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

// ── 9th Corps arty distribution ───────────────────────────────────────────────

describe('OobHierarchyTree — 9th Corps artillery distribution', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const store = useOobStore();
    store.oob = {
      _status: 'available',
      union: {
        army: 'Army of the Potomac',
        corps: [
          {
            id: '9c',
            name: '9 Corps',
            corpsUnits: [],
            artillery: {
              'arty-9c-direct': {
                batteries: [
                  { id: 'l2ny', name: 'L 2 NY' },
                  { id: 'lm3us', name: 'L&M 3 US' },
                ],
              },
              'arty1-1d-9c': {
                batteries: [
                  { id: '8mass', name: '8 Mass Lt' },
                  { id: 'e2us', name: 'E 2 US' },
                ],
              },
              'arty2-2d-9c': {
                batteries: [
                  { id: 'dpenn', name: 'D Penn Lt' },
                  { id: 'e4us', name: 'E 4 US' },
                ],
              },
              'arty3-3d-9c': { batteries: [{ id: 'a5us', name: 'A 5 US' }] },
              'arty-1kg-9c': { batteries: [{ id: '1ohio', name: '1 Ohio Lt' }] },
              'arty-2kg-9c': { batteries: [{ id: 'simonds', name: 'Simonds Ky' }] },
            },
            divisions: [
              {
                id: '1d-9c',
                name: '1/9 Division',
                brigades: [
                  { id: '1b-1d-9c', name: '1/1/9' },
                  { id: '2b-1d-9c', name: '2/1/9' },
                ],
              },
              {
                id: '2d-9c',
                name: '2/9 Division',
                brigades: [
                  { id: '1b-2d-9c', name: '1/2/9' },
                  { id: '2b-2d-9c', name: '2/2/9' },
                ],
              },
              {
                id: '3d-9c',
                name: '3/9 Division',
                brigades: [
                  { id: '1b-3d-9c', name: '1/3/9' },
                  { id: '2b-3d-9c', name: '2/3/9' },
                ],
              },
              {
                id: 'kd-9c',
                name: 'K/9 Division',
                brigades: [
                  { id: '1b-kd-9c', name: '1/K/9 (Scammon)' },
                  { id: '2b-kd-9c', name: '2/K/9 (Crook)' },
                ],
              },
            ],
          },
        ],
      },
      confederate: CSA_OOB,
    };
    store.leaders = MINIMAL_LEADERS;
  });

  it('keeps L 2 NY and L&M 3 US directly under 9 Corps', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    const corpsRow = wrapper.findAll('.node-corps').find((n) => n.text().includes('9 Corps'));
    expect(corpsRow).toBeTruthy();
    // Corps-level batteries should appear before divisions — they are in the corps node itself
    expect(wrapper.text()).toContain('L 2 NY');
    expect(wrapper.text()).toContain('L&M 3 US');
  });

  it('places 8 Mass Lt and E 2 US under 1/9 Division', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('8th Mass Lt');
    expect(wrapper.text()).toContain('E 2 US');
  });

  it('places D Penn Lt and E 4 US under 2/9 Division', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('D Penn Lt');
    expect(wrapper.text()).toContain('E 4 US');
  });

  it('places A 5 US under 3/9 Division', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('A 5 US');
  });

  it('places 1 Ohio Lt under 1/K/9 brigade', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('1st Ohio Lt');
  });

  it('places Simonds Ky under 2/K/9 brigade', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('Simonds Ky');
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
    expect(wrapper.text()).toContain('dH Division');
    expect(wrapper.text()).toContain("McLaws' Division");
  });

  it('injects CSA division leader (D.H. Hill)', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'confederate' } });
    expect(wrapper.text()).toContain('D.H. Hill');
  });

  it('shows named HQ node under CSA division', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'confederate' } });
    expect(wrapper.find('.badge-hq').exists()).toBe(true);
    expect(wrapper.find('.badge-hq').text()).toBe('HQ');
    expect(wrapper.text()).toContain('dH Div HQ');
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

  it('collapses corps children but keeps army and corps rows visible', async () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('1/1 Division');
    const collapseBtn = wrapper.findAll('.control-btn').find((b) => b.text() === 'Collapse all');
    await collapseBtn.trigger('click');
    // Army node and corps rows stay visible; contents inside corps are hidden
    expect(wrapper.text()).toContain('Army of the Potomac');
    expect(wrapper.text()).toContain('1 Corps');
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

  it('collapses children when toggle button is clicked on army node', async () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    const toggleBtn = wrapper.find('.expand-btn');
    expect(wrapper.text()).toContain('1 Corps');
    await toggleBtn.trigger('click');
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
