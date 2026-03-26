import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { useOobStore } from '../stores/useOobStore.js';
import CounterImageWidget from './CounterImageWidget.vue';

function setupStore() {
  setActivePinia(createPinia());
  return useOobStore();
}

describe('CounterImageWidget', () => {
  beforeEach(() => {
    setupStore();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Placeholder rendering ──────────────────────────────────────────────────

  it('renders placeholders for both sides when counterRef is null', () => {
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: null, nodePath: 'union.corps.0' },
    });
    expect(wrapper.findAll('.thumb-placeholder').length).toBe(2);
    expect(wrapper.findAll('img').length).toBe(0);
  });

  it('renders placeholders when counterRef has null filenames', () => {
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: { front: null, back: null }, nodePath: 'union.corps.0' },
    });
    expect(wrapper.findAll('.thumb-placeholder').length).toBe(2);
  });

  // ── Thumbnail rendering ────────────────────────────────────────────────────

  it('renders front img with correct src when front filename is set', () => {
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: { front: 'C1.png', back: null }, nodePath: 'union.corps.0' },
    });
    const imgs = wrapper.findAll('img');
    expect(imgs.length).toBe(1);
    expect(imgs[0].attributes('src')).toBe('/counters/C1.png');
  });

  it('renders both imgs when both filenames are set', () => {
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: { front: 'C1.png', back: 'C1b.png' }, nodePath: 'union.corps.0' },
    });
    expect(wrapper.findAll('img').length).toBe(2);
  });

  // ── Image error handling ───────────────────────────────────────────────────

  it('shows placeholder when front img fires error event', async () => {
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: { front: 'missing.png', back: null }, nodePath: 'union.corps.0' },
    });
    expect(wrapper.find('img').exists()).toBe(true);
    await wrapper.find('img').trigger('error');
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.findAll('.thumb-placeholder').length).toBe(2);
  });

  // ── Filename text input ────────────────────────────────────────────────────

  it('calls store.updateCounterRef when front filename input changes', async () => {
    const store = useOobStore();
    store.updateCounterRef = vi.fn();
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: { front: null, back: null }, nodePath: 'union.corps.0.divisions.0' },
    });
    const inputs = wrapper.findAll('.filename-input');
    await inputs[0].setValue('C5.png');
    await inputs[0].trigger('change');
    expect(store.updateCounterRef).toHaveBeenCalledWith('union.corps.0.divisions.0', {
      front: 'C5.png',
      back: null,
    });
  });

  it('calls store.updateCounterRef when back filename input changes', async () => {
    const store = useOobStore();
    store.updateCounterRef = vi.fn();
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: { front: null, back: null }, nodePath: 'union.corps.0.divisions.0' },
    });
    const inputs = wrapper.findAll('.filename-input');
    await inputs[1].setValue('C5b.png');
    await inputs[1].trigger('change');
    expect(store.updateCounterRef).toHaveBeenCalledWith('union.corps.0.divisions.0', {
      front: null,
      back: 'C5b.png',
    });
  });

  it('stores null when filename input is cleared', async () => {
    const store = useOobStore();
    store.updateCounterRef = vi.fn();
    const wrapper = mount(CounterImageWidget, {
      props: {
        counterRef: { front: 'old.png', back: null },
        nodePath: 'union.corps.0',
      },
    });
    const inputs = wrapper.findAll('.filename-input');
    await inputs[0].setValue('');
    await inputs[0].trigger('change');
    expect(store.updateCounterRef).toHaveBeenCalledWith('union.corps.0', {
      front: null,
      back: null,
    });
  });

  // ── Upload flow ────────────────────────────────────────────────────────────

  it('shows upload error when POST /api/counters/upload returns non-ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: () => Promise.resolve({}) })
    );
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: { front: null, back: null }, nodePath: 'union.corps.0' },
    });
    // Directly invoke upload to avoid file-picker complexity
    await wrapper.vm.uploadFile(new File(['x'], 'test.png', { type: 'image/png' }), 'front');
    expect(wrapper.find('.upload-error').exists()).toBe(true);
    expect(wrapper.find('.upload-error').text()).toContain('Upload failed');
  });

  it('calls updateCounterRef with returned filename on successful upload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ filename: 'uploaded.png' }),
      })
    );
    const store = useOobStore();
    store.updateCounterRef = vi.fn();
    const wrapper = mount(CounterImageWidget, {
      props: { counterRef: { front: null, back: null }, nodePath: 'union.corps.0' },
    });
    await wrapper.vm.uploadFile(new File(['x'], 'test.png', { type: 'image/png' }), 'front');
    expect(store.updateCounterRef).toHaveBeenCalledWith('union.corps.0', {
      front: 'uploaded.png',
      back: null,
    });
  });
});
