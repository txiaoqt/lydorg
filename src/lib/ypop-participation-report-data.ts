import { readAdminSession } from "./admin-auth";
import {
  fetchAdminRegistrationDetail,
  fetchAdminYorpRegistryYpopDetail,
  fetchAdminYpopEntryReviewDetail,
  fetchAdminYpopPeriodSubmissionPage,
  fetchAdminYpopValidationPeriods,
  type AdminYpopSubmissionRow,
} from "./lydo-connect-supabase";
import type { YpopParticipationFilters, YpopParticipationSource } from "./ypop-participation-report";

/** An explicit export reads every page; it never materializes virtual entries or fetches document bodies. */
export async function loadYpopParticipationReport(periodId: string, filters: YpopParticipationFilters) {
  const token = readAdminSession()?.sessionToken;
  if (!token) throw new Error("Please sign in to export the participation report.");
  const assertSession = () => {
    const session = readAdminSession();
    const expires = session?.expiresAt ? Date.parse(session.expiresAt) : Number.NaN;
    if (session?.sessionToken !== token || !Number.isFinite(expires) || expires <= Date.now()) {
      throw new Error("The Admin session changed or expired. No report was downloaded.");
    }
  };
  assertSession();
  const period = (await fetchAdminYpopValidationPeriods()).find(item => item.period.id === periodId)?.period;
  assertSession();
  if (!period) throw new Error("The selected YPOP semester is no longer available.");
  const submissions: AdminYpopSubmissionRow[] = [];
  const organizations = new Set<string>();
  let expectedCount: number | undefined;
  for (let page = 0; ; page++) {
    assertSession();
    const result = await fetchAdminYpopPeriodSubmissionPage({ periodId, page, pageSize: 50, search: filters.search,
      classification: filters.classification, status: filters.status });
    assertSession();
    expectedCount ??= result.totalCount;
    if (!Number.isSafeInteger(expectedCount) || expectedCount < 0 || expectedCount > 10000 || result.totalCount !== expectedCount
      || result.page !== page || result.pageSize !== 50 || result.rows.length !== Math.min(50, expectedCount - submissions.length)) {
      throw new Error("The YPOP submission list changed or is incomplete. No partial report was downloaded.");
    }
    for (const row of result.rows) {
      if (organizations.has(row.organizationId) || !["pending_evaluation", "qualified", "not_qualified"].includes(row.status)) {
        throw new Error("The YPOP submission list contains duplicate or invalid records. No report was downloaded.");
      }
      organizations.add(row.organizationId);
      submissions.push(row);
    }
    if (submissions.length === expectedCount) break;
  }

  const sources: YpopParticipationSource[] = [];
  // Keep concurrent requests bounded and independent of the currently visible table page.
  for (let offset = 0; offset < submissions.length; offset += 4) {
    assertSession();
    const batch = await Promise.all(submissions.slice(offset, offset + 4).map(async row => {
      const virtual = row.id.startsWith("virtual-");
      const detail = virtual
        ? await fetchAdminYorpRegistryYpopDetail(row.organizationId, period.semesterKey)
        : await fetchAdminYpopEntryReviewDetail(row.id);
      assertSession();
      const organization = (virtual ? (await fetchAdminRegistrationDetail(row.organizationId)).organizationProfiles : detail.organizationProfiles)
        ?.find(item => item.id === row.organizationId);
      assertSession();
      const entry = detail.ypopEntries?.find(item => item.id === row.id);
      if (!organization || (!virtual && (!entry || entry.organizationId !== row.organizationId || entry.semester !== period.semesterKey))
        || !Array.isArray(detail.ypopCityActivities) || !Array.isArray(detail.ypopEventParticipations) || !Array.isArray(detail.ypopOrgActivities)) {
        throw new Error("A YPOP organization or its scoring details are incomplete. No partial report was downloaded.");
      }
      return { organization, entry, cityActivities: detail.ypopCityActivities, participations: detail.ypopEventParticipations,
        orgActivities: detail.ypopOrgActivities, status: row.status } satisfies YpopParticipationSource;
    }));
    assertSession();
    sources.push(...batch);
  }
  return { period, sources, assertSession };
}
