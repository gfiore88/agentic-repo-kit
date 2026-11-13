---
title: "ADR-0015: Run-Efficiency Hardening of the Generated Kernel"
status: "Accepted"
date: "2026-11-13"
authors: "Giovanni Fiore (decision owner) and implementation agent"
tags: ["agent-runs", "performance", "knowledge-lint", "verify", "cli", "directives", "consistency"]
supersedes: ""
superseded_by: ""
---

# ADR-0015: Run-Efficiency Hardening of the Generated Kernel

## Status

**Accepted** by Giovanni Fiore on 2026-11-13. He replied "ok" to the request to
accept ADR-0015 as proposed, with delivery as a Draft PR on GitHub. All eleven
decisions are in scope.

## Context

A code review of GitHub `main` at `4ec33cd` (npm `0.7.0`, CI green) measured where a
governed agent run spends its time. Every measurement and reproduction below was
taken on a fresh clone of GitHub `main` and on repositories generated from it.

**The deterministic engine is not the bottleneck.** `init` with all eight adapters
writes 168 files in 0.13 s; `doctor`, `knowledge lint`, and `verify` take
0.04–0.06 s; the 75 tests run in 1.5 s. Invoking the CLI through
`npx agentic-repo-kit@0.7.0` adds 0.4–1.9 s per call. Run time is dominated by model
turns, human round trips, repair loops, and context loading.

**Repair loops and wrong gate decisions caused by kernel defects:**

1. A wiki page created from the shipped `docs/templates/wiki-page-template.md` fails
   `knowledge lint` with five findings: the template predates ADR-0012 (`status` and
   `last_updated` instead of `type`, `created`, and `updated`), and its
   `../wiki/index.md` link breaks in taxonomy subfolders. Every new page costs a
   repair iteration.
2. `knowledge lint` reads links and `[FACT]` markers inside fenced code blocks. A
   documented example produced one broken link and one uncited fact, and `verify`
   enforces both, so hooks and CI block legitimate documentation.
3. Projected content tells agents to run the bare `agentic-repo` binary
   (`curate-project-knowledge` line 112, `AGENTS.md`, `decision-gates.md`,
   `docs/adr/README.md`, and the `knowledge.mjs` and `artifacts.mjs` error messages),
   and `bootstrap-agentic-repository` uses `<plugin-root>`. Repositories bootstrapped
   with `npx` have no such binary, so agents fall back to reimplementing lint by
   hand, which is slow and diverges from the engine.
4. `verify` enforces only three of the seven `knowledge lint` categories. A push can
   pass the gate while `knowledge lint` reports the repository unhealthy because of
   frontmatter issues, orphan pages, uncovered sources, or malformed log entries.
5. `adr new` numbers ADRs as the local maximum plus one. Two parallel branches each
   created `adr-0001-*`. After both were merged, `verify --adr ADR-0001` resolved the
   reference to whichever file sorted first, which was the `Proposed` one. Parallel
   agent runs therefore produce silent, ambiguous gate decisions. The same collision
   already exists between unpublished local commits (`296caa1` and `0b73ffd`,
   numbered ADR-0013 and ADR-0014) and GitHub's ADR-0013 and ADR-0014. Those commits
   carried fixes for items 3 and 4.

**Contradictory directives.** The vendored `using-agent-skills` tells agents to stop
and ask when they meet inconsistencies, so each contradiction can turn into an extra
human round trip or an inconsistent output:

6. There are three annealing vocabularies: the ADR-0006 closure block (`None` |
   `Agent Method` | `Product/Domain Scope` | `Tooling Gap`), Stage 1 of
   `annealing-process.md` (six destinations), and `analyze-agent-run.prompt.md`,
   which says `One-Off Incident` where the process says `One-Off`.
7. `.agents/workflows/knowledge-lint.md`, which `AGENTS.md` tells agents to run,
   describes a manual inspection, never mentions the CLI, and defines orphans
   differently from the engine.
8. ADR-0011 fixes the log tags as `ingest`, `query`, `lint`, `rename`, and `delete`.
   Yet `AGENTS.md` requires a log entry for every task and the routine tier requires
   one for every routine change, and no tag fits either. This repository's own log
   uses `implementation`, `decision`, `release`, and `operations`.
9. `adr new` renders `docs/templates/adr-template.md`, whose sections differ from
   the official `create-architectural-decision-record` skill. That skill's
   `${input:…}` variables and its instruction to ask the user for missing inputs
   invite an avoidable round trip.

**Context loading.** The governance kernel itself is lean, at about 9k tokens across
bootstrap, gate, and closure. Two things add to it:

10. Session bootstrap loads `using-agent-skills` (about 2.6k tokens), whose Lifecycle
    Sequence chains 16 skills (about 50k tokens). The kernel states no
    proportionality rule.
11. Nothing summarizes decision state compactly. To find related or pending
    decisions, an agent opens the ADR files or relies on a hand-maintained index list
    that has drifted before. In this repository, the 14 ADRs plus the log add up to
    about 19k tokens.

Constraints: the vendored upstream skills are byte-identical to their pinned
revisions in `.agents/sources.lock.json`, so changes target kernel-owned sources
only. ADR-0006 (closure block), ADR-0011 (log format), ADR-0012 (frontmatter), and
ADR-0013 (gate) stay in force except where this record amends them explicitly.
Pre-approving task ADRs or widening the routine tier would change the product's
governance promise, so both are out of scope and would need a PRD. No product outcome
changes; following the ADR-0010, ADR-0011, and ADR-0013 precedent, no PRD is
required.

## Decision

Remove the defects that cause repair loops or ambiguous gate decisions, make the
directives consistent, and give agents a deterministic, read-only status digest,
without weakening any gate.

1. **Resolvable invocation.** Projected content and runtime error messages reference
   `npx agentic-repo-kit <command>`. The bare `agentic-repo` alias is documented once,
   as requiring a global install. `bootstrap-agentic-repository` uses the `npx` form
   and keeps `node <plugin-root>/scripts/agentic-repo.mjs` as the in-plugin
   equivalent.
2. **Verify/lint parity.** `verify` reports every failing `knowledge lint` category.
3. **Lint ignores fenced code.** Link and `[FACT]` detection skip fenced code blocks
   (```` ``` ```` and `~~~`). Inline taxonomy markers such as `` `[FACT]` `` are still
   detected.
4. **Lint-clean wiki template.** `wiki-page-template.md` carries the ADR-0012
   frontmatter (`type`, `title`, `created`, `updated`, `sources`) and no
   depth-dependent link. A page created from it passes `knowledge lint` once its
   placeholders and sources are filled in.
5. **One annealing vocabulary.** Keep the ADR-0006 closure block, and map its classes
   to the Stage 1 destinations in `annealing-process.md` and in the analysis prompt:
   - `None` covers runs with no friction and `One-Off` incidents, which go to the run
     log.
   - `Agent Method` maps to `Agent Method`, the only class allowed into Stage 2.
   - `Product/Domain Scope` maps to `Domain Fact`, `Architectural Decision`, or
     `Product Defect`.
   - `Tooling Gap` maps to `Capability`.

   Use `One-Off` everywhere.
6. **Engine-first lint workflow.** `knowledge-lint.md` starts by running
   `npx agentic-repo-kit knowledge lint --json` for the mechanical checks. Manual
   review is limited to the semantic checks the engine cannot perform: conflicting
   decisions, stale assumptions or proposals, and contradictions. The workflow adopts
   the engine's orphan definition.
7. **Lifecycle log tags (amends ADR-0011 decision 4).** Add `decision`,
   `implementation`, `routine`, and `release` to the allowed tags. The entry format,
   append-only history, and existing tags stay unchanged.
8. **ADR number integrity.** `verify` reports every ADR number that more than one
   file uses. A `--adr` reference that resolves to more than one file is reported as
   ambiguous and never satisfies the gate. The ADR README tells whoever merges
   parallel branches to renumber the later ADR before merging.
9. **`status` digest.** Add a read-only `agentic-repo status [--json] [--limit <n>]`
   command. It prints:
   - the kit version, profile, runtimes, and enforcement mode from `scaffold.lock`,
     with `doctor` integrity counts;
   - `knowledge lint` health counts;
   - one line per ADR and PRD (number, status, title), with `Proposed` and `Draft`
     records listed first;
   - `PENDING` annealing proposals;
   - ADR number collisions;
   - the latest log entries (5 by default), found by date, whichever order the log
     uses.

   The command writes nothing and makes no network or subprocess calls. The
   `AGENTS.md` session bootstrap starts with it, falls back to reading the files when
   the CLI is unavailable, and opens only the documents that the digest and
   `index.md` point to.
10. **Proportional skill loading.** `AGENTS.md` and `govern-development-task` state
    that a lifecycle skill is loaded only when its trigger matches the task. They
    treat the `using-agent-skills` Lifecycle Sequence as a menu rather than a
    checklist and give typical skill sets for a bug fix, a small change, and a new
    feature. Acceptance criteria, tests, verification, and the Definition of Done are
    never skipped.
11. **Deterministic ADR creation.** Align `docs/templates/adr-template.md` with the
    official skill's section structure. `govern-development-task` creates the file
    with `npx agentic-repo-kit adr new --title "<title>"` and fills it in per the
    official skill. It derives context, decision, alternatives, and stakeholders from
    the conversation and asks the human only for what it cannot derive.

All existing gates stay unchanged. Every new task still gets a `Proposed` task ADR and
waits for explicit human acceptance. The routine tier, the `exempt` list, and the
annealing approval rules are untouched.

## Consequences

### Positive

- **POS-001**: Neither the shipped template nor fenced examples cause a repair loop.
  The first lint after creating a page reports real defects only.
- **POS-002**: Agents always invoke the authoritative engine instead of
  reimplementing lint by hand.
- **POS-003**: `verify` and `knowledge lint` agree, so the gate cannot pass a
  repository that lint reports unhealthy.
- **POS-004**: Parallel agent runs on separate branches cannot silently mis-gate
  through duplicate ADR numbers.
- **POS-005**: One CLI call returning one to two kilobytes replaces opening the log
  and every ADR to discover decision state. Tokens and tool calls per run drop, and
  the saving grows with the repository.
- **POS-006**: With fewer contradictions, the kernel itself triggers fewer
  clarifying stops.

### Negative

- **NEG-001**: `verify` becomes stricter. Once `update` refreshes the pinned
  verifier, repositories with wiki pages that predate ADR-0012 fail hooks or CI until
  those pages are fixed. Mitigated: `knowledge lint` already reports the same
  findings, and the pin changes only through an explicit `update`.
- **NEG-002**: The new CLI command has to be maintained and documented.
- **NEG-003**: Links inside fenced code are no longer validated, which is intended.
- **NEG-004**: `docs/templates/` is user-owned and preserved by `update`, so existing
  repositories keep the old templates until the user deletes them and reruns
  `update`, which recreates missing files. The CHANGELOG documents this step.
- **NEG-005**: Proportional loading relies on agent judgment. Mitigated by keeping
  verification and the Definition of Done mandatory.

## Alternatives Considered

### Edit the vendored upstream skills

- **ALT-001**: **Description**: Change `using-agent-skills` and
  `create-architectural-decision-record` directly.
- **ALT-002**: **Rejection Reason**: Breaks the byte-identical pinned provenance in
  `.agents/sources.lock.json` and turns every upstream refresh into a manual merge.

### Pre-approved task ADRs or a wider routine tier

- **ALT-003**: **Description**: Let an explicit upfront approval accept the task ADR
  when it is created, or widen the default routine globs.
- **ALT-004**: **Rejection Reason**: Either change alters the product's governance
  promise. It needs a PRD and is out of scope here.

### Generated ADR catalog file

- **ALT-005**: **Description**: Have `adr new` maintain a `docs/adr/index.md`
  catalog.
- **ALT-006**: **Rejection Reason**: The CLI would mutate a user-owned file, and the
  catalog would drift whenever a human changes a status by hand. A read-only digest
  computes state on demand.

### Collision-free ADR identifiers

- **ALT-007**: **Description**: Use timestamps or random suffixes instead of
  sequential numbers.
- **ALT-008**: **Rejection Reason**: Breaks the `ADR-NNNN` convention, gate
  references, and the official skill's naming. Detecting duplicates in `verify` is
  enough.

### Optimize CLI I/O

- **ALT-009**: **Description**: Parallelize file reads in `buildPlan`,
  `lintKnowledge`, and `detectRuntimes`.
- **ALT-010**: **Rejection Reason**: The commands already finish in 40–130 ms, so
  the effect on run time would not be measurable.

## Implementation Notes

- **IMP-001**: Slice 1 (engine): decisions 2, 3, and 8 in `verify.mjs` and
  `knowledge.mjs`, with regression tests for the reproductions above.
- **IMP-002**: Slice 2 (digest): decision 9 as a `status.mjs` module with CLI
  dispatch, `--json`, and help text. Tests cover empty, generated, and colliding
  repositories and both log orders.
- **IMP-003**: Slice 3 (content): decisions 1, 4, 5, 6, 7, 10, and 11 in kernel-owned
  blueprint files, skills, and error messages, adjusting string assertions in tests.
- **IMP-004**: Slice 4 (docs): the README CLI section, a CHANGELOG `Unreleased` entry
  that includes the template refresh step, and the kit wiki
  (`knowledge-and-decision-lifecycle`, `governed-self-annealing`, index, and log).
- **IMP-005**: Validation: `npm test`, `npm run validate:skills`, and
  `npm run validate:plugin`; a clean temporary repository with every adapter in the
  `full` and `core` profiles, where `doctor`, `knowledge lint`, `verify`, and
  `status` run and every relative link resolves; plugin and blueprint copies in
  sync.
- **IMP-006**: Success criteria:
  - a page created from the template passes lint once its placeholders are filled
    in;
  - the fenced-code and duplicate-ADR reproductions no longer reproduce;
  - `verify` and lint report the same knowledge categories;
  - `status` output stays under 2 KB for a generated repository and under 4 KB for
    this repository, compared with about 77 KB of ADR and log files it replaces for
    state discovery.
- **IMP-007**: Release: a follow-up release ADR, following the ADR-0014 precedent.

## References

- **REF-001**: [ADR-0006](adr-0006-mandatory-annealing-closure-and-page-provenance.md):
  closure block kept, mapping added by decision 5.
- **REF-002**: [ADR-0011](adr-0011-wiki-taxonomy-and-curation-hardening.md): log tags
  amended by decision 7.
- **REF-003**: [ADR-0012](adr-0012-mandatory-per-page-wiki-frontmatter.md):
  frontmatter applied to the template by decision 4.
- **REF-004**: [ADR-0013](adr-0013-lock-aware-update-and-governance-gate-hardening.md):
  gate semantics preserved; ADR references hardened by decision 8.
- **REF-005**: [PRD-0001](../product/prd-0001-agentic-repository-kernel.md): product
  outcomes unchanged.
- **REF-006**: Unpublished local commits `296caa1` and `0b73ffd`, numbered ADR-0013
  and ADR-0014 and colliding with GitHub, are the precedent for decisions 1 and 2;
  this record supersedes them.
