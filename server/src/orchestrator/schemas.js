import { z } from 'zod';

// ────────────────────────────────────────────────────────────
// AgentManifest
// ────────────────────────────────────────────────────────────

export const AgentManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['agent', 'skill']),
  path: z.string().optional(),
});

// ────────────────────────────────────────────────────────────
// GateDef
// ────────────────────────────────────────────────────────────

const ChoiceDefSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  onChoice: z.object({
    nextStep: z.string().nullable(),
  }),
});

export const GateDefSchema = z.object({
  prompt: z.string().min(1),
  choices: z.array(ChoiceDefSchema).min(1),
  defaultChoice: z.string().optional(),
});

// ────────────────────────────────────────────────────────────
// StepDef
// ────────────────────────────────────────────────────────────

export const StepDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** null signals a gate step (human control point) */
  agentId: z.string().nullable(),
  /** JSONPath expressions mapping input keys to prior step output values */
  inputMap: z.record(z.string(), z.string()).default({}),
  onError: z.enum(['halt', 'continue_with_warning']).default('halt'),
  /** Required when agentId is null */
  gateConfig: GateDefSchema.optional(),
});

// ────────────────────────────────────────────────────────────
// WorkflowDefinition
// ────────────────────────────────────────────────────────────

export const WorkflowDefinitionSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    steps: z.array(StepDefSchema).min(1),
  })
  .superRefine((def, ctx) => {
    for (const step of def.steps) {
      if (step.agentId === null && !step.gateConfig) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Step "${step.id}" has agentId: null but is missing gateConfig`,
          path: ['steps', def.steps.indexOf(step), 'gateConfig'],
        });
      }
    }
  });

// ────────────────────────────────────────────────────────────
// WorkflowInstance
// ────────────────────────────────────────────────────────────

const GateDecisionSchema = z.object({
  gateId: z.string(),
  choice: z.string(),
  note: z.string().default(''),
  timestamp: z.string(),
});

export const WorkflowInstanceSchema = z.object({
  workflowId: z.string(),
  runId: z.string(),
  status: z.enum(['running', 'completed', 'failed', 'waiting_at_gate']),
  startedAt: z.string(),
  updatedAt: z.string(),
  /** stepId → step output (any shape) */
  stepResults: z.record(z.string(), z.unknown()).default({}),
  gateDecisions: z.array(GateDecisionSchema).default([]),
  currentStep: z.string().nullable(),
});
