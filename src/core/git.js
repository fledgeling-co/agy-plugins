import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs';
import * as path from 'node:path';

const execFileAsync = promisify(execFile);

export class Git {
  static async run(args, cwd, timeoutMs = 30000) {
    try {
      const { stdout, stderr } = await execFileAsync('git', args, {
        cwd,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
      });
      return { stdout: stdout.trim(), stderr: stderr.trim(), code: 0 };
    } catch (err) {
      return {
        stdout: err.stdout?.toString()?.trim() || '',
        stderr: err.stderr?.toString()?.trim() || err.message || '',
        code: err.code || 1,
      };
    }
  }

  static async isGitInstalled() {
    const res = await this.run(['--version']);
    return res.code === 0;
  }

  static isGitRepo(dir) {
    return fs.existsSync(path.join(dir, '.git'));
  }

  static async getCommitSha(dir) {
    if (!this.isGitRepo(dir)) return '';
    const res = await this.run(['rev-parse', '--short', 'HEAD'], dir);
    return res.code === 0 ? res.stdout : '';
  }

  static async getRemoteUrl(dir) {
    if (!this.isGitRepo(dir)) return '';
    const res = await this.run(['config', '--get', 'remote.origin.url'], dir);
    return res.code === 0 ? res.stdout : '';
  }

  static async cloneSparse(remoteUrl, targetDir) {
    try {
      if (fs.existsSync(targetDir)) {
        return { success: true };
      }

      fs.mkdirSync(path.dirname(targetDir), { recursive: true });

      // Step 1: Partial clone with blob filter
      const cloneRes = await this.run([
        'clone',
        '--filter=blob:none',
        '--no-checkout',
        remoteUrl,
        targetDir,
      ], undefined, 60000);

      if (cloneRes.code !== 0) {
        // Fallback to standard shallow clone if remote server doesn't support blob filtering
        const fallbackRes = await this.run(['clone', '--depth=1', remoteUrl, targetDir], undefined, 60000);
        if (fallbackRes.code !== 0) {
          return { success: false, error: fallbackRes.stderr || cloneRes.stderr };
        }
        return { success: true };
      }

      // Step 2: Initialize sparse-checkout in cone mode
      await this.run(['sparse-checkout', 'init', '--cone'], targetDir);
      
      // Step 3: Checkout root files, manifests, and plugins
      await this.run(['sparse-checkout', 'set', '.claude-plugin', 'plugins'], targetDir);
      await this.run(['checkout'], targetDir);
      
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  static async sparseSet(repoDir, dirPaths) {
    if (!this.isGitRepo(repoDir)) {
      return { success: false, error: 'Not a git repository' };
    }

    try {
      const res = await this.run(['sparse-checkout', 'set', ...dirPaths], repoDir);
      if (res.code !== 0) {
        return { success: false, error: res.stderr };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  static async fetch(repoDir) {
    return this.run(['fetch', 'origin'], repoDir, 20000);
  }

  static async isWorkingTreeDirty(repoDir) {
    if (!this.isGitRepo(repoDir)) return false;
    const res = await this.run(['status', '--porcelain'], repoDir);
    return res.code === 0 && res.stdout.length > 0;
  }

  static async forceResetAndPull(repoDir) {
    if (!this.isGitRepo(repoDir)) {
      return { success: false, updated: false, message: 'Directory is not a git repository' };
    }

    const beforeSha = await this.getCommitSha(repoDir);
    
    // Fetch latest from origin
    await this.run(['fetch', 'origin'], repoDir, 30000);
    
    // Discard local changes and reset hard to origin tracking branch
    const resetRes = await this.run(['reset', '--hard', 'origin/HEAD'], repoDir, 20000);
    if (resetRes.code !== 0) {
      await this.run(['reset', '--hard', 'origin/main'], repoDir, 20000);
    }
    
    // Clean untracked files and directories
    await this.run(['clean', '-fd'], repoDir, 20000);

    const afterSha = await this.getCommitSha(repoDir);
    const updated = beforeSha !== afterSha;

    return {
      success: true,
      updated,
      message: updated ? `Force reset and updated from ${beforeSha} to ${afterSha}` : 'Force reset to latest origin/main',
    };
  }

  static async pullFastForward(repoDir) {
    if (!this.isGitRepo(repoDir)) {
      return { success: false, updated: false, message: 'Directory is not a git repository' };
    }

    const beforeSha = await this.getCommitSha(repoDir);
    const res = await this.run(['pull', '--ff-only'], repoDir, 30000);

    if (res.code !== 0) {
      return { success: false, updated: false, message: res.stderr || 'Pull failed' };
    }

    const afterSha = await this.getCommitSha(repoDir);
    const updated = beforeSha !== afterSha;

    return {
      success: true,
      updated,
      message: updated ? `Updated from ${beforeSha} to ${afterSha}` : 'Already up to date',
    };
  }

  static normalizeRepoUrl(input) {
    const trimmed = input.trim();

    // Local path
    if (trimmed.startsWith('/') || trimmed.startsWith('~') || trimmed.startsWith('.')) {
      const resolved = path.resolve(trimmed.startsWith('~') ? path.join(process.env.HOME || '', trimmed.slice(1)) : trimmed);
      const name = path.basename(resolved);
      return { url: resolved, name, isLocal: true };
    }

    // GitHub shorthand: owner/repo
    if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(trimmed)) {
      const name = trimmed.split('/')[1];
      return { url: `https://github.com/${trimmed}.git`, name, isLocal: false };
    }

    // Full URL (https or git@)
    const nameMatch = trimmed.match(/\/([a-zA-Z0-9_.-]+?)(?:\.git)?$/);
    const name = nameMatch ? nameMatch[1] : 'marketplace';
    return { url: trimmed, name, isLocal: false };
  }
}
