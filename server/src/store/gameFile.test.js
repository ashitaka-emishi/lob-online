import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// Tests use a real temp directory — no mocking of fs.
// gameFile.js is exercised with actual disk reads/writes.
// DATA_DIR is overridden via the exported function signature.

let tmpDir;
let saveGame, loadGame;

beforeEach(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), 'lob-gamefile-'));
  // Re-import with patched DATA_DIR each time via direct import + module factory
  ({ saveGame, loadGame } = await import('./gameFile.js'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('saveGame', () => {
  it('writes state.json under data/games/{id}/', async () => {
    const state = { id: 'game1', turn: 1, status: 'setup', units: {} };
    await expect(saveGame('game1', state, tmpDir)).resolves.toBeUndefined();

    const { readFileSync } = await import('node:fs');
    const written = JSON.parse(readFileSync(join(tmpDir, 'game1', 'state.json'), 'utf8'));
    expect(written.id).toBe('game1');
    expect(written.turn).toBe(1);
  });

  it('creates the game directory if it does not exist', async () => {
    const state = { id: 'newgame', turn: 1, status: 'setup', units: {} };
    await expect(saveGame('newgame', state, tmpDir)).resolves.toBeUndefined();

    const { existsSync } = await import('node:fs');
    expect(existsSync(join(tmpDir, 'newgame', 'state.json'))).toBe(true);
  });

  it('overwrites existing state.json on second save', async () => {
    const state1 = { id: 'g1', turn: 1, status: 'setup', units: {} };
    const state2 = { id: 'g1', turn: 2, status: 'active', units: {} };
    await saveGame('g1', state1, tmpDir);
    await saveGame('g1', state2, tmpDir);

    const { readFileSync } = await import('node:fs');
    const written = JSON.parse(readFileSync(join(tmpDir, 'g1', 'state.json'), 'utf8'));
    expect(written.turn).toBe(2);
    expect(written.status).toBe('active');
  });
});

describe('loadGame', () => {
  it('reads and parses state.json written by saveGame', async () => {
    const state = {
      id: 'game2',
      scenarioId: 'south-mountain',
      turn: 3,
      phase: null,
      initiative: null,
      sides: { union: null, confederate: null },
      units: {},
      reinforcementQueue: [],
      status: 'active',
    };
    await saveGame('game2', state, tmpDir);
    const loaded = await loadGame('game2', tmpDir);
    expect(loaded.id).toBe('game2');
    expect(loaded.turn).toBe(3);
  });

  it('round-trips all state fields correctly', async () => {
    const state = {
      id: 'rt1',
      scenarioId: 'south-mountain',
      turn: 1,
      phase: null,
      initiative: null,
      sides: { union: null, confederate: null },
      units: {
        u1: {
          id: 'u1',
          hex: '5.3',
          facing: 0,
          moraleState: 'normal',
          wrecked: false,
          orders: null,
          ammo: 'full',
          isOnBoard: true,
          entryTurn: null,
        },
      },
      reinforcementQueue: [{ unitId: 'u2', turn: 5, entryHex: '1.1' }],
      status: 'setup',
    };
    await saveGame('rt1', state, tmpDir);
    const loaded = await loadGame('rt1', tmpDir);
    expect(loaded).toEqual(state);
  });

  it('throws if the game directory does not exist', async () => {
    await expect(loadGame('nonexistent', tmpDir)).rejects.toThrow();
  });

  it('throws if state.json is missing', async () => {
    const { mkdirSync } = await import('node:fs');
    mkdirSync(join(tmpDir, 'emptygame'));
    await expect(loadGame('emptygame', tmpDir)).rejects.toThrow();
  });
});
