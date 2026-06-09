import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';

function makeRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: { template: '<div/>' } },
      { path: '/scenarios/:scenarioSlug/lobby', component: { template: '<div/>' } },
      { path: '/scenarios/:scenarioSlug/tools/scenario-editor', component: { template: '<div/>' } },
      { path: '/scenarios/:scenarioSlug/tools/map-editor', component: { template: '<div/>' } },
      { path: '/scenarios/:scenarioSlug/tools/oob-editor', component: { template: '<div/>' } },
      { path: '/scenarios/:scenarioSlug/tools/map-test', component: { template: '<div/>' } },
      { path: '/scenarios/:scenarioSlug/tools/table-test', component: { template: '<div/>' } },
    ],
  });
}

let EditorNav;

describe('EditorNav', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('always shows a home escape hatch pointing to /', async () => {
    vi.stubEnv('VITE_MAP_EDITOR_ENABLED', 'false');
    vi.resetModules();
    EditorNav = (await import('./EditorNav.vue')).default;
    const router = makeRouter('SM');
    const wrapper = mount(EditorNav, { global: { plugins: [router] } });
    const homeLink = wrapper.find('[data-testid="nav-home"]');
    expect(homeLink.exists()).toBe(true);
    expect(homeLink.attributes('href') ?? homeLink.attributes('to')).toBe('/');
  });

  it('shows all five tool links when editors enabled', async () => {
    vi.stubEnv('VITE_MAP_EDITOR_ENABLED', 'true');
    vi.resetModules();
    EditorNav = (await import('./EditorNav.vue')).default;
    const wrapper = mount(EditorNav, { global: { plugins: [makeRouter()] } });
    expect(wrapper.find('[data-testid="nav-scenario-editor"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="nav-map-editor"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="nav-oob-editor"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="nav-map-test"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="nav-table-test"]').exists()).toBe(true);
  });

  it('hides tool links when editors disabled', async () => {
    vi.stubEnv('VITE_MAP_EDITOR_ENABLED', 'false');
    vi.resetModules();
    EditorNav = (await import('./EditorNav.vue')).default;
    const wrapper = mount(EditorNav, { global: { plugins: [makeRouter()] } });
    expect(wrapper.find('[data-testid="nav-scenario-editor"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="nav-map-editor"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="nav-oob-editor"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="nav-map-test"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="nav-table-test"]').exists()).toBe(false);
  });

  it('tool links include scenario slug from route param', async () => {
    vi.stubEnv('VITE_MAP_EDITOR_ENABLED', 'true');
    vi.resetModules();
    EditorNav = (await import('./EditorNav.vue')).default;
    const router = makeRouter();
    await router.push('/scenarios/SM/tools/map-editor');
    await router.isReady();
    const wrapper = mount(EditorNav, { global: { plugins: [router] } });
    expect(wrapper.find('[data-testid="nav-map-editor"]').attributes('href')).toBe(
      '/scenarios/SM/tools/map-editor'
    );
    expect(wrapper.find('[data-testid="nav-scenario-editor"]').attributes('href')).toBe(
      '/scenarios/SM/tools/scenario-editor'
    );
    expect(wrapper.find('[data-testid="nav-oob-editor"]').attributes('href')).toBe(
      '/scenarios/SM/tools/oob-editor'
    );
    expect(wrapper.find('[data-testid="nav-map-test"]').attributes('href')).toBe(
      '/scenarios/SM/tools/map-test'
    );
    expect(wrapper.find('[data-testid="nav-table-test"]').attributes('href')).toBe(
      '/scenarios/SM/tools/table-test'
    );
  });

  it('defaults slug to THG when no route param is present', async () => {
    vi.stubEnv('VITE_MAP_EDITOR_ENABLED', 'true');
    vi.resetModules();
    EditorNav = (await import('./EditorNav.vue')).default;
    const router = makeRouter();
    await router.push('/');
    await router.isReady();
    const wrapper = mount(EditorNav, { global: { plugins: [router] } });
    expect(wrapper.find('[data-testid="nav-map-editor"]').attributes('href')).toBe(
      '/scenarios/THG/tools/map-editor'
    );
  });
});
