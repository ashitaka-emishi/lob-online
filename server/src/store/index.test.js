import { describe, expect, it } from 'vitest';

import * as store from './index.js';

// Verify store/index.js re-exports the full public API so routes import a stable
// interface rather than implementation-specific files (#334)
describe('store/index — public API surface', () => {
  it('re-exports gameFile functions', () => {
    expect(typeof store.saveGame).toBe('function');
    expect(typeof store.loadGame).toBe('function');
  });

  it('re-exports gameSqlite delegate functions', () => {
    expect(typeof store.createGame).toBe('function');
    expect(typeof store.joinGame).toBe('function');
    expect(typeof store.getGame).toBe('function');
    expect(typeof store.listGames).toBe('function');
  });
});
