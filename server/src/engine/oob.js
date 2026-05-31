import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

import { OOBSchema } from '../schemas/oob.schema.js';
import { LeadersSchema } from '../schemas/leaders.schema.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Single-scenario hardcode: path is relative to this file's location (server/src/engine/).
// When multi-scenario support lands, replace with an ACTIVE_SCENARIO env var or paths.js util.
const DEFAULT_OOB_PATH = join(__dirname, '../../../data/scenarios/south-mountain/oob.json');
const DEFAULT_LEADERS_PATH = join(__dirname, '../../../data/scenarios/south-mountain/leaders.json');

/**
 * Load and validate oob.json. Reads and parses the file synchronously on each call.
 * Not cached — re-reads on every call so dev-mode edits via the OOB editor take effect
 * without restart. For production, consider a module-level cache if per-request latency matters.
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

/**
 * Load and validate leaders.json.
 *
 * @param {string} [leadersPath] - Override the default path (for tests).
 * @returns {import('zod').infer<typeof LeadersSchema>} Validated leaders data.
 * @throws {Error} If the file is missing, unreadable, or fails Zod validation.
 */
export function loadLeaders(leadersPath = DEFAULT_LEADERS_PATH) {
  const raw = readFileSync(leadersPath, 'utf8');
  const parsed = JSON.parse(raw);
  return LeadersSchema.parse(parsed);
}
