import { describe, it, expect } from 'vitest';
import { compassLabel } from './compass.js';

// Smoke test — verifies the re-export shim is wired correctly.
// Full compassLabel coverage lives in formulas/compass.test.js.
describe('utils/compass re-export', () => {
  it('re-exports compassLabel from formulas/compass', () => {
    expect(compassLabel(0, 0)).toBe('N');
    expect(compassLabel(0, 3)).toBe('W');
  });
});
