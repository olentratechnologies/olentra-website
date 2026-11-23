import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync } from "fflate";

/**
 * Turns a resume file into plain text for the AI review.
 *
 * - PDF: the text layer, page by page (poppler `pdftotext`). A page with almost
 *   no text is a scan or photo, so it is rendered (`pdftoppm`) and read by the
 *   vision model instead.
 * - DOCX: the document XML; an image-only DOCX sends its pictures to vision.
 * - DOC: `antiword`.
 *
 * Anything that can't be read reliably comes back as `{ ok: false, reason }`,
 * which the review turns into "Needs manual review" rather than a guess.
 */

export type ResumeImage = { mime: "image/png" | "image/jpeg"; data: Uint8Array };
export type Transcribe = (image: ResumeImage, page: number) => Promise<string>;
export type Extraction =
  | { ok: true; text: string; method: "text" | "ocr" | "mixed"; pages: number; warnings: string[] }
  | { ok: false; reason: string; warnings: string[] };

/** Resumes are short; later pages are rarely more than references. */
export const MAX_PAGES = 4;
/** A page with fewer readable characters than this is treated as an image. */
export const MIN_PAGE_CHARACTERS = 40;
/** Text handed to the model is capped so one huge file can't blow the budget. */
export const MAX_TEXT_CHARACTERS = 24_000;
const TOOL_TIMEOUT_MS = 20_000;
const MAX_UNZIPPED_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_BYTES = 3.5 * 1024 * 1024;

export class ToolMissingError extends Error {
  constructor(tool: string) { super(`${tool} is not installed on this server.`); this.name = "ToolMissingError"; }
}

const readable = (text: string) => text.replace(/\s+/g, "").length;

/** Collapses layout whitespace without merging lines, and drops control characters. */
export function normalizeText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/[ \t ]+/g, " ")
    .split("\n").map(line => line.trim()).join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function run(cmd: string[], timeoutMs = TOOL_TIMEOUT_MS) {
  let child: ReturnType<typeof Bun.spawn>;
  try {
    child = Bun.spawn({ cmd, stdout: "pipe", stderr: "pipe", stdin: "ignore" });
  } catch (error: any) {
    if (error?.code === "ENOENT" || /ENOENT|not found/i.test(String(error?.message))) throw new ToolMissingError(cmd[0]!);
    throw error;
  }
  const timer = setTimeout(() => child.kill(), timeoutMs);
  try {
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout as ReadableStream).text(),
      new Response(child.stderr as ReadableStream).text(),
      child.exited,
    ]);
    return { code, stdout, stderr };
  } finally { clearTimeout(timer); }
}

async function withTempDir<T>(task: (dir: string) => Promise<T>) {
  const dir = await mkdtemp(join(tmpdir(), "olentra-resume-"));
  try { return await task(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}

function combine(parts: { text: string; ocr: boolean }[], warnings: string[]): Extraction {
  const text = normalizeText(parts.map(part => part.text).join("\n\n")).slice(0, MAX_TEXT_CHARACTERS);
  if (!readable(text)) return { ok: false, reason: "No readable text was found in the resume.", warnings };
  const ocr = parts.filter(part => part.ocr && readable(part.text)).length, plain = parts.filter(part => !part.ocr && readable(part.text)).length;
  return { ok: true, text, method: ocr && plain ? "mixed" : ocr ? "ocr" : "text", pages: parts.length, warnings };
}

async function extractPdf(bytes: Uint8Array, transcribe: Transcribe): Promise<Extraction> {
  return withTempDir(async dir => {
    const file = join(dir, "resume.pdf");
    await writeFile(file, bytes);
    const info = await run(["pdfinfo", file]);
    if (info.code !== 0) {
      return /encrypt|password/i.test(info.stderr)
        ? { ok: false, reason: "The PDF is password-protected.", warnings: [] }
        : { ok: false, reason: "The PDF is damaged or not a valid PDF.", warnings: [] };
    }
    const total = Number(/^Pages:\s+(\d+)/m.exec(info.stdout)?.[1]) || 0;
    if (!total) return { ok: false, reason: "The PDF has no pages.", warnings: [] };
    const warnings = total > MAX_PAGES ? [`Only the first ${MAX_PAGES} of ${total} pages were reviewed.`] : [];
    const parts: { text: string; ocr: boolean }[] = [];
    for (let page = 1; page <= Math.min(total, MAX_PAGES); page++) {
      const result = await run(["pdftotext", "-layout", "-enc", "UTF-8", "-f", String(page), "-l", String(page), file, "-"]);
      const text = result.code === 0 ? result.stdout : "";
      if (readable(text) >= MIN_PAGE_CHARACTERS) { parts.push({ text, ocr: false }); continue; }
      // Little or no text layer: a scan or a photo. Render it and read it with vision.
      const prefix = join(dir, `page-${page}`);
      const render = await run(["pdftoppm", "-r", "150", "-jpeg", "-jpegopt", "quality=85", "-f", String(page), "-l", String(page), "-singlefile", file, prefix]);
      if (render.code !== 0) { warnings.push(`Page ${page} could not be rendered.`); parts.push({ text, ocr: false }); continue; }
      const image = await readFile(`${prefix}.jpg`);
      if (image.length > MAX_IMAGE_BYTES) { warnings.push(`Page ${page} image is too large to read.`); parts.push({ text, ocr: false }); continue; }
      parts.push({ text: await transcribe({ mime: "image/jpeg", data: new Uint8Array(image) }, page), ocr: true });
    }
    return combine(parts, warnings);
  });
}

const XML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'" };
/** Plain text from WordprocessingML: paragraphs and breaks become newlines, tabs stay tabs. */
export function wordXmlToText(xml: string) {
  return xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:(br|cr)\b[^>]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity: string) => {
      if (entity[0] === "#") {
        const code = entity[1]?.toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : "";
      }
      return XML_ENTITIES[entity.toLowerCase()] ?? "";
    });
}

async function extractDocx(bytes: Uint8Array, transcribe: Transcribe): Promise<Extraction> {
  let total = 0;
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes, {
      filter: file => {
        const wanted = /^word\/(document|header\d*|footer\d*)\.xml$/.test(file.name) || /^word\/media\/[^/]+\.(png|jpe?g)$/i.test(file.name);
        if (!wanted) return false;
        total += file.originalSize;
        if (total > MAX_UNZIPPED_BYTES) throw new Error("too large");
        return true;
      },
    });
  } catch {
    return { ok: false, reason: "The DOCX file is damaged or too large to open.", warnings: [] };
  }
  const document = entries["word/document.xml"];
  if (!document) return { ok: false, reason: "The DOCX file has no document body.", warnings: [] };
  const decoder = new TextDecoder();
  const xmlParts = Object.keys(entries).filter(name => name.endsWith(".xml")).sort((a, b) => (a === "word/document.xml" ? -1 : b === "word/document.xml" ? 1 : a.localeCompare(b)));
  const text = xmlParts.map(name => wordXmlToText(decoder.decode(entries[name]))).join("\n\n");
  if (readable(text) >= MIN_PAGE_CHARACTERS) return combine([{ text, ocr: false }], []);
  // Image-only document (a pasted scan or screenshot): read the largest pictures.
  const images = Object.entries(entries)
    .filter(([name, data]) => name.startsWith("word/media/") && data.length <= MAX_IMAGE_BYTES)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, MAX_PAGES);
  if (!images.length) return { ok: false, reason: "The DOCX file has no readable text or pictures.", warnings: [] };
  const parts = [{ text, ocr: false }];
  for (const [index, [name, data]] of images.entries()) {
    parts.push({ text: await transcribe({ mime: /\.png$/i.test(name) ? "image/png" : "image/jpeg", data }, index + 1), ocr: true });
  }
  return combine(parts, []);
}

async function extractDoc(bytes: Uint8Array): Promise<Extraction> {
  return withTempDir(async dir => {
    const file = join(dir, "resume.doc");
    await writeFile(file, bytes);
    const result = await run(["antiword", "-w", "0", file]);
    if (result.code !== 0) return { ok: false, reason: "The DOC file could not be read. It may be damaged or saved in an unusual format.", warnings: [] };
    return combine([{ text: result.stdout, ocr: false }], []);
  });
}

const extensionOf = (name: string) => /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() || "";

/** Reads a resume. `transcribe` is only called for pages that are images. */
export async function extractResume(bytes: Uint8Array, fileName: string, transcribe: Transcribe): Promise<Extraction> {
  if (!bytes.length) return { ok: false, reason: "The resume file is empty.", warnings: [] };
  const extension = extensionOf(fileName);
  if (extension === "pdf") return extractPdf(bytes, transcribe);
  if (extension === "docx") return extractDocx(bytes, transcribe);
  if (extension === "doc") return extractDoc(bytes);
  return { ok: false, reason: `Resumes in .${extension || "unknown"} format can't be reviewed automatically.`, warnings: [] };
}
