import { describe, it, expect } from 'vitest';

import {
  WorkflowDefinitionSchema,
  StepDefSchema,
  GateDefSchema,
  WorkflowInstanceSchema,
  AgentManifestSchema,
} from './schemas.js';

// ────────────────────────────────────────────────────────────
// AgentManifest
// ────────────────────────────────────────────────────────────

describe('AgentManifestSchema', () => {
  it('parses a valid manifest', () => {
    const result = AgentManifestSchema.safeParse({
      id: 'devops',
      name: 'DevOps Agent',
      description: 'Builds things',
      type: 'agent',
      path: '.claude/agents/devops.md',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = AgentManifestSchema.safeParse({ id: 'x' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown type', () => {
    const result = AgentManifestSchema.safeParse({
      id: 'x',
      name: 'X',
      description: 'X',
      type: 'webhook',
    });
    expect(result.success).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────
// GateDef
// ────────────────────────────────────────────────────────────

describe('GateDefSchema', () => {
  it('parses a valid gate', () => {
    const result = GateDefSchema.safeParse({
      prompt: 'Review the spec. Approve or revise?',
      choices: [
        { label: 'Approve', value: 'approve', onChoice: { nextStep: null } },
        { label: 'Revise', value: 'revise', onChoice: { nextStep: 'draft-spec' } },
      ],
      defaultChoice: 'approve',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty choices array', () => {
    const result = GateDefSchema.safeParse({ prompt: 'Go?', choices: [] });
    expect(result.success).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────
// StepDef
// ────────────────────────────────────────────────────────────

describe('StepDefSchema', () => {
  it('parses an agent step with inputMap', () => {
    const result = StepDefSchema.safeParse({
      id: 'generate-code',
      name: 'Generate Code',
      agentId: 'devops',
      inputMap: { spec: '$.draft-spec.output' },
      onError: 'halt',
    });
    expect(result.success).toBe(true);
    expect(result.data.inputMap).toEqual({ spec: '$.draft-spec.output' });
  });

  it('parses a gate step (agentId null)', () => {
    const result = StepDefSchema.safeParse({
      id: 'gate-spec',
      name: 'Gate: Spec Review',
      agentId: null,
      gateConfig: {
        prompt: 'Approve spec?',
        choices: [{ label: 'Yes', value: 'yes', onChoice: { nextStep: null } }],
      },
    });
    expect(result.success).toBe(true);
  });

  it('defaults onError to halt', () => {
    const result = StepDefSchema.safeParse({
      id: 'step-a',
      name: 'Step A',
      agentId: 'devops',
    });
    expect(result.success).toBe(true);
    expect(result.data.onError).toBe('halt');
  });

  it('rejects unknown onError value', () => {
    const result = StepDefSchema.safeParse({
      id: 'step-a',
      name: 'Step A',
      agentId: 'devops',
      onError: 'ignore',
    });
    expect(result.success).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────
// WorkflowDefinition
// ────────────────────────────────────────────────────────────

const VALID_DEFINITION = {
  id: 'test-workflow',
  name: 'Test Workflow',
  description: 'A test workflow',
  steps: [
    {
      id: 'step-a',
      name: 'Step A',
      agentId: 'devops',
    },
    {
      id: 'gate-a',
      name: 'Gate A',
      agentId: null,
      gateConfig: {
        prompt: 'Proceed?',
        choices: [
          { label: 'Yes', value: 'yes', onChoice: { nextStep: null } },
          { label: 'Retry', value: 'retry', onChoice: { nextStep: 'step-a' } },
        ],
      },
    },
    {
      id: 'step-b',
      name: 'Step B',
      agentId: 'devops',
      inputMap: { prev: '$.step-a.result' },
    },
  ],
};

describe('WorkflowDefinitionSchema', () => {
  it('parses a valid workflow definition', () => {
    const result = WorkflowDefinitionSchema.safeParse(VALID_DEFINITION);
    expect(result.success).toBe(true);
    expect(result.data.steps).toHaveLength(3);
  });

  it('rejects a definition with no steps', () => {
    const result = WorkflowDefinitionSchema.safeParse({ ...VALID_DEFINITION, steps: [] });
    expect(result.success).toBe(false);
  });

  it('rejects a gate step missing gateConfig', () => {
    const result = WorkflowDefinitionSchema.safeParse({
      ...VALID_DEFINITION,
      steps: [{ id: 'bad-gate', name: 'Bad Gate', agentId: null }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing required top-level fields', () => {
    const result = WorkflowDefinitionSchema.safeParse({ id: 'x', steps: [] });
    expect(result.success).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────
// WorkflowInstance
// ────────────────────────────────────────────────────────────

describe('WorkflowInstanceSchema', () => {
  it('parses a valid instance', () => {
    const result = WorkflowInstanceSchema.safeParse({
      workflowId: 'test-workflow',
      runId: 'run-001',
      status: 'running',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStep: 'step-a',
    });
    expect(result.success).toBe(true);
    expect(result.data.stepResults).toEqual({});
    expect(result.data.gateDecisions).toEqual([]);
  });

  it('rejects an invalid status', () => {
    const result = WorkflowInstanceSchema.safeParse({
      workflowId: 'x',
      runId: 'r',
      status: 'pending',
      startedAt: '',
      updatedAt: '',
      currentStep: null,
    });
    expect(result.success).toBe(false);
  });
});
