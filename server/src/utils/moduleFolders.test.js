import { join } from 'path';
import { fileURLToPath } from 'url';

import { describe, it, expect } from 'vitest';

import { MODULE_FOLDERS, resolveModulePath, ModuleNotFoundError } from './moduleFolders.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DATA_ROOT = join(__dirname, '../../../data/modules');

describe('MODULE_FOLDERS', () => {
  it('maps SM slug to south-mountain folder', () => {
    expect(MODULE_FOLDERS['SM']).toBe('south-mountain');
  });

  it('maps all nine slugs', () => {
    const expected = ['THG', 'TTS', 'AFS', 'SM', 'LCV', 'NBH', 'TTW', 'NTB', 'IB'];
    expect(Object.keys(MODULE_FOLDERS).sort()).toEqual(expected.sort());
  });

  it('maps non-SM slugs to lowercase folder names', () => {
    expect(MODULE_FOLDERS['THG']).toBe('thg');
    expect(MODULE_FOLDERS['TTS']).toBe('tts');
    expect(MODULE_FOLDERS['AFS']).toBe('afs');
    expect(MODULE_FOLDERS['LCV']).toBe('lcv');
    expect(MODULE_FOLDERS['NBH']).toBe('nbh');
    expect(MODULE_FOLDERS['TTW']).toBe('ttw');
    expect(MODULE_FOLDERS['NTB']).toBe('ntb');
    expect(MODULE_FOLDERS['IB']).toBe('ib');
  });
});

describe('resolveModulePath', () => {
  it('resolves SM slug to south-mountain path', () => {
    const result = resolveModulePath('SM', 'map.json');
    expect(result).toBe(join(DATA_ROOT, 'south-mountain', 'map.json'));
  });

  it('resolves THG slug to thg folder', () => {
    const result = resolveModulePath('THG', 'oob.json');
    expect(result).toBe(join(DATA_ROOT, 'thg', 'oob.json'));
  });

  it('resolves lowercase slug by uppercasing', () => {
    const result = resolveModulePath('sm', 'map.json');
    expect(result).toBe(join(DATA_ROOT, 'south-mountain', 'map.json'));
  });

  it('throws ModuleNotFoundError for unknown slug', () => {
    expect(() => resolveModulePath('UNKNOWN', 'map.json')).toThrow(ModuleNotFoundError);
  });

  it('thrown error has status 404', () => {
    let caught;
    try {
      resolveModulePath('XYZ', 'oob.json');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ModuleNotFoundError);
    expect(caught.status).toBe(404);
  });

  it('resolves all supported slugs without throwing', () => {
    for (const slug of Object.keys(MODULE_FOLDERS)) {
      expect(() => resolveModulePath(slug, 'map.json')).not.toThrow();
    }
  });
});
