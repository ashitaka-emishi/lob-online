import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { useOobStore } from '../stores/useOobStore.js';
import CounterImageWidget from './CounterImageWidget.vue';

// Controlled manifest for tests — eight representative files covering all categories
vi.mock('../assets/countersManifest.js', () => ({
  default: [
    'CS1-Back_01.jpg',
    'CS1-Back_02.jpg',
    'CS1-Front_01.jpg',
    'CS1-Front_02.jpg',
    'C1 copy.png', // CSA cut-out front
    'C2 copy.png',
    'U1 copy.png', // Union cut-out front
    'U2 copy.png',
  ],
}));

function setup() {
  setActivePinia(createPinia());
  return useOobStore();
}

const NULL_COUNTER_REF = { front: null, frontConfidence: null, back: null, backConfidence: null };

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Placeholder / thumbnail rendering ──────────────────────────────────────────

describe('CounterImageWidget — rendering', () => {
  beforeEach(setup);

  it('shows placeholder for both slots when counterRef is null', () => {
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0' },
    });
    expect(wrapper.findAll('.thumb-placeholder').length).toBe(2);
    expect(wrapper.findAll('.thumb').length).toBe(0);
  });

  it('shows front thumbnail when counterRef.front is set', () => {
    const wrapper = mount(CounterImageWidget, {
      props: {
        counterRef: { ...NULL_COUNTER_REF, front: 'CS1-Front_01.jpg' },
        nodePath: 'union.corps.0',
      },
    });
    const img = wrapper.find('.thumb');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe('/counters/CS1-Front_01.jpg');
  });

  it('shows both thumbnails when both sides are set', () => {
    const wrapper = mount(CounterImageWidget, {
      props: {
        counterRef: {
          front: 'CS1-Front_01.jpg',
          back: 'CS1-Back_01.jpg',
          frontConfidence: null,
          backConfidence: null,
        },
        nodePath: 'union.corps.0',
      },
    });
    expect(wrapper.findAll('.thumb').length).toBe(2);
  });

  it('shows placeholder when img @error fires', async () => {
    const wrapper = mount(CounterImageWidget, {
      props: {
        counterRef: { ...NULL_COUNTER_REF, front: 'CS1-Front_01.jpg' },
        nodePath: 'union.corps.0',
      },
    });
    await wrapper.find('.thumb').trigger('error');
    expect(wrapper.findAll('.thumb-placeholder').length).toBeGreaterThanOrEqual(1);
    expect(wrapper.findAll('.thumb').length).toBe(0);
  });

  it('shows clear button when a face is set', () => {
    const wrapper = mount(CounterImageWidget, {
      props: {
        counterRef: { ...NULL_COUNTER_REF, front: 'CS1-Front_01.jpg' },
        nodePath: 'union.corps.0',
      },
    });
    expect(wrapper.find('.clear-btn').exists()).toBe(true);
  });

  it('does not show clear button when counterRef is null', () => {
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0' },
    });
    expect(wrapper.find('.clear-btn').exists()).toBe(false);
  });
});

// ── Activation ─────────────────────────────────────────────────────────────────

describe('CounterImageWidget — slot activation', () => {
  beforeEach(setup);

  it('clicking a slot activates it', async () => {
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0' },
    });
    const sides = wrapper.findAll('.counter-side');
    await sides[0].trigger('click');
    expect(sides[0].classes()).toContain('counter-side--active');
  });

  it('clicking the active slot again deactivates it', async () => {
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0' },
    });
    const side = wrapper.findAll('.counter-side')[0];
    await side.trigger('click');
    await side.trigger('click');
    expect(side.classes()).not.toContain('counter-side--active');
  });

  it('shows position counter when a slot is active', async () => {
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0' },
    });
    await wrapper.findAll('.counter-side')[0].trigger('click');
    expect(wrapper.find('.slot-count').exists()).toBe(true);
    expect(wrapper.find('.slot-count').text()).toMatch(/\d+\/\d+/);
  });
});

// ── Keyboard cycling ───────────────────────────────────────────────────────────

describe('CounterImageWidget — keyboard cycling', () => {
  beforeEach(setup);

  it('ArrowDown cycles to next counter and calls updateCounterRef', async () => {
    const store = setup();
    store.updateCounterRef = vi.fn();
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0' },
    });
    await wrapper.findAll('.counter-side')[0].trigger('click');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(store.updateCounterRef).toHaveBeenCalled();
    const [, ref] = store.updateCounterRef.mock.calls[0];
    expect(ref.front).toBeTruthy();
  });

  it('ArrowUp wraps around and calls updateCounterRef', async () => {
    const store = setup();
    store.updateCounterRef = vi.fn();
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0' },
    });
    await wrapper.findAll('.counter-side')[0].trigger('click');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(store.updateCounterRef).toHaveBeenCalled();
  });

  it('Escape deactivates the slot', async () => {
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0' },
    });
    await wrapper.findAll('.counter-side')[0].trigger('click');
    expect(wrapper.find('.counter-side--active').exists()).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.counter-side--active').exists()).toBe(false);
  });

  it('ignores arrow keys when no slot is active', async () => {
    const store = setup();
    store.updateCounterRef = vi.fn();
    mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0' },
    });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(store.updateCounterRef).not.toHaveBeenCalled();
  });
});

// ── Clear button ───────────────────────────────────────────────────────────────

describe('CounterImageWidget — clear', () => {
  beforeEach(setup);

  it('clear button calls updateCounterRef with null front', async () => {
    const store = setup();
    store.updateCounterRef = vi.fn();
    const wrapper = mount(CounterImageWidget, {
      props: {
        counterRef: { ...NULL_COUNTER_REF, front: 'CS1-Front_01.jpg' },
        nodePath: 'union.corps.0',
      },
    });
    await wrapper.find('.clear-btn').trigger('click');
    expect(store.updateCounterRef).toHaveBeenCalledWith(
      'union.corps.0',
      expect.objectContaining({ front: null })
    );
  });
});

// ── Filtering ──────────────────────────────────────────────────────────────────

describe('CounterImageWidget — counter filtering', () => {
  beforeEach(setup);

  it('front slot for union includes CS1-Front and U## only (excludes C##)', async () => {
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0' },
    });
    await wrapper.findAll('.counter-side')[0].trigger('click');
    const [, total] = wrapper.find('.slot-count').text().split('/').map(Number);
    // CS1-Front_01, CS1-Front_02, U1 copy, U2 copy → 4
    expect(total).toBe(4);
  });

  it('front slot for confederate includes CS1-Front and C## only (excludes U##)', async () => {
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'confederate.divisions.0' },
    });
    await wrapper.findAll('.counter-side')[0].trigger('click');
    const [, total] = wrapper.find('.slot-count').text().split('/').map(Number);
    // CS1-Front_01, CS1-Front_02, C1 copy, C2 copy → 4
    expect(total).toBe(4);
  });

  it('back slot includes only Back files', async () => {
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0' },
    });
    await wrapper.findAll('.counter-side')[1].trigger('click');
    const [, total] = wrapper.find('.slot-count').text().split('/').map(Number);
    // CS1-Back_01, CS1-Back_02 → 2
    expect(total).toBe(2);
  });
});
