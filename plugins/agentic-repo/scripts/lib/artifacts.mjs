import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { adrStatus, adrTierRecord, GATE_CONFIG_PATH, LOW_RISK_CATEGORIES, LOW_RISK_TIER, readGateConfig } from "./verify.mjs";

function slugify(value) {
  const slug = value.toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!slug) throw new Error("Title must contain at least one letter or number");
  return slug;
}

async function nextNumber(directory, prefix) {
  let names = [];
  try { names = await readdir(directory); } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const numbers = names.map((name) => name.match(new RegExp(`^${prefix}-(\\d{4})-`)))
    .filter(Boolean).map((match) => Number(match[1]));
  return String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(4, "0");
}

async function renderTemplate(cwd, templateName, replacements) {
  const templatePath = path.join(cwd, "docs", "templates", templateName);
  let content;
  try { content = await readFile(templatePath, "utf8"); } catch (error) {
    if (error.code === "ENOENT") throw new Error(`Missing ${templatePath}; run 'npx agentic-repo-kit init' first`);
    throw error;
  }
  for (const [pattern, replacement] of replacements) content = content.replaceAll(pattern, replacement);
  return content;
}

async function createUnique(target, content) {
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, { encoding: "utf8", flag: "wx" });
  return target;
}

// Sets frontmatter keys in place (or appends them) without a YAML dependency.
// Values are written as JSON strings, which are valid YAML double-quoted scalars.
function setFrontmatter(content, fields) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error("ADR has no frontmatter block");
  let block = match[1];
  for (const [key, value] of Object.entries(fields)) {
    const line = `${key}: ${JSON.stringify(value)}`;
    const pattern = new RegExp(`^${key}:.*$`, "m");
    block = pattern.test(block) ? block.replace(pattern, () => line) : `${block}\n${line}`;
  }
  return content.replace(match[1], () => block);
}

function setStatusSection(content, text) {
  return content.replace(/(^## Status\r?\n\r?\n)([\s\S]*?)(\r?\n## )/m, (all, head, body, tail) => `${head}${text}\n${tail}`);
}

const TIER_MARKER = "by the low-risk tier of `docs/adr/gate.json`";

// A low-risk tier ADR (ADR-0019) is accepted by the human-owned policy, carries a
// pending review, and lists the eligibility evidence the agent fills in.
function toLowRiskAdr(content, policy, date) {
  const eligibility = [
    "## Low-Risk Tier Eligibility",
    "",
    `- **Changed source files** (at most ${policy.maxFiles}): [list them]`,
    `- **Changed lines** (at most ${policy.maxLines}, documentation excluded): [count]`,
    "- **Tests changed with the code**: [list them]",
    `- **Excluded categories touched**: none (${LOW_RISK_CATEGORIES.join(", ")})`,
    "- **Classification beyond paths**: [why no public API or security impact]",
  ].join("\n");
  const status = `**Accepted** ${TIER_MARKER} on ${date}. Human review: pending.\n\n${eligibility}`;
  return setStatusSection(setFrontmatter(content, { status: "Accepted", tier: LOW_RISK_TIER, review: "pending" }), status);
}

async function findAdr(cwd, reference) {
  const number = String(reference ?? "").trim().match(/^(?:adr-?)?(\d{1,4})$/i)?.[1]?.padStart(4, "0");
  if (!number) throw new Error("adr review requires --adr <ADR-NNNN>");
  const directory = path.join(cwd, "docs", "adr");
  let names = [];
  try { names = await readdir(directory); } catch {}
  const matches = names.filter((name) => name.startsWith(`adr-${number}-`) && name.endsWith(".md"));
  if (matches.length === 0) throw new Error(`ADR-${number} not found in docs/adr`);
  if (matches.length > 1) throw new Error(`ADR-${number} is ambiguous: ${matches.join(", ")}; renumber the later ADR`);
  return { id: `ADR-${number}`, file: path.join(directory, matches[0]) };
}

// Records the human review of a low-risk tier ADR. The quote must be the human's own
// explicit words naming the task or ADR; a rejection also rejects the ADR.
export async function recordAdrReview(cwd, { adr, decision, by, quote }) {
  if (!["approved", "rejected"].includes(decision)) throw new Error("adr review requires --decision approved or rejected");
  if (!by?.trim()) throw new Error("adr review requires --by <reviewer>");
  if (!quote?.trim()) throw new Error("adr review requires --quote with the reviewer's own words");
  const { id, file } = await findAdr(cwd, adr);
  const content = await readFile(file, "utf8");
  const record = adrTierRecord(content);
  if (record.tier !== LOW_RISK_TIER) throw new Error(`${id} is not a low-risk tier ADR`);
  if (adrStatus(content) !== "Accepted") throw new Error(`${id} is not Accepted`);
  if (record.review !== "pending") throw new Error(`${id} review is already ${record.review}`);
  const date = new Date().toISOString().slice(0, 10);
  const fields = { review: decision, reviewed_by: by.trim(), reviewed_on: date, review_quote: quote.trim() };
  if (decision === "rejected") fields.status = "Rejected";
  let next = setFrontmatter(content, fields);
  if (content.includes(TIER_MARKER)) {
    const summary = decision === "approved"
      ? `Human review: approved by ${by.trim()} on ${date}: ${JSON.stringify(quote.trim())}.`
      : `Human review: rejected by ${by.trim()} on ${date}: ${JSON.stringify(quote.trim())}. The change is reverted.`;
    next = next.replace(/Human review: pending\./, () => summary);
    if (decision === "rejected") next = next.replace(`**Accepted** ${TIER_MARKER}`, () => `**Rejected** in review; it was accepted ${TIER_MARKER}`);
  }
  await writeFile(file, next, "utf8");
  return { id, file, review: decision, status: decision === "rejected" ? "Rejected" : "Accepted" };
}

export async function createGovernedArtifact(cwd, type, { title, target, tier = null }) {
  if (!title) throw new Error(`${type} new requires --title`);
  const date = new Date().toISOString().slice(0, 10);
  const slug = slugify(title);
  if (type === "adr") {
    let policy = null;
    if (tier) {
      const gate = await readGateConfig(cwd);
      if (gate.problems.length > 0) throw new Error(gate.problems.join("; "));
      if (!gate.lowRisk) throw new Error(`The low-risk tier is not enabled: add a lowRisk section to ${GATE_CONFIG_PATH}`);
      policy = gate.lowRisk;
    }
    const directory = path.join(cwd, "docs", "adr");
    const number = await nextNumber(directory, "adr");
    let content = await renderTemplate(cwd, "adr-template.md", [
      ["NNNN", number], ["[Decision Title]", title], ["YYYY-MM-DD", date],
    ]);
    if (policy) content = toLowRiskAdr(content, policy, date);
    return createUnique(path.join(directory, `adr-${number}-${slug}.md`), content);
  }
  if (type === "prd") {
    const directory = path.join(cwd, "docs", "product");
    const number = await nextNumber(directory, "prd");
    const content = await renderTemplate(cwd, "prd-template.md", [
      ["NNNN", number], ["[Product or Feature]", title], ["YYYY-MM-DD", date],
    ]);
    return createUnique(path.join(directory, `prd-${number}-${slug}.md`), content);
  }
  if (!target) throw new Error("anneal new requires --target");
  const directory = path.join(cwd, ".agents", "annealing", "proposals");
  const content = await renderTemplate(cwd, "annealing-proposal-template.md", [
    ["- **Target canonical file**:", `- **Target canonical file**: \`${target}\``],
    ["[Title]", title], ["YYYY-MM-DD", date], ["[target]", target],
  ]);
  return createUnique(path.join(directory, `${date}-${slug}.md`), content);
}
