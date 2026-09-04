---
title: "ADR-0011: Wiki Taxonomy and Curation Hardening"
status: "Accepted"
date: "2026-09-04"
authors: "Giovanni Fiore and implementation agent"
tags: ["knowledge", "wiki", "curation", "karpathy", "skills"]
supersedes: ""
superseded_by: ""
---

# ADR-0011: Wiki Taxonomy and Curation Hardening

## Status

**Accepted**. Giovanni Fiore accepted this ADR on 2026-09-04, approving all seven
curation improvements (including the optional `knowledge lint` extensions) and the
rejection of Obsidian wikilinks and stack/language coupling. Mandatory per-page YAML
frontmatter is deferred to its own follow-up ADR at the owner's request.

## Context

The canonical implementation of the Karpathy LLM Wiki pattern (REF-002 of
[ADR-0001](adr-0001-hybrid-distribution-and-runtime-adapters.md)) is intentionally
minimal: the [`curate-project-knowledge`](../../plugins/agentic-repo/skills/curate-project-knowledge/SKILL.md)
skill (~17 lines), four template pages under
`plugins/agentic-repo/assets/blueprints/base/docs/wiki/` (`index.md`, `overview.md`,
`log.md`, `open-questions.md`), labeled claims
(`[FACT]`/`[ASSUMPTION]`/`[DECISION]`/`[OPEN QUESTION]`/`[PROPOSAL]`), page-level
provenance, and a deterministic `knowledge lint`
([`knowledge.mjs`](../../plugins/agentic-repo/scripts/lib/knowledge.mjs)) that
checks broken relative links, uncatalogued pages, and uncited facts.

The project owner reviewed an external reference implementation of the same pattern
(a `wiki-curator` agent and a `docs-wiki` instructions file from a Tauri/React
project). That implementation is more elaborate in several respects and contains
transferable ideas, but it is coupled to a specific stack/language and mandates
Obsidian-style `[[wikilinks]]`, which conflict with this project's portability
invariants.

This ADR selects the compatible improvements, rejects the incompatible ones, and
records the reasoning so the canonical pattern can be hardened without breaking
runtime-neutrality or link portability.

No product outcome changes; following the ADR-0010 precedent, no PRD is required.

## Decision

Adopt the following curation improvements into canonical sources
(`curate-project-knowledge` skill, blueprint `docs/wiki/`, and — where noted —
`knowledge lint`), keeping the existing minimal backbone:

1. **Explicit three-layer contract.** State as a hard rule that `docs/raw/` is
   human-owned and the curation agent reads but never creates, edits, or deletes
   files there; `docs/wiki/` is agent-maintained; the schema/contract lives in the
   skill and `AGENTS.md`.
2. **Optional richer taxonomy.** Document an optional page taxonomy under
   `docs/wiki/` — `sources/`, `entities/`, `concepts/`, plus the existing
   `overview.md` — as a recommended structure for projects that outgrow the flat
   layout. All cross-links remain **relative Markdown links**, never wikilinks.
3. **Concrete contradictions format.** Prescribe a `## Contradictions` section with
   a callout that cites both conflicting sources, operationalizing the existing
   "surface contradictions rather than overwrite" principle.
4. **Fixed, greppable log format.** Standardize `docs/wiki/log.md` entries as
   `## [YYYY-MM-DD] <tag> | <description>` with one entry per operation
   (`ingest`/`query`/`lint`/`rename`/`delete`).
5. **Query-to-concept promotion.** Add a curation step: when a query produces a
   durable synthesis (comparison, trade-off, derived decision), offer to promote it
   to a `concepts/` page only after human confirmation, and log it.
6. **House-style guardrails.** Add: pages stay concise (target < 300 lines, split
   when larger); single-source-of-truth per fact (one page owns it, others link);
   no external retrieval infrastructure (no JSON indexes, SQLite, or embeddings) —
   `index.md` navigation is the intended mechanism at project scale.
7. **Optional lint extensions.** Extend `knowledge lint` (additively, behind the
   existing pass/fail contract) with: orphan pages (zero inbound links), raw
   sources without a `sources/` summary page, and malformed log entries. Keep all
   current checks unchanged.

Explicitly **reject / defer** the following from the reference implementation:

- **Reject Obsidian `[[wikilinks]]`.** They violate the "use relative paths" and
  "verify generated relative Markdown links resolve" invariants in `AGENTS.md` and
  are invisible to `knowledge lint`'s link and catalogue checks. Cross-links stay
  as relative Markdown links.
- **Reject project/stack/language coupling.** No hardcoded stack (e.g. Tauri/React),
  no default human language, no project-specific paths or third-party tools. The
  canonical pattern stays runtime- and stack-neutral.
- **Defer mandatory per-page YAML frontmatter.** The current `**Source**:` header +
  labeled-claim scheme is retained. Adopting mandatory frontmatter would require a
  separate change to `knowledge lint` validation and is out of scope here.

## Consequences

### Positive

- **POS-001**: Hardens the canonical wiki pattern with battle-tested curation
  conventions while preserving its minimal, neutral backbone.
- **POS-002**: The richer taxonomy and promotion step make the "compounding
  knowledge" property concrete and reinforce the token-efficiency rationale over
  retrieval-at-query-time (RAG) infrastructure.
- **POS-003**: Additive lint extensions increase knowledge health coverage without
  changing the existing pass/fail contract.
- **POS-004**: Rejecting wikilinks and coupling keeps portability and
  runtime-neutrality invariants intact.

### Negative

- **NEG-001**: More curation guidance raises the discipline expected of curators;
  mitigated by keeping the taxonomy optional and the backbone unchanged.
- **NEG-002**: New lint checks add validation surface and potential false positives
  (e.g. legitimately orphan hub pages); mitigated by keeping them additive and
  tunable.
- **NEG-003**: Two documented layouts (flat vs. taxonomy) risk inconsistency across
  generated repositories; mitigated by defaulting to the flat template and marking
  the taxonomy as an opt-in growth path.

## Alternatives Considered

### Adopt the reference implementation as-is

- **ALT-001**: **Description**: Import the `wiki-curator` agent and `docs-wiki`
  instructions verbatim, including wikilinks and frontmatter.
- **ALT-002**: **Rejection Reason**: Breaks the relative-link portability invariant,
  bypasses `knowledge lint`, and couples the kernel to a specific stack and human
  language.

### Leave the canonical pattern unchanged

- **ALT-003**: **Description**: Keep the current minimal skill and templates.
- **ALT-004**: **Rejection Reason**: Forgoes concrete, low-risk curation
  improvements (contradictions format, log format, taxonomy, promotion, guardrails)
  that are compatible with existing invariants.

### Split into multiple ADRs (one per improvement)

- **ALT-005**: **Description**: Separate ADRs for taxonomy, lint, and house style.
- **ALT-006**: **Rejection Reason**: The items share one coherent curation-hardening
  scope and are cheaper to review and validate together; implementation can still
  be sliced.

## Implementation Notes

- **IMP-001**: Update
  `plugins/agentic-repo/skills/curate-project-knowledge/SKILL.md` with the
  three-layer contract, optional taxonomy, contradictions format, log format,
  query-to-concept promotion, and house-style guardrails — all using relative
  Markdown links.
- **IMP-002**: Optionally add template scaffolding under
  `plugins/agentic-repo/assets/blueprints/base/docs/wiki/` (e.g. placeholder
  `sources/`, `entities/`, `concepts/` with a short README-style note) without
  breaking existing `index.md` cataloguing.
- **IMP-003**: If lint extensions are accepted, implement them additively in
  `plugins/agentic-repo/scripts/lib/knowledge.mjs` and cover them in
  `test/` (e.g. a dedicated knowledge-lint test), keeping current checks and the
  `ok` contract intact.
- **IMP-004**: Regenerate adapter projections and run `npm run validate`,
  `npm run validate:skills`, and `npm run validate:plugin`; initialize a clean
  temporary repository and run `doctor` and `knowledge lint`; verify generated
  relative Markdown links resolve.
- **IMP-005**: Record the change in `docs/wiki/log.md` and update the wiki index if
  new pages are added. Run the end-of-task annealing diagnosis on completion.

## References

- **REF-001**: [ADR-0001](adr-0001-hybrid-distribution-and-runtime-adapters.md) —
  establishes the Karpathy LLM Wiki pattern (REF-002 therein) this ADR hardens.
- **REF-002**: [`curate-project-knowledge` skill](../../plugins/agentic-repo/skills/curate-project-knowledge/SKILL.md)
  — canonical curation contract amended by IMP-001.
- **REF-003**: [`knowledge.mjs`](../../plugins/agentic-repo/scripts/lib/knowledge.mjs)
  — deterministic `knowledge lint` extended (optionally) by IMP-003.
- **REF-004**: [upstream-content-and-provenance](../wiki/architecture/upstream-content-and-provenance.md)
  — provenance of the LLM Wiki and self-annealing patterns.
- **REF-005**: External reference implementation (`wiki-curator` agent and
  `docs-wiki` instructions from a Tauri/React project) reviewed by the owner;
  source of the cherry-picked ideas, imported as policy rather than files.
