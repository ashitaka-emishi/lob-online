import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';

const stubRouter = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div/>' } },
    { path: '/lobby', component: { template: '<div/>' } },
    { path: '/tools/map-editor', component: { template: '<div/>' } },
  ],
});

let HomeView;

describe('HomeView', () => {
  beforeEach(async () => {
    vi.stubEnv('VITE_MAP_EDITOR_ENABLED', 'true');
    vi.resetModules();
    HomeView = (await import('./HomeView.vue')).default;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders the game title', () => {
    const wrapper = mount(HomeView, { global: { plugins: [stubRouter] } });
    expect(wrapper.text()).toContain('Line of Battle');
  });

  it('renders a Lobby menu button', () => {
    const wrapper = mount(HomeView, { global: { plugins: [stubRouter] } });
    const lobbyLink = wrapper.find('a[href="/lobby"]');
    expect(lobbyLink.exists()).toBe(true);
  });

  it('editor button present and points to /tools/map-editor when editors enabled', () => {
    const wrapper = mount(HomeView, { global: { plugins: [stubRouter] } });
    const editorLink = wrapper.find('[data-testid="editor-link"]');
    expect(editorLink.exists()).toBe(true);
    expect(editorLink.attributes('href') ?? editorLink.attributes('to')).toBe('/tools/map-editor');
  });

  it('editor button hidden when editors disabled', async () => {
    vi.stubEnv('VITE_MAP_EDITOR_ENABLED', 'false');
    vi.resetModules();
    HomeView = (await import('./HomeView.vue')).default;
    const wrapper = mount(HomeView, { global: { plugins: [stubRouter] } });
    expect(wrapper.find('[data-testid="editor-link"]').exists()).toBe(false);
  });
});
