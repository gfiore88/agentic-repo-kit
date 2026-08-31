import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

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
    if (error.code === "ENOENT") throw new Error(`Missing ${templatePath}; run agentic-repo init first`);
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

export async function createGovernedArtifact(cwd, type, { title, target }) {
  if (!title) throw new Error(`${type} new requires --title`);
  const date = new Date().toISOString().slice(0, 10);
  const slug = slugify(title);
  if (type === "adr") {
    const directory = path.join(cwd, "docs", "adr");
    const number = await nextNumber(directory, "adr");
    const content = await renderTemplate(cwd, "adr-template.md", [
      ["NNNN", number], ["[Decision Title]", title], ["YYYY-MM-DD", date],
    ]);
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
