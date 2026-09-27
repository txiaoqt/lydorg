import type {
  BudgetRequest,
  OrganizationProfile,
  YPOPEntry,
  YPOPOrgActivity,
  YPOPPeriod,
} from "./lydo-connect-data";

export type YorpSemesterOption = {
  key: string;
  id?: string;
  label: string;
  year?: number;
  semesterNumber?: 1 | 2;
  startDate?: Date;
  endDate?: Date;
  periodId?: string;
  semesterKey?: string;
};

export const ALL_SEMESTERS_KEY = "all";
export const ALL_SEMESTERS_LABEL = "All Semesters";

/**
 * Derives canonical semester information from a given date string, Date object, or timestamp.
 * 1st Semester: January 1 – June 30
 * 2nd Semester: July 1 – December 31
 */
export const deriveSemesterFromDate = (
  dateLike?: string | Date | null,
): {
  year: number;
  semesterNumber: 1 | 2;
  semesterKey: string;
  semesterLabel: string;
  startDate: Date;
  endDate: Date;
} | null => {
  if (!dateLike) return null;
  const d = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
  if (Number.isNaN(d.getTime())) return null;

  const year = d.getFullYear();
  const month = d.getMonth(); // 0 to 11
  const semesterNumber: 1 | 2 = month <= 5 ? 1 : 2;
  const semesterKey = `${year}-${semesterNumber}`;
  const semesterLabel = `${year} ${semesterNumber === 1 ? "1st" : "2nd"} Semester`;
  const startDate = new Date(year, semesterNumber === 1 ? 0 : 6, 1, 0, 0, 0, 0);
  const endDate = new Date(
    year,
    semesterNumber === 1 ? 5 : 11,
    semesterNumber === 1 ? 30 : 31,
    23,
    59,
    59,
    999,
  );

  return {
    year,
    semesterNumber,
    semesterKey,
    semesterLabel,
    startDate,
    endDate,
  };
};

/**
 * Normalizes semester label to standard format: "YYYY [1st/2nd] Semester".
 */
export const normalizeSemesterLabel = (label: string, yearHint?: number): string => {
  const trimmed = label.trim();
  const yearMatch = trimmed.match(/\b(20\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : yearHint || new Date().getFullYear();

  if (/first|1st|\b1\b/i.test(trimmed)) {
    return `${year} 1st Semester`;
  }
  if (/second|2nd|\b2\b/i.test(trimmed)) {
    return `${year} 2nd Semester`;
  }
  return trimmed || `${year} 1st Semester`;
};

/**
 * Builds dynamically loaded and sorted semester options from existing YPOPPeriod records
 * and organization profiles.
 */
export const buildYorpSemesterOptions = (
  periods: YPOPPeriod[] = [],
  orgs: OrganizationProfile[] = [],
): YorpSemesterOption[] => {
  const optionsMap = new Map<string, YorpSemesterOption>();

  // 1. Ingest authoritative periods from YPOP periods table
  for (const period of periods) {
    let year = new Date().getFullYear();
    let semesterNumber: 1 | 2 = 1;

    const parsedFromLabel = period.semesterLabel?.match(/\b(20\d{2})\b/);
    if (parsedFromLabel) {
      year = Number(parsedFromLabel[1]);
      semesterNumber = /second|2nd|\b2\b/i.test(period.semesterLabel) ? 2 : 1;
    } else if (period.semesterKey) {
      const keyMatch = period.semesterKey.match(/(20\d{2})[-_]?([12])/);
      if (keyMatch) {
        year = Number(keyMatch[1]);
        semesterNumber = keyMatch[2] === "2" ? 2 : 1;
      }
    } else if (period.createdAt) {
      const derived = deriveSemesterFromDate(period.createdAt);
      if (derived) {
        year = derived.year;
        semesterNumber = derived.semesterNumber;
      }
    }

    const canonicalKey = `${year}-${semesterNumber}`;
    const canonicalLabel = `${year} ${semesterNumber === 1 ? "1st" : "2nd"} Semester`;
    const startDate = new Date(year, semesterNumber === 1 ? 0 : 6, 1, 0, 0, 0, 0);
    const endDate = new Date(
      year,
      semesterNumber === 1 ? 5 : 11,
      semesterNumber === 1 ? 30 : 31,
      23,
      59,
      59,
      999,
    );

    if (!optionsMap.has(canonicalKey)) {
      optionsMap.set(canonicalKey, {
        id: canonicalKey,
        key: canonicalKey,
        label: canonicalLabel,
        year,
        semesterNumber,
        startDate,
        endDate,
        periodId: period.id,
        semesterKey: period.semesterKey,
      });
    }
  }

  // 2. Discover semesters from registered organization profiles
  for (const org of orgs) {
    const rawDate = org.accreditationStartDate || org.verifiedAt || org.createdAt;
    if (rawDate) {
      const derived = deriveSemesterFromDate(rawDate);
      if (derived && !optionsMap.has(derived.semesterKey)) {
        optionsMap.set(derived.semesterKey, {
          id: derived.semesterKey,
          key: derived.semesterKey,
          label: derived.semesterLabel,
          year: derived.year,
          semesterNumber: derived.semesterNumber,
          startDate: derived.startDate,
          endDate: derived.endDate,
        });
      }
    } else if (org.yorpRegisteredYear) {
      const year = org.yorpRegisteredYear;
      for (const semNum of [1, 2] as const) {
        const canonicalKey = `${year}-${semNum}`;
        if (!optionsMap.has(canonicalKey)) {
          optionsMap.set(canonicalKey, {
            id: canonicalKey,
            key: canonicalKey,
            label: `${year} ${semNum === 1 ? "1st" : "2nd"} Semester`,
            year,
            semesterNumber: semNum,
            startDate: new Date(year, semNum === 1 ? 0 : 6, 1, 0, 0, 0, 0),
            endDate: new Date(year, semNum === 1 ? 5 : 11, semNum === 1 ? 30 : 31, 23, 59, 59, 999),
          });
        }
      }
    }
  }

  // Always ensure current year semesters are present
  const currentYear = new Date().getFullYear();
  for (const semNum of [1, 2] as const) {
    const canonicalKey = `${currentYear}-${semNum}`;
    if (!optionsMap.has(canonicalKey)) {
      optionsMap.set(canonicalKey, {
        id: canonicalKey,
        key: canonicalKey,
        label: `${currentYear} ${semNum === 1 ? "1st" : "2nd"} Semester`,
        year: currentYear,
        semesterNumber: semNum,
        startDate: new Date(currentYear, semNum === 1 ? 0 : 6, 1, 0, 0, 0, 0),
        endDate: new Date(currentYear, semNum === 1 ? 5 : 11, semNum === 1 ? 30 : 31, 23, 59, 59, 999),
      });
    }
  }

  // Sort descending: newest year first, 2nd semester before 1st semester
  const sortedOptions = Array.from(optionsMap.values()).sort((a, b) => {
    if ((a.year || 0) !== (b.year || 0)) {
      return (b.year || 0) - (a.year || 0);
    }
    return (b.semesterNumber || 0) - (a.semesterNumber || 0);
  });

  return [
    {
      id: ALL_SEMESTERS_KEY,
      key: ALL_SEMESTERS_KEY,
      label: ALL_SEMESTERS_LABEL,
    },
    ...sortedOptions,
  ];
};

/**
 * Builds dynamically loaded and sorted semester options for Budget Requests,
 * taking into account YPOP periods, budget request dates, and organization profiles.
 */
export const buildBudgetSemesterOptions = (
  periods: YPOPPeriod[] = [],
  budgetRequests: BudgetRequest[] = [],
  orgs: OrganizationProfile[] = [],
  ypopEntries: YPOPEntry[] = [],
): YorpSemesterOption[] => {
  const baseOptions = buildYorpSemesterOptions(periods, orgs);
  const optionsMap = new Map<string, YorpSemesterOption>();

  for (const opt of baseOptions) {
    if (opt.key !== ALL_SEMESTERS_KEY) {
      optionsMap.set(opt.key, opt);
    }
  }

  // Ingest any semesters referenced by YPOP entries
  for (const entry of ypopEntries) {
    if (entry.semester) {
      const keyMatch = entry.semester.match(/(20\d{2})[-_]?([12])/);
      if (keyMatch) {
        const year = Number(keyMatch[1]);
        const semNum = keyMatch[2] === "2" ? 2 : 1;
        const canonicalKey = `${year}-${semNum}`;
        if (!optionsMap.has(canonicalKey)) {
          optionsMap.set(canonicalKey, {
            key: canonicalKey,
            label: `${year} ${semNum === 1 ? "1st" : "2nd"} Semester`,
            year,
            semesterNumber: semNum,
            startDate: new Date(year, semNum === 1 ? 0 : 6, 1, 0, 0, 0, 0),
            endDate: new Date(year, semNum === 1 ? 5 : 11, semNum === 1 ? 30 : 31, 23, 59, 59, 999),
          });
        }
      }
    }
  }

  // Ingest any semesters referenced by Budget Requests
  for (const req of budgetRequests) {
    if (req.ypopEntryId) {
      const entry = ypopEntries.find((e) => e.id === req.ypopEntryId);
      if (entry?.semester) {
        const keyMatch = entry.semester.match(/(20\d{2})[-_]?([12])/);
        if (keyMatch) {
          const year = Number(keyMatch[1]);
          const semNum = keyMatch[2] === "2" ? 2 : 1;
          const canonicalKey = `${year}-${semNum}`;
          if (!optionsMap.has(canonicalKey)) {
            optionsMap.set(canonicalKey, {
              key: canonicalKey,
              label: `${year} ${semNum === 1 ? "1st" : "2nd"} Semester`,
              year,
              semesterNumber: semNum,
              startDate: new Date(year, semNum === 1 ? 0 : 6, 1, 0, 0, 0, 0),
              endDate: new Date(year, semNum === 1 ? 5 : 11, semNum === 1 ? 30 : 31, 23, 59, 59, 999),
            });
          }
        }
      }
    }

    const rawDate = req.activityDate || req.createdAt;
    if (rawDate) {
      const derived = deriveSemesterFromDate(rawDate);
      if (derived && !optionsMap.has(derived.semesterKey)) {
        optionsMap.set(derived.semesterKey, {
          key: derived.semesterKey,
          label: derived.semesterLabel,
          year: derived.year,
          semesterNumber: derived.semesterNumber,
          startDate: derived.startDate,
          endDate: derived.endDate,
        });
      }
    } else if (req.fiscalYear) {
      const year = req.fiscalYear;
      for (const semNum of [1, 2] as const) {
        const canonicalKey = `${year}-${semNum}`;
        if (!optionsMap.has(canonicalKey)) {
          optionsMap.set(canonicalKey, {
            key: canonicalKey,
            label: `${year} ${semNum === 1 ? "1st" : "2nd"} Semester`,
            year,
            semesterNumber: semNum,
            startDate: new Date(year, semNum === 1 ? 0 : 6, 1, 0, 0, 0, 0),
            endDate: new Date(year, semNum === 1 ? 5 : 11, semNum === 1 ? 30 : 31, 23, 59, 59, 999),
          });
        }
      }
    }
  }

  // Sort descending: newest year first, 2nd semester before 1st semester
  const sortedOptions = Array.from(optionsMap.values()).sort((a, b) => {
    if ((a.year || 0) !== (b.year || 0)) {
      return (b.year || 0) - (a.year || 0);
    }
    return (b.semesterNumber || 0) - (a.semesterNumber || 0);
  });

  return [
    {
      id: ALL_SEMESTERS_KEY,
      key: ALL_SEMESTERS_KEY,
      label: ALL_SEMESTERS_LABEL,
    },
    ...sortedOptions,
  ];
};

/**
 * Determines whether an organization record belongs to the selected semester.
 */
export const isOrganizationInSemester = (
  org: OrganizationProfile,
  selectedSemesterKey: string,
  semesterOptions: YorpSemesterOption[],
  ypopEntries: YPOPEntry[] = [],
): boolean => {
  if (!selectedSemesterKey || selectedSemesterKey === ALL_SEMESTERS_KEY) {
    return true;
  }

  const option = semesterOptions.find((opt) => opt.key === selectedSemesterKey);
  if (!option || !option.startDate || !option.endDate || !option.year) {
    return true;
  }

  // 1. Direct YPOP entry semester check
  const matchingYpopEntry = ypopEntries.find(
    (e) =>
      e.organizationId === org.id &&
      (e.semester === option.semesterKey ||
        e.semester === option.key ||
        e.semester === selectedSemesterKey ||
        normalizeSemesterLabel(e.semesterLabel || "", option.year) === option.label),
  );
  if (matchingYpopEntry) {
    return true;
  }

  // 2. Organization Registration / Accreditation Date check
  const rawDate = org.accreditationStartDate || org.verifiedAt || org.createdAt;
  if (rawDate) {
    const regDate = new Date(rawDate);
    if (!Number.isNaN(regDate.getTime())) {
      return regDate >= option.startDate && regDate <= option.endDate;
    }
  }

  // 3. Fallback for legacy records with year only (when no timestamp is available)
  if (org.yorpRegisteredYear === option.year || org.yorpRenewedYear === option.year) {
    return true;
  }

  return false;
};

/**
 * Determines whether a Budget Request record belongs to the selected semester.
 */
export const isBudgetRequestInSemester = (
  request: BudgetRequest,
  selectedSemesterKey: string,
  semesterOptions: YorpSemesterOption[],
  ypopEntries: YPOPEntry[] = [],
  ypopOrgActivities: YPOPOrgActivity[] = [],
): boolean => {
  if (!selectedSemesterKey || selectedSemesterKey === ALL_SEMESTERS_KEY) {
    return true;
  }

  const option = semesterOptions.find((opt) => opt.key === selectedSemesterKey);
  if (!option || !option.startDate || !option.endDate || !option.year) {
    return true;
  }

  // 1. Direct YPOP entry link
  if (request.ypopEntryId) {
    const entry = ypopEntries.find((e) => e.id === request.ypopEntryId);
    if (entry) {
      if (
        entry.semester === option.semesterKey ||
        entry.semester === option.key ||
        entry.semester === selectedSemesterKey ||
        normalizeSemesterLabel(entry.semesterLabel || "", option.year) === option.label
      ) {
        return true;
      }
    }
  }

  // 2. Organization Activity title matching linked to a YPOP entry
  if (request.activityTitle) {
    const matchingActivity = ypopOrgActivities.find(
      (a) =>
        a.organizationId === request.organizationId &&
        a.activityTitle?.trim().toLowerCase() === request.activityTitle?.trim().toLowerCase(),
    );
    if (matchingActivity?.ypopEntryId) {
      const entry = ypopEntries.find((e) => e.id === matchingActivity.ypopEntryId);
      if (entry) {
        if (
          entry.semester === option.semesterKey ||
          entry.semester === option.key ||
          entry.semester === selectedSemesterKey ||
          normalizeSemesterLabel(entry.semesterLabel || "", option.year) === option.label
        ) {
          return true;
        }
      }
    }
  }

  // 3. Activity date or createdAt falling into semester date range
  const rawDate = request.activityDate || request.createdAt;
  if (rawDate) {
    const actDate = new Date(rawDate);
    if (!Number.isNaN(actDate.getTime())) {
      const inDateRange = actDate >= option.startDate && actDate <= option.endDate;
      if (inDateRange) {
        return true;
      }
    }
  }

  // 4. Fiscal year fallback
  if (request.fiscalYear && request.fiscalYear === option.year) {
    if (rawDate) {
      const derived = deriveSemesterFromDate(rawDate);
      if (derived && derived.semesterNumber === option.semesterNumber) {
        return true;
      }
    } else {
      return true;
    }
  }

  return false;
};
