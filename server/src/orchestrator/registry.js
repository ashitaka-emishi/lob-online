import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

import { AgentManifestSchema } from './schemas.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REGISTRY_PATH = join(__dirname, '../../../..', '.claude/agents/registry.json');

let _registry = null;

/**
 * Load and validate the agent registry from `.claude/agents/registry.json`.
 * Results are cached after the first call.
 *
 * @returns {import('./schemas.js').AgentManifest[]}
 */
export function loadRegistry(registryPath = REGISTRY_PATH) {
  if (_registry && registryPath === REGISTRY_PATH) return _registry;

  const raw = JSON.parse(readFileSync(registryPath, 'utf8'));
  if (!Array.isArray(raw)) {
    throw new Error(`Registry at ${registryPath} must be a JSON array`);
  }

  const entries = raw.map((entry, i) => {
    const result = AgentManifestSchema.safeParse(entry);
    if (!result.success) {
      throw new Error(
        `Registry entry [${i}] is invalid: ${result.error.issues.map((e) => e.message).join(', ')}`
      );
    }
    return result.data;
  });

  if (registryPath === REGISTRY_PATH) _registry = entries;
  return entries;
}

/**
 * Resolve an agent by id. Throws if not found.
 *
 * @param {string} agentId
 * @param {string} [registryPath]
 * @returns {import('./schemas.js').AgentManifest}
 */
export function resolveAgent(agentId, registryPath = REGISTRY_PATH) {
  const entries = loadRegistry(registryPath);
  const entry = entries.find((e) => e.id === agentId);
  if (!entry) {
    throw new Error(`Unknown agent id "${agentId}" — not found in registry`);
  }
  return entry;
}

/** Reset the in-memory cache (used in tests). */
export function _resetCache() {
  _registry = null;
}
