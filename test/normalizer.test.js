import { describe, it, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Normalizer } from '../src/core/normalizer.js';
import { TestHarness } from './harness.js';

describe('Normalizer (NORM-001 - NORM-003)', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = TestHarness.createSandbox('agy-norm-test-');
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  it('NORM-001: parses simple and multiline YAML frontmatters', () => {
    const raw = `---
name: my-test-skill
description: This is a direct description with quotes "and" colons: here
---

# Instructions
Do something.`;

    const parsed = Normalizer.parseSkillFrontmatter(raw);
    assert.equal(parsed.name, 'my-test-skill');
    assert.match(parsed.description, /This is a direct description/);
  });

  it('NORM-002: sanitises raw frontmatters into YAML 1.2 block scalars (description: >-)', () => {
    const testFile = path.join(sandbox.tmpDir, 'SKILL.md');
    fs.writeFileSync(testFile, `---
name: unescaped-skill
description: "A description that previously caused YAML parser failures due to: quotes and dashes"
---

# Content`);

    Normalizer.normalizeSkillFile(testFile);
    const updated = fs.readFileSync(testFile, 'utf8');
    assert.ok(updated.includes('description: >-'), 'Should convert to YAML block scalar >-');
    assert.ok(updated.includes('unescaped-skill'), 'Should preserve skill name');
  });

  it('NORM-003: does not overwrite existing block scalars or dirty compliant files', () => {
    const testFile = path.join(sandbox.tmpDir, 'SKILL.md');
    const original = `---
name: clean-skill
description: >-
  Already clean description
---

# Content`;
    fs.writeFileSync(testFile, original);

    Normalizer.normalizeSkillFile(testFile);
    const after = fs.readFileSync(testFile, 'utf8');
    assert.equal(after, original, 'Compliant file must remain untouched');
  });

  it('NORM-004: classifies categories accurately', () => {
    assert.equal(Normalizer.normalizeCategory('orchestration'), 'orchestration');
    assert.equal(Normalizer.normalizeCategory('Design System'), 'design');
    assert.equal(Normalizer.normalizeCategory('Brand Voice & Writer'), 'content');
    assert.equal(Normalizer.normalizeCategory('FastMCP Tool'), 'mcp');
    assert.equal(Normalizer.normalizeCategory('Coding Rules'), 'rule');
    assert.equal(Normalizer.normalizeCategory('Productivity Boost'), 'productivity');
    assert.equal(Normalizer.normalizeCategory('Dev Pipeline'), 'development');
    assert.equal(Normalizer.normalizeCategory('unknown-category'), 'other');
  });
});
