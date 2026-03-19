/**
 * Canonical edge ownership, lookup, and coexistence validation.
 *
 * Edges are stored on the hex with the lower face index (0–2). Faces 3–5 are
 * "mirror" faces — they resolve to face (faceIndex − 3) on the adjacent hex.
 *
 * Face → direction mapping (flat-top, EVEN_Q, clockwise from top):
 *   0: N, 1: NE, 2: SE, 3: S, 4: SW, 5: NW
 *
 * Reference: docs/map-editor-design.md §2, §15.
 */

import { adjacentHexId } from '../utils/hexGeometry.js';

/** Face-index to compass direction (flat-top, clockwise from top face). */
const FACE_TO_DIR = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];

/**
 * Returns the opposite face index: (faceIndex + 3) % 6.
 *
 * @param {number} faceIndex - 0–5
 * @returns {number}
 */
export function oppositeFace(faceIndex) {
  return (faceIndex + 3) % 6;
}

/**
 * Returns the canonical owner hex and face for an edge.
 *
 * Faces 0–2 are owned by the hex itself.
 * Faces 3–5 are owned by the adjacent neighbour at (faceIndex − 3).
 *
 * @param {string} hexId - e.g. '05.05'
 * @param {number} faceIndex - 0–5
 * @param {{rows:number, cols:number}} gridSpec
 * @returns {{ ownerId: string, ownerFace: number }}
 */
export function canonicalOwner(hexId, faceIndex, gridSpec) {
  if (faceIndex < 3) {
    return { ownerId: hexId, ownerFace: faceIndex };
  }
  const dir = FACE_TO_DIR[faceIndex];
  const neighbourId = adjacentHexId(hexId, dir, gridSpec);
  return { ownerId: neighbourId ?? hexId, ownerFace: faceIndex - 3 };
}

/**
 * Returns the EdgeFeature[] array for the canonical owner of a given face.
 * Returns `[]` if the hex has no edge entry for that face or the hex is missing.
 *
 * @param {Map<string,object>} hexMap - hexId → hex object
 * @param {string} hexId
 * @param {number} faceIndex - 0–5
 * @param {{rows:number, cols:number}} gridSpec
 * @returns {string[]}
 */
export function getEdgeFeatures(hexMap, hexId, faceIndex, gridSpec) {
  const { ownerId, ownerFace } = canonicalOwner(hexId, faceIndex, gridSpec);
  const hex = hexMap.get(ownerId);
  return hex?.edges?.[ownerFace] ?? [];
}

// ── Coexistence rules ─────────────────────────────────────────────────────────

const SLOPE_TYPES = new Set(['slope', 'extremeSlope', 'verticalSlope']);

/**
 * Validates whether `newType` can coexist with `existingFeatures` on the same edge.
 *
 * Rules (from docs/map-editor-design.md §2):
 * - Slope types (slope, extremeSlope, verticalSlope) are mutually exclusive.
 * - Road types (trail, road, pike) coexist with each other and with other features.
 * - Stream/stoneWall coexist with road types and with each other.
 *
 * @param {string[]} existingFeatures
 * @param {string} newType
 * @returns {{ valid: boolean, reason: string|null }}
 */
export function validateCoexistence(existingFeatures, newType) {
  if (SLOPE_TYPES.has(newType)) {
    const conflicting = existingFeatures.find((f) => SLOPE_TYPES.has(f) && f !== newType);
    if (conflicting) {
      return {
        valid: false,
        reason: `Cannot add '${newType}' — edge already has slope type '${conflicting}'`,
      };
    }
  }
  return { valid: true, reason: null };
}

// ── Mutators ──────────────────────────────────────────────────────────────────

/**
 * Adds a feature type to the canonical owner's edge entry.
 * Validates coexistence first; skips if invalid or already present.
 * Mutates `hexMap` in place.
 *
 * @param {Map<string,object>} hexMap
 * @param {string} hexId
 * @param {number} faceIndex - 0–5
 * @param {string} type
 * @param {{rows:number, cols:number}} gridSpec
 */
export function addEdgeFeature(hexMap, hexId, faceIndex, type, gridSpec) {
  const { ownerId, ownerFace } = canonicalOwner(hexId, faceIndex, gridSpec);
  const hex = hexMap.get(ownerId);
  if (!hex) return;

  if (!hex.edges) hex.edges = {};
  if (!hex.edges[ownerFace]) hex.edges[ownerFace] = [];

  const existing = hex.edges[ownerFace];
  if (existing.includes(type)) return;

  const { valid } = validateCoexistence(existing, type);
  if (!valid) return;

  hex.edges[ownerFace] = [...existing, type];
}

/**
 * Removes all occurrences of `type` from the canonical owner's edge entry.
 * Mutates `hexMap` in place. No-op if the feature is absent.
 *
 * @param {Map<string,object>} hexMap
 * @param {string} hexId
 * @param {number} faceIndex - 0–5
 * @param {string} type
 * @param {{rows:number, cols:number}} gridSpec
 */
export function removeEdgeFeature(hexMap, hexId, faceIndex, type, gridSpec) {
  const { ownerId, ownerFace } = canonicalOwner(hexId, faceIndex, gridSpec);
  const hex = hexMap.get(ownerId);
  if (!hex?.edges?.[ownerFace]) return;

  hex.edges[ownerFace] = hex.edges[ownerFace].filter((f) => f !== type);
}
