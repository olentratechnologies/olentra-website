/**
 * Quotes one CSV cell. A leading =, +, -, @, tab or carriage return makes
 * spreadsheet apps treat the cell as a formula, so such values get a leading
 * apostrophe and are always read as text.
 */
export function csvCell(value) {
  const text = String(value ?? "");
  return `"${(/^[=+\-@\t\r]/.test(text) ? "'" : "") + text.replaceAll('"', '""')}"`;
}
