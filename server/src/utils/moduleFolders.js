import { join, normalize, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
export const DATA_ROOT = resolve(join(__dirname, '../../../data/modules'));

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
 * Slug must be a known MODULE_FOLDERS key (case-insensitive). The resolved path
 * is verified to remain within DATA_ROOT to prevent path traversal.
 * @throws {ModuleNotFoundError} for unrecognised slugs
 * @throws {Error} if the resolved path escapes the data root
 */
export function resolveModulePath(slug, file) {
  const folder = MODULE_FOLDERS[slug.toUpperCase()];
  if (!folder) throw new ModuleNotFoundError(slug);
  const resolved = normalize(resolve(DATA_ROOT, folder, file));
  if (!resolved.startsWith(DATA_ROOT + '/') && resolved !== DATA_ROOT) {
    throw new Error(`Path traversal detected for slug=${slug} file=${file}`);
  }
  return resolved;
}

export function resolveModuleScenarioPath(moduleSlug, scenarioSlug, file) {
  return resolveModulePath(moduleSlug, join('scenarios', scenarioSlug, file));
}
