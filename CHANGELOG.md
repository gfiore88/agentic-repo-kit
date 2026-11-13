# Changelog

All notable changes to Agentic Repository Kit are documented here.

The project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

Faster, more reliable agent runs: fewer lint repair loops, session context from a single command, and consistent directives. Decisions recorded in `ADR-0015`.

### Added

- `status` (`npx agentic-repo-kit status [--json] [--limit <n>]`): a read-only digest of kernel version, profile, enforcement, adapters, and integrity; knowledge health; every ADR and PRD with its status, open records first; pending annealing proposals; ADR number collisions; and the latest log entries. The generated `AGENTS.md` starts each session with it.
- `verify` reports ADR numbers used by more than one file, for example after merging parallel branches. An `--adr` reference to a duplicated number is ambiguous and never satisfies the gate.

### Fixed

- `knowledge lint` ignores links and `[FACT]` markers inside fenced code blocks, and accepts well-formed log entries in CRLF checkouts.
- The wiki page template now carries the ADR-0012 frontmatter and no longer links to `../wiki/index.md`, which broke in subfolders. A page created from it passes `knowledge lint`.
- Generated skills, `AGENTS.md`, gate documentation, and error messages use `npx agentic-repo-kit <command>`, which works without a global install, instead of the bare `agentic-repo` binary.
- The annealing closure classes now map to the run-diagnosis destinations, and `One-Off` replaces `One-Off Incident`.

### Changed

- `verify` enforces every `knowledge lint` category: frontmatter issues, orphan pages, uncovered raw sources, and malformed log entries now block hooks and CI once `update` refreshes the pinned verifier. Run `knowledge lint` to see the same findings first.
- The knowledge lint workflow runs the engine first and limits manual review to conflicting decisions, stale assumptions or proposals, and unrecorded contradictions.
- The ADR template follows the official `create-architectural-decision-record` structure, and `govern-development-task` creates task ADRs with `adr new`, asking only for inputs it cannot derive.
- Lifecycle skills load only when their trigger matches the task; `govern-development-task` lists typical skill sets for a bug fix, a small change, and a new feature.
- Log tags add `decision`, `implementation`, `routine`, and `release` for lifecycle work.

### Upgrade notes

- `docs/templates/` and `docs/adr/README.md` are user-owned, so `update` keeps your copies. To adopt the new wiki page and ADR templates and the renumbering guidance, delete those files and rerun `npx agentic-repo-kit update`, which recreates missing files.

## [0.7.0] - 2026-11-03

Generated hook and CI projections now pin the generating kit version and pass the new `verify --adr` and `--routine` options. Decisions recorded in `ADR-0013`; release recorded in `ADR-0014`.

### Fixed

- `update` no longer silently overwrites kernel files you modified (for example `AGENTS.md`, `CLAUDE.md`): files are compared with their `scaffold.lock` hash, conflicts abort the update, and `--force` overrides.
- `update` refuses to run without `scaffold.lock` instead of overwriting files in a never-initialized repository.
- `--git-exclude` now derives root-anchored patterns from `scaffold.lock`, covering `.claude/agents/`, `.codex/agents/`, `.gemini/agents/`, `.cursor/rules/`, and `opencode.json`, which previously leaked into tracked changes.
- `verify` treats kit-managed files as non-source, so kernel upgrades no longer trip the ADR gate.
- Pre-push hooks and CI check new branches against their merge-base instead of skipping the ADR gate.
- `plugin.json` version aligned with `package.json` (was `0.4.0`); README navigation anchors and the Cursor adapter path corrected.

### Added

- `verify --adr <ids>`: follow-up work can cite the `Accepted` ADR that governs it; hooks and CI extract `ADR-NNNN` from commit messages and the PR title/body.
- Routine tier and exempt paths for the ADR gate: a human-owned `docs/adr/gate.json` lists `exempt` globs and `routine` globs; `verify --routine` (or an `ADR: routine` commit line, detected by hooks and CI) accepts in-scope changes that are recorded in `docs/wiki/log.md`.
- `init --profile core|full` (default `full`): install only the governance kernel skills; `update` keeps the recorded profile.
- `update` removes unmodified files the kit no longer generates (dropped runtimes, enforcement changes, retired agents) and reports modified ones.
- `validate:plugin` fails on plugin/blueprint asset drift and plugin/package version skew; the npm `version` script keeps `plugin.json` in sync.

### Changed

- Hook and CI projections run `npx agentic-repo-kit@<generating version>` instead of the unpinned latest release, with `npx` detached from the hook's stdin.
- Retired the overlapping `security-reviewer` and `qa-test-engineer` roles; the registry routes to `security-auditor` and `test-engineer` with the kernel's handoff obligations; `code-reviewer` and `software-architect` now have an explicit before/after-implementation boundary.

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
