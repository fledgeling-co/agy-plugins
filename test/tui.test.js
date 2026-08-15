import { describe, it, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { TuiApp } from '../src/tui/app.js';
import { TestHarness } from './harness.js';

describe('TUI Application & Layout (TUI-001 - TUI-002)', () => {
  let sandbox;
  let app;

  beforeEach(() => {
    sandbox = TestHarness.createSandbox('agy-tui-test-');
    TestHarness.createMockMarketplace(sandbox, 'tui-market', [
      {
        name: 'sample-tui-plugin',
        description: 'TUI test sample plugin',
        category: 'development',
        skills: [{ name: 'sample-tui-skill', description: 'Sample trigger' }],
      },
    ]);
  });

  afterEach(() => {
    if (app) {
      try {
        app.destroy();
      } catch {}
    }
    if (process.stdin.pause) {
      process.stdin.pause();
    }
    sandbox.cleanup();
  });

  it('TUI-001: initializes layout and tabs cleanly', () => {
    app = new TuiApp();
    assert.equal(app.currentTab, 'catalog');
    assert.equal(app.tabs.length, 4);
    assert.ok(app.tabButtons.catalog);
    assert.ok(app.tabButtons.marketplaces);
    assert.ok(app.tabButtons.installed);
    assert.ok(app.tabButtons.doctor);
  });

  it('TUI-002: switches tabs and toggles pane visibility', () => {
    app = new TuiApp();

    // Switch to Marketplaces
    app.switchTab('marketplaces');
    assert.equal(app.currentTab, 'marketplaces');
    assert.equal(app.marketplacesView.hidden, false);
    assert.equal(app.catalogView.hidden, true);

    // Switch to Installed
    app.switchTab('installed');
    assert.equal(app.currentTab, 'installed');
    assert.equal(app.installedView.hidden, false);

    // Switch to Doctor
    app.switchTab('doctor');
    assert.equal(app.currentTab, 'doctor');
    assert.equal(app.doctorView.hidden, false);
  });

  it('TUI-003: correctly strips blessed tags and formats strings', () => {
    app = new TuiApp();
    const formatted = '{#10b981-fg}{bold}Active Skill{/bold}{/}';
    const stripped = app.stripTags(formatted);
    assert.equal(stripped, 'Active Skill');
  });

  it('TUI-004: wraps lines cleanly within specified bounds', () => {
    app = new TuiApp();
    const text = 'Turn a feature requirements into an acceptance criteria traceable e2e suite in the project own harness';
    const lines = app.wrapLines(text, 30);
    assert.ok(lines.length >= 3);
    for (const l of lines) {
      assert.ok(l.length <= 30, `Line "${l}" exceeds width 30`);
    }
  });

  it('TUI-005: filters catalog list based on search query', () => {
    app = new TuiApp();
    assert.equal(app.plugins.length, 1);

    app.searchQuery = 'sample';
    app.filterPlugins();
    assert.equal(app.filteredPlugins.length, 1);

    app.searchQuery = 'nonexistent-query-xyz';
    app.filterPlugins();
    assert.equal(app.filteredPlugins.length, 0);
  });

  it('TUI-006: formats tabular sticky headers and aligned grid columns', () => {
    app = new TuiApp();
    assert.ok(app.catalogHeader);
    assert.ok(app.catalogDivider);
    
    const headerRaw = app.stripTags(app.catalogHeader.content);
    assert.match(headerRaw, /NAME/);
    assert.match(headerRaw, /VER/);
    assert.match(headerRaw, /CATEGORY/);
    assert.match(headerRaw, /DESCRIPTION/);

    const dividerRaw = app.stripTags(app.catalogDivider.content);
    assert.match(dividerRaw, /───/);

    const formattedTag = app.formatCategoryTag('development', 11);
    assert.match(formattedTag, /\[DEV\]/);
  });
});
