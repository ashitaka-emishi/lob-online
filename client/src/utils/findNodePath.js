/**
 * Walk raw oob.json data and return the dot-path to the node whose `.id` equals `nodeId`.
 * The path starts from the top-level side key (e.g. `union.corps.0.divisions.1.brigades.0`).
 *
 * Keys beginning with `_` are synthetic display-tree additions and are skipped.
 * Returns null if no node with that id is found.
 *
 * @param {object} oob  The raw oob.json object (with `union` / `confederate` keys)
 * @param {string} nodeId
 * @returns {string|null}
 */
export function findNodePath(oob, nodeId) {
  if (!oob || nodeId == null) return null;

  function walk(obj, path) {
    if (!obj || typeof obj !== 'object') return null;

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const found = walk(obj[i], `${path}.${i}`);
        if (found) return found;
      }
      return null;
    }

    // Plain object — check id first, then recurse into non-_ keys
    if (obj.id === nodeId) return path;

    for (const [key, val] of Object.entries(obj)) {
      if (key.startsWith('_')) continue; // skip synthetic display-tree fields
      if (val === null || typeof val !== 'object') continue;
      const found = walk(val, `${path}.${key}`);
      if (found) return found;
    }

    return null;
  }

  for (const side of ['union', 'confederate']) {
    if (!oob[side]) continue;
    const result = walk(oob[side], side);
    if (result) return result;
  }

  return null;
}
