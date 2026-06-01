import ExcelJS from "exceljs";

export type ParsedSheet = {
  headers: string[];
  rows: string[][];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parseExcelBuffer(input: any): Promise<{
  headers: string[];
  rows: string[][];
}> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(input);

  const sheet = workbook.getWorksheet(1);
  if (!sheet) {
    return { headers: [], rows: [] };
  }

  const headers: string[] = [];
  const rows: string[][] = [];

  sheet.eachRow((row, rowIndex) => {
    const values = row.values as (string | number | Date | null | undefined)[];
    const rowData = values.map((v) => {
      if (v === null || v === undefined) return "";
      if (v instanceof Date) return v.toISOString().split("T")[0];
      return String(v).trim();
    });

    if (rowIndex === 1) {
      // Header row
      headers.push(...rowData);
    } else {
      // Skip empty rows
      if (rowData.some((v) => v !== "")) {
        rows.push(rowData);
      }
    }
  });

  return { headers, rows };
}

/**
 * Parse CSV/TSV/TXT text into headers + rows.
 * Auto-detects delimiter by checking first few lines.
 */
export function parseTextBuffer(rawText: string): ParsedSheet {
  // Normalize line endings
  const text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "").trim();
  const lines = text.split("\n").filter((l) => l.trim() !== "");

  if (lines.length === 0) return { headers: [], rows: [] };

  // Detect delimiter
  const firstLine = lines[0];
  const delimiter = detectDelimiter(firstLine);

  const headers = firstLine.split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ""));
  const rows = lines.slice(1).map((line) =>
    line.split(delimiter).map((v) => v.trim().replace(/^["']|["']$/g, ""))
  );

  return { headers, rows };
}

function detectDelimiter(line: string): string {
  const delimiters = [",", "\t", ";", "|"];
  let best = ",";
  let maxCount = 0;
  for (const d of delimiters) {
    const count = (line.match(new RegExp(`\\${d}`, "g")) ?? []).length;
    if (count > maxCount) {
      maxCount = count;
      best = d;
    }
  }
  return best;
}