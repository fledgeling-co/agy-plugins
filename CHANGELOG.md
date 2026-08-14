# Changelog

All notable changes to `agy-plugins` are documented in this file.

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
