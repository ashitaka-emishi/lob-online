// LOB §9.1 — turn duration: daytime and twilight turns = 15 min; night turns = 30 min.

function getLightingEntry(turn, lightingSchedule) {
  if (!lightingSchedule || lightingSchedule.length === 0) {
    return { condition: 'day', visibilityHexes: 999 };
  }
  let entry = lightingSchedule[0];
  for (const slot of lightingSchedule) {
    if (turn >= slot.startTurn) entry = slot;
  }
  return entry;
}

function minutesPerTurn(condition) {
  return condition === 'night' ? 30 : 15;
}

function formatTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Compute scenario clock time and lighting state for a given turn number.
 *
 * @param {number} turnNumber  1-based turn index
 * @param {object} scenario    Scenario data with turnStructure and optional lightingSchedule
 * @returns {{ time: string, condition: string, visibilityHexes: number, date: string }}
 */
export function computeTurnTime(turnNumber, scenario) {
  const { lightingSchedule } = scenario;
  const { firstTurn, date } = scenario.turnStructure;

  const [startH, startM] = firstTurn.split(':').map(Number);
  let elapsedMinutes = startH * 60 + startM;

  // Accumulate minutes for turns 1 through turnNumber-1
  for (let t = 1; t < turnNumber; t++) {
    const entry = getLightingEntry(t, lightingSchedule);
    elapsedMinutes += minutesPerTurn(entry.condition);
  }

  const currentEntry = getLightingEntry(turnNumber, lightingSchedule);

  return {
    time: formatTime(elapsedMinutes),
    condition: currentEntry.condition,
    visibilityHexes: currentEntry.visibilityHexes,
    date,
  };
}
