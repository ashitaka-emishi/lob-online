import { describe, it, expect, vi, beforeEach } from 'vitest';
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

// Must import after vi.mock calls
let HomeView;

describe('HomeView', () => {
  beforeEach(async () => {
    vi.resetModules();
    HomeView = (await import('./HomeView.vue')).default;
  });

  it('renders the game title', async () => {
    const wrapper = mount(HomeView, { global: { plugins: [stubRouter] } });
    expect(wrapper.text()).toContain('Line of Battle');
  });

  it('renders a Lobby menu button', async () => {
    const wrapper = mount(HomeView, { global: { plugins: [stubRouter] } });
    const lobbyLink = wrapper.find('a[href="/lobby"], [to="/lobby"]');
    expect(lobbyLink.exists()).toBe(true);
  });

  it('renders an Editor menu button', async () => {
    const wrapper = mount(HomeView, { global: { plugins: [stubRouter] } });
    expect(wrapper.text().toLowerCase()).toContain('editor');
  });

  it('editor button points to /tools/map-editor when editors enabled', async () => {
    vi.stubEnv('VITE_MAP_EDITOR_ENABLED', 'true');
    vi.resetModules();
    HomeView = (await import('./HomeView.vue')).default;
    const wrapper = mount(HomeView, { global: { plugins: [stubRouter] } });
    const editorLink = wrapper.find('[data-testid="editor-link"]');
    expect(editorLink.attributes('href') ?? editorLink.attributes('to')).toBe('/tools/map-editor');
    vi.unstubAllEnvs();
  });

  it('editor button points to /lobby when editors disabled', async () => {
    vi.stubEnv('VITE_MAP_EDITOR_ENABLED', 'false');
    vi.resetModules();
    HomeView = (await import('./HomeView.vue')).default;
    const wrapper = mount(HomeView, { global: { plugins: [stubRouter] } });
    const editorLink = wrapper.find('[data-testid="editor-link"]');
    expect(editorLink.attributes('href') ?? editorLink.attributes('to')).toBe('/lobby');
    vi.unstubAllEnvs();
  });
});
