#!/usr/bin/env node
/**
 * One-shot transformation of oob.json to apply the revised data model:
 *  - Apply ordinal suffix to leaf unit names (infantry/cavalry/battery) starting with a digit
 *  - Rename ammoClass → morale on batteries
 *  - Remove stragglerBoxes from infantry/cavalry units
 *  - Remove wreckTrackTotal and morale from brigades
 *  - Remove divisionStragglerBoxes from divisions; rename divisionWreckThreshold → wreckThreshold
 *  - Remove counterRef from brigades and divisions
 *  - Add counterRef: null to supplyTrain and supplyWagon
 *  - Add hq: { id, name, counterRef } to union corps, CSA divisions, and cavalry division
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const OOB_PATH = join(__dirname, '../data/scenarios/south-mountain/oob.json');

const oob = JSON.parse(readFileSync(OOB_PATH, 'utf8'));

// ── Ordinal suffix ──────────────────────────────────────────────────────────

function ordSuffix(n) {
  const t = n % 100;
  if (t >= 11 && t <= 13) return 'th';
  switch (n % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

function addOrdinal(name) {
  if (!name) return name;
  return name.replace(/^(\d+)(\s|$)/, (_, num, rest) => `${num}${ordSuffix(+num)}${rest}`);
}

function divHqName(divName) {
  return divName
    .replace(/\s*\([^)]*\)/g, '')
    .replace('Division', 'Div HQ')
    .trim();
}

// ── Unit transformations ────────────────────────────────────────────────────

function transformUnit(u) {
  const { stragglerBoxes: _sb, ...rest } = u;
  return { ...rest, name: addOrdinal(u.name) };
}

function transformBattery(b) {
  const { ammoClass, counterRef: _cr, ...rest } = b;
  return { ...rest, name: addOrdinal(b.name), morale: ammoClass };
}

function transformBrigade(b) {
  const { morale: _m, wreckTrackTotal: _wtt, counterRef: _cr, ...rest } = b;
  return {
    ...rest,
    regiments: (rest.regiments || []).map(transformUnit),
    ...(rest.batteries ? { batteries: rest.batteries.map(transformBattery) } : {}),
  };
}

function transformArtilleryGroup(artyObj) {
  if (!artyObj) return undefined;
  const result = {};
  for (const [key, group] of Object.entries(artyObj)) {
    result[key] = {
      ...group,
      batteries: (group.batteries || []).map(transformBattery),
    };
  }
  return result;
}

function transformDivision(div, hqName) {
  const {
    divisionStragglerBoxes: _dsb,
    divisionWreckThreshold,
    counterRef: _cr,
    artillery,
    brigades,
    ...rest
  } = div;

  const hqId = `${div.id}-hq`;
  const resolvedHqName = hqName ?? divHqName(div.name);

  return {
    ...rest,
    wreckThreshold: divisionWreckThreshold,
    hq: { id: hqId, name: resolvedHqName, counterRef: null },
    ...(artillery ? { artillery: transformArtilleryGroup(artillery) } : {}),
    brigades: brigades.map(transformBrigade),
  };
}

function transformCorps(c) {
  const { artillery, divisions, corpsUnits, ...rest } = c;
  return {
    ...rest,
    hq: { id: `${c.id}-hq`, name: `${c.name} HQ`, counterRef: null },
    ...(corpsUnits ? { corpsUnits: corpsUnits.map(transformUnit) } : {}),
    ...(artillery ? { artillery: transformArtilleryGroup(artillery) } : {}),
    divisions: divisions.map((d) => transformDivision(d)),
  };
}

function transformCavalryDivision(cd) {
  const { artillery, brigades, ...rest } = cd;
  return {
    ...rest,
    hq: { id: `${cd.id}-hq`, name: 'Cavalry Div HQ', counterRef: null },
    ...(artillery ? { artillery: transformArtilleryGroup(artillery) } : {}),
    brigades: brigades.map(transformBrigade),
  };
}

function transformIndependentBrigade(ib) {
  const { morale: _m, wreckTrackTotal: _wtt, counterRef: _cr, artillery, regiments, ...rest } = ib;
  return {
    ...rest,
    ...(artillery ? { artillery: transformArtilleryGroup(artillery) } : {}),
    regiments: regiments.map(transformUnit),
  };
}

// ── Apply to full OOB ───────────────────────────────────────────────────────

oob.union.supplyTrain = { ...oob.union.supplyTrain, counterRef: null };
oob.union.corps = oob.union.corps.map(transformCorps);
oob.union.cavalryDivision = transformCavalryDivision(oob.union.cavalryDivision);

oob.confederate.supplyWagon = { ...oob.confederate.supplyWagon, counterRef: null };

oob.confederate.divisions = oob.confederate.divisions.map((d) => transformDivision(d));

oob.confederate.independent = {
  ...oob.confederate.independent,
  cavalry: (oob.confederate.independent.cavalry || []).map(transformUnit),
  artillery: (oob.confederate.independent.artillery || []).map(transformBattery),
};

oob.confederate.reserveArtillery = {
  ...oob.confederate.reserveArtillery,
  batteries: (oob.confederate.reserveArtillery.batteries || []).map(transformBattery),
};

if (oob.confederate.independentBrigades) {
  oob.confederate.independentBrigades = oob.confederate.independentBrigades.map(
    transformIndependentBrigade
  );
}

writeFileSync(OOB_PATH, JSON.stringify(oob, null, 2) + '\n');
console.log('[transform-oob] Done — oob.json updated.');
