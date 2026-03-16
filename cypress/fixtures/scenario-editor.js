/**
 * Minimal valid scenario fixture for scenario editor E2E tests.
 * _savedAt: 0 means local draft is never considered newer than server on fresh load.
 * Optional rules fields are omitted — the client renders defaults via ?? operators.
 */
export const FIXTURE = {
  _savedAt: 0,
  _status: 'available',
  _source: 'test',
  id: 'south-mountain',
  name: 'South Mountain',
  system: 'Line of Battle v2.0',
  publication: 'RSS #4',
  turnStructure: {
    firstTurn: '09:00',
    lastTurn: '20:00',
    totalTurns: 45,
    minutesPerTurn: 20,
    firstPlayer: 'union',
    date: '1862-09-14',
  },
  lightingSchedule: [],
};
