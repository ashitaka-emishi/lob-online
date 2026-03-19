/**
 * Minimal valid map fixture for map editor E2E tests.
 * _savedAt: 0 means local draft is never considered newer than server on fresh load.
 */
export const FIXTURE = {
  _savedAt: 0,
  id: 'south-mountain',
  hexes: [],
  gridSpec: {
    cols: 64,
    rows: 35,
    dx: 0,
    dy: 0,
    hexWidth: 35,
    hexHeight: 35,
    imageScale: 1,
    orientation: 'flat',
    strokeWidth: 0.5,
    evenColUp: true,
  },
  terrainTypes: ['clear'],
  edgeFeatureTypes: ['road'],
  vpHexes: [],
  entryHexes: [],
};
