#!/usr/bin/env node
/**
 * detect-counters.js
 *
 * One-time developer script. Uses the Claude vision API to match counter images in
 * docs/reference/src-counters-sm/ to unit and leader records in oob.json / leaders.json.
 *
 * Behaviour:
 *   1. Read all images from SOURCE_DIR
 *   2. For each image call Claude vision API to identify the unit/leader shown
 *   3. Copy ALL images to DEST_DIR (idempotent — skips if already present)
 *   4. Write counterRef into data files for high-confidence matches (>= CONFIDENCE_THRESHOLD)
 *   5. Delete SOURCE_DIR after all images are copied
 *   6. Print summary report
 *
 * Usage:
 *   node scripts/detect-counters.js [--dry-run]
 *
 * Requires ANTHROPIC_API_KEY in environment.
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  copyFileSync,
  mkdirSync,
  rmSync,
} from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SOURCE_DIR = join(ROOT, 'docs/reference/src-counters-sm');
const DEST_DIR = join(ROOT, 'client/public/counters');
const OOB_PATH = join(ROOT, 'data/scenarios/south-mountain/oob.json');
const LEADERS_PATH = join(ROOT, 'data/scenarios/south-mountain/leaders.json');
const CONFIDENCE_THRESHOLD = 0.8;
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

const DRY_RUN = process.argv.includes('--dry-run');

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
 * Walk oob.json and collect all unit and battery records.
 * Returns Map<id, record> — record is mutated in-place when counterRef is written.
 */
function collectOOBRecords(oob) {
  const map = new Map();
  function walk(node) {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node !== 'object' || !node) return;
    if (node.weapon !== undefined || node.gunType !== undefined) {
      map.set(node.id, { record: node, type: 'unit' });
      return;
    }
    Object.values(node).forEach(walk);
  }
  walk(oob);
  return map;
}

/**
 * Walk leaders.json and collect all leader records.
 * Returns Map<id, record>.
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
 * Build a compact roster string to pass to Claude so it can choose an ID.
 */
function buildRoster(oobMap, leaderMap) {
  const lines = ['UNITS (id | name | type):'];
  for (const [id, { record }] of oobMap) {
    const t = record.gunType ? 'artillery' : record.type;
    lines.push(`  ${id} | ${record.name} | ${t}`);
  }
  lines.push('LEADERS (id | name | commandLevel):');
  for (const [id, { record }] of leaderMap) {
    lines.push(`  ${id} | ${record.name} | ${record.commandLevel}`);
  }
  return lines.join('\n');
}

/**
 * Call Claude vision API to identify the counter in the image.
 *
 * Returns { unitId: string|null, side: string, confidence: number }
 *   unitId — id from oob.json or leaders.json, or null if unrecognised
 *   side   — "front" | "back" | "promotedFront" | "promotedBack"
 *   confidence — 0..1
 */
async function identifyCounter(client, imagePath, roster) {
  const imageData = readFileSync(imagePath);
  const base64 = imageData.toString('base64');
  const ext = extname(imagePath).toLowerCase().replace('.', '');
  const mediaType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;

  const systemPrompt = `You are a wargame counter identification assistant. You will be shown a counter
image from the South Mountain scenario of Line of Battle v2.0. Your task is to identify which unit
or leader the counter belongs to by reading the text and insignia printed on it.

Respond ONLY with a JSON object (no markdown, no explanation) with exactly these fields:
{
  "unitId": "<id from the roster, or null if you cannot identify>",
  "side": "<front|back|promotedFront|promotedBack>",
  "confidence": <0.0 to 1.0>
}

Rules:
- "front" = normal obverse face (typically shows unit designation and strength)
- "back" = normal reverse face (typically shows reduced strength or morale/straggler info)
- "promotedFront" = leader promoted variant obverse (rare; only if explicitly a promoted leader counter)
- "promotedBack" = leader promoted variant reverse (rare)
- confidence should reflect how certain you are. Be strict: only use >= 0.80 if you are highly confident.
- If the image is blank, a supply wagon/train, or not a combat counter, set unitId to null.`;

  const userPrompt = `Identify this counter from the roster below.\n\n${roster}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
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

  const text = response.content[0]?.text?.trim() ?? '';
  try {
    const parsed = JSON.parse(text);
    return {
      unitId: parsed.unitId ?? null,
      side: parsed.side ?? 'front',
      confidence:
        typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0,
    };
  } catch {
    console.warn(`  [warn] Could not parse Claude response for ${imagePath}: ${text}`);
    return { unitId: null, side: 'front', confidence: 0 };
  }
}

// ---------------------------------------------------------------------------
// counterRef write helpers
// ---------------------------------------------------------------------------

/**
 * Write a filename into the correct counterRef slot on a record.
 * For unit records: { front, back }
 * For leader records: { front, back, promotedFront, promotedBack }
 */
function writeCounterRef(record, recordType, side, filename) {
  if (record.counterRef === null || record.counterRef === undefined) {
    if (recordType === 'leader') {
      record.counterRef = { front: null, back: null, promotedFront: null, promotedBack: null };
    } else {
      record.counterRef = { front: null, back: null };
    }
  }
  if (Object.prototype.hasOwnProperty.call(record.counterRef, side)) {
    record.counterRef[side] = filename;
  } else {
    console.warn(`  [warn] Side "${side}" is not valid for record type "${recordType}" — skipping`);
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

  if (!existsSync(SOURCE_DIR)) {
    console.error(`[detect-counters] Source directory not found: ${SOURCE_DIR}`);
    process.exit(1);
  }

  const imageFiles = readdirSync(SOURCE_DIR)
    .filter((f) => IMAGE_EXTS.has(extname(f).toLowerCase()))
    .sort();

  if (imageFiles.length === 0) {
    console.log('[detect-counters] No images found in source directory. Nothing to do.');
    return;
  }

  console.log(`[detect-counters] Found ${imageFiles.length} images in ${SOURCE_DIR}`);
  if (DRY_RUN) console.log('[detect-counters] DRY RUN — no files will be written');

  // Load data
  const oob = loadJSON(OOB_PATH);
  const leaders = loadJSON(LEADERS_PATH);
  const oobMap = collectOOBRecords(oob);
  const leaderMap = collectLeaderRecords(leaders);
  const roster = buildRoster(oobMap, leaderMap);

  const client = new Anthropic();

  // Ensure destination exists
  if (!DRY_RUN) {
    mkdirSync(DEST_DIR, { recursive: true });
  }

  // Results tracking
  const results = [];
  let copyCount = 0;
  let skipCopyCount = 0;

  for (const filename of imageFiles) {
    const srcPath = join(SOURCE_DIR, filename);
    const destPath = join(DEST_DIR, filename);

    // --- Copy (all images, regardless of confidence) ---
    const alreadyCopied = existsSync(destPath);
    if (!alreadyCopied) {
      if (!DRY_RUN) copyFileSync(srcPath, destPath);
      copyCount++;
    } else {
      skipCopyCount++;
    }

    // --- Identify via vision ---
    process.stdout.write(`  [${results.length + 1}/${imageFiles.length}] ${filename} ... `);
    let identification;
    try {
      identification = await identifyCounter(client, srcPath, roster);
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      results.push({
        filename,
        unitId: null,
        side: null,
        confidence: 0,
        status: 'error',
        error: err.message,
      });
      continue;
    }

    const { unitId, side, confidence } = identification;
    const highConf = confidence >= CONFIDENCE_THRESHOLD;

    // --- Write counterRef (high-confidence only, idempotent) ---
    let status = 'unmatched';
    if (unitId) {
      const entry = oobMap.get(unitId) ?? leaderMap.get(unitId);
      if (entry) {
        const { record, type } = entry;
        // Idempotency: skip if this slot is already filled
        const existingRef = record.counterRef;
        const alreadySet =
          existingRef !== null &&
          existingRef !== undefined &&
          existingRef[side] !== null &&
          existingRef[side] !== undefined;

        if (highConf && !alreadySet) {
          if (!DRY_RUN) writeCounterRef(record, type, side, filename);
          status = 'matched';
        } else if (alreadySet) {
          status = 'already-set';
        } else {
          status = 'low-confidence';
        }
      } else {
        status = 'id-not-found';
      }
    }

    console.log(`${unitId ?? 'null'} (${side}) conf=${confidence.toFixed(2)} → ${status}`);
    results.push({ filename, unitId, side, confidence, status });
  }

  // --- Save updated data files ---
  if (!DRY_RUN) {
    saveJSON(OOB_PATH, oob);
    saveJSON(LEADERS_PATH, leaders);
    console.log('\n[detect-counters] Updated oob.json and leaders.json');
  }

  // --- Delete source directory ---
  if (!DRY_RUN) {
    try {
      rmSync(SOURCE_DIR, { recursive: true, force: true });
      console.log(`[detect-counters] Deleted ${SOURCE_DIR}`);
    } catch (err) {
      console.warn(`[detect-counters] Could not delete source directory: ${err.message}`);
    }
  }

  // --- Summary report ---
  const matched = results.filter((r) => r.status === 'matched').length;
  const lowConf = results.filter((r) => r.status === 'low-confidence').length;
  const alreadySet = results.filter((r) => r.status === 'already-set').length;
  const unmatched = results.filter((r) => r.status === 'unmatched').length;
  const idNotFound = results.filter((r) => r.status === 'id-not-found').length;
  const errors = results.filter((r) => r.status === 'error').length;

  console.log('\n========== SUMMARY ==========');
  console.log(`Total images:         ${imageFiles.length}`);
  console.log(`Copied to dest:       ${copyCount} (${skipCopyCount} already present)`);
  console.log(`Matched (written):    ${matched}`);
  console.log(`Low confidence:       ${lowConf}`);
  console.log(`Already set:          ${alreadySet}`);
  console.log(`No unit ID returned:  ${unmatched}`);
  console.log(`ID not in data:       ${idNotFound}`);
  console.log(`Errors:               ${errors}`);
  console.log('\nPer-image results:');
  console.log(
    '  filename                        | unitId              | side           | conf  | status'
  );
  console.log('  ' + '-'.repeat(95));
  for (const r of results) {
    const fn = r.filename.padEnd(32);
    const uid = (r.unitId ?? 'null').padEnd(20);
    const s = (r.side ?? 'null').padEnd(15);
    const c = r.confidence.toFixed(2).padStart(5);
    console.log(`  ${fn}| ${uid}| ${s}| ${c} | ${r.status}`);
  }
  console.log('==============================');
}

main().catch((err) => {
  console.error('[detect-counters] Fatal error:', err);
  process.exit(1);
});
