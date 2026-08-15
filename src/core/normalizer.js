import * as fs from 'node:fs';
import * as path from 'node:path';

export class Normalizer {
  /**
   * Parses YAML frontmatter from a markdown file without external dependencies.
   */
  static parseSkillFrontmatter(content) {
    const trimmed = content.trim();
    if (!trimmed.startsWith('---')) {
      return { name: '', description: '', rawYaml: '', tokenFootprint: 0 };
    }

    const endIndex = trimmed.indexOf('---', 3);
    if (endIndex === -1) {
      return { name: '', description: '', rawYaml: '', tokenFootprint: 0 };
    }

    const rawYaml = trimmed.slice(3, endIndex).trim();
    const lines = rawYaml.split('\n');
    let name = '';
    let description = '';
    let readingDesc = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('name:')) {
        name = trimmedLine.replace('name:', '').trim().replace(/^['"]|['"]$/g, '');
        readingDesc = false;
      } else if (trimmedLine.startsWith('description:')) {
        const afterColon = trimmedLine.replace('description:', '').trim();
        if (afterColon === '>-' || afterColon === '|' || afterColon === '>') {
          readingDesc = true;
          description = '';
        } else {
          description = afterColon.replace(/^['"]|['"]$/g, '');
          readingDesc = false;
        }
      } else if (readingDesc) {
        if (line.startsWith('  ') || line.startsWith('\t')) {
          description += (description ? ' ' : '') + trimmedLine;
        } else if (trimmedLine.includes(':')) {
          readingDesc = false;
        }
      }
    }

    const tokenFootprint = Math.ceil(rawYaml.length / 4);
    return { name, description, rawYaml, tokenFootprint };
  }

  /**
   * Discovers and parses all plugins within a marketplace directory.
   */
  static discoverPluginsInMarketplace(marketplaceName, marketplaceRoot) {
    const plugins = [];
    if (!fs.existsSync(marketplaceRoot)) return plugins;

    const manifestPaths = [
      path.join(marketplaceRoot, '.claude-plugin', 'marketplace.json'),
      path.join(marketplaceRoot, 'marketplace.json'),
    ];

    let manifestData = null;
    for (const mpPath of manifestPaths) {
      if (fs.existsSync(mpPath)) {
        try {
          const raw = fs.readFileSync(mpPath, 'utf8');
          manifestData = JSON.parse(raw);
          break;
        } catch {
          // ignore
        }
      }
    }

    if (manifestData && Array.isArray(manifestData.plugins)) {
      for (const p of manifestData.plugins) {
        let sourcePathStr = `plugins/${p.name}`;
        if (typeof p.source === 'string') {
          sourcePathStr = p.source.startsWith('./') ? p.source.slice(2) : p.source;
        } else if (p.source && typeof p.source === 'object' && p.source.path) {
          sourcePathStr = p.source.path.startsWith('./') ? p.source.path.slice(2) : p.source.path;
        }

        const pluginAbsPath = path.join(marketplaceRoot, sourcePathStr);
        const pluginInfo = this.inspectPluginDir(p.name, pluginAbsPath, marketplaceName, marketplaceRoot);
        if (p.description && !pluginInfo.description) {
          pluginInfo.description = p.description;
        }
        if (p.version) {
          pluginInfo.version = p.version;
        }
        if (p.category) {
          pluginInfo.category = this.normalizeCategory(p.category);
        }
        pluginInfo.sourcePath = sourcePathStr;
        plugins.push(pluginInfo);
      }
      return plugins;
    }

    // Fallback 1: Scan plugins/ directory
    const pluginsDir = path.join(marketplaceRoot, 'plugins');
    if (fs.existsSync(pluginsDir) && fs.statSync(pluginsDir).isDirectory()) {
      const entries = fs.readdirSync(pluginsDir);
      for (const entry of entries) {
        const fullPath = path.join(pluginsDir, entry);
        if (fs.statSync(fullPath).isDirectory() && !entry.startsWith('.')) {
          const p = this.inspectPluginDir(entry, fullPath, marketplaceName, marketplaceRoot);
          p.sourcePath = `plugins/${entry}`;
          plugins.push(p);
        }
      }
      return plugins;
    }

    // Fallback 2: Single plugin repo
    if (fs.existsSync(path.join(marketplaceRoot, 'SKILL.md')) ||
        fs.existsSync(path.join(marketplaceRoot, 'skills')) ||
        fs.existsSync(path.join(marketplaceRoot, 'plugin.json')) ||
        fs.existsSync(path.join(marketplaceRoot, '.claude-plugin', 'plugin.json'))) {
      const p = this.inspectPluginDir(marketplaceName, marketplaceRoot, marketplaceName, marketplaceRoot);
      p.sourcePath = '.';
      plugins.push(p);
    }

    return plugins;
  }

  /**
   * Inspects a single plugin directory.
   */
  static inspectPluginDir(name, pluginDir, marketplaceName, marketplaceRoot) {
    this.ensureCompliantManifest(pluginDir, name);

    let description = '';
    let version = '1.0.0';
    let category = 'development';

    const manifestPaths = [
      path.join(pluginDir, 'plugin.json'),
      path.join(pluginDir, '.claude-plugin', 'plugin.json'),
    ];

    for (const mp of manifestPaths) {
      if (fs.existsSync(mp)) {
        try {
          const content = JSON.parse(fs.readFileSync(mp, 'utf8'));
          if (content.description) description = content.description;
          if (content.version) version = content.version;
          if (content.category) category = this.normalizeCategory(content.category);
          break;
        } catch {
          // ignore
        }
      }
    }

    const skills = [];
    const skillsDir = path.join(pluginDir, 'skills');
    
    if (fs.existsSync(skillsDir) && fs.statSync(skillsDir).isDirectory()) {
      const skillEntries = fs.readdirSync(skillsDir);
      for (const sEntry of skillEntries) {
        const skillPath = path.join(skillsDir, sEntry);
        const skillMd = path.join(skillPath, 'SKILL.md');
        if (fs.existsSync(skillMd)) {
          this.normalizeSkillFile(skillMd);
          const content = fs.readFileSync(skillMd, 'utf8');
          const frontmatter = this.parseSkillFrontmatter(content);
          skills.push({
            name: frontmatter.name || sEntry,
            description: frontmatter.description || '',
            path: skillMd,
            tokenFootprint: frontmatter.tokenFootprint,
          });
          if (!description && frontmatter.description) {
            description = frontmatter.description;
          }
        }
      }
    } else {
      const rootSkillMd = path.join(pluginDir, 'SKILL.md');
      if (fs.existsSync(rootSkillMd)) {
        this.normalizeSkillFile(rootSkillMd);
        const content = fs.readFileSync(rootSkillMd, 'utf8');
        const frontmatter = this.parseSkillFrontmatter(content);
        skills.push({
          name: frontmatter.name || name,
          description: frontmatter.description || '',
          path: rootSkillMd,
          tokenFootprint: frontmatter.tokenFootprint,
        });
        if (!description && frontmatter.description) {
          description = frontmatter.description;
        }
      }
    }

    const providesRules = fs.existsSync(path.join(pluginDir, 'rules')) || fs.existsSync(path.join(pluginDir, 'AGENTS.md'));
    const providesHooks = fs.existsSync(path.join(pluginDir, 'hooks.json'));
    
    let providesMcp = false;
    let mcpServerNames = [];
    const mcpConfigPath = path.join(pluginDir, 'mcp_config.json');
    if (fs.existsSync(mcpConfigPath)) {
      try {
        const mcpContent = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
        const servers = mcpContent.mcpServers ? Object.keys(mcpContent.mcpServers) : [];
        if (servers.length > 0) {
          providesMcp = true;
          mcpServerNames = servers;
        }
      } catch {
        providesMcp = true;
      }
    }

    if (category === 'development') {
      if (name.includes('orchestrat') || name.includes('armada') || name.includes('fleet')) {
        category = 'orchestration';
      } else if (name.includes('design') || name.includes('ux') || name.includes('icon')) {
        category = 'design';
      } else if (name.includes('content') || name.includes('voice') || name.includes('article')) {
        category = 'content';
      } else if (providesMcp) {
        category = 'mcp';
      } else if (providesRules && skills.length === 0) {
        category = 'rule';
      }
    }

    return {
      name,
      version,
      description,
      category,
      marketplaceName,
      marketplaceRepo: marketplaceName,
      sourcePath: path.relative(marketplaceRoot, pluginDir),
      absolutePath: pluginDir,
      installed: false,
      skills,
      providesRules,
      providesHooks,
      providesMcp,
      mcpServerNames,
    };
  }

  static normalizeCategory(cat) {
    const lower = String(cat).toLowerCase();
    if (lower.includes('orchestrat')) return 'orchestration';
    if (lower.includes('design') || lower.includes('ux')) return 'design';
    if (lower.includes('content') || lower.includes('voice') || lower.includes('writer')) return 'content';
    if (lower.includes('mcp') || lower.includes('tool')) return 'mcp';
    if (lower.includes('rule') || lower.includes('guideline')) return 'rule';
    if (lower.includes('prod')) return 'productivity';
    if (lower.includes('dev')) return 'development';
    return 'other';
  }

  static ensureCompliantManifest(pluginDir, pluginName) {
    if (!fs.existsSync(pluginDir)) return;
    const targetJson = path.join(pluginDir, 'plugin.json');
    const claudeJson = path.join(pluginDir, '.claude-plugin', 'plugin.json');
    if (!fs.existsSync(targetJson) && !fs.existsSync(claudeJson)) {
      const manifest = {
        name: pluginName,
        version: '1.0.0',
        description: '',
        category: 'development',
      };
      fs.writeFileSync(targetJson, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    }
  }

  static normalizeSkillFile(skillPath) {
    if (!fs.existsSync(skillPath)) return;
    try {
      const content = fs.readFileSync(skillPath, 'utf8');
      if (!content.startsWith('---')) return;

      const endIndex = content.indexOf('---', 3);
      if (endIndex === -1) return;

      const rawYaml = content.slice(3, endIndex).trim();
      const rest = content.slice(endIndex + 3);
      const parsed = this.parseSkillFrontmatter(content);

      if (!parsed.name || !parsed.description) return;

      // If description isn't formatted with a YAML block scalar (>-, >, |), convert it
      if (!rawYaml.includes('description: >') && !rawYaml.includes('description: |')) {
        const cleanDesc = parsed.description.trim().replace(/\r?\n/g, ' ');
        const newYaml = `---\nname: ${parsed.name}\ndescription: >-\n  ${cleanDesc}\n---`;
        const newContent = newYaml + rest;
        fs.writeFileSync(skillPath, newContent, 'utf8');
      }
    } catch {
      // ignore
    }
  }
}
