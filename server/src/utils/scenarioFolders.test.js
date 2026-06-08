import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { fileURLToPath } from 'url';

import { SCENARIO_FOLDERS, resolveScenarioPath, ScenarioNotFoundError } from './scenarioFolders.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DATA_ROOT = join(__dirname, '../../../data/scenarios');

describe('SCENARIO_FOLDERS', () => {
  it('maps SM slug to south-mountain folder', () => {
    expect(SCENARIO_FOLDERS['SM']).toBe('south-mountain');
  });

  it('maps all nine slugs', () => {
    const expected = ['THG', 'TTS', 'AFS', 'SM', 'LCV', 'NBH', 'TTW', 'NTB', 'IB'];
    expect(Object.keys(SCENARIO_FOLDERS).sort()).toEqual(expected.sort());
  });

  it('maps non-SM slugs to lowercase folder names', () => {
    expect(SCENARIO_FOLDERS['THG']).toBe('thg');
    expect(SCENARIO_FOLDERS['TTS']).toBe('tts');
    expect(SCENARIO_FOLDERS['AFS']).toBe('afs');
    expect(SCENARIO_FOLDERS['LCV']).toBe('lcv');
    expect(SCENARIO_FOLDERS['NBH']).toBe('nbh');
    expect(SCENARIO_FOLDERS['TTW']).toBe('ttw');
    expect(SCENARIO_FOLDERS['NTB']).toBe('ntb');
    expect(SCENARIO_FOLDERS['IB']).toBe('ib');
  });
});

describe('resolveScenarioPath', () => {
  it('resolves SM slug to south-mountain path', () => {
    const result = resolveScenarioPath('SM', 'map.json');
    expect(result).toBe(join(DATA_ROOT, 'south-mountain', 'map.json'));
  });

  it('resolves THG slug to thg folder', () => {
    const result = resolveScenarioPath('THG', 'oob.json');
    expect(result).toBe(join(DATA_ROOT, 'thg', 'oob.json'));
  });

  it('resolves lowercase slug by uppercasing', () => {
    const result = resolveScenarioPath('sm', 'map.json');
    expect(result).toBe(join(DATA_ROOT, 'south-mountain', 'map.json'));
  });

  it('throws ScenarioNotFoundError for unknown slug', () => {
    expect(() => resolveScenarioPath('UNKNOWN', 'map.json')).toThrow(ScenarioNotFoundError);
  });

  it('thrown error has status 404', () => {
    let caught;
    try {
      resolveScenarioPath('XYZ', 'oob.json');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ScenarioNotFoundError);
    expect(caught.status).toBe(404);
  });

  it('resolves all supported slugs without throwing', () => {
    for (const slug of Object.keys(SCENARIO_FOLDERS)) {
      expect(() => resolveScenarioPath(slug, 'map.json')).not.toThrow();
    }
  });
});
