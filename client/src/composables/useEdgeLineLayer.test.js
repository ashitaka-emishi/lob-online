import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useEdgeLineLayer } from './useEdgeLineLayer.js';

// Minimal cell factory — supplies only what useEdgeLineLayer needs.
function makeCell(id, edgesObj = {}, corners = null) {
  // Six dummy corners sufficient for edgeLine20_80 and edgeToCenter geometry
  const c = corners ?? [
    { x: 10, y: 0 },
    { x: 20, y: 10 },
    { x: 20, y: 20 },
    { x: 10, y: 30 },
    { x: 0, y: 20 },
    { x: 0, y: 10 },
  ];
  return { id, cx: 10, cy: 15, corners: c, edges: edgesObj };
}

describe('useEdgeLineLayer', () => {
  it('cellsForEdges returns one entry per cell', () => {
    const cells = ref([makeCell('01.01'), makeCell('01.02')]);
    const overlayConfig = ref({ edgeLine: { featureGroups: [] } });
    const { cellsForEdges } = useEdgeLineLayer(cells, overlayConfig);
    expect(cellsForEdges.value.length).toBe(2);
  });

  it('cellsForEdges includes three canonical edge faces per cell (N, NE, SE)', () => {
    const cells = ref([makeCell('01.01')]);
    const overlayConfig = ref({ edgeLine: { featureGroups: [] } });
    const { cellsForEdges } = useEdgeLineLayer(cells, overlayConfig);
    const faces = cellsForEdges.value[0].edgeFaces.map((f) => f.dir);
    expect(faces).toEqual(['N', 'NE', 'SE']);
  });

  it('cellsForEdges returns [] when style is through-hex', () => {
    const cells = ref([makeCell('01.01')]);
    const overlayConfig = ref({ edgeLine: { style: 'through-hex', featureGroups: [] } });
    const { cellsForEdges } = useEdgeLineLayer(cells, overlayConfig);
    expect(cellsForEdges.value).toEqual([]);
  });

  it('throughHexSegments returns [] when style is not through-hex', () => {
    const cells = ref([makeCell('01.01')]);
    const overlayConfig = ref({ edgeLine: { featureGroups: [] } });
    const { throughHexSegments } = useEdgeLineLayer(cells, overlayConfig);
    expect(throughHexSegments.value).toEqual([]);
  });

  it('throughHexSegments returns entries when style is through-hex', () => {
    const cells = ref([makeCell('01.01')]);
    const overlayConfig = ref({ edgeLine: { style: 'through-hex', featureGroups: [] } });
    const { throughHexSegments } = useEdgeLineLayer(cells, overlayConfig);
    expect(throughHexSegments.value.length).toBe(1);
  });

  it('matching edge features appear in the groups', () => {
    const cell = makeCell('01.01', { 0: [{ type: 'trail' }] }); // face 0 = N
    const cells = ref([cell]);
    const overlayConfig = ref({
      edgeLine: {
        featureGroups: [{ types: ['trail'], color: '#888', strokeWidth: 1 }],
      },
    });
    const { cellsForEdges } = useEdgeLineLayer(cells, overlayConfig);
    const northFace = cellsForEdges.value[0].edgeFaces.find((f) => f.dir === 'N');
    expect(northFace.groups[0].features.length).toBe(1);
    expect(northFace.groups[0].features[0].type).toBe('trail');
  });

  it('reacts to cells ref change', () => {
    const cells = ref([makeCell('01.01')]);
    const overlayConfig = ref({ edgeLine: { featureGroups: [] } });
    const { cellsForEdges } = useEdgeLineLayer(cells, overlayConfig);
    expect(cellsForEdges.value.length).toBe(1);
    cells.value = [makeCell('01.01'), makeCell('01.02')];
    expect(cellsForEdges.value.length).toBe(2);
  });

  // #456: lineAttrs for standard (non-through-hex) edges must use the full edge geometry.
  // Corners for 'N' edge: DIR_TO_CORNERS['N'] = [5, 0]
  //   corners[5] = {x:0, y:10}, corners[0] = {x:10, y:0}
  // edgeLineFull → x1=0, y1=10, x2=10, y2=0  (raw corner endpoints)
  // edgeLine20_80 → x1=2, y1=8, x2=8, y2=2   (trimmed — fails this test)
  it('lineAttrs for N edge uses full-edge geometry (not 20/80 trimmed)', () => {
    const cells = ref([makeCell('01.01')]);
    const overlayConfig = ref({ edgeLine: { featureGroups: [] } });
    const { cellsForEdges } = useEdgeLineLayer(cells, overlayConfig);
    const northFace = cellsForEdges.value[0].edgeFaces.find((f) => f.dir === 'N');
    const { x1, y1, x2, y2 } = northFace.lineAttrs;
    // Full-edge: endpoints are exactly the raw corner coordinates (NW and NE corners)
    expect(x1).toBe(0);
    expect(y1).toBe(10);
    expect(x2).toBe(10);
    expect(y2).toBe(0);
  });
});
