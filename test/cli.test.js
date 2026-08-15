import { describe, it, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as path from 'node:path';
import { TestHarness } from './harness.js';

const execFileAsync = promisify(execFile);
const binPath = path.resolve('bin/agy-plugins.js');

describe('CLI Commands E2E (CLI-001 - CLI-011)', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = TestHarness.createSandbox('agy-cli-test-');
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  async function runAgy(args) {
    return execFileAsync('node', [binPath, ...args], {
      env: {
        ...process.env,
        AGY_HOME: sandbox.tmpDir,
      },
    });
  }

  it('CLI-001: list command outputs table of discovered plugins', async () => {
    TestHarness.createMockMarketplace(sandbox, 'cli-market', [
      {
        name: 'cli-sample-plugin',
        description: 'Sample plugin for CLI testing',
        skills: [{ name: 'cli-sample-plugin', description: 'Sample skill' }],
      },
    ]);

    const { stdout } = await runAgy(['list']);
    assert.match(stdout, /Antigravity Plugins & Skills/i);
    assert.match(stdout, /cli-sample-plugin/);
    assert.match(stdout, /cli-market/);
  });

  it('CLI-002: list --json outputs parseable JSON array', async () => {
    TestHarness.createMockMarketplace(sandbox, 'json-market', [
      {
        name: 'json-plugin',
        description: 'JSON test plugin',
        skills: [{ name: 'json-plugin', description: 'JSON skill' }],
      },
    ]);

    const { stdout } = await runAgy(['list', '--json']);
    const parsed = JSON.parse(stdout);
    assert.ok(Array.isArray(parsed));
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].name, 'json-plugin');
  });

  it('CLI-002b: list --grouped outputs marketplace section headers', async () => {
    TestHarness.createMockMarketplace(sandbox, 'group-market', [
      {
        name: 'grouped-plugin',
        description: 'Grouped test plugin',
        skills: [{ name: 'grouped-plugin', description: 'Grouped skill' }],
      },
    ]);

    const { stdout } = await runAgy(['list', '--grouped']);
    assert.match(stdout, /group-market/);
    assert.match(stdout, /grouped-plugin/);
  });

  it('CLI-003: search command finds matching plugins', async () => {
    TestHarness.createMockMarketplace(sandbox, 'search-market', [
      {
        name: 'orchestrator-engine',
        description: 'Workflow orchestrator capability',
        skills: [{ name: 'orchestrator-engine', description: 'Orchestrator' }],
      },
    ]);

    const { stdout } = await runAgy(['search', 'orchestrator']);
    assert.match(stdout, /Search Results/i);
    assert.match(stdout, /orchestrator-engine/);
  });

  it('CLI-004 & CLI-005: install and uninstall commands manage symlinks', async () => {
    TestHarness.createMockMarketplace(sandbox, 'manage-market', [
      {
        name: 'target-manage-plugin',
        description: 'Manageable plugin',
        skills: [{ name: 'target-manage-plugin', description: 'Skill' }],
      },
    ]);

    // 1. Install
    const installRes = await runAgy(['install', 'target-manage-plugin']);
    assert.match(installRes.stdout, /Successfully installed target-manage-plugin/i);

    // Verify installed
    const listRes = await runAgy(['list', '--installed']);
    assert.match(listRes.stdout, /target-manage-plugin/);

    // 2. Uninstall
    const uninstallRes = await runAgy(['uninstall', 'target-manage-plugin']);
    assert.match(uninstallRes.stdout, /Successfully uninstalled target-manage-plugin/i);
  });

  it('CLI-006 - CLI-009: marketplace subcommands (list, add, update, remove)', async () => {
    // 1. Add local directory marketplace
    const localDir = TestHarness.createMockMarketplace(sandbox, 'init-market', []);
    const { stdout: addOut } = await runAgy(['marketplace', 'add', localDir]);
    assert.match(addOut, /Registering marketplace/i);

    // 2. List marketplaces
    const { stdout: listOut } = await runAgy(['marketplace', 'list']);
    assert.match(listOut, /Registered Marketplaces/i);

    // 3. Update marketplace
    const { stdout: updateOut } = await runAgy(['marketplace', 'update', 'init-market']);
    assert.match(updateOut, /Updating init-market/i);

    // 4. Remove marketplace
    const { stdout: removeOut } = await runAgy(['marketplace', 'remove', 'init-market']);
    assert.match(removeOut, /Removed marketplace/i);
  });

  it('CLI-010 & CLI-011: doctor and doctor --fix commands', async () => {
    const { stdout: docOut } = await runAgy(['doctor']);
    assert.match(docOut, /Health Diagnostics/i);

    const { stdout: fixOut } = await runAgy(['doctor', '--fix']);
    assert.match(fixOut, /Applying automated repairs|Health Diagnostics/i);
  });
});
