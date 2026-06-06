export function normalizeGoogleSheetCsvUrl(urlValue: string): string | null {
  const raw = urlValue.trim();
  if (!raw) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.hostname !== "docs.google.com" || !parsed.pathname.includes("/spreadsheets/")) {
    return null;
  }

  const pathname = parsed.pathname;

  if (pathname.includes("/pubhtml")) {
    parsed.pathname = pathname.replace("/pubhtml", "/pub");
  } else if (!pathname.includes("/pub") && pathname.includes("/edit")) {
    parsed.pathname = pathname.replace("/edit", "/pub");
  }

  parsed.searchParams.set("output", "csv");
  return parsed.toString();
}

export function isGoogleFormUrl(urlValue: string): boolean {
  return /^https:\/\/(docs\.google\.com\/forms\/.+|forms\.gle\/.+)/i.test(urlValue.trim());
}

export function normalizeGoogleFormResponseUrl(urlValue: string): string | null {
  const raw = urlValue.trim();
  if (!raw) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.hostname !== "docs.google.com" || !parsed.pathname.includes("/forms/")) {
    return null;
  }

  let pathname = parsed.pathname.replace(/\/+$/, "");

  if (pathname.endsWith("/viewform")) {
    pathname = pathname.slice(0, -9);
  } else if (pathname.endsWith("/edit")) {
    pathname = pathname.slice(0, -5);
  } else if (pathname.endsWith("/formResponse")) {
    pathname = pathname.slice(0, -13);
  }

  parsed.pathname = `${pathname}/formResponse`;
  parsed.search = "";
  parsed.hash = "";

  return parsed.toString();
}
