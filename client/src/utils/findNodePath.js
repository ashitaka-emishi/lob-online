/**
 * Walk a side-keyed command tree (an object with `union` / `confederate` top-level keys)
 * and return the dot-path to the node whose `.id` equals `nodeId`.
 * The path starts from the top-level side key (e.g. `union.corps.0.divisions.1.brigades.0`).
 *
 * Both oob.json and leaders.json share this side-keyed shape, so this utility
 * is used to search either tree.
 *
 * Keys beginning with `_` are synthetic display-tree additions and are skipped.
 * Returns null if no node with that id is found.
 *
 * @param {object} tree  A side-keyed object with `union` / `confederate` keys (oob.json or leaders.json shape)
 * @param {string} nodeId
 * @returns {string|null}
 */
export function findNodePathInTree(tree, nodeId) {
  if (!tree || nodeId == null) return null;

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
    if (!tree[side]) continue;
    const result = walk(tree[side], side);
    if (result) return result;
  }

  return null;
}
