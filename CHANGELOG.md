# Changelog

All notable changes to `agy-plugins` are documented in this file.

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
