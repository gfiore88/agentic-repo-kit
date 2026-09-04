# Changelog

All notable changes to Agentic Repository Kit are documented here.

The project follows [Semantic Versioning](https://semver.org/).

## [0.5.0] - 2026-09-04

### Added

- Added `agentic-repo verify` command for deterministic governance checks: knowledge lint, ADR status integrity, and an optional ADR gate that flags tracked source changes lacking an `Accepted` ADR.
- Added the `--enforce ci|hooks|none` axis (default `none`) projecting opt-in enforcement: a GitHub Actions governance workflow (`ci`) and a transparent local pre-push hook installed via `core.hooksPath` (`hooks`), both delegating to `verify`.
- Documented governance enforcement modes in `PRD-0006` and `ADR-0008`.
- Included a top-level `THIRD_PARTY_NOTICES.md` in the published package.

### Fixed

- `agentic-repo doctor` no longer reports an otherwise-healthy repository as unhealthy after expected drift in preserved user-owned documentation paths (`docs/wiki/`, `docs/adr/`, `docs/product/`, `docs/raw/`, `docs/specs/`, `docs/templates/`).

## [0.4.0] - 2026-09-02

### Added

- Added `agentic-repo update` (alias `upgrade`) command to upgrade kernel rules, skills, workflows, and runtime adapters without overwriting project-specific user documentation (`docs/wiki/`, `docs/adr/`, `docs/product/`, `docs/raw/`).
- Documented non-destructive kernel update architecture in `PRD-0005` and `ADR-0007`.

## [0.3.1] - 2026-09-02

### Fixed

- Fixed ASCII/Unicode border alignment in README architecture diagram across markdown renderers (GitHub, npm, mobile).

## [0.3.0] - 2026-09-02

### Added

- Mandated visible `### 🔬 End-of-Task Annealing Diagnosis` block on task completion for all tasks originating from an Architectural Decision Record (ADR).
- Enhanced `agentic-repo knowledge lint` with page-level source provenance inheritance (`**Source**: docs/raw/...` in header).
- Documented annealing closure and provenance inheritance decisions in `PRD-0004` and `ADR-0006`.

## [0.2.2] - 2026-08-31

### Fixed

- Added `agentic-repo-kit` bin mapping to `package.json` so `npx agentic-repo-kit` executes seamlessly.

## [0.2.1] - 2026-08-31

### Fixed

- Added `THIRD_PARTY_NOTICES.md` to default local Git exclusion patterns so no scaffolding files remain untracked after `agentic-repo exclude`.

## [0.2.0] - 2026-08-31

### Added

- Added `--git-exclude` flag to `agentic-repo init` for zero-footprint local initialization in enterprise/restricted repositories.
- Added standalone `agentic-repo exclude` command to inspect (`--list`), add, or remove (`--remove`) managed `.git/info/exclude` rules.
- Documented local git exclude architecture in `PRD-0003` and `ADR-0005`.

## [0.1.1] - 2026-08-31

### Changed

- Redesigned `README.md` into a high-polish developer tooling showcase with a dark minimalist aesthetic, visual architecture map, value pillars, comparison matrix, conversational workflow prompt cards, and CLI documentation.
- Added rich discoverability keywords and refined package descriptions to `package.json` for npm registry search.
- Documented developer showcase decisions in `PRD-0002` and `ADR-0004`.

## [0.1.0] - 2026-08-31

### Added

- Dependency-free `agentic-repo` CLI with assisted runtime detection.
- Universal knowledge, governance, skill, agent, and self-annealing kernel.
- Selective adapters for Codex, Claude Code, GitHub Copilot, Antigravity, Gemini CLI, Cursor, OpenCode, and Kiro.
- Official GitHub ADR and PRD skills plus the Addy Osmani lifecycle skill pack.
- Mandatory human-approved task ADR workflow.
- Deterministic repository diagnosis, knowledge linting, and governed artifact creation.
- Pinned upstream provenance and third-party license notices.
