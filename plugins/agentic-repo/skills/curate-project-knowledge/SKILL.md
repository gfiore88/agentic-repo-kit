---
name: curate-project-knowledge
description: Ingest safe project sources into a persistent Markdown wiki, maintain provenance and cross-links, and lint knowledge health. Use when new project information arrives or durable knowledge changes.
---

# Curate Project Knowledge

Treat the repository as a compounding knowledge base. The human curates sources and
asks questions; the agent reads sources and writes and maintains the wiki. Every
wiki change traces back to an ingested source or an explicit human request.

## Three layers (never blur them)

- `docs/raw/` is human-owned and treated as immutable evidence. Read from it; never
  create, edit, or delete files there.
- `docs/wiki/` is agent-maintained knowledge. Write and reorganize pages here.
- The schema and rules are this skill plus `AGENTS.md`; if they disagree, `AGENTS.md`
  wins and you propose an update rather than diverging silently.

## Page frontmatter (required)

Every page under `docs/wiki/` must open with a YAML frontmatter block. Required keys
are `type`, `title`, `created`, and `updated`; fact-bearing pages also need a
non-empty `sources:` list. `tags` and `aliases` are optional.

```yaml
---
type: concept          # index | overview | log | questions | source | entity | concept
title: Human-readable page title
created: 2026-01-15
updated: 2026-01-15
sources: ["docs/raw/spec.md"]   # required and non-empty on any page that asserts a [FACT]
tags: ["optional", "labels"]     # optional
---
```

Use the `type` that matches the page: `index` for `index.md`, `overview` for the
system overview, `log` for `log.md`, `questions` for `open-questions.md`, and
`source` / `entity` / `concept` for taxonomy pages. Set `created` once and bump
`updated` (both `YYYY-MM-DD`) whenever you change the page. A non-empty `sources:`
entry counts as page-level provenance for the uncited-fact check.

## Core rules

1. Read `docs/wiki/index.md` before opening topic pages.
2. Reject secrets, credentials, `.env` contents, PII, and regulated data from
   versioned raw knowledge. Record only safe metadata or a reference to an approved
   secure source.
3. Preserve safe raw sources; do not silently rewrite historical evidence.
4. Integrate new information into relevant wiki pages and label claims as `[FACT]`,
   `[ASSUMPTION]`, `[DECISION]`, `[OPEN QUESTION]`, or `[PROPOSAL]`.
5. Cite the source behind facts: either list them in the page `sources:` frontmatter,
   declare primary page-level provenance in the header (`**Source**: docs/raw/...`),
   or attach inline citations `[FACT] Statement. (source: docs/raw/...)`. Surface
   contradictions rather than overwriting them.
6. Update `docs/wiki/index.md` and append a parseable entry to `docs/wiki/log.md`.

## Cross-links and portability

- Link pages with **relative Markdown links** only — ordinary Markdown link syntax
  pointing at a sibling `.md` file (for example a `concepts/auth-flow.md` page).
  Never use Obsidian-style `[[wikilinks]]`; they do not resolve in generated
  repositories and escape lint checks.
- Keep the knowledge base plain Markdown. Do not add JSON indexes, databases, or
  embeddings; `docs/wiki/index.md` navigation is the intended retrieval mechanism at
  project scale.

## Optional taxonomy (growth path)

The default flat layout (`overview.md`, `index.md`, `log.md`, `open-questions.md`) is
enough to start. When a project outgrows it, organize `docs/wiki/` into:

- `sources/` — one summary page per file in `docs/raw/` (same slug, `.md` extension).
- `entities/` — one page per person, team, product, component, or service.
- `concepts/` — one page per process, decision, architecture, or glossary term.

Keep all cross-links relative and catalog every new page in `docs/wiki/index.md`.

## Contradictions

When two sources disagree, do not reconcile silently. Add a `## Contradictions`
section to the affected page with a callout that cites both sources, and flag it to
the human:

```markdown
## Contradictions

> [!warning] Source A claims X ([FACT] ... (source: docs/raw/a.md)); source B claims
> not-X ([FACT] ... (source: docs/raw/b.md)). Needs a human decision.
```

## Log format

Append one entry per operation to `docs/wiki/log.md`, using a fixed greppable header:

```
## [YYYY-MM-DD] <tag> | <description>
```

`<tag>` is one of `ingest`, `query`, `lint`, `rename`, or `delete`. Follow the header
with one bullet per file created or updated.

## Workflows

- **Ingest** — read the source in full; create/update its `sources/` summary; update
  or create the entity/concept pages it touches (integrate, do not rewrite); update
  `index.md`; append an `ingest` log entry; report every file touched.
- **Query** — read `index.md`, then the relevant pages; answer with links to the
  pages backing each claim. If the answer is a durable synthesis (comparison,
  trade-off, derived decision), offer to promote it to a `concepts/` page — create it
  only after human confirmation, then log it under `query`.
- **Lint** — run `agentic-repo knowledge lint` and resolve what it reports. Do not
  auto-fix contradictions; surface them for a human decision.

## House style

- Keep pages concise (target under 300 lines); split a page that grows past that into
  linked sub-pages.
- Single source of truth per fact: one page owns it, others link to it. Do not
  duplicate information across pages.
- Never delete content that is the only place a fact lives; move it first, then log
  the removal.

## Lint health

`knowledge lint` checks page frontmatter (missing or malformed block, invalid `type`,
missing required keys, non-date `created`/`updated`, empty `sources:` on fact-bearing
pages), broken relative links, uncatalogued pages, uncited facts, orphan pages (no
inbound links), raw sources without a `sources/` summary, and malformed `log.md`
entries.
