import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCli } from "../plugins/agentic-repo/scripts/lib/cli.mjs";
import { collectStatus } from "../plugins/agentic-repo/scripts/lib/status.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ALL_RUNTIMES = "codex,claude-code,github-copilot,antigravity,gemini-cli,cursor,opencode,kiro";

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), "agentic-repo-status-"));
}

async function run(argv) {
  const out = [];
  const originalOut = process.stdout.write;
  process.stdout.write = (chunk) => (out.push(String(chunk)), true);
  try {
    const code = await runCli(argv);
    return { code, out: out.join("") };
  } finally {
    process.stdout.write = originalOut;
  }
}

async function writeRecord(dir, directory, name, frontmatter, body = "") {
  await mkdir(path.join(dir, directory), { recursive: true });
  const header = frontmatter === null ? "" : `---\n${frontmatter}\n---\n\n`;
  await writeFile(path.join(dir, directory, name), `${header}${body}`, "utf8");
}

async function snapshot(root, current = root) {
  const files = {};
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const target = path.join(current, entry.name);
    if (entry.isDirectory()) Object.assign(files, await snapshot(root, target));
    else files[path.relative(root, target)] = await readFile(target, "utf8");
  }
  return files;
}

test("status reports an uninitialized directory without failing", async () => {
  const dir = await tempDir();
  const { code, out } = await run(["status", "--json", "--cwd", dir]);
  assert.equal(code, 0);
  const payload = JSON.parse(out);
  assert.deepEqual(payload.kernel, { initialized: false });
  assert.deepEqual(payload.knowledge, { initialized: false });
  for (const key of ["adrs", "prds", "pendingProposals", "adrCollisions", "log"]) assert.deepEqual(payload[key], []);
});

test("status summarizes a generated repository within its size budget", async () => {
  const dir = await tempDir();
  await run(["init", "--yes", "--cwd", dir, "--runtime", ALL_RUNTIMES]);
  await run(["adr", "new", "--title", "Event bus boundary", "--cwd", dir]);
  await run(["prd", "new", "--title", "Team invitations", "--cwd", dir]);
  await run(["anneal", "new", "--title", "Read decisions first", "--target", "AGENTS.md", "--cwd", dir]);
  const version = JSON.parse(await readFile(path.join(here, "../package.json"), "utf8")).version;

  const { code, out } = await run(["status", "--cwd", dir]);
  assert.equal(code, 0);
  assert.ok(Buffer.byteLength(out) < 2048, `status digest is ${Buffer.byteLength(out)} bytes`);
  assert.match(out, new RegExp(`^Kernel: agentic-repo-kit ${version.replaceAll(".", "\\.")}, profile full, enforcement none$`, "m"));
  assert.match(out, /^Integrity: healthy$/m);
  assert.match(out, /^Knowledge: healthy, 4 pages$/m);
  assert.match(out, /^ {2}ADR-0001 Proposed {2}Event bus boundary$/m);
  assert.match(out, /^ {2}PRD-0001 Draft {2}Team invitations$/m);
  assert.match(out, /^ {2}\.agents\/annealing\/proposals\/\d{4}-\d{2}-\d{2}-read-decisions-first\.md {2}Read decisions first$/m);
  assert.match(out, /^ADR number collisions: none$/m);
  assert.match(out, /^ {2}\[INITIALIZED\] scaffold \| Agentic repository kernel$/m);

  const json = JSON.parse((await run(["status", "--json", "--cwd", dir])).out);
  assert.equal(json.kernel.kitVersion, version);
  assert.deepEqual(json.kernel.integrity, { ok: true, missing: 0, divergent: 0 });
  assert.equal(json.kernel.runtimes.length, 8);
});

test("status lists open records first and reports ADR number collisions", async () => {
  const dir = await tempDir();
  const adr = (title, status) => `title: "${title}"\nstatus: "${status}"\ndate: "2026-11-13"`;
  await writeRecord(dir, "docs/adr", "adr-0001-old.md", adr("ADR-0001: Old choice", "Accepted"));
  await writeRecord(dir, "docs/adr", "adr-0002-open.md", adr("ADR-0002: Open choice", "Proposed"));
  await writeRecord(dir, "docs/adr", "adr-0003-left.md", adr("ADR-0003: Left branch", "Superseded"));
  await writeRecord(dir, "docs/adr", "adr-0003-right.md", adr("ADR-0003: Right branch", "Accepted"));
  await writeRecord(dir, "docs/product", "prd-0001-shipped.md", 'title: "PRD-0001: Shipped"\nstatus: "Accepted"');
  await writeRecord(dir, "docs/product", "prd-0002-draft.md", null, "# PRD-0002: In discovery\n\n- **Status**: Draft\n");

  const status = await collectStatus(dir);
  assert.deepEqual(status.adrs.map((record) => [record.id, record.status, record.title]), [
    ["ADR-0002", "Proposed", "Open choice"],
    ["ADR-0003", "Superseded", "Left branch"],
    ["ADR-0003", "Accepted", "Right branch"],
    ["ADR-0001", "Accepted", "Old choice"],
  ]);
  assert.deepEqual(status.prds.map((record) => [record.id, record.status, record.title]), [
    ["PRD-0002", "Draft", "In discovery"],
    ["PRD-0001", "Accepted", "Shipped"],
  ]);
  assert.deepEqual(status.adrCollisions, [{ id: "ADR-0003", paths: ["docs/adr/adr-0003-left.md", "docs/adr/adr-0003-right.md"] }]);
});

test("status finds the latest log entries in either log order", async () => {
  const entries = [
    "## [INITIALIZED] scaffold | Kernel",
    "## [2026-01-01] ingest | first",
    "## [2026-01-02] decision | second",
    "## [2026-01-02] implementation | third",
  ];
  const fenced = "```markdown\n## [2026-12-31] fake | inside a code block\n```";
  const expected = [
    { date: "2026-01-02", tag: "implementation", description: "third" },
    { date: "2026-01-02", tag: "decision", description: "second" },
    { date: "2026-01-01", tag: "ingest", description: "first" },
  ];
  for (const ordered of [entries, [...entries].reverse()]) {
    const dir = await tempDir();
    await mkdir(path.join(dir, "docs/wiki"), { recursive: true });
    await writeFile(path.join(dir, "docs/wiki/log.md"), `# Knowledge Log\n\n${fenced}\n\n${ordered.join("\n\n")}\n`, "utf8");
    assert.deepEqual((await collectStatus(dir, { limit: 3 })).log, expected);
    const all = (await collectStatus(dir, { limit: 10 })).log;
    assert.deepEqual(all.at(-1), { date: "INITIALIZED", tag: "scaffold", description: "Kernel" });
    const limited = JSON.parse((await run(["status", "--json", "--limit", "1", "--cwd", dir])).out);
    assert.deepEqual(limited.log, expected.slice(0, 1));
  }
});

test("status writes nothing", async () => {
  const dir = await tempDir();
  await run(["init", "--yes", "--cwd", dir, "--runtime", "claude-code"]);
  const before = await snapshot(dir);
  await run(["status", "--cwd", dir]);
  await run(["status", "--json", "--cwd", dir]);
  assert.deepEqual(await snapshot(dir), before);
});
