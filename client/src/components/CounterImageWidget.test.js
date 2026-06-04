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
  // Hoist wrapper so afterEach can unmount it, preventing window keydown listener leaks
  // across tests (each mount registers a global listener; unmount removes it).
  let wrapper;
  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it('activate does NOT commit to store when slot is empty (#211)', async () => {
    const store = setup();
    store.updateCounterRef = vi.fn();
    wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0' },
    });
    await wrapper.findAll('.counter-side')[0].trigger('click');
    // Clicking an empty slot must not write to the store — preview only
    expect(store.updateCounterRef).not.toHaveBeenCalled();
  });

  it('ArrowDown commits counter after activation (↑/↓ is the write path)', async () => {
    const store = setup();
    store.updateCounterRef = vi.fn();
    wrapper = mount(CounterImageWidget, {
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
    wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0' },
    });
    await wrapper.findAll('.counter-side')[0].trigger('click');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(store.updateCounterRef).toHaveBeenCalled();
  });

  it('Escape deactivates the slot', async () => {
    wrapper = mount(CounterImageWidget, {
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
    wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0' },
    });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(store.updateCounterRef).not.toHaveBeenCalled();
  });

  it('commit() is a no-op when nodePath is null — store is never called (#213)', async () => {
    const store = setup();
    store.updateCounterRef = vi.fn();
    wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: null },
    });
    await wrapper.findAll('.counter-side')[0].trigger('click');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(store.updateCounterRef).not.toHaveBeenCalled();
  });

  it('arrow keys do not cycle counters when focus is inside a form field (#212)', async () => {
    const store = setup();
    store.updateCounterRef = vi.fn();
    wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0' },
    });
    await wrapper.findAll('.counter-side')[0].trigger('click');
    // Dispatch ArrowDown from an INPUT element so e.target.tagName === 'INPUT'
    // The event bubbles up to the window listener which should bail out early
    const inputEl = document.createElement('input');
    document.body.appendChild(inputEl);
    inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(store.updateCounterRef).not.toHaveBeenCalled();
    document.body.removeChild(inputEl);
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

  // Task 2.2 (#486): side prop drives the correct filter
  it('front slot for union includes CS1-Front and U## only (excludes C##)', async () => {
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0', side: 'union' },
    });
    await wrapper.findAll('.counter-side')[0].trigger('click');
    const [, total] = wrapper.find('.slot-count').text().split('/').map(Number);
    // CS1-Front_01, CS1-Front_02, U1 copy, U2 copy → 4
    expect(total).toBe(4);
  });

  it('front slot for confederate includes CS1-Front and C## only (excludes U##)', async () => {
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'confederate.divisions.0', side: 'confederate' },
    });
    await wrapper.findAll('.counter-side')[0].trigger('click');
    const [, total] = wrapper.find('.slot-count').text().split('/').map(Number);
    // CS1-Front_01, CS1-Front_02, C1 copy, C2 copy → 4
    expect(total).toBe(4);
  });

  it('back slot includes only Back files', async () => {
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0', side: 'union' },
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
      props: { counterRef: null, nodePath: 'union.corps.0', side: 'union' },
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
        side: 'union',
      },
    });
    await wrapper.findAll('.counter-side')[0].trigger('click');
    const [, total] = wrapper.find('.slot-count').text().split('/').map(Number);
    // CS1-Front_01 is the current value — it must remain in the list → 4
    expect(total).toBe(4);
  });

  // Task 2.2 (#486): side prop (not path) drives the filter.
  // Use counterRef.front = 'U1 copy.png' as a witness: union side finds it in the list
  // (starts at slot position 3/4), CSA side excludes it and falls back to position 1/4.
  // This distinguishes side-based from path-based filtering even when total counts match.
  it('side prop drives the correct cut-out filter regardless of nodePath', async () => {
    // Union side on CSA nodePath: U1 is a valid union cut-out → found at index 2 → pos 3
    const union = mount(CounterImageWidget, {
      props: {
        counterRef: { ...NULL_COUNTER_REF, front: 'U1 copy.png' },
        nodePath: 'confederate.corps.0',
        side: 'union',
      },
    });
    await union.findAll('.counter-side')[0].trigger('click');
    const [unionPos, unionTotal] = union.find('.slot-count').text().split('/').map(Number);
    union.unmount();

    // CSA side on union nodePath: U1 is a union cut-out → excluded → fallback index 0 → pos 1
    const csa = mount(CounterImageWidget, {
      props: {
        counterRef: { ...NULL_COUNTER_REF, front: 'U1 copy.png' },
        nodePath: 'union.corps.0',
        side: 'confederate',
      },
    });
    await csa.findAll('.counter-side')[0].trigger('click');
    const [csaPos, csaTotal] = csa.find('.slot-count').text().split('/').map(Number);
    csa.unmount();

    expect(unionTotal).toBe(4); // CS1-Front_01/02 + U1/U2
    expect(csaTotal).toBe(4); // CS1-Front_01/02 + C1/C2
    expect(unionPos).toBe(3); // U1 found at index 2 → displayed position 3
    expect(csaPos).toBe(1); // U1 not in CSA list → fallback index 0 → position 1
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
  // Hoist wrapper to prevent window keydown listener leaks across tests.
  let wrapper;
  beforeEach(setup);
  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it('does NOT render promoted row in default (unit) mode', () => {
    wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0' },
    });
    expect(wrapper.find('.promoted-row').exists()).toBe(false);
  });

  it('renders promoted row when mode="leader"', () => {
    wrapper = mount(CounterImageWidget, {
      props: {
        counterRef: LEADER_COUNTER_REF,
        nodePath: 'leaders.union.corps.0',
        mode: 'leader',
        side: 'union',
      },
    });
    expect(wrapper.find('.promoted-row').exists()).toBe(true);
  });

  it('shows placeholder for promoted front and back when null', () => {
    wrapper = mount(CounterImageWidget, {
      props: {
        counterRef: LEADER_COUNTER_REF,
        nodePath: 'leaders.union.corps.0',
        mode: 'leader',
        side: 'union',
      },
    });
    const promoted = wrapper.find('.promoted-row');
    // Both promoted slots have no filename set — show dash or placeholder
    expect(promoted.text()).toContain('—');
  });

  it('shows promotedFront filename when set', () => {
    wrapper = mount(CounterImageWidget, {
      props: {
        counterRef: { ...LEADER_COUNTER_REF, promotedFront: 'CS1-Front_01.jpg' },
        nodePath: 'leaders.union.corps.0',
        mode: 'leader',
        side: 'union',
      },
    });
    const promoted = wrapper.find('.promoted-row');
    expect(promoted.text()).toContain('CS1-Front_01.jpg');
  });

  it('all 4 counter slots are present in leader mode (2 standard + 2 promoted)', () => {
    wrapper = mount(CounterImageWidget, {
      props: {
        counterRef: LEADER_COUNTER_REF,
        nodePath: 'leaders.union.corps.0',
        mode: 'leader',
        side: 'union',
      },
    });
    expect(wrapper.findAll('.counter-side').length).toBe(4);
  });

  it('clicking promoted front slot activates it', async () => {
    wrapper = mount(CounterImageWidget, {
      props: {
        counterRef: LEADER_COUNTER_REF,
        nodePath: 'leaders.union.corps.0',
        mode: 'leader',
        side: 'union',
      },
    });
    const promoFront = wrapper.find('.promoted-row').findAll('.counter-side')[0];
    await promoFront.trigger('click');
    expect(promoFront.classes()).toContain('counter-side--active');
  });

  it('ArrowDown on active promotedFront slot commits CS1-Front_02.jpg to promotedFront, leaves front untouched', async () => {
    const store = setup();
    store.updateCounterRef = vi.fn();
    wrapper = mount(CounterImageWidget, {
      props: {
        counterRef: LEADER_COUNTER_REF,
        nodePath: 'leaders.union.corps.0',
        mode: 'leader',
        side: 'union',
      },
    });
    const promoFront = wrapper.find('.promoted-row').findAll('.counter-side')[0];
    await promoFront.trigger('click');
    // Index 0 = CS1-Front_01.jpg; ArrowDown advances to index 1 = CS1-Front_02.jpg
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(store.updateCounterRef).toHaveBeenCalledTimes(1);
    expect(store.updateCounterRef.mock.calls[0][1]).toMatchObject({
      promotedFront: 'CS1-Front_02.jpg',
      front: null,
    });
  });

  it('commit with null counterRef in leader mode preserves promoted fields in default shape', async () => {
    const store = setup();
    store.updateCounterRef = vi.fn();
    // counterRef is null — getDefaultCounterRef() leader branch must include promoted keys
    wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'leaders.union.corps.0', mode: 'leader', side: 'union' },
    });
    await wrapper.findAll('.counter-side')[0].trigger('click'); // activate front
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await wrapper.vm.$nextTick();
    const committed = store.updateCounterRef.mock.calls[0][1];
    expect(committed.front).toBeTruthy();
    expect('promotedFront' in committed).toBe(true);
    expect('promotedBack' in committed).toBe(true);
  });

  it('no file upload inputs are rendered in leader mode', () => {
    wrapper = mount(CounterImageWidget, {
      props: {
        counterRef: LEADER_COUNTER_REF,
        nodePath: 'leaders.union.corps.0',
        mode: 'leader',
        side: 'union',
      },
    });
    expect(wrapper.find('input[type="file"]').exists()).toBe(false);
  });

  it('confederate side prop excludes union cut-outs in leader mode (#486)', async () => {
    wrapper = mount(CounterImageWidget, {
      props: {
        counterRef: LEADER_COUNTER_REF,
        nodePath: 'leaders.confederate.army.0',
        mode: 'leader',
        side: 'confederate',
      },
    });
    await wrapper.findAll('.counter-side')[0].trigger('click'); // activate front
    const [, total] = wrapper.find('.slot-count').text().split('/').map(Number);
    // CS1-Front_01, CS1-Front_02, C1 copy, C2 copy → 4 (U## excluded for confederate)
    expect(total).toBe(4);
  });
});

// ── Focusout deactivation (#487) ───────────────────────────────────────────────
// activeFace must be cleared when focus leaves the widget so Arrow keys stop
// suppressing page scrolling. Within-widget focus moves must preserve activeFace.

describe('CounterImageWidget — focusout deactivation (#487)', () => {
  let wrapper;
  beforeEach(setup);
  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it('clears activeFace when focus leaves the widget (external relatedTarget)', async () => {
    wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0', side: 'union' },
      attachTo: document.body,
    });
    await wrapper.findAll('.counter-side')[0].trigger('click');
    expect(wrapper.find('.counter-side--active').exists()).toBe(true);

    const externalEl = document.createElement('button');
    document.body.appendChild(externalEl);
    try {
      wrapper.element.dispatchEvent(
        new FocusEvent('focusout', { bubbles: true, relatedTarget: externalEl })
      );
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.counter-side--active').exists()).toBe(false);
    } finally {
      externalEl.remove();
    }
  });

  it('clears activeFace when focus leaves the document (null relatedTarget)', async () => {
    wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0', side: 'union' },
      attachTo: document.body,
    });
    await wrapper.findAll('.counter-side')[0].trigger('click');
    expect(wrapper.find('.counter-side--active').exists()).toBe(true);

    // relatedTarget null means focus left the document entirely
    wrapper.element.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: null })
    );
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.counter-side--active').exists()).toBe(false);
  });

  it('keeps activeFace when focus moves to another slot within the widget', async () => {
    wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0', side: 'union' },
      attachTo: document.body,
    });
    await wrapper.findAll('.counter-side')[0].trigger('click');
    expect(wrapper.find('.counter-side--active').exists()).toBe(true);

    // relatedTarget is an element inside the widget — should NOT clear activeFace
    const internalEl = wrapper.findAll('.counter-side')[1].element;
    wrapper.element.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: internalEl })
    );
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.counter-side--active').exists()).toBe(true);
  });
});
