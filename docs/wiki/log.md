# Knowledge Log

## [2026-08-31] decision | Initial product and architecture baseline

- Accepted PRD-0001 for a model-agnostic, multi-runtime repository kernel.
- Accepted ADR-0001 for hybrid distribution and selective generated adapters.
- Began the v0.1 vertical slice with CLI auto-detection and a skills-only Codex plugin.
- Added conflict-safe, idempotent initialization and a manifest-based `doctor` command.
- Verified ten automated tests, four skills, the plugin manifest, package contents, syntax, and an eight-adapter smoke installation.

## [2026-08-31] implementation | Complete governed kernel

- Replaced the thin spike with the full knowledge, decision, and self-annealing workflows.
- Pinned and imported the official GitHub ADR/PRD skills and the complete Addy Osmani lifecycle pack.
- Added canonical specialist agents plus generated runtime-native wrappers.
- Added operational ADR, PRD, annealing-proposal, and knowledge-lint CLI commands.

## [2026-08-31] decision | GitHub publication proposed

- Proposed ADR-0002 for a private `gfiore88/agentic-repo-kit` repository, initial Git history, and README rewrite.
- No remote repository or implementation changes were made pending human acceptance.

## [2026-08-31] decision | GitHub publication accepted

- Giovanni Fiore explicitly accepted ADR-0002.
- Authorized creation of private repository `gfiore88/agentic-repo-kit`, initialization of `main`, README implementation, and initial push.

## [2026-08-31] decision | npm release path accepted

- Accepted ADR-0003: MIT licensing, public unscoped package `agentic-repo-kit`, manual first publication, and GitHub Trusted Publishing for later releases.
- Giovanni Fiore authenticated the verified npm account `gfiore88` and authorized the first publication.

## [2026-08-31] release | npm package 0.1.0 published

- Published the public package `agentic-repo-kit@0.1.0` to the npm registry.
- Kept the GitHub release workflow idempotent by skipping versions already present in the registry.
- Verified the release from registry metadata and a clean `npx` installation before tagging the source revision.

## [2026-08-31] operations | npm Trusted Publishing activated

- Connected `gfiore88/agentic-repo-kit` to npm through GitHub Actions OIDC.
- Authorized `publish.yml` for `npm publish` without a long-lived npm token.
- Human-controlled npm two-factor authentication protected the connection setup.

## [2026-08-31] decision | Developer branding and showcase accepted

- Accepted PRD-0002 for a developer tooling showcase, visual diagrams, and npm search discovery.
- Accepted ADR-0004 for the README redesign, package metadata keywords, and 0.1.1 patch release.

## [2026-08-31] release | npm package 0.1.1 published

- Published `agentic-repo-kit@0.1.1` to npm via GitHub Actions OIDC Trusted Publishing.
- Live package page now displays the developer tooling showcase README and updated keywords.

## [2026-08-31] decision | Local Git exclude governance accepted

- Accepted PRD-0003 for zero-footprint local exclusions via `.git/info/exclude` in restricted/enterprise repositories.
- Accepted ADR-0005 for the CLI `--git-exclude` flag, standalone `exclude` command, and idempotent marker blocks.

## [2026-08-31] release | npm package 0.2.0 published

- Published `agentic-repo-kit@0.2.0` to npm via GitHub Actions OIDC Trusted Publishing.
- Added `--git-exclude` initialization flag and standalone `agentic-repo exclude` command.

## [2026-08-31] release | npm package 0.2.1 published

- Published `agentic-repo-kit@0.2.1` to npm via GitHub Actions OIDC Trusted Publishing.
- Added `THIRD_PARTY_NOTICES.md` to default local Git exclusions so no scaffolding files remain untracked.

## [2026-09-02] decision | Mandatory annealing closure and page provenance accepted

- Accepted PRD-0004 for mandatory end-of-task annealing diagnosis and page-level source provenance inheritance.
- Accepted ADR-0006 for automatic ADR task closure sections and `knowledge lint` header source parsing.

## [2026-09-02] release | npm package 0.3.0 published

- Published `agentic-repo-kit@0.3.0` to npm via GitHub Actions OIDC Trusted Publishing.
- Mandated visible `### 🔬 End-of-Task Annealing Diagnosis` block on task completion and enabled page-level provenance inheritance in `knowledge lint`.

## [2026-09-02] release | npm package 0.3.1 published

- Published `agentic-repo-kit@0.3.1` to npm via GitHub Actions OIDC Trusted Publishing.
- Fixed ASCII/Unicode box-drawing alignment in README.md architecture diagram across all markdown renderers.








