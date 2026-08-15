import { describe, it, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Doctor } from '../src/core/doctor.js';
import { TestHarness } from './harness.js';

describe('Doctor Diagnostics & Auto-Repair (DOC-001 - DOC-003)', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = TestHarness.createSandbox('agy-doc-test-');
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  it('DOC-001: detects broken symlinks and removes them on auto-fix', () => {
    const brokenLink = path.join(sandbox.geminiConfigPlugins, 'broken-plugin');
    fs.symlinkSync('/non/existent/path/to/plugin', brokenLink);

    let diags = Doctor.runDiagnostics();
    const brokenDiag = diags.find((d) => d.id === 'broken-symlink-broken-plugin');
    assert.ok(brokenDiag, 'Should flag broken symlink');
    assert.equal(brokenDiag.canAutoFix, true);

    const fixRes = Doctor.applyAutoFix(brokenDiag);
    assert.equal(fixRes.success, true);
    assert.equal(fs.existsSync(brokenLink), false, 'Broken symlink must be removed');
  });

  it('DOC-002: detects missing manifest in directories and generates plugin.json', () => {
    const pluginDir = path.join(sandbox.geminiConfigPlugins, 'missing-manifest-dir');
    fs.mkdirSync(pluginDir, { recursive: true });

    let diags = Doctor.runDiagnostics();
    const manifestDiag = diags.find((d) => d.id === 'missing-manifest-missing-manifest-dir');
    assert.ok(manifestDiag, 'Should flag missing manifest');
    assert.equal(manifestDiag.canAutoFix, true);

    const fixRes = Doctor.applyAutoFix(manifestDiag);
    assert.equal(fixRes.success, true);
    assert.ok(fs.existsSync(path.join(pluginDir, 'plugin.json')), 'plugin.json must be generated');
  });

  it('DOC-003: fixAll() resolves all auto-repairable issues in a single pass', () => {
    // 1. Broken symlink
    const brokenLink = path.join(sandbox.geminiConfigPlugins, 'broken-one');
    fs.symlinkSync('/does/not/exist', brokenLink);

    // 2. Missing manifest
    const missingManifest = path.join(sandbox.geminiConfigPlugins, 'no-manifest');
    fs.mkdirSync(missingManifest, { recursive: true });

    let diags = Doctor.runDiagnostics();
    assert.equal(diags.filter((d) => d.canAutoFix).length, 2);

    const batchRes = Doctor.fixAll();
    assert.equal(batchRes.success, true);

    diags = Doctor.runDiagnostics();
    assert.equal(diags.filter((d) => d.canAutoFix).length, 0);
  });
});
