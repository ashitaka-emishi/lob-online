import { describe, it, expect } from 'vitest';
import router from './index.js';

const paths = router.getRoutes().map((r) => r.path);

describe('router — home', () => {
  it('has a root route', () => {
    expect(paths).toContain('/');
  });
});

describe('router — module-scoped routes', () => {
  it('has lobby route with module and scenario slug params', () => {
    expect(paths).toContain('/modules/:moduleSlug/scenarios/:scenarioSlug/lobby');
  });

  it('has game route with module and scenario slug params', () => {
    expect(paths).toContain('/modules/:moduleSlug/scenarios/:scenarioSlug/games/:id');
  });

  it('has map-editor route with module slug param', () => {
    expect(paths).toContain('/modules/:moduleSlug/tools/map-editor');
  });

  it('has scenario-editor route with module and scenario slug params', () => {
    expect(paths).toContain('/modules/:moduleSlug/scenarios/:scenarioSlug/tools/scenario-editor');
  });

  it('has oob-editor route with module slug param', () => {
    expect(paths).toContain('/modules/:moduleSlug/tools/oob-editor');
  });

  it('has map-test route with module slug param', () => {
    expect(paths).toContain('/modules/:moduleSlug/tools/map-test');
  });

  it('has table-test route with module slug param', () => {
    expect(paths).toContain('/modules/:moduleSlug/tools/table-test');
  });
});

describe('router — legacy redirects', () => {
  it('redirects /lobby to default scenario lobby', () => {
    const route = router.getRoutes().find((r) => r.path === '/lobby');
    expect(route).toBeTruthy();
    expect(route.redirect).toBeTruthy();
  });

  it('redirects /tools/map-editor to default scenario route', () => {
    const route = router.getRoutes().find((r) => r.path === '/tools/map-editor');
    expect(route).toBeTruthy();
    expect(route.redirect).toBeTruthy();
  });

  it('redirects /tools/oob-editor to default scenario route', () => {
    const route = router.getRoutes().find((r) => r.path === '/tools/oob-editor');
    expect(route).toBeTruthy();
    expect(route.redirect).toBeTruthy();
  });

  it('redirects /tools/map-test to default scenario route', () => {
    const route = router.getRoutes().find((r) => r.path === '/tools/map-test');
    expect(route).toBeTruthy();
    expect(route.redirect).toBeTruthy();
  });

  it('redirects /tools/table-test to default scenario route', () => {
    const route = router.getRoutes().find((r) => r.path === '/tools/table-test');
    expect(route).toBeTruthy();
    expect(route.redirect).toBeTruthy();
  });
});
