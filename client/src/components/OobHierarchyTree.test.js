import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { useOobStore } from '../stores/useOobStore.js';
import OobHierarchyTree from './OobHierarchyTree.vue';

const MINIMAL_OOB = {
  _status: 'available',
  union: {
    army: 'Army of the Potomac',
    corps: [
      {
        id: '1c',
        name: '1 Corps',
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
  },
  confederate: {
    army: 'Army of Northern Virginia',
    corps: [{ id: 'cs1c', name: "D.H. Hill's Corps", divisions: [] }],
  },
};

describe('OobHierarchyTree', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const store = useOobStore();
    store.oob = MINIMAL_OOB;
  });

  it('renders top-level corps nodes for union side', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('1 Corps');
    expect(wrapper.text()).toContain('2 Corps');
  });

  it('renders confederate corps when side=confederate', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'confederate' } });
    expect(wrapper.text()).toContain("D.H. Hill's Corps");
    expect(wrapper.text()).not.toContain('1 Corps');
  });

  it('shows empty message when oob is null', () => {
    const store = useOobStore();
    store.oob = null;
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('No data loaded');
  });

  it('renders corps count matching data', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    const nodes = wrapper.findAll('.node-corps');
    expect(nodes.length).toBe(2);
  });
});

describe('OobTreeNode via OobHierarchyTree', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const store = useOobStore();
    store.oob = MINIMAL_OOB;
  });

  it('renders division children under corps when expanded', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('1/1 Division');
  });

  it('renders brigade children under division when expanded', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('1/1/1 (Phelps)');
  });

  it('renders regiment children under brigade when expanded', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    expect(wrapper.text()).toContain('22 NY');
  });

  it('shows expand toggle button for corps with divisions', () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    const expandBtns = wrapper.findAll('.expand-btn');
    expect(expandBtns.length).toBeGreaterThan(0);
  });

  it('collapses children when expand button is clicked', async () => {
    const wrapper = mount(OobHierarchyTree, { props: { side: 'union' } });
    // Corps "1 Corps" should have a button since it has divisions
    const expandBtn = wrapper.find('.expand-btn');
    expect(wrapper.text()).toContain('1/1 Division');
    await expandBtn.trigger('click');
    expect(wrapper.text()).not.toContain('1/1 Division');
  });

  it('selects node on click', async () => {
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
