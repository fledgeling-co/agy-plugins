# Acceptance Test Matrix — agy-plugins

Acceptance-criteria traceability matrix and verification ledger for `agy-plugins`.

## AC Traceability Matrix

| Case ID | Surface / Action | Requirement Description | Test File | Verdict |
|---|---|---|---|---|
| **CLI-001** | CLI `list` | Lists all discovered plugins across marketplaces with installation flags | `test/cli.test.js` | ✓ Covered |
| **CLI-002** | CLI `list --json` | Emits structured JSON representation of registered & installed plugins | `test/cli.test.js` | ✓ Covered |
| **CLI-003** | CLI `search` | Filters plugins by keyword across name, description, and skill triggers | `test/cli.test.js` | ✓ Covered |
| **CLI-004** | CLI `install` | Creates managed atomic symlink in `~/.gemini/config/plugins/<name>` | `test/cli.test.js` | ✓ Covered |
| **CLI-005** | CLI `uninstall` | Safely removes symlink and updates registry state | `test/cli.test.js` | ✓ Covered |
| **CLI-006** | CLI `marketplace list` | Lists all registered marketplaces with sync status | `test/cli.test.js` | ✓ Covered |
| **CLI-007** | CLI `marketplace add` | Registers local or remote marketplace and clones sparse checkout | `test/cli.test.js` | ✓ Covered |
| **CLI-008** | CLI `marketplace update` | Fast-forwards marketplace repositories | `test/cli.test.js` | ✓ Covered |
| **CLI-009** | CLI `marketplace remove` | Unregisters marketplace and cleans indices | `test/cli.test.js` | ✓ Covered |
| **CLI-010** | CLI `doctor` | Scans for broken symlinks, missing manifests, and invalid frontmatters | `test/cli.test.js` | ✓ Covered |
| **CLI-011** | CLI `doctor --fix` | Automatically repairs all remediable diagnostic issues in place | `test/cli.test.js` | ✓ Covered |
| **REG-001** | Registry Discovery | Discovers root-level and multi-skill bundle structures within marketplaces | `test/registry.test.js` | ✓ Covered |
| **REG-002** | Registry Installed | Accurately identifies active symlinks in `~/.gemini/config/plugins/` | `test/registry.test.js` | ✓ Covered |
| **REG-003** | Registry Auto-Update | Persists and toggles auto-update preferences per marketplace | `test/registry.test.js` | ✓ Covered |
| **INS-001** | Installer Linking | Replaces stale directory conflicts and establishes canonical symlinks | `test/installer.test.js` | ✓ Covered |
| **INS-002** | Installer Self-Healing | Automatically synthesises `plugin.json` from Claude Code metadata | `test/installer.test.js` | ✓ Covered |
| **INS-003** | Installer Removal | Cleanly removes symlink without deleting source files | `test/installer.test.js` | ✓ Covered |
| **NORM-001** | Frontmatter Parser | Parses YAML frontmatters with comments, colons, and quotes | `test/normalizer.test.js` | ✓ Covered |
| **NORM-002** | YAML 1.2 Sanitisation | Converts raw description strings to strict `description: >-` scalars | `test/normalizer.test.js` | ✓ Covered |
| **NORM-003** | Dual-Manifest Check | Recognises `.claude-plugin/plugin.json` without dirtying clean git trees | `test/normalizer.test.js` | ✓ Covered |
| **DOC-001** | Doctor Broken Links | Identifies symlinks pointing to non-existent targets and removes them | `test/doctor.test.js` | ✓ Covered |
| **DOC-002** | Doctor Dirty Clones | Detects uncommitted modifications blocking git pulls and offers reset | `test/doctor.test.js` | ✓ Covered |
| **DOC-003** | Doctor Bulk Repair | `Doctor.fixAll()` batch-resolves all repairable issues synchronously | `test/doctor.test.js` | ✓ Covered |
| **SYNC-001** | Sync Fast-Forward | Pulls updates without merge commits on clean tracking branches | `test/sync.test.js` | ✓ Covered |
| **SYNC-002** | Force Reset & Sync | Discards dirty working tree changes and resets to `origin/HEAD` | `test/sync.test.js` | ✓ Covered |
| **CHG-001** | Changelog Parsing | Extracts semantic versions, release dates, and structured notes | `test/changelog.test.js` | ✓ Covered |
| **CHG-002** | Changelog Discovery | Finds plugin-level `CHANGELOG.md` with fallback to marketplace root | `test/changelog.test.js` | ✓ Covered |
| **CHG-003** | Skill Versioning | Extracts `version` from `SKILL.md` frontmatter and defaults to parent | `test/changelog.test.js` | ✓ Covered |
| **CHG-004** | Marketplace Sync Timing | Tracks local git commit dates, hashes, and subjects on clone & sync | `test/changelog.test.js` | ✓ Covered |
| **MCP-001** | MCP Handshake | Responds to `initialize` with server capabilities and info | `test/mcp.test.js` | ✓ Covered |
| **MCP-002** | MCP Tools Registry | Exposes all 11 tools (`plugin_*`, `marketplace_*`, `doctor_*`) with schemas | `test/mcp.test.js` | ✓ Covered |
| **MCP-003** | MCP Tool Execution | Executes tool calls and returns formatted JSON text content | `test/mcp.test.js` | ✓ Covered |
| **MCP-004** | MCP Changelog Tool | Executes `plugin_changelog` and `marketplace_changelog` queries | `test/mcp.test.js` | ✓ Covered |
| **TUI-001** | TUI Tab Navigation | Switches between Explore, Marketplaces, Installed, and Doctor tabs | `test/tui.test.js` | ✓ Covered |
| **TUI-002** | TUI Card Layout | Formats 2x2 metric tiles, activation trigger boxes, and staging paths | `test/tui.test.js` | ✓ Covered |
| **TUI-003** | TUI Changelog Modal | Displays scrollable release history modal via `c` hotkey across tabs | `test/tui.test.js` | ✓ Covered |
