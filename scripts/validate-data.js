#!/usr/bin/env node
/**
 * validate-data.js
 * M0 validation script: loads all four South Mountain JSON data files,
 * validates against Zod schemas, and cross-checks referential integrity.
 *
 * Usage:  node scripts/validate-data.js
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { OOBSchema }      from '../server/src/schemas/oob.schema.js';
import { LeadersSchema }  from '../server/src/schemas/leaders.schema.js';
import { ScenarioSchema } from '../server/src/schemas/scenario.schema.js';
import { MapSchema }      from '../server/src/schemas/map.schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, '../data/scenarios/south-mountain');

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

let errors = 0;
let warnings = 0;

function pass(msg)  { console.log(`  ✓ ${msg}`); }
function fail(msg)  { console.error(`  ✗ ${msg}`); errors++; }
function warn(msg)  { console.warn(`  ⚠ ${msg}`); warnings++; }
function section(h) { console.log(`\n── ${h} ──`); }

function loadJSON(filename) {
  const path = join(DATA_DIR, filename);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    fail(`Could not load ${filename}: ${e.message}`);
    return null;
  }
}

function validate(schema, data, label) {
  const result = schema.safeParse(data);
  if (result.success) {
    pass(`${label} — schema valid`);
  } else {
    fail(`${label} — schema errors:`);
    for (const issue of result.error.issues) {
      console.error(`     path: ${issue.path.join('.')}  →  ${issue.message}`);
    }
  }
  return result.success ? result.data : null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Collect all unit IDs from OOB
// ──────────────────────────────────────────────────────────────────────────────

function collectUnitIds(oob) {
  const ids = new Set();

  function addUnit(u) { if (u?.id) ids.add(u.id); }
  function addBattery(b) { if (b?.id) ids.add(b.id); }

  // Union
  for (const corps of oob.union.corps) {
    addUnit({ id: corps.id });
    for (const unit of corps.corpsUnits ?? []) addUnit(unit);
    for (const artGroup of Object.values(corps.artillery ?? {})) {
      for (const b of artGroup.batteries) addBattery(b);
    }
    for (const div of corps.divisions) {
      addUnit({ id: div.id });
      for (const artGroup of Object.values(div.artillery ?? {})) {
        for (const b of artGroup.batteries) addBattery(b);
      }
      for (const bde of div.brigades) {
        addUnit({ id: bde.id });
        for (const reg of bde.regiments) addUnit(reg);
      }
    }
  }
  // Union Cav
  const cav = oob.union.cavalryDivision;
  addUnit({ id: cav.id });
  for (const artGroup of Object.values(cav.artillery ?? {})) {
    for (const b of artGroup.batteries) addBattery(b);
  }
  for (const bde of cav.brigades) {
    addUnit({ id: bde.id });
    for (const reg of bde.regiments) addUnit(reg);
  }
  // Union supply
  addUnit(oob.union.supplyTrain);

  // Confederate
  addUnit(oob.confederate.supplyWagon);
  for (const u of oob.confederate.independent.cavalry) addUnit(u);
  for (const b of oob.confederate.independent.artillery) addBattery(b);
  for (const b of oob.confederate.reserveArtillery.batteries) addBattery(b);
  for (const div of oob.confederate.divisions) {
    addUnit({ id: div.id });
    for (const artGroup of Object.values(div.artillery ?? {})) {
      for (const b of artGroup.batteries) addBattery(b);
    }
    for (const bde of div.brigades) {
      addUnit({ id: bde.id });
      for (const reg of bde.regiments) addUnit(reg);
    }
  }
  for (const bde of oob.confederate.independentBrigades ?? []) {
    addUnit({ id: bde.id });
    for (const artGroup of Object.values(bde.artillery ?? {})) {
      for (const b of artGroup.batteries) addBattery(b);
    }
    for (const reg of bde.regiments) addUnit(reg);
  }

  return ids;
}

// ──────────────────────────────────────────────────────────────────────────────
// Collect all leader commandsIds
// ──────────────────────────────────────────────────────────────────────────────

function collectLeaderCommandsIds(leaders) {
  const ids = new Set();
  const allLeaders = [
    ...leaders.union.army,
    ...leaders.union.corps,
    ...leaders.union.cavalry,
    ...leaders.union.divisions,
    ...leaders.union.brigades,
    ...leaders.confederate.wing,
    ...leaders.confederate.divisions,
    ...leaders.confederate.brigades,
  ];
  for (const l of allLeaders) {
    if (l.commandsId) ids.add(l.commandsId);
  }
  return ids;
}

// ──────────────────────────────────────────────────────────────────────────────
// Cross-reference checks
// ──────────────────────────────────────────────────────────────────────────────

function checkLeaderCommandsReferenceOOB(leaders, unitIds) {
  const allLeaders = [
    ...leaders.union.army,
    ...leaders.union.corps,
    ...leaders.union.cavalry,
    ...leaders.union.divisions,
    ...leaders.union.brigades,
    ...leaders.confederate.wing,
    ...leaders.confederate.divisions,
    ...leaders.confederate.brigades,
  ];
  let ok = 0;
  for (const l of allLeaders) {
    if (!l.commandsId) continue;
    if (unitIds.has(l.commandsId)) {
      ok++;
    } else {
      // commandsId may reference a corps/division ID not in unit id set — that's expected
      // for top-level IDs like "1c", "9c", "csa-wing" which are structural not unit records
      warn(`Leader "${l.id}" commandsId "${l.commandsId}" not found in OOB unit IDs (may be a corps/army-level structural ID — verify manually)`);
    }
  }
  pass(`Leader commandsIds checked — ${ok} resolved against OOB`);
}

function collectLeaderIds(leaders) {
  const ids = new Set();
  const allLeaders = [
    ...leaders.union.army,
    ...leaders.union.corps,
    ...leaders.union.cavalry,
    ...leaders.union.divisions,
    ...leaders.union.brigades,
    ...leaders.confederate.wing,
    ...leaders.confederate.divisions,
    ...leaders.confederate.brigades,
  ];
  for (const l of allLeaders) ids.add(l.id);
  return ids;
}

function checkScenarioUnitsInOOB(scenario, unitIds) {
  const allRefUnits = new Set();

  // setup union
  for (const group of scenario.setup?.union ?? []) {
    for (const u of group.units ?? []) allRefUnits.add(u);
    if (group.unitId) allRefUnits.add(group.unitId);
  }
  // setup confederate
  for (const entry of scenario.setup?.confederate ?? []) {
    if (entry.unitId) allRefUnits.add(entry.unitId);
    if (Array.isArray(entry.units)) {
      for (const u of entry.units) {
        const id = typeof u === 'string' ? u : u.unitId;
        if (id) allRefUnits.add(id);
      }
    }
  }
  // reinforcements
  for (const side of ['union', 'confederate']) {
    for (const group of scenario.reinforcements?.[side] ?? []) {
      for (const u of group.units ?? []) allRefUnits.add(u);
    }
  }

  let missing = 0;
  for (const uid of allRefUnits) {
    if (!unitIds.has(uid)) {
      warn(`Scenario references unit "${uid}" not found in OOB (may be a leader ID or corps-level structural ref)`);
      missing++;
    }
  }
  pass(`Scenario unit references checked — ${allRefUnits.size} total, ${missing} unresolved (see warnings above)`);
}

function checkVPHexesInMap(scenario, map) {
  const mapHexIds = new Set(map.hexes.map(h => h.hex));
  const vpHexes   = scenario.victoryPoints?.terrain ?? [];

  let ok = 0;
  for (const vp of vpHexes) {
    if (mapHexIds.has(vp.hex)) {
      ok++;
    } else {
      fail(`VP hex "${vp.hex}" is not present in map.hexes`);
    }
  }
  pass(`VP hex presence in map checked — ${ok}/${vpHexes.length} found`);
}

function checkSetupHexesInMap(scenario, map) {
  const mapHexIds = new Set(map.hexes.map(h => h.hex));

  // Collect exact hexes referenced in setup
  const setupHexes = new Set();
  for (const entry of scenario.setup?.confederate ?? []) {
    if (entry.hex) setupHexes.add(entry.hex);
    if (Array.isArray(entry.units)) {
      for (const u of entry.units) {
        if (u?.hex) setupHexes.add(u.hex);
      }
    }
  }

  let ok = 0;
  for (const hex of setupHexes) {
    if (mapHexIds.has(hex)) {
      ok++;
    } else {
      fail(`Setup hex "${hex}" is not present in map.hexes`);
    }
  }
  pass(`Setup hex presence in map checked — ${ok}/${setupHexes.size} exact hexes found`);
}

function checkEntryHexesInMap(scenario, map) {
  const mapHexIds = new Set(map.hexes.map(h => h.hex));
  const allRefs   = [];

  for (const side of ['union', 'confederate']) {
    for (const group of scenario.reinforcements?.[side] ?? []) {
      if (group.entryHex) allRefs.push({ hex: group.entryHex, side });
      for (const row of group.variableTable ?? []) {
        if (row.entryHex) allRefs.push({ hex: row.entryHex, side });
      }
    }
  }

  let ok = 0;
  for (const ref of allRefs) {
    if (mapHexIds.has(ref.hex)) {
      ok++;
    } else {
      fail(`Reinforcement entry hex "${ref.hex}" (${ref.side}) not in map.hexes`);
    }
  }
  pass(`Reinforcement entry hexes in map checked — ${ok}/${allRefs.length} found`);
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────

console.log('lob-online — M0 Data Validation');
console.log('=================================');

section('1. Loading JSON files');
const rawOOB      = loadJSON('oob.json');
const rawLeaders  = loadJSON('leaders.json');
const rawScenario = loadJSON('scenario.json');
const rawMap      = loadJSON('map.json');

if (!rawOOB || !rawLeaders || !rawScenario || !rawMap) {
  console.error('\nFatal: one or more files failed to load. Fix above errors first.\n');
  process.exit(1);
}
pass('All four JSON files loaded');

section('2. Schema validation');
const oob      = validate(OOBSchema,      rawOOB,      'oob.json');
const leaders  = validate(LeadersSchema,  rawLeaders,  'leaders.json');
const scenario = validate(ScenarioSchema, rawScenario, 'scenario.json');
const map      = validate(MapSchema,      rawMap,      'map.json');

section('3. Cross-reference checks');

if (oob && leaders) {
  const unitIds    = collectUnitIds(oob);
  const leaderIds  = collectLeaderIds(leaders);
  const allIds     = new Set([...unitIds, ...leaderIds]);
  pass(`OOB unit ID pool: ${unitIds.size} unit IDs + ${leaderIds.size} leader IDs = ${allIds.size} total`);
  checkLeaderCommandsReferenceOOB(leaders, allIds);

  if (scenario) {
    checkScenarioUnitsInOOB(scenario, allIds);
  }
}

if (scenario && map) {
  checkVPHexesInMap(rawScenario, rawMap);
  checkSetupHexesInMap(rawScenario, rawMap);
  checkEntryHexesInMap(rawScenario, rawMap);
}

section('4. Map completeness');
if (map) {
  const unknownTerrain = rawMap.hexes.filter(h => h.terrain === 'unknown').length;
  const totalHexes     = rawMap.hexes.length;
  if (unknownTerrain > 0) {
    warn(`${unknownTerrain}/${totalHexes} hexes have terrain="unknown" — map digitization incomplete`);
  } else {
    pass(`All ${totalHexes} hexes have a terrain type`);
  }
}

section('Summary');
console.log(`  Errors:   ${errors}`);
console.log(`  Warnings: ${warnings}`);

if (errors === 0) {
  console.log('\n✓ All checks passed.\n');
  process.exit(0);
} else {
  console.error(`\n✗ ${errors} error(s) found — fix before proceeding.\n`);
  process.exit(1);
}
