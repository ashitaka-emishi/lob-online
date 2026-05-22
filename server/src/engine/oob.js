import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

import { OOBSchema } from '../schemas/oob.schema.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const DEFAULT_OOB_PATH = join(__dirname, '../../../data/scenarios/south-mountain/oob.json');

/**
 * Load and validate oob.json.
 * Returns a validated plain object. Safe to call once at startup or per-request.
 *
 * @param {string} [oobPath] - Override the default path (for tests).
 * @returns {import('zod').infer<typeof OOBSchema>} Validated OOB data.
 * @throws {Error} If the file is missing, unreadable, or fails Zod validation.
 */
export function loadOob(oobPath = DEFAULT_OOB_PATH) {
  const raw = readFileSync(oobPath, 'utf8');
  const parsed = JSON.parse(raw);
  return OOBSchema.parse(parsed);
}
