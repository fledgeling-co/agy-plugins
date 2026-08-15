import blessed from 'neo-blessed';
import { Registry } from '../core/registry.js';
import { Installer } from '../core/installer.js';
import { SyncEngine } from '../core/sync.js';
import { Doctor } from '../core/doctor.js';
import { ChangelogEngine } from '../core/changelog.js';

export class TuiApp {
  constructor() {
    this.tabs = ['catalog', 'marketplaces', 'installed', 'doctor'];
    this.currentTab = 'catalog';
    this.searchQuery = '';
    this.selectedIndex = 0;
    this.selectedMpIndex = 0;
    this.selectedInstIndex = 0;
    this.selectedDiagIndex = 0;
    this.groupByMarketplace = true;
    this.catalogRowMap = [];
    this.instRowMap = [];

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

    this.catalogContainer = blessed.box({
      parent: this.catalogView,
      top: 0,
      left: 0,
      width: '52%',
      height: '100%',
      border: { type: 'line' },
      label: ' {bold}{#818cf8-fg}AVAILABLE PLUGINS & SKILLS{/} ',
      tags: true,
      style: {
        bg: '#0f111a',
        border: { fg: '#312e81' }
      }
    });

    this.catalogHeader = blessed.box({
      parent: this.catalogContainer,
      top: 0,
      left: 0,
      right: 1,
      height: 1,
      tags: true,
      style: { bg: '#121524' }
    });

    this.catalogDivider = blessed.box({
      parent: this.catalogContainer,
      top: 1,
      left: 0,
      right: 1,
      height: 1,
      tags: true,
      style: { bg: '#0f111a' }
    });

    this.catalogList = blessed.list({
      parent: this.catalogContainer,
      top: 2,
      left: 0,
      right: 0,
      bottom: 0,
      border: false,
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
      left: '52%',
      width: '48%',
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

    this.marketplacesContainer = blessed.box({
      parent: this.marketplacesView,
      top: 0,
      left: 0,
      width: '52%',
      height: '100%',
      border: { type: 'line' },
      label: ' {bold}{#818cf8-fg}REGISTERED MARKETPLACE REPOSITORIES{/} ',
      tags: true,
      style: {
        bg: '#0f111a',
        border: { fg: '#312e81' }
      }
    });

    this.mpHeader = blessed.box({
      parent: this.marketplacesContainer,
      top: 0,
      left: 0,
      right: 1,
      height: 1,
      tags: true,
      style: { bg: '#121524' }
    });

    this.mpDivider = blessed.box({
      parent: this.marketplacesContainer,
      top: 1,
      left: 0,
      right: 1,
      height: 1,
      tags: true,
      style: { bg: '#0f111a' }
    });

    this.mpList = blessed.list({
      parent: this.marketplacesContainer,
      top: 2,
      left: 0,
      right: 0,
      bottom: 0,
      border: false,
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
      left: '52%',
      width: '48%',
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

    this.installedContainer = blessed.box({
      parent: this.installedView,
      top: 0,
      left: 0,
      width: '52%',
      height: '100%',
      border: { type: 'line' },
      label: ' {bold}{#818cf8-fg}INSTALLED CUSTOMIZATION SUITE{/} ',
      tags: true,
      style: {
        bg: '#0f111a',
        border: { fg: '#312e81' }
      }
    });

    this.instHeader = blessed.box({
      parent: this.installedContainer,
      top: 0,
      left: 0,
      right: 1,
      height: 1,
      tags: true,
      style: { bg: '#121524' }
    });

    this.instDivider = blessed.box({
      parent: this.installedContainer,
      top: 1,
      left: 0,
      right: 1,
      height: 1,
      tags: true,
      style: { bg: '#0f111a' }
    });

    this.instList = blessed.list({
      parent: this.installedContainer,
      top: 2,
      left: 0,
      right: 0,
      bottom: 0,
      border: false,
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
      left: '52%',
      width: '48%',
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

    this.doctorContainer = blessed.box({
      parent: this.doctorView,
      top: 0,
      left: 0,
      width: '52%',
      height: '100%',
      border: { type: 'line' },
      label: ' {bold}{#818cf8-fg}SYSTEM INTEGRITY & DOCTOR GATES{/} ',
      tags: true,
      style: {
        bg: '#0f111a',
        border: { fg: '#312e81' }
      }
    });

    this.diagHeader = blessed.box({
      parent: this.doctorContainer,
      top: 0,
      left: 0,
      right: 1,
      height: 1,
      tags: true,
      style: { bg: '#121524' }
    });

    this.diagDivider = blessed.box({
      parent: this.doctorContainer,
      top: 1,
      left: 0,
      right: 1,
      height: 1,
      tags: true,
      style: { bg: '#0f111a' }
    });

    this.diagList = blessed.list({
      parent: this.doctorContainer,
      top: 2,
      left: 0,
      right: 0,
      bottom: 0,
      border: false,
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
      left: '52%',
      width: '48%',
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

    // 6. Release History & Changelog Modal
    this.changelogModal = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '84%',
      height: '80%',
      border: { type: 'line' },
      label: ' {bold}{#38bdf8-fg} ✦ Release History & Changelog {/} ',
      tags: true,
      hidden: true,
      style: {
        bg: '#0f111a',
        border: { fg: '#38bdf8' }
      }
    });

    this.changelogContent = blessed.box({
      parent: this.changelogModal,
      top: 1,
      left: 2,
      right: 2,
      bottom: 2,
      tags: true,
      scrollable: true,
      mouse: true,
      keys: true,
      vi: true,
      alwaysScroll: true,
      scrollbar: {
        ch: '│',
        style: { bg: '#6366f1', fg: '#6366f1' }
      },
      style: {
        bg: '#0f111a'
      }
    });

    this.changelogFooter = blessed.box({
      parent: this.changelogModal,
      bottom: 0,
      left: 2,
      right: 2,
      height: 1,
      tags: true,
      content: '{#64748b-fg}[ Esc / c / q ] Close Modal    [ ↑ / ↓ / PageUp / PageDown ] Scroll{/}',
      style: {
        bg: '#0f111a'
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

    // Changelog Hotkey
    this.screen.key(['c'], () => {
      this.openChangelogModal();
    });

    // Grouping Toggle Hotkey
    this.screen.key(['g', 'm'], () => {
      this.groupByMarketplace = !this.groupByMarketplace;
      this.showToast(`Marketplace Sections: ${this.groupByMarketplace ? 'GROUPED' : 'FLAT LIST'}`);
      if (this.currentTab === 'catalog') {
        this.updateCatalogList();
        this.updateCatalogDetail();
      } else if (this.currentTab === 'installed') {
        this.updateInstalledList();
        this.updateInstalledDetail();
      }
      this.screen.render();
    });

    // Changelog Modal Close Handlers
    this.changelogModal.key(['escape', 'q'], () => {
      this.closeChangelogModal();
    });
    this.changelogContent.key(['escape', 'q'], () => {
      this.closeChangelogModal();
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

    this.catalogList.key(['space', 'i'], async () => {
      await this.toggleCurrentPlugin();
    });

    this.catalogList.key(['enter'], () => {
      this.openChangelogModal();
    });

    this.catalogList.key(['g', 'm'], () => {
      this.groupByMarketplace = !this.groupByMarketplace;
      this.showToast(`Marketplace Sections: ${this.groupByMarketplace ? 'GROUPED' : 'FLAT LIST'}`);
      this.updateCatalogList();
      this.updateCatalogDetail();
      this.screen.render();
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

    this.mpList.key(['space', 't'], () => {
      const mpKeys = Object.keys(this.marketplaces);
      const mp = mpKeys[this.selectedMpIndex];
      if (mp) {
        const auto = Registry.toggleAutoUpdate(mp);
        this.showToast(`Auto-update for ${mp}: ${auto ? 'ENABLED' : 'PAUSED'}`);
        this.refreshData();
      }
    });

    this.mpList.key(['enter'], () => {
      this.openChangelogModal();
    });

    this.mpList.key(['e'], () => {
      const mpKeys = Object.keys(this.marketplaces);
      const mp = mpKeys[this.selectedMpIndex];
      if (mp) {
        this.switchTab('catalog');
        if (this.groupByMarketplace) {
          const targetIndex = this.catalogRowMap.findIndex(r => r.marketplace === mp);
          if (targetIndex !== -1) {
            this.selectedIndex = targetIndex;
            this.catalogList.select(targetIndex);
            this.updateCatalogDetail();
          }
        }
      }
    });

    this.mpList.key(['u'], async () => {
      const mpKeys = Object.keys(this.marketplaces);
      const mp = mpKeys[this.selectedMpIndex];
      if (mp) await this.syncSingleMarketplace(mp);
    });

    this.mpList.key(['f'], async () => {
      const mpKeys = Object.keys(this.marketplaces);
      const mp = mpKeys[this.selectedMpIndex];
      if (mp) await this.forceSyncSingleMarketplace(mp);
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

    this.instList.key(['space', 'd'], async () => {
      const row = this.instRowMap[this.selectedInstIndex];
      if (!row) return;
      if (row.type === 'header') {
        this.showToast(`Select an installed plugin in ${row.marketplace} to uninstall`);
        return;
      }
      if (row.plugin) {
        await Installer.uninstallPlugin(row.plugin.name);
        this.showToast(`Uninstalled ${row.plugin.name}`);
        this.refreshData();
      }
    });

    this.instList.key(['enter'], () => {
      this.openChangelogModal();
    });

    this.instList.key(['g', 'm'], () => {
      this.groupByMarketplace = !this.groupByMarketplace;
      this.showToast(`Marketplace Sections: ${this.groupByMarketplace ? 'GROUPED' : 'FLAT LIST'}`);
      this.updateInstalledList();
      this.updateInstalledDetail();
      this.screen.render();
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

  openChangelogModal() {
    if (this.currentTab === 'marketplaces') {
      const keys = Object.keys(this.marketplaces);
      const k = keys[this.selectedMpIndex];
      if (!k) return;

      const data = ChangelogEngine.getMarketplaceChangelog(k);
      this.changelogModal.setLabel(` {bold}{#38bdf8-fg} ✦ Marketplace Release History: ${k} {/} `);
      this.changelogContent.setContent(ChangelogEngine.formatForTui(data, { maxSections: 15 }));
    } else if (this.currentTab === 'installed') {
      const row = this.instRowMap[this.selectedInstIndex];
      if (!row) return;

      if (row.type === 'header') {
        const data = ChangelogEngine.getMarketplaceChangelog(row.marketplace);
        this.changelogModal.setLabel(` {bold}{#38bdf8-fg} ✦ Marketplace Release History: ${row.marketplace} {/} `);
        this.changelogContent.setContent(ChangelogEngine.formatForTui(data, { maxSections: 15 }));
      } else {
        const p = row.plugin;
        if (!p) return;
        const data = ChangelogEngine.getPluginChangelog(p.name, p.marketplaceName);
        this.changelogModal.setLabel(` {bold}{#38bdf8-fg} ✦ Plugin Release History: ${p.name} (v${p.version || '1.0.0'}) {/} `);
        this.changelogContent.setContent(ChangelogEngine.formatForTui(data, { maxSections: 15 }));
      }
    } else {
      const row = this.catalogRowMap[this.selectedIndex];
      if (!row) return;

      if (row.type === 'header') {
        const data = ChangelogEngine.getMarketplaceChangelog(row.marketplace);
        this.changelogModal.setLabel(` {bold}{#38bdf8-fg} ✦ Marketplace Release History: ${row.marketplace} {/} `);
        this.changelogContent.setContent(ChangelogEngine.formatForTui(data, { maxSections: 15 }));
      } else {
        const p = row.plugin;
        if (!p) return;
        const data = ChangelogEngine.getPluginChangelog(p.name, p.marketplaceName);
        this.changelogModal.setLabel(` {bold}{#38bdf8-fg} ✦ Plugin Release History: ${p.name} (v${p.version || '1.0.0'}) {/} `);
        this.changelogContent.setContent(ChangelogEngine.formatForTui(data, { maxSections: 15 }));
      }
    }

    this.changelogContent.scrollTo(0);
    this.changelogModal.show();
    this.changelogContent.focus();
    this.screen.render();
  }

  closeChangelogModal() {
    this.changelogModal.hide();
    this.getCurrentList().focus();
    this.screen.render();
  }

  formatRelativeTime(isoString) {
    if (!isoString) return 'never';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 45) return 'just now';
    if (diffSec < 90) return '1m ago';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
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
      help = ' {#64748b-fg}[↑/↓]{/} {#cbd5e1-fg}Navigate{/}   {#06b6d4-fg}[←/→]{/} {#cbd5e1-fg}Tabs{/}   {#10b981-fg}[Space/i]{/} {#cbd5e1-fg}Install{/}   {#38bdf8-fg}[Enter/c]{/} {#cbd5e1-fg}Changelog{/}   {#a855f7-fg}[g]{/} {#cbd5e1-fg}Group/Flat{/}   {#6366f1-fg}[u]{/} {#cbd5e1-fg}Pull{/}   {#ec4899-fg}[/]{/} {#cbd5e1-fg}Search{/}   {#64748b-fg}[q]{/} {#cbd5e1-fg}Exit{/}';
    } else if (this.currentTab === 'marketplaces') {
      help = ' {#64748b-fg}[↑/↓]{/} {#cbd5e1-fg}Navigate{/}   {#06b6d4-fg}[←/→]{/} {#cbd5e1-fg}Tabs{/}   {#10b981-fg}[Space/t]{/} {#cbd5e1-fg}Auto-Sync{/}   {#38bdf8-fg}[Enter/c]{/} {#cbd5e1-fg}Changelog{/}   {#38bdf8-fg}[e]{/} {#cbd5e1-fg}Explore Skills{/}   {#6366f1-fg}[a]{/} {#cbd5e1-fg}Add{/}   {#6366f1-fg}[u]{/} {#cbd5e1-fg}Sync{/}   {#f59e0b-fg}[f]{/} {#cbd5e1-fg}Force Sync{/}   {#f43f5e-fg}[d]{/} {#cbd5e1-fg}Remove{/}';
    } else if (this.currentTab === 'installed') {
      help = ' {#64748b-fg}[↑/↓]{/} {#cbd5e1-fg}Navigate{/}   {#06b6d4-fg}[←/→]{/} {#cbd5e1-fg}Tabs{/}   {#f43f5e-fg}[Space/d]{/} {#cbd5e1-fg}Uninstall{/}   {#38bdf8-fg}[Enter/c]{/} {#cbd5e1-fg}Changelog{/}   {#a855f7-fg}[g]{/} {#cbd5e1-fg}Group/Flat{/}   {#ec4899-fg}[/]{/} {#cbd5e1-fg}Search{/}   {#64748b-fg}[q]{/} {#cbd5e1-fg}Exit{/}';
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

  formatTableCell(text, width, color = null, bold = false, align = 'left') {
    const raw = String(text || '').replace(/[\r\n\t]+/g, ' ');
    let truncated = raw;
    if (raw.length > width) {
      truncated = width > 3 ? raw.slice(0, width - 2) + '..' : raw.slice(0, width);
    }

    let padded = '';
    if (align === 'right') {
      padded = truncated.padStart(width, ' ');
    } else if (align === 'center') {
      const padTotal = Math.max(0, width - truncated.length);
      const padLeft = Math.floor(padTotal / 2);
      const padRight = padTotal - padLeft;
      padded = ' '.repeat(padLeft) + truncated + ' '.repeat(padRight);
    } else {
      padded = truncated.padEnd(width, ' ');
    }

    if (!color && !bold) return padded;

    let styled = padded;
    if (color) styled = `{${color}-fg}${styled}{/}`;
    if (bold) styled = `{bold}${styled}{/}`;
    return styled;
  }

  formatCategoryTag(cat, width = 11) {
    const c = (cat || 'SKILL').toUpperCase();
    let shortName = c;
    let color = '#818cf8';

    if (c === 'DEVELOPMENT' || c === 'DEV') { shortName = 'DEV'; color = '#818cf8'; }
    else if (c === 'PRODUCTIVITY' || c === 'PROD') { shortName = 'PROD'; color = '#38bdf8'; }
    else if (c === 'DESIGN' || c === 'DESIGN RULE' || c === 'ARTIFACT') { shortName = 'DESIGN'; color = '#f59e0b'; }
    else if (c === 'PERSONA') { shortName = 'PERSONA'; color = '#c084fc'; }
    else if (c === 'ORCHESTRATOR' || c === 'ORCH') { shortName = 'ORCH'; color = '#a78bfa'; }
    else if (c === 'CONTENT') { shortName = 'CONTENT'; color = '#ec4899'; }
    else if (c === 'MCP') { shortName = 'MCP'; color = '#10b981'; }
    else if (c === 'RULE') { shortName = 'RULE'; color = '#94a3b8'; }
    else if (c === 'SCAFFOLD') { shortName = 'SCAFFOLD'; color = '#38bdf8'; }
    else { shortName = c.slice(0, width - 4); color = '#64748b'; }

    return this.formatTableCell(`[${shortName}]`, width, color);
  }

  getCategoryBadge(cat) {
    return this.formatCategoryTag(cat, 11);
  }

  updateCatalogList() {
    this.catalogContainer.setLabel(this.groupByMarketplace 
      ? ' {bold}{#818cf8-fg}AVAILABLE PLUGINS & SKILLS [Grouped by Marketplace]{/} ' 
      : ' {bold}{#818cf8-fg}AVAILABLE PLUGINS & SKILLS [Flat List]{/} ');

    const listWidth = Math.max(40, Math.floor((this.screen.width || 120) * 0.52) - 4);
    const showOrigin = listWidth >= 70;
    const originW = 24;
    const nameW = 26;
    const verW = 8;
    const fixedW = 1 + nameW + verW + (showOrigin ? originW : 0);
    const descW = Math.max(12, listWidth - fixedW);

    // Sticky Table Header
    const nameH = this.formatTableCell('NAME', nameW, '#64748b', true);
    const verH = this.formatTableCell('VER', verW, '#64748b', true);
    const descLabel = descW < 11 ? 'DESC' : 'DESCRIPTION';
    const descH = this.formatTableCell(descLabel, descW, '#64748b', true);
    const origH = showOrigin ? this.formatTableCell('ORIGIN', originW, '#64748b', true) : '';
    this.catalogHeader.setContent(` ${nameH}${verH}${descH}${origH}`);

    // Table Divider
    const nameDiv = this.formatTableCell('─'.repeat(Math.max(2, nameW - 2)), nameW, '#312e81');
    const verDiv = this.formatTableCell('─'.repeat(Math.max(2, verW - 2)), verW, '#312e81');
    const descDiv = this.formatTableCell('─'.repeat(Math.max(2, descW - 2)), descW, '#312e81');
    const origDiv = showOrigin ? this.formatTableCell('─'.repeat(Math.max(2, originW - 2)), originW, '#312e81') : '';
    this.catalogDivider.setContent(` ${nameDiv}${verDiv}${descDiv}${origDiv}`);

    this.catalogRowMap = [];
    const items = [];

    if (this.groupByMarketplace) {
      const groups = {};
      for (const p of this.filteredPlugins) {
        const mpName = p.marketplaceName || 'other';
        if (!groups[mpName]) groups[mpName] = [];
        groups[mpName].push(p);
      }

      for (const [mpName, pluginsInGroup] of Object.entries(groups)) {
        const installedCount = pluginsInGroup.filter(p => p.installed).length;
        const totalCount = pluginsInGroup.length;
        const bannerText = `── ⛃ ${mpName} (${totalCount} skills, ${installedCount} active) `;
        const bannerLine = bannerText.padEnd(listWidth - 2, '─');

        this.catalogRowMap.push({
          type: 'header',
          marketplace: mpName,
          total: totalCount,
          installed: installedCount,
          plugins: pluginsInGroup
        });
        items.push(`{#38bdf8-fg}{bold}${bannerLine}{/}`);

        for (const p of pluginsInGroup) {
          this.catalogRowMap.push({
            type: 'plugin',
            plugin: p
          });

          const icon = p.installed ? '✓ ' : '◉ ';
          const iconColor = p.installed ? '#10b981' : '#6366f1';
          const iconStyled = `{${iconColor}-fg}${icon}{/}`;
          const rawName = p.name;
          const truncatedName = rawName.length > nameW - 3 ? rawName.slice(0, nameW - 5) + '..' : rawName;
          const paddedName = truncatedName.padEnd(nameW - 2, ' ');
          const nameCell = `${iconStyled}{bold}${paddedName}{/}`;

          const verCell = this.formatTableCell(p.version ? `v${p.version}` : 'v1.0.0', verW, '#38bdf8');
          const descCell = this.formatTableCell(p.description || '', descW, '#94a3b8');

          if (showOrigin) {
            const origCell = this.formatTableCell(p.marketplaceName || '', originW, '#64748b');
            items.push(` ${nameCell}${verCell}${descCell}${origCell}`);
          } else {
            items.push(` ${nameCell}${verCell}${descCell}`);
          }
        }
      }
    } else {
      for (const p of this.filteredPlugins) {
        this.catalogRowMap.push({
          type: 'plugin',
          plugin: p
        });

        const icon = p.installed ? '✓ ' : '◉ ';
        const iconColor = p.installed ? '#10b981' : '#6366f1';
        const iconStyled = `{${iconColor}-fg}${icon}{/}`;
        const rawName = p.name;
        const truncatedName = rawName.length > nameW - 3 ? rawName.slice(0, nameW - 5) + '..' : rawName;
        const paddedName = truncatedName.padEnd(nameW - 2, ' ');
        const nameCell = `${iconStyled}{bold}${paddedName}{/}`;

        const verCell = this.formatTableCell(p.version ? `v${p.version}` : 'v1.0.0', verW, '#38bdf8');
        const descCell = this.formatTableCell(p.description || '', descW, '#94a3b8');

        if (showOrigin) {
          const origCell = this.formatTableCell(p.marketplaceName || '', originW, '#64748b');
          items.push(` ${nameCell}${verCell}${descCell}${origCell}`);
        } else {
          items.push(` ${nameCell}${verCell}${descCell}`);
        }
      }
    }

    this.catalogList.setItems(items);
    if (items.length > 0) {
      this.selectedIndex = Math.min(this.selectedIndex, items.length - 1);
      if (this.selectedIndex < 0) this.selectedIndex = 0;
      this.catalogList.select(this.selectedIndex);
    }
  }

  updateCatalogDetail() {
    const row = this.catalogRowMap[this.selectedIndex];
    if (!row) {
      this.catalogDetail.setContent('{center}{#64748b-fg}\n\nNo plugin selected or matching search query.{/}{/center}');
      return;
    }

    if (row.type === 'header') {
      const mpName = row.marketplace;
      const mp = this.marketplaces[mpName] || {};
      const source = mp.source?.repo || mp.source || 'local';
      const autoSync = mp.autoUpdate !== false ? '{#10b981-fg}ENABLED (Continuous 60s){/}' : '{#f59e0b-fg}PAUSED (Manual Only){/}';
      const syncTimeStr = this.formatRelativeTime(mp.lastUpdated);
      const skillsTimeStr = this.formatRelativeTime(mp.lastSkillsUpdated || mp.commitDate || mp.lastUpdated);
      const commitTag = mp.commitSha ? ` (${mp.commitSha})` : '';

      let content = `\n {bold}{#ffffff-fg}⛃ ${mpName}{/} {#38bdf8-bg}{#08090e-fg}{bold} MARKETPLACE SECTION {/}\n`;
      content += ` {#64748b-fg}Remote Repository: https://github.com/${source}{/}\n\n`;

      const syncBtn = mp.autoUpdate !== false 
        ? '{#10b981-bg}{#08090e-fg}{bold}  [Space/t] Auto-Sync: ON  {/}' 
        : '{#64748b-bg}{#ffffff-fg}{bold}  [Space/t] Auto-Sync: OFF  {/}';
      const logBtn = '{#38bdf8-bg}{#08090e-fg}{bold}  [Enter/c] Changelog  {/}';
      const pullBtn = '{#312e81-bg}{#ffffff-fg}{bold}  [u] Pull  {/}';
      const groupBtn = '{#a855f7-bg}{#ffffff-fg}{bold}  [g] Flat/Grouped View  {/}';

      content += ` ${syncBtn}   ${logBtn}   ${pullBtn}\n`;
      content += ` ${groupBtn}\n\n`;

      // 2x2 Metric Grid Cards
      const cloneVal = `~/.gemini/plugins/...`.padEnd(28, ' ');
      const skillsVal = `${row.total} skills (${row.installed} active)`.slice(0, 28).padEnd(28, ' ');
      const skillsUpdatedVal = `${skillsTimeStr}${commitTag}`.slice(0, 28).padEnd(28, ' ');
      const syncStateVal = `${autoSync}`.padEnd(28, ' ');

      content += ` {#312e81-fg}╭──────────────────────────────╮  ╭──────────────────────────────╮{/}\n`;
      content += ` {#312e81-fg}│{/} {#64748b-fg}SECTION DISCOVERY            {/} {#312e81-fg}│  │{/} {#64748b-fg}SKILLS IN SECTION            {/} {#312e81-fg}│{/}\n`;
      content += ` {#312e81-fg}│{/} {#06b6d4-fg}${cloneVal}{/} {#312e81-fg}│  │{/} {#10b981-fg}${skillsVal}{/} {#312e81-fg}│{/}\n`;
      content += ` {#312e81-fg}╰──────────────────────────────╯  ╰──────────────────────────────╯{/}\n`;

      content += ` {#312e81-fg}╭──────────────────────────────╮  ╭──────────────────────────────╮{/}\n`;
      content += ` {#312e81-fg}│{/} {#64748b-fg}SKILLS UPDATED LOCALLY       {/} {#312e81-fg}│  │{/} {#64748b-fg}AUTO-SYNC STATE              {/} {#312e81-fg}│{/}\n`;
      content += ` {#312e81-fg}│{/} {#06b6d4-fg}${skillsUpdatedVal}{/} {#312e81-fg}│  │{/} {#cbd5e1-fg}${syncStateVal}{/} {#312e81-fg}│{/}\n`;
      content += ` {#312e81-fg}╰──────────────────────────────╯  ╰──────────────────────────────╯{/}\n\n`;

      content += ` {bold}{#06b6d4-fg}SKILLS IN THIS MARKETPLACE (${row.plugins.length}){/}\n`;
      content += ` {#312e81-fg}───────────────────────────────────────────────────────────────────{/}\n`;
      for (const p of row.plugins.slice(0, 8)) {
        const inst = p.installed ? '{#10b981-fg}[Installed]{/}' : '{#64748b-fg}[Available]{/}';
        const verBadge = p.version ? `{#06b6d4-fg}v${p.version}{/}` : '{#64748b-fg}v1.0.0{/}';
        content += `   • {bold}${p.name}{/} ${verBadge} ${inst} - {#94a3b8-fg}${p.description.slice(0, 36)}{/}\n`;
      }
      if (row.plugins.length > 8) {
        content += `   {#64748b-fg}...and ${row.plugins.length - 8} more skills below in list{/}\n`;
      }

      this.catalogDetail.setContent(content);
      return;
    }

    const p = row.plugin;
    if (!p) {
      this.catalogDetail.setContent('{center}{#64748b-fg}\n\nNo plugin selected or matching search query.{/}{/center}');
      return;
    }

    const origin = p.marketplaceSource 
      ? `https://github.com/${p.marketplaceSource}` 
      : p.marketplaceName;

    // Header Card (Large title with version badge)
    let content = `\n {bold}{#ffffff-fg}${p.name}{/} {#06b6d4-bg}{#08090e-fg}{bold} v${p.version || '1.0.0'} {/}\n`;
    content += ` {#64748b-fg}⛃ ${origin}          Marketplace: {#94a3b8-fg}${p.marketplaceName}{/}\n\n`;

    // Top Live Action Buttons
    const actionBtn = p.installed 
      ? '{#f43f5e-bg}{#ffffff-fg}{bold}  ✕ Uninstall [Space]  {/}' 
      : '{#10b981-bg}{#ffffff-fg}{bold}  ✓ Install [Space]  {/}';
    const syncBtn = '{#312e81-bg}{#ffffff-fg}{bold}  ↻ Sync [u]  {/}';
    const logBtn = '{#38bdf8-bg}{#08090e-fg}{bold}  ✦ Changelog [c]  {/}';
    content += ` ${actionBtn}   ${syncBtn}   ${logBtn}\n\n`;

    // 1. Activation Trigger Card & Exposed Skills (With individual skill versions)
    const cardW = 60;
    const innerW = cardW - 2;
    content += ` {bold}{#a855f7-fg}✦ ACTIVATION TRIGGERS & EXPOSED SKILLS (${p.skills?.length || 1}){/}\n`;
    content += ` {#312e81-fg}╭${'─'.repeat(innerW)}╮{/}\n`;
    if (p.skills && p.skills.length > 0) {
      for (const s of p.skills.slice(0, 3)) {
        const sVer = s.version ? `v${s.version}` : `v${p.version || '1.0.0'}`;
        const sLine = `✦ ${s.name} [${sVer}] (~${s.tokenFootprint || 110} tok)`.slice(0, innerW - 2).padEnd(innerW - 2, ' ');
        content += ` {#312e81-fg}│{/} {#ffffff-fg} ${sLine} {/} {#312e81-fg}│{/}\n`;
        const wrappedDesc = this.wrapLines(s.description || 'Native tool capability for Antigravity.', innerW - 4);
        for (const dl of wrappedDesc.slice(0, 2)) {
          const pDl = dl.padEnd(innerW - 2, ' ');
          content += ` {#312e81-fg}│{/} {#94a3b8-fg}   ${pDl} {/} {#312e81-fg}│{/}\n`;
        }
      }
      if (p.skills.length > 3) {
        const more = `... and ${p.skills.length - 3} more skill(s) exposed in bundle`.padEnd(innerW - 2, ' ');
        content += ` {#312e81-fg}│{/} {#64748b-fg} ${more} {/} {#312e81-fg}│{/}\n`;
      }
    } else {
      const wrappedIntent = this.wrapLines(`"${p.description || 'Native tool capability for Antigravity.'}"`, innerW - 2);
      for (const line of wrappedIntent.slice(0, 3)) {
        const padded = line.padEnd(innerW - 2, ' ');
        content += ` {#312e81-fg}│{/} {#cbd5e1-fg} ${padded} {/} {#312e81-fg}│{/}\n`;
      }
    }
    content += ` {#312e81-fg}╰${'─'.repeat(innerW)}╯{/}\n\n`;

    // 2. 2x2 Metric Grid Cards
    const tileW = 28;
    const tileInner = tileW - 2;
    const topBar = `╭${'─'.repeat(tileInner)}╮  ╭${'─'.repeat(tileInner)}╮`;
    const botBar = `╰${'─'.repeat(tileInner)}╯  ╰${'─'.repeat(tileInner)}╯`;

    const tokVal = `~${p.tokenFootprint || 110} tok (Discovery)`.slice(0, tileInner - 2).padEnd(tileInner - 2, ' ');
    const verVal = `Plugin v${p.version || '1.0.0'} (${p.skills?.length || 1} skills)`.slice(0, tileInner - 2).padEnd(tileInner - 2, ' ');
    const targetVal = `~/.gemini/config/plugins`.slice(0, tileInner - 2).padEnd(tileInner - 2, ' ');
    const originVal = `${p.marketplaceName}`.slice(0, tileInner - 2).padEnd(tileInner - 2, ' ');

    const lbl1 = 'TOKEN FOOTPRINT'.padEnd(tileInner - 2, ' ');
    const lbl2 = 'VERSIONS & SKILLS'.padEnd(tileInner - 2, ' ');
    const lbl3 = 'TARGET DISCOVERY'.padEnd(tileInner - 2, ' ');
    const lbl4 = 'COLLECTION ORIGIN'.padEnd(tileInner - 2, ' ');

    content += ` {#312e81-fg}${topBar}{/}\n`;
    content += ` {#312e81-fg}│{/} {#64748b-fg} ${lbl1} {/} {#312e81-fg}│  │{/} {#64748b-fg} ${lbl2} {/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}│{/} {#ffffff-fg} ${tokVal} {/} {#312e81-fg}│  │{/} {#10b981-fg} ${verVal} {/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}${botBar}{/}\n`;

    content += ` {#312e81-fg}${topBar}{/}\n`;
    content += ` {#312e81-fg}│{/} {#64748b-fg} ${lbl3} {/} {#312e81-fg}│  │{/} {#64748b-fg} ${lbl4} {/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}│{/} {#06b6d4-fg} ${targetVal} {/} {#312e81-fg}│  │{/} {#cbd5e1-fg} ${originVal} {/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}${botBar}{/}\n\n`;

    // 3. Recent Release Notes & Changelog Card
    const changelog = ChangelogEngine.getPluginChangelog(p.name, p.marketplaceName);
    content += ` {bold}{#38bdf8-fg}✦ RECENT RELEASE HIGHLIGHTS (CHANGELOG){/}   {#38bdf8-fg}[ c ] Full View{/}\n`;
    content += ` {#312e81-fg}╭${'─'.repeat(innerW)}╮{/}\n`;
    if (changelog.found && changelog.sections.length > 0) {
      const latest = changelog.sections[0];
      const headingLine = `Release: ${latest.heading}`.slice(0, innerW - 2).padEnd(innerW - 2, ' ');
      content += ` {#312e81-fg}│{/} {#06b6d4-fg} ${headingLine} {/} {#312e81-fg}│{/}\n`;
      const bodySnippet = latest.body.split('\n').filter(l => l.trim().length > 0).slice(0, 2);
      for (const bl of bodySnippet) {
        const cleanBl = bl.replace(/^[-*]\s+/, '• ').slice(0, innerW - 2).padEnd(innerW - 2, ' ');
        content += ` {#312e81-fg}│{/} {#cbd5e1-fg} ${cleanBl} {/} {#312e81-fg}│{/}\n`;
      }
    } else {
      const noLog = 'No local CHANGELOG.md entries found.'.padEnd(innerW - 2, ' ');
      content += ` {#312e81-fg}│{/} {#64748b-fg} ${noLog} {/} {#312e81-fg}│{/}\n`;
    }
    content += ` {#312e81-fg}╰${'─'.repeat(innerW)}╯{/}\n\n`;

    // 4. Ingestion Staging Path Card
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
    const listWidth = Math.max(40, Math.floor((this.screen.width || 120) * 0.52) - 4);
    const showOrigin = listWidth >= 70;
    const nameW = 22;
    const statusW = 13;
    const skillsW = 10;
    const updateW = 18;
    const fixedW = 1 + nameW + statusW + skillsW + updateW;
    const originW = showOrigin ? Math.max(22, listWidth - fixedW) : 0;

    // Sticky Table Header
    const nameH = this.formatTableCell('COLLECTION', nameW, '#64748b', true);
    const statusH = this.formatTableCell('AUTO UPDATE', statusW, '#64748b', true);
    const skillsH = this.formatTableCell('SKILLS', skillsW, '#64748b', true);
    const updateH = this.formatTableCell('LAST UPDATE', updateW, '#64748b', true);
    const origH = showOrigin ? this.formatTableCell('ORIGIN', originW, '#64748b', true) : '';
    this.mpHeader.setContent(` ${nameH}${statusH}${skillsH}${updateH}${origH}`);

    // Table Divider
    const nameDiv = this.formatTableCell('─'.repeat(Math.max(2, nameW - 2)), nameW, '#312e81');
    const statusDiv = this.formatTableCell('─'.repeat(Math.max(2, statusW - 2)), statusW, '#312e81');
    const skillsDiv = this.formatTableCell('─'.repeat(Math.max(2, skillsW - 2)), skillsW, '#312e81');
    const updateDiv = this.formatTableCell('─'.repeat(Math.max(2, updateW - 2)), updateW, '#312e81');
    const origDiv = showOrigin ? this.formatTableCell('─'.repeat(Math.max(2, originW - 2)), originW, '#312e81') : '';
    this.mpDivider.setContent(` ${nameDiv}${statusDiv}${skillsDiv}${updateDiv}${origDiv}`);

    const items = keys.map(k => {
      const mp = this.marketplaces[k];
      const nameCell = this.formatTableCell('⛃ ' + k, nameW, null, true);

      const isAuto = mp.autoUpdate !== false;
      const statusCell = this.formatTableCell(isAuto ? 'ON' : 'OFF', statusW, isAuto ? '#10b981' : '#64748b', true);

      const plugins = Registry.getPluginsForMarketplace(k);
      const skillsCell = this.formatTableCell(`${plugins.length} tools`, skillsW, '#06b6d4');

      const skillTime = this.formatRelativeTime(mp.lastSkillsUpdated || mp.commitDate || mp.lastUpdated);
      const commitTag = mp.commitSha ? ` (${mp.commitSha})` : '';
      const updateCell = this.formatTableCell(`${skillTime}${commitTag}`, updateW, '#10b981');

      if (showOrigin) {
        const source = mp.source?.repo || mp.source || 'local';
        const origCell = this.formatTableCell(source, originW, '#64748b');
        return ` ${nameCell}${statusCell}${skillsCell}${updateCell}${origCell}`;
      }

      return ` ${nameCell}${statusCell}${skillsCell}${updateCell}`;
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
    const syncTimeStr = this.formatRelativeTime(mp.lastUpdated);
    const skillsTimeStr = this.formatRelativeTime(mp.lastSkillsUpdated || mp.commitDate || mp.lastUpdated);
    const commitTag = mp.commitSha ? ` (${mp.commitSha})` : '';

    let content = `\n {bold}{#ffffff-fg}${k}{/} {#06b6d4-bg}{#08090e-fg}{bold} MARKETPLACE {/}\n`;
    content += ` {#64748b-fg}Remote Repository: https://github.com/${source}{/}\n\n`;

    // Action Buttons (Formatted in 2 clean rows to prevent line wrapping)
    const syncBtn = mp.autoUpdate !== false 
      ? '{#10b981-bg}{#08090e-fg}{bold}  [Space/t] Auto-Sync: ON  {/}' 
      : '{#64748b-bg}{#ffffff-fg}{bold}  [Space/t] Auto-Sync: OFF  {/}';
    const logBtn = '{#38bdf8-bg}{#08090e-fg}{bold}  [c] Changelog  {/}';
    const pullBtn = '{#312e81-bg}{#ffffff-fg}{bold}  [u] Pull  {/}';
    const resetBtn = '{#d97706-bg}{#ffffff-fg}{bold}  [f] Force Reset  {/}';
    const removeBtn = '{#f43f5e-bg}{#ffffff-fg}{bold}  [d] Remove  {/}';

    content += ` ${syncBtn}   ${logBtn}   ${pullBtn}\n`;
    content += ` ${resetBtn}   ${removeBtn}\n\n`;

    // 2x2 Metric Grid Cards
    const cloneVal = `~/.gemini/plugins/...`.padEnd(28, ' ');
    const syncVal = `${syncTimeStr}`.slice(0, 28).padEnd(28, ' ');
    const skillsUpdatedVal = `${skillsTimeStr}${commitTag}`.slice(0, 28).padEnd(28, ' ');
    const syncStateVal = `${autoSync}`.padEnd(28, ' ');

    content += ` {#312e81-fg}╭──────────────────────────────╮  ╭──────────────────────────────╮{/}\n`;
    content += ` {#312e81-fg}│{/} {#64748b-fg}LOCAL CLONE PATH             {/} {#312e81-fg}│  │{/} {#64748b-fg}LAST SYNC RUN CHECK          {/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}│{/} {#ffffff-fg}${cloneVal}{/} {#312e81-fg}│  │{/} {#10b981-fg}${syncVal}{/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}╰──────────────────────────────╯  ╰──────────────────────────────╯{/}\n`;

    content += ` {#312e81-fg}╭──────────────────────────────╮  ╭──────────────────────────────╮{/}\n`;
    content += ` {#312e81-fg}│{/} {#64748b-fg}SKILLS UPDATED LOCALLY       {/} {#312e81-fg}│  │{/} {#64748b-fg}AUTO-SYNC STATE              {/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}│{/} {#06b6d4-fg}${skillsUpdatedVal}{/} {#312e81-fg}│  │{/} {#cbd5e1-fg}${syncStateVal}{/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}╰──────────────────────────────╯  ╰──────────────────────────────╯{/}\n\n`;

    // Marketplace Changelog Preview Card
    const mpChangelog = ChangelogEngine.getMarketplaceChangelog(k);
    const cardW = 60;
    const innerW = cardW - 2;
    content += ` {bold}{#38bdf8-fg}✦ MARKETPLACE RELEASE HISTORY (CHANGELOG){/}   {#38bdf8-fg}[ c ] Open Modal{/}\n`;
    content += ` {#312e81-fg}╭${'─'.repeat(innerW)}╮{/}\n`;
    if (mpChangelog.found && mpChangelog.sections.length > 0) {
      const latest = mpChangelog.sections[0];
      const headingLine = `Latest: ${latest.heading}`.slice(0, innerW - 2).padEnd(innerW - 2, ' ');
      content += ` {#312e81-fg}│{/} {#06b6d4-fg} ${headingLine} {/} {#312e81-fg}│{/}\n`;
      const bodySnippet = latest.body.split('\n').filter(l => l.trim().length > 0).slice(0, 2);
      for (const bl of bodySnippet) {
        const cleanBl = bl.replace(/^[-*]\s+/, '• ').slice(0, innerW - 2).padEnd(innerW - 2, ' ');
        content += ` {#312e81-fg}│{/} {#cbd5e1-fg} ${cleanBl} {/} {#312e81-fg}│{/}\n`;
      }
    } else {
      const noLog = 'No CHANGELOG.md found in marketplace root.'.padEnd(innerW - 2, ' ');
      content += ` {#312e81-fg}│{/} {#64748b-fg} ${noLog} {/} {#312e81-fg}│{/}\n`;
    }
    content += ` {#312e81-fg}╰${'─'.repeat(innerW)}╯{/}\n\n`;

    content += ` {bold}{#06b6d4-fg}REGISTERED PLUGINS & SKILLS IN THIS MARKETPLACE (${plugins.length}){/}\n`;
    content += ` {#312e81-fg}───────────────────────────────────────────────────────────────────{/}\n`;
    for (const p of plugins.slice(0, 10)) {
      const inst = p.installed ? '{#10b981-fg}[Installed]{/}' : '{#64748b-fg}[Available]{/}';
      const verBadge = p.version ? `{#06b6d4-fg}v${p.version}{/}` : '{#64748b-fg}v1.0.0{/}';
      content += `   • {bold}${p.name}{/} ${verBadge} ${inst} - {#94a3b8-fg}${p.description.slice(0, 36)}{/}\n`;
    }
    if (plugins.length > 10) {
      content += `   {#64748b-fg}...and ${plugins.length - 10} more skills{/}\n`;
    }

    this.mpDetail.setContent(content);
  }

  updateInstalledList() {
    this.installedContainer.setLabel(this.groupByMarketplace 
      ? ' {bold}{#818cf8-fg}INSTALLED CUSTOMIZATION SUITE [Grouped by Marketplace]{/} ' 
      : ' {bold}{#818cf8-fg}INSTALLED CUSTOMIZATION SUITE [Flat List]{/} ');

    const installed = this.filteredPlugins.filter(p => p.installed);
    const listWidth = Math.max(40, Math.floor((this.screen.width || 120) * 0.52) - 4);
    const showOrigin = listWidth >= 70;
    const originW = 24;
    const nameW = 26;
    const verW = 8;
    const fixedW = 1 + nameW + verW + (showOrigin ? originW : 0);
    const descW = Math.max(12, listWidth - fixedW);

    // Sticky Table Header
    const nameH = this.formatTableCell('NAME', nameW, '#64748b', true);
    const verH = this.formatTableCell('VER', verW, '#64748b', true);
    const descLabel = descW < 11 ? 'DESC' : 'DESCRIPTION';
    const descH = this.formatTableCell(descLabel, descW, '#64748b', true);
    const origH = showOrigin ? this.formatTableCell('ORIGIN', originW, '#64748b', true) : '';
    this.instHeader.setContent(` ${nameH}${verH}${descH}${origH}`);

    // Table Divider
    const nameDiv = this.formatTableCell('─'.repeat(Math.max(2, nameW - 2)), nameW, '#312e81');
    const verDiv = this.formatTableCell('─'.repeat(Math.max(2, verW - 2)), verW, '#312e81');
    const descDiv = this.formatTableCell('─'.repeat(Math.max(2, descW - 2)), descW, '#312e81');
    const origDiv = showOrigin ? this.formatTableCell('─'.repeat(Math.max(2, originW - 2)), originW, '#312e81') : '';
    this.instDivider.setContent(` ${nameDiv}${verDiv}${descDiv}${origDiv}`);

    this.instRowMap = [];
    const items = [];

    if (this.groupByMarketplace) {
      const groups = {};
      for (const p of installed) {
        const mpName = p.marketplaceName || 'other';
        if (!groups[mpName]) groups[mpName] = [];
        groups[mpName].push(p);
      }

      for (const [mpName, pluginsInGroup] of Object.entries(groups)) {
        const bannerText = `── ⛃ ${mpName} (${pluginsInGroup.length} installed) `;
        const bannerLine = bannerText.padEnd(listWidth - 2, '─');

        this.instRowMap.push({
          type: 'header',
          marketplace: mpName,
          count: pluginsInGroup.length,
          plugins: pluginsInGroup
        });
        items.push(`{#10b981-fg}{bold}${bannerLine}{/}`);

        for (const p of pluginsInGroup) {
          this.instRowMap.push({
            type: 'plugin',
            plugin: p
          });

          const icon = '{#10b981-fg}✓ {/}';
          const rawName = p.name;
          const truncatedName = rawName.length > nameW - 3 ? rawName.slice(0, nameW - 5) + '..' : rawName;
          const paddedName = truncatedName.padEnd(nameW - 2, ' ');
          const nameCell = `${icon}{bold}${paddedName}{/}`;

          const verCell = this.formatTableCell(p.version ? `v${p.version}` : 'v1.0.0', verW, '#38bdf8');
          const descCell = this.formatTableCell(p.description || '', descW, '#94a3b8');

          if (showOrigin) {
            const origCell = this.formatTableCell(p.marketplaceName || '', originW, '#64748b');
            items.push(` ${nameCell}${verCell}${descCell}${origCell}`);
          } else {
            items.push(` ${nameCell}${verCell}${descCell}`);
          }
        }
      }
    } else {
      for (const p of installed) {
        this.instRowMap.push({
          type: 'plugin',
          plugin: p
        });

        const icon = '{#10b981-fg}✓ {/}';
        const rawName = p.name;
        const truncatedName = rawName.length > nameW - 3 ? rawName.slice(0, nameW - 5) + '..' : rawName;
        const paddedName = truncatedName.padEnd(nameW - 2, ' ');
        const nameCell = `${icon}{bold}${paddedName}{/}`;

        const verCell = this.formatTableCell(p.version ? `v${p.version}` : 'v1.0.0', verW, '#38bdf8');
        const descCell = this.formatTableCell(p.description || '', descW, '#94a3b8');

        if (showOrigin) {
          const origCell = this.formatTableCell(p.marketplaceName || '', originW, '#64748b');
          items.push(` ${nameCell}${verCell}${descCell}${origCell}`);
        } else {
          items.push(` ${nameCell}${verCell}${descCell}`);
        }
      }
    }

    this.instList.setItems(items);
    if (items.length > 0) {
      this.selectedInstIndex = Math.min(this.selectedInstIndex, items.length - 1);
      if (this.selectedInstIndex < 0) this.selectedInstIndex = 0;
      this.instList.select(this.selectedInstIndex);
    }
  }

  updateInstalledDetail() {
    const row = this.instRowMap[this.selectedInstIndex];
    if (!row) {
      this.instDetail.setContent('{center}{#64748b-fg}\n\nNo installed plugins found{/}{/center}');
      return;
    }

    if (row.type === 'header') {
      const mpName = row.marketplace;
      const mp = this.marketplaces[mpName] || {};
      const source = mp.source?.repo || mp.source || 'local';

      let content = `\n {bold}{#ffffff-fg}⛃ ${mpName}{/} {#10b981-bg}{#08090e-fg}{bold} INSTALLED SECTION {/}\n`;
      content += ` {#64748b-fg}Origin Collection: https://github.com/${source}{/}\n\n`;

      const logBtn = '{#38bdf8-bg}{#08090e-fg}{bold}  [Enter/c] Changelog  {/}';
      const groupBtn = '{#a855f7-bg}{#ffffff-fg}{bold}  [g] Flat/Grouped View  {/}';
      content += ` ${logBtn}   ${groupBtn}\n\n`;

      const symlinkVal = `~/.gemini/config/plugins`.padEnd(28, ' ');
      const healthVal = `✓ All Symlinks Active`.padEnd(28, ' ');
      const skillsCount = `${row.count} Active Plugins`.slice(0, 28).padEnd(28, ' ');
      const originVal = `${mpName}`.slice(0, 28).padEnd(28, ' ');

      content += ` {#312e81-fg}╭──────────────────────────────╮  ╭──────────────────────────────╮{/}\n`;
      content += ` {#312e81-fg}│{/} {#64748b-fg}TARGET SYMLINK DIRECTORY     {/} {#312e81-fg}│  │{/} {#64748b-fg}HEALTH VERIFICATION          {/} {#312e81-fg}│{/}\n`;
      content += ` {#312e81-fg}│{/} {#06b6d4-fg}${symlinkVal}{/} {#312e81-fg}│  │{/} {#10b981-fg}${healthVal}{/} {#312e81-fg}│{/}\n`;
      content += ` {#312e81-fg}╰──────────────────────────────╯  ╰──────────────────────────────╯{/}\n`;

      content += ` {#312e81-fg}╭──────────────────────────────╮  ╭──────────────────────────────╮{/}\n`;
      content += ` {#312e81-fg}│{/} {#64748b-fg}INSTALLED IN THIS SECTION    {/} {#312e81-fg}│  │{/} {#64748b-fg}COLLECTION ORIGIN            {/} {#312e81-fg}│{/}\n`;
      content += ` {#312e81-fg}│{/} {#ffffff-fg}${skillsCount}{/} {#312e81-fg}│  │{/} {#cbd5e1-fg}${originVal}{/} {#312e81-fg}│{/}\n`;
      content += ` {#312e81-fg}╰──────────────────────────────╯  ╰──────────────────────────────╯{/}\n\n`;

      content += ` {bold}{#10b981-fg}ACTIVE PLUGINS IN THIS SECTION (${row.plugins.length}){/}\n`;
      content += ` {#312e81-fg}───────────────────────────────────────────────────────────────────{/}\n`;
      for (const p of row.plugins) {
        const verBadge = p.version ? `{#06b6d4-fg}v${p.version}{/}` : '{#64748b-fg}v1.0.0{/}';
        content += `   • {bold}${p.name}{/} ${verBadge} - {#94a3b8-fg}${p.description.slice(0, 42)}{/}\n`;
      }

      this.instDetail.setContent(content);
      return;
    }

    const p = row.plugin;
    if (!p) {
      this.instDetail.setContent('{center}{#64748b-fg}\n\nNo installed plugins found{/}{/center}');
      return;
    }

    let content = `\n {bold}{#ffffff-fg}${p.name}{/} {#10b981-bg}{#08090e-fg}{bold} ACTIVE IN AGY {/}\n`;
    content += ` {#64748b-fg}Origin Collection: ${p.marketplaceName}          Plugin Version: {#06b6d4-fg}v${p.version || '1.0.0'}{/}\n\n`;

    content += ` {#f43f5e-bg}{#ffffff-fg}{bold}  [ Space / d ] Uninstall Plugin  {/}    {#38bdf8-bg}{#08090e-fg}{bold}  [ Enter / c ] Changelog  {/}\n\n`;

    // 2x2 Metric Cards
    const symlinkVal = `~/.gemini/config/plugins`.padEnd(28, ' ');
    const healthVal = `✓ Valid Link Target`.padEnd(28, ' ');
    const skillsCount = `${p.skills?.length || 1} Exposed Tools (v${p.version || '1.0.0'})`.slice(0, 28).padEnd(28, ' ');
    const mcpCount = `${p.mcpServers?.length || 0} MCP Servers`.padEnd(28, ' ');

    content += ` {#312e81-fg}╭──────────────────────────────╮  ╭──────────────────────────────╮{/}\n`;
    content += ` {#312e81-fg}│{/} {#64748b-fg}TARGET SYMLINK               {/} {#312e81-fg}│  │{/} {#64748b-fg}HEALTH VERIFICATION          {/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}│{/} {#06b6d4-fg}${symlinkVal}{/} {#312e81-fg}│  │{/} {#10b981-fg}${healthVal}{/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}╰──────────────────────────────╯  ╰──────────────────────────────╯{/}\n`;

    content += ` {#312e81-fg}╭──────────────────────────────╮  ╭──────────────────────────────╮{/}\n`;
    content += ` {#312e81-fg}│{/} {#64748b-fg}CAPABILITIES EXPOSED         {/} {#312e81-fg}│  │{/} {#64748b-fg}BACKGROUND SERVERS           {/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}│{/} {#ffffff-fg}${skillsCount}{/} {#312e81-fg}│  │{/} {#cbd5e1-fg}${mcpCount}{/} {#312e81-fg}│{/}\n`;
    content += ` {#312e81-fg}╰──────────────────────────────╯  ╰──────────────────────────────╯{/}\n\n`;

    // Changelog Preview Card
    const changelog = ChangelogEngine.getPluginChangelog(p.name, p.marketplaceName);
    const cardW = 60;
    const innerW = cardW - 2;
    content += ` {bold}{#38bdf8-fg}✦ RECENT RELEASE HIGHLIGHTS (CHANGELOG){/}   {#38bdf8-fg}[ c ] Open Modal{/}\n`;
    content += ` {#312e81-fg}╭${'─'.repeat(innerW)}╮{/}\n`;
    if (changelog.found && changelog.sections.length > 0) {
      const latest = changelog.sections[0];
      const headingLine = `Release: ${latest.heading}`.slice(0, innerW - 2).padEnd(innerW - 2, ' ');
      content += ` {#312e81-fg}│{/} {#06b6d4-fg} ${headingLine} {/} {#312e81-fg}│{/}\n`;
      const bodySnippet = latest.body.split('\n').filter(l => l.trim().length > 0).slice(0, 2);
      for (const bl of bodySnippet) {
        const cleanBl = bl.replace(/^[-*]\s+/, '• ').slice(0, innerW - 2).padEnd(innerW - 2, ' ');
        content += ` {#312e81-fg}│{/} {#cbd5e1-fg} ${cleanBl} {/} {#312e81-fg}│{/}\n`;
      }
    } else {
      const noLog = 'No local CHANGELOG.md entries found.'.padEnd(innerW - 2, ' ');
      content += ` {#312e81-fg}│{/} {#64748b-fg} ${noLog} {/} {#312e81-fg}│{/}\n`;
    }
    content += ` {#312e81-fg}╰${'─'.repeat(innerW)}╯{/}\n\n`;

    content += ` {bold}{#06b6d4-fg}EXPOSED SKILLS & VERSIONS{/}\n`;
    content += ` {#312e81-fg}───────────────────────────────────────────────────────────────────{/}\n`;
    if (p.skills && p.skills.length > 0) {
      for (const s of p.skills) {
        const sVer = s.version ? `v${s.version}` : `v${p.version || '1.0.0'}`;
        content += `   • {bold}${s.name}{/} {#06b6d4-fg}[${sVer}]{/}: {#94a3b8-fg}${s.description}{/}\n`;
      }
    } else {
      content += `   • {bold}${p.name}{/} {#06b6d4-fg}[v${p.version || '1.0.0'}]{/}: {#94a3b8-fg}${p.description}{/}\n`;
    }

    this.instDetail.setContent(content);
  }

  updateDoctorList() {
    const listWidth = Math.max(40, Math.floor((this.screen.width || 120) * 0.52) - 4);
    const sevW = 13;
    const fixW = 14;
    const fixedW = 1 + sevW + fixW;
    const titleW = Math.max(15, listWidth - fixedW);

    // Sticky Table Header
    const sevH = this.formatTableCell('SEVERITY', sevW, '#64748b', true);
    const titleLabel = titleW < 16 ? 'ISSUE' : 'DIAGNOSTIC ISSUE';
    const titleH = this.formatTableCell(titleLabel, titleW, '#64748b', true);
    const fixH = this.formatTableCell('AUTO-FIX', fixW, '#64748b', true);
    this.diagHeader.setContent(` ${sevH}${titleH}${fixH}`);

    // Table Divider
    const sevDiv = this.formatTableCell('─'.repeat(Math.max(2, sevW - 2)), sevW, '#312e81');
    const titleDiv = this.formatTableCell('─'.repeat(Math.max(2, titleW - 2)), titleW, '#312e81');
    const fixDiv = this.formatTableCell('─'.repeat(Math.max(2, fixW - 2)), fixW, '#312e81');
    this.diagDivider.setContent(` ${sevDiv}${titleDiv}${fixDiv}`);

    const items = this.diagnostics.map(d => {
      const icon = d.severity === 'error' ? '✕' : d.severity === 'warning' ? '⚠' : '✓';
      const iconColor = d.severity === 'error' ? '#f43f5e' : d.severity === 'warning' ? '#f59e0b' : '#10b981';
      const sevText = d.severity === 'error' ? 'ERROR' : d.severity === 'warning' ? 'WARN' : 'PASS';
      const sevCell = this.formatTableCell(`${icon} ${sevText}`, sevW, iconColor, true);

      const titleCell = this.formatTableCell(d.title || d.name || 'Diagnostic check', titleW, null, false);
      const fixTag = d.canAutoFix ? 'Yes (Enter)' : 'Manual';
      const fixCell = this.formatTableCell(fixTag, fixW, d.canAutoFix ? '#10b981' : '#64748b');

      return ` ${sevCell}${titleCell}${fixCell}`;
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
      content += ` {#10b981-bg}{#ffffff-fg}{bold}  [Enter] Auto-Fix Issue  {/}   {#312e81-bg}{#ffffff-fg}{bold}  [a] Fix All Issues  {/}\n\n`;
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
    const row = this.catalogRowMap[this.selectedIndex];
    if (!row) return;

    if (row.type === 'header') {
      const auto = Registry.toggleAutoUpdate(row.marketplace);
      this.showToast(`Auto-update for ${row.marketplace}: ${auto ? 'ENABLED' : 'PAUSED'}`);
      this.refreshData();
      return;
    }

    const plugin = row.plugin;
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

  async forceSyncSingleMarketplace(name) {
    const entry = this.marketplaces[name];
    if (!entry) return;

    this.showToast(`Force-syncing & resetting ${name}...`);
    const res = await SyncEngine.forceSyncMarketplace(entry);
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

  setTab(tabId) {
    return this.switchTab(tabId);
  }

  start() {
    this.catalogList.focus();
    this.screen.render();
  }

  destroy() {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.screen) {
      try {
        this.screen.destroy();
      } catch {}
      this.screen = null;
    }
    if (process.stdin.isTTY && process.stdin.setRawMode) {
      try {
        process.stdin.setRawMode(false);
      } catch {}
    }
    if (process.stdin.pause) {
      try {
        process.stdin.pause();
      } catch {}
    }
  }
}
