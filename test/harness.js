import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { Paths } from '../src/core/paths.js';

export class TestHarness {
  static createSandbox(prefix = 'agy-test-') {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    Paths.setHome(tmpDir);
    Paths.ensureDirs();

    return {
      tmpDir,
      geminiConfigPlugins: Paths.geminiConfigPlugins,
      marketplacesDir: Paths.marketplacesDir,
      knownMarketplacesJson: Paths.knownMarketplacesJson,
      cleanup: () => {
        Paths.resetHome();
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {}
      },
    };
  }

  static createMockMarketplace(sandbox, mpName, plugins = []) {
    const mpDir = path.join(sandbox.marketplacesDir, mpName);
    const pluginsDir = path.join(mpDir, 'plugins');
    fs.mkdirSync(pluginsDir, { recursive: true });

    for (const p of plugins) {
      const pDir = path.join(pluginsDir, p.name);
      fs.mkdirSync(pDir, { recursive: true });

      if (p.hasManifest !== false) {
        const manifest = {
          name: p.name,
          version: p.version || '1.0.0',
          description: p.description || 'Test plugin description',
          category: p.category || 'development',
        };
        fs.writeFileSync(path.join(pDir, 'plugin.json'), JSON.stringify(manifest, null, 2) + '\n');
      }

      if (p.hasClaudeManifest) {
        const claudeDir = path.join(pDir, '.claude-plugin');
        fs.mkdirSync(claudeDir, { recursive: true });
        const manifest = {
          name: p.name,
          version: p.version || '1.0.0',
          description: p.description || 'Test claude plugin description',
        };
        fs.writeFileSync(path.join(claudeDir, 'plugin.json'), JSON.stringify(manifest, null, 2) + '\n');
      }

      if (p.skills) {
        const skillsDir = path.join(pDir, 'skills');
        fs.mkdirSync(skillsDir, { recursive: true });
        for (const s of p.skills) {
          const sDir = path.join(skillsDir, s.name);
          fs.mkdirSync(sDir, { recursive: true });
          const verField = s.version ? `\nversion: ${s.version}` : '';
          const frontmatter = s.rawFrontmatter || `---\nname: ${s.name}${verField}\ndescription: >-\n  ${s.description || 'Test skill description'}\n---\n\n# ${s.name}\n`;
          fs.writeFileSync(path.join(sDir, 'SKILL.md'), frontmatter);
        }
      }
    }

    // Register in known_marketplaces.json
    const known = fs.existsSync(sandbox.knownMarketplacesJson)
      ? JSON.parse(fs.readFileSync(sandbox.knownMarketplacesJson, 'utf8'))
      : {};

    known[mpName] = {
      name: mpName,
      source: { source: 'directory', path: mpDir },
      installLocation: mpDir,
      autoUpdate: true,
      lastUpdated: new Date().toISOString(),
    };

    fs.writeFileSync(sandbox.knownMarketplacesJson, JSON.stringify(known, null, 2) + '\n');
    return mpDir;
  }
}
