# Agent Registry

Choose the smallest role that owns the task. Personas do not silently broaden authority and do not approve their own governed artifacts.

| Agent | Use for | Required handoff |
| --- | --- | --- |
| `product-analyst` | Discovery, user outcomes, PRDs, scope | Human approves important product decisions |
| `software-architect` | **Before implementation**: boundaries, interfaces, significant technical decisions, task ADRs | Human accepts proposed ADRs |
| `implementation-engineer` | Incremental application and infrastructure changes | QA and documentation evidence |
| `test-engineer` | Test strategy, acceptance verification against criteria, coverage and regression analysis | Reports commands, results, and residual risk; never weakens tests or criteria to pass |
| `security-auditor` | Threats, privacy, secrets, authorization, supply chain — including raw knowledge, agent directives, imported skills, and self-annealing | Escalates unresolved high-risk findings; flags permission expansion for human review |
| `knowledge-curator` | Raw-source ingest, wiki synthesis, cross-links, lint | Preserves provenance and updates index/log |
| `run-evidence-analyst` | Post-run diagnosis and problem classification | May route, never proposes a directive diff |
| `directive-diff-author` | Minimal directive patch after Agent Method diagnosis | Proposal only; requires human approval |

## Imported specialist personas

`test-engineer` and `security-auditor` are imported Addy Osmani personas promoted to primary roles; the handoff column above adds this repository's obligations to them. The imported `code-reviewer` and `web-performance-auditor` personas provide focused review roles. `code-reviewer` evaluates an existing diff **after implementation**; when its architecture axis finds that a change needs a decision no Accepted ADR covers, it hands that finding to `software-architect` instead of deciding it in review. The curated, unmodified GitHub `awesome-copilot` agents under `.agents/upstream/awesome-copilot/agents/` may be used when their narrower directive fits the task. Repository governance and human approval gates in `AGENTS.md` always remain authoritative.
