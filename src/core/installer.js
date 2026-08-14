import * as fs from 'node:fs';
import * as path from 'node:path';
import { Paths } from './paths.js';
import { Registry } from './registry.js';
import { Normalizer } from './normalizer.js';

export class Installer {
  static async installPlugin(plugin) {
    Paths.ensureDirs();

    const symlinkTarget = plugin.absolutePath;
    if (!fs.existsSync(symlinkTarget)) {
      return { success: false, message: `Source directory does not exist: ${symlinkTarget}` };
    }

    Normalizer.ensureCompliantManifest(symlinkTarget, plugin.name);

    const destPath = path.join(Paths.geminiConfigPlugins, plugin.name);

    try {
      if (fs.existsSync(destPath) || this.isSymlink(destPath)) {
        fs.rmSync(destPath, { recursive: true, force: true });
      }

      fs.symlinkSync(symlinkTarget, destPath, 'dir');

      const installed = Registry.getInstalledPlugins();
      installed[plugin.name] = {
        name: plugin.name,
        version: plugin.version || '1.0.0',
        marketplace: plugin.marketplaceName,
        installedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        sourcePath: symlinkTarget,
        symlinkPath: destPath,
        enabled: true,
      };
      Registry.saveInstalledPlugins(installed);

      return {
        success: true,
        message: `Successfully installed ${plugin.name} → ${destPath}`,
      };
    } catch (err) {
      return {
        success: false,
        message: `Failed to create symlink: ${err.message}`,
      };
    }
  }

  static async uninstallPlugin(pluginName) {
    const destPath = path.join(Paths.geminiConfigPlugins, pluginName);

    try {
      if (fs.existsSync(destPath) || this.isSymlink(destPath)) {
        fs.rmSync(destPath, { recursive: true, force: true });
      }

      const installed = Registry.getInstalledPlugins();
      if (installed[pluginName]) {
        delete installed[pluginName];
        Registry.saveInstalledPlugins(installed);
      }

      return {
        success: true,
        message: `Successfully uninstalled ${pluginName}`,
      };
    } catch (err) {
      return {
        success: false,
        message: `Failed to uninstall ${pluginName}: ${err.message}`,
      };
    }
  }

  static isSymlink(filepath) {
    try {
      return fs.lstatSync(filepath).isSymbolicLink();
    } catch {
      return false;
    }
  }
}
