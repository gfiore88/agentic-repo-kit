# Changelog

All notable changes to Agentic Repository Kit are documented here.

The project follows [Semantic Versioning](https://semver.org/).

## [0.6.0] - 2026-09-04

### Added

- Mandatory per-page YAML frontmatter (`type`, `title`, `created`, `updated`, and a non-empty `sources` list on fact-bearing pages) across the wiki knowledge base, validated by `knowledge lint` with a dependency-free parser. Decision recorded in `ADR-0012`.
- Extended `knowledge lint` with orphan-page, uncovered-raw-source, and malformed-log-entry checks, plus the optional `sources/`, `entities/`, and `concepts/` wiki taxonomy. Decision recorded in `ADR-0011`.

### Changed

- Hardened the `curate-project-knowledge` skill with the three-layer contract (immutable `docs/raw/`), fixed contradictions and log-entry formats, query-to-concept promotion, and house-style guardrails.
- Blueprint `docs/wiki/` templates now ship conformant frontmatter so freshly initialized repositories pass `knowledge lint` out of the box.

### Documentation

- Aligned `README.md` to describe typed wiki frontmatter and the full set of `knowledge lint` checks.

## [0.5.2] - 2026-09-04

### Changed

- Bumped `actions/upload-artifact` from `@v4` to `@v5` in the `ci-cd-and-automation` skill example, completing the Node 24 GitHub Actions currency pass. Decision recorded in `ADR-0010`.

### Documentation

- Documented in `docs/releasing.md` that releases modifying files under `.github/workflows/**` require a token with the `workflow` scope (`gh` as git credential helper satisfies this).

## [0.5.1] - 2026-09-04

### Changed

- Bumped `actions/checkout` and `actions/setup-node` from `@v4` to `@v5` (the first major line running on Node 24) across the repository workflows, the canonical generated governance workflow, and the `ci-cd-and-automation` skill examples, clearing the GitHub Actions Node 20 deprecation warning. Decision recorded in `ADR-0009`.

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
