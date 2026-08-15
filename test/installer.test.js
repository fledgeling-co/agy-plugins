import { describe, it, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Installer } from '../src/core/installer.js';
import { Registry } from '../src/core/registry.js';
import { TestHarness } from './harness.js';

describe('Installer (INS-001 - INS-003)', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = TestHarness.createSandbox('agy-ins-test-');
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  it('INS-001: creates direct atomic symlink in geminiConfigPlugins', async () => {
    TestHarness.createMockMarketplace(sandbox, 'ins-market', [
      {
        name: 'install-me',
        description: 'Ready to be installed',
        skills: [{ name: 'install-me', description: 'Skill description' }],
      },
    ]);

    const res = await Installer.installPlugin('install-me');
    assert.equal(res.success, true);

    const destLink = path.join(sandbox.geminiConfigPlugins, 'install-me');
    assert.ok(fs.existsSync(destLink));
    assert.ok(fs.lstatSync(destLink).isSymbolicLink());

    const installed = Registry.getInstalledPlugins();
    assert.ok(installed['install-me']);
  });

  it('INS-002: replaces stale existing directory with canonical symlink', async () => {
    TestHarness.createMockMarketplace(sandbox, 'conflict-market', [
      {
        name: 'stale-plugin',
        description: 'Plugin with stale dir conflict',
        skills: [{ name: 'stale-plugin', description: 'Stale skill' }],
      },
    ]);

    // Create stale directory in target location
    const staleDir = path.join(sandbox.geminiConfigPlugins, 'stale-plugin');
    fs.mkdirSync(staleDir, { recursive: true });
    fs.writeFileSync(path.join(staleDir, 'old-file.txt'), 'old');

    const res = await Installer.installPlugin('stale-plugin');
    assert.equal(res.success, true);

    const stat = fs.lstatSync(staleDir);
    assert.ok(stat.isSymbolicLink(), 'Target must now be converted into a symlink');
  });

  it('INS-003: cleanly uninstalls plugins by removing managed symlinks', async () => {
    TestHarness.createMockMarketplace(sandbox, 'unins-market', [
      {
        name: 'uninstall-target',
        skills: [{ name: 'uninstall-target', description: 'To be removed' }],
      },
    ]);

    await Installer.installPlugin('uninstall-target');
    const destLink = path.join(sandbox.geminiConfigPlugins, 'uninstall-target');
    assert.ok(fs.existsSync(destLink));

    const res = await Installer.uninstallPlugin('uninstall-target');
    assert.equal(res.success, true);
    assert.equal(fs.existsSync(destLink), false);

    const installed = Registry.getInstalledPlugins();
    assert.equal(installed['uninstall-target'], undefined);
  });
});
