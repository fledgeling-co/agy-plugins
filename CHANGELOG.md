# Changelog

All notable changes to `agy-plugins` are documented in this file.

## [1.4.0] - 2026-08-15

### Added
- **Marketplace Section Grouping**: Grouped plugins and skills under distinct marketplace sections across Explore [1] and Installed [3] tabs. Section headers show total skills and active counts (`── ⛃ diolog-plugins (50 skills, 18 active) ──`).
- **Marketplace Overview Card**: Selecting any section header displays collection details in the inspector pane, including upstream repository urls, auto-sync status, local update timestamps, and quick action shortcuts.
- **Section Grouping Toggle (`[g]` / `[m]`)**: Added a global hotkey across Explore and Installed tabs to toggle between grouped marketplace sections and a flat alphabetical list.
- **Marketplace Drill-Down Hotkey (`[e]`)**: Pressing `e` in the Marketplaces tab [2] jumps straight to the Explore tab [1] focused on that collection's section.
- **CLI and MCP Grouping Support**: Added `--grouped` and `--by-marketplace` flags to `agy-plugins list`, plus a `groupByMarketplace` parameter to the `plugin_list` FastMCP tool.
- **Standalone and Symlinked Plugin Resolution**: Dynamically registered installed plugins discovered in `~/.gemini/config/plugins/` so custom and symlinked plugins resolve to their origin collection.

### Changed
- **Tabular Layout Overhaul**: Replaced jagged wrapping lists with fixed-width tabular grid columns and sticky headers (`NAME`, `VER`, `DESCRIPTION`, `ORIGIN`) across all tabs.
- **Column Rebalance**: Removed cluttered `CATEGORY` and `ST` columns. Widened `ORIGIN` to 24-26 characters and narrowed `LAST UPDATE` to 18 characters.
- **Streamlined Auto-Update Column**: Replaced bulky badges in the Marketplaces tab with a clean `AUTO UPDATE` column displaying `ON` or `OFF`.
- **Clean Action Button Layout**: Split detail pane action buttons into two distinct lines to prevent terminal wrapping.
- **Remapped Auto-Sync Shortcut**: Bound auto-update toggling to `Space` and `t` in the Marketplaces tab, reserving `Enter` exclusively for opening changelogs.

## [1.3.0] - 2026-08-15

### Added
- **Plugin and Skill Version Visibility**: Surfaced granular plugin and skill versions across Explore, Marketplaces, and Installed tabs in the TUI, CLI inspect commands, and FastMCP tool outputs. Individual skill versions parsed from `SKILL.md` frontmatter are now tracked alongside parent plugin package versions.
- **Changelog Engine and Discovery**: Added changelog discovery capable of reading plugin-level `CHANGELOG.md` files as well as filtering plugin-specific release notes from marketplace-level changelogs.
- **Scrollable TUI Changelog Modal**: Added a TrueColor changelog modal window opened via `c` or `Enter` across all tabs, rendering structured release notes, semantic version tags, and commit summaries with keyboard and mouse scroll support.
- **CLI Changelog and Inspection Commands**: Added `agy-plugins changelog <plugin/marketplace>` and updated `agy-plugins info <plugin>` to output version breakdowns, exposed tool lists, and formatted release history directly to the terminal.
- **Local Marketplace Skill Update Timestamps**: Tracked local git commit author dates, short commit hashes, and commit subjects during clone, sync, and pull operations.
- **FastMCP Changelog Tools**: Added `plugin_changelog` and `marketplace_changelog` tools to the stdio MCP server for agentic consumption.

### Changed
- Refactored right-hand inspector cards in the TUI to display exposed skill breakdowns with per-skill version pills and recent changelog highlights.
- Enhanced Marketplaces view with commit hash badges, local skill update timestamps, and latest commit subject previews.
- Expanded acceptance test suite to 44 tests across 9 suites covering changelog resolution, skill version normalisation, git commit extraction, section grouping, and tabular layout alignment.

## [1.2.2] - 2026-08-15

### Added
- **Comprehensive Acceptance E2E Suite (`node:test`)**: Implemented a complete 30-test acceptance suite covering all surfaces (CLI subcommands, TUI state navigation, FastMCP JSON-RPC tools, Registry discovery, Installer atomic symlinks, Doctor diagnostics, and SyncEngine).
- **CLI Search & JSON Output Modes**: Added native `agy-plugins search <query>` subcommand and structured `agy-plugins list --json` output formatting for programmatic integrations.
- **Isolated Test Harness**: Added sandboxed environment configuration with disposable temporary storage to verify all install, link, sync, and diagnostic flows without touching live user directories.

### Fixed
- Fixed unhandled string plugin arguments in `Installer.installPlugin` to automatically resolve targets from registry metadata.
- Fixed process lifecycle leaks across TUI blessed screens and background MCP auto-sync daemons on exit.

## [1.2.1] - 2026-08-15

### Added
- **Force Reset and Pull Action**: Added a dedicated Force Reset and Sync keybinding (`f`) in the Marketplaces tab and direct `Git.forceResetAndPull` recovery in the core sync engine to discard dirty working tree states and fast-forward cleanly against remote tracking branches.
- **Dirty Working Tree Diagnostic and Auto-Repair**: Added proactive Doctor diagnostics detecting uncommitted marketplace modifications and broken git states with one-click automatic resolution (`Enter` or `a`).
- **Dual Manifest Recognition**: Extended discovery and health checks to natively recognise `.claude-plugin/plugin.json` alongside root `plugin.json` without modifying upstream repository trees unnecessarily.

### Fixed
- Fixed git merge pull abort errors during background sync when local frontmatter normalisations or manifest markers were authored into marketplace clones.

## [1.2.0] - 2026-08-14

### Added
- **High-Fidelity Unicode TUI**: Full TrueColor visual terminal interface built with neo-blessed, featuring rounded Unicode card borders (`╭ ─ ╮ │ ╰ ─ ╯`), 2x2 metric tiles, dynamic column alignment, and dedicated action pills.
- **Comprehensive Mouse and Keyboard Navigation**: Clickable top navigation ribbon tabs (`✦ Explore & Skills [1]`, `⛃ Marketplaces [2]`, `✓ Installed [3]`, `⚠ Doctor [4]`), search button pill, and cyclic arrow key navigation (`←`/`→`, `h`/`l`).
- **Automatic YAML 1.2 Block Scalar Sanitisation**: Automated frontmatter normalisation converting raw skill description strings to strict YAML 1.2 block scalars (`description: >-`), preventing Antigravity CLI parser dropouts caused by quotation marks or colons.
- **Self-Healing Manifests**: Automatic translation and generation of `plugin.json` from Claude Code `.claude-plugin/plugin.json` metadata on every discovery, installation, and background sync cycle.
- **Bulk Doctor Diagnostics & Auto-Repair**: System integrity diagnostics with 1-click single issue repair (`Enter`) and full suite repair (`a`).

### Changed
- Refactored right-hand inspector pane into three dedicated functional cards: Activation Trigger Phrase (Level 1 Frontmatter), 2x2 Metric Matrix (Token Footprint, Schema Compliance, Target Discovery, Git Sync Strategy), and Ingestion Staging Path.
- Improved catalog list readability with dense structured column layouts including status icons, bold identifiers, category pills, intent previews, and collection origin tags.
- Replaced unparsed layout tags with ANSI-aware string column width measurements.

### Fixed
- Fixed zero plugin count calculation in Marketplaces tab by dynamically querying active plugin indices across registered collections.
- Fixed stale static directory conflicts by ensuring all installations create direct atomic symlinks into `~/.gemini/config/plugins/`.
