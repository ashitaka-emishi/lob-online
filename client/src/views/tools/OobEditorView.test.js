import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

const MINIMAL_OOB = {
  _status: 'available',
  union: { army: 'Army of the Potomac', corps: [] },
  confederate: { army: 'Army of Northern Virginia', corps: [] },
};
const MINIMAL_LEADERS = { _status: 'available', union: { army: [] }, confederate: { army: [] } };

function mockFetch(oobData, leadersData, ok = true) {
  let call = 0;
  return vi.fn().mockImplementation(() => {
    const data = call++ === 0 ? oobData : leadersData;
    return Promise.resolve({
      ok,
      status: ok ? 200 : 500,
      json: () => Promise.resolve(JSON.parse(JSON.stringify(data))),
    });
  });
}

describe('OobEditorView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders OOB Editor title', async () => {
    vi.stubGlobal('fetch', mockFetch(MINIMAL_OOB, MINIMAL_LEADERS));
    const { default: OobEditorView } = await import('./OobEditorView.vue');
    const wrapper = mount(OobEditorView);
    await flushPromises();
    expect(wrapper.text()).toContain('OOB Editor');
    wrapper.unmount();
  });

  it('renders Union and Confederate side toggle buttons', async () => {
    vi.stubGlobal('fetch', mockFetch(MINIMAL_OOB, MINIMAL_LEADERS));
    const { default: OobEditorView } = await import('./OobEditorView.vue');
    const wrapper = mount(OobEditorView);
    await flushPromises();
    expect(wrapper.text()).toContain('Union');
    expect(wrapper.text()).toContain('Confederate');
    wrapper.unmount();
  });

  it('renders Pull and Push buttons', async () => {
    vi.stubGlobal('fetch', mockFetch(MINIMAL_OOB, MINIMAL_LEADERS));
    const { default: OobEditorView } = await import('./OobEditorView.vue');
    const wrapper = mount(OobEditorView);
    await flushPromises();
    expect(wrapper.find('.pull-btn').exists()).toBe(true);
    expect(wrapper.find('.push-btn').exists()).toBe(true);
    wrapper.unmount();
  });

  it('shows "Select a unit" placeholder when no node selected', async () => {
    vi.stubGlobal('fetch', mockFetch(MINIMAL_OOB, MINIMAL_LEADERS));
    const { default: OobEditorView } = await import('./OobEditorView.vue');
    const wrapper = mount(OobEditorView);
    await flushPromises();
    expect(wrapper.text()).toContain('Select a unit');
    wrapper.unmount();
  });

  it('shows unsaved marker when store is dirty', async () => {
    vi.stubGlobal('fetch', mockFetch(MINIMAL_OOB, MINIMAL_LEADERS));
    const { default: OobEditorView } = await import('./OobEditorView.vue');
    const { useOobStore } = await import('../../stores/useOobStore.js');
    const wrapper = mount(OobEditorView);
    await flushPromises();

    const store = useOobStore();
    expect(wrapper.find('.unsaved-marker').exists()).toBe(false);
    store.dirty = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.unsaved-marker').exists()).toBe(true);
    wrapper.unmount();
  });

  it('Union side button is active by default', async () => {
    vi.stubGlobal('fetch', mockFetch(MINIMAL_OOB, MINIMAL_LEADERS));
    const { default: OobEditorView } = await import('./OobEditorView.vue');
    const wrapper = mount(OobEditorView);
    await flushPromises();
    const buttons = wrapper.findAll('.side-toggle button');
    expect(buttons[0].classes()).toContain('active');
    expect(buttons[1].classes()).not.toContain('active');
    wrapper.unmount();
  });

  it('switches active side on Confederate click', async () => {
    vi.stubGlobal('fetch', mockFetch(MINIMAL_OOB, MINIMAL_LEADERS));
    const { default: OobEditorView } = await import('./OobEditorView.vue');
    const wrapper = mount(OobEditorView);
    await flushPromises();
    const buttons = wrapper.findAll('.side-toggle button');
    await buttons[1].trigger('click');
    expect(buttons[1].classes()).toContain('active');
    expect(buttons[0].classes()).not.toContain('active');
    wrapper.unmount();
  });
});
