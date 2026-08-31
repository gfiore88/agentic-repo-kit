# Knowledge Ingest Workflow

1. Confirm the raw source is safe to version; otherwise record only safe metadata.
2. Assign a stable path under `docs/raw/` and never mutate it after ingest.
3. Read `docs/wiki/index.md` and locate affected pages.
4. Extract facts, assumptions, proposals, decisions, and open questions with source references.
5. Detect conflicts with existing claims and preserve both sides with dates and provenance.
6. Create or update topic pages, summaries, cross-links, and backlinks.
7. Update `docs/wiki/index.md` with a one-line description and source count when useful.
8. Append `## [YYYY-MM-DD] ingest | <source>` to `docs/wiki/log.md` with paths and key changes.
9. Run the knowledge lint workflow and report remaining gaps.

