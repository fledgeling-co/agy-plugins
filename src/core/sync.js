import * as fs from 'node:fs';
import { Git } from './git.js';
import { Registry } from './registry.js';
import { Normalizer } from './normalizer.js';

export class SyncEngine {
  static async syncMarketplace(entry) {
    if (!fs.existsSync(entry.installLocation)) {
      if (entry.source?.source === 'github' || entry.source?.source === 'git') {
        const repoUrl = entry.source.url || (entry.source.repo ? `https://github.com/${entry.source.repo}.git` : '');
        if (repoUrl) {
          const cloneRes = await Git.cloneSparse(repoUrl, entry.installLocation);
          if (cloneRes.success) {
            entry.lastUpdated = new Date().toISOString();
            entry.commitSha = await Git.getCommitSha(entry.installLocation);
            const mps = Registry.getMarketplaces();
            mps[entry.name] = entry;
            Registry.saveMarketplaces(mps);

            // Auto-heal manifests for all skills in cloned marketplace
            Normalizer.discoverPluginsInMarketplace(entry.name, entry.installLocation);

            return {
              marketplace: entry.name,
              success: true,
              updated: true,
              message: 'Cloned and initialized repository',
            };
          } else {
            return {
              marketplace: entry.name,
              success: false,
              updated: false,
              message: cloneRes.error || 'Failed to clone repository',
            };
          }
        }
      }

      return {
        marketplace: entry.name,
        success: false,
        updated: false,
        message: `Directory does not exist: ${entry.installLocation}`,
      };
    }

    if (!Git.isGitRepo(entry.installLocation)) {
      Normalizer.discoverPluginsInMarketplace(entry.name, entry.installLocation);
      return {
        marketplace: entry.name,
        success: true,
        updated: false,
        message: 'Local directory (not a git repository)',
      };
    }

    const pullRes = await Git.pullFastForward(entry.installLocation);
    if (pullRes.success) {
      entry.lastUpdated = new Date().toISOString();
      entry.commitSha = await Git.getCommitSha(entry.installLocation);
      const mps = Registry.getMarketplaces();
      mps[entry.name] = entry;
      Registry.saveMarketplaces(mps);

      // Auto-heal manifests for all skills in pulled marketplace
      Normalizer.discoverPluginsInMarketplace(entry.name, entry.installLocation);
    }

    return {
      marketplace: entry.name,
      success: pullRes.success,
      updated: pullRes.updated,
      message: pullRes.message,
    };
  }

  static async syncAll(forceAll = false) {
    const marketplaces = Registry.getMarketplaces();
    const results = [];

    for (const entry of Object.values(marketplaces)) {
      if (forceAll || entry.autoUpdate) {
        const res = await this.syncMarketplace(entry);
        results.push(res);
      }
    }

    return results;
  }
}
