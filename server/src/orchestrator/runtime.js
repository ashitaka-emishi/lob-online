import { createInterface } from 'readline';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

import { WorkflowDefinitionSchema } from './schemas.js';
import { resolveAgent } from './registry.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const AILOG_DIR = join(__dirname, '../../../../docs/ailog');

// ────────────────────────────────────────────────────────────
// JSONPath resolver (subset: $.stepId.field.subfield)
// ────────────────────────────────────────────────────────────

/**
 * Resolve a simple JSONPath expression against the stepResults map.
 * Supported syntax: `$.stepId` or `$.stepId.field.subfield`.
 *
 * @param {string} expression
 * @param {Record<string, unknown>} stepResults
 * @returns {unknown}
 */
export function resolveJsonPath(expression, stepResults) {
  if (!expression.startsWith('$.')) {
    throw new Error(`Invalid JSONPath expression "${expression}": must start with "$."`);
  }
  const parts = expression.slice(2).split('.');
  let value = stepResults;
  for (const part of parts) {
    if (value === undefined || value === null || typeof value !== 'object') {
      return undefined;
    }
    value = value[part];
  }
  return value;
}

/**
 * Build the resolved input object for a step by applying its inputMap expressions.
 *
 * @param {Record<string, string>} inputMap
 * @param {Record<string, unknown>} stepResults
 * @returns {Record<string, unknown>}
 */
export function buildStepInput(inputMap, stepResults) {
  const resolved = {};
  for (const [key, expression] of Object.entries(inputMap)) {
    resolved[key] = resolveJsonPath(expression, stepResults);
  }
  return resolved;
}

// ────────────────────────────────────────────────────────────
// Gate (human control point)
// ────────────────────────────────────────────────────────────

/**
 * Present a gate checkpoint to the human via readline and return the chosen value.
 * The `io` parameter is injected for testability.
 *
 * @param {import('./schemas.js').GateDef} gateConfig
 * @param {string} gateId
 * @param {object} [io] - injectable readline interface (or null to use stdin/stdout)
 * @returns {Promise<{choice: string, note: string}>}
 */
export async function presentGate(gateConfig, gateId, io = null) {
  const rl =
    io ||
    createInterface({
      input: process.stdin,
      output: process.stdout,
    });

  const ask = (q) =>
    new Promise((resolve) => {
      rl.question(q, (answer) => resolve(answer.trim()));
    });

  const defaultHint = gateConfig.defaultChoice ? ` [default: ${gateConfig.defaultChoice}]` : '';
  const choiceList = gateConfig.choices
    .map((c, i) => `  ${i + 1}. ${c.label} (${c.value})`)
    .join('\n');

  console.log(`\n─── Gate: ${gateId} ────────────────────────────────`);
  console.log(gateConfig.prompt);
  console.log('\nChoices:');
  console.log(choiceList);

  let chosen;
  while (!chosen) {
    const raw = await ask(`\nEnter choice value${defaultHint}: `);
    const input = raw || gateConfig.defaultChoice;
    const match = gateConfig.choices.find((c) => c.value === input);
    if (match) {
      chosen = match;
    } else {
      console.log(
        `Invalid choice "${input}". Valid values: ${gateConfig.choices.map((c) => c.value).join(', ')}`
      );
    }
  }

  const note = await ask('Optional note (press Enter to skip): ');

  if (!io) rl.close();

  return { choice: chosen.value, note, nextStep: chosen.onChoice.nextStep };
}

// ────────────────────────────────────────────────────────────
// Instance persistence
// ────────────────────────────────────────────────────────────

/**
 * Persist a WorkflowInstance JSON to docs/ailog/.
 *
 * @param {object} instance
 * @param {string} runId - format YYYY_MM_DD-LOB-{####}
 * @param {string} [ailogDir]
 */
export function persistInstance(instance, runId, ailogDir = AILOG_DIR) {
  mkdirSync(ailogDir, { recursive: true });
  const filename = `${runId}-instance.json`;
  const filepath = join(ailogDir, filename);
  writeFileSync(filepath, JSON.stringify(instance, null, 2) + '\n', 'utf8');
  return filepath;
}

// ────────────────────────────────────────────────────────────
// Runtime
// ────────────────────────────────────────────────────────────

/**
 * Execute a workflow definition.
 *
 * @param {object} options
 * @param {import('./schemas.js').WorkflowDefinition} options.definition - validated workflow
 * @param {string} options.runId - e.g. "2026_03_16-LOB-0032"
 * @param {Function} options.dispatch - async (agentId, input) => output; called for non-gate steps
 * @param {Function} [options.gateHandler] - async (gateConfig, gateId) => {choice, note, nextStep}
 * @param {string} [options.ailogDir]
 * @param {object} [options.initialState] - pre-populated stepResults
 * @returns {Promise<WorkflowInstance>}
 */
export async function runWorkflow({
  definition,
  runId = randomUUID(),
  dispatch,
  gateHandler = null,
  ailogDir = AILOG_DIR,
  initialState = {},
}) {
  // Validate definition and apply defaults (inputMap: {}, onError: 'halt', etc.)
  const defResult = WorkflowDefinitionSchema.safeParse(definition);
  if (!defResult.success) {
    throw new Error(`Invalid workflow definition: ${defResult.error.message}`);
  }
  const def = defResult.data;

  const now = new Date().toISOString();
  const instance = {
    workflowId: def.id,
    runId,
    status: 'running',
    startedAt: now,
    updatedAt: now,
    stepResults: { ...initialState },
    gateDecisions: [],
    currentStep: null,
  };

  const stepMap = new Map(def.steps.map((s) => [s.id, s]));
  const stepOrder = def.steps.map((s) => s.id);

  let stepIndex = 0;

  while (stepIndex < stepOrder.length) {
    const stepId = stepOrder[stepIndex];
    const step = stepMap.get(stepId);
    instance.currentStep = stepId;
    instance.updatedAt = new Date().toISOString();

    if (step.agentId === null) {
      // ── Gate step ──────────────────────────────────────────
      instance.status = 'waiting_at_gate';

      const handler = gateHandler ?? ((gc, gid) => presentGate(gc, gid));
      let decision;
      try {
        decision = await handler(step.gateConfig, stepId);
      } catch (err) {
        instance.status = 'failed';
        instance.updatedAt = new Date().toISOString();
        persistInstance(instance, runId, ailogDir);
        throw err;
      }

      instance.gateDecisions.push({
        gateId: stepId,
        choice: decision.choice,
        note: decision.note ?? '',
        timestamp: new Date().toISOString(),
      });
      instance.status = 'running';

      // Loop-back routing
      if (decision.nextStep) {
        const targetIndex = stepOrder.indexOf(decision.nextStep);
        if (targetIndex === -1) {
          throw new Error(`Loop-back target step "${decision.nextStep}" not found in workflow`);
        }
        stepIndex = targetIndex;
      } else {
        stepIndex += 1;
      }
    } else {
      // ── Agent / skill step ─────────────────────────────────
      // Verify agent exists in registry (throws if unknown)
      resolveAgent(step.agentId);

      const resolvedInput = buildStepInput(step.inputMap, instance.stepResults);

      let output;
      try {
        output = await dispatch(step.agentId, resolvedInput, step);
      } catch (err) {
        if (step.onError === 'halt') {
          instance.status = 'failed';
          instance.stepResults[stepId] = { error: err.message };
          instance.updatedAt = new Date().toISOString();
          persistInstance(instance, runId, ailogDir);
          throw err;
        } else {
          // continue_with_warning
          console.warn(`[orchestrator] Step "${stepId}" failed (continuing): ${err.message}`);
          output = { warning: err.message };
        }
      }

      instance.stepResults[stepId] = output ?? null;
      instance.updatedAt = new Date().toISOString();
      stepIndex += 1;
    }

    persistInstance(instance, runId, ailogDir);
  }

  instance.status = 'completed';
  instance.currentStep = null;
  instance.updatedAt = new Date().toISOString();
  persistInstance(instance, runId, ailogDir);

  return instance;
}
