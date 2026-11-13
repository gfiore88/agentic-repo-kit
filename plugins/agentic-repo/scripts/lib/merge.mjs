// Line-based three-way merge for customized kernel files (ADR-0028). Runs in
// process: the CLI starts no subprocess.

const OURS_MARKER = "<<<<<<< yours";
const SEPARATOR = "=======";
const THEIRS_MARKER_PREFIX = ">>>>>>> agentic-repo-kit";
// Myers' algorithm keeps one frontier per edit step; this bound keeps memory small.
const MAX_LINES = 20000;

export function hasConflictMarkers(content) {
  return new RegExp(`^${OURS_MARKER}\\r?$`, "m").test(content)
    && new RegExp(`^${THEIRS_MARKER_PREFIX}\\b`, "m").test(content);
}

function splitLines(text) {
  return text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

// Myers' O(ND) diff on the lines between a common prefix and suffix. Returns the
// matched [baseIndex, otherIndex] pairs in increasing order.
function matchLines(a, b) {
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix += 1;
  let suffix = 0;
  while (suffix < a.length - prefix && suffix < b.length - prefix && a[a.length - 1 - suffix] === b[b.length - 1 - suffix]) suffix += 1;
  const pairs = [];
  for (let index = 0; index < prefix; index += 1) pairs.push([index, index]);
  const x0 = prefix;
  const n = a.length - prefix - suffix;
  const m = b.length - prefix - suffix;
  const max = n + m;
  if (max > 0) {
    const offset = max + 1;
    const trace = [];
    let v = new Int32Array(2 * max + 3);
    let found = false;
    for (let d = 0; d <= max && !found; d += 1) {
      trace.push(v.slice());
      for (let k = -d; k <= d; k += 2) {
        let x = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]) ? v[offset + k + 1] : v[offset + k - 1] + 1;
        let y = x - k;
        while (x < n && y < m && a[x0 + x] === b[x0 + y]) {
          x += 1;
          y += 1;
        }
        v[offset + k] = x;
        if (x >= n && y >= m) {
          found = true;
          break;
        }
      }
    }
    const middle = [];
    let x = n;
    let y = m;
    for (let d = trace.length - 1; d >= 0; d -= 1) {
      const frontier = trace[d];
      const k = x - y;
      const previousK = k === -d || (k !== d && frontier[offset + k - 1] < frontier[offset + k + 1]) ? k + 1 : k - 1;
      const previousX = frontier[offset + previousK];
      const previousY = previousX - previousK;
      while (x > previousX && y > previousY) {
        x -= 1;
        y -= 1;
        middle.push([x0 + x, x0 + y]);
      }
      x = previousX;
      y = previousY;
    }
    pairs.push(...middle.reverse());
  }
  for (let index = suffix; index > 0; index -= 1) pairs.push([a.length - index, b.length - index]);
  return pairs;
}

// Regions of `base` that `other` replaced: { start, end, lines } in base indexes.
function changes(base, other) {
  const hunks = [];
  let i = 0;
  let j = 0;
  for (const [baseIndex, otherIndex] of [...matchLines(base, other), [base.length, other.length]]) {
    if (baseIndex > i || otherIndex > j) hunks.push({ start: i, end: baseIndex, lines: other.slice(j, otherIndex) });
    i = baseIndex + 1;
    j = otherIndex + 1;
  }
  return hunks;
}

// Changes conflict only when they overlap. An insertion at the boundary of the
// other side's change is ordered next to it instead.
function overlaps(start, end, hunk) {
  if (start === end && hunk.start === hunk.end) return hunk.start === start;
  if (start === end) return hunk.start < start && start < hunk.end;
  if (hunk.start === hunk.end) return start < hunk.start && hunk.start < end;
  return hunk.start < end && start < hunk.end;
}

function apply(base, start, end, hunks) {
  const lines = [];
  let position = start;
  for (const hunk of hunks) {
    lines.push(...base.slice(position, hunk.start), ...hunk.lines);
    position = hunk.end;
  }
  lines.push(...base.slice(position, end));
  return lines;
}

function terminated(lines, eol) {
  if (lines.length === 0 || lines[lines.length - 1].endsWith("\n")) return lines;
  return [...lines.slice(0, -1), `${lines[lines.length - 1]}${eol}`];
}

// Merges the owner's changes (base -> ours) with the kit's (base -> theirs).
// Returns the merged content and the number of conflicts, or null when a file is
// too large to merge. `version` names the kit side of conflict markers.
export function mergeThreeWay(base, ours, theirs, { version = null } = {}) {
  if (ours === theirs || theirs === base) return { content: ours, conflicts: 0 };
  if (ours === base) return { content: theirs, conflicts: 0 };
  const baseLines = splitLines(base);
  const oursLines = splitLines(ours);
  const theirsLines = splitLines(theirs);
  if (baseLines.length + Math.max(oursLines.length, theirsLines.length) > MAX_LINES) return null;
  const eol = ours.includes("\r\n") ? "\r\n" : "\n";
  const hunks = [
    ...changes(baseLines, oursLines).map((hunk) => ({ ...hunk, side: "ours" })),
    ...changes(baseLines, theirsLines).map((hunk) => ({ ...hunk, side: "theirs" })),
  ].sort((left, right) => left.start - right.start || left.end - right.end || (left.side === "ours" ? -1 : 1));

  const output = [];
  let conflicts = 0;
  let cursor = 0;
  let index = 0;
  while (index < hunks.length) {
    const group = [hunks[index]];
    const start = hunks[index].start;
    let end = hunks[index].end;
    index += 1;
    while (index < hunks.length && overlaps(start, end, hunks[index])) {
      group.push(hunks[index]);
      end = Math.max(end, hunks[index].end);
      index += 1;
    }
    output.push(...baseLines.slice(cursor, start));
    const oursSide = group.filter((hunk) => hunk.side === "ours");
    const theirsSide = group.filter((hunk) => hunk.side === "theirs");
    const fromOurs = apply(baseLines, start, end, oursSide);
    const fromTheirs = apply(baseLines, start, end, theirsSide);
    if (theirsSide.length === 0 || fromOurs.join("") === fromTheirs.join("")) output.push(...fromOurs);
    else if (oursSide.length === 0) output.push(...fromTheirs);
    else {
      conflicts += 1;
      output.push(
        `${OURS_MARKER}${eol}`,
        ...terminated(fromOurs, eol),
        `${SEPARATOR}${eol}`,
        ...terminated(fromTheirs, eol),
        `${THEIRS_MARKER_PREFIX}${version ? ` ${version}` : ""}${eol}`,
      );
    }
    cursor = end;
  }
  output.push(...baseLines.slice(cursor));
  return { content: output.join(""), conflicts };
}
