#!/usr/bin/env node
/**
 * detect-counters.js
 *
 * One-time developer script. Uses the Claude vision API to match counter images already in
 * client/public/counters/ to unit and leader records in oob.json / leaders.json.
 *
 * Images are NOT moved or deleted — they are already in place.
 *
 * Behaviour:
 *   1. Read all images from COUNTERS_DIR (client/public/counters/)
 *   2. Determine side (front/back) from filename
 *   3. For each image call Claude vision API to identify the unit/leader shown
 *   4. Write counterRef + confidence into the matching record for ALL matches (threshold = 0)
 *   5. Save updated oob.json and leaders.json
 *   6. Print summary report
 *
 * Filename conventions:
 *   CS1-Front_##.jpg  — front face from scanned counter sheet 1
 *   CS1-Back_##.jpg   — back face from scanned counter sheet 1
 *   C## copy.png      — Confederate (CSA) unit front (cut-out individual counter)
 *   U## [copy].png    — Union (USA) unit front (cut-out individual counter)
 *
 * Usage:
 *   node scripts/detect-counters.js [--dry-run]
 *
 * Requires ANTHROPIC_API_KEY in environment.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, extname, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const COUNTERS_DIR = join(ROOT, 'client/public/counters');
const OOB_PATH = join(ROOT, 'data/scenarios/south-mountain/oob.json');
const LEADERS_PATH = join(ROOT, 'data/scenarios/south-mountain/leaders.json');
const CONFIDENCE_THRESHOLD = 0.0;
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

const DRY_RUN = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// Filename helpers
// ---------------------------------------------------------------------------

/**
 * Determine the counter face side from the filename.
 *
 *   CS1-Front_##  → "front"
 *   CS1-Back_##   → "back"
 *   C## copy.png  → "front"  (Confederate individual counter — always front)
 *   U## [copy].png → "front" (Union individual counter — always front)
 */
function sideFromFilename(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('-front_')) return 'front';
  if (lower.includes('-back_')) return 'back';
  // C## and U## cut-out files are always fronts
  return 'front';
}

/**
 * Return an army hint ("confederate" | "union" | null) from the filename.
 * C## = Confederate, U## = Union. CS1-* sheets may contain either.
 */
function armyFromFilename(filename) {
  const name = basename(filename, extname(filename)).toLowerCase();
  if (/^c\d+/.test(name)) return 'confederate';
  if (/^u\d+/.test(name)) return 'union';
  return null;
}

// ---------------------------------------------------------------------------
// Data loading helpers
// ---------------------------------------------------------------------------

function loadJSON(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function saveJSON(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/**
 * Walk oob.json and collect all unit and battery records, capturing their full
 * organizational chain (corps → division → brigade) so the roster can include it.
 *
 * Returns Map<id, { record, type, chain }>
 *   chain: { corps, division, brigade } — string names, any may be null
 */
function collectOOBRecords(oob) {
  const map = new Map();

  function walkUnits(node, chain) {
    if (Array.isArray(node)) {
      node.forEach((n) => walkUnits(n, chain));
      return;
    }
    if (typeof node !== 'object' || !node) return;
    if (node.weapon !== undefined || node.gunType !== undefined) {
      map.set(node.id, { record: node, type: 'unit', chain });
      return;
    }
    Object.values(node).forEach((v) => walkUnits(v, chain));
  }

  // Walk union corps
  for (const corps of oob.union?.corps ?? []) {
    for (const div of corps.divisions ?? []) {
      for (const brig of div.brigades ?? []) {
        walkUnits(brig.regiments, { corps: corps.name, division: div.name, brigade: brig.name });
        for (const artGroup of Object.values(brig.artillery ?? {})) {
          walkUnits(artGroup.batteries, {
            corps: corps.name,
            division: div.name,
            brigade: artGroup.name,
          });
        }
      }
      for (const artGroup of Object.values(div.artillery ?? {})) {
        walkUnits(artGroup.batteries, {
          corps: corps.name,
          division: div.name,
          brigade: artGroup.name,
        });
      }
    }
    for (const artGroup of Object.values(corps.artillery ?? {})) {
      walkUnits(artGroup.batteries, { corps: corps.name, division: null, brigade: artGroup.name });
    }
    walkUnits(corps.corpsUnits, { corps: corps.name, division: null, brigade: null });
  }

  // Walk union cavalry division
  const cavDiv = oob.union?.cavalryDivision;
  if (cavDiv) {
    for (const brig of cavDiv.brigades ?? []) {
      walkUnits(brig.regiments, { corps: cavDiv.name, division: null, brigade: brig.name });
    }
    for (const artGroup of Object.values(cavDiv.artillery ?? {})) {
      walkUnits(artGroup.batteries, { corps: cavDiv.name, division: null, brigade: artGroup.name });
    }
  }

  // Walk confederate divisions
  for (const div of oob.confederate?.divisions ?? []) {
    for (const brig of div.brigades ?? []) {
      walkUnits(brig.regiments, { corps: null, division: div.name, brigade: brig.name });
      for (const artGroup of Object.values(brig.artillery ?? {})) {
        walkUnits(artGroup.batteries, { corps: null, division: div.name, brigade: artGroup.name });
      }
    }
    for (const artGroup of Object.values(div.artillery ?? {})) {
      walkUnits(artGroup.batteries, { corps: null, division: div.name, brigade: artGroup.name });
    }
  }

  // Walk confederate independent units
  walkUnits(oob.confederate?.independent?.cavalry, {
    corps: null,
    division: 'Independent',
    brigade: null,
  });
  // Pelham's artillery is independent — not attached to any division
  walkUnits(oob.confederate?.independent?.artillery, {
    corps: null,
    division: 'Independent (Pelham)',
    brigade: null,
  });
  walkUnits(oob.confederate?.reserveArtillery?.batteries, {
    corps: null,
    division: 'Reserve Artillery',
    brigade: null,
  });

  // Walk confederate independent brigades
  for (const brig of oob.confederate?.independentBrigades ?? []) {
    walkUnits(brig.regiments, { corps: null, division: 'Independent', brigade: brig.name });
    for (const artGroup of Object.values(brig.artillery ?? {})) {
      walkUnits(artGroup.batteries, {
        corps: null,
        division: 'Independent',
        brigade: artGroup.name,
      });
    }
  }

  return map;
}

/**
 * Walk leaders.json and collect all leader records.
 * Returns Map<id, { record, type }>.
 */
function collectLeaderRecords(leaders) {
  const map = new Map();
  function walk(node) {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node !== 'object' || !node) return;
    if (node.commandLevel !== undefined) {
      map.set(node.id, { record: node, type: 'leader' });
      return;
    }
    Object.values(node).forEach(walk);
  }
  walk(leaders);
  return map;
}

// ---------------------------------------------------------------------------
// Claude vision
// ---------------------------------------------------------------------------

/**
 * Build a full roster string including unit stats and organizational chain.
 *
 * Unit line format (infantry/cavalry):
 *   id | name | type | weapon | strength | morale | brigade | division | corps
 *
 * Battery line format:
 *   id | name | artillery | gunType | strength | ammo | brigade | division | corps
 *
 * Leader line format:
 *   id | name | commandLevel
 */
function buildRoster(oobMap, leaderMap, armyHint) {
  const lines = [];

  const armyLabel =
    armyHint === 'confederate'
      ? ' — NOTE: this counter is Confederate'
      : armyHint === 'union'
        ? ' — NOTE: this counter is Union'
        : '';

  lines.push(
    `UNITS (id | name | type | weapon/gun | strength | morale/ammo | brigade | division | corps)${armyLabel}:`
  );

  for (const [id, { record, chain }] of oobMap) {
    const { brigade = null, division = null, corps = null } = chain ?? {};
    const brig = brigade ?? '—';
    const div = division ?? '—';
    const cor = corps ?? '—';

    let line;
    if (record.gunType !== undefined) {
      // Artillery battery
      line = `  ${id} | ${record.name} | artillery | ${record.gunType} | ${record.strengthPoints}sp | ammo:${record.ammoClass} | ${brig} | ${div} | ${cor}`;
    } else {
      // Infantry / cavalry unit
      line = `  ${id} | ${record.name} | ${record.type} | ${record.weapon} | ${record.strengthPoints}sp | morale:${record.morale} | ${brig} | ${div} | ${cor}`;
    }
    lines.push(line);
  }

  lines.push('\nLEADERS (id | name | commandLevel):');
  for (const [id, { record }] of leaderMap) {
    lines.push(`  ${id} | ${record.name} | ${record.commandLevel}`);
  }
  return lines.join('\n');
}

/**
 * Call Claude vision API to identify the counter in the image.
 * Side is already known from the filename — Claude only needs to identify the unitId.
 *
 * Returns { unitId: string|null, confidence: number }
 */
async function identifyCounter(client, imagePath, side, armyHint, roster) {
  const imageData = readFileSync(imagePath);
  const base64 = imageData.toString('base64');
  const ext = extname(imagePath).toLowerCase().replace('.', '');
  const mediaType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;

  const sideDesc =
    side === 'back'
      ? `This is the BACK (reverse) face of a unit counter. The back face shows:
- "COL" printed in red at the top (column formation indicator)
- The regiment's name printed below "COL"
- The unit's command chain below that: CORPS / DIVISION / BRIGADE`
      : armyHint === 'confederate'
        ? `This is the FRONT (obverse) face of a CONFEDERATE unit counter. Confederate unit fronts show:
- Regiment name at the top (e.g. "6 GA", "27 NC")
- Below the regiment name: the division abbreviation / corps abbreviation
  (e.g. "C/DH" means Colquitt's brigade in D.H. Hill's corps; "G/LAW" means Garland/Law)
- A state or Confederate flag background image
- A line formation symbol in the center
- Bottom-left corner: weapon type (R=rifle, SR=short rifle, M=musket, C=cavalry) and strength points
- Bottom-right corner: morale rating (A, B, C, or D)
Leader fronts show the leader's name, initiative rating, and command level.`
        : armyHint === 'union'
          ? `This is the FRONT (obverse) face of a UNION unit counter. Union unit fronts show:
- Regiment name at the top (e.g. "22 NY", "3 ME", "B 4 US" for artillery)
- Below the regiment name: brigade / division / corps chain
- A US state flag or national flag background image
- A line formation symbol in the center
- Bottom-left corner: weapon type (R=rifle, SR=short rifle, M=musket, C=cavalry) and strength points
- Bottom-right corner: morale rating (A, B, C, or D)
Leader fronts show the leader's name, initiative rating, and command level.`
          : `This is the FRONT (obverse) face of a counter. Unit fronts show:
- Regiment name at the top
- Confederate units: division/corps abbreviation below (e.g. "C/DH" = Colquitt/D.H. Hill)
- Union units: brigade/division/corps chain below
- A state or national flag background image
- A line formation symbol in the center
- Bottom-left corner: weapon type and strength points
- Bottom-right corner: morale rating (A, B, C, or D)
Leader fronts show the leader's name, initiative rating, and command level.`;

  const armyNote = armyHint
    ? `NOTE: This counter belongs to the ${armyHint.toUpperCase()} army.`
    : '';

  const systemPrompt = `You are a wargame counter identification assistant for the South Mountain
scenario of Line of Battle v2.0. Identify which unit or leader the counter image belongs to by
reading the printed text and insignia.

${sideDesc}

${armyNote}

Respond ONLY with valid JSON (no markdown, no code fences, no explanation):
{"unitId":"<id from the roster, or null>","confidence":<0.0 to 1.0>}

Rules:
- unitId must exactly match an id from the provided roster, or be null
- confidence: how certain you are (0 = no idea, 1 = certain)
- If the image is a supply wagon, supply train, or blank counter, set unitId to null
- Read regiment name, state, division/corps abbreviation, weapon type, strength, and morale
  carefully — use all available text to resolve ambiguities between similarly-named units
- When two units share the same regiment number from the same state, use the weapon type,
  strength points, and morale rating to distinguish them`;

  const userPrompt = `Identify this counter (${side} face). Match it to an entry in the roster below.\n\n${roster}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 128,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          { type: 'text', text: userPrompt },
        ],
      },
    ],
  });

  const raw = response.content[0]?.text?.trim() ?? '';
  // Strip any accidental ```json ... ``` wrapper
  const text = raw
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/, '')
    .replace(/\n/g, ' ');

  try {
    const parsed = JSON.parse(text);
    return {
      unitId: parsed.unitId ?? null,
      confidence:
        typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0,
    };
  } catch {
    console.warn(`  [warn] Could not parse Claude response: ${text}`);
    return { unitId: null, confidence: 0 };
  }
}

// ---------------------------------------------------------------------------
// counterRef write helper
// ---------------------------------------------------------------------------

/**
 * Expand a null counterRef to its full object shape, then write the filename + confidence
 * for the given side.
 */
function writeCounterRef(record, recordType, side, filename, confidence) {
  if (record.counterRef === null || record.counterRef === undefined) {
    if (recordType === 'leader') {
      record.counterRef = {
        front: null,
        frontConfidence: null,
        back: null,
        backConfidence: null,
        promotedFront: null,
        promotedFrontConfidence: null,
        promotedBack: null,
        promotedBackConfidence: null,
      };
    } else {
      record.counterRef = {
        front: null,
        frontConfidence: null,
        back: null,
        backConfidence: null,
      };
    }
  }
  const confKey = side + 'Confidence';
  if (Object.prototype.hasOwnProperty.call(record.counterRef, side)) {
    record.counterRef[side] = filename;
    record.counterRef[confKey] = confidence;
  } else {
    console.warn(`  [warn] Side "${side}" not valid for record type "${recordType}" — skipping`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[detect-counters] ANTHROPIC_API_KEY is not set. Aborting.');
    process.exit(1);
  }

  if (!existsSync(COUNTERS_DIR)) {
    console.error(`[detect-counters] Counters directory not found: ${COUNTERS_DIR}`);
    process.exit(1);
  }

  const imageFiles = readdirSync(COUNTERS_DIR)
    .filter((f) => IMAGE_EXTS.has(extname(f).toLowerCase()))
    .sort();

  if (imageFiles.length === 0) {
    console.log('[detect-counters] No images found. Nothing to do.');
    return;
  }

  console.log(`[detect-counters] Found ${imageFiles.length} images in ${COUNTERS_DIR}`);
  if (DRY_RUN) console.log('[detect-counters] DRY RUN — no files will be written');

  const oob = loadJSON(OOB_PATH);
  const leaders = loadJSON(LEADERS_PATH);
  const oobMap = collectOOBRecords(oob);
  const leaderMap = collectLeaderRecords(leaders);

  const client = new Anthropic();
  const results = [];

  for (const filename of imageFiles) {
    const imagePath = join(COUNTERS_DIR, filename);
    const side = sideFromFilename(filename);
    const armyHint = armyFromFilename(filename);
    const roster = buildRoster(oobMap, leaderMap, armyHint);

    process.stdout.write(
      `  [${results.length + 1}/${imageFiles.length}] ${filename} (${side}) ... `
    );

    let identification;
    try {
      identification = await identifyCounter(client, imagePath, side, armyHint, roster);
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      results.push({
        filename,
        side,
        unitId: null,
        confidence: 0,
        status: 'error',
        error: err.message,
      });
      continue;
    }

    const { unitId, confidence } = identification;
    const meetsThreshold = confidence >= CONFIDENCE_THRESHOLD;

    let status = 'unmatched';
    if (unitId && meetsThreshold) {
      const entry = oobMap.get(unitId) ?? leaderMap.get(unitId);
      if (entry) {
        const { record, type } = entry;
        if (!DRY_RUN) writeCounterRef(record, type, side, filename, confidence);
        status = 'matched';
      } else {
        status = 'id-not-found';
      }
    }

    console.log(`${unitId ?? 'null'} conf=${confidence.toFixed(2)} → ${status}`);
    results.push({ filename, side, unitId, confidence, status });
  }

  // Save updated data files
  if (!DRY_RUN) {
    saveJSON(OOB_PATH, oob);
    saveJSON(LEADERS_PATH, leaders);
    console.log('\n[detect-counters] Saved oob.json and leaders.json');
  }

  // Summary report
  const matched = results.filter((r) => r.status === 'matched').length;
  const unmatched = results.filter((r) => r.status === 'unmatched').length;
  const idNotFound = results.filter((r) => r.status === 'id-not-found').length;
  const errors = results.filter((r) => r.status === 'error').length;

  console.log('\n========== SUMMARY ==========');
  console.log(`Total images:         ${imageFiles.length}`);
  console.log(`Matched (written):    ${matched}`);
  console.log(`No unit ID returned:  ${unmatched}`);
  console.log(`ID not in roster:     ${idNotFound}`);
  console.log(`Errors:               ${errors}`);
  console.log('\nPer-image results:');
  console.log('  filename                        | side  | unitId              | conf  | status');
  console.log('  ' + '-'.repeat(90));
  for (const r of results) {
    const fn = r.filename.padEnd(32);
    const s = r.side.padEnd(5);
    const uid = (r.unitId ?? 'null').padEnd(20);
    const c = r.confidence.toFixed(2).padStart(5);
    console.log(`  ${fn}| ${s} | ${uid}| ${c} | ${r.status}`);
  }
  console.log('==============================');
}

main().catch((err) => {
  console.error('[detect-counters] Fatal error:', err);
  process.exit(1);
});
