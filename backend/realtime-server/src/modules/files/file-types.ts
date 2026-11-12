/**
 * Upload allowlist. The server decides a file's Content-Type from this table
 * and checks the first bytes against the extension, so a renamed file (an HTML
 * page called resume.pdf) is refused instead of being served back to staff.
 */
type Signature = (head: Uint8Array) => boolean;

const startsWith = (...bytes: number[]): Signature => head => bytes.every((byte, index) => head[index] === byte);
const ascii = (text: string) => [...text].map(character => character.charCodeAt(0));
const PDF = startsWith(...ascii("%PDF-"));
const ZIP = startsWith(0x50, 0x4b, 0x03, 0x04); // docx, pptx, xlsx and zip are zip containers
const OLE = startsWith(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1); // legacy doc, ppt, xls
const PNG = startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const JPEG = startsWith(0xff, 0xd8, 0xff);
const GIF = startsWith(...ascii("GIF8"));
const WEBP: Signature = head => startsWith(...ascii("RIFF"))(head) && ascii("WEBP").every((byte, index) => head[8 + index] === byte);
/** Plain text: no NUL bytes in the first block. */
const TEXT: Signature = head => !head.includes(0);

const TYPES: Record<string, { mime: string; signature: Signature }> = {
  pdf: { mime: "application/pdf", signature: PDF },
  doc: { mime: "application/msword", signature: OLE },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", signature: ZIP },
  ppt: { mime: "application/vnd.ms-powerpoint", signature: OLE },
  pptx: { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", signature: ZIP },
  xls: { mime: "application/vnd.ms-excel", signature: OLE },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", signature: ZIP },
  zip: { mime: "application/zip", signature: ZIP },
  png: { mime: "image/png", signature: PNG },
  jpg: { mime: "image/jpeg", signature: JPEG },
  jpeg: { mime: "image/jpeg", signature: JPEG },
  gif: { mime: "image/gif", signature: GIF },
  webp: { mime: "image/webp", signature: WEBP },
  txt: { mime: "text/plain; charset=utf-8", signature: TEXT },
  md: { mime: "text/markdown; charset=utf-8", signature: TEXT },
  csv: { mime: "text/csv; charset=utf-8", signature: TEXT },
};

export const ALLOWED_EXTENSIONS = {
  resume: ["pdf", "doc", "docx"],
  work: ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "csv", "txt", "md", "png", "jpg", "jpeg", "gif", "webp", "zip"],
} as const;
export type FileKind = keyof typeof ALLOWED_EXTENSIONS;

/** How many leading bytes the signature check needs. */
export const SIGNATURE_BYTES = 16;

const extensionOf = (name: string) => /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() || "";

/** The allowed type for this file name and upload kind, or null when the extension isn't allowed. */
export function allowedType(name: string, kind: FileKind) {
  const extension = extensionOf(name);
  if (!(ALLOWED_EXTENSIONS[kind] as readonly string[]).includes(extension)) return null;
  return { extension, ...TYPES[extension]! };
}

/** True when the file's first bytes match what its extension claims. */
export function matchesSignature(name: string, kind: FileKind, head: Uint8Array) {
  const type = allowedType(name, kind);
  return Boolean(type && head.length > 0 && type.signature(head));
}
