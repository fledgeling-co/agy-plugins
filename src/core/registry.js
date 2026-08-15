import * as fs from 'node:fs';
import * as path from 'node:path';
import { Paths } from './paths.js';
import { Normalizer } from './normalizer.js';

export class Registry {
  static getMarketplaces() {
    Paths.ensureDirs();

    if (fs.existsSync(Paths.knownMarketplacesJson)) {
      try {
        const raw = fs.readFileSync(Paths.knownMarketplacesJson, 'utf8');
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }

    // Auto-import from Claude Code if present
    if (fs.existsSync(Paths.claudeKnownMarketplacesJson)) {
      try {
        const raw = fs.readFileSync(Paths.claudeKnownMarketplacesJson, 'utf8');
        const claudeMps = JSON.parse(raw);
        const imported = {};

        for (const [name, entry] of Object.entries(claudeMps)) {
          const installLoc = entry.source?.source === 'directory' 
            ? entry.source.path 
            : path.join(Paths.marketplacesDir, name);

          imported[name] = {
            name,
            source: entry.source,
            installLocation: installLoc,
            lastUpdated: entry.lastUpdated || new Date().toISOString(),
            autoUpdate: entry.autoUpdate ?? true,
          };
        }

        this.saveMarketplaces(imported);
        return imported;
      } catch {
        // ignore
      }
    }

    return {};
  }

  static saveMarketplaces(marketplaces) {
    Paths.ensureDirs();
    fs.writeFileSync(Paths.knownMarketplacesJson, JSON.stringify(marketplaces, null, 2) + '\n', 'utf8');
  }

  static addMarketplace(name, source, installLocation, autoUpdate = true) {
    const marketplaces = this.getMarketplaces();
    const entry = {
      name,
      source,
      installLocation,
      lastUpdated: new Date().toISOString(),
      autoUpdate,
    };
    marketplaces[name] = entry;
    this.saveMarketplaces(marketplaces);
    return entry;
  }

  static removeMarketplace(name) {
    const marketplaces = this.getMarketplaces();
    if (!marketplaces[name]) return false;
    delete marketplaces[name];
    this.saveMarketplaces(marketplaces);
    return true;
  }

  static toggleAutoUpdate(name) {
    const marketplaces = this.getMarketplaces();
    if (!marketplaces[name]) return false;
    marketplaces[name].autoUpdate = !marketplaces[name].autoUpdate;
    this.saveMarketplaces(marketplaces);
    return marketplaces[name].autoUpdate;
  }

  static getInstalledPlugins() {
    Paths.ensureDirs();

    if (fs.existsSync(Paths.installedPluginsJson)) {
      try {
        const raw = fs.readFileSync(Paths.installedPluginsJson, 'utf8');
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }

    const installed = {};
    if (fs.existsSync(Paths.geminiConfigPlugins)) {
      const entries = fs.readdirSync(Paths.geminiConfigPlugins);
      for (const e of entries) {
        const fullPath = path.join(Paths.geminiConfigPlugins, e);
        try {
          const stat = fs.lstatSync(fullPath);
          if (stat.isSymbolicLink() || stat.isDirectory()) {
            const target = stat.isSymbolicLink() ? fs.readlinkSync(fullPath) : fullPath;
            const resolved = path.resolve(path.dirname(fullPath), target);
            
            // Auto-heal missing plugin.json so Antigravity always discovers it
            if (fs.existsSync(resolved)) {
              Normalizer.ensureCompliantManifest(resolved, e);
            }

            installed[e] = {
              name: e,
              version: '1.0.0',
              marketplace: 'imported',
              installedAt: stat.ctime.toISOString(),
              lastUpdated: stat.mtime.toISOString(),
              sourcePath: target,
              symlinkPath: fullPath,
              enabled: true,
            };
          }
        } catch {
          // ignore
        }
      }
      this.saveInstalledPlugins(installed);
    }

    return installed;
  }

  static saveInstalledPlugins(records) {
    Paths.ensureDirs();
    fs.writeFileSync(Paths.installedPluginsJson, JSON.stringify(records, null, 2) + '\n', 'utf8');
  }

  static getPluginsForMarketplace(mpName) {
    const marketplaces = this.getMarketplaces();
    const entry = marketplaces[mpName];
    if (!entry || !fs.existsSync(entry.installLocation)) return [];
    return Normalizer.discoverPluginsInMarketplace(mpName, entry.installLocation);
  }

  static getAllPlugins() {
    const marketplaces = this.getMarketplaces();
    const installed = this.getInstalledPlugins();
    const allPlugins = [];

    for (const [mpName, mpEntry] of Object.entries(marketplaces)) {
      const loc = mpEntry.installLocation;
      if (!fs.existsSync(loc)) continue;

      const plugins = Normalizer.discoverPluginsInMarketplace(mpName, loc);
      for (const p of plugins) {
        p.marketplaceRepo = mpEntry.source?.repo || mpEntry.source?.path || mpName;
        if (installed[p.name]) {
          p.installed = true;
          p.installedVersion = installed[p.name].version;
        }
        allPlugins.push(p);
      }
    }

    return allPlugins;
  }

  static searchPlugins(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) return this.getAllPlugins();
    const plugins = this.getAllPlugins();
    return plugins.filter(p => (
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.marketplaceName.toLowerCase().includes(q) ||
      p.skills.some(s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
    ));
  }
}
