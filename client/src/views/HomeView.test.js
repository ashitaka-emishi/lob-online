import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';

const stubRouter = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div/>' } },
    {
      path: '/modules/:moduleSlug/scenarios/:scenarioSlug/lobby',
      component: { template: '<div/>' },
    },
    { path: '/modules/:moduleSlug/tools/map-editor', component: { template: '<div/>' } },
    { path: '/about', component: { template: '<div/>' } },
  ],
});

let HomeView;

function makeWrapper(router = stubRouter) {
  const pinia = createPinia();
  setActivePinia(pinia);
  return mount(HomeView, { global: { plugins: [pinia, router] } });
}

describe('HomeView', () => {
  beforeEach(async () => {
    vi.stubEnv('VITE_MAP_EDITOR_ENABLED', 'true');
    vi.resetModules();
    localStorage.clear();
    HomeView = (await import('./HomeView.vue')).default;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it('renders the game title', () => {
    const wrapper = makeWrapper();
    expect(wrapper.text()).toContain('Line of Battle');
  });

  it('renders a module dropdown', () => {
    const wrapper = makeWrapper();
    expect(wrapper.find('[data-testid="module-select"]').exists()).toBe(true);
  });

  it('defaults to THG in the module dropdown', () => {
    const wrapper = makeWrapper();
    const select = wrapper.find('[data-testid="module-select"]');
    expect(select.element.value).toBe('THG');
  });

  it('renders all nine module options', () => {
    const wrapper = makeWrapper();
    const options = wrapper.findAll('[data-testid="module-select"] option');
    expect(options).toHaveLength(9);
  });

  it('lobby link uses selected module slug in URL', () => {
    const wrapper = makeWrapper();
    const lobbyLink = wrapper.find('[data-testid="lobby-link"]');
    expect(lobbyLink.attributes('href')).toBe('/modules/THG/scenarios/full-battle/lobby');
  });

  it('editor link uses selected module slug in URL', () => {
    const wrapper = makeWrapper();
    const editorLink = wrapper.find('[data-testid="editor-link"]');
    expect(editorLink.attributes('href')).toBe('/modules/THG/tools/map-editor');
  });

  it('hydrates selected slug from localStorage', async () => {
    localStorage.setItem('lob-selected-module', 'SM');
    vi.resetModules();
    HomeView = (await import('./HomeView.vue')).default;
    const wrapper = makeWrapper();
    const select = wrapper.find('[data-testid="module-select"]');
    expect(select.element.value).toBe('SM');
  });

  it('updates slug and persists to localStorage when dropdown changes', async () => {
    const wrapper = makeWrapper();
    const select = wrapper.find('[data-testid="module-select"]');
    await select.setValue('SM');
    await select.trigger('change');
    expect(localStorage.getItem('lob-selected-module')).toBe('SM');
  });

  it('lobby link updates after module change', async () => {
    const wrapper = makeWrapper();
    const select = wrapper.find('[data-testid="module-select"]');
    await select.setValue('SM');
    await select.trigger('change');
    await wrapper.vm.$nextTick();
    const lobbyLink = wrapper.find('[data-testid="lobby-link"]');
    expect(lobbyLink.attributes('href')).toBe('/modules/SM/scenarios/full-battle/lobby');
  });

  it('editor button hidden when editors disabled', async () => {
    vi.stubEnv('VITE_MAP_EDITOR_ENABLED', 'false');
    vi.resetModules();
    HomeView = (await import('./HomeView.vue')).default;
    const wrapper = makeWrapper();
    expect(wrapper.find('[data-testid="editor-link"]').exists()).toBe(false);
  });

  it('renders About link', () => {
    const wrapper = makeWrapper();
    const aboutLink = wrapper.find('[data-testid="about-link"]');
    expect(aboutLink.exists()).toBe(true);
  });

  it('About link navigates to /about', () => {
    const wrapper = makeWrapper();
    const aboutLink = wrapper.find('[data-testid="about-link"]');
    expect(aboutLink.attributes('href')).toBe('/about');
  });
});
