/**
 * Path containment guard for file loaders.
 *
 * Shared utility so all data loaders (map, scenario, and future loaders)
 * use the same containment check rather than duplicating it.
 */

import { resolve, sep } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/** Allowed roots: project root and OS temp dir (for test fixtures). */
export const PROJECT_ROOT = resolve(__dirname, '../../..');
export const TMPDIR = resolve(tmpdir());

/**
 * Verify that `filePath` resolves to a location within the project root or
 * the OS temp directory. Throws a generic error (no path in message) if not.
 *
 * // Security (#284) — prevents path traversal attacks if user-controlled paths
 * // are ever passed to the loaders. Errors must not leak the resolved path.
 *
 * @param {string} filePath
 * @param {string} callerName - module name used as error message prefix
 */
export function assertContainedPath(filePath, callerName) {
  const abs = resolve(filePath);
  const inProject = abs === PROJECT_ROOT || abs.startsWith(PROJECT_ROOT + sep);
  const inTmp = abs === TMPDIR || abs.startsWith(TMPDIR + sep);
  if (!inProject && !inTmp) {
    throw new Error(`${callerName}: path outside allowed directory`);
  }
}
