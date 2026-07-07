export type ParsedAppVersion = {
  raw: string;
  release: string;
  buildTimestamp: string | null;
  buildDateLabel: string | null;
  commitSha: string | null;
  isLocalBuild: boolean;
};

const LOCAL_VERSION_FALLBACK = "1.0.0+local";
const BUILD_TIMESTAMP_PATTERN = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/;
const COMMIT_SHA_PATTERN = /^[0-9a-f]+$/i;
const buildDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const parseBuildDate = (timestamp: string) => {
  const match = BUILD_TIMESTAMP_PATTERN.exec(timestamp);
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  ) {
    return null;
  }

  return date;
};

export const parseAppVersion = (value?: string | null): ParsedAppVersion => {
  const raw = value?.trim() || LOCAL_VERSION_FALLBACK;
  const metadataSeparator = raw.indexOf("+");
  const releasePart = metadataSeparator >= 0 ? raw.slice(0, metadataSeparator) : raw;
  const metadataPart = metadataSeparator >= 0 ? raw.slice(metadataSeparator + 1).trim() : "";
  const release = releasePart.trim() || "1.0.0";
  const isLocalBuild = metadataPart.toLowerCase() === "local";

  if (!metadataPart || isLocalBuild) {
    return {
      raw,
      release,
      buildTimestamp: null,
      buildDateLabel: null,
      commitSha: null,
      isLocalBuild,
    };
  }

  const [timestampPart, ...commitParts] = metadataPart.split(".");
  const buildDate = parseBuildDate(timestampPart);
  const commitCandidate = commitParts.length === 1 ? commitParts[0].trim() : "";

  return {
    raw,
    release,
    buildTimestamp: buildDate ? timestampPart : null,
    buildDateLabel: buildDate ? buildDateFormatter.format(buildDate) : null,
    commitSha: buildDate && COMMIT_SHA_PATTERN.test(commitCandidate) ? commitCandidate : null,
    isLocalBuild: false,
  };
};
