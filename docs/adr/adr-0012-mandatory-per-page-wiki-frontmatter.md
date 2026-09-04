---
title: "ADR-0012: Mandatory Per-Page Wiki Frontmatter"
status: "Accepted"
date: "2026-09-04"
authors: "Giovanni Fiore and implementation agent"
tags: ["knowledge", "wiki", "frontmatter", "lint", "skills"]
supersedes: ""
superseded_by: ""
---

# ADR-0012: Mandatory Per-Page Wiki Frontmatter

## Status

**Accepted** by Giovanni Fiore on 2026-09-04. This ADR is the deferred follow-up
recorded in [ADR-0011](adr-0011-wiki-taxonomy-and-curation-hardening.md).

During acceptance the `type` enum was broadened beyond the original `Proposed` draft
to also cover the canonical foundation pages: `log` (for `log.md`) and `questions`
(for `open-questions.md`). Without them the mandatory frontmatter could not be
applied to every page under `docs/wiki/`, which the decision requires.

## Context

[ADR-0011](adr-0011-wiki-taxonomy-and-curation-hardening.md) hardened the canonical
LLM Wiki pattern but deliberately kept the lighter provenance scheme (a
`**Source**:` header plus labeled claims) and **deferred** mandatory per-page YAML
frontmatter to its own decision, because adopting it changes both the authoring
contract and the `knowledge lint`
([`knowledge.mjs`](../../plugins/agentic-repo/scripts/lib/knowledge.mjs)) validation
surface.

The external reference implementation reviewed for ADR-0011 mandates YAML frontmatter
on every wiki page (`type`, `title`, `created`, `updated`, `sources`, `tags`,
optional `aliases`). Structured frontmatter makes provenance and page metadata
machine-parseable, enables staleness checks (`updated:` vs. change time), and gives
the taxonomy a typed backbone (`type: source | entity | concept | overview`).

The owner has requested implementing this in a follow-up ADR.

No product outcome changes; following the ADR-0010/0011 precedent, no PRD is
required.

## Decision

Adopt mandatory YAML frontmatter on every page under `docs/wiki/`, integrated with
the existing provenance model rather than replacing its intent:

1. **Required keys.** Every wiki page must begin with a YAML frontmatter block
   containing `type` (one of `index`, `overview`, `log`, `questions`, `source`,
   `entity`, or `concept`), `title`, `created` (`YYYY-MM-DD`), and `updated`
   (`YYYY-MM-DD`).
2. **Provenance keys.** Pages asserting facts must carry a non-empty `sources:` list
   (relative `docs/raw/...` paths or approved references). A valid `sources:` entry
   satisfies the existing uncited-fact check as page-level provenance; inline
   `(source: ...)` citations remain allowed for per-claim overrides.
3. **Optional keys.** `tags` and `aliases` are permitted and unvalidated beyond being
   well-formed lists.
4. **Lint validation (additive).** Extend `knowledge lint` to flag: missing or
   malformed frontmatter, an invalid `type`, missing required keys, a non-date
   `created`/`updated`, and (for fact-bearing pages) an empty `sources:`. Keep all
   ADR-0011 checks intact and preserve the single `ok` pass/fail contract.
5. **Templates and skill.** Update the blueprint `docs/wiki/` templates to include
   conformant frontmatter and update
   [`curate-project-knowledge`](../../plugins/agentic-repo/skills/curate-project-knowledge/SKILL.md)
   to require and describe the frontmatter shape.
6. **Migration.** Provide the frontmatter shape and a short migration note so existing
   generated repositories can add frontmatter before enabling the new checks; the new
   checks ship additively so upgrades are not silently broken.

Keep the ADR-0011 rejections in force: relative Markdown links only (no wikilinks),
and no stack/language coupling.

## Consequences

### Positive

- **POS-001**: Page metadata and provenance become machine-parseable, enabling
  reliable staleness and typing checks.
- **POS-002**: The optional taxonomy from ADR-0011 gains a typed backbone via
  `type:`.
- **POS-003**: Provenance is centralized in `sources:`, reducing reliance on
  free-form header conventions.

### Negative

- **NEG-001**: Higher authoring overhead per page and a larger lint surface;
  mitigated by templates and additive rollout.
- **NEG-002**: A migration burden for existing generated repositories; mitigated by
  additive checks and a documented migration note.
- **NEG-003**: Two provenance mechanisms (`sources:` frontmatter and inline
  citations) coexist; mitigated by making frontmatter primary and inline citations an
  explicit per-claim override.

## Alternatives Considered

### Keep the ADR-0011 header-only provenance scheme

- **ALT-001**: **Description**: Rely on `**Source**:` headers and labeled claims
  without frontmatter.
- **ALT-002**: **Rejection Reason**: Not machine-parseable for typing/staleness and
  inconsistent across curators; the owner requested structured frontmatter.

### Make frontmatter optional/advisory

- **ALT-003**: **Description**: Recommend frontmatter but do not lint it.
- **ALT-004**: **Rejection Reason**: Optional metadata drifts and is unreliable for
  automated checks; the value depends on enforcement.

## Implementation Notes

- **IMP-001**: Add a frontmatter parser/validator to
  `plugins/agentic-repo/scripts/lib/knowledge.mjs` (additive result fields, unchanged
  `ok` semantics) and cover it in `test/`.
- **IMP-002**: Update blueprint templates under
  `plugins/agentic-repo/assets/blueprints/base/docs/wiki/` with conformant
  frontmatter; keep `index.md` cataloguing and relative links intact.
- **IMP-003**: Update the `curate-project-knowledge` skill to require frontmatter and
  document the exact shape and the `sources:`-satisfies-provenance rule.
- **IMP-004**: Regenerate adapter projections; run `npm run validate`,
  `npm run validate:skills`, `npm run validate:plugin`; init a clean temporary
  repository and run `doctor` and `knowledge lint`; verify relative links resolve.
- **IMP-005**: Record the change in `docs/wiki/log.md`; run the end-of-task annealing
  diagnosis on completion.

## References

- **REF-001**: [ADR-0011](adr-0011-wiki-taxonomy-and-curation-hardening.md) — defers
  this decision and establishes the taxonomy this frontmatter types.
- **REF-002**: [ADR-0006](adr-0006-mandatory-annealing-closure-and-page-provenance.md)
  — page-level provenance baseline this frontmatter extends.
- **REF-003**: [`knowledge.mjs`](../../plugins/agentic-repo/scripts/lib/knowledge.mjs)
  — lint engine extended by IMP-001.
- **REF-004**: [`curate-project-knowledge` skill](../../plugins/agentic-repo/skills/curate-project-knowledge/SKILL.md)
  — authoring contract amended by IMP-003.
