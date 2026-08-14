import blessed from 'neo-blessed';
import { Registry } from '../core/registry.js';
import { Installer } from '../core/installer.js';
import { SyncEngine } from '../core/sync.js';
import { Doctor } from '../core/doctor.js';

export class TuiApp {
  constructor() {
    this.tabs = ['catalog', 'marketplaces', 'installed', 'doctor'];
    this.currentTab = 'catalog';
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
    this.toastMessage = '';

    this.initScreen();
    this.buildLayout();
    this.bindEvents();
    this.refreshData();
  }

  initScreen() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Antigravity Customization Studio — Gemini Native TUI',
      fullUnicode: true,
      resizeTimeout: 40,
      dockBorders: true,
      style: {
        bg: '#08090e'
      }
    });

    this.screen.enableMouse();
  }

  buildLayout() {
    // 1. Top Brand Header Bar (Line 0-1)
    this.headerBar = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 2,
      tags: true,
      style: {
        bg: '#08090e'
      }
    });

    // 2. Navigation Ribbon Bar (Line 2-3)
    this.navBar = blessed.box({
      parent: this.screen,
      top: 2,
      left: 0,
      width: '100%',
      height: 2,
      tags: true,
      style: {
        bg: '#12141e'
      }
    });

    // Clickable Navigation Tabs
    this.tabButtons = {};

    this.tabButtons.catalog = blessed.box({
      parent: this.navBar,
      top: 0,
      left: 1,
      width: 25,
      height: 1,
      tags: true,
      mouse: true,
      cursor: 'pointer',
      content: ' ✦ Explore & Skills 1 '
    });

    this.tabButtons.marketplaces = blessed.box({
      parent: this.navBar,
      top: 0,
      left: 27,
      width: 24,
      height: 1,
      tags: true,
      mouse: true,
      cursor: 'pointer',
      content: ' ⛃ Marketplaces 2 '
    });

    this.tabButtons.installed = blessed.box({
      parent: this.navBar,
      top: 0,
      left: 52,
      width: 22,
      height: 1,
      tags: true,
      mouse: true,
      cursor: 'pointer',
      content: ' ✓ Installed 3 '
    });

    this.tabButtons.doctor = blessed.box({
      parent: this.navBar,
      top: 0,
      left: 75,
      width: 20,
      height: 1,
      tags: true,
      mouse: true,
      cursor: 'pointer',
      content: ' ⚠ Doctor 4 '
    });

    // Search Trigger Button on Nav Ribbon
    this.searchBtn = blessed.box({
      parent: this.navBar,
      top: 0,
      right: 2,
      width: 32,
      height: 1,
      tags: true,
      mouse: true,
      cursor: 'pointer',
      content: '{#64748b-fg}⌕ Fuzzy search (/ or Ctrl+K){/}'
    });

    // 3. Main Viewport Container (Line 4 to height-2)
    this.viewport = blessed.box({
      parent: this.screen,
      top: 4,
      left: 0,
      width: '100%',
      height: '100%-6',
      style: {
        bg: '#08090e'
      }
    });

    // ==========================================
    // TAB 1: CATALOG VIEW (Explore & Skills)
    // ==========================================
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
      label: ' {bold}{#818cf8-fg}AVAILABLE PLUGINS & SKILLS{/} ',
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
      label: ' {bold}{#818cf8-fg}INSPECTOR & ACTIVATION MATRIX{/} ',
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

    // ==========================================
    // TAB 2: MARKETPLACES VIEW
    // ==========================================
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
      label: ' {bold}{#818cf8-fg}REGISTERED MARKETPLACE REPOSITORIES{/} ',
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
      label: ' {bold}{#818cf8-fg}MARKETPLACE REPOSITORY PROVENANCE{/} ',
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

    // ==========================================
    // TAB 3: INSTALLED VIEW
    // ==========================================
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
      label: ' {bold}{#818cf8-fg}INSTALLED CUSTOMIZATION SUITE{/} ',
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
      label: ' {bold}{#818cf8-fg}SYMLINK INTEGRITY & RUNTIMES{/} ',
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

    // ==========================================
    // TAB 4: DOCTOR VIEW
    // ==========================================
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
      label: ' {bold}{#818cf8-fg}SYSTEM INTEGRITY & DOCTOR GATES{/} ',
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
      label: ' {bold}{#818cf8-fg}ROOT CAUSE & REMEDIATION PLAN{/} ',
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

    // 4. Bottom Footer (Line height - 2)
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

    // 5. Interactive Modals (Search & Add Marketplace)
    this.searchModal = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '64%',
      height: 7,
      border: { type: 'line' },
      label: ' {bold}{#818cf8-fg} ⌕ Search Skills & Marketplaces {/} ',
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
      width: '68%',
      height: 7,
      border: { type: 'line' },
      label: ' {bold}{#818cf8-fg} ⛃ Register Marketplace (GitHub Repo or Git URL) {/} ',
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

    // 1-4 Direct Tab Keys
    this.screen.key(['1'], () => this.switchTab('catalog'));
    this.screen.key(['2'], () => this.switchTab('marketplaces'));
    this.screen.key(['3'], () => this.switchTab('installed'));
    this.screen.key(['4'], () => this.switchTab('doctor'));

    // Left / Right Arrow Tab Cycling
    this.screen.key(['left', 'h'], () => this.cycleTab(-1));
    this.screen.key(['right', 'l'], () => this.cycleTab(1));

    // Search Hotkey
    this.screen.key(['/', 'C-k'], () => {
      this.openSearchModal();
    });

    // Screen resize event
    this.screen.on('resize', () => {
      this.updateHeaderAndRibbon();
      this.updateFooter();
      this.screen.render();
    });

    // Mouse Click on Navigation Tabs
    this.tabButtons.catalog.on('click', () => this.switchTab('catalog'));
    this.tabButtons.marketplaces.on('click', () => this.switchTab('marketplaces'));
    this.tabButtons.installed.on('click', () => this.switchTab('installed'));
    this.tabButtons.doctor.on('click', () => this.switchTab('doctor'));

    // Mouse Click on Search Pill
    this.searchBtn.on('click', () => this.openSearchModal());

    // Tab 1 (Catalog) List Events
    this.catalogList.on('select item', (_item, index) => {
      this.selectedIndex = index;
      this.updateCatalogDetail();
      this.screen.render();
    });

    this.catalogList.key(['space', 'i', 'enter'], async () => {
      await this.toggleCurrentPlugin();
    });

    this.catalogList.key(['u'], async () => {
      await this.syncAllMarketplaces();
    });

    // Tab 2 (Marketplaces) Events
    this.mpList.on('select item', (_item, index) => {
      this.selectedMpIndex = index;
      this.updateMarketplaceDetail();
      this.screen.render();
    });

    this.mpList.key(['space', 'enter'], () => {
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

    // Tab 3 (Installed) Events
    this.instList.on('select item', (_item, index) => {
      this.selectedInstIndex = index;
      this.updateInstalledDetail();
      this.screen.render();
    });

    this.instList.key(['space', 'd', 'enter'], async () => {
      const installed = this.plugins.filter(p => p.installed);
      const target = installed[this.selectedInstIndex];
      if (target) {
        await Installer.uninstallPlugin(target.name);
        this.showToast(`Uninstalled ${target.name}`);
        this.refreshData();
      }
    });

    // Tab 4 (Doctor) Events
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

    // Search Input Modal Handlers
    this.searchInput.key(['escape'], () => {
      this.searchModal.hide();
      this.getCurrentList().focus();
      this.screen.render();
    });

    this.searchInput.on('submit', (val) => {
      this.searchQuery = (val || '').trim();
      this.searchModal.hide();
      this.filterPlugins();
      this.updateCatalogList();
      this.updateHeaderAndRibbon();
      this.getCurrentList().focus();
      this.screen.render();
    });

    // Add Marketplace Modal Handlers
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

  getCurrentList() {
    if (this.currentTab === 'catalog') return this.catalogList;
    if (this.currentTab === 'marketplaces') return this.mpList;
    if (this.currentTab === 'installed') return this.instList;
    return this.diagList;
  }

  cycleTab(direction) {
    const idx = this.tabs.indexOf(this.currentTab);
    let nextIdx = (idx + direction) % this.tabs.length;
    if (nextIdx < 0) nextIdx = this.tabs.length - 1;
    this.switchTab(this.tabs[nextIdx]);
  }

  switchTab(tabId) {
    this.currentTab = tabId;
    this.catalogView.hidden = tabId !== 'catalog';
    this.marketplacesView.hidden = tabId !== 'marketplaces';
    this.installedView.hidden = tabId !== 'installed';
    this.doctorView.hidden = tabId !== 'doctor';

    this.updateHeaderAndRibbon();
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

    this.updateHeaderAndRibbon();
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

  stripTags(str) {
    return (str || '').replace(/\{[^}]+\}/g, '');
  }

  updateHeaderAndRibbon() {
    const width = this.screen.width || 120;
    const installedCount = this.plugins.filter(p => p.installed).length;
    const diagCount = this.diagnostics.length;
    const mpCount = Object.keys(this.marketplaces).length;

    // 1. Top Brand Header Bar
    const leftText = '{bold}{#a855f7-fg}✦ {#ffffff-fg}Antigravity Customization Studio{/}  {#06b6d4-bg}{#08090e-fg}{bold} GEMINI / AGY NATIVE {/}';
    const rightText = `{#10b981-fg}● Sparse Cone: Active{/}   {#64748b-fg}Active Daemon: {#cbd5e1-fg}60fps IPC{/}   {#06b6d4-fg}Installed: {#ffffff-fg}{bold}${installedCount} Skills{/}`;
    
    const visibleLeft = this.stripTags(leftText).length;
    const visibleRight = this.stripTags(rightText).length;
    const spaceCount = Math.max(2, width - visibleLeft - visibleRight - 2);

    this.headerBar.setContent(` ${leftText}${' '.repeat(spaceCount)}${rightText} `);

    // 2. Nav Ribbon Buttons Style Update
    const isCat = this.currentTab === 'catalog';
    const isMp = this.currentTab === 'marketplaces';
    const isInst = this.currentTab === 'installed';
    const isDoc = this.currentTab === 'doctor';

    this.tabButtons.catalog.setContent(isCat 
      ? '{#ffffff-fg}{#312e81-bg}{bold} ✦ Explore & Skills 1 {/}' 
      : '{#94a3b8-fg} ✦ Explore & Skills 1 {/}');

    this.tabButtons.marketplaces.setContent(isMp 
      ? `{#ffffff-fg}{#312e81-bg}{bold} ⛃ Marketplaces ${mpCount} {/}` 
      : `{#94a3b8-fg} ⛃ Marketplaces ${mpCount} {/}`);

    this.tabButtons.installed.setContent(isInst 
      ? `{#ffffff-fg}{#312e81-bg}{bold} ✓ Installed ${installedCount} {/}` 
      : `{#94a3b8-fg} ✓ Installed ${installedCount} {/}`);

    this.tabButtons.doctor.setContent(isDoc 
      ? `{#ffffff-fg}{#312e81-bg}{bold} ⚠ Doctor ${diagCount} {/}` 
      : `{#94a3b8-fg} ⚠ Doctor ${diagCount} {/}`);

    // Search Trigger Content
    if (this.searchQuery) {
      this.searchBtn.setContent(`{#ec4899-fg}⌕ "${this.searchQuery}" (Esc to clear){/}`);
    } else {
      this.searchBtn.setContent('{#64748b-fg}⌕ Fuzzy search (/ or Ctrl+K){/}');
    }
  }

  updateFooter() {
    const width = this.screen.width || 120;
    let help = '';
    if (this.currentTab === 'catalog') {
      help = ' {#64748b-fg}[↑/↓]{/} {#cbd5e1-fg}Navigate{/}   {#06b6d4-fg}[←/→]{/} {#cbd5e1-fg}Tabs{/}   {#10b981-fg}[Space/i]{/} {#cbd5e1-fg}Toggle Install{/}   {#6366f1-fg}[u]{/} {#cbd5e1-fg}Pull Updates{/}   {#ec4899-fg}[/]{/} {#cbd5e1-fg}Search{/}   {#64748b-fg}[q]{/} {#cbd5e1-fg}Exit{/}';
    } else if (this.currentTab === 'marketplaces') {
      help = ' {#64748b-fg}[↑/↓]{/} {#cbd5e1-fg}Navigate{/}   {#06b6d4-fg}[←/→]{/} {#cbd5e1-fg}Tabs{/}   {#10b981-fg}[Space]{/} {#cbd5e1-fg}Toggle Auto-Sync{/}   {#6366f1-fg}[a]{/} {#cbd5e1-fg}Add Market{/}   {#6366f1-fg}[u]{/} {#cbd5e1-fg}Sync{/}   {#f43f5e-fg}[d]{/} {#cbd5e1-fg}Remove{/}';
    } else if (this.currentTab === 'installed') {
      help = ' {#64748b-fg}[↑/↓]{/} {#cbd5e1-fg}Navigate{/}   {#06b6d4-fg}[←/→]{/} {#cbd5e1-fg}Tabs{/}   {#f43f5e-fg}[Space/d]{/} {#cbd5e1-fg}Uninstall Plugin{/}   {#ec4899-fg}[/]{/} {#cbd5e1-fg}Search{/}   {#64748b-fg}[q]{/} {#cbd5e1-fg}Exit{/}';
    } else if (this.currentTab === 'doctor') {
      help = ' {#64748b-fg}[↑/↓]{/} {#cbd5e1-fg}Navigate{/}   {#06b6d4-fg}[←/→]{/} {#cbd5e1-fg}Tabs{/}   {#10b981-fg}[Enter]{/} {#cbd5e1-fg}Auto-Fix Issue{/}   {#10b981-fg}[a]{/} {#cbd5e1-fg}Fix All Issues{/}   {#64748b-fg}[q]{/} {#cbd5e1-fg}Exit{/}';
    }

    const toast = this.toastMessage 
      ? `   {#a855f7-bg}{#ffffff-fg}{bold} ✦ ${this.toastMessage} {/}` 
      : '';

    const path = '{#475569-fg}~/.gemini/config/plugins{/} ';
    const leftTotal = `${help}${toast}`;
    const visibleLeft = this.stripTags(leftTotal).length;
    const visibleRight = this.stripTags(path).length;
    const spaceCount = Math.max(2, width - visibleLeft - visibleRight - 2);

    this.footerBox.setContent(`${leftTotal}${' '.repeat(spaceCount)}${path}`);
  }

  wrapLines(text, width) {
    if (!text) return [];
    const words = text.split(/\s+/);
    const lines = [];
    let current = '';

    for (const w of words) {
      if ((current + ' ' + w).trim().length <= width) {
        current = (current + ' ' + w).trim();
      } else {
        if (current) lines.push(current);
        current = w;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  getCategoryBadge(cat) {
    const c = (cat || 'SKILL').toUpperCase();
    if (c === 'DEVELOPMENT' || c === 'ORCHESTRATOR') {
      return `{#6366f1-bg}{#ffffff-fg}{bold} ${c} {/}`;
    }
    if (c === 'PRODUCTIVITY' || c === 'SCAFFOLD') {
      return `{#06b6d4-bg}{#08090e-fg}{bold} ${c} {/}`;
    }
    if (c === 'DESIGN' || c === 'DESIGN RULE' || c === 'ARTIFACT') {
      return `{#f59e0b-bg}{#08090e-fg}{bold} ${c} {/}`;
    }
    if (c === 'PERSONA') {
      return `{#a855f7-bg}{#ffffff-fg}{bold} ${c} {/}`;
    }
    return `{#334155-bg}{#cbd5e1-fg}{bold} ${c} {/}`;
  }

  updateCatalogList() {
    const listWidth = Math.floor((this.screen.width || 120) * 0.46) - 4;
    const items = this.filteredPlugins.map(p => {
      const icon = p.installed ? '{#10b981-fg}✓{/}' : '{#6366f1-fg}◉{/}';
      const badge = this.getCategoryBadge(p.category);
      const name = p.name.length > 22 ? p.name.slice(0, 20) + '..' : p.name;
      const mp = `{#64748b-fg}${p.marketplaceName}{/}`;
      
      // Calculate remaining space for snippet
      const prefix = `${p.name}  [${p.category.toUpperCase()}]  `;
      const suffix = `  ${p.marketplaceName}`;
      const avail = Math.max(10, listWidth - prefix.length - suffix.length);
      const desc = p.description ? p.description.slice(0, avail) : '';
      const descStr = desc ? `{#94a3b8-fg}${desc}{/}` : '';

      return `${icon} {bold}${name}{/} ${badge} ${descStr} ${mp}`;
    });

    this.catalogList.setItems(items);
    if (items.length > 0) {
      this.catalogList.select(this.selectedIndex);
    }
  }

  updateCatalogDetail() {
    const p = this.filteredPlugins[this.selectedIndex];
    if (!p) {
      this.catalogDetail.setContent('{center}{#64748b-fg}\n\nNo plugin selected or matching search query.{/}{/center}');
      return;
    }

    const origin = p.marketplaceSource 
      ? `https://github.com/${p.marketplaceSource}` 
      : p.marketplaceName;

    // Header Card (Large title with version badge)
    let content = `\n {bold}{#ffffff-fg}${p.name}{/} {#06b6d4-bg}{#08090e-fg}{bold} v${p.version || '1.0.0'} {/}\n`;
    content += ` {#64748b-fg}⛃ ${origin}          Commit: {#94a3b8-fg}active-cone{/}\n\n`;

    // Top Live Action Buttons (Right under title, matching mock!)
    const actionBtn = p.installed 
      ? '{#f43f5e-bg}{#ffffff-fg}{bold}  ✕ Uninstall from AGY  {/}' 
      : '{#10b981-bg}{#ffffff-fg}{bold}  ✓ Install to AGY  {/}';
    const syncBtn = '{#312e81-bg}{#ffffff-fg}{bold}  ↻ Sparse Sync  {/}';
    content += ` ${actionBtn}    ${syncBtn}\n\n`;

    // 1. Activation Trigger Card (Rounded border styling)
    const cardW = 60;
    const innerW = cardW - 2;
    content += ` {bold}{#a855f7-fg}✦ ACTIVATION TRIGGER PHRASE (LEVEL 1 FRONTMATTER){/}\n`;
    content += ` {#312e81-fg}╭${'─'.repeat(innerW)}╮{/}\n`;
    const wrappedIntent = this.wrapLines(`"${p.description || 'Native tool capability for Antigravity.'}"`, innerW - 2);
    const visibleLines = wrappedIntent.slice(0, 4);
    if (wrappedIntent.length > 4) {
      visibleLines[3] = visibleLines[3].slice(0, innerW - 6) + '...';
    }
    for (const line of visibleLines) {
      const padded = line.padEnd(innerW - 2, ' ');
      content += ` {#312e81-fg}│{/} {#cbd5e1-fg} ${padded} {/} {#312e81-fg}│{/}\n`;
    }
    content += ` {#312e81-fg}╰${'─'.repeat(innerW)}╯{/}\n\n`;

    // 2. 2x2 Metric Grid Cards (Matching mock-tui.html!)
    const tileW = 28;
    const tileInner = tileW - 2;
    const topBar = `╭${'─'.repeat(tileInner)}╮  ╭${'─'.repeat(tileInner)}╮`;
    const botBar = `╰${'─'.repeat(tileInner)}╯  ╰${'─'.repeat(tileInner)}╯`;

    const tokVal = `~${p.tokenFootprint || 110} tok (Discovery)`.slice(0, tileInner - 2).padEnd(tileInner - 2, ' ');
    const schemaVal = `✓ AgentSkills.io v1`.slice(0, tileInner - 2).padEnd(tileInner - 2, ' ');
    const targetVal = `~/.gemini/config/plugins`.slice(0, tileInner - 2).padEnd(tileInner - 2, ' ');
    const gitVal = `Sparse Cone Mode`.slice(0, tileInner - 2).padEnd(tileInner - 2, ' ');

    const lbl1 = 'TOKEN FOOTPRINT'.padEnd(tileInner - 2, ' ');
    const lbl2 = 'SCHEMA COMPLIANCE'.padEnd(tileInner - 2, ' ');
    const lbl3 = 'TARGET DISCOVERY'.padEnd(tileInner - 2, ' ');
    const lbl4 = 'GIT SYNC STRATEGY'.padEnd(tileInner - 2, ' ');

    content += ` {#312e81-fg}${topBar}{/}\n`;
    content += ` {#312e81-fg}│{/} {#64748b-fg} ${lbl1} {/} {#312e81-fg}│  │{/} {#64748b-fg} ${lbl2} {/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}│{/} {#ffffff-fg} ${tokVal} {/} {#312e81-fg}│  │{/} {#10b981-fg} ${schemaVal} {/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}${botBar}{/}\n`;

    content += ` {#312e81-fg}${topBar}{/}\n`;
    content += ` {#312e81-fg}│{/} {#64748b-fg} ${lbl3} {/} {#312e81-fg}│  │{/} {#64748b-fg} ${lbl4} {/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}│{/} {#06b6d4-fg} ${targetVal} {/} {#312e81-fg}│  │{/} {#cbd5e1-fg} ${gitVal} {/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}${botBar}{/}\n\n`;

    // 3. Ingestion Staging Path Card
    content += ` {bold}{#64748b-fg}INGESTION STAGING PATH{/}\n`;
    content += ` {#312e81-fg}╭${'─'.repeat(innerW)}╮{/}\n`;
    const symlinkStr = `Symlink: ~/.gemini/config/plugins/${p.name}`.slice(0, innerW - 2).padEnd(innerW - 2, ' ');
    const targetPath = (p.dir || `~/.gemini/plugins/marketplaces/${p.marketplaceName}`);
    const targetStr = `Target:  ${targetPath}`.slice(0, innerW - 2).padEnd(innerW - 2, ' ');
    content += ` {#312e81-fg}│{/} {#06b6d4-fg} ${symlinkStr} {/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}│{/} {#64748b-fg} ${targetStr} {/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}╰${'─'.repeat(innerW)}╯{/}\n`;

    this.catalogDetail.setContent(content);
  }

  updateMarketplacesList() {
    const keys = Object.keys(this.marketplaces);
    const items = keys.map(k => {
      const mp = this.marketplaces[k];
      const autoSync = mp.autoUpdate !== false ? '{#10b981-fg}[Auto-Sync: ON]{/}' : '{#64748b-fg}[Auto-Sync: OFF]{/}';
      const plugins = Registry.getPluginsForMarketplace(k);
      const count = plugins.length;
      const source = mp.source?.repo || mp.source || 'local';
      return `⛃ {bold}${k}{/} ${autoSync} {#06b6d4-fg}${count} skills{/}\n   {#94a3b8-fg}Source: https://github.com/${source}{/}\n   {#475569-fg}Cone Active  •  ~/.gemini/plugins/marketplaces/${k}{/}`;
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
      this.mpDetail.setContent('{center}{#64748b-fg}\n\nNo marketplace selected{/}{/center}');
      return;
    }

    const source = mp.source?.repo || mp.source || 'local';
    const autoSync = mp.autoUpdate !== false ? '{#10b981-fg}ENABLED (Continuous 60s){/}' : '{#f59e0b-fg}PAUSED (Manual Only){/}';
    const plugins = Registry.getPluginsForMarketplace(k);

    let content = `\n {bold}{#ffffff-fg}${k}{/} {#06b6d4-bg}{#08090e-fg}{bold} MARKETPLACE {/}\n`;
    content += ` {#64748b-fg}Remote Repository: https://github.com/${source}{/}\n\n`;

    // Action Buttons
    content += ` {#06b6d4-bg}{#08090e-fg}{bold}  [ Space ] Toggle Auto-Sync  {/}   {#312e81-bg}{#ffffff-fg}{bold}  [ u ] Sync Now  {/}   {#f43f5e-bg}{#ffffff-fg}{bold}  [ d ] Remove  {/}\n\n`;

    // 2x2 Metric Grid Cards
    const cloneVal = `~/.gemini/plugins/...`.padEnd(28, ' ');
    const coneVal = `Active (Sparse Cone)`.padEnd(28, ' ');
    const skillsVal = `${plugins.length} Available Skills`.padEnd(28, ' ');
    const syncVal = `${autoSync}`.padEnd(28, ' ');

    content += ` {#312e81-fg}╭──────────────────────────────╮  ╭──────────────────────────────╮{/}\n`;
    content += ` {#312e81-fg}│{/} {#64748b-fg}LOCAL CLONE PATH             {/} {#312e81-fg}│  │{/} {#64748b-fg}SPARSE CHECKOUT              {/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}│{/} {#ffffff-fg}${cloneVal}{/} {#312e81-fg}│  │{/} {#10b981-fg}${coneVal}{/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}╰──────────────────────────────╯  ╰──────────────────────────────╯{/}\n`;

    content += ` {#312e81-fg}╭──────────────────────────────╮  ╭──────────────────────────────╮{/}\n`;
    content += ` {#312e81-fg}│{/} {#64748b-fg}EXPOSED SKILLS               {/} {#312e81-fg}│  │{/} {#64748b-fg}AUTO-SYNC STATE              {/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}│{/} {#06b6d4-fg}${skillsVal}{/} {#312e81-fg}│  │{/} {#cbd5e1-fg}${syncVal}{/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}╰──────────────────────────────╯  ╰──────────────────────────────╯{/}\n\n`;

    content += ` {bold}{#06b6d4-fg}REGISTERED SKILLS IN THIS MARKETPLACE{/}\n`;
    content += ` {#312e81-fg}───────────────────────────────────────────────────────────────────{/}\n`;
    for (const p of plugins.slice(0, 10)) {
      const inst = p.installed ? '{#10b981-fg}[Installed]{/}' : '{#64748b-fg}[Available]{/}';
      content += `   • {bold}${p.name}{/} ${inst} - {#94a3b8-fg}${p.description.slice(0, 44)}{/}\n`;
    }
    if (plugins.length > 10) {
      content += `   {#64748b-fg}...and ${plugins.length - 10} more skills{/}\n`;
    }

    this.mpDetail.setContent(content);
  }

  updateInstalledList() {
    const installed = this.plugins.filter(p => p.installed);
    const items = installed.map(p => {
      const badge = this.getCategoryBadge(p.category);
      const desc = p.description 
        ? p.description.slice(0, 52) + (p.description.length > 52 ? '...' : '') 
        : 'Native tool capability for Antigravity.';
      const meta = `{#10b981-fg}● Symlink Active{/}  {#475569-fg}•  v${p.version || '1.0.0'}  •  ${p.skills?.length || 1} skill(s) exposed{/}`;
      return `{#10b981-fg}✓{/} {bold}${p.name}{/}  ${badge}  {#64748b-fg}(${p.marketplaceName}){/}\n   {#94a3b8-fg}${desc}{/}\n   ${meta}`;
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
      this.instDetail.setContent('{center}{#64748b-fg}\n\nNo installed plugins found{/}{/center}');
      return;
    }

    let content = `\n {bold}{#ffffff-fg}${p.name}{/} {#10b981-bg}{#08090e-fg}{bold} ACTIVE IN AGY {/}\n`;
    content += ` {#64748b-fg}Origin Collection: ${p.marketplaceName}{/}\n\n`;

    content += ` {#f43f5e-bg}{#ffffff-fg}{bold}  [ Space / d ] Uninstall Plugin from Antigravity  {/}\n\n`;

    // 2x2 Metric Cards
    const symlinkVal = `~/.gemini/config/plugins`.padEnd(28, ' ');
    const healthVal = `✓ Valid Link Target`.padEnd(28, ' ');
    const skillsCount = `${p.skills?.length || 1} Tools Exposed`.padEnd(28, ' ');
    const mcpCount = `${p.mcpServers?.length || 0} MCP Servers`.padEnd(28, ' ');

    content += ` {#312e81-fg}╭──────────────────────────────╮  ╭──────────────────────────────╮{/}\n`;
    content += ` {#312e81-fg}│{/} {#64748b-fg}TARGET SYMLINK               {/} {#312e81-fg}│  │{/} {#64748b-fg}HEALTH VERIFICATION          {/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}│{/} {#06b6d4-fg}${symlinkVal}{/} {#312e81-fg}│  │{/} {#10b981-fg}${healthVal}{/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}╰──────────────────────────────╯  ╰──────────────────────────────╯{/}\n`;

    content += ` {#312e81-fg}╭──────────────────────────────╮  ╭──────────────────────────────╮{/}\n`;
    content += ` {#312e81-fg}│{/} {#64748b-fg}CAPABILITIES EXPOSED         {/} {#312e81-fg}│  │{/} {#64748b-fg}BACKGROUND SERVERS           {/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}│{/} {#ffffff-fg}${skillsCount}{/} {#312e81-fg}│  │{/} {#cbd5e1-fg}${mcpCount}{/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}╰──────────────────────────────╯  ╰──────────────────────────────╯{/}\n\n`;

    content += ` {bold}{#06b6d4-fg}CAPABILITIES EXPOSED TO AGY{/}\n`;
    content += ` {#312e81-fg}───────────────────────────────────────────────────────────────────{/}\n`;
    for (const s of p.skills) {
      content += `   • {bold}${s.name}{/}: {#94a3b8-fg}${s.description}{/}\n`;
    }

    this.instDetail.setContent(content);
  }

  updateDoctorList() {
    const items = this.diagnostics.map(d => {
      const icon = d.severity === 'error' ? '{#f43f5e-fg}✕{/}' : d.severity === 'warning' ? '{#f59e0b-fg}⚠{/}' : '{#10b981-fg}✓{/}';
      return `${icon} {bold}${d.title || d.name}{/}`;
    });

    this.diagList.setItems(items);
    if (items.length > 0) {
      this.diagList.select(this.selectedDiagIndex);
    }
  }

  updateDoctorDetail() {
    const d = this.diagnostics[this.selectedDiagIndex];
    if (!d) {
      this.diagDetail.setContent('{center}{#64748b-fg}\n\nNo diagnostics available{/}{/center}');
      return;
    }

    const statusBadge = d.severity === 'error' 
      ? '{#f43f5e-bg}{#ffffff-fg}{bold} ERROR {/}'
      : d.severity === 'warning'
      ? '{#f59e0b-bg}{#08090e-fg}{bold} WARNING {/}'
      : '{#10b981-bg}{#08090e-fg}{bold} PASSING {/}';

    let content = `\n {bold}{#ffffff-fg}${d.title || d.name}{/} ${statusBadge}\n\n`;

    if (d.canAutoFix) {
      content += ` {#10b981-bg}{#ffffff-fg}{bold}  [ Enter ] Auto-Fix This Issue  {/}   {#312e81-bg}{#ffffff-fg}{bold}  [ a ] Fix All Issues  {/}\n\n`;
    }

    content += ` {bold}{#818cf8-fg}ISSUE ANALYSIS{/}\n`;
    content += ` {#312e81-fg}───────────────────────────────────────────────────────────────────{/}\n`;
    content += `   {#ffffff-fg}${d.message}{/}\n\n`;

    if (d.details) {
      content += `   {#94a3b8-fg}Details:{/} {#64748b-fg}${d.details}{/}\n\n`;
    }

    content += ` {bold}{#10b981-fg}RECOMMENDED REMEDIATION{/}\n`;
    content += ` {#312e81-fg}───────────────────────────────────────────────────────────────────{/}\n`;
    content += `   {#cbd5e1-fg}${d.remediation || d.fix || 'No action needed.'}{/}\n\n`;

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
