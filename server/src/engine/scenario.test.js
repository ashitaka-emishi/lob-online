import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { describe, it, expect } from 'vitest';

import { loadScenario } from './scenario.js';

// ─── Happy path — real SM scenario file ───────────────────────────────────────

describe('loadScenario — South Mountain scenario', () => {
  it('loads and returns a frozen object', () => {
    const scenario = loadScenario();
    expect(scenario).toBeDefined();
    expect(Object.isFrozen(scenario)).toBe(true);
  });

  it('returns correct scenario id', () => {
    const scenario = loadScenario();
    expect(scenario.id).toBe('south-mountain');
  });

  it('exposes movementCosts with expected movement allowances', () => {
    const scenario = loadScenario();
    const { movementAllowances } = scenario.movementCosts;
    // LOB §3 — movement allowances per formation type
    expect(movementAllowances.line).toBe(6);
    expect(movementAllowances.column).toBe(6);
    expect(movementAllowances.mounted).toBe(12);
    expect(movementAllowances.leader).toBe(12);
  });

  it('exposes terrain costs from SM movement chart', () => {
    const scenario = loadScenario();
    const { terrainCosts } = scenario.movementCosts;
    // LOB §3 / SM movement chart — woods costs for line formation
    expect(terrainCosts.woods.line).toBe(2);
    // SM movement chart — clear terrain costs 1 for all formations
    expect(terrainCosts.clear.line).toBe(1);
    expect(terrainCosts.clear.mounted).toBe(1);
    // SM movement chart — slopingGround is prohibited for limbered
    expect(terrainCosts.slopingGround.limbered).toBeNull();
  });

  it('exposes rules flags including SM-specific overrides', () => {
    const scenario = loadScenario();
    // SM Override — trees grant +1 LOS height, not the standard +3
    expect(scenario.rules.treeLosHeight).toBeDefined();
    expect(scenario.rules.treeLosHeight).toBe(1);
  });

  it('exposes lightingSchedule', () => {
    const scenario = loadScenario();
    expect(Array.isArray(scenario.lightingSchedule)).toBe(true);
    expect(scenario.lightingSchedule.length).toBeGreaterThan(0);
    expect(scenario.lightingSchedule[0].condition).toBe('day');
  });

  it('exposes nightVisibilityCap', () => {
    const scenario = loadScenario();
    // SM scenario — night visibility is capped at 2 hex range
    expect(scenario.nightVisibilityCap).toBe(2);
  });

  it('exposes turnStructure', () => {
    const scenario = loadScenario();
    expect(scenario.turnStructure).toBeDefined();
    expect(scenario.turnStructure.totalTurns).toBeGreaterThan(0);
    expect(scenario.turnStructure.firstPlayer).toMatch(/^(union|confederate)$/);
  });

  it('exposes reinforcements with union and confederate arrays', () => {
    const scenario = loadScenario();
    expect(scenario.reinforcements).toBeDefined();
    expect(Array.isArray(scenario.reinforcements.union)).toBe(true);
    expect(Array.isArray(scenario.reinforcements.confederate)).toBe(true);
  });

  it('exposes setup with union and confederate arrays', () => {
    const scenario = loadScenario();
    expect(scenario.setup).toBeDefined();
    expect(Array.isArray(scenario.setup.union)).toBe(true);
    expect(Array.isArray(scenario.setup.confederate)).toBe(true);
  });
});

// ─── Error cases ──────────────────────────────────────────────────────────────

describe('loadScenario — error handling', () => {
  it('throws when file does not exist', () => {
    expect(() => loadScenario('/nonexistent/path/scenario.json')).toThrow(
      /failed to read scenario file/
    );
  });

  it('throws on invalid JSON', () => {
    const tmpPath = join(tmpdir(), `scenario-test-invalid-${Date.now()}.json`);
    writeFileSync(tmpPath, 'not valid json');
    try {
      expect(() => loadScenario(tmpPath)).toThrow(/failed to parse JSON/);
    } finally {
      unlinkSync(tmpPath);
    }
  });

  it('throws on JSON that fails Zod schema validation', () => {
    const tmpPath = join(tmpdir(), `scenario-test-malformed-${Date.now()}.json`);
    // Missing required fields (id, name, turnStructure, etc.)
    writeFileSync(tmpPath, JSON.stringify({ _status: 'draft', _source: 'test' }));
    try {
      expect(() => loadScenario(tmpPath)).toThrow(/schema validation/);
    } finally {
      unlinkSync(tmpPath);
    }
  });
});
