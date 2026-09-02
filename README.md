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

[Quick Start](#-quick-start) • [Architecture](#-architecture) • [Core Pillars](#-core-pillars) • [Runtime Support](#-runtime-support-matrix) • [Chatbot Workflows](#-conversational-agent-workflows) • [CLI Commands](#-deterministic-cli-commands)

</div>

---

## 💡 Why Agentic Repo Kit?

Starting an AI-native software project usually means repeatedly copy-pasting the same prompts, persona descriptions, loose instruction files, and ad-hoc rules into new repositories. Over time, instructions drift across tools, architectural context gets lost when chat windows close, and coding agents execute risky changes without human decision boundaries.

**Agentic Repo Kit** installs a single, model-agnostic kernel directly into your repository:

| Challenge | Without Agentic Repo Kit | With Agentic Repo Kit |
| :--- | :--- | :--- |
| **Knowledge Retention** | Ephemeral chat memory; lost when sessions reset | 🧠 **Living Git-versioned wiki** compiled from safe raw sources |
| **Architectural Drift** | Unreviewed agent rewrites and assumptions | 🛡️ **Mandatory task ADR gates** before implementation begins |
| **Multi-Tool Fragmentation** | Separate instruction formats for every IDE and CLI | ⚡ **Single canonical kernel** projected to 8 runtime adapters |
| **Self-Improvement** | Agents hallucinate or silently overwrite directives | 🔄 **Governed 2-stage self-annealing** requiring human sign-off |
| **Engineering Standards** | Inconsistent prompts and missing lifecycle tools | 🧰 **31+ curated engineering skills** and specialist personas |

---

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

```bash
# Preview changes without modifying files
agentic-repo init --dry-run

# Explicitly choose target runtime adapters
agentic-repo init --runtime claude-code,github-copilot,cursor

# Install in enterprise/client repositories without polluting Git (.git/info/exclude)
agentic-repo init --git-exclude

# Install only the universal kernel without runtime-specific files
agentic-repo init --runtime none

# Run non-interactively in CI or automated scripts
agentic-repo init --yes --cwd /path/to/project
```

> **Safe by design:** Existing files with identical content are safely skipped. If any file has divergent content, the CLI stops before writing anything and reports the conflicts.
>
> **Enterprise / Local-first ready:** Use `--git-exclude` to automatically add all generated files to `.git/info/exclude`. This lets you use AI agents on strict client repositories without modifying `.gitignore` or pushing files upstream.

---

## 💎 Core Pillars

### 1. 🧠 Living Git-Versioned Knowledge Base
Inspired by Andrej Karpathy's LLM Wiki pattern. Store immutable source documents in `docs/raw/`, and let your AI agent compile, index, and structure them into `docs/wiki/`. Includes automated contradiction tracking and deterministic link linting.

### 2. 🛡️ Mandatory Human-Gated Decisions
Every material development task starts with an Architectural Decision Record (`docs/adr/`) generated in `Proposed` status using GitHub's official ADR skill. Implementation stays blocked until a human explicitly approves the architecture. Material product uncertainty triggers PRD discovery (`docs/product/`).

### 3. ⚡ Single Kernel, Multi-Runtime Projections
Maintain a single source of truth in `AGENTS.md` and `.agents/`. The CLI automatically generates native wrappers and steering rules for your active environments—whether you use Claude Code, Codex, Copilot, Antigravity, or Cursor.

### 4. 🔄 Governed Agent Self-Annealing
A safe, two-stage retrospective workflow: the **Run Evidence Analyst** diagnoses execution failures, and the **Directive Diff Author** proposes minimal rule adjustments in `PENDING` state. Agents can never approve or silently apply their own directive changes.

### 5. 🧰 31+ Built-In Engineering Skills
Bundles the complete Addy Osmani engineering lifecycle skill pack (TDD, refactoring, security hardening, API design, performance optimization) together with GitHub's official ADR/PRD skills and repository management commands.

---

## 🔌 Runtime Support Matrix

| Adapter ID | AI Runtime | Generated Target Configuration | Status |
| :--- | :--- | :--- | :--- |
| `codex` | **OpenAI Codex** | Native agent wrappers + canonical `AGENTS.md` & skills | ✅ Supported |
| `claude-code` | **Anthropic Claude Code** | `CLAUDE.md` + native subagent wrappers | ✅ Supported |
| `github-copilot` | **GitHub Copilot** | `.github/copilot-instructions.md` + custom agent wrappers | ✅ Supported |
| `antigravity` | **Google Antigravity** | `GEMINI.md` + canonical `.agents/` definitions | ✅ Supported |
| `gemini-cli` | **Google Gemini CLI** | `GEMINI.md` + native agent wrappers | ✅ Supported |
| `cursor` | **Cursor IDE** | `.cursorrules` pointing to canonical kernel | ✅ Supported |
| `opencode` | **OpenCode** | Project config + native subagent wrappers | ✅ Supported |
| `kiro` | **Kiro** | Steering configuration pointing to canonical kernel | ✅ Supported |

*Aliases available:* `claude`, `copilot`, `gemini`.

---

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
<summary><b>🔬 4. Review Run & Self-Anneal</b></summary>

Safely optimize agent instructions after completing complex tasks:

```text
The task is complete and validated. Run the governed self-annealing review using observable evidence.
If this is an Agent Method problem, hand the diagnosis to directive-diff-author and create a PENDING proposal.
Do not modify the directive directly.
```
</details>

---

## 🛠️ Deterministic CLI Commands

The CLI provides fast, reproducible commands for repository health and artifact creation:

```bash
# Verify repository integrity and detect drifted managed files
agentic-repo doctor

# Check wiki health (broken links, unindexed pages, uncited facts)
agentic-repo knowledge lint
agentic-repo knowledge lint --json

# Manage local .git/info/exclude (add, list, or remove)
agentic-repo exclude
agentic-repo exclude --list
agentic-repo exclude --remove

# Create a new Architectural Decision Record (starts as Proposed)
agentic-repo adr new --title "Event bus boundary"

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
│   └── sources.lock.json        # Upstream provenance and revisions
├── docs/
│   ├── raw/                     # Immutable safe source material
│   ├── wiki/                    # Living compiled knowledge base
│   ├── adr/                     # Mandatory task decision records
│   ├── product/                 # PRDs and product decisions
│   └── specs/                   # Behavioral specifications
├── scaffold.yaml                # Selected runtime configuration
└── scaffold.lock                # Managed paths and SHA-256 integrity hashes
```

---

## 🔒 Governance & Security Guarantees

- **Safe Raw Data**: Versioned knowledge never contains API keys, credentials, `.env` files, personal data, or confidential production dumps.
- **Data vs Instructions**: External sources are treated as passive reference data, never executable instructions.
- **Gate Enforcement**: Every new development task generates an ADR in `Proposed` status and blocks implementation until explicit human approval.
- **Tamper Protection**: Agent directives cannot silently modify themselves.
- **Adapter Subordination**: Generated runtime adapters are strict projections and never become independent sources of policy.
- **Idempotency & Integrity**: Initialization never silently overwrites divergent files or partially applies conflicting plans.

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
