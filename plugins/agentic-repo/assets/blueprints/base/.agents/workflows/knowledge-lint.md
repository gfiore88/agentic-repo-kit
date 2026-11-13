# Knowledge Lint Workflow

1. Run `npx agentic-repo-kit knowledge lint --json` (or `agentic-repo knowledge lint --json` with a global install). The engine is authoritative for the mechanical checks: page frontmatter, broken relative links (including index entries whose target no longer exists), pages missing from `docs/wiki/index.md`, orphan pages that no wiki page links to (the index counts), `[FACT]` claims without provenance, files under `docs/raw/` without a `docs/wiki/sources/` summary, and malformed `docs/wiki/log.md` headings. Links and markers inside fenced code blocks are ignored. Never re-implement these checks by hand: if the command cannot run, report the knowledge base as unverified.
2. Review only what the engine cannot judge:
   - conflicting active `[DECISION]` claims;
   - stale assumptions or proposals resolved by later evidence;
   - contradictions between sources that no `## Contradictions` section records yet.
3. Repair findings only when authorized, and never resolve a contradiction without a human decision.
4. Append `## [YYYY-MM-DD] lint | knowledge health` to the log with counts, repairs, and unresolved findings.
