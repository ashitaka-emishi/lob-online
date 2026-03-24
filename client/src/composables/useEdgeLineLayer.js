import { computed } from 'vue';
import { edgeLine20_80, edgeToCenter } from '../utils/hexGeometry.js';

const CANONICAL_EDGE_DIRS = ['N', 'NE', 'SE'];

// Mirror directions and the face index on the canonical neighbor for each:
//   S edge  → neighbor-S's face 0 (N)
//   SW edge → neighbor-SW's face 1 (NE)
//   NW edge → neighbor-NW's face 2 (SE)
const MIRROR_EDGE_DIRS = ['S', 'SW', 'NW'];
const MIRROR_TO_CANONICAL_FI = [0, 1, 2];

/**
 * Pre-builds the edge line data arrays consumed by EdgeLineLayer and ThroughHexLayer.
 *
 * Extracted from HexMapOverlay (#169) so the logic is independently testable and
 * the dependency chain is explicit: only `cells` and `overlayConfig.edgeLine` are
 * reactive inputs. LOS / selection state changes do NOT invalidate this layer —
 * those flags are computed in cellsWithDisplayAttrs, not in the `cells` ref passed here.
 *
 * @param {Ref<Array>} cells - Reactive ref to the enriched cell array from gridData.
 * @param {Ref<Object>|Object} overlayConfig - Reactive ref or reactive object containing
 *   the `edgeLine` config key ({ featureGroups, style? }).
 * @param {Ref<Map>} [neighborMap] - Optional Map<"hexId:dir", cell> pre-built in gridData.
 *   Used for mirror-edge lookups in through-hex mode. Each entry maps a canonical direction
 *   key to the neighbor cell that owns the corresponding canonical face.
 * @returns {{ cellsForEdges: ComputedRef, throughHexSegments: ComputedRef }}
 */
export function useEdgeLineLayer(cells, overlayConfig, neighborMap) {
  // Pre-build a Set of types per group for O(1) feature-type lookups.
  const edgeLineGroups = computed(() => {
    const groups = overlayConfig.value?.edgeLine?.featureGroups ?? [];
    return groups.map((g) => ({ ...g, typeSet: new Set(g.types) }));
  });

  function _buildCellEdgeData(lineAttrFn, includeMirrors = false) {
    // Capture once outside the loop — avoids repeated reactive .value access per cell.
    const groups = edgeLineGroups.value;
    const nbMap = includeMirrors ? (neighborMap?.value ?? null) : null;

    return cells.value.map((cell) => {
      const canonicalFaces = CANONICAL_EDGE_DIRS.map((dir, fi) => ({
        dir,
        lineAttrs: lineAttrFn(cell, dir),
        groups: groups.map((group) => ({
          group,
          features: cell.edges?.[fi]?.filter((f) => group.typeSet.has(f.type)) ?? [],
        })),
      }));

      // Mirror edges (S, SW, NW) — features live on the adjacent hex's canonical face.
      // Required for through-hex so each hex draws center→edge segments for all 6 directions.
      const mirrorFaces = nbMap
        ? MIRROR_EDGE_DIRS.map((dir, mi) => {
            const neighbor = nbMap.get(`${cell.id}:${dir}`);
            const fi = MIRROR_TO_CANONICAL_FI[mi];
            return {
              dir,
              lineAttrs: lineAttrFn(cell, dir),
              groups: groups.map((group) => ({
                group,
                features: neighbor?.edges?.[fi]?.filter((f) => group.typeSet.has(f.type)) ?? [],
              })),
            };
          })
        : [];

      return { id: cell.id, edgeFaces: [...canonicalFaces, ...mirrorFaces] };
    });
  }

  // Standard edge layer — 20/80 split segments.
  // Short-circuits when through-hex style is active so both layers never render the same data.
  const cellsForEdges = computed(() => {
    if (overlayConfig.value?.edgeLine?.style === 'through-hex') return [];
    return _buildCellEdgeData((cell, dir) => edgeLine20_80(cell.corners, dir));
  });

  // Through-hex layer — centre-to-midpoint segments for all 6 edge directions.
  // Mutually exclusive with cellsForEdges.
  const throughHexSegments = computed(() => {
    if (overlayConfig.value?.edgeLine?.style !== 'through-hex') return [];
    return _buildCellEdgeData(
      (cell, dir) => edgeToCenter(cell.corners, cell.cx, cell.cy, dir),
      true
    );
  });

  return { cellsForEdges, throughHexSegments };
}
