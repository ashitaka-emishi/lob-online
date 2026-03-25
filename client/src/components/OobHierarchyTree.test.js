import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { useOobStore } from '../stores/useOobStore.js';
import OobHierarchyTree from './OobHierarchyTree.vue';

const UNION_OOB = {
  army: 'Army of the Potomac',
  corps: [
    {
      id: '1c',
      name: '1 Corps',
      artillery: {
        'arty1-1c': { name: 'Arty/1/1 Corps', batteries: [{ id: 'bat1', name: '1 NH Lt' }] },
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
      ],
    },
    { id: '2c', name: '2 Corps', divisions: [] },
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

const MINIMAL_OOB = { _status: 'available', union: UNION_OOB, confederate: CSA_OOB };

describe('OobHierarchyTree — union side', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const store = useOobStore();
    store.oob = MINIMAL_OOB;
  });

  it('renders top-level corps nodes', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('1 Corps');
    expect(wrapper.text()).toContain('2 Corps');
  });

  it('renders cavalryDivision at top level', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('Cavalry Division');
    // It should be at the same depth as corps nodes
    expect(wrapper.findAll('.node-corps').length).toBe(2);
    expect(wrapper.findAll('.node-division').length).toBeGreaterThanOrEqual(1);
  });

  it('shows artillery group under corps', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('Arty/1/1 Corps');
    expect(wrapper.find('.badge-artillery-group').exists()).toBe(true);
  });

  it('shows battery under artillery group', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('1 NH Lt');
  });

  it('shows divisions and brigades under corps', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('1/1 Division');
    expect(wrapper.text()).toContain('1/1/1 (Phelps)');
  });

  it('shows BDE badge on brigade nodes', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    // Badge text should be 'BDE', not 'Brig' or 'BRIG'
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

describe('OobHierarchyTree — confederate side', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const store = useOobStore();
    store.oob = MINIMAL_OOB;
  });

  it('renders top-level divisions', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'confederate' } });
    expect(wrapper.text()).toContain("D.H. Hill's Division");
    expect(wrapper.text()).toContain("McLaws' Division");
  });

  it('renders Independent formation', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'confederate' } });
    expect(wrapper.text()).toContain('Independent');
    expect(wrapper.text()).toContain('5th Va Cavalry');
    expect(wrapper.text()).toContain('Pelham A');
  });

  it('renders Reserve Artillery formation', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'confederate' } });
    expect(wrapper.text()).toContain('Reserve Artillery');
    expect(wrapper.text()).toContain('Blackshears');
  });

  it('does not show union corps on confederate tab', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'confederate' } });
    expect(wrapper.text()).not.toContain('1 Corps');
  });
});

describe('OobHierarchyTree — expand/collapse all', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const store = useOobStore();
    store.oob = MINIMAL_OOB;
  });

  it('has Expand all and Collapse all buttons', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    const btns = wrapper.findAll('.control-btn');
    const labels = btns.map((b) => b.text());
    expect(labels).toContain('Expand all');
    expect(labels).toContain('Collapse all');
  });

  it('collapses all nodes when Collapse all is clicked', async () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    // Initially expanded — divisions visible
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

describe('OobTreeNode via OobHierarchyTree', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const store = useOobStore();
    store.oob = MINIMAL_OOB;
  });

  it('collapses children when expand button is clicked', async () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    const expandBtn = wrapper.find('.expand-btn');
    expect(wrapper.text()).toContain('1/1 Division');
    await expandBtn.trigger('click');
    expect(wrapper.text()).not.toContain('1/1 Division');
  });

  it('selects node on row click', async () => {
    setActivePinia(createPinia());
    const store = useOobStore();
    store.oob = MINIMAL_OOB;
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
