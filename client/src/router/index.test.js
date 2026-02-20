import { describe, it, expect } from 'vitest';
import router from './index.js';

describe('router', () => {
  it('has a route for /', () => {
    const routes = router.getRoutes();
    const home = routes.find((r) => r.path === '/');
    expect(home).toBeDefined();
  });

  it('has a route for /tools/map-editor', () => {
    const routes = router.getRoutes();
    const mapEditor = routes.find((r) => r.path === '/tools/map-editor');
    expect(mapEditor).toBeDefined();
  });

  it('exports a router instance', () => {
    expect(router).toBeTruthy();
    expect(typeof router.push).toBe('function');
  });
});
