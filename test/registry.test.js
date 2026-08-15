import { describe, it, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Registry } from '../src/core/registry.js';
import { TestHarness } from './harness.js';

describe('Registry (REG-001 - REG-003)', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = TestHarness.createSandbox('agy-reg-test-');
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  it('REG-001: discovers plugins and multi-skill packages in marketplaces', () => {
    TestHarness.createMockMarketplace(sandbox, 'mock-market', [
      {
        name: 'single-skill-plugin',
        description: 'Single skill description',
        category: 'development',
        skills: [{ name: 'single-skill', description: 'Single skill' }],
      },
      {
        name: 'multi-skill-bundle',
        description: 'Multi skill bundle description',
        category: 'productivity',
        skills: [
          { name: 'skill-alpha', description: 'Alpha capability' },
          { name: 'skill-beta', description: 'Beta capability' },
        ],
      },
    ]);

    const plugins = Registry.getAllPlugins();
    assert.equal(plugins.length, 2);

    const single = plugins.find((p) => p.name === 'single-skill-plugin');
    assert.ok(single);
    assert.equal(single.skills.length, 1);
    assert.equal(single.marketplaceName, 'mock-market');

    const multi = plugins.find((p) => p.name === 'multi-skill-bundle');
    assert.ok(multi);
    assert.equal(multi.skills.length, 2);
  });

  it('REG-002: detects installed symlinks in gemini config plugins', () => {
    const mpDir = TestHarness.createMockMarketplace(sandbox, 'test-market', [
      {
        name: 'installed-target',
        skills: [{ name: 'installed-target', description: 'Active skill' }],
      },
    ]);

    const targetDir = path.join(mpDir, 'plugins', 'installed-target');
    const symlinkPath = path.join(sandbox.geminiConfigPlugins, 'installed-target');
    fs.symlinkSync(targetDir, symlinkPath);

    const installed = Registry.getInstalledPlugins();
    assert.ok(installed['installed-target']);
    assert.equal(installed['installed-target'].enabled, true);

    const all = Registry.getAllPlugins();
    const found = all.find((p) => p.name === 'installed-target');
    assert.ok(found);
    assert.equal(found.installed, true);
  });

  it('REG-003: manages marketplace autoUpdate toggling and removal', () => {
    TestHarness.createMockMarketplace(sandbox, 'toggle-market', []);

    let mps = Registry.getMarketplaces();
    assert.ok(mps['toggle-market']);
    assert.equal(mps['toggle-market'].autoUpdate, true);

    const updatedState = Registry.toggleAutoUpdate('toggle-market');
    assert.equal(updatedState, false);

    mps = Registry.getMarketplaces();
    assert.equal(mps['toggle-market'].autoUpdate, false);

    const removed = Registry.removeMarketplace('toggle-market');
    assert.equal(removed, true);

    mps = Registry.getMarketplaces();
    assert.equal(mps['toggle-market'], undefined);
  });
});
