const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_XML_BYTES = 12 * 1024 * 1024;

function extension(fileName) {
  return String(fileName || "").split(".").pop()?.toLowerCase() || "";
}

function csvDelimiter(source) {
  const counts = new Map([[",", 0], [";", 0], ["\t", 0]]);
  let quoted = false;
  for (const char of source) {
    if (char === '"') quoted = !quoted;
    if (quoted) continue;
    if (char === "\r" || char === "\n") break;
    if (counts.has(char)) counts.set(char, counts.get(char) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0][0];
}

function csvEmailRows(source) {
  // Treat quoted separators and line breaks as part of the same field, and flush the final row.
  const input = source.replace(/^\uFEFF/, "") + "\n";
  const delimiter = csvDelimiter(input);
  const rows = [];
  let row = 1;
  let column = 0;
  let quoted = false;
  let fields = ["", ""];
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (char === '"') {
      if (quoted && input[index + 1] === '"') {
        if (column < fields.length) fields[column] += '"';
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && char === delimiter) {
      column++;
    } else if (!quoted && (char === "\r" || char === "\n")) {
      const email = fields[1].trim();
      if (row > 1 && email) rows.push({ row, name: fields[0].trim(), email });
      if (char === "\r" && input[index + 1] === "\n") index++;
      row++;
      column = 0;
      fields = ["", ""];
    } else if (column < fields.length && row > 1) {
      fields[column] += char;
    }
  }
  if (quoted) throw new Error("The CSV file has an unclosed quoted field.");
  return rows;
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

function xlsxCellText(cell, strings) {
  if (!cell) return "";
  const type = cell.getAttribute("t");
  if (type === "inlineStr") {
    return descendants(cell, "t").map(node => node.textContent || "").join("").trim();
  }
  const raw = descendants(cell, "v")[0]?.textContent ?? "";
  return (type === "s" ? strings[Number.parseInt(raw, 10)] || "" : raw).trim();
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

async function xlsxEmailRows(buffer) {
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
  const rows = [];
  let rowNumber = 0;
  for (const row of descendants(worksheet, "row")) {
    const cells = descendants(row, "c");
    const firstCellRow = cells[0]?.getAttribute("r")?.match(/\d+$/)?.[0];
    rowNumber = Number(row.getAttribute("r") || firstCellRow) || rowNumber + 1;
    if (rowNumber === 1) continue;

    const emailCell = cells.find(cell => /^B\d+$/i.test(cell.getAttribute("r") || ""));
    const email = xlsxCellText(emailCell, strings);
    if (!email) continue;
    const nameCell = cells.find(cell => /^A\d+$/i.test(cell.getAttribute("r") || ""));
    rows.push({ row: rowNumber, name: xlsxCellText(nameCell, strings), email });
  }
  return rows;
}

/** Reads names from column A and email addresses from column B, starting at row 2. */
export async function readEmailRowsFromFile(file) {
  if (!file || file.size <= 0) throw new Error("Choose a non-empty Excel or CSV file.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Upload a file smaller than 5 MB.");
  const type = extension(file.name);
  if (type === "csv") return csvEmailRows(await file.text());
  if (type === "xlsx") return xlsxEmailRows(await file.arrayBuffer());
  throw new Error("Choose an .xlsx Excel workbook or a .csv file.");
}
