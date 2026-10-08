import {
  computeYpopScore, resolveYpopCityLedCategory, normalizeYpopCityLedPoints,
  YPOP_CITY_LED_CATEGORY_POINTS, YPOP_SCORE_THRESHOLD,
  type YPOPCityActivityCategory, type LydoSeedState, type OrganizationProfile,
  type YPOPPeriod, type YPOPEntry,
} from "./lydo-connect-data";

/** Shared drawer/report calculation. Only the selected open period is represented. */
export function buildRegistryYpopDetail(
  org: Pick<OrganizationProfile, "id"> | undefined,
  openPeriod: YPOPPeriod | null,
  openPeriodEntry: YPOPEntry | null,
  detailState: Partial<LydoSeedState> | undefined,
  state: Pick<LydoSeedState, "ypopCityActivities" | "ypopEventParticipations" | "ypopOrgActivities">,
) {
    if (!org) return null;

    if (!openPeriod) return null;

    const ypopEntry = openPeriodEntry;

    const semesterActivities = (detailState?.ypopCityActivities ?? state.ypopCityActivities).filter(
      (activity) => activity.semesterKey === openPeriod.semesterKey,
    );
    const semesterActivityIds = new Set(semesterActivities.map((activity) => activity.id));

    const orgParticipations = (detailState?.ypopEventParticipations ?? state.ypopEventParticipations)
      .filter((item) => item.organizationId === org.id && semesterActivityIds.has(item.activityId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const verifiedAttendance = semesterActivities.map((activity) => ({
      activityId: activity.id,
      attended: orgParticipations.some((item) => item.activityId === activity.id && item.status === "verified"),
    }));

    const orgActivities = ypopEntry
      ? (detailState?.ypopOrgActivities ?? state.ypopOrgActivities)
          .filter((activity) => activity.ypopEntryId === ypopEntry.id && activity.status === "approved")
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      : [];

    const score = computeYpopScore(verifiedAttendance, semesterActivities, orgActivities.length);

    const isQualified =
      ypopEntry?.status === "qualified"
        ? true
        : ypopEntry?.status === "not_qualified"
          ? false
          : score.totalScore >= (ypopEntry?.pointsRequired ?? YPOP_SCORE_THRESHOLD);

    const joinedActivities = orgParticipations.map((participation) => {
      const activity = semesterActivities.find((item) => item.id === participation.activityId);
      const category = resolveYpopCityLedCategory(activity?.category, activity?.points);
      const points = normalizeYpopCityLedPoints(activity?.points ?? 0, activity?.category);
      return { participation, category, points, activityDate: activity?.date };
    });

    const categoryBreakdown = (["mandatory", "invitational", "partnership"] as YPOPCityActivityCategory[])
      .map((category) => {
        const activitiesInCategory = semesterActivities.filter(
          (activity) => resolveYpopCityLedCategory(activity.category, activity.points) === category,
        );
        if (!activitiesInCategory.length) return null;
        const pointsPerActivity = YPOP_CITY_LED_CATEGORY_POINTS[category];
        const attendedCount = activitiesInCategory.filter((activity) =>
          verifiedAttendance.some((item) => item.activityId === activity.id && item.attended),
        ).length;
        return {
          category,
          count: activitiesInCategory.length,
          pointsPerActivity,
          attendedCount,
          earnedPts: attendedCount * pointsPerActivity,
          maxPts: activitiesInCategory.length * pointsPerActivity,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      percent: score.totalScore,
      cityLedPercent: score.cityLedPercent,
      cityLedEarned: score.cityLedEarned,
      cityLedMax: score.cityLedMax,
      orgLedBonus: score.orgLedBonus,
      totalScore: score.totalScore,
      approvedOrgActivityCount: orgActivities.length,
      isQualified,
      joinedActivities,
      orgActivities,
      categoryBreakdown,
    };
}
