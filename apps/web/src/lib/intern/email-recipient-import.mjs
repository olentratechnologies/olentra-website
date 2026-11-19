const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_XML_BYTES = 12 * 1024 * 1024;

function extension(fileName) {
  return String(fileName || "").split(".").pop()?.toLowerCase() || "";
}

function csvValues(source) {
  return source.replace(/^\uFEFF/, "").split(/\r?\n/).map(line => {
    const firstColumn = line.split(/[\t,;]/, 1)[0].trim();
    return firstColumn.replace(/^"(.*)"$/, "$1").trim();
  });
}

function findZipEntries(buffer) {
  const view = new DataView(buffer);
  const lowerBound = Math.max(0, view.byteLength - 22 - 65_535);
  let endOffset = -1;
  for (let offset = view.byteLength - 22; offset >= lowerBound; offset--) {
    if (view.getUint32(offset, true) === 0x06054b50) { endOffset = offset; break; }
  }
  if (endOffset < 0) throw new Error("This Excel file is not a valid .xlsx workbook.");
  const count = view.getUint16(endOffset + 10, true);
  let cursor = view.getUint32(endOffset + 16, true);
  if (!count || count > 2_000) throw new Error("This workbook has an unsupported number of files.");
  const decoder = new TextDecoder();
  const entries = new Map();
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > view.byteLength || view.getUint32(cursor, true) !== 0x02014b50) throw new Error("This Excel workbook could not be read.");
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(new Uint8Array(buffer, cursor + 46, nameLength));
    entries.set(name, { method, compressedSize, localOffset });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function readZipText(buffer, entries, name) {
  const entry = entries.get(name);
  if (!entry) return "";
  const view = new DataView(buffer);
  const offset = entry.localOffset;
  if (offset + 30 > view.byteLength || view.getUint32(offset, true) !== 0x04034b50) throw new Error("This Excel workbook could not be read.");
  const nameLength = view.getUint16(offset + 26, true);
  const extraLength = view.getUint16(offset + 28, true);
  const start = offset + 30 + nameLength + extraLength;
  const compressed = new Uint8Array(buffer, start, entry.compressedSize);
  let bytes;
  if (entry.method === 0) bytes = compressed;
  else if (entry.method === 8) {
    if (typeof DecompressionStream === "undefined") throw new Error("This browser cannot open compressed Excel files. Save the sheet as CSV and upload it again.");
    let inflater;
    try { inflater = new DecompressionStream("deflate-raw"); }
    catch { throw new Error("This browser cannot open compressed Excel files. Save the sheet as CSV and upload it again."); }
    const reader = new Blob([compressed]).stream().pipeThrough(inflater).getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_XML_BYTES) { await reader.cancel(); throw new Error("The first worksheet is too large to import."); }
      chunks.push(value);
    }
    bytes = new Uint8Array(size);
    let cursor = 0;
    for (const chunk of chunks) { bytes.set(chunk, cursor); cursor += chunk.byteLength; }
  } else throw new Error("This Excel workbook uses an unsupported compression method.");
  if (bytes.byteLength > MAX_XML_BYTES) throw new Error("The first worksheet is too large to import.");
  return new TextDecoder().decode(bytes);
}

function parseXml(source) {
  const document = new DOMParser().parseFromString(source, "application/xml");
  if (document.querySelector("parsererror")) throw new Error("This Excel workbook contains an unreadable worksheet.");
  return document;
}

function descendants(element, localName) {
  return Array.from(element.getElementsByTagNameNS("*", localName));
}

function normalizePath(path) {
  const parts = [];
  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/");
}

async function xlsxValues(buffer) {
  const entries = findZipEntries(buffer);
  const workbookXml = await readZipText(buffer, entries, "xl/workbook.xml");
  const relationshipsXml = await readZipText(buffer, entries, "xl/_rels/workbook.xml.rels");
  if (!workbookXml || !relationshipsXml) throw new Error("This Excel file is missing its workbook information.");
  const workbook = parseXml(workbookXml);
  const relationshipDocument = parseXml(relationshipsXml);
  const firstSheet = descendants(workbook, "sheet")[0];
  if (!firstSheet) throw new Error("No worksheet was found in this Excel file.");
  const relationshipId = firstSheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") || firstSheet.getAttribute("r:id");
  const relationship = descendants(relationshipDocument, "Relationship").find(item => item.getAttribute("Id") === relationshipId);
  const target = relationship?.getAttribute("Target");
  if (!target) throw new Error("The first worksheet could not be found in this Excel file.");
  const worksheetPath = target.startsWith("/") ? normalizePath(target.slice(1)) : normalizePath(`xl/${target}`);
  const worksheetXml = await readZipText(buffer, entries, worksheetPath);
  if (!worksheetXml) throw new Error("The first worksheet could not be read.");
  const worksheet = parseXml(worksheetXml);
  const stringsXml = await readZipText(buffer, entries, "xl/sharedStrings.xml");
  const strings = stringsXml
    ? descendants(parseXml(stringsXml), "si").map(item => descendants(item, "t").map(node => node.textContent || "").join(""))
    : [];
  const values = [];
  for (const row of descendants(worksheet, "row")) {
    const firstColumn = descendants(row, "c").find(cell => /^A\d+$/i.test(cell.getAttribute("r") || ""));
    if (!firstColumn) continue;
    const type = firstColumn.getAttribute("t");
    if (type === "inlineStr") {
      values.push(descendants(firstColumn, "t").map(node => node.textContent || "").join(""));
      continue;
    }
    const raw = descendants(firstColumn, "v")[0]?.textContent || "";
    values.push(type === "s" ? (strings[Number(raw)] || "") : raw);
  }
  return values;
}

/** Reads the first column of the first worksheet, or the first CSV column, without assuming a header. */
export async function readEmailValuesFromFile(file) {
  if (!file || file.size <= 0) throw new Error("Choose a non-empty Excel or CSV file.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Upload a file smaller than 5 MB.");
  const type = extension(file.name);
  if (type === "csv") return csvValues(await file.text());
  if (type === "xlsx") return xlsxValues(await file.arrayBuffer());
  throw new Error("Choose an .xlsx Excel workbook or a .csv file.");
}
