/**
 * Turns a task description typed as plain text into blocks to render:
 *   - a blank line starts a new paragraph;
 *   - "- item", "* item" or "• item" lines become a bullet list;
 *   - "1. Title" followed by its own lines becomes a numbered step heading,
 *     while consecutive "1. a" / "2. b" lines become a numbered list;
 *   - "# Heading" (up to ###) becomes a heading.
 * Inline **bold**, `code` and http(s) links are handled by `inlineParts`.
 */
const BULLET = /^\s*[-*•]\s+(.+)$/;
const NUMBERED = /^\s*(\d{1,2})[.)]\s+(.+)$/;
const HEADING = /^\s*#{1,3}\s+(.+)$/;

export function parseTaskDescription(text) {
  const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let index = 0;
  const blank = (line) => !line || !line.trim();
  while (index < lines.length) {
    const line = lines[index];
    if (blank(line)) { index++; continue; }
    const heading = HEADING.exec(line);
    if (heading) { blocks.push({ type: "heading", text: heading[1].trim() }); index++; continue; }
    if (BULLET.test(line)) {
      const items = [];
      while (index < lines.length && BULLET.test(lines[index])) items.push(BULLET.exec(lines[index++])[1].trim());
      blocks.push({ type: "bullets", items });
      continue;
    }
    const numbered = NUMBERED.exec(line);
    if (numbered) {
      const next = lines[index + 1];
      // "1. Title" with its own text below is a step heading; a run of "1. …", "2. …" is a list.
      if (!blank(next) && next !== undefined && !NUMBERED.test(next)) {
        blocks.push({ type: "step", number: Number(numbered[1]), text: numbered[2].trim() });
        index++;
        continue;
      }
      const items = [];
      const start = Number(numbered[1]);
      while (index < lines.length && NUMBERED.test(lines[index])) items.push(NUMBERED.exec(lines[index++])[2].trim());
      blocks.push({ type: "numbers", start, items });
      continue;
    }
    const paragraph = [];
    while (index < lines.length && !blank(lines[index]) && !BULLET.test(lines[index]) && !NUMBERED.test(lines[index]) && !HEADING.test(lines[index])) paragraph.push(lines[index++].trim());
    blocks.push({ type: "paragraph", lines: paragraph });
  }
  return blocks;
}

const INLINE = /(\*\*[^*\n]+\*\*|`[^`\n]+`|https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;

/** Splits a line into text, bold, code and link parts. */
export function inlineParts(text) {
  const parts = [];
  let last = 0;
  for (const match of String(text).matchAll(INLINE)) {
    if (match.index > last) parts.push({ type: "text", value: text.slice(last, match.index) });
    const token = match[0];
    if (token.startsWith("**")) parts.push({ type: "bold", value: token.slice(2, -2) });
    else if (token.startsWith("`")) parts.push({ type: "code", value: token.slice(1, -1) });
    else parts.push({ type: "link", value: token });
    last = match.index + token.length;
  }
  if (last < String(text).length) parts.push({ type: "text", value: String(text).slice(last) });
  return parts;
}
