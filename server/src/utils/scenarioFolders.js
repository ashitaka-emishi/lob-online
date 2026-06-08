import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DATA_ROOT = join(__dirname, '../../../data/scenarios');

export const SCENARIO_FOLDERS = {
  THG: 'thg',
  TTS: 'tts',
  AFS: 'afs',
  SM: 'south-mountain',
  LCV: 'lcv',
  NBH: 'nbh',
  TTW: 'ttw',
  NTB: 'ntb',
  IB: 'ib',
};

export class ScenarioNotFoundError extends Error {
  constructor(slug) {
    super(`Unknown scenario slug: ${slug}`);
    this.status = 404;
    this.name = 'ScenarioNotFoundError';
  }
}

/**
 * Returns the absolute path to a file within the given scenario's data folder.
 * Slug comparison is case-insensitive.
 * @throws {ScenarioNotFoundError} for unrecognised slugs
 */
export function resolveScenarioPath(slug, file) {
  const folder = SCENARIO_FOLDERS[slug.toUpperCase()];
  if (!folder) throw new ScenarioNotFoundError(slug);
  return join(DATA_ROOT, folder, file);
}
