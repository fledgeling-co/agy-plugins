import blessed from 'neo-blessed';
import { Registry } from '../core/registry.js';
import { Installer } from '../core/installer.js';
import { SyncEngine } from '../core/sync.js';
import { Doctor } from '../core/doctor.js';

export class TuiApp {
  constructor() {
    this.currentTab = 'catalog'; // 'catalog' | 'marketplaces' | 'installed' | 'doctor'
    this.searchQuery = '';
    this.selectedIndex = 0;
    this.selectedMpIndex = 0;
    this.selectedInstIndex = 0;
    this.selectedDiagIndex = 0;

    this.plugins = [];
    this.filteredPlugins = [];
    this.marketplaces = {};
    this.diagnostics = [];
    this.toastTimer = null;

    this.initScreen();
    this.buildLayout();
    this.bindEvents();
    this.refreshData();
  }

  initScreen() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Antigravity Plugins — Studio',
      fullUnicode: true,
      resizeTimeout: 80,
      dockBorders: true,
      style: {
        bg: '#08090e'
      }
    });
  }

  buildLayout() {
    // 1. Top Header Box
    this.headerBox = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      tags: true,
      style: {
        bg: '#08090e'
      }
    });

    // 2. Main Viewport Container
    this.viewport = blessed.box({
      parent: this.screen,
      top: 3,
      left: 0,
      width: '100%',
      height: '100%-5',
      style: {
        bg: '#08090e'
      }
    });

    // --- TAB 1: CATALOG VIEW (Explore & Skills) ---
    this.catalogView = blessed.box({
      parent: this.viewport,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: { bg: '#08090e' }
    });

    this.catalogList = blessed.list({
      parent: this.catalogView,
      top: 0,
      left: 0,
      width: '46%',
      height: '100%',
      border: { type: 'line' },
      label: ' {bold}AVAILABLE PLUGINS & SKILLS{/} ',
      tags: true,
      scrollable: true,
      keys: true,
      vi: true,
      mouse: true,
      scrollbar: {
        ch: '│',
        track: { bg: '#0f111a' },
        style: { fg: '#6366f1' }
      },
      style: {
        bg: '#0f111a',
        border: { fg: '#312e81' },
        selected: {
          bg: '#1e1b4b',
          fg: '#ffffff',
          bold: true
        },
        item: {
          fg: '#cbd5e1'
        }
      }
    });

    this.catalogDetail = blessed.box({
      parent: this.catalogView,
      top: 0,
      left: '46%',
      width: '54%',
      height: '100%',
      border: { type: 'line' },
      label: ' {bold}INSPECTOR & ACTIVATION{/} ',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      keys: true,
      scrollbar: {
        ch: '│',
        track: { bg: '#111420' },
        style: { fg: '#818cf8' }
      },
      style: {
        bg: '#111420',
        border: { fg: '#312e81' }
      }
    });

    // --- TAB 2: MARKETPLACES VIEW ---
    this.marketplacesView = blessed.box({
      parent: this.viewport,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      hidden: true,
      style: { bg: '#08090e' }
    });

    this.mpList = blessed.list({
      parent: this.marketplacesView,
      top: 0,
      left: 0,
      width: '46%',
      height: '100%',
      border: { type: 'line' },
      label: ' {bold}REGISTERED MARKETPLACES{/} ',
      tags: true,
      scrollable: true,
      keys: true,
      vi: true,
      mouse: true,
      scrollbar: {
        ch: '│',
        track: { bg: '#0f111a' },
        style: { fg: '#6366f1' }
      },
      style: {
        bg: '#0f111a',
        border: { fg: '#312e81' },
        selected: {
          bg: '#1e1b4b',
          fg: '#ffffff',
          bold: true
        }
      }
    });

    this.mpDetail = blessed.box({
      parent: this.marketplacesView,
      top: 0,
      left: '46%',
      width: '54%',
      height: '100%',
      border: { type: 'line' },
      label: ' {bold}MARKETPLACE REPOSITORY PROVENANCE{/} ',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      keys: true,
      scrollbar: {
        ch: '│',
        track: { bg: '#111420' },
        style: { fg: '#818cf8' }
      },
      style: {
        bg: '#111420',
        border: { fg: '#312e81' }
      }
    });

    // --- TAB 3: INSTALLED VIEW ---
    this.installedView = blessed.box({
      parent: this.viewport,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      hidden: true,
      style: { bg: '#08090e' }
    });

    this.instList = blessed.list({
      parent: this.installedView,
      top: 0,
      left: 0,
      width: '46%',
      height: '100%',
      border: { type: 'line' },
      label: ' {bold}INSTALLED CUSTOMIZATIONS{/} ',
      tags: true,
      scrollable: true,
      keys: true,
      vi: true,
      mouse: true,
      scrollbar: {
        ch: '│',
        track: { bg: '#0f111a' },
        style: { fg: '#6366f1' }
      },
      style: {
        bg: '#0f111a',
        border: { fg: '#312e81' },
        selected: {
          bg: '#1e1b4b',
          fg: '#ffffff',
          bold: true
        }
      }
    });

    this.instDetail = blessed.box({
      parent: this.installedView,
      top: 0,
      left: '46%',
      width: '54%',
      height: '100%',
      border: { type: 'line' },
      label: ' {bold}SYMLINK & INTEGRATION DETAILS{/} ',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      keys: true,
      scrollbar: {
        ch: '│',
        track: { bg: '#111420' },
        style: { fg: '#818cf8' }
      },
      style: {
        bg: '#111420',
        border: { fg: '#312e81' }
      }
    });

    // --- TAB 4: DOCTOR VIEW ---
    this.doctorView = blessed.box({
      parent: this.viewport,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      hidden: true,
      style: { bg: '#08090e' }
    });

    this.diagList = blessed.list({
      parent: this.doctorView,
      top: 0,
      left: 0,
      width: '46%',
      height: '100%',
      border: { type: 'line' },
      label: ' {bold}SYSTEM INTEGRITY & DOCTOR{/} ',
      tags: true,
      scrollable: true,
      keys: true,
      vi: true,
      mouse: true,
      scrollbar: {
        ch: '│',
        track: { bg: '#0f111a' },
        style: { fg: '#6366f1' }
      },
      style: {
        bg: '#0f111a',
        border: { fg: '#312e81' },
        selected: {
          bg: '#1e1b4b',
          fg: '#ffffff',
          bold: true
        }
      }
    });

    this.diagDetail = blessed.box({
      parent: this.doctorView,
      top: 0,
      left: '46%',
      width: '54%',
      height: '100%',
      border: { type: 'line' },
      label: ' {bold}DIAGNOSTIC ANALYSIS & REPAIR{/} ',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      keys: true,
      scrollbar: {
        ch: '│',
        track: { bg: '#111420' },
        style: { fg: '#818cf8' }
      },
      style: {
        bg: '#111420',
        border: { fg: '#312e81' }
      }
    });

    // 3. Bottom Footer & Status Box
    this.footerBox = blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 2,
      tags: true,
      style: {
        bg: '#08090e'
      }
    });

    // 4. Modal Dialogs (Search & Add Marketplace)
    this.searchModal = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '60%',
      height: 7,
      border: { type: 'line' },
      label: ' {bold}{#818cf8-fg} ⌕ Search Skills & Plugins {/} ',
      tags: true,
      hidden: true,
      style: {
        bg: '#151824',
        border: { fg: '#818cf8' }
      }
    });

    this.searchInput = blessed.textbox({
      parent: this.searchModal,
      top: 1,
      left: 2,
      right: 2,
      height: 3,
      border: { type: 'line' },
      inputOnFocus: true,
      style: {
        bg: '#0f111a',
        border: { fg: '#6366f1' },
        focus: { border: { fg: '#a855f7' } }
      }
    });

    this.addMpModal = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '66%',
      height: 7,
      border: { type: 'line' },
      label: ' {bold}{#818cf8-fg} ⛃ Register New Marketplace (GitHub Repo or URL) {/} ',
      tags: true,
      hidden: true,
      style: {
        bg: '#151824',
        border: { fg: '#818cf8' }
      }
    });

    this.addMpInput = blessed.textbox({
      parent: this.addMpModal,
      top: 1,
      left: 2,
      right: 2,
      height: 3,
      border: { type: 'line' },
      inputOnFocus: true,
      style: {
        bg: '#0f111a',
        border: { fg: '#6366f1' },
        focus: { border: { fg: '#a855f7' } }
      }
    });
  }

  bindEvents() {
    // Global Keybindings
    this.screen.key(['q', 'C-c'], () => {
      this.screen.destroy();
      process.exit(0);
    });

    this.screen.key(['1'], () => this.switchTab('catalog'));
    this.screen.key(['2'], () => this.switchTab('marketplaces'));
    this.screen.key(['3'], () => this.switchTab('installed'));
    this.screen.key(['4'], () => this.switchTab('doctor'));

    this.screen.key(['/', 'C-k'], () => {
      this.openSearchModal();
    });

    // Tab 1 (Catalog) List Navigation & Actions
    this.catalogList.on('select item', (_item, index) => {
      this.selectedIndex = index;
      this.updateCatalogDetail();
      this.screen.render();
    });

    this.catalogList.key(['space', 'i'], async () => {
      await this.toggleCurrentPlugin();
    });

    this.catalogList.key(['u'], async () => {
      await this.syncAllMarketplaces();
    });

    // Tab 2 (Marketplaces) Actions
    this.mpList.on('select item', (_item, index) => {
      this.selectedMpIndex = index;
      this.updateMarketplaceDetail();
      this.screen.render();
    });

    this.mpList.key(['space'], () => {
      const mpKeys = Object.keys(this.marketplaces);
      const mp = mpKeys[this.selectedMpIndex];
      if (mp) {
        const auto = Registry.toggleAutoUpdate(mp);
        this.showToast(`Auto-update for ${mp}: ${auto ? 'ENABLED' : 'PAUSED'}`);
        this.refreshData();
      }
    });

    this.mpList.key(['u'], async () => {
      const mpKeys = Object.keys(this.marketplaces);
      const mp = mpKeys[this.selectedMpIndex];
      if (mp) await this.syncSingleMarketplace(mp);
    });

    this.mpList.key(['a'], () => {
      this.openAddMarketplaceModal();
    });

    this.mpList.key(['d'], () => {
      const mpKeys = Object.keys(this.marketplaces);
      const mp = mpKeys[this.selectedMpIndex];
      if (mp) {
        Registry.removeMarketplace(mp);
        this.showToast(`Removed marketplace ${mp}`);
        this.refreshData();
      }
    });

    // Tab 3 (Installed) Actions
    this.instList.on('select item', (_item, index) => {
      this.selectedInstIndex = index;
      this.updateInstalledDetail();
      this.screen.render();
    });

    this.instList.key(['space', 'd'], async () => {
      const installed = this.plugins.filter(p => p.installed);
      const target = installed[this.selectedInstIndex];
      if (target) {
        await Installer.uninstallPlugin(target.name);
        this.showToast(`Uninstalled ${target.name}`);
        this.refreshData();
      }
    });

    // Tab 4 (Doctor) Actions
    this.diagList.on('select item', (_item, index) => {
      this.selectedDiagIndex = index;
      this.updateDoctorDetail();
      this.screen.render();
    });

    this.diagList.key(['enter'], () => {
      const diag = this.diagnostics[this.selectedDiagIndex];
      if (diag && diag.canAutoFix) {
        const res = Doctor.applyAutoFix(diag);
        this.showToast(res.message);
        this.refreshData();
      }
    });

    this.diagList.key(['a'], () => {
      const res = Doctor.fixAll();
      this.showToast(res.message);
      this.refreshData();
    });

    // Search Input Events
    this.searchInput.key(['escape'], () => {
      this.searchModal.hide();
      this.catalogList.focus();
      this.screen.render();
    });

    this.searchInput.on('submit', (val) => {
      this.searchQuery = (val || '').trim();
      this.searchModal.hide();
      this.filterPlugins();
      this.updateCatalogList();
      this.updateHeader();
      this.catalogList.focus();
      this.screen.render();
    });

    // Add Marketplace Input Events
    this.addMpInput.key(['escape'], () => {
      this.addMpModal.hide();
      this.mpList.focus();
      this.screen.render();
    });

    this.addMpInput.on('submit', async (val) => {
      const repo = (val || '').trim();
      this.addMpModal.hide();
      this.mpList.focus();
      if (repo) {
        this.showToast(`Registering ${repo}...`);
        try {
          const res = await Registry.addMarketplace(repo);
          this.showToast(res.message);
          this.refreshData();
        } catch (err) {
          this.showToast(`Failed: ${err.message}`);
        }
      }
    });
  }

  switchTab(tabId) {
    this.currentTab = tabId;
    this.catalogView.hidden = tabId !== 'catalog';
    this.marketplacesView.hidden = tabId !== 'marketplaces';
    this.installedView.hidden = tabId !== 'installed';
    this.doctorView.hidden = tabId !== 'doctor';

    this.updateHeader();
    this.updateFooter();

    if (tabId === 'catalog') {
      this.updateCatalogList();
      this.updateCatalogDetail();
      this.catalogList.focus();
    } else if (tabId === 'marketplaces') {
      this.updateMarketplacesList();
      this.updateMarketplaceDetail();
      this.mpList.focus();
    } else if (tabId === 'installed') {
      this.updateInstalledList();
      this.updateInstalledDetail();
      this.instList.focus();
    } else if (tabId === 'doctor') {
      this.updateDoctorList();
      this.updateDoctorDetail();
      this.diagList.focus();
    }

    this.screen.render();
  }

  openSearchModal() {
    this.searchModal.show();
    this.searchInput.setValue(this.searchQuery);
    this.searchInput.focus();
    this.screen.render();
  }

  openAddMarketplaceModal() {
    this.addMpModal.show();
    this.addMpInput.setValue('');
    this.addMpInput.focus();
    this.screen.render();
  }

  showToast(msg) {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastMessage = msg;
    this.updateFooter();
    this.screen.render();

    this.toastTimer = setTimeout(() => {
      this.toastMessage = '';
      this.updateFooter();
      this.screen.render();
    }, 3200);
  }

  refreshData() {
    this.marketplaces = Registry.getMarketplaces();
    this.plugins = Registry.getAllPlugins();
    this.filterPlugins();
    this.diagnostics = Doctor.runDiagnostics();

    this.updateHeader();
    this.updateFooter();

    if (this.currentTab === 'catalog') {
      this.updateCatalogList();
      this.updateCatalogDetail();
    } else if (this.currentTab === 'marketplaces') {
      this.updateMarketplacesList();
      this.updateMarketplaceDetail();
    } else if (this.currentTab === 'installed') {
      this.updateInstalledList();
      this.updateInstalledDetail();
    } else if (this.currentTab === 'doctor') {
      this.updateDoctorList();
      this.updateDoctorDetail();
    }

    this.screen.render();
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

  updateHeader() {
    const installedCount = this.plugins.filter(p => p.installed).length;
    const diagCount = this.diagnostics.length;
    const mpCount = Object.keys(this.marketplaces).length;

    // Line 1: Studio Title + Cone Status
    const title = '{bold}{#a855f7-fg}✦ {#ffffff-fg}Antigravity Customization Studio{/} {#64748b-fg}(AGY Native){/}';
    const status = `{#06b6d4-fg}Sparse Cone: Active{/} {#64748b-fg}│{/} {#10b981-fg}${installedCount} Installed{/}`;

    // Line 2: Navigation Tabs
    const tab1 = this.currentTab === 'catalog'
      ? '{#ffffff-fg}{#312e81-bg}{bold} ✦ Explore & Skills [1] {/}'
      : '{#94a3b8-fg} ✦ Explore & Skills [1] {/}';
    const tab2 = this.currentTab === 'marketplaces'
      ? `{#ffffff-fg}{#312e81-bg}{bold} ⛃ Marketplaces (${mpCount}) [2] {/}`
      : `{#94a3b8-fg} ⛃ Marketplaces (${mpCount}) [2] {/}`;
    const tab3 = this.currentTab === 'installed'
      ? `{#ffffff-fg}{#312e81-bg}{bold} ✓ Installed (${installedCount}) [3] {/}`
      : `{#94a3b8-fg} ✓ Installed (${installedCount}) [3] {/}`;
    const tab4 = this.currentTab === 'doctor'
      ? `{#ffffff-fg}{#312e81-bg}{bold} ⚠ Doctor (${diagCount}) [4] {/}`
      : `{#94a3b8-fg} ⚠ Doctor (${diagCount}) [4] {/}`;

    const searchHint = this.searchQuery 
      ? `{#a855f7-fg}⌕ "${this.searchQuery}" (Press / to clear){/}`
      : '{#64748b-fg}⌕ Press / to search{/}';

    const line1 = `${title}  ${status}`;
    const line2 = `${tab1} ${tab2} ${tab3} ${tab4}    ${searchHint}`;

    this.headerBox.setContent(`${line1}\n${line2}`);
  }

  updateFooter() {
    let help = '';
    if (this.currentTab === 'catalog') {
      help = '{#64748b-fg}[↑/↓]{/} {#cbd5e1-fg}Navigate{/}  {#06b6d4-fg}[Space/i]{/} {#cbd5e1-fg}Toggle Install{/}  {#06b6d4-fg}[u]{/} {#cbd5e1-fg}Pull Updates{/}  {#06b6d4-fg}[/]{/} {#cbd5e1-fg}Filter{/}  {#06b6d4-fg}[q]{/} {#cbd5e1-fg}Exit{/}';
    } else if (this.currentTab === 'marketplaces') {
      help = '{#64748b-fg}[↑/↓]{/} {#cbd5e1-fg}Navigate{/}  {#06b6d4-fg}[Space]{/} {#cbd5e1-fg}Toggle Auto-Sync{/}  {#06b6d4-fg}[a]{/} {#cbd5e1-fg}Add Market{/}  {#06b6d4-fg}[u]{/} {#cbd5e1-fg}Sync{/}  {#06b6d4-fg}[d]{/} {#cbd5e1-fg}Remove{/}';
    } else if (this.currentTab === 'installed') {
      help = '{#64748b-fg}[↑/↓]{/} {#cbd5e1-fg}Navigate{/}  {#f43f5e-fg}[Space/d]{/} {#cbd5e1-fg}Uninstall Plugin{/}  {#06b6d4-fg}[1-4]{/} {#cbd5e1-fg}Switch Tabs{/}  {#06b6d4-fg}[q]{/} {#cbd5e1-fg}Exit{/}';
    } else if (this.currentTab === 'doctor') {
      help = '{#64748b-fg}[↑/↓]{/} {#cbd5e1-fg}Navigate{/}  {#10b981-fg}[Enter]{/} {#cbd5e1-fg}Auto-Fix Issue{/}  {#10b981-fg}[a]{/} {#cbd5e1-fg}Fix All Issues{/}  {#06b6d4-fg}[q]{/} {#cbd5e1-fg}Exit{/}';
    }

    const toast = this.toastMessage 
      ? `  {#a855f7-bg}{#ffffff-fg}{bold} ✦ ${this.toastMessage} {/}` 
      : '';

    const path = '{#475569-fg}~/.gemini/config/plugins{/}';
    this.footerBox.setContent(`${help}${toast}\n${path}`);
  }

  updateCatalogList() {
    const items = this.filteredPlugins.map(p => {
      const icon = p.installed ? '{#10b981-fg}✓{/}' : '{#6366f1-fg}◉{/}';
      const cat = `{#06b6d4-fg}[${p.category || 'skill'}]{/}`;
      const mp = `{#64748b-fg}${p.marketplaceName}{/}`;
      const desc = p.description ? p.description.slice(0, 52) : 'No description';
      return `${icon} {bold}${p.name}{/} ${cat} ${mp}\n  {#94a3b8-fg}${desc}{/}`;
    });

    this.catalogList.setItems(items);
    if (items.length > 0) {
      this.catalogList.select(this.selectedIndex);
    }
  }

  updateCatalogDetail() {
    const p = this.filteredPlugins[this.selectedIndex];
    if (!p) {
      this.catalogDetail.setContent('{center}{#64748b-fg}No plugin selected or match found{/}{/center}');
      return;
    }

    const statusBadge = p.installed 
      ? '{#10b981-fg}{bold}✓ INSTALLED (Symlinked to AGY Config){/}'
      : '{#06b6d4-fg}○ AVAILABLE TO INSTALL (Press Space){/}';

    const origin = p.marketplaceSource 
      ? `https://github.com/${p.marketplaceSource}` 
      : p.marketplaceName;

    let content = `\n {bold}{#ffffff-fg}${p.name}{/} {#64748b-fg}v${p.version || '1.0.0'}{/}\n`;
    content += ` {#64748b-fg}Origin: ${origin}{/}\n`;
    content += ` ${statusBadge}\n\n`;

    // Metadata Table
    content += ` {bold}{#818cf8-fg}TECHNICAL CAPABILITY MATRIX{/}\n`;
    content += ` {#64748b-fg}─────────────────────────────────────────────────────────────{/}\n`;
    content += ` {#94a3b8-fg}Token Footprint:{/}    {#06b6d4-fg}~${p.tokenFootprint || 110} tok discovery footprint{/}\n`;
    content += ` {#94a3b8-fg}Schema Spec:{/}        {#10b981-fg}✓ AgentSkills.io v1 (Compatible){/}\n`;
    content += ` {#94a3b8-fg}Rules Provided:{/}     {#cbd5e1-fg}${p.rules?.length || 'None'}{/}\n`;
    content += ` {#94a3b8-fg}MCP Servers:{/}        {#cbd5e1-fg}${p.mcpServers?.length || 'None'}{/}\n`;
    content += ` {#94a3b8-fg}Staging Target:{/}     {#64748b-fg}~/.gemini/config/plugins/${p.name}{/}\n\n`;

    // Activation Trigger
    content += ` {bold}{#ec4899-fg}ACTIVATION TRIGGER & INTENT{/}\n`;
    content += ` {#64748b-fg}─────────────────────────────────────────────────────────────{/}\n`;
    content += ` {#ffffff-fg}"${p.description}"{/}\n\n`;

    // Included Skills Breakdown
    if (p.skills && p.skills.length > 0) {
      content += ` {bold}{#06b6d4-fg}INCLUDED SKILLS (${p.skills.length}){/}\n`;
      content += ` {#64748b-fg}─────────────────────────────────────────────────────────────{/}\n`;
      for (const s of p.skills) {
        content += ` • {bold}{#ffffff-fg}${s.name}{/}: {#94a3b8-fg}${s.description || 'Native capability'}{/}\n`;
      }
      content += '\n';
    }

    content += ` {#64748b-fg}─────────────────────────────────────────────────────────────{/}\n`;
    content += ` ${p.installed ? '{#f43f5e-fg}[ Space / i ] Uninstall Skill{/}' : '{#10b981-fg}[ Space / i ] Install Skill{/}'}   {#6366f1-fg}[ u ] Pull Updates{/}\n`;

    this.catalogDetail.setContent(content);
  }

  updateMarketplacesList() {
    const keys = Object.keys(this.marketplaces);
    const items = keys.map(k => {
      const mp = this.marketplaces[k];
      const autoSync = mp.autoUpdate !== false ? '{#10b981-fg}[Auto-Sync: ON]{/}' : '{#64748b-fg}[Auto-Sync: OFF]{/}';
      const count = mp.plugins ? mp.plugins.length : (mp.pluginCount || 0);
      const source = mp.source?.repo || mp.source || 'local';
      return `{bold}${k}{/} ${autoSync} {#06b6d4-fg}${count} skills{/}\n  {#64748b-fg}Source: ${source}{/}`;
    });

    this.mpList.setItems(items);
    if (items.length > 0) {
      this.mpList.select(this.selectedMpIndex);
    }
  }

  updateMarketplaceDetail() {
    const keys = Object.keys(this.marketplaces);
    const k = keys[this.selectedMpIndex];
    const mp = k ? this.marketplaces[k] : null;

    if (!mp) {
      this.mpDetail.setContent('{center}{#64748b-fg}No marketplace selected{/}{/center}');
      return;
    }

    const source = mp.source?.repo || mp.source || 'local';
    const autoSync = mp.autoUpdate !== false ? '{#10b981-fg}ENABLED (Continuous){/}' : '{#f59e0b-fg}PAUSED (Manual Only){/}';
    const plugins = Registry.getPluginsForMarketplace(k);

    let content = `\n {bold}{#ffffff-fg}${k}{/} {#64748b-fg}(Marketplace Collection){/}\n`;
    content += ` {#64748b-fg}Remote Repository: https://github.com/${source}{/}\n`;
    content += ` {#94a3b8-fg}Auto-Sync State:   ${autoSync}{/}\n\n`;

    content += ` {bold}{#818cf8-fg}REPOSITORY LOCAL STAGING{/}\n`;
    content += ` {#64748b-fg}─────────────────────────────────────────────────────────────{/}\n`;
    content += ` {#94a3b8-fg}Local Clone:{/}       {#64748b-fg}~/.gemini/plugins/marketplaces/${k}{/}\n`;
    content += ` {#94a3b8-fg}Sparse Checkout:{/}   {#10b981-fg}Active (cone filter mode){/}\n`;
    content += ` {#94a3b8-fg}Skills Exposed:{/}    {#06b6d4-fg}${plugins.length} available{/}\n\n`;

    content += ` {bold}{#06b6d4-fg}REGISTERED SKILLS IN THIS MARKETPLACE{/}\n`;
    content += ` {#64748b-fg}─────────────────────────────────────────────────────────────{/}\n`;
    for (const p of plugins.slice(0, 15)) {
      const inst = p.installed ? '{#10b981-fg}[Installed]{/}' : '{#64748b-fg}[Available]{/}';
      content += ` • {bold}${p.name}{/} ${inst} - {#94a3b8-fg}${p.description.slice(0, 48)}{/}\n`;
    }
    if (plugins.length > 15) {
      content += ` {#64748b-fg}...and ${plugins.length - 15} more skills{/}\n`;
    }

    content += `\n {#64748b-fg}─────────────────────────────────────────────────────────────{/}\n`;
    content += ` {#06b6d4-fg}[ Space ] Toggle Auto-Sync{/}   {#6366f1-fg}[ u ] Sync Now{/}   {#10b981-fg}[ a ] Add New{/}   {#f43f5e-fg}[ d ] Remove{/}\n`;

    this.mpDetail.setContent(content);
  }

  updateInstalledList() {
    const installed = this.plugins.filter(p => p.installed);
    const items = installed.map(p => {
      return `{#10b981-fg}✓{/} {bold}${p.name}{/} {#64748b-fg}(${p.marketplaceName}){/}\n  {#94a3b8-fg}~/.gemini/config/plugins/${p.name}{/}`;
    });

    this.instList.setItems(items);
    if (items.length > 0) {
      this.instList.select(this.selectedInstIndex);
    }
  }

  updateInstalledDetail() {
    const installed = this.plugins.filter(p => p.installed);
    const p = installed[this.selectedInstIndex];

    if (!p) {
      this.instDetail.setContent('{center}{#64748b-fg}No installed plugins found{/}{/center}');
      return;
    }

    let content = `\n {bold}{#ffffff-fg}${p.name}{/} {#10b981-fg}[ACTIVE IN AGY]{/}\n`;
    content += ` {#64748b-fg}Origin Collection: ${p.marketplaceName}{/}\n\n`;

    content += ` {bold}{#818cf8-fg}FILESYSTEM SYMLINK VERIFICATION{/}\n`;
    content += ` {#64748b-fg}─────────────────────────────────────────────────────────────{/}\n`;
    content += ` {#94a3b8-fg}Target Symlink:{/}   {#10b981-fg}~/.gemini/config/plugins/${p.name}{/}\n`;
    content += ` {#94a3b8-fg}Real Directory:{/}   {#64748b-fg}${p.dir || 'Local clone'}{/}\n`;
    content += ` {#94a3b8-fg}Health Status:{/}    {#10b981-fg}✓ Valid Symlink Destination{/}\n\n`;

    content += ` {bold}{#06b6d4-fg}CAPABILITIES EXPOSED TO AGY{/}\n`;
    content += ` {#64748b-fg}─────────────────────────────────────────────────────────────{/}\n`;
    for (const s of p.skills) {
      content += ` • {bold}${s.name}{/}: {#94a3b8-fg}${s.description}{/}\n`;
    }

    content += `\n {#64748b-fg}─────────────────────────────────────────────────────────────{/}\n`;
    content += ` {#f43f5e-fg}[ Space / d ] Uninstall Plugin from Antigravity{/}\n`;

    this.instDetail.setContent(content);
  }

  updateDoctorList() {
    const items = this.diagnostics.map(d => {
      const icon = d.status === 'ok' ? '{#10b981-fg}✓{/}' : d.status === 'warn' ? '{#f59e0b-fg}⚠{/}' : '{#f43f5e-fg}✕{/}';
      return `${icon} {bold}${d.name}{/}\n  {#94a3b8-fg}${d.message}{/}`;
    });

    this.diagList.setItems(items);
    if (items.length > 0) {
      this.diagList.select(this.selectedDiagIndex);
    }
  }

  updateDoctorDetail() {
    const d = this.diagnostics[this.selectedDiagIndex];
    if (!d) {
      this.diagDetail.setContent('{center}{#64748b-fg}No diagnostics available{/}{/center}');
      return;
    }

    const statusBadge = d.status === 'ok' 
      ? '{#10b981-fg}✓ PASSING (No issues detected){/}'
      : d.status === 'warn'
      ? '{#f59e0b-fg}⚠ WARNING (Action Recommended){/}'
      : '{#f43f5e-fg}✕ ERROR (Requires Repair){/}';

    let content = `\n {bold}{#ffffff-fg}${d.name}{/}\n`;
    content += ` Status: ${statusBadge}\n\n`;

    content += ` {bold}{#818cf8-fg}ISSUE ANALYSIS{/}\n`;
    content += ` {#64748b-fg}─────────────────────────────────────────────────────────────{/}\n`;
    content += ` {#ffffff-fg}${d.message}{/}\n\n`;

    if (d.details) {
      content += ` {#94a3b8-fg}Details:{/} {#64748b-fg}${d.details}{/}\n\n`;
    }

    content += ` {bold}{#10b981-fg}RECOMMENDED REMEDIATION{/}\n`;
    content += ` {#64748b-fg}─────────────────────────────────────────────────────────────{/}\n`;
    content += ` {#cbd5e1-fg}${d.fix || 'No action needed.'}{/}\n\n`;

    content += ` {#64748b-fg}─────────────────────────────────────────────────────────────{/}\n`;
    if (d.canAutoFix) {
      content += ` {#10b981-fg}[ Enter ] Auto-Fix This Issue{/}   {#6366f1-fg}[ a ] Auto-Fix All Issues{/}\n`;
    } else {
      content += ` {#64748b-fg}No automatic fix available for this check.{/}\n`;
    }

    this.diagDetail.setContent(content);
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
    this.showToast(`Syncing all marketplaces...`);
    const results = await SyncEngine.syncAll(true);
    const updatedCount = results.filter(r => r.updated).length;
    this.showToast(`Sync complete (${updatedCount} updated)`);
    this.refreshData();
  }

  start() {
    this.catalogList.focus();
    this.screen.render();
  }
}
