import Papa from "papaparse";

export type ParsedCSV = {
  headers: string[];
  rows: string[][];
};

const MAX_ROWS_WARN = 10_000;
const MAX_ROWS_HARD = 50_000;

function stripBOM(s: string): string {
  return s.replace(/^﻿/, "");
}

function normalizePhone(phone: string): { normalized: string; original: string } {
  const trimmed = phone.trim();
  // Strip common formatting chars but keep digits and leading +
  const stripped = trimmed.replace(/[\s\-().[\]]/g, "");
  // If we ended up with mostly digits (with optional leading +), keep it
  if (/^\+?\d{7,15}$/.test(stripped)) {
    return { normalized: stripped, original: trimmed };
  }
  // Uncertain — preserve original, normalized = trimmed
  return { normalized: trimmed, original: trimmed };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function trimField(s: string): string {
  return s.trim();
}

export type ParseResult = {
  csv: ParsedCSV;
  totalRows: number;
  skippedRows: number;
  warnings: string[];
};

export function parseCSVWithLimits(
  text: string
): ParseResult {
  const clean = stripBOM(text);
  const warnings: string[] = [];

  const result = Papa.parse<string[]>(clean, {
    skipEmptyLines: true,
    delimitersToGuess: [",", ";", "\t", "|"],
  });

  const allRows = result.data;

  if (allRows.length === 0) {
    return { csv: { headers: [], rows: [] }, totalRows: 0, skippedRows: 0, warnings: ["Empty file"] };
  }

  const headers = (allRows[0] ?? []).map((h) => h.trim());
  const dataRows = allRows.slice(1);

  const totalRows = dataRows.length;
  const skippedRows = 0;

  if (totalRows > MAX_ROWS_HARD) {
    return {
      csv: { headers: [], rows: [] },
      totalRows: 0,
      skippedRows: 0,
      warnings: [`File has ${totalRows.toLocaleString()} rows. Maximum supported is ${MAX_ROWS_HARD.toLocaleString()}.`],
    };
  }

  if (totalRows > MAX_ROWS_WARN) {
    warnings.push(
      `Large file detected: ${totalRows.toLocaleString()} rows. Processing may be slow.`
    );
  }

  const rows: string[][] = dataRows.map((rawFields) =>
    rawFields.map((f) => trimField(f))
  );

  return { csv: { headers, rows }, totalRows, skippedRows, warnings };
}

/**
 * Parse a single CSV field, advancing the index pointer.
 * Handles quoted fields (commas inside quotes are content, "" → ")
 */
function parseField(s: string, start: number): { value: string; end: number } {
  let i = start;
  if (s[i] !== '"') {
    // Unquoted field — read until comma or end
    let value = "";
    while (i < s.length && s[i] !== ",") {
      value += s[i];
      i++;
    }
    return { value: trimField(value), end: i };
  }

  // Quoted field
  i++; // skip opening quote
  let value = "";
  while (i < s.length) {
    if (s[i] === '"') {
      if (i + 1 < s.length && s[i + 1] === '"') {
        // Escaped quote — add one quote and skip both
        value += '"';
        i += 2;
      } else if (i + 1 < s.length && s[i + 1] === ",") {
        // Closing quote followed by comma — end of field
        i += 2; // skip quote and comma
        return { value, end: i };
      } else if (i + 1 === s.length) {
        // Closing quote at end of string
        i++;
        return { value, end: i };
      } else {
        // Unexpected quote — treat as literal
        value += s[i];
        i++;
      }
    } else {
      value += s[i];
      i++;
    }
  }
  return { value, end: i };
}

/**
 * Parse one CSV row (line), returning an array of field values.
 * The row may or may not end with a trailing comma.
 */
function parseRow(line: string): string[] {
  if (line.length === 0) return [];

  const fields: string[] = [];
  let i = 0;

  while (i < line.length) {
    const { value, end } = parseField(line, i);
    fields.push(value);
    i = end;

    // Stop if we've consumed the whole string, or if the next char is a newline
    if (i >= line.length) break;
    // If we're not at a comma, we've likely finished parsing the last field
    if (line[i] !== ",") break;
    i++; // skip comma and move to next field
  }

  return fields;
}

/**
 * Parse CSV using the built-in RFC 4180 parser (used directly without PapaParse for direct parsing).
 * For use when PapaParse is not available.
 */
export function parseCSVDirect(text: string): ParsedCSV {
  const clean = text.replace(/\r\n?/g, "\n").replace(/^﻿/, "").trim();
  const lines = clean.split("\n");

  if (lines.length === 0) return { headers: [], rows: [] };
  if (lines.length === 1) return { headers: parseRow(lines[0]), rows: [] };

  const headers = parseRow(lines[0]);
  const rows: string[][] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue; // skip blank lines
    rows.push(parseRow(line));
  }

  return { headers, rows };
}

export { normalizePhone, normalizeEmail };
