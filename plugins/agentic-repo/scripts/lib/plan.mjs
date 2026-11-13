import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { CORE_SKILLS, isUserOwnedPath } from "./catalog.mjs";

export function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function collectFiles(root, current = root) {
  let entries;
  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT" && current === root) return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(root, absolute));
    else if (entry.isFile()) {
      files.push({
        path: path.relative(root, absolute).split(path.sep).join("/"),
        content: await readFile(absolute, "utf8"),
      });
    }
  }
  return files;
}

function mergeFile(target, file, source) {
  const existing = target.get(file.path);
  if (existing && existing.content !== file.content) {
    throw new Error(`Blueprint collision for ${file.path}: ${existing.source} and ${source}`);
  }
  target.set(file.path, { ...file, source });
}

function agentMetadata(file) {
  const frontMatter = file.content.match(/^---\n([\s\S]*?)\n---/);
  const field = (name) => frontMatter?.[1].match(new RegExp(`^${name}:\\s*(.+)$`, "m"))?.[1].trim();
  const fallback = path.basename(file.path, ".md");
  return {
    id: (field("name") ?? fallback).replace(/^['"]|['"]$/g, ""),
    description: (field("description") ?? `Specialist agent defined in ${file.path}`).replace(/^['"]|['"]$/g, ""),
    sourcePath: `.agents/agents/${file.path}`,
  };
}

function quote(value) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function runtimeAgentFile(runtime, agent) {
  const common = `Read AGENTS.md, .agents/registry.md, and ${agent.sourcePath}. Follow the canonical role and repository governance. Runtime adapters never override human approval gates.`;
  if (runtime === "codex") {
    return {
      path: `.codex/agents/${agent.id}.toml`,
      content: `name = "${agent.id.replaceAll("-", "_")}"\ndescription = "${quote(agent.description)}"\ndeveloper_instructions = "${quote(common)}"\n`,
    };
  }
  if (runtime === "claude-code") {
    return {
      path: `.claude/agents/${agent.id}.md`,
      content: `---\nname: ${agent.id}\ndescription: ${JSON.stringify(agent.description)}\nmodel: inherit\n---\n\n${common}\n`,
    };
  }
  if (runtime === "github-copilot") {
    return {
      path: `.github/agents/${agent.id}.agent.md`,
      content: `---\nname: ${agent.id}\ndescription: ${JSON.stringify(agent.description)}\n---\n\n${common}\n`,
    };
  }
  if (runtime === "gemini-cli") {
    return {
      path: `.gemini/agents/${agent.id}.md`,
      content: `---\nname: ${agent.id}\ndescription: ${JSON.stringify(agent.description)}\nkind: local\nmodel: inherit\n---\n\n${common}\n`,
    };
  }
  if (runtime === "opencode") {
    return {
      path: `.opencode/agents/${agent.id}.md`,
      content: `---\ndescription: ${JSON.stringify(agent.description)}\nmode: subagent\n---\n\n${common}\n`,
    };
  }
  return null;
}

function scaffoldYaml(runtimes, enforce, profile) {
  const header = `version: 1\nenforcement: ${enforce}\nprofile: ${profile}\n`;
  if (runtimes.length === 0) {
    return `${header}compatibility:\n  detection: assisted\n  runtimes: []\n`;
  }
  const runtimeLines = runtimes.map((runtime) => `    - ${runtime}`).join("\n");
  return `${header}compatibility:\n  detection: assisted\n  runtimes:\n${runtimeLines}\n`;
}

// The verifier is pinned to the kit version that generated the projection, so a
// push never executes an unreviewed latest release. `update` refreshes the pin.
function verifierSpec(kitVersion) {
  return kitVersion ? `agentic-repo-kit@${kitVersion}` : "agentic-repo-kit";
}

// Projected instructions run the kit version that generated them, like the hooks
// and CI, so a stale global install or an unreviewed latest release never answers
// (ADR-0017). `--yes` keeps npx from prompting in a TTY. Sources stay version-free.
function pinInvocations(content, kitVersion) {
  return content.replace(/npx (?:--yes )?agentic-repo-kit(?![@\w-])/g, `npx --yes ${verifierSpec(kitVersion)}`);
}

// Opt-in local pre-push projection. Contains no policy: it computes the changed
// files and referenced ADRs and delegates the decision to `agentic-repo verify`.
function prePushHook(kitVersion) {
  return `#!/bin/sh
# Managed by agentic-repo-kit (enforce=hooks): transparent, machine-local gate.
remote="\${1:-origin}"
verifier="${verifierSpec(kitVersion)}"
zero="0000000000000000000000000000000000000000"
fail=0
while read -r local_ref local_sha remote_ref remote_sha; do
  [ "$local_sha" = "$zero" ] && continue
  base=""
  if [ "$remote_sha" != "$zero" ] && git cat-file -e "$remote_sha^{commit}" 2>/dev/null; then
    base="$remote_sha"
  else
    base="$(git merge-base "$local_sha" "refs/remotes/$remote/HEAD" 2>/dev/null || true)"
  fi
  if [ -z "$base" ]; then
    echo "agentic-repo: cannot determine a base for $local_ref; ADR gate skipped (knowledge and ADR status checks still run)." >&2
    npx --yes "$verifier" verify < /dev/null || fail=1
    continue
  fi
  changed="$(git diff --name-only --no-renames "$base" "$local_sha" | paste -sd, -)"
  [ -z "$changed" ] && continue
  lines="$(git diff --numstat --no-renames "$base" "$local_sha" | awk -F '\\t' '{ n = ($1 == "-") ? 1 : $1 + $2; printf "%s%d:%s", (NR > 1 ? "," : ""), n, $3 }')"
  messages="$(git log --format=%B "$base..$local_sha")"
  adrs="$(printf '%s\\n' "$messages" | grep -oE 'ADR-[0-9]{4}' | sort -u | paste -sd, -)"
  routine=""
  printf '%s\\n' "$messages" | grep -qiE '^ADR:[[:space:]]*routine[[:space:]]*$' && routine="--routine"
  npx --yes "$verifier" verify --changed "$changed" --lines "$lines" \${adrs:+--adr "$adrs"} $routine < /dev/null || fail=1
done
exit $fail
`;
}

// Opt-in CI projection. Contains no policy: it computes the changed files and
// referenced ADRs and delegates the decision to `agentic-repo verify`.
function ciEnforcementWorkflow(kitVersion) {
  return `name: Governance

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v5
        with:
          node-version: 24
      - name: Verify governance
        env:
          VERIFIER: ${verifierSpec(kitVersion)}
          EVENT_NAME: \${{ github.event_name }}
          PR_BASE: \${{ github.event.pull_request.base.sha }}
          PUSH_BEFORE: \${{ github.event.before }}
          DEFAULT_BRANCH: \${{ github.event.repository.default_branch }}
          BASE_REF: \${{ github.base_ref }}
          REF_NAME: \${{ github.ref_name }}
          PR_TITLE: \${{ github.event.pull_request.title }}
          PR_BODY: \${{ github.event.pull_request.body }}
        run: |
          if [ "$EVENT_NAME" = "pull_request" ]; then BASE="$PR_BASE"; else BASE="$PUSH_BEFORE"; fi
          if ! git rev-parse --verify --quiet "$BASE^{commit}" >/dev/null; then
            BASE="$(git merge-base HEAD "origin/$DEFAULT_BRANCH" 2>/dev/null || true)"
          fi
          if [ -z "$BASE" ]; then
            echo "::warning::Cannot determine a base commit; ADR gate skipped."
            npx --yes "$VERIFIER" verify
            exit $?
          fi
          CHANGED="$(git diff --name-only --no-renames "$BASE" HEAD | paste -sd, -)"
          if [ -z "$CHANGED" ]; then
            npx --yes "$VERIFIER" verify
            exit $?
          fi
          TEXT="$(git log --format=%B "$BASE..HEAD"; printf '%s\\n%s\\n' "$PR_TITLE" "$PR_BODY")"
          ADRS="$(printf '%s\\n' "$TEXT" | grep -oE 'ADR-[0-9]{4}' | sort -u | paste -sd, - || true)"
          LINES="$(git diff --numstat --no-renames "$BASE" HEAD | awk -F '\\t' '{ n = ($1 == "-") ? 1 : $1 + $2; printf "%s%d:%s", (NR > 1 ? "," : ""), n, $3 }')"
          set -- verify --changed "$CHANGED" --lines "$LINES"
          if [ -n "$ADRS" ]; then set -- "$@" --adr "$ADRS"; fi
          if printf '%s\\n' "$TEXT" | grep -qiE '^ADR:[[:space:]]*routine[[:space:]]*$'; then set -- "$@" --routine; fi
          # Merges into the default branch need an approved review for low-risk ADRs.
          TARGET="$REF_NAME"
          if [ "$EVENT_NAME" = "pull_request" ]; then TARGET="$BASE_REF"; fi
          if [ "$TARGET" = "$DEFAULT_BRANCH" ]; then set -- "$@" --require-reviews; fi
          npx --yes "$VERIFIER" "$@"
`;
}

async function readKitVersion(assetsRoot) {
  try {
    const manifest = JSON.parse(await readFile(path.resolve(assetsRoot, "../../../package.json"), "utf8"));
    return manifest.name === "agentic-repo-kit" && typeof manifest.version === "string" ? manifest.version : null;
  } catch {
    return null;
  }
}

export async function buildPlan({ assetsRoot, skillsRoot, runtimes, enforce = "none", profile = "full", kitVersion }) {
  const version = kitVersion === undefined ? await readKitVersion(assetsRoot) : kitVersion;
  const files = new Map();
  const baseRoot = path.join(assetsRoot, "blueprints", "base");
  const baseFiles = (await collectFiles(baseRoot))
    .filter((file) => profile !== "core" || !file.path.startsWith(".agents/commands/addys/"));
  for (const file of baseFiles) mergeFile(files, file, "base");
  const agents = baseFiles
    .filter((file) => file.path.startsWith(".agents/agents/") && file.path.endsWith(".md"))
    .map((file) => agentMetadata({ ...file, path: file.path.slice(".agents/agents/".length) }));

  for (const file of await collectFiles(skillsRoot)) {
    if (profile === "core" && !CORE_SKILLS.includes(file.path.split("/")[0])) continue;
    mergeFile(files, { ...file, path: `.agents/skills/${file.path}` }, "kernel-skill");
  }

  for (const runtime of runtimes) {
    const adapterRoot = path.join(assetsRoot, "adapters", runtime);
    for (const file of await collectFiles(adapterRoot)) mergeFile(files, file, runtime);
    for (const agent of agents) {
      const generated = runtimeAgentFile(runtime, agent);
      if (generated) mergeFile(files, generated, `${runtime}:generated-agent`);
    }
  }

  mergeFile(files, { path: "scaffold.yaml", content: scaffoldYaml(runtimes, enforce, profile) }, "generated");

  if (enforce === "ci") {
    mergeFile(files, { path: ".github/workflows/governance.yml", content: ciEnforcementWorkflow(version) }, "ci-enforcement");
  }
  if (enforce === "hooks") {
    mergeFile(files, { path: ".agents/hooks/pre-push", content: prePushHook(version) }, "hooks-enforcement");
  }

  // `update` refreshes kernel-owned files, so only they may carry a pinned version.
  for (const [filePath, file] of files) {
    if (isUserOwnedPath(filePath) || filePath.startsWith(".agents/upstream/")) continue;
    const pinned = pinInvocations(file.content, version);
    if (pinned !== file.content) files.set(filePath, { ...file, content: pinned });
  }

  const managed = [...files.values()]
    .sort((left, right) => left.path.localeCompare(right.path))
    .map((file) => ({ path: file.path, sha256: sha256(file.content), source: file.source }));
  const lockContent = `${JSON.stringify({ schemaVersion: 1, kitVersion: version, runtimes, enforcement: enforce, profile, managedFiles: managed }, null, 2)}\n`;
  mergeFile(files, { path: "scaffold.lock", content: lockContent }, "generated");

  return {
    runtimes: [...runtimes],
    profile,
    enforce,
    files: [...files.values()].sort((left, right) => left.path.localeCompare(right.path)),
  };
}
