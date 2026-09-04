# Knowledge Log

## [2026-09-04] implementation | Release scope note and Actions currency follow-up

- Accepted ADR-0010: documented in `docs/releasing.md` that releases touching `.github/workflows/**` need a `workflow`-scoped token (or `gh` as credential helper), and bumped `actions/upload-artifact@v4 → @v5` in the `ci-cd-and-automation` skill example.
- Completes the Node 24 Actions currency pass started in ADR-0009; docs/skill-only, `npm run validate` stays green.

## [2026-09-04] implementation | GitHub Actions Node 24 runtime currency

- Accepted ADR-0009 and bumped `actions/checkout` and `actions/setup-node` from `@v4` to `@v5` (first major on Node 24) in the repository workflows, the canonical governance generator (`plan.mjs`), and the `ci-cd-and-automation` skill examples.
- Dogfooded the projection: an `--enforce ci` init renders `governance.yml` with `@v5`; `npm run validate` stays green (55 tests).
- Scoped to `checkout`/`setup-node`; `upload-artifact@v4` in a skill example left for a future currency pass.

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

## [2026-09-02] decision | Kernel update command accepted

- Accepted PRD-0005 for `agentic-repo update` upgrading kernel rules and skills while strictly preserving user project documentation.
- Accepted ADR-0007 for user-owned paths isolation, infrastructure overwrites, and automated lockfile/exclude sync.

## [2026-09-02] release | npm package 0.4.0 published

- Published `agentic-repo-kit@0.4.0` to npm via GitHub Actions OIDC Trusted Publishing.
- Added `agentic-repo update` (and alias `upgrade`) command to safely upgrade kernel rules, skills, and adapters with zero loss to user-owned documentation.

## [2026-09-04] decision | Governance verification and enforcement adapters accepted

- Accepted PRD-0006 and ADR-0008 for a canonical deterministic `agentic-repo verify` command with opt-in enforcement projections.
- Confirmed the first slice order: the pure `verify` engine plus the CI-gate adapter, with the local hook installer deferred to a later slice.

## [2026-09-04] implementation | Governance verification command and CI-gate adapter

- Added the subprocess-free `verify` engine running knowledge lint, ADR frontmatter integrity, and an ADR gate that requires an `Accepted` ADR in supplied source changes.
- Added the `--enforce ci|hooks|none` axis (default `none`), persisting the mode in `scaffold.yaml` and `scaffold.lock` so `update` maintains it.
- Projected an opt-in `.github/workflows/governance.yml` that computes the diff and delegates the decision to `verify`; `hooks` is rejected honestly until its slice ships.

## [2026-09-04] implementation | Local git-hook enforcement installer

- Completed ADR-0008 with the `--enforce hooks` projection: a policy-free `.agents/hooks/pre-push` hook that delegates to `verify`.
- Installer sets `core.hooksPath` by editing `.git/config` directly, keeping the kit subprocess-free, and marks the hook executable.
- Switching enforcement away from `hooks` resets `core.hooksPath` only when it still points at the managed directory; combined with `--git-exclude` the gate stays invisible to a client's tracked repository.










