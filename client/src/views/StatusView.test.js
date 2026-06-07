import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';

// Mock socket.io-client before importing the component
vi.mock('socket.io-client', () => {
  const mockSocket = {
    on: vi.fn(),
    disconnect: vi.fn(),
  };
  return { io: vi.fn(() => mockSocket) };
});

import StatusView from './StatusView.vue';

// Minimal router stub to satisfy RouterLink
const stubRouter = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/', component: { template: '<div/>' } }],
});

describe('StatusView', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders the game title', () => {
    const wrapper = mount(StatusView, { global: { plugins: [stubRouter] } });
    expect(wrapper.text()).toContain('Line of Battle Online');
  });

  it('renders South Mountain subtitle', () => {
    const wrapper = mount(StatusView, { global: { plugins: [stubRouter] } });
    expect(wrapper.text()).toContain('South Mountain');
  });

  it('shows initial connecting status', () => {
    const wrapper = mount(StatusView, { global: { plugins: [stubRouter] } });
    expect(wrapper.text()).toContain('connecting');
  });

  it('has a status paragraph with class', () => {
    const wrapper = mount(StatusView, { global: { plugins: [stubRouter] } });
    expect(wrapper.find('.status').exists()).toBe(true);
  });

  it('does not render dev-tools section when VITE_MAP_EDITOR_ENABLED is false', async () => {
    vi.stubEnv('VITE_MAP_EDITOR_ENABLED', 'false');
    vi.resetModules();
    const { default: StatusViewFresh } = await import('./StatusView.vue');
    const wrapper = mount(StatusViewFresh, { global: { plugins: [stubRouter] } });
    expect(wrapper.find('.dev-tools').exists()).toBe(false);
  });
});
