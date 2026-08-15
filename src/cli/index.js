import { TuiApp } from '../tui/app.js';
import { McpServer } from '../mcp/server.js';
import { Registry } from '../core/registry.js';
import { Installer } from '../core/installer.js';
import { SyncEngine } from '../core/sync.js';
import { Doctor } from '../core/doctor.js';
import { Git } from '../core/git.js';
import { ChangelogEngine } from '../core/changelog.js';
import { Ansi } from '../tui/ansi.js';
import { Paths } from '../core/paths.js';

export async function runCli() {
  const args = process.argv.slice(2);
  const command = args[0] || 'tui';

  switch (command) {
    case 'tui': {
      const app = new TuiApp();
      app.start();
      break;
    }

    case 'mcp': {
      McpServer.start();
      break;
    }

    // Subcommand: marketplace (add, update, remove, list)
    case 'marketplace': {
      const sub = args[1] || 'list';

      if (sub === 'list') {
        const mps = Registry.getMarketplaces();
        const names = Object.keys(mps);
        console.log(Ansi.bold(Ansi.prism.textPrimary(`Registered Marketplaces (${names.length})`)));
        console.log(Ansi.prism.textDim(`Stored in: ${Paths.knownMarketplacesJson}\n`));

        for (const [name, entry] of Object.entries(mps)) {
          const plugins = Registry.getPluginsForMarketplace(name);
          const autoSyncMark = entry.autoUpdate ? Ansi.prism.emerald('auto-sync: on') : Ansi.prism.textDim('auto-sync: off');
          console.log(` ${Ansi.bold(name)} ${Ansi.prism.textDim(`(${plugins.length} plugins/skills)`)} [${autoSyncMark}]`);
          console.log(`    Origin: ${Ansi.prism.cyan(entry.repo || entry.url || entry.path || 'local')}`);
          console.log(`    Location: ${Ansi.prism.textDim(entry.installLocation || 'builtin')}`);
          if (entry.lastUpdated) {
            const syncTime = new Date(entry.lastUpdated).toLocaleString();
            console.log(`    Last Synced: ${Ansi.prism.textSecondary(syncTime)}`);
          }
          if (entry.lastSkillsUpdated) {
            const skillTime = new Date(entry.lastSkillsUpdated).toLocaleString();
            const commitTag = entry.commitSha ? ` (${entry.commitSha})` : '';
            console.log(`    Last Skills Updated: ${Ansi.prism.emerald(skillTime + commitTag)}`);
          }
          console.log('');
        }
        break;
      }

      if (sub === 'add') {
        const target = args[2];
        if (!target) {
          console.error(Ansi.prism.rose('Error: Please provide a repository (e.g. fledgeling-co/fledgeling-plugins) or local path.'));
          process.exit(1);
        }

        const { url, name: mpName, isLocal } = Git.normalizeRepoUrl(target);
        const installLoc = isLocal ? url : `${process.env.HOME}/.gemini/plugins/marketplaces/${mpName}`;
        const autoUpdate = !args.includes('--no-auto-update');

        console.log(Ansi.prism.spark(`Registering marketplace: ${mpName}...`));
        const entry = Registry.addMarketplace(mpName, {
          source: isLocal ? 'directory' : 'github',
          repo: isLocal ? undefined : target,
          url: isLocal ? undefined : url,
          path: isLocal ? url : undefined,
        }, installLoc, autoUpdate);

        if (!isLocal) {
          console.log(Ansi.prism.textSecondary(`Fetching skills from ${installLoc}...`));
          const syncRes = await SyncEngine.syncMarketplace(entry);
          console.log(syncRes.success ? Ansi.prism.emerald('✓ ' + syncRes.message) : Ansi.prism.rose('✕ ' + syncRes.message));
        } else {
          console.log(Ansi.prism.emerald(`✓ Linked local marketplace directory: ${installLoc}`));
        }
        break;
      }

      if (sub === 'update') {
        const mpName = args[2];
        if (mpName) {
          const mps = Registry.getMarketplaces();
          const entry = mps[mpName];
          if (!entry) {
            console.error(Ansi.prism.rose(`Error: Marketplace "${mpName}" not found.`));
            process.exit(1);
          }
          console.log(Ansi.prism.spark(`Updating ${mpName}...`));
          const res = await SyncEngine.syncMarketplace(entry);
          console.log(res.success ? Ansi.prism.emerald('✓ ' + res.message) : Ansi.prism.rose('✕ ' + res.message));
        } else {
          console.log(Ansi.prism.spark('Updating all active marketplaces...'));
          const results = await SyncEngine.syncAll(true);
          for (const r of results) {
            console.log(` ${r.success ? Ansi.prism.emerald('✓') : Ansi.prism.rose('✕')} ${r.marketplace}: ${r.message}`);
          }
        }
        break;
      }

      if (sub === 'remove') {
        const mpName = args[2];
        if (!mpName) {
          console.error(Ansi.prism.rose('Error: Please provide a marketplace name to remove.'));
          process.exit(1);
        }
        const removed = Registry.removeMarketplace(mpName);
        console.log(removed ? Ansi.prism.emerald(`✓ Removed marketplace "${mpName}".`) : Ansi.prism.rose(`✕ Marketplace "${mpName}" not found.`));
        break;
      }

      console.error(Ansi.prism.rose(`Unknown marketplace subcommand: "${sub}". Use: add, update, remove, or list.`));
      process.exit(1);
    }

    case 'list':
    case 'ls': {
      const installedOnly = args.includes('--installed');
      const jsonOutput = args.includes('--json');
      const grouped = args.includes('--grouped') || args.includes('--by-marketplace');
      const all = Registry.getAllPlugins();
      const list = installedOnly ? all.filter(p => p.installed) : all;

      if (jsonOutput) {
        if (grouped) {
          const mps = {};
          for (const p of list) {
            const mp = p.marketplaceName || 'other';
            if (!mps[mp]) mps[mp] = [];
            mps[mp].push(p);
          }
          console.log(JSON.stringify(mps, null, 2));
        } else {
          console.log(JSON.stringify(list, null, 2));
        }
        break;
      }

      console.log(Ansi.bold(Ansi.prism.textPrimary(`Antigravity Plugins & Skills (${list.length})`)));
      console.log(Ansi.prism.textDim(`Configuration directory: ${Paths.geminiConfigPlugins}\n`));

      if (grouped) {
        const mps = {};
        for (const p of list) {
          const mp = p.marketplaceName || 'other';
          if (!mps[mp]) mps[mp] = [];
          mps[mp].push(p);
        }
        for (const [mpName, plugins] of Object.entries(mps)) {
          const installedCount = plugins.filter(p => p.installed).length;
          console.log(Ansi.bold(Ansi.prism.cyan(`⛃ ${mpName}`)) + Ansi.prism.textDim(` (${plugins.length} skills, ${installedCount} installed)`));
          for (const p of plugins) {
            const mark = p.installed ? Ansi.prism.emerald('✓ installed') : Ansi.prism.textDim('○ available');
            console.log(`  ${mark}  ${Ansi.bold(p.name)} ${Ansi.prism.cyan(`v${p.version}`)}`);
            console.log(`     ${Ansi.prism.textSecondary(p.description)}`);
          }
          console.log('');
        }
      } else {
        for (const p of list) {
          const mark = p.installed ? Ansi.prism.emerald('✓ installed') : Ansi.prism.textDim('○ available');
          console.log(` ${mark}  ${Ansi.bold(p.name)} ${Ansi.prism.cyan(`v${p.version}`)} (${p.marketplaceName})`);
          console.log(`    ${Ansi.prism.textSecondary(p.description)}`);
        }
      }
      break;
    }

    case 'search': {
      const query = args[1];
      if (!query) {
        console.error(Ansi.prism.rose('Error: Please provide a search query.'));
        process.exit(1);
      }
      const results = Registry.searchPlugins(query);
      console.log(Ansi.bold(Ansi.prism.textPrimary(`Search Results for "${query}" (${results.length})`)));
      for (const p of results) {
        const mark = p.installed ? Ansi.prism.emerald('✓ installed') : Ansi.prism.textDim('○ available');
        console.log(` ${mark}  ${Ansi.bold(p.name)} ${Ansi.prism.cyan(`v${p.version}`)} ${Ansi.prism.textDim(`[${p.category}]`)} (${p.marketplaceName})`);
        console.log(`    ${Ansi.prism.textSecondary(p.description)}`);
      }
      break;
    }

    case 'add': {
      // Alias for `marketplace add`
      const target = args[1];
      if (!target) {
        console.error(Ansi.prism.rose('Error: Please provide a repository (e.g. fledgeling-co/fledgeling-plugins) or local path.'));
        process.exit(1);
      }

      const { url, name: mpName, isLocal } = Git.normalizeRepoUrl(target);
      const installLoc = isLocal ? url : `${process.env.HOME}/.gemini/plugins/marketplaces/${mpName}`;
      const autoUpdate = !args.includes('--no-auto-update');

      console.log(Ansi.prism.spark(`Registering marketplace: ${mpName}...`));
      const entry = Registry.addMarketplace(mpName, {
        source: isLocal ? 'directory' : 'github',
        repo: isLocal ? undefined : target,
        url: isLocal ? undefined : url,
        path: isLocal ? url : undefined,
      }, installLoc, autoUpdate);

      if (!isLocal) {
        console.log(Ansi.prism.textSecondary(`Fetching skills from ${installLoc}...`));
        const syncRes = await SyncEngine.syncMarketplace(entry);
        console.log(syncRes.success ? Ansi.prism.emerald('✓ ' + syncRes.message) : Ansi.prism.rose('✕ ' + syncRes.message));
      } else {
        console.log(Ansi.prism.emerald(`✓ Linked local marketplace directory: ${installLoc}`));
      }
      break;
    }

    case 'update': {
      const mpName = args[1];
      if (mpName) {
        const mps = Registry.getMarketplaces();
        const entry = mps[mpName];
        if (!entry) {
          console.error(Ansi.prism.rose(`Error: Marketplace "${mpName}" not found.`));
          process.exit(1);
        }
        console.log(Ansi.prism.spark(`Updating ${mpName}...`));
        const res = await SyncEngine.syncMarketplace(entry);
        console.log(res.success ? Ansi.prism.emerald('✓ ' + res.message) : Ansi.prism.rose('✕ ' + res.message));
      } else {
        console.log(Ansi.prism.spark('Updating all active marketplaces...'));
        const results = await SyncEngine.syncAll(true);
        for (const r of results) {
          console.log(` ${r.success ? Ansi.prism.emerald('✓') : Ansi.prism.rose('✕')} ${r.marketplace}: ${r.message}`);
        }
      }
      break;
    }

    case 'install': {
      const spec = args[1];
      if (!spec) {
        console.error(Ansi.prism.rose('Error: Please provide a plugin to install (e.g. trawl@fledgeling-plugins or trawl).'));
        process.exit(1);
      }

      let pluginName = spec;
      let requestedMp = null;
      if (spec.includes('@')) {
        const [p, m] = spec.split('@');
        pluginName = p;
        requestedMp = m;
      }

      const all = Registry.getAllPlugins();
      const matching = all.filter(p => {
        if (p.name !== pluginName) return false;
        if (requestedMp && p.marketplaceName !== requestedMp) return false;
        return true;
      });

      if (matching.length === 0) {
        console.error(Ansi.prism.rose(`Error: Plugin "${spec}" not found across registered marketplaces.`));
        process.exit(1);
      }

      const target = matching[0];
      const res = await Installer.installPlugin(target);
      console.log(res.success ? Ansi.prism.emerald('✓ ' + res.message) : Ansi.prism.rose('✕ ' + res.message));
      break;
    }

    case 'uninstall': {
      const pluginName = args[1];
      if (!pluginName) {
        console.error(Ansi.prism.rose('Error: Please provide a plugin name to uninstall.'));
        process.exit(1);
      }

      const res = await Installer.uninstallPlugin(pluginName);
      console.log(res.success ? Ansi.prism.emerald('✓ ' + res.message) : Ansi.prism.rose('✕ ' + res.message));
      break;
    }

    case 'doctor': {
      const autoFix = args.includes('--fix');
      console.log(Ansi.bold(Ansi.prism.textPrimary('Running Antigravity Plugins Health Diagnostics...\n')));
      const diags = Doctor.runDiagnostics();

      if (diags.length === 0) {
        console.log(Ansi.prism.emerald('✓ All symlinks, schemas, and frontmatter are 100% healthy!'));
        return;
      }

      for (const d of diags) {
        const icon = d.severity === 'error' ? Ansi.prism.rose('✕ ERROR') : Ansi.prism.amber('⚠ WARN');
        console.log(` ${icon}: ${Ansi.bold(d.title)}`);
        console.log(`   ${Ansi.prism.textSecondary(d.message)}`);
        if (d.remediation) {
          console.log(`   ${Ansi.prism.textDim('Remediation: ' + d.remediation)}`);
        }
      }

      if (autoFix) {
        console.log(Ansi.prism.spark('\nApplying automated repairs...'));
        const fixResult = Doctor.fixAll();
        console.log(` ${fixResult.success ? Ansi.prism.emerald('✓') : Ansi.prism.rose('✕')} ${fixResult.message}`);
      } else {
        console.log(Ansi.prism.textDim('\nRun with `--fix` to apply automated remediations.'));
      }
      break;
    }

    case 'changelog':
    case 'history': {
      const target = args[1];
      if (!target) {
        // Show list of available marketplaces and plugins
        const mps = Registry.getMarketplaces();
        console.log(Ansi.bold(Ansi.prism.textPrimary('Available Changelogs:\n')));
        console.log(Ansi.prism.textSecondary('Marketplaces:'));
        for (const name of Object.keys(mps)) {
          console.log(`  agy-plugin changelog ${name}`);
        }
        console.log(Ansi.prism.textSecondary('\nPlugins:'));
        const plugins = Registry.getAllPlugins();
        for (const p of plugins.slice(0, 15)) {
          console.log(`  agy-plugin changelog ${p.name}`);
        }
        if (plugins.length > 15) {
          console.log(Ansi.prism.textDim(`  ... and ${plugins.length - 15} more plugins`));
        }
        break;
      }

      // Check if target is a marketplace first
      const mps = Registry.getMarketplaces();
      if (mps[target]) {
        const mpLog = ChangelogEngine.getMarketplaceChangelog(target);
        console.log(ChangelogEngine.formatForTerminal(mpLog));
        break;
      }

      // Check if target is a plugin
      const pLog = ChangelogEngine.getPluginChangelog(target);
      console.log(ChangelogEngine.formatForTerminal(pLog));
      break;
    }

    case 'info': {
      const pluginName = args[1];
      if (!pluginName) {
        console.error(Ansi.prism.rose('Error: Please provide a plugin name (e.g. agy-plugin info trawl).'));
        process.exit(1);
      }

      const all = Registry.getAllPlugins();
      const target = all.find(p => p.name === pluginName);
      if (!target) {
        console.error(Ansi.prism.rose(`Error: Plugin "${pluginName}" not found.`));
        process.exit(1);
      }

      const installed = Registry.getInstalledPlugins();
      const isInst = !!installed[target.name];

      console.log(Ansi.bold(Ansi.prism.textPrimary(`Plugin: ${target.name} (v${target.version})`)));
      console.log(` Marketplace: ${Ansi.prism.cyan(target.marketplaceName)} [${target.category}]`);
      console.log(` Status: ${isInst ? Ansi.prism.emerald('✓ Installed') : Ansi.prism.textDim('○ Available')}`);
      console.log(` Description: ${Ansi.prism.textSecondary(target.description)}`);
      console.log(` Location: ${Ansi.prism.textDim(target.absolutePath)}\n`);

      console.log(Ansi.bold(Ansi.prism.textPrimary(`Skills (${target.skills.length}):`)));
      for (const s of target.skills) {
        const sVer = s.version ? Ansi.prism.cyan(`v${s.version}`) : Ansi.prism.textDim(`v${target.version}`);
        console.log(` ✦ ${Ansi.bold(s.name)} ${sVer} ${Ansi.prism.textDim(`(~${s.tokenFootprint} tokens)`)}`);
        if (s.description) {
          console.log(`    ${Ansi.prism.textSecondary(s.description)}`);
        }
      }

      const changelog = ChangelogEngine.getPluginChangelog(target.name, target.marketplaceName);
      if (changelog.found && changelog.sections.length > 0) {
        const latest = changelog.sections[0];
        console.log(Ansi.bold(Ansi.prism.textPrimary(`\nLatest Release Notes (${latest.heading}):`)));
        const excerpt = latest.body.split('\n').slice(0, 5).join('\n');
        console.log(Ansi.prism.textSecondary(excerpt));
        console.log(Ansi.prism.textDim(`\nView complete release history: agy-plugin changelog ${target.name}`));
      }
      break;
    }

    default: {
      console.log(Ansi.bold(Ansi.prism.textPrimary('Antigravity Plugin Manager (agy-plugin / agy-plugins)')));
      console.log(Ansi.prism.textSecondary('Usage:\n'));
      console.log('  agy-plugin marketplace add <repo>        Add a plugin marketplace (e.g. fledgeling-co/fledgeling-plugins)');
      console.log('  agy-plugin marketplace update [name]     Update marketplace repositories');
      console.log('  agy-plugin marketplace list              List registered marketplaces');
      console.log('  agy-plugin marketplace remove <name>     Remove a marketplace');
      console.log('  agy-plugin install <skill[@market]>      Install a skill (e.g. trawl@fledgeling-plugins or trawl)');
      console.log('  agy-plugin uninstall <skill>             Uninstall a skill');
      console.log('  agy-plugin list [--installed]            List all discovered or installed skills');
      console.log('  agy-plugin search <query>                Search plugins and skills');
      console.log('  agy-plugin info <plugin>                 Show detailed plugin & skill versions');
      console.log('  agy-plugin changelog <plugin/market>     View release history and changelog');
      console.log('  agy-plugin update                        Update all marketplaces');
      console.log('  agy-plugin doctor [--fix]                Check for broken links and repair them');
      console.log('  agy-plugin tui                           Launch the interactive visual menu');
      console.log('  agy-plugin mcp                           Start the stdio MCP server for AGY');
      break;
    }
  }
}
