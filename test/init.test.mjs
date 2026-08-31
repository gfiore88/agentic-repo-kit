import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPlan } from "../plugins/agentic-repo/scripts/lib/plan.mjs";
import { applyPlan, inspectPlan } from "../plugins/agentic-repo/scripts/lib/writer.mjs";
import { runDoctor } from "../plugins/agentic-repo/scripts/lib/doctor.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(here, "../plugins/agentic-repo");
const assetsRoot = path.join(pluginRoot, "assets");
const skillsRoot = path.join(pluginRoot, "skills");

async function tempRepository() {
  return mkdtemp(path.join(os.tmpdir(), "agentic-repo-test-"));
}

test("kernel-only plan excludes runtime-specific directories", async () => {
  const plan = await buildPlan({ assetsRoot, skillsRoot, runtimes: [] });
  const paths = plan.files.map((file) => file.path);
  assert.ok(paths.includes("AGENTS.md"));
  assert.ok(paths.includes(".agents/skills/govern-development-task/SKILL.md"));
  assert.ok(!paths.some((entry) => entry.startsWith(".codex/")));
  assert.ok(!paths.includes("CLAUDE.md"));
});

test("selected adapters are generated and shared files deduplicate", async () => {
  const plan = await buildPlan({
    assetsRoot,
    skillsRoot,
    runtimes: ["codex", "antigravity", "gemini-cli"],
  });
  const paths = plan.files.map((file) => file.path);
  assert.ok(paths.includes(".codex/agents/knowledge-curator.toml"));
  assert.ok(paths.includes(".codex/agents/directive-diff-author.toml"));
  assert.ok(paths.includes(".codex/agents/code-reviewer.toml"));
  assert.ok(paths.includes(".agents/agents/knowledge-curator.md"));
  assert.ok(paths.includes(".gemini/agents/knowledge-curator.md"));
  assert.equal(paths.filter((entry) => entry === "GEMINI.md").length, 1);
  assert.ok(!paths.includes("CLAUDE.md"));
});

test("generated-only adapters do not require a tracked static directory", async () => {
  const fixture = await tempRepository();
  const fixtureAssets = path.join(fixture, "assets");
  const fixtureSkills = path.join(fixture, "skills");
  await mkdir(path.join(fixtureAssets, "blueprints/base/.agents/agents"), { recursive: true });
  await mkdir(fixtureSkills, { recursive: true });
  await writeFile(path.join(fixtureAssets, "blueprints/base/AGENTS.md"), "# Contract\n", "utf8");
  await writeFile(path.join(fixtureAssets, "blueprints/base/.agents/agents/example.md"), "---\nname: example\ndescription: Example agent.\n---\n", "utf8");
  await writeFile(path.join(fixtureSkills, "README.md"), "# Skills\n", "utf8");
  const plan = await buildPlan({ assetsRoot: fixtureAssets, skillsRoot: fixtureSkills, runtimes: ["codex"] });
  assert.ok(plan.files.some((file) => file.path === ".codex/agents/example.toml"));
});

test("kernel contains official lifecycle skills and governed workflows", async () => {
  const plan = await buildPlan({ assetsRoot, skillsRoot, runtimes: [] });
  const paths = new Set(plan.files.map((file) => file.path));
  assert.ok(paths.has(".agents/skills/create-architectural-decision-record/SKILL.md"));
  assert.ok(paths.has(".agents/skills/prd/SKILL.md"));
  assert.ok(paths.has(".agents/skills/test-driven-development/SKILL.md"));
  assert.ok(paths.has(".agents/prompts/analyze-agent-run.prompt.md"));
  assert.ok(paths.has(".agents/prompts/propose-agent-improvement.prompt.md"));
  assert.ok(paths.has(".agents/agents/run-evidence-analyst.md"));
  assert.ok(paths.has(".agents/agents/directive-diff-author.md"));
  assert.ok(paths.has(".agents/sources.lock.json"));
  const contract = plan.files.find((file) => file.path === "AGENTS.md").content;
  assert.match(contract, /For every new development task/);
  assert.match(contract, /stop before implementation until a human explicitly approves/);
});

test("initialization is idempotent and doctor detects divergence", async () => {
  const cwd = await tempRepository();
  const plan = await buildPlan({ assetsRoot, skillsRoot, runtimes: ["codex"] });

  const first = await applyPlan(cwd, plan);
  assert.equal(first.conflicts.length, 0);
  assert.ok(first.created.length > 0);

  const second = await applyPlan(cwd, plan);
  assert.equal(second.created.length, 0);
  assert.equal(second.conflicts.length, 0);
  assert.equal(second.skipped.length, plan.files.length);

  assert.equal((await runDoctor(cwd)).ok, true);
  await writeFile(path.join(cwd, "AGENTS.md"), "local divergent content\n", "utf8");
  const unhealthy = await runDoctor(cwd);
  assert.equal(unhealthy.ok, false);
  assert.deepEqual(unhealthy.divergent, ["AGENTS.md"]);
});

test("preflight conflicts prevent partial writes", async () => {
  const cwd = await tempRepository();
  await writeFile(path.join(cwd, "AGENTS.md"), "existing contract\n", "utf8");
  const plan = await buildPlan({ assetsRoot, skillsRoot, runtimes: ["claude-code"] });

  const inspection = await inspectPlan(cwd, plan);
  assert.deepEqual(inspection.conflicts, ["AGENTS.md"]);
  const result = await applyPlan(cwd, plan);
  assert.deepEqual(result.conflicts, ["AGENTS.md"]);
  await assert.rejects(readFile(path.join(cwd, "CLAUDE.md"), "utf8"), /ENOENT/);
});
