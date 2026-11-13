---
type: concept
title: Knowledge and Decision Lifecycle
created: 2026-08-31
updated: 2026-11-13
---

# Knowledge and Decision Lifecycle

## Session context

Generated repositories start each session with the read-only `status` digest, invoked with the generating kit version pinned ([ADR-0017](../../adr/adr-0017-version-pinned-projected-invocation-and-tolerant-frontmatter-parsing.md)): kernel and knowledge health, every ADR and PRD with its status (open records first), pending annealing proposals, ADR number collisions, and the latest log entries. Agents then open only the documents that the digest and `index.md` point to, and load a lifecycle skill only when its trigger matches the task ([ADR-0015](../../adr/adr-0015-run-efficiency-hardening-of-the-generated-kernel.md)).

## Knowledge

Safe sources enter immutable `docs/raw/`. The knowledge curator classifies assertions, integrates them into the compiled wiki, records contradictions, updates cross-links and `index.md`, then appends a parseable log entry; lifecycle entries use the `decision`, `implementation`, `routine`, and `release` tags. `knowledge lint` checks typed frontmatter, broken links, uncatalogued pages, facts lacking visible provenance, orphan pages, uncovered raw sources, and malformed log entries, ignoring links and markers inside fenced code blocks; `verify` enforces every one of those checks. The knowledge lint workflow runs the engine first and keeps manual review for semantic checks only.

## Decisions

Important product uncertainty triggers the official PRD discovery workflow. Every new development task receives a dedicated ADR created with the official skill, starting from the next-numbered file that `adr new` creates. Each task ADR starts as `Proposed`; implementation remains blocked until explicit human acceptance. Follow-up work inside an already `Accepted` ADR's scope cites it as `ADR-NNNN` in commit messages instead of duplicating it; `verify --adr` and the generated hook/CI projections (pinned to the generating kit version and merge-base aware for new branches) check those references, and kit-managed files never trip the gate. ADR numbers must be unique: `verify` reports a number used by more than one file, and a reference to it never satisfies the gate. The opt-in low-risk tier ([ADR-0019](../../adr/adr-0019-low-risk-adr-tier-with-per-task-review.md), from [PRD-0007](../../product/prd-0007-fast-lane-task-approval.md)) removes the approval stop for small tasks.

- **Eligibility:** a `lowRisk` policy in `gate.json` sets thresholds (5 source files and 200 lines by default, documentation excluded, with tests whenever code changes) and excluded categories (security, dependencies, public APIs, migrations, governance).
- **Acceptance:** a qualifying task's ADR is accepted by the tier with a pending review.
- **Review:** a human reviews each one afterwards, and only an explicit approval that names the task counts. With CI enforcement (`--enforce ci`) and the check required in branch protection, `verify --require-reviews` blocks merges to the default branch until the review is recorded; without CI enforcement the review is a convention. A rejection reverts the change.
- **Adoption:** new repositories get the policy from `init`. Existing repositories opt in explicitly with `update --enable-low-risk`, and `update` never enables the tier on its own ([ADR-0021](../../adr/adr-0021-explicit-low-risk-tier-opt-in-for-existing-repositories.md)).

A human-owned `docs/adr/gate.json` lists `exempt` globs that never need an ADR and `routine` globs for the lightweight routine tier (`ADR: routine` in the commit message plus a `routine` entry in `docs/wiki/log.md`, no ADR). PRDs begin as `Draft` and important product choices remain human-governed.

## Completion

A task is complete only after its acceptance criteria, tests, relevant static/security checks, durable documentation, wiki index/log updates, and end-of-run annealing assessment are satisfied.
