# Knowledge Lint Workflow

Inspect, report, and when authorized repair:

- relative Markdown links that do not resolve;
- wiki pages absent from `docs/wiki/index.md`;
- pages with no inbound links other than the index;
- `[FACT]` claims without provenance;
- conflicting active `[DECISION]` claims;
- stale assumptions or proposals resolved by later evidence;
- safe files under `docs/raw/` not represented in the log or wiki;
- index entries whose target no longer exists.

Append `## [YYYY-MM-DD] lint | knowledge health` to the log with counts, repairs, and unresolved findings.

