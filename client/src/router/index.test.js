import { describe, it, expect } from 'vitest';
import router from './index.js';

describe('router', () => {
  it('exports a valid router instance', () => {
    expect(router).toBeTruthy();
    expect(typeof router.push).toBe('function');
  });

  it('has routes for all primary views and tool pages', () => {
    const paths = router.getRoutes().map((r) => r.path);
    expect(paths).toContain('/');
    expect(paths).toContain('/tools/map-editor');
    expect(paths).toContain('/tools/oob-editor');
    expect(paths).toContain('/tools/map-test');
    expect(paths).toContain('/tools/table-test');
  });
});
