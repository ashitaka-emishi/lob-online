import { describe, it, expect } from 'vitest';
import router from './index.js';

const paths = router.getRoutes().map((r) => r.path);

describe('router — home', () => {
  it('has a root route', () => {
    expect(paths).toContain('/');
  });
});

describe('router — scenario-scoped routes', () => {
  it('has lobby route with scenario slug param', () => {
    expect(paths).toContain('/scenarios/:scenarioSlug/lobby');
  });

  it('has game route with scenario slug param', () => {
    expect(paths).toContain('/scenarios/:scenarioSlug/games/:id');
  });

  it('has map-editor route with scenario slug param', () => {
    expect(paths).toContain('/scenarios/:scenarioSlug/tools/map-editor');
  });

  it('has scenario-editor route with scenario slug param', () => {
    expect(paths).toContain('/scenarios/:scenarioSlug/tools/scenario-editor');
  });

  it('has oob-editor route with scenario slug param', () => {
    expect(paths).toContain('/scenarios/:scenarioSlug/tools/oob-editor');
  });

  it('has map-test route with scenario slug param', () => {
    expect(paths).toContain('/scenarios/:scenarioSlug/tools/map-test');
  });

  it('has table-test route with scenario slug param', () => {
    expect(paths).toContain('/scenarios/:scenarioSlug/tools/table-test');
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
