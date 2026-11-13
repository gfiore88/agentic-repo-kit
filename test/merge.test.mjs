import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { readTarball } from "../plugins/agentic-repo/scripts/lib/base.mjs";
import { runCli } from "../plugins/agentic-repo/scripts/lib/cli.mjs";
import { hasConflictMarkers, mergeThreeWay } from "../plugins/agentic-repo/scripts/lib/merge.mjs";
import { sha256 } from "../plugins/agentic-repo/scripts/lib/plan.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OLD_VERSION = "0.0.1-test";
const NEW_RULE = "Never load the whole repository into context when the digest and the index can route the task.";
const OLD_RULE = "Never load the whole repository into context.";

async function run(argv) {
  const out = [];
  const err = [];
  const originalOut = process.stdout.write;
  const originalErr = process.stderr.write;
  process.stdout.write = (chunk) => (out.push(String(chunk)), true);
  process.stderr.write = (chunk) => (err.push(String(chunk)), true);
  try {
    const code = await runCli(argv);
    return { code, out: out.join(""), err: err.join("") };
  } finally {
    process.stdout.write = originalOut;
    process.stderr.write = originalErr;
  }
}

async function tempDir(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "agentic-repo-merge-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

function useEnv(t, values) {
  const saved = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  t.after(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

// --- tarball fixtures --------------------------------------------------------

function tarHeader(name, size, type = "0") {
  const header = Buffer.alloc(512);
  header.write(name.slice(0, 100), 0, "utf8");
  header.write("0000644\0", 100, "latin1");
  header.write("0000000\0", 108, "latin1");
  header.write("0000000\0", 116, "latin1");
  header.write(`${size.toString(8).padStart(11, "0")}\0`, 124, "latin1");
  header.write("00000000000\0", 136, "latin1");
  header.write(type, 156, "latin1");
  header.write("ustar\u000000", 257, "latin1");
  header.fill(0x20, 148, 156);
  let sum = 0;
  for (const byte of header) sum += byte;
  header.write(`${sum.toString(8).padStart(6, "0")}\0 `, 148, "latin1");
  return header;
}

function padded(buffer) {
  const rest = buffer.length % 512;
  return rest === 0 ? buffer : Buffer.concat([buffer, Buffer.alloc(512 - rest)]);
}

function paxRecord(key, value) {
  const body = ` ${key}=${value}\n`;
  let length = Buffer.byteLength(body) + 1;
  while (String(length).length + Buffer.byteLength(body) !== length) length = String(length).length + Buffer.byteLength(body);
  return `${length}${body}`;
}

function buildTarball(files, { longNames = "pax" } = {}) {
  const parts = [];
  for (const [name, content] of files) {
    const data = Buffer.from(content);
    if (Buffer.byteLength(name) > 100) {
      const extension = longNames === "gnu" ? Buffer.from(`${name}\0`) : Buffer.from(paxRecord("path", name));
      parts.push(tarHeader(longNames === "gnu" ? "././@LongLink" : "PaxHeader", extension.length, longNames === "gnu" ? "L" : "x"), padded(extension));
    }
    parts.push(tarHeader(name, data.length), padded(data));
  }
  parts.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(parts));
}

async function listFiles(root, current = root) {
  const files = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, absolute));
    else if (entry.isFile() && entry.name !== ".DS_Store") files.push(absolute);
  }
  return files;
}

// A published "previous version" of the kit: today's sources with an older rule in
// AGENTS.md and an extra registry line, packed like an npm tarball.
async function previousPackage(root) {
  const pkg = path.join(root, "pkg", "package");
  await cp(path.join(repoRoot, "plugins", "agentic-repo"), path.join(pkg, "plugins", "agentic-repo"), { recursive: true });
  await writeFile(path.join(pkg, "package.json"), `${JSON.stringify({ name: "agentic-repo-kit", version: OLD_VERSION })}\n`, "utf8");
  const blueprint = path.join(pkg, "plugins", "agentic-repo", "assets", "blueprints", "base");
  const agents = path.join(blueprint, "AGENTS.md");
  await writeFile(agents, (await readFile(agents, "utf8")).replace(NEW_RULE, OLD_RULE), "utf8");
  const registry = path.join(blueprint, ".agents", "registry.md");
  await writeFile(registry, `${await readFile(registry, "utf8")}\nLegacy role list.\n`, "utf8");
  const entries = [];
  for (const file of await listFiles(path.join(root, "pkg"))) {
    entries.push([path.relative(path.join(root, "pkg"), file).split(path.sep).join("/"), await readFile(file)]);
  }
  return { pkg, tarball: buildTarball(entries) };
}

// A repository generated by the previous version, as its own `init` would write it.
async function previousRepository(root, pkg) {
  const library = path.join(pkg, "plugins", "agentic-repo");
  const { buildPlan } = await import(pathToFileURL(path.join(library, "scripts", "lib", "plan.mjs")).href);
  const plan = await buildPlan({ assetsRoot: path.join(library, "assets"), skillsRoot: path.join(library, "skills"), runtimes: [], enforce: "none", profile: "full" });
  const repo = path.join(root, "repo");
  for (const file of plan.files) {
    const target = path.join(repo, file.path);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.content, "utf8");
  }
  return repo;
}

async function startRegistry(t, tarball, { integrity } = {}) {
  let requests = 0;
  const server = http.createServer((request, response) => {
    requests += 1;
    const base = `http://127.0.0.1:${server.address().port}`;
    if (request.url === `/agentic-repo-kit/${OLD_VERSION}`) {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({
        name: "agentic-repo-kit",
        version: OLD_VERSION,
        dist: { tarball: `${base}/agentic-repo-kit-${OLD_VERSION}.tgz`, integrity: integrity ?? `sha512-${createHash("sha512").update(tarball).digest("base64")}` },
      }));
    } else if (request.url === `/agentic-repo-kit-${OLD_VERSION}.tgz`) response.end(tarball);
    else {
      response.statusCode = 404;
      response.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return { url: `http://127.0.0.1:${server.address().port}/`, requests: () => requests };
}

async function unusedRegistryUrl() {
  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return `http://127.0.0.1:${port}/`;
}

// --- merge engine ---------------------------------------------------------------

test("mergeThreeWay keeps both sides when their changes do not overlap", () => {
  const base = "1\n2\n3\n4\n5 old\n\nlast\n";
  const ours = "1\n2\n3\n4\n5 old\n6 ours\n7 ours\n\nlast\n";
  const theirs = "1 pinned\n2\n3\n4\n5 new\n\nlast\n";
  assert.deepEqual(mergeThreeWay(base, ours, theirs), { content: "1 pinned\n2\n3\n4\n5 new\n6 ours\n7 ours\n\nlast\n", conflicts: 0 });
  assert.equal(mergeThreeWay("a\nb\nc\nd\ne\n", "a\nB\nc\nd\ne\n", "a\nb\nc\nD\ne\n").content, "a\nB\nc\nD\ne\n");
  assert.equal(mergeThreeWay("a\nb\nc\n", "a\nX\nc\n", "a\nX\nc\n").content, "a\nX\nc\n", "identical edits");
  assert.equal(mergeThreeWay("a\r\nb\r\nc\r\n", "a\r\nours\r\nc\r\n", "a\r\nb\r\nc\r\nkit\r\n").content, "a\r\nours\r\nc\r\nkit\r\n", "CRLF");
  assert.equal(mergeThreeWay("a\n", "a\nmine\n", "a\n").content, "a\nmine\n", "no kit change keeps the owner's file");
});

test("mergeThreeWay marks overlapping changes", () => {
  const overlap = mergeThreeWay("a\nb\nc\n", "a\nours\nc\n", "a\nkit\nc\n", { version: "9.9.9" });
  assert.equal(overlap.conflicts, 1);
  assert.equal(overlap.content, "a\n<<<<<<< yours\nours\n=======\nkit\n>>>>>>> agentic-repo-kit 9.9.9\nc\n");
  assert.equal(hasConflictMarkers(overlap.content), true);
  assert.equal(mergeThreeWay("a\n", "a\nours\n", "a\nkit\n").conflicts, 1, "different appends at the same place");
  assert.equal(hasConflictMarkers("<<<<<<< HEAD\nx\n=======\ny\n>>>>>>> other\n"), false, "only the kit's own markers count");
});

// --- tarball reader -------------------------------------------------------------

test("readTarball reads PAX and GNU long names and refuses paths outside the archive", () => {
  const long = `package/${"deep/".repeat(25)}file.md`;
  for (const longNames of ["pax", "gnu"]) {
    const files = readTarball(buildTarball([["package/package.json", "{}"], [long, "content"]], { longNames }));
    assert.equal(files.get(long).toString(), "content", longNames);
    assert.equal(files.get("package/package.json").toString(), "{}");
  }
  assert.throws(() => readTarball(buildTarball([["../escape.txt", "x"]])), /unsafe path/);
});

// --- update -------------------------------------------------------------------

test("update merges a customized kernel file with the changes of a newer kit version", async (t) => {
  const root = await tempDir(t);
  const { pkg, tarball } = await previousPackage(root);
  const repo = await previousRepository(root, pkg);
  const registry = await startRegistry(t, tarball);
  useEnv(t, { npm_config_registry: registry.url, AGENTIC_REPO_KIT_CACHE: path.join(root, "cache") });
  const agentsPath = path.join(repo, "AGENTS.md");
  await writeFile(agentsPath, `${await readFile(agentsPath, "utf8")}\n## Project rules\n\n- Keep the public API stable.\n`, "utf8");

  const result = await run(["update", "--yes", "--json", "--cwd", repo]);
  assert.equal(result.code, 0, result.err);
  const report = JSON.parse(result.out);
  assert.deepEqual(report.merged, ["AGENTS.md"]);
  assert.ok(report.updated.includes(".agents/registry.md"), "unmodified files are updated as before");
  assert.deepEqual([report.conflicted, report.kept, report.conflicts], [[], [], []]);
  const agents = await readFile(agentsPath, "utf8");
  assert.match(agents, /Keep the public API stable/);
  assert.ok(agents.includes(NEW_RULE), "the kit's change is applied");
  assert.doesNotMatch(agents, new RegExp(`agentic-repo-kit@${OLD_VERSION}`), "version pins move to the running version");
  assert.doesNotMatch(await readFile(path.join(repo, ".agents/registry.md"), "utf8"), /Legacy role list/);
  assert.equal((await run(["verify", "--cwd", repo])).code, 0);
});

test("overlapping edits get conflict markers while the rest of the kernel is updated", async (t) => {
  const root = await tempDir(t);
  const { pkg, tarball } = await previousPackage(root);
  const repo = await previousRepository(root, pkg);
  const registry = await startRegistry(t, tarball);
  useEnv(t, { npm_config_registry: registry.url, AGENTIC_REPO_KIT_CACHE: path.join(root, "cache") });
  const agentsPath = path.join(repo, "AGENTS.md");
  await writeFile(agentsPath, (await readFile(agentsPath, "utf8")).replace(OLD_RULE, "Never load the whole repository: our own rule."), "utf8");

  assert.equal((await run(["update", "--dry-run", "--cwd", repo])).code, 1);
  const downloads = registry.requests();
  assert.equal(downloads, 2, "metadata and tarball");
  const preview = await run(["update", "--dry-run", "--cwd", repo]);
  assert.match(preview.out, /conflict markers \(your edits and the kit's overlap\): AGENTS\.md/);
  assert.equal(registry.requests(), downloads, "the verified package is cached");

  const result = await run(["update", "--yes", "--cwd", repo]);
  assert.equal(result.code, 1);
  assert.match(result.out, /Resolve the conflict markers .* in: AGENTS\.md/);
  const agents = await readFile(agentsPath, "utf8");
  assert.match(agents, /^<<<<<<< yours\nNever load the whole repository: our own rule\.\n=======\n/m);
  assert.doesNotMatch(await readFile(path.join(repo, ".agents/registry.md"), "utf8"), /Legacy role list/);

  const doctor = JSON.parse((await run(["doctor", "--json", "--cwd", repo])).out);
  assert.equal(doctor.ok, false);
  assert.deepEqual(doctor.conflicted, ["AGENTS.md"]);
  const verify = JSON.parse((await run(["verify", "--json", "--cwd", repo])).out);
  assert.ok(verify.violations.some((violation) => violation.kind === "merge-conflict" && violation.detail.startsWith("AGENTS.md")));
});

test("without a base the customized file is kept with its lock entry and merges later", async (t) => {
  const root = await tempDir(t);
  const { pkg, tarball } = await previousPackage(root);
  const repo = await previousRepository(root, pkg);
  const oldHash = JSON.parse(await readFile(path.join(repo, "scaffold.lock"), "utf8")).managedFiles.find((entry) => entry.path === "AGENTS.md").sha256;
  useEnv(t, { npm_config_registry: await unusedRegistryUrl(), AGENTIC_REPO_KIT_CACHE: path.join(root, "cache") });
  const agentsPath = path.join(repo, "AGENTS.md");
  const customized = `${await readFile(agentsPath, "utf8")}\n## Project rules\n`;
  await writeFile(agentsPath, customized, "utf8");

  const offline = await run(["update", "--yes", "--json", "--cwd", repo]);
  assert.equal(offline.code, 1);
  const report = JSON.parse(offline.out);
  assert.equal(report.kept.length, 1);
  assert.equal(report.kept[0].path, "AGENTS.md");
  assert.match(report.kept[0].reason, new RegExp(`cannot rebuild ${OLD_VERSION.replaceAll(".", "\\.")}`));
  assert.equal(await readFile(agentsPath, "utf8"), customized);
  const carried = JSON.parse(await readFile(path.join(repo, "scaffold.lock"), "utf8")).managedFiles.find((entry) => entry.path === "AGENTS.md");
  assert.deepEqual([carried.sha256, carried.kitVersion], [oldHash, OLD_VERSION]);

  const registry = await startRegistry(t, tarball);
  process.env.npm_config_registry = registry.url;
  const online = await run(["update", "--yes", "--json", "--cwd", repo]);
  assert.equal(online.code, 0, online.err);
  assert.deepEqual(JSON.parse(online.out).merged, ["AGENTS.md"]);
  assert.ok((await readFile(agentsPath, "utf8")).includes(NEW_RULE));
  const settled = JSON.parse(await readFile(path.join(repo, "scaffold.lock"), "utf8")).managedFiles.find((entry) => entry.path === "AGENTS.md");
  assert.equal(settled.kitVersion, undefined, "the entry follows the lock's version again");
});

test("a package that does not match the registry's integrity hash is refused", async (t) => {
  const root = await tempDir(t);
  const { pkg, tarball } = await previousPackage(root);
  const repo = await previousRepository(root, pkg);
  const registry = await startRegistry(t, tarball, { integrity: `sha512-${createHash("sha512").update("tampered").digest("base64")}` });
  useEnv(t, { npm_config_registry: registry.url, AGENTIC_REPO_KIT_CACHE: path.join(root, "cache") });
  const agentsPath = path.join(repo, "AGENTS.md");
  await writeFile(agentsPath, `${await readFile(agentsPath, "utf8")}\n## Project rules\n`, "utf8");

  const result = JSON.parse((await run(["update", "--yes", "--json", "--cwd", repo])).out);
  assert.match(result.kept[0].reason, /does not match the registry's integrity hash/);
});

test("the running version is its own base and needs no download", async (t) => {
  const root = await tempDir(t);
  useEnv(t, { npm_config_registry: await unusedRegistryUrl(), AGENTIC_REPO_KIT_CACHE: path.join(root, "cache") });
  const repo = path.join(root, "repo");
  assert.equal((await run(["init", "--yes", "--runtime", "github-copilot", "--cwd", repo])).code, 0);
  const instructions = path.join(repo, ".github", "copilot-instructions.md");
  const customized = `${await readFile(instructions, "utf8")}\n- Client rule.\n`;
  await writeFile(instructions, customized, "utf8");
  const result = await run(["update", "--yes", "--json", "--cwd", repo]);
  assert.equal(result.code, 0, result.err);
  assert.deepEqual(JSON.parse(result.out).retained, [".github/copilot-instructions.md"]);
  assert.equal(await readFile(instructions, "utf8"), customized);
  const entry = JSON.parse(await readFile(path.join(repo, "scaffold.lock"), "utf8")).managedFiles.find((item) => item.path === ".github/copilot-instructions.md");
  assert.notEqual(entry.sha256, sha256(customized), "the lock keeps the kit's content as the next base");
});
