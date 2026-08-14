import { Terminal } from './terminal.js';
import { Ansi } from './ansi.js';
import { Registry } from '../core/registry.js';
import { Installer } from '../core/installer.js';
import { SyncEngine } from '../core/sync.js';
import { Doctor } from '../core/doctor.js';

export class TuiApp {
  constructor() {
    this.view = 'catalog'; // 'catalog' | 'marketplaces' | 'installed' | 'diagnostics'
    this.selectedIndex = 0;
    this.selectedMpIndex = 0;
    this.selectedDiagIndex = 0;
    
    this.plugins = [];
    this.filteredPlugins = [];
    this.marketplaces = {};
    this.diagnostics = [];
    
    this.searchQuery = '';
    this.isSearching = false;
    this.toastMessage = '';
    this.toastTimer = null;

    this.refreshData();
  }

  refreshData() {
    this.marketplaces = Registry.getMarketplaces();
    this.plugins = Registry.getAllPlugins();
    this.filterPlugins();
    this.diagnostics = Doctor.runDiagnostics();
  }

  filterPlugins() {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredPlugins = [...this.plugins];
    } else {
      this.filteredPlugins = this.plugins.filter(p => {
        return (
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.marketplaceName.toLowerCase().includes(q) ||
          p.skills.some(s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
        );
      });
    }

    if (this.selectedIndex >= this.filteredPlugins.length) {
      this.selectedIndex = Math.max(0, this.filteredPlugins.length - 1);
    }
  }

  showToast(msg) {
    this.toastMessage = msg;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastMessage = '';
      this.render();
    }, 2800);
    this.render();
  }

  start() {
    Terminal.start();
    Terminal.onKey(this.handleKey.bind(this));
    process.stdout.on('resize', () => this.render());
    this.render();
  }

  async handleKey(key) {
    if (this.isSearching) {
      if (key.name === 'escape' || key.name === 'enter') {
        this.isSearching = false;
        this.render();
        return;
      }
      if (key.name === 'backspace') {
        this.searchQuery = this.searchQuery.slice(0, -1);
        this.filterPlugins();
        this.render();
        return;
      }
      if (key.char && key.char.length === 1 && !key.ctrl) {
        this.searchQuery += key.char;
        this.filterPlugins();
        this.render();
        return;
      }
    }

    if (key.name === '1') {
      this.view = 'catalog';
      this.render();
      return;
    }
    if (key.name === '2') {
      this.view = 'marketplaces';
      this.render();
      return;
    }
    if (key.name === '3') {
      this.view = 'installed';
      this.render();
      return;
    }
    if (key.name === '4') {
      this.view = 'diagnostics';
      this.render();
      return;
    }

    if (key.char === '/' || (key.ctrl && key.name === 'k')) {
      this.isSearching = true;
      this.render();
      return;
    }

    if (this.view === 'catalog') {
      if (key.name === 'up') {
        if (this.selectedIndex > 0) {
          this.selectedIndex--;
          this.render();
        }
      } else if (key.name === 'down') {
        if (this.selectedIndex < this.filteredPlugins.length - 1) {
          this.selectedIndex++;
          this.render();
        }
      } else if (key.name === 'space' || key.char === 'i') {
        await this.toggleCurrentPlugin();
      } else if (key.char === 'u') {
        await this.syncAllMarketplaces();
      }
    } else if (this.view === 'marketplaces') {
      const mpKeys = Object.keys(this.marketplaces);
      if (key.name === 'up' && this.selectedMpIndex > 0) {
        this.selectedMpIndex--;
        this.render();
      } else if (key.name === 'down' && this.selectedMpIndex < mpKeys.length - 1) {
        this.selectedMpIndex++;
        this.render();
      } else if (key.char === 'u') {
        const mp = mpKeys[this.selectedMpIndex];
        if (mp) await this.syncSingleMarketplace(mp);
      } else if (key.name === 'space') {
        const mp = mpKeys[this.selectedMpIndex];
        if (mp) {
          const auto = Registry.toggleAutoUpdate(mp);
          this.showToast(`Auto-update for ${mp}: ${auto ? 'ENABLED' : 'PAUSED'}`);
          this.refreshData();
        }
      }
    } else if (this.view === 'diagnostics') {
      if (key.name === 'up' && this.selectedDiagIndex > 0) {
        this.selectedDiagIndex--;
        this.render();
      } else if (key.name === 'down' && this.selectedDiagIndex < this.diagnostics.length - 1) {
        this.selectedDiagIndex++;
        this.render();
      } else if (key.name === 'enter') {
        const diag = this.diagnostics[this.selectedDiagIndex];
        if (diag && diag.canAutoFix) {
          const res = Doctor.applyAutoFix(diag);
          this.showToast(res.message);
          this.refreshData();
        }
      }
    } else if (this.view === 'installed') {
      const installed = this.plugins.filter(p => p.installed);
      if (key.name === 'up' && this.selectedIndex > 0) {
        this.selectedIndex--;
        this.render();
      } else if (key.name === 'down' && this.selectedIndex < installed.length - 1) {
        this.selectedIndex++;
        this.render();
      } else if (key.char === 'd' || key.name === 'space') {
        const target = installed[this.selectedIndex];
        if (target) {
          await Installer.uninstallPlugin(target.name);
          this.showToast(`Uninstalled ${target.name}`);
          this.refreshData();
        }
      }
    }

    if (key.name === 'q' && !this.isSearching) {
      Terminal.stopAndExit(0);
    }
  }

  async toggleCurrentPlugin() {
    const plugin = this.filteredPlugins[this.selectedIndex];
    if (!plugin) return;

    if (plugin.installed) {
      const res = await Installer.uninstallPlugin(plugin.name);
      this.showToast(res.message);
    } else {
      const res = await Installer.installPlugin(plugin);
      this.showToast(res.message);
    }

    this.refreshData();
  }

  async syncSingleMarketplace(name) {
    const entry = this.marketplaces[name];
    if (!entry) return;

    this.showToast(`Syncing ${name}...`);
    const res = await SyncEngine.syncMarketplace(entry);
    this.showToast(res.message);
    this.refreshData();
  }

  async syncAllMarketplaces() {
    this.showToast(`Syncing all active marketplaces...`);
    const results = await SyncEngine.syncAll(true);
    const updatedCount = results.filter(r => r.updated).length;
    this.showToast(`Sync complete (${updatedCount} updated)`);
    this.refreshData();
  }

  render() {
    const width = Terminal.width;
    const height = Terminal.height;

    let buf = Ansi.moveTo(1, 1);

    // 1. Top Brand Banner
    const brand = Ansi.prism.spark(' ✦ ') + Ansi.bold(Ansi.prism.textPrimary('Antigravity Customization Studio')) + Ansi.prism.textDim(' (AGY Native)');
    const countInstalled = this.plugins.filter(p => p.installed).length;
    const stats = Ansi.prism.cyan(`Sparse Cone: Active`) + Ansi.prism.textDim(' │ ') + Ansi.prism.emerald(`${countInstalled} Installed`);
    
    const bannerLine = Ansi.pad(brand, width - Ansi.stripAnsi(stats).length) + stats;
    buf += bannerLine + '\n';

    // 2. Navigation Ribbon
    const tabs = [
      { id: 'catalog', label: '✦ Explore & Skills', key: '1' },
      { id: 'marketplaces', label: '⛃ Marketplaces', key: '2' },
      { id: 'installed', label: `✓ Installed (${countInstalled})`, key: '3' },
      { id: 'diagnostics', label: `⚠ Doctor (${this.diagnostics.length})`, key: '4' },
    ];

    let navStr = '';
    for (const t of tabs) {
      const isActive = this.view === t.id;
      if (isActive) {
        navStr += Ansi.bgRgb(49, 46, 129, Ansi.bold(Ansi.white(` ${t.label} `))) + ' ';
      } else {
        navStr += Ansi.prism.textMuted(` ${t.label} `) + Ansi.prism.textDim(`[${t.key}] `);
      }
    }

    const searchPrompt = this.isSearching 
      ? Ansi.prism.spark('⌕ ') + Ansi.bold(Ansi.white(this.searchQuery)) + Ansi.prism.spark('█')
      : Ansi.prism.textDim(this.searchQuery ? `⌕ ${this.searchQuery}` : '⌕ Press / to filter');
    
    const navLine = Ansi.pad(navStr, width - Ansi.stripAnsi(searchPrompt).length) + searchPrompt;
    buf += navLine + '\n';
    buf += Ansi.prism.textDim('─'.repeat(width)) + '\n';

    // 3. Main Body
    const bodyHeight = height - 6;

    if (this.view === 'catalog') {
      buf += this.renderCatalogView(width, bodyHeight);
    } else if (this.view === 'marketplaces') {
      buf += this.renderMarketplacesView(width, bodyHeight);
    } else if (this.view === 'installed') {
      buf += this.renderInstalledView(width, bodyHeight);
    } else if (this.view === 'diagnostics') {
      buf += this.renderDiagnosticsView(width, bodyHeight);
    }

    // 4. Toast Notification
    if (this.toastMessage) {
      const toastText = ` ✦ ${this.toastMessage} `;
      const toastPadded = Ansi.bgRgb(30, 27, 75, Ansi.prism.spark(Ansi.bold(toastText)));
      buf += Ansi.moveTo(height - 2, Math.max(2, width - Ansi.stripAnsi(toastText).length - 4)) + toastPadded;
    }

    // 5. Footer Bar
    const footerLeft = Ansi.prism.textDim('[↑/↓] Navigate  ') +
      Ansi.prism.cyan('[Space]') + Ansi.prism.textSecondary(' Toggle Install  ') +
      Ansi.prism.cyan('[u]') + Ansi.prism.textSecondary(' Fast-Forward Pull  ') +
      Ansi.prism.cyan('[/]') + Ansi.prism.textSecondary(' Filter  ') +
      Ansi.prism.cyan('[q]') + Ansi.prism.textSecondary(' Exit');
    const footerRight = Ansi.prism.textDim('~/.gemini/config/plugins');
    const footerLine = Ansi.moveTo(height, 1) + Ansi.prism.textDim('─'.repeat(width)) + '\n' +
      Ansi.pad(footerLeft, width - Ansi.stripAnsi(footerRight).length) + footerRight;

    buf += footerLine;

    process.stdout.write(buf);
  }

  renderCatalogView(width, height) {
    const leftWidth = Math.floor(width * 0.52);
    const rightWidth = width - leftWidth - 1;
    let out = '';

    const selectedPlugin = this.filteredPlugins[this.selectedIndex];
    const leftLines = [];
    const rightLines = [];

    leftLines.push(Ansi.prism.textMuted(Ansi.bold(`AVAILABLE PLUGINS & SKILLS (${this.filteredPlugins.length})`)));
    leftLines.push('');

    for (let i = 0; i < this.filteredPlugins.length; i++) {
      const p = this.filteredPlugins[i];
      const isSel = i === this.selectedIndex;
      const mark = p.installed ? Ansi.prism.emerald('✓') : Ansi.prism.textDim('◉');
      const name = p.installed ? Ansi.bold(Ansi.prism.emerald(p.name)) : Ansi.prism.textPrimary(p.name);
      const cat = Ansi.prism.textDim(`[${p.category}]`);
      const repo = Ansi.prism.textDim(p.marketplaceName);

      const header = `${mark} ${name} ${cat} ${repo}`;
      const summary = Ansi.prism.textSecondary(`  ${Ansi.truncate(p.description, leftWidth - 4)}`);

      if (isSel) {
        leftLines.push(Ansi.prism.cardHover(Ansi.bold(`› ${Ansi.truncate(header, leftWidth - 2)}`)));
        leftLines.push(Ansi.prism.cardHover(summary));
      } else {
        leftLines.push(`  ${Ansi.truncate(header, leftWidth - 2)}`);
        leftLines.push(summary);
      }
    }

    if (selectedPlugin) {
      rightLines.push(Ansi.bold(Ansi.prism.textPrimary(selectedPlugin.name)) + ' ' + Ansi.prism.cyan(`v${selectedPlugin.version}`));
      rightLines.push(Ansi.prism.textDim(`Origin: ${selectedPlugin.marketplaceRepo} (Sparse Cone Mode)`));
      rightLines.push(selectedPlugin.installed 
        ? Ansi.prism.emerald(`● Installed in AGY (~/.gemini/config/plugins/${selectedPlugin.name})`)
        : Ansi.prism.textDim(`○ Available to install (Press Space)`)
      );
      rightLines.push(Ansi.prism.textDim('─'.repeat(rightWidth - 2)));
      
      rightLines.push(Ansi.prism.spark(Ansi.bold('ACTIVATION TRIGGER (Level 1 Frontmatter)')));
      const descWrapped = this.wrapText(selectedPlugin.description || 'No description provided.', rightWidth - 4);
      for (const dw of descWrapped) {
        rightLines.push(Ansi.prism.textSecondary(` "${dw}"`));
      }
      rightLines.push('');

      rightLines.push(Ansi.prism.spark(Ansi.bold('TECHNICAL CAPABILITY MATRIX')));
      rightLines.push(` Token Footprint:   ${Ansi.prism.cyan('~110 tok discovery')}`);
      rightLines.push(` Schema Spec:       ${Ansi.prism.emerald('✓ AgentSkills.io v1')}`);
      rightLines.push(` Rules Provided:    ${selectedPlugin.providesRules ? Ansi.prism.emerald('Yes') : Ansi.prism.textDim('No')}`);
      rightLines.push(` MCP Servers:       ${selectedPlugin.providesMcp ? Ansi.prism.cyan(selectedPlugin.mcpServerNames?.join(', ') || 'Yes') : Ansi.prism.textDim('None')}`);
      rightLines.push(` Staging Target:    ${Ansi.prism.textDim(`~/.gemini/config/plugins/${selectedPlugin.name}`)}`);
    } else {
      rightLines.push(Ansi.prism.textDim('No plugin selected.'));
    }

    for (let r = 0; r < height; r++) {
      const left = leftLines[r] || '';
      const right = rightLines[r] || '';
      const paddedLeft = Ansi.pad(left, leftWidth);
      out += `${paddedLeft}${Ansi.prism.textDim('│')} ${right}\n`;
    }

    return out;
  }

  renderMarketplacesView(width, height) {
    let out = '';
    const mps = Object.values(this.marketplaces);

    out += Ansi.bold(Ansi.prism.textPrimary(`REGISTERED MARKETPLACES (${mps.length})`)) + '\n';
    out += Ansi.prism.textDim('Managed sparse repositories with background fast-forward sync.\n\n');

    for (let i = 0; i < mps.length; i++) {
      const mp = mps[i];
      const isSel = i === this.selectedMpIndex;
      const count = this.plugins.filter(p => p.marketplaceName === mp.name).length;
      const installedCount = this.plugins.filter(p => p.marketplaceName === mp.name && p.installed).length;
      
      const autoStr = mp.autoUpdate ? Ansi.prism.cyan('[Auto-Sync: ON]') : Ansi.prism.textDim('[Auto-Sync: OFF]');
      const title = `${Ansi.bold(mp.name)}  ${autoStr}  ${Ansi.prism.emerald(`${count} available • ${installedCount} installed`)}`;
      const loc = Ansi.prism.textDim(`Source: ${mp.source?.repo || mp.source?.path || mp.name} (Updated: ${(mp.lastUpdated || '').slice(0, 10)})`);

      if (isSel) {
        out += Ansi.prism.cardHover(`› ${title}`) + '\n';
        out += Ansi.prism.cardHover(`  ${loc}`) + '\n\n';
      } else {
        out += `  ${title}\n`;
        out += `  ${loc}\n\n`;
      }
    }

    return out;
  }

  renderInstalledView(width, height) {
    let out = '';
    const installed = this.plugins.filter(p => p.installed);

    out += Ansi.bold(Ansi.prism.textPrimary(`ACTIVE INSTALLED PLUGINS IN AGY (${installed.length})`)) + '\n';
    out += Ansi.prism.textDim('Live symlinks in ~/.gemini/config/plugins\n\n');

    for (let i = 0; i < installed.length; i++) {
      const p = installed[i];
      const isSel = i === this.selectedIndex;
      const title = `${Ansi.prism.emerald('✓')} ${Ansi.bold(p.name)} ${Ansi.prism.textDim(`[${p.category}]`)} v${p.version}`;
      const path = Ansi.prism.textDim(`Symlink: ~/.gemini/config/plugins/${p.name} → ${p.marketplaceName}`);

      if (isSel) {
        out += Ansi.prism.cardHover(`› ${title}`) + '\n';
        out += Ansi.prism.cardHover(`  ${path}`) + '\n\n';
      } else {
        out += `  ${title}\n`;
        out += `  ${path}\n\n`;
      }
    }

    return out;
  }

  renderDiagnosticsView(width, height) {
    let out = '';
    out += Ansi.bold(Ansi.prism.textPrimary(`DOCTOR & INTEGRITY DIAGNOSTICS (${this.diagnostics.length} Issues)`)) + '\n';
    out += Ansi.prism.textDim('Health verification across symlinks, schemas, and executables.\n\n');

    if (this.diagnostics.length === 0) {
      out += Ansi.prism.emerald('✓ All symlinks, schemas, and frontmatter are 100% healthy!\n');
      return out;
    }

    for (let i = 0; i < this.diagnostics.length; i++) {
      const diag = this.diagnostics[i];
      const isSel = i === this.selectedDiagIndex;
      const icon = diag.severity === 'error' ? Ansi.prism.rose('✕') : Ansi.prism.amber('⚠');
      const title = `${icon} ${Ansi.bold(diag.title)}`;
      const msg = Ansi.prism.textSecondary(`  ${diag.message}`);
      const fix = diag.canAutoFix ? Ansi.prism.cyan(`  [Press Enter to Auto-Fix]`) : '';

      if (isSel) {
        out += Ansi.prism.cardHover(`› ${title}`) + '\n';
        out += Ansi.prism.cardHover(msg) + '\n';
        if (fix) out += Ansi.prism.cardHover(fix) + '\n\n';
      } else {
        out += `  ${title}\n`;
        out += `${msg}\n`;
        if (fix) out += `${fix}\n\n`;
      }
    }

    return out;
  }

  wrapText(text, maxWidth) {
    const words = String(text).split(' ');
    const lines = [];
    let current = '';

    for (const w of words) {
      if ((current + ' ' + w).length <= maxWidth) {
        current += (current ? ' ' : '') + w;
      } else {
        if (current) lines.push(current);
        current = w;
      }
    }
    if (current) lines.push(current);
    return lines;
  }
}
