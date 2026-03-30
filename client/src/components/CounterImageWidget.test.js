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
  it('activate does NOT commit to store when slot is empty (#211)', async () => {
    const store = setup();
    store.updateCounterRef = vi.fn();
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0' },
    });
    await wrapper.findAll('.counter-side')[0].trigger('click');
    // Clicking an empty slot must not write to the store — preview only
    expect(store.updateCounterRef).not.toHaveBeenCalled();
  });

  it('ArrowDown commits counter after activation (↑/↓ is the write path)', async () => {
    const store = setup();
    store.updateCounterRef = vi.fn();
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0' },
    });
    await wrapper.findAll('.counter-side')[0].trigger('click');
    // No commit on activate; first commit happens on ArrowDown
    expect(store.updateCounterRef).not.toHaveBeenCalled();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(store.updateCounterRef).toHaveBeenCalledTimes(1);
    expect(store.updateCounterRef.mock.calls[0][1].front).toBeTruthy();
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

// ── Image error recovery ────────────────────────────────────────────────────────

describe('CounterImageWidget — image error recovery', () => {
  beforeEach(setup);

  it('clears imgError when counterRef.front changes to a new file', async () => {
    const wrapper = mount(CounterImageWidget, {
      props: {
        counterRef: { ...NULL_COUNTER_REF, front: 'CS1-Front_01.jpg' },
        nodePath: 'union.corps.0',
      },
    });
    await wrapper.find('.thumb').trigger('error');
    expect(wrapper.findAll('.thumb-placeholder').length).toBeGreaterThanOrEqual(1);
    await wrapper.setProps({
      counterRef: { ...NULL_COUNTER_REF, front: 'CS1-Front_02.jpg' },
    });
    expect(wrapper.find('.thumb').exists()).toBe(true);
    expect(wrapper.find('.thumb').attributes('src')).toBe('/counters/CS1-Front_02.jpg');
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

  it('excludes files already assigned to other nodes', async () => {
    const store = setup();
    // Mock updateCounterRef so the auto-commit on activate doesn't add to usedFiles
    store.updateCounterRef = vi.fn();
    // Pre-assign one front file to a sibling node in the store
    store.oob = {
      _status: 'available',
      union: {
        corps: [
          {
            id: '1c',
            counterRef: null,
            divisions: [
              {
                id: '1d',
                counterRef: {
                  front: 'CS1-Front_01.jpg',
                  back: null,
                  frontConfidence: null,
                  backConfidence: null,
                },
              },
            ],
          },
        ],
      },
    };
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0' },
    });
    await wrapper.findAll('.counter-side')[0].trigger('click');
    const [, total] = wrapper.find('.slot-count').text().split('/').map(Number);
    // CS1-Front_01 is taken; CS1-Front_02, U1 copy, U2 copy remain → 3
    expect(total).toBe(3);
  });

  it('does not exclude the current node own assignment from its own list', async () => {
    const wrapper = mount(CounterImageWidget, {
      props: {
        counterRef: { ...NULL_COUNTER_REF, front: 'CS1-Front_01.jpg' },
        nodePath: 'union.corps.0',
      },
    });
    await wrapper.findAll('.counter-side')[0].trigger('click');
    const [, total] = wrapper.find('.slot-count').text().split('/').map(Number);
    // CS1-Front_01 is the current value — it must remain in the list → 4
    expect(total).toBe(4);
  });
});

// ── Leader mode ────────────────────────────────────────────────────────────────

const LEADER_COUNTER_REF = {
  front: null,
  frontConfidence: null,
  back: null,
  backConfidence: null,
  promotedFront: null,
  promotedFrontConfidence: null,
  promotedBack: null,
  promotedBackConfidence: null,
};

describe('CounterImageWidget — leader mode', () => {
  beforeEach(setup);

  it('does NOT render promoted row in default (unit) mode', () => {
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0' },
    });
    expect(wrapper.find('.promoted-row').exists()).toBe(false);
  });

  it('renders promoted row when mode="leader"', () => {
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: LEADER_COUNTER_REF, nodePath: 'leaders.union.corps.0', mode: 'leader' },
    });
    expect(wrapper.find('.promoted-row').exists()).toBe(true);
  });

  it('shows placeholder for promoted front and back when null', () => {
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: LEADER_COUNTER_REF, nodePath: 'leaders.union.corps.0', mode: 'leader' },
    });
    const promoted = wrapper.find('.promoted-row');
    // Both promoted slots have no filename set — show dash or placeholder
    expect(promoted.text()).toContain('—');
  });

  it('shows promotedFront filename when set', () => {
    const wrapper = mount(CounterImageWidget, {
      props: {
        counterRef: { ...LEADER_COUNTER_REF, promotedFront: 'CS1-Front_01.jpg' },
        nodePath: 'leaders.union.corps.0',
        mode: 'leader',
      },
    });
    const promoted = wrapper.find('.promoted-row');
    expect(promoted.text()).toContain('CS1-Front_01.jpg');
  });

  it('Browse… button triggers hidden file input', async () => {
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: LEADER_COUNTER_REF, nodePath: 'leaders.union.corps.0', mode: 'leader' },
    });
    const fileInput = wrapper.find('.promoted-file-input');
    const clickSpy = vi.spyOn(fileInput.element, 'click').mockImplementation(() => {});
    await wrapper.find('.promoted-browse-btn').trigger('click');
    expect(clickSpy).toHaveBeenCalled();
  });

  it('successful upload updates promotedFront via updateCounterRef', async () => {
    const store = setup();
    store.updateCounterRef = vi.fn();
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true, filename: 'CS1-Front_01.jpg' }),
    });

    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: LEADER_COUNTER_REF, nodePath: 'leaders.union.corps.0', mode: 'leader' },
    });

    // Trigger browse for promotedFront
    await wrapper.findAll('.promoted-browse-btn')[0].trigger('click');

    // Simulate file selection on the hidden input
    const fileInput = wrapper.find('.promoted-file-input');
    const file = new File(['x'], 'CS1-Front_01.jpg', { type: 'image/jpeg' });
    Object.defineProperty(fileInput.element, 'files', { value: [file], configurable: true });
    await fileInput.trigger('change');
    await wrapper.vm.$nextTick();

    expect(store.updateCounterRef).toHaveBeenCalledWith(
      'leaders.union.corps.0',
      expect.objectContaining({ promotedFront: 'CS1-Front_01.jpg' })
    );

    delete globalThis.fetch;
  });

  it('failed upload does not call updateCounterRef', async () => {
    const store = setup();
    store.updateCounterRef = vi.fn();
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: false, message: 'Upload failed' }),
    });

    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: LEADER_COUNTER_REF, nodePath: 'leaders.union.corps.0', mode: 'leader' },
    });

    await wrapper.findAll('.promoted-browse-btn')[0].trigger('click');
    const fileInput = wrapper.find('.promoted-file-input');
    const file = new File(['x'], 'bad.jpg', { type: 'image/jpeg' });
    Object.defineProperty(fileInput.element, 'files', { value: [file], configurable: true });
    await fileInput.trigger('change');
    await wrapper.vm.$nextTick();

    expect(store.updateCounterRef).not.toHaveBeenCalled();

    delete globalThis.fetch;
  });

  it('standard front/back slots are still present in leader mode (4 total: 2 standard + 2 promoted)', () => {
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: LEADER_COUNTER_REF, nodePath: 'leaders.union.corps.0', mode: 'leader' },
    });
    // 2 standard (front/back) + 2 promoted (front/back) = 4
    expect(wrapper.findAll('.counter-side').length).toBe(4);
  });
});
