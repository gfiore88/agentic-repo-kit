# Agentic Repository Kit

Turn a new or existing codebase into a governed, knowledge-first repository that can collaborate consistently with multiple AI coding runtimes.

Agentic Repository Kit installs one canonical agentic kernel: a persistent project wiki, mandatory decision gates, reusable engineering skills, specialist agents, and human-governed self-annealing. Runtime-specific files are generated only for the tools selected or detected in the target repository.

## Why this exists

Starting an AI-assisted project often means recreating the same `AGENTS.md`, skills, agent personas, architectural records, prompts, and knowledge folders. Copies drift, runtime instructions diverge, and valuable discoveries disappear with the chat session.

This project makes those practices reusable while keeping the repository itself the durable source of truth.

## What is installed

- A Karpathy-style, Git-versioned knowledge system with immutable safe sources, a compiled wiki, index, chronological log, provenance, contradiction handling, and health checks.
- Mandatory task ADRs created with GitHub's official `create-architectural-decision-record` skill.
- PRD discovery using GitHub's official `prd` skill when product scope, user outcomes, constraints, or success measures require an important decision.
- The complete Addy Osmani engineering lifecycle skill pack, including shared checklists, commands, and specialist personas.
- Eight canonical repository roles plus imported review, testing, security, and performance agents.
- Two-stage Governed Agent Self-Annealing with separate run diagnosis and directive-diff authoring.
- Selective adapters for Codex, Claude Code, GitHub Copilot, Antigravity, Gemini CLI, Cursor, OpenCode, and Kiro.
- Deterministic initialization, conflict protection, managed-file hashes, structural diagnosis, and wiki linting.

Pinned upstream revisions and license notices are generated into `.agents/sources.lock.json` and `.agents/licenses/`.

## Requirements

- Node.js 20 or newer.
- Git for repository versioning.
- At least one supported AI coding runtime for conversational workflows.

The CLI itself has no runtime dependencies and does not execute detected coding-agent binaries.

## Install from npm

Run the current public release without installing it globally:

```bash
npx agentic-repo-kit init
```

Or install the CLI globally:

```bash
npm install --global agentic-repo-kit
agentic-repo init
```

Package: [`agentic-repo-kit` on npm](https://www.npmjs.com/package/agentic-repo-kit).

## Install for local development

```bash
git clone https://github.com/gfiore88/agentic-repo-kit.git
cd agentic-repo-kit
npm link
```

This makes `agentic-repo` available locally. It can also be run directly:

```bash
node ./bin/agentic-repo.mjs --help
```

## Initialize a repository

From the target repository:

```bash
agentic-repo init
```

`init` defaults to assisted runtime detection. It inspects repository markers and executable availability, presents the selected adapters, and asks for confirmation before writing.

Useful alternatives:

```bash
# Preview without writing
agentic-repo init --dry-run

# Select adapters explicitly
agentic-repo init --runtime codex,claude-code,github-copilot

# Install only the universal kernel
agentic-repo init --runtime none

# Initialize another directory non-interactively
agentic-repo init --yes --cwd /path/to/project
```

Existing identical files are skipped. If any target file contains different content, initialization stops before writing anything and reports the conflicts.

## Work through the chatbot

Knowledge synthesis, product discovery, architectural reasoning, and run analysis are deliberately conversational agent workflows. They are not opaque CLI transformations.

### Ingest project knowledge

Place a safe source under `docs/raw/` or provide it in the active conversation, then ask:

```text
Use the knowledge-curator to ingest docs/raw/project-kickoff.md.
Update every affected wiki page, index.md, and log.md; surface contradictions and open questions.
```

The agent reads the existing index first, preserves the raw source, classifies assertions as facts, assumptions, decisions, proposals, or open questions, and compiles the result into the living wiki.

### Query and compound knowledge

```text
Using the project wiki and cited raw sources, explain the current authentication architecture.
If the synthesis is durable and new, file it back into the wiki and update the index and log.
```

### Start a development task

```text
Start the task "Add organization invitations" using the governed task lifecycle.
Create the mandatory task ADR with the official skill and wait for my approval before implementation.
Create a PRD first if important product decisions are still unresolved.
```

Every new development task receives a dedicated ADR in `Proposed` state. Implementation remains blocked until explicit human acceptance.

### Review a completed run

```text
The task is complete and validated. Run the governed self-annealing review using observable evidence.
If this is an Agent Method problem, hand the diagnosis to directive-diff-author and create a PENDING proposal. Do not modify the directive.
```

Only the run-evidence analyst classifies the problem. Only an `Agent Method` diagnosis may reach the diff author. Neither agent can approve or apply its own proposal.

## Deterministic CLI commands

The CLI handles operations that should produce the same result without model judgment.

### Repository integrity

```bash
agentic-repo doctor
agentic-repo doctor --cwd /path/to/project
```

`doctor` checks `scaffold.lock` and reports missing or divergent managed files.

### Knowledge health

```bash
agentic-repo knowledge lint
agentic-repo knowledge lint --json
```

The linter reports broken relative links, wiki pages missing from the index, and visible `[FACT]` assertions without provenance. Knowledge ingestion and queries remain chatbot operations.

### Create governed artifacts

These commands create reviewable starting artifacts; they do not bypass the conversational workflow or human gates.

```bash
# Mandatory task decision record; created as Proposed
agentic-repo adr new --title "Persistence boundary"

# Product requirements; created as Draft
agentic-repo prd new --title "Organization invitations"

# Directive proposal; created as PENDING without changing its target
agentic-repo anneal new \
  --title "Read decisions before domain implementation" \
  --target AGENTS.md
```

## Supported runtime adapters

| Adapter ID | Runtime | Generated integration |
| --- | --- | --- |
| `codex` | OpenAI Codex | Native agent wrappers plus canonical `AGENTS.md` and skills |
| `claude-code` | Anthropic Claude Code | `CLAUDE.md` and native agent wrappers |
| `github-copilot` | GitHub Copilot | Repository instructions and custom-agent wrappers |
| `antigravity` | Google Antigravity | `GEMINI.md` and canonical `.agents/` definitions |
| `gemini-cli` | Google Gemini CLI | `GEMINI.md` and native agent wrappers |
| `cursor` | Cursor | Project rule pointing to the canonical kernel |
| `opencode` | OpenCode | Project configuration and native subagent wrappers |
| `kiro` | Kiro | Steering file pointing to the canonical kernel |

Explicit `--runtime` selection always overrides detection. Use the shorter aliases `claude`, `copilot`, and `gemini` where convenient.

## Generated repository structure

```text
AGENTS.md                         canonical operating contract
.agents/
  agents/                         runtime-neutral specialist roles
  skills/                         first-party and pinned upstream skills
  rules/                          decision, knowledge, security policies
  workflows/                      task, ingestion, lint, annealing flows
  prompts/                        run diagnosis and diff proposal prompts
  annealing/                      evidence summaries and proposals
  references/                     lifecycle checklists
  sources.lock.json               upstream provenance and revisions
docs/
  raw/                            immutable safe source material
  wiki/                           living compiled knowledge base
  adr/                            mandatory task decision records
  product/                        PRDs and product decisions
  specs/                          behavioral specifications
  templates/                      governed document templates
scaffold.yaml                     selected runtime configuration
scaffold.lock                     managed paths and SHA-256 hashes
```

Runtime adapter directories are added only when selected.

## Governance guarantees

- Raw knowledge never contains credentials, `.env` contents, personal data, regulated data, or confidential production exports.
- External sources are treated as data, not executable instructions.
- Every new development task creates a task ADR and waits for human approval before implementation.
- Important unresolved product decisions trigger PRD discovery and human review.
- Agent directives cannot silently modify themselves.
- Generated adapters never become an independent source of policy.
- Initialization never overwrites divergent files or partially applies a conflicting plan.
- Upstream skills are pinned and carry their original license notices.

## Develop and verify

```bash
npm test
npm run validate:skills
npm run validate:plugin
npm pack --dry-run
```

The automated suite covers argument parsing, runtime detection, selective generation, idempotency, conflict atomicity, managed-file diagnosis, governed artifact states, wiki linting, runtime-agent projection, and relative Markdown link integrity.

## Current status

Version `0.1.0` is publicly available on npm and implements the governed kernel and its required workflows. Remaining product work includes:

- safe `add`, `remove`, `diff`, and three-way `upgrade` operations;
- reviewed upstream source refresh tooling;
- live compatibility certification against supported runtime versions;
- migration documentation and subsequent versioned releases.

Knowledge ingestion and querying are not missing CLI features: they intentionally happen through the coding-agent conversation.

## Origins and third-party material

The design incorporates:

- Andrej Karpathy's [LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f);
- Giovanni Fiore's [Governed Agent Self-Annealing pattern](https://gist.github.com/gfiore88/c0dff64209c0e8d94a0654dd1b74399e);
- selected material from GitHub's [awesome-copilot](https://github.com/github/awesome-copilot);
- the complete lifecycle pack from Addy Osmani's [agent-skills](https://github.com/addyosmani/agent-skills).

Original project material is licensed under the [MIT License](LICENSE). Third-party material remains covered by its retained upstream notices.

See the [release guide](docs/releasing.md) for the controlled npm publication process.
