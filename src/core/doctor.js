import * as fs from 'node:fs';
import * as path from 'node:path';
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
            if (!fs.existsSync(manifestPath)) {
              diagnostics.push({
                id: `missing-manifest-${entry}`,
                severity: 'warning',
                title: `Missing plugin.json: ${entry}`,
                message: `Plugin directory lacks top-level plugin.json required by Antigravity CLI.`,
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
