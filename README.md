<div align="center">

# ⚡ Agentic Repository Kit

**Transform any codebase into a governed, knowledge-first operating kernel for AI coding agents.**

*Universal scaffolding for Claude Code, OpenAI Codex, GitHub Copilot, Google Antigravity, Cursor, Gemini CLI, OpenCode, and Kiro.*

[![npm version](https://img.shields.io/npm/v/agentic-repo-kit?color=18181b&labelColor=09090b&logo=npm&logoColor=white&style=flat-square)](https://www.npmjs.com/package/agentic-repo-kit)
[![CI Status](https://img.shields.io/github/actions/workflow/status/gfiore88/agentic-repo-kit/ci.yml?branch=main&label=CI&color=18181b&labelColor=09090b&style=flat-square)](https://github.com/gfiore88/agentic-repo-kit/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-18181b?labelColor=09090b&style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-18181b?labelColor=09090b&logo=node.js&logoColor=white&style=flat-square)](https://nodejs.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-18181b?labelColor=09090b&style=flat-square)](package.json)

```bash
npx agentic-repo-kit init
```

[Quick Start](#quick-start) • [Architecture](#architecture) • [Core Pillars](#core-pillars) • [Runtime Support](#runtime-support) • [Chatbot Workflows](#chatbot-workflows) • [CLI Commands](#cli-commands)

</div>

---

## 💡 Why Agentic Repo Kit?

Starting an AI-native software project usually means repeatedly copy-pasting the same prompts, persona descriptions, loose instruction files, and ad-hoc rules into new repositories. Over time, instructions drift across tools, architectural context gets lost when chat windows close, and coding agents execute risky changes without human decision boundaries.

**Agentic Repo Kit** installs a single, model-agnostic kernel directly into your repository:

| Challenge | Without Agentic Repo Kit | With Agentic Repo Kit |
| :--- | :--- | :--- |
| **Knowledge Retention** | Ephemeral chat memory; lost when sessions reset | 🧠 **Living Git-versioned wiki** compiled from safe raw sources |
| **Architectural Drift** | Unreviewed agent rewrites and assumptions | 🛡️ **Mandatory task ADR gates** before implementation begins, with a reviewed fast lane for small, low-risk tasks |
| **Slow Agent Runs** | Agents reread the whole decision history, chase false lint findings, and wait on approvals | ⏱️ **One-call session digest**, skills loaded only when needed, and the low-risk fast lane |
| **Multi-Tool Fragmentation** | Separate instruction formats for every IDE and CLI | ⚡ **Single canonical kernel** projected to 8 runtime adapters |
| **Self-Improvement** | Agents hallucinate or silently overwrite directives | 🔄 **Governed 2-stage self-annealing** requiring human sign-off |
| **Engineering Standards** | Inconsistent prompts and missing lifecycle tools | 🧰 **31+ curated engineering skills** and specialist personas |

---

<a id="architecture"></a>

## 🏛️ System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                AGENTIC REPOSITORY KERNEL                                │
│                                                                                         │
│   docs/raw/              ──►   Knowledge Curator         ──►   docs/wiki/               │
│   (immutable sources)          (classify & lint)               (living compiled memory) │
│                                                                                         │
│   docs/product/          ──►   Governance Gates          ──►   docs/adr/                │
│   (product PRDs)               (human-in-the-loop)             (mandatory task ADRs)    │
│                                                                                         │
│   .agents/skills/        ──►   Specialist Agents         ──►   Self-Annealing           │
│   (31+ engineering skills)     (model-agnostic roles)          (evidence diff authoring)│
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                             ▼ Generated Runtime Projections
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│  Anthropic   │    OpenAI    │    GitHub    │    Google    │    Cursor    │ Gemini CLI / │
│ Claude Code  │    Codex     │   Copilot    │ Antigravity  │    Rules     │ OpenCode/Kiro│
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

---

<a id="quick-start"></a>

## 🚀 Quick Start

### 1. Initialize a repository

Run the CLI in any existing repository or a clean project directory:

```bash
npx agentic-repo-kit init
```

*Or install globally:*

```bash
npm install --global agentic-repo-kit
agentic-repo init
```

The assisted initializer detects installed AI runtime tools and existing repository markers, presents a plan, and requests confirmation before writing files.

### 2. Common CLI flags

The examples use the short `agentic-repo` alias, which requires the global install above; otherwise run them as `npx agentic-repo-kit <command>`.

```bash
# Preview changes without modifying files
agentic-repo init --dry-run

# Explicitly choose target runtime adapters
agentic-repo init --runtime claude-code,github-copilot,cursor

# Install in enterprise/client repositories without polluting Git (.git/info/exclude)
agentic-repo init --git-exclude

# Enforce governance deterministically (opt-in): shared CI gate or transparent local hook
agentic-repo init --enforce ci
agentic-repo init --enforce hooks

# Install only the universal kernel without runtime-specific files
agentic-repo init --runtime none

# Install only the governance kernel skills (default profile: full, all 31 skills)
agentic-repo init --profile core

# Run non-interactively in CI or automated scripts
agentic-repo init --yes --cwd /path/to/project
```

### 3. Update an existing repository

Upgrade kernel skills, workflows, operating contracts, and runtime adapters to the latest release without overwriting your customized project documentation (`docs/wiki/`, `docs/adr/`, `docs/product/`, `docs/raw/`):

```bash
npx agentic-repo-kit update
```

`update` also refreshes the kit version pinned in generated instructions, hooks, and CI. It never enables the low-risk tier on its own; opt in with `npx agentic-repo-kit update --enable-low-risk` (see [Enforce governance](#enforce-governance)).

> **Zero Knowledge Loss:** `update` exclusively refreshes the operating kernel (`.agents/skills/`, `.agents/workflows/`, `AGENTS.md`, adapters) and preserves all your project wiki pages and decisions. If you use `--git-exclude`, your local Git exclusions are refreshed automatically.

> **Your edits are never overwritten silently:** `update` compares every kernel file with the hash recorded in `scaffold.lock`. Files you modified (for example project rules added to `AGENTS.md`) are reported as conflicts and nothing is written; move your changes into project files or re-run with `--force`. Files the kit no longer generates (a dropped runtime, a changed enforcement mode, a retired agent) are removed when unmodified and kept when you changed them. `update` requires an initialized repository (`scaffold.lock`); use `init` first.

> **Safe by design:** During `init`, existing files with identical content are safely skipped. If any file has divergent content, `init` stops before writing anything and reports the conflicts. Use `update` to upgrade the kernel while preserving user knowledge.

> **Enterprise / Local-first ready:** Use `--git-exclude` (or `agentic-repo exclude`) to automatically manage `.git/info/exclude`. This lets you use AI agents on strict client repositories without modifying `.gitignore` or pushing files upstream. The root-anchored patterns are derived from the files listed in `scaffold.lock`, so every generated adapter file stays hidden.

<a id="enforce-governance"></a>

### 4. Enforce governance (optional)

By default the kit ships governance as advisory convention. Opt in to deterministic enforcement with a single axis (`--enforce ci|hooks|none`, default `none`):

```bash
# Shared, visible gate: adds .github/workflows/governance.yml running `verify` on every push and PR
agentic-repo init --enforce ci

# Transparent, machine-local gate: installs a pre-push hook via core.hooksPath (no shared config)
agentic-repo init --enforce hooks
```

Both projections contain **no policy of their own**. They compute the changed files, per-file changed line counts, and the `ADR-NNNN` references in the pushed commit messages (and PR title/body), then delegate the decision to the canonical `agentic-repo verify` command. They run the verifier pinned to the kit version that generated them (`npx agentic-repo-kit@<version>`), never an unreviewed latest release; `update` refreshes the pin. A new branch is checked against its merge-base with the remote default branch. The selected mode is recorded in `scaffold.yaml` / `scaffold.lock`, so `update` maintains it. Combine `--enforce hooks` with `--git-exclude` for enforcement that stays invisible to a restricted client's tracked repository.

Follow-up work inside an already `Accepted` ADR's scope does not need a new ADR: mention it in the commit message (`feat: retry webhook delivery (ADR-0007)`). Files generated by the kit itself never trip the ADR gate.

#### Low-risk tier (fast lane)

Small, low-risk tasks need no approval stop. In the human-owned `docs/adr/gate.json`, a `lowRisk` section defines the **low-risk tier**:

- **Thresholds:** by default at most 5 changed source files and 200 changed lines (documentation excluded), with tests whenever code changes.
- **Exclusions:** path globs for security, dependencies, public APIs, migrations, and governance files.

A task inside the tier gets an ADR that the tier accepts (`adr new --tier low-risk`) with a pending review, and the agent implements it without stopping. A human reviews each one afterwards: the agent records an explicit approval that names the task with `adr review`, and a rejected review reverts the change.

> **What actually blocks an unreviewed merge:** with `--enforce ci`, the governance workflow runs `verify --require-reviews` for the default branch. Make that check required in branch protection, so that no tier ADR merges without its review; direct pushes are reported, not blocked. Without CI enforcement the review stays an agent convention, like the rest of the advisory mode, and the pre-push hook never waits for reviews.

New repositories get the default policy. Existing repositories keep their `gate.json` untouched, and `update` reports the tier as disabled until you opt in explicitly. Preview the change with `--dry-run`, then run `npx agentic-repo-kit update --enable-low-risk`. The command adds the default `lowRisk` section, keeps your other keys, and never overwrites an existing section, so you can script it across many repositories.

#### Routine tier and exempt paths

Trivial work does not need an ADR either. The same file lists `exempt` globs that never need one and `routine` globs (lockfiles by default) eligible for the **routine tier**: add an `ADR: routine` line to the commit message and record the change in `docs/wiki/log.md`.

---

<a id="core-pillars"></a>

## 🧱 Core Pillars

### 1. 🧠 Living Git-Versioned Knowledge Base
Inspired by Andrej Karpathy's LLM Wiki pattern. Store immutable source documents in `docs/raw/`, and let your AI agent compile, index, and structure them into `docs/wiki/`. Every page carries typed YAML frontmatter (`type`, `title`, `created`, `updated`, and `sources` on fact-bearing pages) for machine-parseable provenance, backed by an optional `sources/`, `entities/`, and `concepts/` taxonomy. Includes automated contradiction tracking and deterministic linting of links, frontmatter, provenance, orphan pages, and log format.

### 2. 🛡️ Mandatory Human-Gated Decisions
Every material development task starts with an Architectural Decision Record (`docs/adr/`) generated in `Proposed` status using GitHub's official ADR skill. Implementation stays blocked until a human explicitly approves the architecture. The one exception is the low-risk tier: tasks within the human-defined thresholds proceed at once, and a human reviews their ADRs afterwards; with `--enforce ci`, CI holds the merge until the review is recorded. Material product uncertainty triggers PRD discovery (`docs/product/`).

### 3. ⚡ Single Kernel, Multi-Runtime Projections
Maintain a single source of truth in `AGENTS.md` and `.agents/`. The CLI automatically generates native wrappers and steering rules for your active environments—whether you use Claude Code, Codex, Copilot, Antigravity, or Cursor.

### 4. 🔄 Governed Agent Self-Annealing
A safe, two-stage retrospective workflow: the **Run Evidence Analyst** diagnoses execution failures, and the **Directive Diff Author** proposes minimal rule adjustments in `PENDING` state. Agents can never approve or silently apply their own directive changes.

### 5. 🧰 31 Built-In Engineering Skills
Bundles the complete Addy Osmani engineering lifecycle skill pack (TDD, refactoring, security hardening, API design, performance optimization) together with GitHub's official ADR/PRD skills and repository management commands. Prefer a leaner start? `--profile core` installs only the six governance kernel skills.

### 6. ⏱️ Fast, Predictable Agent Runs
Agent time goes to model turns and human round trips, not to the CLI, whose commands finish in well under a second. The kit cuts both:

- Each session starts with `status`, a read-only digest (about 0.4 KB for a fresh repository) of kernel and knowledge health, ADR and PRD states, pending reviews, and the latest log entries, instead of rereading the decision history.
- Lifecycle skills load only when their trigger matches the task.
- Instructions invoke the CLI pinned to the kit version that generated the repository, so a stale global install never answers.
- Lint ignores examples in fenced code, so no false findings send agents into repair loops.
- Small, low-risk tasks skip the approval stop through the reviewed low-risk tier.

---

<a id="runtime-support"></a>

## 🔌 Runtime Support Matrix

| Adapter ID | AI Runtime | Generated Target Configuration | Status |
| :--- | :--- | :--- | :--- |
| `codex` | **OpenAI Codex** | Native agent wrappers + canonical `AGENTS.md` & skills | ✅ Supported |
| `claude-code` | **Anthropic Claude Code** | `CLAUDE.md` + native subagent wrappers | ✅ Supported |
| `github-copilot` | **GitHub Copilot** | `.github/copilot-instructions.md` + custom agent wrappers | ✅ Supported |
| `antigravity` | **Google Antigravity** | `GEMINI.md` + canonical `.agents/` definitions | ✅ Supported |
| `gemini-cli` | **Google Gemini CLI** | `GEMINI.md` + native agent wrappers | ✅ Supported |
| `cursor` | **Cursor IDE** | `.cursor/rules/agentic-kernel.mdc` pointing to canonical kernel | ✅ Supported |
| `opencode` | **OpenCode** | Project config + native subagent wrappers | ✅ Supported |
| `kiro` | **Kiro** | Steering configuration pointing to canonical kernel | ✅ Supported |

*Aliases available:* `claude`, `copilot`, `gemini`.

---

<a id="chatbot-workflows"></a>

## 💬 Conversational Agent Workflows

Knowledge synthesis, product discovery, architectural reasoning, and run analysis happen directly inside your coding chatbot session:

<details>
<summary><b>📥 1. Ingest Project Knowledge</b></summary>

Place raw documentation, notes, or transcripts in `docs/raw/`, then ask your agent:

```text
Use the knowledge-curator to ingest docs/raw/system-architecture.md.
Update every affected wiki page, index.md, and log.md; surface contradictions and open questions.
```
</details>

<details>
<summary><b>🔍 2. Query Project Memory</b></summary>

Ask your agent to synthesize information from the living wiki:

```text
Using the project wiki and cited raw sources, explain the current authentication flow.
If the synthesis is durable and new, record it in the wiki and update index.md and log.md.
```
</details>

<details>
<summary><b>🚦 3. Start a Governed Development Task</b></summary>

Enforce architectural decisions before writing application code:

```text
Start the task "Add Stripe Webhook Handling" using the governed task lifecycle.
Create the mandatory task ADR with the official skill and wait for my approval before implementation.
Create a PRD first if important product decisions are still unresolved.
```
</details>

<details>
<summary><b>🚀 4. Ship a Small Task Through the Low-Risk Tier</b></summary>

Let small, low-risk work proceed without an approval stop, then review it:

```text
Fix the date padding bug in src/date.js.
If the task qualifies for the low-risk tier, use it and ask me to review the ADR afterwards;
otherwise create the task ADR and wait for my approval.
```

When you are ready to review, name the task explicitly. The agent records your words with `adr review`, and a vague reply such as "ok" leaves the review pending:

```text
Approve ADR-0008 "Fix date formatting".
```
</details>

<details>
<summary><b>🔬 5. Review Run & Self-Anneal</b></summary>

Safely optimize agent instructions after completing complex tasks:

```text
The task is complete and validated. Run the governed self-annealing review using observable evidence.
If this is an Agent Method problem, hand the diagnosis to directive-diff-author and create a PENDING proposal.
Do not modify the directive directly.
```
</details>

---

<a id="cli-commands"></a>

## 🛠️ Deterministic CLI Commands

The CLI provides fast, reproducible commands for repository health, upgrades, and artifact creation. Without a global install, run each command as `npx agentic-repo-kit <command>`. Generated repositories pin the kit version that produced them (`npx --yes agentic-repo-kit@<version> <command>`), the same pin as the hooks and CI, so agents never hit "command not found" or run a stale global install; `update` refreshes the pin:

```bash
# Initialize a new repository
agentic-repo init

# Upgrade kernel skills and rules without touching user documentation
agentic-repo update
agentic-repo update --force          # also overwrite kernel files you modified
agentic-repo update --enable-low-risk # opt in: add the default low-risk tier policy to docs/adr/gate.json

# Verify repository integrity and detect drifted managed files
agentic-repo doctor

# Read-only session digest for agents: kernel and knowledge health, every ADR and
# PRD with its status (open first), pending annealing proposals, ADR number
# collisions, and the latest log entries
agentic-repo status
agentic-repo status --json --limit 10

# Verify governance compliance (every knowledge lint check + ADR status and
# number integrity + optional ADR gate)
agentic-repo verify
agentic-repo verify --changed "src/app.ts,docs/adr/adr-0007-event-bus.md"
agentic-repo verify --changed "src/app.ts" --adr ADR-0007
agentic-repo verify --changed "yarn.lock,docs/wiki/log.md" --routine
agentic-repo verify --json

# Check wiki health: typed frontmatter, broken links, unindexed pages, uncited
# facts, orphan pages, uncovered raw sources, and malformed log entries
# (links and markers inside fenced code blocks are ignored)
agentic-repo knowledge lint
agentic-repo knowledge lint --json

# Manage local .git/info/exclude (add, list, or remove)
agentic-repo exclude
agentic-repo exclude --list
agentic-repo exclude --remove

# Create a new Architectural Decision Record (starts as Proposed)
agentic-repo adr new --title "Event bus boundary"

# Low-risk tier: accepted by docs/adr/gate.json with a pending review, then reviewed by a human
agentic-repo adr new --title "Fix date formatting" --tier low-risk
agentic-repo adr review --adr ADR-0008 --decision approved --by "Ada" --quote "Approve ADR-0008"
agentic-repo verify --changed "src/date.js,test/date.test.js" --lines "9:src/date.js,6:test/date.test.js" --require-reviews

# Create a new Product Requirements Document (starts as Draft)
agentic-repo prd new --title "Team invitations"

# Create a new self-annealing directive proposal (starts as PENDING)
agentic-repo anneal new --title "Verify lock before build" --target AGENTS.md
```

---

## 📂 Generated Repository Layout

```text
├── AGENTS.md                    # Canonical operating contract
├── .agents/
│   ├── agents/                  # Runtime-neutral specialist roles
│   ├── skills/                  # First-party & pinned upstream skills
│   ├── rules/                   # Decision, knowledge, security policies
│   ├── workflows/               # Task, ingestion, lint, annealing flows
│   ├── prompts/                 # Diagnosis and diff proposal prompts
│   ├── annealing/               # Evidence summaries & PENDING proposals
│   ├── references/              # Engineering lifecycle checklists
│   ├── hooks/pre-push           # Local governance gate (with --enforce hooks)
│   └── sources.lock.json        # Upstream provenance and revisions
├── docs/
│   ├── raw/                     # Immutable safe source material
│   ├── wiki/                    # Living compiled knowledge base
│   ├── adr/                     # Task decision records
│   │   └── gate.json            # Human-owned ADR gate policy: exempt, routine, lowRisk
│   ├── product/                 # PRDs and product decisions
│   ├── specs/                   # Behavioral specifications
│   └── templates/               # ADR, PRD, wiki page, and annealing proposal templates
├── .github/workflows/governance.yml  # CI governance gate (with --enforce ci)
├── scaffold.yaml                # Selected runtime configuration
└── scaffold.lock                # Managed paths and SHA-256 integrity hashes
```

---

## 🔒 Governance & Security Guarantees

- **Safe Raw Data**: Versioned knowledge never contains API keys, credentials, `.env` files, personal data, or confidential production dumps.
- **Data vs Instructions**: External sources are treated as passive reference data, never executable instructions.
- **Gate Enforcement**: Every new development task generates an ADR in `Proposed` status and blocks implementation until explicit human approval. Tasks in the low-risk tier are the only exception: they proceed at once, and their ADRs need a recorded human review. With `--enforce ci` and a required check in branch protection, CI holds the merge until that review exists.
- **Deterministic Verification**: `agentic-repo verify` checks every `knowledge lint` category, ADR status integrity, and unique ADR numbers. Given a change set, it also checks that tracked source changes carry or reference an `Accepted` ADR, that low-risk tier changes stay eligible, and, with `--require-reviews`, that their reviews are recorded. Opt-in CI and pre-push projections turn this convention into an enforced gate.
- **Tamper Protection**: Agent directives cannot silently modify themselves.
- **Adapter Subordination**: Generated runtime adapters are strict projections and never become independent sources of policy.
- **Idempotency & Integrity**: Neither `init` nor `update` silently overwrites divergent or user-modified files or partially applies conflicting plans.

---

## 🧪 Development & Verification

```bash
# Clone the repository
git clone https://github.com/gfiore88/agentic-repo-kit.git
cd agentic-repo-kit

# Run full test suite & linters
npm test
npm run validate:skills
npm run validate:plugin

# Verify packaging
npm pack --dry-run
```

---

## 🌟 Origins & Acknowledgments

Agentic Repository Kit builds upon proven foundations from the AI engineering community:

- **Andrej Karpathy** — [LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
- **Giovanni Fiore** — [Governed Agent Self-Annealing pattern](https://gist.github.com/gfiore88/c0dff64209c0e8d94a0654dd1b74399e)
- **Addy Osmani** — [agent-skills engineering lifecycle pack](https://github.com/addyosmani/agent-skills)
- **GitHub** — [awesome-copilot official ADR & PRD skills](https://github.com/github/awesome-copilot)

---

## 📄 License

Original project code and documentation are licensed under the [MIT License](LICENSE). Third-party skills and patterns remain covered by their respective upstream licenses. See the [release guide](docs/releasing.md) for publishing procedures.
