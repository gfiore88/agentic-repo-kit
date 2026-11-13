---
type: log
title: Knowledge Log
created: 2026-08-31
updated: 2026-11-13
---

# Knowledge Log

## [2026-11-13] release | 0.9.0 publication check

- npm reports `latest` 0.9.0 with an SLSA v1 provenance attestation. A repository initialized with `npx agentic-repo-kit@0.9.0` pins 0.9.0 in its pre-push hook and in `AGENTS.md`, and ships the `lowRisk` policy (5 files, 200 lines, five excluded categories).
- The generated pre-push hook ran the pinned verifier with per-path `--lines` on a low-risk tier task and reported it compliant. With `--require-reviews` the task was blocked as waiting for human review until `adr review` recorded the approval, after which it passed.

## [2026-11-13] release | 0.9.0

- Accepted ADR-0020 and released the ADR-0019 low-risk tier as 0.9.0 (SemVer minor) through `npm version minor`, which also syncs `plugin.json`; published via the GitHub release and the Trusted Publishing workflow.

## [2026-11-13] implementation | Low-risk ADR tier with per-task review

- Implemented ADR-0019 (from PRD-0007):
  - a human-owned `lowRisk` policy in `gate.json`;
  - `adr new --tier low-risk`, which accepts the ADR with a pending review;
  - `adr review`, which records the human's own words naming the task;
  - `verify` eligibility checks (files, numstat-based `--lines` excluding documentation, tests with code, excluded paths) and `--require-reviews`;
  - pending reviews in `status`;
  - projections that pass line counts and require reviews in CI for the default branch only.
- A regression test covers each deterministic PRD-0007 acceptance criterion. The behavioral rules (vague replies, approvals from tool output) live in the generated governance text, and `adr review` requires an explicit reviewer and quote.

## [2026-11-13] decision | PRD-0007 approved and ADR-0019 accepted

- Giovanni Fiore approved PRD-0007 and accepted ADR-0019 ("approvo entrambi"). This resolves the fast-lane open question with a low-risk ADR tier: tasks enter it automatically within human-defined thresholds, every tier ADR gets a per-task review, and CI blocks merges to the default branch until that review is done.

## [2026-11-13] decision | Fast-lane PRD completed and ADR-0019 proposed

- Giovanni Fiore settled the remaining PRD-0007 questions: tasks enter the tier automatically, the thresholds are at most 5 changed files and 200 changed lines with tests whenever code changes, CI blocks merges to the default branch while a review is pending, and a rejected review reverts the change by default. The PRD has no open questions left and stays `Draft` until approved.
- Proposed ADR-0019 for the implementation: a `lowRisk` policy in `gate.json`, `adr new --tier low-risk`, `verify` eligibility and review checks (`--lines`, `--require-reviews`), a pending-review section in `status`, and line counts in the projections. Nothing is implemented until the PRD is approved and the ADR accepted.

## [2026-11-13] decision | Fast-lane PRD discovery answered

- Giovanni Fiore answered the PRD-0007 discovery questions. The main problem is the per-task ADR stop, and the chosen mechanism is a low-risk tier that accepts the ADR within human-defined thresholds, followed by a review. Each review covers only the task it names, any explicit approval naming the task counts, and every proposed exclusion and metric was kept.
- The draft now replaces its assumptions with these answers and keeps four open questions: automatic entry or opt-in, threshold values, blocking merges while a review is pending, and how a rejected review is handled. PRD-0007 stays `Draft` until approved.

## [2026-11-13] release | 0.8.1 publication check

- npm reports `latest` 0.8.1 with an SLSA v1 provenance attestation. A repository initialized with `npx agentic-repo-kit@0.8.1` pins `npx --yes agentic-repo-kit@0.8.1` in `AGENTS.md` and in its pre-push hook.
- With a simulated stale global 0.6.0, the pinned `status` instruction runs 0.8.1 while the old unpinned form still fails. `verify` accepts a CRLF ADR whose status carries a trailing YAML comment.

## [2026-11-13] release | 0.8.1

- Accepted ADR-0018 and released the ADR-0017 work as 0.8.1 (SemVer patch) through `npm version patch`, which also syncs `plugin.json`; published via the GitHub release and the Trusted Publishing workflow.

## [2026-11-13] implementation | Version-pinned projected invocation and tolerant frontmatter parsing

- Accepted ADR-0017 to resolve the open question from the 0.8.0 publication check. Generation now pins every CLI invocation in kernel-owned files to the generating version (`npx --yes agentic-repo-kit@<version>`), as hooks and CI already do. Projected content drops the global alias, and the user-owned ADR README names commands instead of invoking them.
- `verify` reads ADR status in CRLF checkouts, and `knowledge lint`, `verify`, and `status` share a YAML-aware scalar helper, so trailing comments no longer cause false gate failures.

## [2026-11-13] release | 0.8.0 publication check

- npm reports `latest` 0.8.0 with an SLSA v1 provenance attestation. With an empty npm cache, `npx agentic-repo-kit@0.8.0` initializes a repository whose pre-push hook pins `agentic-repo-kit@0.8.0`, and its `doctor`, `knowledge lint`, `status`, and `verify --adr` checks pass.
- Unpinned `npx agentic-repo-kit status` runs a globally installed copy when one exists, so a stale global install shadows the release; logged as an open question about pinning projected instructions.

## [2026-11-13] release | 0.8.0

- Accepted ADR-0016 and released the ADR-0015 work as 0.8.0 (SemVer minor) through `npm version minor`, which also syncs `plugin.json`; published via the GitHub release and the Trusted Publishing workflow.

## [2026-11-13] decision | Fast-lane task approval PRD drafted

- Drafted PRD-0007 (`Draft`) for the question that ADR-0015 deferred: letting a human pre-approve a task ADR in the request so that small tasks skip the approval stop. The discovery questions went unanswered, so the mechanism, problem focus, and metric use the offered defaults and are marked `[ASSUMPTION]`. Nothing is authorized until the owner approves.

## [2026-11-13] implementation | Run-efficiency hardening of the generated kernel

- A review of GitHub `main` at `4ec33cd` measured CLI commands at 40–130 ms and found that run time goes to model turns, human round trips, lint repair loops, and context loading. Accepted ADR-0015 to remove the kernel causes without weakening any gate; it supersedes the unpublished local ADR-0013/ADR-0014 commits (`296caa1`, `0b73ffd`).
- `verify` now enforces every `knowledge lint` category and reports duplicate ADR numbers, and an ambiguous `--adr` reference never satisfies the gate. `knowledge lint` ignores fenced code blocks and accepts CRLF log entries.
- Added the read-only `status` digest (about 0.4 KB for a fresh generated repository, about 2 KB for this one). The generated `AGENTS.md` starts each session with it and loads lifecycle skills only when their trigger matches.
- Projected content uses `npx agentic-repo-kit <command>`; the wiki page and ADR templates, the curation skill's frontmatter example, the annealing vocabulary, the lint workflow, and the log tags are now consistent, with regression tests for each.

## [2026-11-03] release | 0.7.0

- Accepted ADR-0014 and released the ADR-0013 work as 0.7.0 (SemVer minor) through `npm version minor`, which also syncs `plugin.json`; published via the GitHub release and Trusted Publishing workflow.

## [2026-11-03] implementation | Lock-aware update and governance gate hardening

- A repository review reproduced silent overwrites by `update` (user-edited `AGENTS.md`/`CLAUDE.md`, and pre-existing files in never-initialized repositories), `--git-exclude` leaking `.claude/`, `.codex/`, `.gemini/`, `.cursor/`, and `opencode.json`, and the ADR gate firing on kit-managed adapter files. The owner instructed fixing every finding; recorded as Accepted ADR-0013.
- `update` now classifies files against `scaffold.lock` (conflicts abort unless `--force`), requires a lock, and removes unmodified orphans; git excludes derive from the lock; `verify` exempts managed files and accepts `--adr` references; hook/CI projections pin `agentic-repo-kit@<version>`, extract `ADR-NNNN` from commits, and diff new branches against the merge-base.
- Added a human-owned `docs/adr/gate.json` with `exempt` globs and a lightweight routine tier (`ADR: routine` commit line, in-scope paths only, log entry required) so trivial work no longer needs an ADR.
- Retired the overlapping `security-reviewer` and `qa-test-engineer` roles in favour of `security-auditor`/`test-engineer` with kernel handoffs, and drew an explicit before/after-implementation boundary between `software-architect` and `code-reviewer`; added `--profile core|full`; `validate:plugin` now catches plugin/blueprint drift and plugin/package version skew (fixed `plugin.json` 0.4.0 → 0.6.0, synced by the npm `version` script); fixed README anchors and the Cursor adapter path.
- `npm run validate` is green (75 tests), skills (31) and plugin validation pass; a clean eight-adapter init reports healthy `doctor` and `knowledge lint`.

## [2026-09-04] implementation | Mandatory per-page wiki frontmatter

- Accepted ADR-0012 and made YAML frontmatter mandatory on every `docs/wiki/` page: required `type`/`title`/`created`/`updated` keys, a non-empty `sources:` list on fact-bearing pages, and optional `tags`/`aliases`. Broadened the `type` enum during acceptance to add `log` and `questions` so the four foundation pages are covered.
- Extended `knowledge lint` with a dependency-free frontmatter validator (`frontmatterIssues`), added frontmatter to the blueprint templates and the kit's eight wiki pages, and updated the `curate-project-knowledge` skill. `npm run validate` is green (59 tests), skills (31) and plugin validation pass, and clean multi-adapter init reports healthy `doctor` and `knowledge lint`.

## [2026-09-04] implementation | Wiki taxonomy and curation hardening

- Accepted ADR-0011 and hardened the canonical LLM Wiki pattern: three-layer contract with immutable `docs/raw/`, optional `sources/`/`entities/`/`concepts/` taxonomy (relative links only), contradictions and log-entry formats, query-to-concept promotion, and house-style guardrails in the `curate-project-knowledge` skill.
- Extended `knowledge lint` additively with orphan-page, uncovered-raw-source, and malformed-log-entry checks; `npm run validate` stays green (57 tests), skills (31) and plugin validation pass, and a clean multi-adapter init reports healthy `doctor` and `knowledge lint`.
- Proposed ADR-0012 (mandatory per-page YAML frontmatter) as the deferred follow-up; implementation blocked until human acceptance.

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










