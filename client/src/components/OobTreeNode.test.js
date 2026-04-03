import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { useOobStore } from '../stores/useOobStore.js';
import OobTreeNode from './OobTreeNode.vue';

function setup() {
  setActivePinia(createPinia());
  return useOobStore();
}

// ── Basic rendering ───────────────────────────────────────────────────────────

describe('OobTreeNode — basic rendering', () => {
  beforeEach(setup);

  it('renders node name', () => {
    const wrapper = mount(OobTreeNode, {
      props: { node: { id: 'test-corps', name: '1 Corps' }, nodeType: 'corps' },
    });
    expect(wrapper.text()).toContain('1 Corps');
  });

  it('renders badge label for nodeType', () => {
    const wrapper = mount(OobTreeNode, {
      props: { node: { id: 'test-corps', name: '1 Corps' }, nodeType: 'corps' },
    });
    expect(wrapper.find('.badge-corps').text()).toBe('Corps');
  });

  it('renders Var badge for leader-variant nodeType', () => {
    const wrapper = mount(OobTreeNode, {
      props: {
        node: { id: 'reno-promoted', name: 'Brig Gen Jesse Reno (Promoted)' },
        nodeType: 'leader-variant',
      },
    });
    expect(wrapper.find('.badge-leader-variant').text()).toBe('Var');
  });

  it('shows expand button when node has children', () => {
    const wrapper = mount(OobTreeNode, {
      props: {
        node: { id: 'army', name: 'Army', corps: [{ id: '1c', name: '1 Corps' }] },
        nodeType: 'army',
      },
    });
    expect(wrapper.find('.expand-btn').exists()).toBe(true);
  });

  it('shows no expand button for leaf node', () => {
    const wrapper = mount(OobTreeNode, {
      props: { node: { id: 'leaf', name: 'Leaf Node' }, nodeType: 'regiment' },
    });
    expect(wrapper.find('.expand-btn').exists()).toBe(false);
  });
});

// ── Rank abbreviation ─────────────────────────────────────────────────────────

describe('OobTreeNode — rank abbreviation', () => {
  beforeEach(setup);

  it('shows abbreviated rank prefix for leader nodes with rank', () => {
    const wrapper = mount(OobTreeNode, {
      props: {
        node: { id: 'hooker', name: 'Joseph Hooker', rank: 'Major General' },
        nodeType: 'leader',
      },
    });
    expect(wrapper.find('.leader-rank').text()).toBe('Maj Gen');
  });

  it('shows no rank prefix when rank is not set', () => {
    const wrapper = mount(OobTreeNode, {
      props: { node: { id: 'hooker', name: 'Joseph Hooker' }, nodeType: 'leader' },
    });
    expect(wrapper.find('.leader-rank').exists()).toBe(false);
  });

  it('shows no rank prefix for non-leader nodeType even if rank present', () => {
    const wrapper = mount(OobTreeNode, {
      props: { node: { id: 'corps', name: '1 Corps', rank: 'Major General' }, nodeType: 'corps' },
    });
    expect(wrapper.find('.leader-rank').exists()).toBe(false);
  });
});

// ── Selection ─────────────────────────────────────────────────────────────────

describe('OobTreeNode — selection', () => {
  it('applies selected class when node id matches store selectedNode', () => {
    const store = setup();
    store.selectNode({ id: 'target', name: 'Target Node' }, 'brigade');
    const wrapper = mount(OobTreeNode, {
      props: { node: { id: 'target', name: 'Target Node' }, nodeType: 'brigade' },
    });
    expect(wrapper.find('.node-row').classes()).toContain('selected');
  });

  it('does not apply selected class when node is not selected', () => {
    const store = setup();
    store.selectNode({ id: 'other', name: 'Other' }, 'brigade');
    const wrapper = mount(OobTreeNode, {
      props: { node: { id: 'target', name: 'Target Node' }, nodeType: 'brigade' },
    });
    expect(wrapper.find('.node-row').classes()).not.toContain('selected');
  });

  it('calls store.selectNode when row is clicked', async () => {
    const store = setup();
    const wrapper = mount(OobTreeNode, {
      props: { node: { id: 'bde', name: 'Test Brigade' }, nodeType: 'brigade' },
    });
    await wrapper.find('.node-row').trigger('click');
    expect(store.selectedNode?.id).toBe('bde');
  });
});

// ── Succession variants in childEntries ───────────────────────────────────────

describe('OobTreeNode — succession variant children', () => {
  beforeEach(setup);

  it('renders leader-variant badge when _leader has _variants', () => {
    const node = {
      id: 'test-bde',
      name: 'Test Brigade',
      _leader: {
        id: 'walker',
        name: 'Joseph Walker',
        _variants: [{ id: 'walker-promoted', name: 'Col Joseph Walker (Promoted)' }],
      },
    };
    const wrapper = mount(OobTreeNode, { props: { node, nodeType: 'brigade' } });
    expect(wrapper.find('.badge-leader-variant').exists()).toBe(true);
    expect(wrapper.find('.badge-leader-variant').text()).toBe('Var');
  });

  it('renders variant name in tree', () => {
    const node = {
      id: 'test-bde',
      name: 'Test Brigade',
      _leader: {
        id: 'walker',
        name: 'Joseph Walker',
        _variants: [{ id: 'walker-promoted', name: 'Col Joseph Walker (Promoted)' }],
      },
    };
    const wrapper = mount(OobTreeNode, { props: { node, nodeType: 'brigade' } });
    expect(wrapper.text()).toContain('Col Joseph Walker (Promoted)');
  });

  it('renders multiple variants when leader has more than one', () => {
    const node = {
      id: 'test-bde',
      name: 'Test Brigade',
      _leader: {
        id: 'reno',
        name: 'Jesse Reno',
        _variants: [
          { id: 'reno-v1', name: 'Reno Variant 1' },
          { id: 'reno-v2', name: 'Reno Variant 2' },
        ],
      },
    };
    const wrapper = mount(OobTreeNode, { props: { node, nodeType: 'brigade' } });
    expect(wrapper.findAll('.badge-leader-variant')).toHaveLength(2);
  });

  it('does not render variant badge when _leader has no _variants', () => {
    const node = {
      id: 'test-bde',
      name: 'Test Brigade',
      _leader: { id: 'walker', name: 'Joseph Walker' },
    };
    const wrapper = mount(OobTreeNode, { props: { node, nodeType: 'brigade' } });
    expect(wrapper.find('.badge-leader-variant').exists()).toBe(false);
  });
});
