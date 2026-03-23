import { computed } from 'vue';
import { edgeLine20_80, edgeToCenter } from '../utils/hexGeometry.js';

const CANONICAL_EDGE_DIRS = ['N', 'NE', 'SE'];

/**
 * Pre-builds the edge line data arrays consumed by EdgeLineLayer and ThroughHexLayer.
 *
 * Extracted from HexMapOverlay (#169) so the logic is independently testable and
 * the dependency chain is explicit: only `cells` and `overlayConfig.edgeLine` are
 * reactive inputs. LOS / selection state changes in overlayConfig do NOT invalidate
 * this layer because they live in unrelated overlayConfig keys.
 *
 * @param {Ref<Array>} cells - Reactive ref to the enriched cell array from gridData.
 * @param {Ref<Object>|Object} overlayConfig - Reactive ref or reactive object containing
 *   the `edgeLine` config key ({ featureGroups, style? }).
 * @returns {{ cellsForEdges: ComputedRef, throughHexSegments: ComputedRef }}
 */
export function useEdgeLineLayer(cells, overlayConfig) {
  // Pre-build a Set of types per group for O(1) feature-type lookups.
  const edgeLineGroups = computed(() => {
    const groups = overlayConfig.value?.edgeLine?.featureGroups ?? [];
    return groups.map((g) => ({ ...g, typeSet: new Set(g.types) }));
  });

  function _buildCellEdgeData(lineAttrFn) {
    return cells.value.map((cell) => ({
      id: cell.id,
      edgeFaces: CANONICAL_EDGE_DIRS.map((dir, fi) => ({
        dir,
        lineAttrs: lineAttrFn(cell, dir),
        groups: edgeLineGroups.value.map((group) => ({
          group,
          features: cell.edges?.[fi]?.filter((f) => group.typeSet.has(f.type)) ?? [],
        })),
      })),
    }));
  }

  // Standard edge layer — 20/80 split segments.
  // Short-circuits when through-hex style is active so both layers never render the same data.
  const cellsForEdges = computed(() => {
    if (overlayConfig.value?.edgeLine?.style === 'through-hex') return [];
    return _buildCellEdgeData((cell, dir) => edgeLine20_80(cell.corners, dir));
  });

  // Through-hex layer — centre-to-midpoint segments.
  // Mutually exclusive with cellsForEdges.
  const throughHexSegments = computed(() => {
    if (overlayConfig.value?.edgeLine?.style !== 'through-hex') return [];
    return _buildCellEdgeData((cell, dir) => edgeToCenter(cell.corners, cell.cx, cell.cy, dir));
  });

  return { cellsForEdges, throughHexSegments };
}
