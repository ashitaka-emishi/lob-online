// LOB §6.1 — visibility is unlimited during day; sentinel value used in schema and display logic.
export const VISIBILITY_UNLIMITED = 999;

// LOB §1.1 — day/twilight turns are 15 minutes, night turns are 30 minutes.
// Sister definition: server/src/engine/turnTime.js — keep both in sync.
export const MINUTES_PER_CONDITION = {
  day: 15,
  twilight: 15,
  night: 30,
  fog: 15,
  rain: 15,
};

// Default minutes per turn for conditions not listed in the lighting schedule.
export const MINUTES_PER_CONDITION_DEFAULT = 15;
