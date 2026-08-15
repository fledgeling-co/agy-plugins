import * as fs from 'node:fs';
import * as path from 'node:path';
import { Registry } from './registry.js';
import { Ansi } from '../tui/ansi.js';

export class ChangelogEngine {
  static changelogFilenames = [
    'CHANGELOG.md',
    'changelog.md',
    'Changelog.md',
    'HISTORY.md',
    'history.md',
    'RELEASES.md',
    'releases.md',
    'docs/CHANGELOG.md',
    'docs/changelog.md',
  ];

  /**
   * Finds the best changelog file path for a directory.
   */
  static findChangelogPath(dirPath) {
    if (!dirPath || !fs.existsSync(dirPath)) return null;

    for (const fn of this.changelogFilenames) {
      const p = path.join(dirPath, fn);
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        return p;
      }
    }
    return null;
  }

  /**
   * Parses markdown changelog text into structured sections and releases.
   */
  static parseChangelog(content, { filterQuery = '' } = {}) {
    if (!content || typeof content !== 'string') {
      return {
        found: false,
        title: 'Changelog',
        latestVersion: '',
        latestDate: '',
        latestSummary: '',
        sections: [],
        raw: '',
      };
    }

    const lines = content.split('\n');
    const sections = [];
    let currentSection = null;
    let title = 'Changelog';

    // Find main title if present
    for (const l of lines) {
      const trimmed = l.trim();
      if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
        title = trimmed.replace(/^#\s+/, '').trim();
        break;
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Heading level 2 or 3 marks a release or major entry (e.g. ## [1.2.0] or ### plugin-name 1.0.0 → 1.1.0 or ## 2026-08-15)
      const isH2 = trimmed.startsWith('## ') && !trimmed.startsWith('### ');
      const isH3 = trimmed.startsWith('### ') && !trimmed.startsWith('#### ');

      const isSubCategory = isH3 && /^(?:added|fixed|changed|removed|deprecated|security|improvements|fixes|features|optimisations|documentation|notes|refactor|breaking changes)\b/i.test(trimmed.replace(/^###\s+/, ''));

      if (isH2 || (isH3 && !isSubCategory)) {
        if (currentSection) {
          currentSection.body = currentSection.lines.join('\n').trim();
          sections.push(currentSection);
        }

        const headingText = trimmed.replace(/^#+\s+/, '').trim();
        let version = '';
        let date = '';

        // Extract version (e.g. [1.2.0], 1.2.0, v1.2.0, or 1.0.0 → 1.1.0)
        const vMatch = headingText.match(/(?:v|\b)?(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)(?:\s*(?:→|->)\s*(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?))?/i);
        if (vMatch) {
          version = vMatch[2] || vMatch[1] || '';
        }

        // Extract date (e.g. 2026-08-15)
        const dMatch = headingText.match(/(\d{4}-\d{2}-\d{2})/);
        if (dMatch) {
          date = dMatch[1];
        }

        currentSection = {
          level: isH2 ? 2 : 3,
          heading: headingText,
          version,
          date,
          lines: [],
          body: '',
        };
      } else if (currentSection) {
        currentSection.lines.push(line);
      }
    }

    if (currentSection) {
      currentSection.body = currentSection.lines.join('\n').trim();
      sections.push(currentSection);
    }

    // Apply filtering if filterQuery is provided
    let filteredSections = sections;
    if (filterQuery) {
      const q = filterQuery.toLowerCase().trim();
      const matched = sections.filter((s) => {
        return (
          s.heading.toLowerCase().includes(q) ||
          s.body.toLowerCase().includes(q)
        );
      });
      if (matched.length > 0) {
        filteredSections = matched;
      }
    }

    const latest = filteredSections[0] || sections[0] || null;
    const latestSummary = latest ? latest.body.split('\n').filter((l) => l.trim().length > 0).slice(0, 3).join(' ') : '';

    return {
      found: true,
      title,
      latestVersion: latest?.version || '',
      latestDate: latest?.date || '',
      latestSummary,
      sections: filteredSections,
      totalSections: sections.length,
      raw: content,
    };
  }

  /**
   * Retrieves changelog for a specific plugin.
   */
  static getPluginChangelog(pluginName, marketplaceName = '') {
    const allPlugins = Registry.getAllPlugins();
    const plugin = allPlugins.find(
      (p) => p.name === pluginName && (!marketplaceName || p.marketplaceName === marketplaceName)
    );

    if (!plugin) {
      return {
        found: false,
        pluginName,
        marketplaceName,
        message: `Plugin "${pluginName}" not found in registry.`,
        sections: [],
      };
    }

    // 1. Check plugin root directory
    let changelogPath = this.findChangelogPath(plugin.absolutePath);
    let isSpecific = true;

    // 2. Fallback to marketplace root directory
    if (!changelogPath) {
      const marketplaces = Registry.getMarketplaces();
      const mp = marketplaces[plugin.marketplaceName];
      if (mp?.installLocation) {
        changelogPath = this.findChangelogPath(mp.installLocation);
        isSpecific = false;
      }
    }

    if (!changelogPath) {
      return {
        found: false,
        pluginName: plugin.name,
        marketplaceName: plugin.marketplaceName,
        version: plugin.version,
        message: `No CHANGELOG.md found for ${plugin.name} or ${plugin.marketplaceName}.`,
        sections: [],
      };
    }

    try {
      const content = fs.readFileSync(changelogPath, 'utf8');
      const parsed = this.parseChangelog(content, {
        filterQuery: isSpecific ? '' : plugin.name,
      });

      return {
        ...parsed,
        found: true,
        pluginName: plugin.name,
        marketplaceName: plugin.marketplaceName,
        version: plugin.version,
        changelogPath,
        isPluginSpecific: isSpecific,
      };
    } catch (err) {
      return {
        found: false,
        pluginName: plugin.name,
        marketplaceName: plugin.marketplaceName,
        message: `Failed to read changelog: ${err.message}`,
        sections: [],
      };
    }
  }

  /**
   * Retrieves changelog for an entire marketplace.
   */
  static getMarketplaceChangelog(marketplaceName) {
    const marketplaces = Registry.getMarketplaces();
    const mp = marketplaces[marketplaceName];

    if (!mp || !mp.installLocation) {
      return {
        found: false,
        marketplaceName,
        message: `Marketplace "${marketplaceName}" not found in registry.`,
        sections: [],
      };
    }

    const changelogPath = this.findChangelogPath(mp.installLocation);
    if (!changelogPath) {
      return {
        found: false,
        marketplaceName,
        message: `No CHANGELOG.md found in ${mp.installLocation}.`,
        sections: [],
      };
    }

    try {
      const content = fs.readFileSync(changelogPath, 'utf8');
      const parsed = this.parseChangelog(content);

      return {
        ...parsed,
        found: true,
        marketplaceName,
        changelogPath,
        commitSha: mp.commitSha || '',
        lastUpdated: mp.lastUpdated || '',
        lastSkillsUpdated: mp.lastSkillsUpdated || mp.commitDate || '',
      };
    } catch (err) {
      return {
        found: false,
        marketplaceName,
        message: `Failed to read marketplace changelog: ${err.message}`,
        sections: [],
      };
    }
  }

  /**
   * Formats changelog data for terminal output (CLI).
   */
  static formatForTerminal(data) {
    if (!data.found) {
      return Ansi.prism.textDim(data.message || 'No changelog entries found.');
    }

    const out = [];
    const entityTitle = data.pluginName
      ? `${data.pluginName} ${data.version ? `(v${data.version})` : ''}`
      : data.marketplaceName || data.title;

    out.push(Ansi.bold(Ansi.prism.textPrimary(`Changelog: ${entityTitle}`)));
    if (data.changelogPath) {
      out.push(Ansi.prism.textDim(`Source: ${data.changelogPath}\n`));
    }

    if (data.sections.length === 0) {
      out.push(Ansi.prism.textDim('No release sections recorded yet.'));
      return out.join('\n');
    }

    for (const s of data.sections) {
      const headerTag = s.version
        ? `${Ansi.bold(s.heading)} ${Ansi.prism.cyan(`[v${s.version}]`)}`
        : Ansi.bold(s.heading);
      const dateTag = s.date ? Ansi.prism.textDim(`(${s.date})`) : '';

      out.push(` ${Ansi.prism.spark('◆')} ${headerTag} ${dateTag}`);
      
      const bodyLines = s.body.split('\n');
      for (const line of bodyLines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          out.push(`    ${Ansi.prism.emerald('•')} ${Ansi.prism.textSecondary(trimmed.slice(2))}`);
        } else {
          out.push(`    ${Ansi.prism.textDim(trimmed)}`);
        }
      }
      out.push('');
    }

    return out.join('\n');
  }

  /**
   * Formats changelog data for TUI Blessed container.
   */
  static formatForTui(data, { maxSections = 10 } = {}) {
    if (!data.found) {
      return '{#64748b-fg}' + (data.message || 'No changelog entries recorded.') + '{/}';
    }

    const out = [];
    const sectionsToRender = data.sections.slice(0, maxSections);

    for (const s of sectionsToRender) {
      const headingBadge = s.version
        ? `{#38bdf8-fg}{bold}${s.heading}{/bold}{/} {#06b6d4-fg}[v${s.version}]{/}`
        : `{#f8fafc-fg}{bold}${s.heading}{/bold}{/}`;
      const dateBadge = s.date ? ` {#64748b-fg}(${s.date}){/}` : '';

      out.push(`{#6366f1-fg}◆{/} ${headingBadge}${dateBadge}`);

      const bodyLines = s.body.split('\n');
      for (const line of bodyLines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          out.push(`  {#10b981-fg}•{/} {#cbd5e1-fg}${trimmed.slice(2)}{/}`);
        } else {
          out.push(`  {#94a3b8-fg}${trimmed}{/}`);
        }
      }
      out.push('');
    }

    if (data.sections.length > maxSections) {
      out.push(`{#64748b-fg}... and ${data.sections.length - maxSections} older release(s) recorded in CHANGELOG.md{/}`);
    }

    return out.join('\n');
  }
}
