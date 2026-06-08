import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';

const stubRouter = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div/>' } },
    { path: '/scenarios/:scenarioSlug/lobby', component: { template: '<div/>' } },
    { path: '/scenarios/:scenarioSlug/tools/map-editor', component: { template: '<div/>' } },
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

  it('renders a scenario dropdown', () => {
    const wrapper = makeWrapper();
    expect(wrapper.find('[data-testid="scenario-select"]').exists()).toBe(true);
  });

  it('defaults to THG in the scenario dropdown', () => {
    const wrapper = makeWrapper();
    const select = wrapper.find('[data-testid="scenario-select"]');
    expect(select.element.value).toBe('THG');
  });

  it('renders all nine scenario options', () => {
    const wrapper = makeWrapper();
    const options = wrapper.findAll('[data-testid="scenario-select"] option');
    expect(options).toHaveLength(9);
  });

  it('lobby link uses selected scenario slug in URL', () => {
    const wrapper = makeWrapper();
    const lobbyLink = wrapper.find('[data-testid="lobby-link"]');
    expect(lobbyLink.attributes('href')).toBe('/scenarios/THG/lobby');
  });

  it('editor link uses selected scenario slug in URL', () => {
    const wrapper = makeWrapper();
    const editorLink = wrapper.find('[data-testid="editor-link"]');
    expect(editorLink.attributes('href')).toBe('/scenarios/THG/tools/map-editor');
  });

  it('hydrates selected slug from localStorage', async () => {
    localStorage.setItem('lob-selected-scenario', 'SM');
    vi.resetModules();
    HomeView = (await import('./HomeView.vue')).default;
    const wrapper = makeWrapper();
    const select = wrapper.find('[data-testid="scenario-select"]');
    expect(select.element.value).toBe('SM');
  });

  it('updates slug and persists to localStorage when dropdown changes', async () => {
    const wrapper = makeWrapper();
    const select = wrapper.find('[data-testid="scenario-select"]');
    await select.setValue('SM');
    await select.trigger('change');
    expect(localStorage.getItem('lob-selected-scenario')).toBe('SM');
  });

  it('lobby link updates after scenario change', async () => {
    const wrapper = makeWrapper();
    const select = wrapper.find('[data-testid="scenario-select"]');
    await select.setValue('SM');
    await select.trigger('change');
    await wrapper.vm.$nextTick();
    const lobbyLink = wrapper.find('[data-testid="lobby-link"]');
    expect(lobbyLink.attributes('href')).toBe('/scenarios/SM/lobby');
  });

  it('editor button hidden when editors disabled', async () => {
    vi.stubEnv('VITE_MAP_EDITOR_ENABLED', 'false');
    vi.resetModules();
    HomeView = (await import('./HomeView.vue')).default;
    const wrapper = makeWrapper();
    expect(wrapper.find('[data-testid="editor-link"]').exists()).toBe(false);
  });
});
