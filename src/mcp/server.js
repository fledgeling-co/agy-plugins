import * as readline from 'node:readline';
import { Registry } from '../core/registry.js';
import { Installer } from '../core/installer.js';
import { SyncEngine } from '../core/sync.js';
import { Doctor } from '../core/doctor.js';
import { Git } from '../core/git.js';
import { ChangelogEngine } from '../core/changelog.js';

export class McpServer {
  static autoSyncTimer = null;

  static start() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    // Start background auto-sync daemon (runs 3s after startup, then every 30m)
    this.startAutoSyncDaemon();

    rl.on('line', async (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      try {
        const req = JSON.parse(trimmed);
        const res = await McpServer.handleRequest(req);
        if (res) {
          process.stdout.write(JSON.stringify(res) + '\n');
        }
      } catch (err) {
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: `Parse error: ${err.message}` },
        }) + '\n');
      }
    });
  }

  static startAutoSyncDaemon(intervalMs = 60 * 1000) {
    if (this.autoSyncTimer) return;

    // Immediate non-blocking check on startup (0ms)
    setTimeout(async () => {
      try {
        const results = await SyncEngine.syncAll(false);
        const updated = results.filter(r => r.updated);
        if (updated.length > 0) {
          console.error(`[agy-plugins-mcp] Startup auto-sync updated ${updated.length} marketplace(s): ${updated.map(u => u.marketplace).join(', ')}`);
        }
      } catch (err) {
        console.error(`[agy-plugins-mcp] Auto-sync check failed: ${err.message}`);
      }
    }, 100);

    // Continuous background interval (every 60s)
    this.autoSyncTimer = setInterval(async () => {
      try {
        const results = await SyncEngine.syncAll(false);
        const updated = results.filter(r => r.updated);
        if (updated.length > 0) {
          console.error(`[agy-plugins-mcp] Periodic auto-sync updated ${updated.length} marketplace(s): ${updated.map(u => u.marketplace).join(', ')}`);
        }
      } catch (err) {
        console.error(`[agy-plugins-mcp] Auto-sync interval failed: ${err.message}`);
      }
    }, intervalMs);

    // Do not hold process open if stdin closes
    if (this.autoSyncTimer.unref) {
      this.autoSyncTimer.unref();
    }
  }

  static stopAutoSyncDaemon() {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
  }

  static async handleRequest(req) {
    const { id, method, params } = req;

    if (method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'agy-plugins-mcp',
            version: '1.0.0',
          },
        },
      };
    }

    if (method === 'notifications/initialized') {
      return null;
    }

    if (method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'marketplace_list',
              description: 'List all registered Antigravity plugin marketplaces, their local clone locations, and auto-sync status.',
              inputSchema: { type: 'object', properties: {} },
            },
            {
              name: 'marketplace_add',
              description: 'Register and clone a new marketplace repository (GitHub owner/repo, full Git URL, or local path).',
              inputSchema: {
                type: 'object',
                properties: {
                  repoOrUrl: { type: 'string', description: 'GitHub shorthand (e.g. DiologIR/diolog-plugins), Git URL, or local directory path.' },
                  autoUpdate: { type: 'boolean', description: 'Enable continuous auto-sync for this marketplace. Defaults to true.' },
                },
                required: ['repoOrUrl'],
              },
            },
            {
              name: 'marketplace_update',
              description: 'Fast-forward update (git pull --ff-only) one or all registered marketplaces.',
              inputSchema: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Optional marketplace name. If omitted, syncs all marketplaces.' },
                },
              },
            },
            {
              name: 'marketplace_remove',
              description: 'Remove a marketplace registration from AGY.',
              inputSchema: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Name of the marketplace to remove.' },
                },
                required: ['name'],
              },
            },
            {
              name: 'plugin_list',
              description: 'List all discovered plugins across all marketplaces along with their install status in Antigravity CLI.',
              inputSchema: {
                type: 'object',
                properties: {
                  installedOnly: { type: 'boolean', description: 'Only return plugins that are currently installed in AGY.' },
                  groupByMarketplace: { type: 'boolean', description: 'Group returned plugins by marketplace name into a dictionary.' },
                },
              },
            },
            {
              name: 'plugin_search',
              description: 'Fuzzy search plugins and skills by keyword, category, or description.',
              inputSchema: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Search term or category.' },
                },
                required: ['query'],
              },
            },
            {
              name: 'plugin_install',
              description: 'Install a plugin into Antigravity CLI (~/.gemini/config/plugins/) via managed symlink.',
              inputSchema: {
                type: 'object',
                properties: {
                  pluginName: { type: 'string', description: 'The unique name of the plugin to install.' },
                },
                required: ['pluginName'],
              },
            },
            {
              name: 'plugin_uninstall',
              description: 'Uninstall a plugin from Antigravity CLI by removing its symlink.',
              inputSchema: {
                type: 'object',
                properties: {
                  pluginName: { type: 'string', description: 'The unique name of the plugin to uninstall.' },
                },
                required: ['pluginName'],
              },
            },
            {
              name: 'doctor_diagnostics',
              description: 'Run health diagnostics on AGY plugins, validating symlinks, schemas, and frontmatter.',
              inputSchema: {
                type: 'object',
                properties: {
                  autoFix: { type: 'boolean', description: 'Automatically repair fixable issues.' },
                },
              },
            },
            {
              name: 'plugin_changelog',
              description: 'Get release notes and changelog history for a specific plugin.',
              inputSchema: {
                type: 'object',
                properties: {
                  pluginName: { type: 'string', description: 'Name of the plugin.' },
                  marketplaceName: { type: 'string', description: 'Optional marketplace name.' },
                },
                required: ['pluginName'],
              },
            },
            {
              name: 'marketplace_changelog',
              description: 'Get release notes and changelog history for a registered marketplace.',
              inputSchema: {
                type: 'object',
                properties: {
                  marketplaceName: { type: 'string', description: 'Name of the marketplace.' },
                },
                required: ['marketplaceName'],
              },
            },
          ],
        },
      };
    }

    if (method === 'tools/call') {
      const { name, arguments: args } = params;
      const result = await McpServer.executeTool(name, args || {});
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        },
      };
    }

    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    };
  }

  static async executeTool(name, args) {
    switch (name) {
      case 'marketplace_list': {
        return Registry.getMarketplaces();
      }

      case 'marketplace_add': {
        const { url, name: mpName, isLocal } = Git.normalizeRepoUrl(args.repoOrUrl);
        const installLoc = isLocal ? url : `${process.env.HOME}/.gemini/plugins/marketplaces/${mpName}`;
        
        const entry = Registry.addMarketplace(mpName, {
          source: isLocal ? 'directory' : (args.repoOrUrl.includes('/') && !args.repoOrUrl.includes(':') ? 'github' : 'git'),
          repo: isLocal ? undefined : args.repoOrUrl,
          url: isLocal ? undefined : url,
          path: isLocal ? url : undefined,
        }, installLoc, args.autoUpdate ?? true);

        if (!isLocal) {
          await SyncEngine.syncMarketplace(entry);
        }

        return { success: true, marketplace: entry };
      }

      case 'marketplace_update': {
        if (args.name) {
          const mps = Registry.getMarketplaces();
          const entry = mps[args.name];
          if (!entry) return { success: false, error: `Marketplace ${args.name} not found` };
          return SyncEngine.syncMarketplace(entry);
        }
        return SyncEngine.syncAll(true);
      }

      case 'marketplace_remove': {
        const success = Registry.removeMarketplace(args.name);
        return { success, message: success ? `Removed marketplace ${args.name}` : `Marketplace ${args.name} not found` };
      }

      case 'plugin_list': {
        const plugins = Registry.getAllPlugins();
        const filtered = args.installedOnly ? plugins.filter(p => p.installed) : plugins;
        if (args.groupByMarketplace) {
          const grouped = {};
          for (const p of filtered) {
            const mp = p.marketplaceName || 'other';
            if (!grouped[mp]) grouped[mp] = [];
            grouped[mp].push(p);
          }
          return grouped;
        }
        return filtered;
      }

      case 'plugin_search': {
        const q = (args.query || '').toLowerCase().trim();
        const plugins = Registry.getAllPlugins();
        return plugins.filter(p => (
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.marketplaceName.toLowerCase().includes(q) ||
          p.skills.some(s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
        ));
      }

      case 'plugin_install': {
        const all = Registry.getAllPlugins();
        const target = all.find(p => p.name === args.pluginName);
        if (!target) {
          return { success: false, error: `Plugin "${args.pluginName}" not found across any registered marketplace.` };
        }
        return Installer.installPlugin(target);
      }

      case 'plugin_uninstall': {
        return Installer.uninstallPlugin(args.pluginName);
      }

      case 'doctor_diagnostics': {
        const diags = Doctor.runDiagnostics();
        const fixed = [];
        if (args.autoFix) {
          for (const d of diags) {
            if (d.canAutoFix) {
              const res = Doctor.applyAutoFix(d);
              fixed.push({ id: d.id, result: res });
            }
          }
        }
        return { diagnostics: diags, fixed };
      }

      case 'plugin_changelog': {
        return ChangelogEngine.getPluginChangelog(args.pluginName, args.marketplaceName || '');
      }

      case 'marketplace_changelog': {
        return ChangelogEngine.getMarketplaceChangelog(args.marketplaceName);
      }

      default:
        return { error: `Unknown tool: ${name}` };
    }
  }
}
