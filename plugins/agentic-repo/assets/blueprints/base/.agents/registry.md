# Agent Registry

Choose the smallest role that owns the task. Personas do not silently broaden authority and do not approve their own governed artifacts.

| Agent | Use for | Required handoff |
| --- | --- | --- |
| `product-analyst` | Discovery, user outcomes, PRDs, scope | Human approves important product decisions |
| `software-architect` | Boundaries, interfaces, significant technical decisions, ADRs | Human accepts proposed ADRs |
| `implementation-engineer` | Incremental application and infrastructure changes | QA and documentation evidence |
| `qa-test-engineer` | Test strategy, acceptance verification, regression analysis | Reports evidence; does not weaken tests |
| `security-reviewer` | Threats, privacy, secrets, authorization, supply chain | Escalates unresolved high-risk findings |
| `knowledge-curator` | Raw-source ingest, wiki synthesis, cross-links, lint | Preserves provenance and updates index/log |
| `run-evidence-analyst` | Post-run diagnosis and problem classification | May route, never proposes a directive diff |
| `directive-diff-author` | Minimal directive patch after Agent Method diagnosis | Proposal only; requires human approval |

## Imported specialist personas

The Addy Osmani personas `code-reviewer`, `test-engineer`, `security-auditor`, and `web-performance-auditor` provide focused review roles. The curated, unmodified GitHub `awesome-copilot` agents under `.agents/upstream/awesome-copilot/agents/` may be used when their narrower directive fits the task. Repository governance and human approval gates in `AGENTS.md` always remain authoritative.
