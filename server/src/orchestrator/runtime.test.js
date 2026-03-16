import { mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { _resetCache } from './registry.js';
import { resolveJsonPath, buildStepInput, runWorkflow } from './runtime.js';

// ────────────────────────────────────────────────────────────
// JSONPath helpers
// ────────────────────────────────────────────────────────────

describe('resolveJsonPath', () => {
  const results = {
    'step-a': { output: 'hello', nested: { value: 42 } },
    'step-b': { list: [1, 2, 3] },
  };

  it('resolves a top-level step result', () => {
    expect(resolveJsonPath('$.step-a', results)).toEqual(results['step-a']);
  });

  it('resolves a nested field', () => {
    expect(resolveJsonPath('$.step-a.output', results)).toBe('hello');
  });

  it('resolves a deeply nested field', () => {
    expect(resolveJsonPath('$.step-a.nested.value', results)).toBe(42);
  });

  it('returns undefined for missing path', () => {
    expect(resolveJsonPath('$.step-a.missing', results)).toBeUndefined();
  });

  it('throws for expressions not starting with $.', () => {
    expect(() => resolveJsonPath('step-a.output', results)).toThrow(/must start with/);
  });
});

describe('buildStepInput', () => {
  it('resolves multiple inputMap entries', () => {
    const stepResults = {
      'draft-spec': { text: 'spec content' },
      'review-code': { approved: true },
    };
    const inputMap = {
      spec: '$.draft-spec.text',
      approved: '$.review-code.approved',
    };
    expect(buildStepInput(inputMap, stepResults)).toEqual({
      spec: 'spec content',
      approved: true,
    });
  });

  it('returns empty object for empty inputMap', () => {
    expect(buildStepInput({}, {})).toEqual({});
  });
});

// ────────────────────────────────────────────────────────────
// runWorkflow
// ────────────────────────────────────────────────────────────

function makeTmpAilogDir() {
  const dir = join(tmpdir(), `lob-ailog-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

// Minimal registry entry needed by resolveAgent
vi.mock('./registry.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    resolveAgent: vi.fn(() => ({
      id: 'test-agent',
      name: 'Test',
      description: 'Test',
      type: 'agent',
    })),
    _resetCache: original._resetCache,
  };
});

const BASE_DEFINITION = {
  id: 'test-wf',
  name: 'Test Workflow',
  description: 'Unit test workflow',
  steps: [
    { id: 'step-a', name: 'Step A', agentId: 'test-agent' },
    { id: 'step-b', name: 'Step B', agentId: 'test-agent', inputMap: { prev: '$.step-a.result' } },
  ],
};

describe('runWorkflow', () => {
  let ailogDir;

  beforeEach(() => {
    ailogDir = makeTmpAilogDir();
    _resetCache();
  });

  afterEach(() => {
    rmSync(ailogDir, { recursive: true, force: true });
  });

  it('executes two steps in declaration order', async () => {
    const calls = [];
    const dispatch = vi.fn(async (agentId, input) => {
      calls.push({ agentId, input });
      return { result: `output-${calls.length}` };
    });

    const instance = await runWorkflow({
      definition: BASE_DEFINITION,
      runId: '2026_03_16-LOB-0001',
      dispatch,
      ailogDir,
    });

    expect(calls[0].agentId).toBe('test-agent');
    expect(calls[1].agentId).toBe('test-agent');
    expect(instance.status).toBe('completed');
    expect(instance.stepResults['step-a']).toEqual({ result: 'output-1' });
    expect(instance.stepResults['step-b']).toEqual({ result: 'output-2' });
  });

  it('resolves inputMap from prior step output', async () => {
    // step-a returns { result: 'output-1' }; step-b's inputMap maps prev → $.step-a.result
    let callCount = 0;
    const dispatch = vi.fn(async () => {
      callCount++;
      return { result: `output-${callCount}` };
    });

    await runWorkflow({
      definition: BASE_DEFINITION,
      runId: '2026_03_16-LOB-0001',
      dispatch,
      ailogDir,
    });

    // step-b's dispatch input should have prev resolved from step-a's result field
    expect(dispatch.mock.calls[1][1]).toEqual({ prev: 'output-1' });
  });

  it('gate step pauses and resumes on mock gate handler', async () => {
    const definition = {
      id: 'gate-wf',
      name: 'Gate Workflow',
      description: 'Has a gate',
      steps: [
        { id: 'step-a', name: 'Step A', agentId: 'test-agent' },
        {
          id: 'gate-1',
          name: 'Gate 1',
          agentId: null,
          gateConfig: {
            prompt: 'Proceed?',
            choices: [
              { label: 'Yes', value: 'yes', onChoice: { nextStep: null } },
              { label: 'Retry', value: 'retry', onChoice: { nextStep: 'step-a' } },
            ],
          },
        },
        { id: 'step-b', name: 'Step B', agentId: 'test-agent' },
      ],
    };

    const gateHandler = vi.fn(async () => ({ choice: 'yes', note: 'looks good', nextStep: null }));
    const dispatch = vi.fn(async () => ({ ok: true }));

    const instance = await runWorkflow({
      definition,
      runId: '2026_03_16-LOB-0001',
      dispatch,
      gateHandler,
      ailogDir,
    });

    expect(gateHandler).toHaveBeenCalledOnce();
    expect(gateHandler.mock.calls[0][1]).toBe('gate-1');
    expect(instance.gateDecisions).toHaveLength(1);
    expect(instance.gateDecisions[0].choice).toBe('yes');
    expect(instance.gateDecisions[0].note).toBe('looks good');
    expect(instance.status).toBe('completed');
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it('loop-back choice re-queues the target step', async () => {
    const definition = {
      id: 'loop-wf',
      name: 'Loop Workflow',
      description: 'Tests loop-back',
      steps: [
        { id: 'step-a', name: 'Step A', agentId: 'test-agent' },
        {
          id: 'gate-1',
          name: 'Gate 1',
          agentId: null,
          gateConfig: {
            prompt: 'Go?',
            choices: [
              { label: 'Yes', value: 'yes', onChoice: { nextStep: null } },
              { label: 'Redo', value: 'redo', onChoice: { nextStep: 'step-a' } },
            ],
          },
        },
        { id: 'step-b', name: 'Step B', agentId: 'test-agent' },
      ],
    };

    // First gate call → redo (loop back to step-a); second → yes (proceed)
    let gateCallCount = 0;
    const gateHandler = vi.fn(async () => {
      gateCallCount++;
      if (gateCallCount === 1) return { choice: 'redo', note: '', nextStep: 'step-a' };
      return { choice: 'yes', note: '', nextStep: null };
    });
    const dispatch = vi.fn(async () => ({ ok: true }));

    const instance = await runWorkflow({
      definition,
      runId: '2026_03_16-LOB-0001',
      dispatch,
      gateHandler,
      ailogDir,
    });

    // step-a runs twice (initial + loop-back), step-b once
    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(instance.gateDecisions).toHaveLength(2);
    expect(instance.gateDecisions[0].choice).toBe('redo');
    expect(instance.gateDecisions[1].choice).toBe('yes');
    expect(instance.status).toBe('completed');
  });

  it('onError: halt stops execution and sets status failed', async () => {
    const definition = {
      id: 'err-wf',
      name: 'Error Workflow',
      description: 'Tests error halting',
      steps: [
        { id: 'step-a', name: 'Step A', agentId: 'test-agent', onError: 'halt' },
        { id: 'step-b', name: 'Step B', agentId: 'test-agent' },
      ],
    };

    const dispatch = vi.fn(async () => {
      throw new Error('something broke');
    });

    await expect(
      runWorkflow({ definition, runId: '2026_03_16-LOB-0001', dispatch, ailogDir })
    ).rejects.toThrow('something broke');

    // Read the persisted instance to verify failed status
    const files = (await import('fs')).readdirSync(ailogDir);
    const instanceFile = files.find((f) => f.endsWith('-instance.json'));
    const persisted = JSON.parse(readFileSync(join(ailogDir, instanceFile), 'utf8'));
    expect(persisted.status).toBe('failed');
    expect(persisted.stepResults['step-a']).toEqual({ error: 'something broke' });
  });

  it('onError: continue_with_warning does not halt execution', async () => {
    const definition = {
      id: 'warn-wf',
      name: 'Warning Workflow',
      description: 'Tests continue_with_warning',
      steps: [
        { id: 'step-a', name: 'Step A', agentId: 'test-agent', onError: 'continue_with_warning' },
        { id: 'step-b', name: 'Step B', agentId: 'test-agent' },
      ],
    };

    let callCount = 0;
    const dispatch = vi.fn(async () => {
      callCount++;
      if (callCount === 1) throw new Error('transient');
      return { ok: true };
    });

    const instance = await runWorkflow({
      definition,
      runId: '2026_03_16-LOB-0001',
      dispatch,
      ailogDir,
    });

    expect(instance.status).toBe('completed');
    expect(instance.stepResults['step-a']).toEqual({ warning: 'transient' });
    expect(instance.stepResults['step-b']).toEqual({ ok: true });
  });

  it('persists WorkflowInstance JSON to ailogDir', async () => {
    const dispatch = vi.fn(async () => ({ done: true }));

    await runWorkflow({
      definition: BASE_DEFINITION,
      runId: '2026_03_16-LOB-0099',
      dispatch,
      ailogDir,
    });

    const files = (await import('fs')).readdirSync(ailogDir);
    expect(files).toContain('2026_03_16-LOB-0099-instance.json');

    const content = JSON.parse(
      readFileSync(join(ailogDir, '2026_03_16-LOB-0099-instance.json'), 'utf8')
    );
    expect(content.workflowId).toBe('test-wf');
    expect(content.status).toBe('completed');
  });

  it('gate handler that throws sets status to failed and rethrows', async () => {
    const definition = {
      id: 'gate-throw-wf',
      name: 'Gate Throw Workflow',
      description: 'Tests gate handler error',
      steps: [
        { id: 'step-a', name: 'Step A', agentId: 'test-agent' },
        {
          id: 'gate-1',
          name: 'Gate 1',
          agentId: null,
          gateConfig: {
            prompt: 'Proceed?',
            choices: [{ label: 'Yes', value: 'yes', onChoice: { nextStep: null } }],
          },
        },
      ],
    };

    const gateHandler = vi.fn(async () => {
      throw new Error('gate handler failed');
    });
    const dispatch = vi.fn(async () => ({ ok: true }));

    await expect(
      runWorkflow({ definition, runId: '2026_03_16-LOB-9001', dispatch, gateHandler, ailogDir })
    ).rejects.toThrow('gate handler failed');

    const files = (await import('fs')).readdirSync(ailogDir);
    const instanceFile = files.find((f) => f.includes('9001'));
    const persisted = JSON.parse(readFileSync(join(ailogDir, instanceFile), 'utf8'));
    expect(persisted.status).toBe('failed');
  });

  it('throws for loop-back nextStep that does not exist', async () => {
    const definition = {
      id: 'bad-loop-wf',
      name: 'Bad Loop Workflow',
      description: 'Tests invalid loop-back target',
      steps: [
        {
          id: 'gate-1',
          name: 'Gate 1',
          agentId: null,
          gateConfig: {
            prompt: 'Go?',
            choices: [{ label: 'Bad', value: 'bad', onChoice: { nextStep: 'nonexistent' } }],
          },
        },
      ],
    };

    const gateHandler = vi.fn(async () => ({
      choice: 'bad',
      note: '',
      nextStep: 'nonexistent',
    }));

    await expect(
      runWorkflow({ definition, runId: '2026_03_16-LOB-9002', dispatch: vi.fn(), gateHandler, ailogDir })
    ).rejects.toThrow(/not found in workflow/);
  });
});
