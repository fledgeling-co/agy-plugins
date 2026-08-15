import { describe, it, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ChangelogEngine } from '../src/core/changelog.js';
import { Normalizer } from '../src/core/normalizer.js';
import { Registry } from '../src/core/registry.js';
import { Git } from '../src/core/git.js';
import { TestHarness } from './harness.js';

describe('Changelog Engine & Versioning System', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = TestHarness.createSandbox('agy-changelog-test-');
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  describe('Changelog Parser', () => {
    it('should parse standard semver releases from markdown', () => {
      const md = `
# Changelog

## [1.2.0] - 2026-08-15
### Added
- Added fast-forward sync support
- Added changelog command

## [1.1.0] - 2026-08-10
### Fixed
- Fixed symlink resolution bug
`;
      const parsed = ChangelogEngine.parseChangelog(md);
      assert.equal(parsed.sections.length, 2);
      assert.equal(parsed.sections[0].version, '1.2.0');
      assert.equal(parsed.sections[0].date, '2026-08-15');
      assert.ok(parsed.sections[0].body.includes('fast-forward sync'));
      assert.equal(parsed.sections[1].version, '1.1.0');
    });

    it('should filter sections matching a specific plugin name in a multi-plugin changelog', () => {
      const multiMd = `
# Marketplace Release History

## 2026-08-15 Update
### design-review 1.8.0
- Added dual oracle visual verification
- Fixed contrast ratio calculation

### create-luke-content 1.3.0
- Optimised voice fingerprint model
- Added tone constraints

## 2026-08-01 Update
### design-review 1.7.0
- Initial release of inspection harness
`;
      const parsed = ChangelogEngine.parseChangelog(multiMd, { filterQuery: 'design-review' });
      assert.equal(parsed.sections.length, 2);
      assert.ok(parsed.sections[0].heading.includes('design-review'));
      assert.ok(parsed.sections[0].body.includes('dual oracle'));
      assert.ok(!parsed.sections[0].body.includes('voice fingerprint'));
    });
  });

  describe('Plugin & Marketplace Changelog Discovery', () => {
    it('should discover plugin-level CHANGELOG.md', () => {
      const mpDir = TestHarness.createMockMarketplace(sandbox, 'test-market', [
        {
          name: 'custom-plugin',
          version: '1.4.0',
          description: 'Test plugin with local changelog',
          skills: [{ name: 'custom-plugin', description: 'Custom skill' }],
        },
      ]);

      const pluginDir = path.join(mpDir, 'plugins', 'custom-plugin');
      fs.writeFileSync(path.join(pluginDir, 'CHANGELOG.md'), `
# Changelog
## 1.4.0 (2026-08-15)
- Local plugin update released
`);

      const result = ChangelogEngine.getPluginChangelog('custom-plugin', 'test-market');
      assert.equal(result.found, true);
      assert.equal(result.pluginName, 'custom-plugin');
      assert.equal(result.sections.length, 1);
      assert.equal(result.sections[0].version, '1.4.0');
    });

    it('should fallback to marketplace root CHANGELOG.md when plugin has no individual changelog', () => {
      const mpDir = TestHarness.createMockMarketplace(sandbox, 'root-market', [
        {
          name: 'nested-plugin',
          version: '2.0.0',
          skills: [{ name: 'nested-plugin', description: 'Nested skill' }],
        },
      ]);

      fs.writeFileSync(path.join(mpDir, 'CHANGELOG.md'), `
# Marketplace Root Changelog
## [nested-plugin] 2.0.0 - 2026-08-15
- Major refactor of nested plugin capabilities
`);

      const result = ChangelogEngine.getPluginChangelog('nested-plugin', 'root-market');
      assert.equal(result.found, true);
      assert.equal(result.sections.length, 1);
      assert.ok(result.sections[0].body.includes('Major refactor'));
    });

    it('should fetch entire marketplace changelog', () => {
      const mpDir = TestHarness.createMockMarketplace(sandbox, 'history-market', [
        {
          name: 'item-one',
          skills: [{ name: 'item-one', description: 'Item one' }],
        },
      ]);

      fs.writeFileSync(path.join(mpDir, 'CHANGELOG.md'), `
# Complete Marketplace Changelog
## 2026-08-15
- Synchronised 12 new tools
`);

      const result = ChangelogEngine.getMarketplaceChangelog('history-market');
      assert.equal(result.found, true);
      assert.equal(result.marketplaceName, 'history-market');
      assert.ok(result.sections.length >= 1);
    });

    it('should format output gracefully for terminal and TUI even when changelog is not found', () => {
      const notFound = ChangelogEngine.getPluginChangelog('nonexistent', 'test-market');
      const termOutput = ChangelogEngine.formatForTerminal(notFound);
      const tuiOutput = ChangelogEngine.formatForTui(notFound);

      assert.ok(termOutput.includes('not found') || termOutput.includes('No changelog'));
      assert.ok(tuiOutput.includes('not found') || tuiOutput.includes('No changelog'));
    });
  });

  describe('Skill Versioning Normalization', () => {
    it('should parse skill version from SKILL.md frontmatter', () => {
      const raw = `---
name: specialized-skill
version: 3.2.1
description: A skill with explicit version
---

# Instructions
`;
      const parsed = Normalizer.parseSkillFrontmatter(raw);
      assert.equal(parsed.name, 'specialized-skill');
      assert.equal(parsed.version, '3.2.1');
    });

    it('should attach skill versions when discovering plugins in registry', () => {
      TestHarness.createMockMarketplace(sandbox, 'version-market', [
        {
          name: 'versioned-bundle',
          version: '1.9.5',
          description: 'Bundle description',
          skills: [
            { name: 'sub-skill-1', description: 'Sub skill 1', version: '2.0.0' },
            { name: 'sub-skill-2', description: 'Sub skill 2' },
          ],
        },
      ]);

      const plugins = Registry.getAllPlugins();
      const bundle = plugins.find((p) => p.name === 'versioned-bundle');
      assert.ok(bundle);
      assert.equal(bundle.version, '1.9.5');
      assert.equal(bundle.skills[0].version, '2.0.0');
      assert.equal(bundle.skills[1].version, '1.9.5');
    });
  });

  describe('Git Latest Commit Metadata', () => {
    it('should retrieve latest commit author date and hash from git repository', async () => {
      const gitInfo = await Git.getLatestCommitInfo(process.cwd());
      if (gitInfo) {
        assert.ok(gitInfo.shortSha);
        assert.ok(gitInfo.date);
        assert.ok(typeof gitInfo.subject === 'string');
      }
    });
  });
});
