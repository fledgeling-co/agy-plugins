import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Paths } from './paths.js';
import { Registry } from './registry.js';
import { Normalizer } from './normalizer.js';

export class Doctor {
  static runDiagnostics() {
    const diagnostics = [];
    Paths.ensureDirs();

    // 1. Check symlinks and directories in ~/.gemini/config/plugins/
    if (fs.existsSync(Paths.geminiConfigPlugins)) {
      const entries = fs.readdirSync(Paths.geminiConfigPlugins);
      for (const entry of entries) {
        const fullPath = path.join(Paths.geminiConfigPlugins, entry);
        try {
          const stat = fs.lstatSync(fullPath);
          let targetDir = fullPath;

          if (stat.isSymbolicLink()) {
            const target = fs.readlinkSync(fullPath);
            targetDir = path.resolve(path.dirname(fullPath), target);
            if (!fs.existsSync(targetDir)) {
              diagnostics.push({
                id: `broken-symlink-${entry}`,
                severity: 'error',
                title: `Broken Symlink: ${entry}`,
                message: `Symlink points to non-existent target: ${targetDir}`,
                remediation: `Remove broken symlink or re-clone marketplace repository.`,
                canAutoFix: true,
                autoFixAction: 'remove_broken',
                targetPath: fullPath,
              });
              continue;
            }
          }

          if (fs.statSync(targetDir).isDirectory()) {
            const manifestPath = path.join(targetDir, 'plugin.json');
            const claudeManifest = path.join(targetDir, '.claude-plugin', 'plugin.json');
            if (!fs.existsSync(manifestPath) && !fs.existsSync(claudeManifest)) {
              diagnostics.push({
                id: `missing-manifest-${entry}`,
                severity: 'warning',
                title: `Missing plugin.json: ${entry}`,
                message: `Plugin directory lacks plugin.json or .claude-plugin/plugin.json manifest.`,
                remediation: `Generate standard plugin.json marker.`,
                canAutoFix: true,
                autoFixAction: 'fix_manifest',
                targetPath: targetDir,
              });
            }
          }
        } catch (err) {
          diagnostics.push({
            id: `stat-error-${entry}`,
            severity: 'error',
            title: `Unreadable Plugin Entry: ${entry}`,
            message: err.message,
            canAutoFix: false,
          });
        }
      }
    }

    // 2. Validate all discovered skills frontmatter
    const allPlugins = Registry.getAllPlugins();
    for (const plugin of allPlugins) {
      for (const skill of plugin.skills) {
        if (fs.existsSync(skill.path)) {
          const content = fs.readFileSync(skill.path, 'utf8');
          const frontmatter = Normalizer.parseSkillFrontmatter(content);

          if (!frontmatter.name) {
            diagnostics.push({
              id: `missing-skill-name-${plugin.name}-${skill.name}`,
              severity: 'warning',
              title: `Missing YAML frontmatter 'name' in skill: ${skill.name}`,
              message: `SKILL.md must declare name in frontmatter for AGY progressive discovery.`,
              canAutoFix: false,
              targetPath: skill.path,
            });
          }

          if (!frontmatter.description) {
            diagnostics.push({
              id: `missing-skill-desc-${plugin.name}-${skill.name}`,
              severity: 'warning',
              title: `Missing YAML frontmatter 'description' in skill: ${skill.name}`,
              message: `SKILL.md must declare description so the agent knows when to activate it.`,
              canAutoFix: false,
              targetPath: skill.path,
            });
          } else if (frontmatter.description.length > 1024) {
            diagnostics.push({
              id: `oversized-desc-${plugin.name}-${skill.name}`,
              severity: 'info',
              title: `Long description frontmatter in skill: ${skill.name} (${frontmatter.description.length} chars)`,
              message: `Level 1 discovery descriptions should be concise (<1024 chars) to minimize context token budget.`,
              canAutoFix: false,
              targetPath: skill.path,
            });
          }
        }
      }
    }

    // 3. Check for dirty marketplace working trees that block git pulls
    const marketplaces = Registry.getMarketplaces();
    for (const [mpName, mp] of Object.entries(marketplaces)) {
      if (fs.existsSync(mp.installLocation) && fs.existsSync(path.join(mp.installLocation, '.git'))) {
        try {
          const stdout = execFileSync('git', ['status', '--porcelain'], {
            cwd: mp.installLocation,
            encoding: 'utf8',
            timeout: 5000,
          }).trim();
          if (stdout.length > 0) {
            diagnostics.push({
              id: `dirty-marketplace-${mpName}`,
              severity: 'warning',
              title: `Marketplace Working Tree Modified: ${mpName}`,
              message: `Local modifications in ${mp.installLocation} prevent clean git pulls and fast-forward updates.`,
              remediation: `Force-reset and clean marketplace clone to match origin tracking branch.`,
              canAutoFix: true,
              autoFixAction: 'reset_marketplace_clean',
              targetPath: mp.installLocation,
            });
          }
        } catch {
          // ignore
        }
      }
    }

    return diagnostics;
  }

  static applyAutoFix(diagnostic) {
    if (!diagnostic.canAutoFix || !diagnostic.targetPath) {
      return { success: false, message: 'No automatic fix available for this issue.' };
    }

    try {
      if (diagnostic.autoFixAction === 'remove_broken') {
        fs.unlinkSync(diagnostic.targetPath);
        return { success: true, message: `Removed broken symlink: ${diagnostic.targetPath}` };
      }

      if (diagnostic.autoFixAction === 'fix_manifest') {
        const pluginName = path.basename(diagnostic.targetPath);
        Normalizer.ensureCompliantManifest(diagnostic.targetPath, pluginName);
        return { success: true, message: `Created compliant plugin.json for ${pluginName}` };
      }

      if (diagnostic.autoFixAction === 'reset_marketplace_clean') {
        execFileSync('git', ['fetch', 'origin'], { cwd: diagnostic.targetPath, timeout: 20000 });
        try {
          execFileSync('git', ['reset', '--hard', 'origin/HEAD'], { cwd: diagnostic.targetPath, timeout: 10000 });
        } catch {
          execFileSync('git', ['reset', '--hard', 'origin/main'], { cwd: diagnostic.targetPath, timeout: 10000 });
        }
        execFileSync('git', ['clean', '-fd'], { cwd: diagnostic.targetPath, timeout: 10000 });
        return { success: true, message: `Cleaned and reset marketplace working tree: ${path.basename(diagnostic.targetPath)}` };
      }

      return { success: false, message: 'Unknown fix action' };
    } catch (err) {
      return { success: false, message: `Fix failed: ${err.message}` };
    }
  }

  static fixAll() {
    const diags = this.runDiagnostics();
    let fixed = 0;
    for (const d of diags) {
      if (d.canAutoFix) {
        const res = this.applyAutoFix(d);
        if (res.success) fixed++;
      }
    }
    return {
      success: true,
      message: `Successfully resolved ${fixed} diagnostic issue(s)`,
    };
  }
}
