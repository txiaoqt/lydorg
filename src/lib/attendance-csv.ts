import { parseCsv } from "@/lib/csv";

export interface AttendanceRecord {
  timestamp: string;
  name: string;
  email: string;
  raw: string[];
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findHeaderIndex(headers: string[], keywords: string[]): number {
  return headers.findIndex((header) => keywords.some((keyword) => header.includes(keyword)));
}

export function extractAttendanceRecords(csvText: string): AttendanceRecord[] {
  const normalizedText = csvText.trim().toLowerCase();
  if (
    normalizedText.includes("<!doctype html") ||
    normalizedText.includes("<html") ||
    normalizedText.includes("<head") ||
    normalizedText.includes("<body")
  ) {
    return [];
  }

  const rows = parseCsv(csvText);
  if (rows.length === 0) return [];

  const headerRow = rows[0].map(normalizeHeader);
  const sampleRow = rows[1] ?? [];

  let timestampIndex = findHeaderIndex(headerRow, ["timestamp", "time", "date"]);
  const emailIndex = findHeaderIndex(headerRow, ["email"]);
  let nameIndex = findHeaderIndex(headerRow, ["name", "full name"]);

  if (emailIndex < 0) {
    return [];
  }

  if (nameIndex < 0) {
    nameIndex = sampleRow.findIndex(
      (value, index) =>
        index !== timestampIndex &&
        index !== emailIndex &&
        value.trim() !== "" &&
        !value.includes("@"),
    );
  }

  if (timestampIndex < 0) timestampIndex = 0;

  return rows
    .slice(1)
    .filter((row) => row.some((value) => value.trim() !== ""))
    .map((row) => ({
      timestamp: row[timestampIndex] ?? "",
      name: row[nameIndex] ?? "",
      email: row[emailIndex] ?? "",
      raw: row,
    }));
}
