import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';

export class Paths {
  static _customHome = null;

  static setHome(customPath) {
    this._customHome = customPath;
  }

  static resetHome() {
    this._customHome = null;
  }

  static get home() {
    return this._customHome || process.env.AGY_HOME || os.homedir();
  }

  static get geminiRoot() {
    return path.join(this.home, '.gemini');
  }

  static get geminiConfig() {
    return path.join(this.geminiRoot, 'config');
  }

  static get geminiConfigPlugins() {
    return path.join(this.geminiConfig, 'plugins');
  }

  static get geminiConfigJson() {
    return path.join(this.geminiConfig, 'config.json');
  }

  static get pluginsRoot() {
    return path.join(this.geminiRoot, 'plugins');
  }

  static get marketplacesDir() {
    return path.join(this.pluginsRoot, 'marketplaces');
  }

  static get knownMarketplacesJson() {
    return path.join(this.pluginsRoot, 'known_marketplaces.json');
  }

  static get installedPluginsJson() {
    return path.join(this.pluginsRoot, 'installed_plugins.json');
  }

  static get claudeKnownMarketplacesJson() {
    return path.join(this.home, '.claude', 'plugins', 'known_marketplaces.json');
  }

  static get claudeInstalledPluginsJson() {
    return path.join(this.home, '.claude', 'plugins', 'installed_plugins.json');
  }

  static ensureDirs() {
    const dirs = [
      this.geminiRoot,
      this.geminiConfig,
      this.geminiConfigPlugins,
      this.pluginsRoot,
      this.marketplacesDir,
    ];

    for (const d of dirs) {
      if (!fs.existsSync(d)) {
        fs.mkdirSync(d, { recursive: true });
      }
    }
  }

  static resolveTilde(filepath) {
    if (filepath.startsWith('~/') || filepath === '~') {
      return path.join(this.home, filepath.slice(1));
    }
    return path.resolve(filepath);
  }

  static displayPath(filepath) {
    if (filepath.startsWith(this.home)) {
      return '~' + filepath.slice(this.home.length);
    }
    return filepath;
  }
}
