---
name: curate-project-knowledge
description: Ingest safe project sources into a persistent Markdown wiki, maintain provenance and cross-links, and lint knowledge health. Use when new project information arrives or durable knowledge changes.
---

# Curate Project Knowledge

Treat the repository as a compounding knowledge base.

1. Read `docs/wiki/index.md` before opening topic pages.
2. Reject secrets, credentials, `.env` contents, PII, and regulated data from versioned raw knowledge. Record only safe metadata or a reference to an approved secure source.
3. Preserve safe raw sources; do not silently rewrite historical evidence.
4. Integrate new information into relevant wiki pages and label claims as `[FACT]`, `[ASSUMPTION]`, `[DECISION]`, `[OPEN QUESTION]`, or `[PROPOSAL]`.
5. Cite the source behind facts: either declare primary page-level provenance in the header (`**Source**: docs/raw/...`) or attach inline citations `[FACT] Statement. (source: docs/raw/...)`. Surface contradictions rather than overwriting them.
6. Update `docs/wiki/index.md` and append a parseable entry to `docs/wiki/log.md`.

For linting, check broken links, orphan pages, stale assumptions, conflicting decisions, uncited facts, and unprocessed safe sources.
