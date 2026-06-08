import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';

const stubRouter = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div/>' } },
    { path: '/lobby', component: { template: '<div/>' } },
    { path: '/tools/scenario-editor', component: { template: '<div/>' } },
    { path: '/tools/map-editor', component: { template: '<div/>' } },
    { path: '/tools/oob-editor', component: { template: '<div/>' } },
    { path: '/tools/map-test', component: { template: '<div/>' } },
    { path: '/tools/table-test', component: { template: '<div/>' } },
  ],
});

let EditorNav;

describe('EditorNav', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('always shows a home/lobby escape hatch', async () => {
    vi.stubEnv('VITE_MAP_EDITOR_ENABLED', 'false');
    vi.resetModules();
    EditorNav = (await import('./EditorNav.vue')).default;
    const wrapper = mount(EditorNav, { global: { plugins: [stubRouter] } });
    const homeLink = wrapper.find('[data-testid="nav-home"]');
    expect(homeLink.exists()).toBe(true);
    expect(homeLink.attributes('href') ?? homeLink.attributes('to')).toBe('/');
  });

  it('shows all five tool links when editors enabled', async () => {
    vi.stubEnv('VITE_MAP_EDITOR_ENABLED', 'true');
    vi.resetModules();
    EditorNav = (await import('./EditorNav.vue')).default;
    const wrapper = mount(EditorNav, { global: { plugins: [stubRouter] } });
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
    const wrapper = mount(EditorNav, { global: { plugins: [stubRouter] } });
    expect(wrapper.find('[data-testid="nav-scenario-editor"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="nav-map-editor"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="nav-oob-editor"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="nav-map-test"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="nav-table-test"]').exists()).toBe(false);
  });

  it('tool links point to correct routes when enabled', async () => {
    vi.stubEnv('VITE_MAP_EDITOR_ENABLED', 'true');
    vi.resetModules();
    EditorNav = (await import('./EditorNav.vue')).default;
    const wrapper = mount(EditorNav, { global: { plugins: [stubRouter] } });
    const scenarioEditor = wrapper.find('[data-testid="nav-scenario-editor"]');
    const mapEditor = wrapper.find('[data-testid="nav-map-editor"]');
    const oobEditor = wrapper.find('[data-testid="nav-oob-editor"]');
    const mapTest = wrapper.find('[data-testid="nav-map-test"]');
    const tableTest = wrapper.find('[data-testid="nav-table-test"]');
    expect(scenarioEditor.exists()).toBe(true);
    expect(mapEditor.exists()).toBe(true);
    expect(oobEditor.exists()).toBe(true);
    expect(mapTest.exists()).toBe(true);
    expect(tableTest.exists()).toBe(true);
    expect(scenarioEditor.attributes('href') ?? scenarioEditor.attributes('to')).toBe(
      '/tools/scenario-editor'
    );
    expect(mapEditor.attributes('href') ?? mapEditor.attributes('to')).toBe('/tools/map-editor');
    expect(oobEditor.attributes('href') ?? oobEditor.attributes('to')).toBe('/tools/oob-editor');
    expect(mapTest.attributes('href') ?? mapTest.attributes('to')).toBe('/tools/map-test');
    expect(tableTest.attributes('href') ?? tableTest.attributes('to')).toBe('/tools/table-test');
  });
});
