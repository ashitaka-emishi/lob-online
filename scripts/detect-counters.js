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
 *   2. Classify each image by army (CSA/USA) and face (front/back) from filename conventions
 *      — for CS1-* files where army is ambiguous, a lightweight Claude color-detection call
 *        determines army (blue tint = Union, grey/tan = Confederate)
 *   3. Build a roster restricted to the classified army
 *   4. Call Claude vision API with the army-filtered roster + full command chain context
 *   5. Write counterRef.front/back + confidence for all matches (threshold = 0.0; OOB editor used for manual correction)
 *   6. Skip records where counterRef is already set, unless --force is passed
 *   7. Save updated oob.json and leaders.json
 *   8. Print summary report
 *
 * Filename conventions:
 *   CS1-Front_##.jpg  — front face, scanned counter sheet (army from color)
 *   CS1-Back_##.jpg   — back face, scanned counter sheet (army from color)
 *   C## copy.png      — Confederate (CSA) front (cut-out individual counter)
 *   U## [copy].png    — Union (USA) front (cut-out individual counter)
 *
 * Usage:
 *   node scripts/detect-counters.js [--dry-run] [--force]
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
const CONFIDENCE_THRESHOLD = 0.0; // write all matches; OOB editor used for manual correction
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const MIME_MAP = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

// ---------------------------------------------------------------------------
// Image classification helpers (exported for unit tests)
// ---------------------------------------------------------------------------

/**
 * Classify a counter image by army and face from its filename alone.
 *
 * Returns { army: 'confederate'|'union'|null, face: 'front'|'back' }
 *
 * army is null for CS1-* files — caller must use detectArmyByColor() for those.
 *
 * Rules (applied in order):
 *   C<digit>...  → confederate front  (e.g. "C1 copy.png", "C12 copy.png")
 *   U<digit>...  → union front        (e.g. "U1.png", "U57 copy.png")
 *   CS1-Front_*  → front, army=null
 *   CS1-Back_*   → back,  army=null
 *   (anything else) → front, army=null
 */
export function classifyImage(filename) {
  const name = basename(filename, extname(filename));

  if (/^[Cc]\d/.test(name)) return { army: 'confederate', face: 'front' };
  if (/^[Uu]\d/.test(name)) return { army: 'union', face: 'front' };

  const lower = filename.toLowerCase();
  if (lower.includes('-front_')) return { army: null, face: 'front' };
  if (lower.includes('-back_')) return { army: null, face: 'back' };

  return { army: null, face: 'front' };
}

/**
 * Use a lightweight Claude vision call to determine the counter's army from its color.
 * Blue-tinted background → Union; grey/tan/other → Confederate.
 *
 * Returns 'union' | 'confederate' | null (null = could not determine).
 */
export async function detectArmyByColor(client, imagePath) {
  const imageData = readFileSync(imagePath);
  const base64 = imageData.toString('base64');
  const ext = extname(imagePath).toLowerCase().replace('.', '');
  const mediaType = MIME_MAP[ext];
  if (!mediaType) {
    console.warn(`[detect-counters] Unsupported image type: ${ext} (${imagePath})`);
    return null;
  }

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 16,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          {
            type: 'text',
            text: 'Is the background color of this wargame counter predominantly BLUE (Union/USA) or GREY/TAN (Confederate/CSA)? Reply with exactly one word: "union" or "confederate".',
          },
        ],
      },
    ],
  });

  const text = response.content[0]?.text?.trim().toLowerCase() ?? '';
  if (text.includes('union')) return 'union';
  if (text.includes('confederate')) return 'confederate';
  return null;
}

// ---------------------------------------------------------------------------
// Data loading helpers
// ---------------------------------------------------------------------------

export function loadJSON(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function saveJSON(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/**
 * Walk oob.json and collect all unit and battery records, capturing their full
 * organizational chain (army → corps → division → brigade) and tagging each with army.
 *
 * Returns Map<id, { record, type, army, chain }>
 *   chain: { corps, division, brigade } — string names, any may be null
 */
export function collectOOBRecords(oob) {
  const map = new Map();

  function addUnit(node, army, chain) {
    if (!node || typeof node !== 'object') return;
    map.set(node.id, { record: node, type: 'unit', army, chain });
  }

  function walkBrigade(brig, army, corps, division) {
    const chain = { corps, division, brigade: brig.name };
    for (const reg of brig.regiments ?? []) addUnit(reg, army, chain);
    for (const artGroup of Object.values(brig.artillery ?? {})) {
      const artChain = { corps, division, brigade: artGroup.name };
      for (const bat of artGroup.batteries ?? []) addUnit(bat, army, artChain);
    }
  }

  function walkDivision(div, army, corps) {
    for (const brig of div.brigades ?? []) walkBrigade(brig, army, corps, div.name);
    for (const artGroup of Object.values(div.artillery ?? {})) {
      const chain = { corps, division: div.name, brigade: artGroup.name };
      for (const bat of artGroup.batteries ?? []) addUnit(bat, army, chain);
    }
  }

  // Union: supply train + corps → hq, divisions → brigades
  if (oob.union?.supplyTrain) {
    addUnit(oob.union.supplyTrain, 'union', { corps: null, division: null, brigade: null });
  }
  for (const corps of oob.union?.corps ?? []) {
    if (corps.hq) addUnit(corps.hq, 'union', { corps: corps.name, division: null, brigade: null });
    for (const div of corps.divisions ?? []) walkDivision(div, 'union', corps.name);
    for (const artGroup of Object.values(corps.artillery ?? {})) {
      const chain = { corps: corps.name, division: null, brigade: artGroup.name };
      for (const bat of artGroup.batteries ?? []) addUnit(bat, 'union', chain);
    }
    for (const unit of corps.corpsUnits ?? []) {
      addUnit(unit, 'union', { corps: corps.name, division: null, brigade: null });
    }
  }

  // Union cavalry division
  const cavDiv = oob.union?.cavalryDivision;
  if (cavDiv) {
    for (const brig of cavDiv.brigades ?? []) walkBrigade(brig, 'union', cavDiv.name, null);
    for (const artGroup of Object.values(cavDiv.artillery ?? {})) {
      const chain = { corps: cavDiv.name, division: null, brigade: artGroup.name };
      for (const bat of artGroup.batteries ?? []) addUnit(bat, 'union', chain);
    }
  }

  // Confederate: divisions → brigades
  for (const div of oob.confederate?.divisions ?? []) {
    for (const brig of div.brigades ?? []) walkBrigade(brig, 'confederate', null, div.name);
    for (const artGroup of Object.values(div.artillery ?? {})) {
      const chain = { corps: null, division: div.name, brigade: artGroup.name };
      for (const bat of artGroup.batteries ?? []) addUnit(bat, 'confederate', chain);
    }
  }

  // Confederate independent brigades
  for (const brig of oob.confederate?.independentBrigades ?? []) {
    walkBrigade(brig, 'confederate', null, 'Independent');
  }

  // Confederate independent cavalry / artillery / reserve artillery
  for (const unit of oob.confederate?.independent?.cavalry ?? []) {
    addUnit(unit, 'confederate', { corps: null, division: 'Independent', brigade: null });
  }
  for (const bat of oob.confederate?.independent?.artillery?.batteries ?? []) {
    addUnit(bat, 'confederate', { corps: null, division: 'Independent (Pelham)', brigade: null });
  }
  for (const bat of oob.confederate?.reserveArtillery?.batteries ?? []) {
    addUnit(bat, 'confederate', { corps: null, division: 'Reserve Artillery', brigade: null });
  }

  return map;
}

/**
 * Walk leaders.json and collect all leader records tagged with army.
 * Returns Map<id, { record, type, army }>.
 */
export function collectLeaderRecords(leaders) {
  const map = new Map();

  function walkLeaders(node, army) {
    if (Array.isArray(node)) {
      node.forEach((n) => walkLeaders(n, army));
      return;
    }
    if (typeof node !== 'object' || !node) return;
    if (node.commandLevel !== undefined) {
      map.set(node.id, { record: node, type: 'leader', army });
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('_')) continue;
      walkLeaders(v, army);
    }
  }

  walkLeaders(leaders.union, 'union');
  walkLeaders(leaders.confederate, 'confederate');
  return map;
}

// ---------------------------------------------------------------------------
// Roster builder
// ---------------------------------------------------------------------------

/**
 * Build a roster string filtered to the specified army.
 * Each unit line includes its full command chain (army → division → brigade).
 *
 * Unit line:   id | name | type | weapon/gun | strength | morale/ammo | brigade | division | corps
 * Leader line: id | name | commandLevel | commands
 */
export function buildRoster(oobMap, leaderMap, army) {
  const armyLabel = army === 'confederate' ? 'CONFEDERATE' : army === 'union' ? 'UNION' : 'ALL';
  const lines = [
    `${armyLabel} UNITS (id | name | type | weapon/gun | strength | morale/ammo | brigade | division | corps):`,
  ];

  for (const [id, entry] of oobMap) {
    if (army && entry.army !== army) continue;
    const { record, chain } = entry;
    const brig = chain?.brigade ?? '—';
    const div = chain?.division ?? '—';
    const cor = chain?.corps ?? '—';
    let line;
    if (record.gunType !== undefined) {
      line = `  ${id} | ${record.name} | artillery | ${record.gunType} | ${record.strengthPoints}sp | ammo:${record.ammoClass} | ${brig} | ${div} | ${cor}`;
    } else {
      line = `  ${id} | ${record.name} | ${record.type ?? 'infantry'} | ${record.weapon} | ${record.strengthPoints}sp | morale:${record.morale} | ${brig} | ${div} | ${cor}`;
    }
    lines.push(line);
  }

  lines.push(`\n${armyLabel} LEADERS (id | name | commandLevel | commandsId):`);
  for (const [id, entry] of leaderMap) {
    if (army && entry.army !== army) continue;
    const { record } = entry;
    lines.push(
      `  ${id} | ${record.name} | ${record.commandLevel} | commands:${record.commandsId ?? '—'}`
    );
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Claude vision identification
// ---------------------------------------------------------------------------

/**
 * Extract the first well-formed JSON object from a string using brace matching.
 * Handles nested objects and trailing prose after the closing brace.
 * Returns the matched substring, or null if no object is found.
 */
export function extractFirstJson(str) {
  const start = str.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') {
      depth--;
      if (depth === 0) return str.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Call Claude vision API to identify the counter in the image.
 * The army is pre-classified; the roster is already filtered to that army.
 *
 * Returns { unitId: string|null, confidence: number }
 */
export async function identifyCounter(client, imagePath, face, army, roster) {
  const imageData = readFileSync(imagePath);
  const base64 = imageData.toString('base64');
  const ext = extname(imagePath).toLowerCase().replace('.', '');
  const mediaType = MIME_MAP[ext];
  if (!mediaType) {
    console.warn(`[detect-counters] Unsupported image type: ${ext} (${imagePath})`);
    return { unitId: null, confidence: 0 };
  }

  const faceDesc =
    face === 'back'
      ? `This is the BACK (reverse) face of a unit counter. The back face shows:
- "COL" printed in red at the top (column formation indicator)
- The regiment's name printed below "COL"
- The unit's command chain below that: CORPS / DIVISION / BRIGADE`
      : army === 'confederate'
        ? `This is the FRONT (obverse) face of a CONFEDERATE unit counter. Confederate fronts show:
- Regiment name at the top (e.g. "6 GA", "27 NC", "6 ALA")
- Below the name: brigade/division abbreviation (e.g. "C/DH" = Colquitt's brigade, D.H. Hill's division)
- A state or Confederate flag background (grey/tan tones)
- Line formation symbol in the centre
- Bottom-left: weapon type (R=rifle, SR=short rifle, M=musket, C=cavalry) and strength points
- Bottom-right: morale rating (A, B, C, or D)
Confederate leader fronts show the leader's name, initiative rating, and command level.`
        : army === 'union'
          ? `This is the FRONT (obverse) face of a UNION unit counter. Union fronts show:
- Regiment name at the top (e.g. "22 NY", "3 ME", "B 4 US" for artillery)
- Below the name: brigade / division / corps chain
- A US state flag or national flag background (blue tones)
- Line formation symbol in the centre
- Bottom-left: weapon type and strength points
- Bottom-right: morale rating (A, B, C, or D)
Union leader fronts show the leader's name, initiative rating, and command level.`
          : `This is the FRONT (obverse) face of a counter (army unknown).
- Regiment name at top; command chain below
- Bottom-left: weapon type and strength points; bottom-right: morale rating`;

  const systemPrompt = `You are a wargame counter identification assistant for the South Mountain
scenario of Line of Battle v2.0. Identify which unit or leader the counter image belongs to by
reading the printed text and insignia carefully.

${faceDesc}

Respond ONLY with valid JSON (no markdown, no code fences, no explanation):
{"unitId":"<id from the roster, or null>","confidence":<0.0 to 1.0>}

Rules:
- unitId must exactly match an id from the provided roster, or be null
- confidence: how certain you are (0.0 = no idea, 1.0 = certain)
- If the image is a supply wagon, supply train, blank counter, or HQ marker, set unitId to null
- Use ALL available text — regiment name, state abbreviation, weapon type, strength points,
  morale rating, and command chain — to resolve ambiguities between similarly-named units
- For Confederate counters the brigade/division code (e.g. "C/DH") maps directly to the
  command chain shown in the roster`;

  const userPrompt = `Identify this counter (${face} face, ${army ?? 'army unknown'}). Match it to an entry in the roster below.\n\n${roster}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 128,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: userPrompt },
        ],
      },
    ],
  });

  const raw = response.content[0]?.text?.trim() ?? '';
  // Extract the first well-formed JSON object, handling nested braces and trailing prose.
  // Falls back to markdown fence stripping when no JSON object is found.
  const jsonText = extractFirstJson(raw);
  const text = jsonText
    ? jsonText
    : raw
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
 * Write filename + confidence into the correct face field of counterRef.
 * Skips if the field is already set and FORCE is false (idempotency).
 *
 * Returns true if written, false if skipped.
 */
export function writeCounterRef(record, recordType, face, filename, confidence, force = false) {
  if (record.counterRef === null || record.counterRef === undefined) {
    record.counterRef =
      recordType === 'leader'
        ? {
            front: null,
            frontConfidence: null,
            back: null,
            backConfidence: null,
            promotedFront: null,
            promotedFrontConfidence: null,
            promotedBack: null,
            promotedBackConfidence: null,
          }
        : { front: null, frontConfidence: null, back: null, backConfidence: null };
  }

  const confKey = face + 'Confidence';
  if (!Object.prototype.hasOwnProperty.call(record.counterRef, face)) {
    console.warn(`  [warn] Face "${face}" not valid for record type "${recordType}" — skipping`);
    return false;
  }

  if (record.counterRef[face] !== null && !force) {
    return false; // already set, skip
  }

  record.counterRef[face] = filename;
  record.counterRef[confKey] = confidence;
  return true;
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
  if (FORCE) console.log('[detect-counters] FORCE — existing counterRefs will be overwritten');
  console.log(`[detect-counters] Confidence threshold: ${CONFIDENCE_THRESHOLD}`);

  const oob = loadJSON(OOB_PATH);
  const leaders = loadJSON(LEADERS_PATH);
  const oobMap = collectOOBRecords(oob);
  const leaderMap = collectLeaderRecords(leaders);

  const client = new Anthropic();
  const results = [];

  for (const filename of imageFiles) {
    const imagePath = join(COUNTERS_DIR, filename);
    // Guard against path traversal (defensive; readdirSync returns direct children only)
    if (!imagePath.startsWith(COUNTERS_DIR + '/') && imagePath !== COUNTERS_DIR) {
      console.warn(`[detect-counters] Skipping suspicious filename: ${filename}`);
      continue;
    }
    let { army, face } = classifyImage(filename);

    // For CS1-* files where army is not in filename, detect from color
    if (army === null) {
      try {
        army = await detectArmyByColor(client, imagePath);
      } catch (err) {
        console.warn(`  [warn] Color detection failed for ${filename}: ${err.message}`);
      }
    }

    const roster = buildRoster(oobMap, leaderMap, army);

    process.stdout.write(
      `  [${results.length + 1}/${imageFiles.length}] ${filename} (${face}, ${army ?? 'unknown'}) ... `
    );

    let identification;
    try {
      identification = await identifyCounter(client, imagePath, face, army, roster);
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      results.push({
        filename,
        face,
        army,
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
        if (!DRY_RUN) {
          const written = writeCounterRef(record, type, face, filename, confidence, FORCE);
          status = written ? 'matched' : 'skipped';
        } else {
          status = 'matched (dry-run)';
        }
      } else {
        status = 'id-not-found';
      }
    }

    console.log(`${unitId ?? 'null'} conf=${confidence.toFixed(2)} → ${status}`);
    results.push({ filename, face, army, unitId, confidence, status });
  }

  // Save updated data files
  if (!DRY_RUN) {
    saveJSON(OOB_PATH, oob);
    saveJSON(LEADERS_PATH, leaders);
    console.log('\n[detect-counters] Saved oob.json and leaders.json');
  }

  // Summary report
  const matched = results.filter((r) => r.status === 'matched').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const dryMatched = results.filter((r) => r.status === 'matched (dry-run)').length;
  const unmatched = results.filter((r) => r.status === 'unmatched').length;
  const idNotFound = results.filter((r) => r.status === 'id-not-found').length;
  const errors = results.filter((r) => r.status === 'error').length;

  console.log('\n========== SUMMARY ==========');
  console.log(`Total images:              ${imageFiles.length}`);
  if (DRY_RUN) {
    console.log(`Would match (high-conf):   ${dryMatched}`);
  } else {
    console.log(`Matched (written):         ${matched}`);
    console.log(`Skipped (already set):     ${skipped}`);
  }
  console.log(`No unit ID returned:       ${unmatched}`);
  console.log(`ID not in roster:          ${idNotFound}`);
  console.log(`Errors:                    ${errors}`);
  console.log('\nPer-image results:');
  console.log(
    '  filename                        | face  | army         | unitId              | conf  | status'
  );
  console.log('  ' + '-'.repeat(100));
  for (const r of results) {
    const fn = r.filename.padEnd(32);
    const f = r.face.padEnd(5);
    const a = (r.army ?? 'unknown').padEnd(12);
    const uid = (r.unitId ?? 'null').padEnd(20);
    const c = r.confidence.toFixed(2).padStart(5);
    console.log(`  ${fn}| ${f} | ${a} | ${uid}| ${c} | ${r.status}`);
  }
  console.log('==============================');
}

// Only auto-run when invoked directly (not when imported by tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('[detect-counters] Fatal error:', err);
    process.exit(1);
  });
}
