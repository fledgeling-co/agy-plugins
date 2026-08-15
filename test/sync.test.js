import { describe, it, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { SyncEngine } from '../src/core/sync.js';
import { TestHarness } from './harness.js';

describe('SyncEngine (SYNC-001 - SYNC-002)', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = TestHarness.createSandbox('agy-sync-test-');
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  it('SYNC-001: handles local directory marketplaces gracefully', async () => {
    TestHarness.createMockMarketplace(sandbox, 'local-market', [
      {
        name: 'test-plugin',
        skills: [{ name: 'test-skill', description: 'Test skill' }],
      },
    ]);

    const results = await SyncEngine.syncAll(true);
    assert.equal(results.length, 1);
    assert.equal(results[0].marketplace, 'local-market');
    assert.equal(results[0].success, true);
    assert.match(results[0].message, /not a git repository|up to date/i);
  });

  it('SYNC-002: forceSyncMarketplace handles force reset flag', async () => {
    const mpDir = TestHarness.createMockMarketplace(sandbox, 'force-market', []);
    const entry = {
      name: 'force-market',
      installLocation: mpDir,
      autoUpdate: true,
    };

    const res = await SyncEngine.forceSyncMarketplace(entry);
    assert.equal(res.marketplace, 'force-market');
    assert.equal(res.success, true);
  });
});
