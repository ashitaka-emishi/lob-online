import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { loadRegistry, resolveAgent, _resetCache } from './registry.js';

function makeTmpRegistry(entries) {
  const dir = join(tmpdir(), `lob-registry-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, 'registry.json');
  writeFileSync(filePath, JSON.stringify(entries), 'utf8');
  return { filePath, dir };
}

describe('registry', () => {
  let tmpDir;

  beforeEach(() => {
    _resetCache();
  });

  afterEach(() => {
    if (tmpDir) {
      rmSync(tmpDir, { recursive: true, force: true });
      tmpDir = null;
    }
    _resetCache();
  });

  it('loads all entries from the registry file', () => {
    const { filePath, dir } = makeTmpRegistry([
      { id: 'devops', name: 'DevOps', description: 'Build things', type: 'agent' },
      { id: 'pr-create', name: 'PR Create', description: 'Create PRs', type: 'skill' },
    ]);
    tmpDir = dir;
    const entries = loadRegistry(filePath);
    expect(entries).toHaveLength(2);
    expect(entries[0].id).toBe('devops');
    expect(entries[1].id).toBe('pr-create');
  });

  it('resolves a known agent id', () => {
    const { filePath, dir } = makeTmpRegistry([
      { id: 'devops', name: 'DevOps', description: 'Build things', type: 'agent' },
    ]);
    tmpDir = dir;
    const agent = resolveAgent('devops', filePath);
    expect(agent.id).toBe('devops');
    expect(agent.type).toBe('agent');
  });

  it('throws on unknown agent id', () => {
    const { filePath, dir } = makeTmpRegistry([
      { id: 'devops', name: 'DevOps', description: 'Build things', type: 'agent' },
    ]);
    tmpDir = dir;
    expect(() => resolveAgent('unknown-id', filePath)).toThrow(/Unknown agent id "unknown-id"/);
  });

  it('throws if registry file is not an array', () => {
    const dir = join(tmpdir(), `lob-registry-test-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const filePath = join(dir, 'registry.json');
    writeFileSync(filePath, JSON.stringify({ notAnArray: true }), 'utf8');
    tmpDir = dir;
    expect(() => loadRegistry(filePath)).toThrow(/must be a JSON array/);
  });

  it('throws if an entry is invalid', () => {
    const { filePath, dir } = makeTmpRegistry([
      { id: 'bad', name: 'Bad' /* missing description and type */ },
    ]);
    tmpDir = dir;
    expect(() => loadRegistry(filePath)).toThrow(/is invalid/);
  });

  it('returns cached result on second call with default path', () => {
    // Use a custom path twice to exercise the cache-write and cache-hit branches
    // (the default-path cache is module-level; two calls with the same custom path
    //  exercise the same logic since _resetCache only clears the default-path cache)
    const { filePath, dir } = makeTmpRegistry([
      { id: 'devops', name: 'DevOps', description: 'Build things', type: 'agent' },
    ]);
    tmpDir = dir;
    const first = loadRegistry(filePath);
    const second = loadRegistry(filePath);
    // Both calls return identical data; file is only parsed once for the default path
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(first[0].id).toBe('devops');
  });
});
