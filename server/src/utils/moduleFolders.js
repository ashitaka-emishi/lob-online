import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DATA_ROOT = join(__dirname, '../../../data/modules');

export const MODULE_FOLDERS = {
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

export class ModuleNotFoundError extends Error {
  constructor(slug) {
    super(`Unknown module slug: ${slug}`);
    this.status = 404;
    this.name = 'ModuleNotFoundError';
  }
}

/**
 * Returns the absolute path to a file within the given module's data folder.
 * Slug comparison is case-insensitive.
 * @throws {ModuleNotFoundError} for unrecognised slugs
 */
export function resolveModulePath(slug, file) {
  const folder = MODULE_FOLDERS[slug.toUpperCase()];
  if (!folder) throw new ModuleNotFoundError(slug);
  return join(DATA_ROOT, folder, file);
}

export function resolveModuleScenarioPath(moduleSlug, scenarioSlug, file) {
  return resolveModulePath(moduleSlug, join('scenarios', scenarioSlug, file));
}
