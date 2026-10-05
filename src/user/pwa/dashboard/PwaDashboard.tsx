import {
  CalendarDays, ChevronRight, FileText, ReceiptText, Sparkles, UserRound, WalletCards,
} from "lucide-react";
import { statusLabelMap } from "@/lib/lydo-connect-data";
import type { usePwaPortalData } from "../hooks/usePwaPortalData";
import { usePwaNavigation } from "../hooks/usePwaNavigation";
import { PWA_ROUTES } from "../pwaRoutes";
import { isUrnRegistration, urnReviewLabels } from "@/lib/urn-registration";
import { useRenewalClock } from "@/hooks/use-renewal-clock";
import { formatActivityActionLabel } from "@/components/activity/RecentActivityPreview";
import { formatEventTimestamp, getActivityMarker } from "@/components/portal/OrganizationActivityHistoryModal";

type PortalData = ReturnType<typeof usePwaPortalData>;

export default function PwaDashboard({ data }: { data: PortalData }) {
  const { go } = usePwaNavigation();
  const profileStatus = data.profile?.profileStatus === "verified"
    ? { text: "Verified", tone: "success" }
    : data.profile?.profileStatus === "pending_review"
      ? { text: "Under review", tone: "progress" }
      : data.profile?.profileStatus === "suspended_inactive"
        ? { text: "Inactive", tone: "danger" }
        : data.profilePercent < 100
          ? { text: "Needs completion", tone: "attention" }
          : { text: "Complete", tone: "neutral" };
  const documentStatus = data.revisionDocuments.length
    ? { text: `${data.revisionDocuments.length} need revision`, tone: "attention" }
    : data.underReviewDocuments
      ? { text: `${data.underReviewDocuments} under review`, tone: "progress" }
      : data.missingDocuments
        ? { text: `${data.missingDocuments} still missing`, tone: "attention" }
        : { text: data.requiredTemplates.length ? "Requirements complete" : "No requirements", tone: "success" };
  const budgetStatus = data.revisionBudgetRequestCount
    ? { text: `${data.revisionBudgetRequestCount} need revision`, tone: "attention" }
    : data.underReviewBudgetRequests
      ? { text: `${data.underReviewBudgetRequests} under review`, tone: "progress" }
      : data.releasedBudgetRequests
        ? { text: `${data.releasedBudgetRequests} released`, tone: "success" }
        : data.latestBudget?.status === "draft"
          ? { text: "Draft to finish", tone: "attention" }
          : { text: data.latestBudget ? statusLabelMap[data.latestBudget.status] : "No requests yet", tone: "neutral" };
  const liquidationStatus = data.overdueLiquidationCount
    ? { text: `${data.overdueLiquidationCount} overdue`, tone: "danger" }
    : data.revisionLiquidationCount
      ? { text: `${data.revisionLiquidationCount} need revision`, tone: "attention" }
      : data.underReviewLiquidations
        ? { text: `${data.underReviewLiquidations} under review`, tone: "progress" }
        : data.completedLiquidations
          ? { text: `${data.completedLiquidations} completed`, tone: "success" }
          : { text: data.liquidationCount ? "In progress" : "No reports yet", tone: "neutral" };
  const urnRegistration = isUrnRegistration(data.profile);
  const renewalDueDate = data.renewalCountdown
    ? new Date(data.renewalCountdown.expiresAt).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";
  const overview = [
    {
      label: "Profile",
      value: `${data.profilePercent}%`,
      descriptor: "Complete",
      status: profileStatus.text,
      tone: profileStatus.tone,
      icon: UserRound,
      path: PWA_ROUTES.profile,
    },
    urnRegistration ? {
      label: "Registration",
      value: "URN",
      descriptor: data.profile!.urn,
      status: urnReviewLabels[data.profile!.urnReviewStatus],
      tone: data.profile!.urnReviewStatus === "verified" ? "success" : data.profile!.urnReviewStatus === "rejected" ? "danger" : data.profile!.urnReviewStatus === "needs_correction" ? "attention" : "progress",
      icon: FileText,
      path: PWA_ROUTES.documents,
    } : {
      label: "Registration Requirements", value: `${data.documentPercent}%`,
      descriptor: `${data.approvedDocuments} of ${data.requiredTemplates.length} approved`, status: documentStatus.text, tone: documentStatus.tone,
      progress: data.documentPercent, icon: FileText, path: PWA_ROUTES.documents,
    },
    {
      label: "Budget",
      value: `${data.budgetPercent}%`,
      descriptor: data.budgetMetrics.helperText,
      status: data.budgetMetrics.overviewLabel,
      tone: budgetStatus.tone,
      icon: WalletCards,
      path: PWA_ROUTES.budgets,
    },
    {
      label: "Liquidation",
      value: `${data.liquidationPercent}%`,
      descriptor: data.liquidationMetrics.helperText,
      status: data.liquidationMetrics.overviewLabel,
      tone: liquidationStatus.tone,
      icon: ReceiptText,
      path: PWA_ROUTES.liquidations,
    },
  ];

  return (
    <div className="pwa-dashboard pwa-stack">
      <section className={`pwa-briefing pwa-briefing--${data.briefing.tone}`}>
        <div className="pwa-eyebrow"><Sparkles aria-hidden="true" /> Current Focus · Action Required</div>
        <div className="pwa-briefing-copy">
          <h2>{data.briefing.title}</h2>
          <p>{data.briefing.description}</p>
        </div>
        {data.briefing.action ? (
          <button type="button" className="pwa-briefing-action" onClick={() => go(data.briefing.action!.path)}>
            {data.briefing.action.label}<ChevronRight aria-hidden="true" />
          </button>
        ) : null}
      </section>

      <div className="pwa-section-heading"><h2 className="pwa-section-title">Overview</h2><button onClick={() => go(PWA_ROUTES.activity)}>Activity History</button></div>
      <section className="pwa-overview-grid" aria-label="Workflow overview">
        {overview.map(({ label, value, descriptor, status, tone, progress, icon: Icon, path }) => (
          <button key={label} type="button" className="pwa-overview-card" onClick={() => go(path)}>
            <span className="pwa-overview-heading">
              <span className="pwa-overview-icon"><Icon aria-hidden="true" /></span>
              <small>{label}</small>
            </span>
            <strong className="pwa-overview-value">{value}</strong>
            <span className="pwa-overview-descriptor">{descriptor}</span>
            {progress !== undefined ? <span className="pwa-overview-progress"><span style={{ width: `${progress}%` }} /></span> : null}
            <span className={`pwa-overview-status pwa-overview-status--${tone}`}>
              {status}
            </span>
          </button>
        ))}
      </section>

      {data.renewalCountdown ? (
        <PwaRenewalStrip expiresAt={data.renewalCountdown.expiresAt} dueDate={renewalDueDate} onOpen={() => go(PWA_ROUTES.renewal)} />
      ) : null}

      <section className="pwa-card pwa-dashboard-recommendations">
        <h2 className="pwa-section-title">Support &amp; Resources</h2>
        <p className="pwa-empty-copy">Official PCYDO communication, templates and updates.</p>
        <div className="pwa-action-grid">
          {[
            { title: "Support & Inquiries", detail: "Direct inquiries to PCYDO administrative staff.", path: PWA_ROUTES.inquiries, icon: UserRound },
            { title: "Official Templates", detail: "Download official registration forms and compliance documents.", path: PWA_ROUTES.templates, icon: FileText },
            { title: "News & Official Releases", detail: "PCYDO announcements and official updates.", path: PWA_ROUTES.news, icon: ReceiptText },
          ].map(({ title, detail, path, icon: Icon }) => <button type="button" key={path} onClick={() => go(path)}><span className="pwa-action-icon"><Icon aria-hidden="true" /></span><span><strong>{title}</strong><small>{detail}</small></span><ChevronRight aria-hidden="true" /></button>)}
        </div>
      </section>

      <section className="pwa-card pwa-dashboard-activity">
        <div className="pwa-section-heading">
          <h2 className="pwa-section-title">Recent Activity</h2>
          {data.activities.length > 3 ? <button type="button" onClick={() => go(PWA_ROUTES.activity)}>View all activity</button> : null}
        </div>
        <div className="pwa-activity-list">
          {data.activities.slice(0, 3).map((activity) => (
            <article key={activity.id}>
              <span className={`pwa-history-marker ${getActivityMarker(formatActivityActionLabel(activity.action || activity.description, activity.metadata as Record<string, unknown>)).dotClassName}`} aria-hidden="true" />
              <div><strong>{formatActivityActionLabel(activity.action || activity.description, activity.metadata as Record<string, unknown>)}</strong><time>{formatEventTimestamp(activity.createdAt)}</time></div>
            </article>
          ))}
          {!data.activities.length ? <p className="pwa-empty-copy">Recent organization updates will appear here.</p> : null}
        </div>
      </section>
    </div>
  );
}

function PwaRenewalStrip({ expiresAt, dueDate, onOpen }: { expiresAt: string; dueDate: string; onOpen: () => void }) {
  const clock = useRenewalClock(expiresAt);
  return (
    <button type="button" className="pwa-renewal-strip" onClick={onOpen}>
      <span className="pwa-overview-icon"><CalendarDays aria-hidden="true" /></span>
      <span className="pwa-renewal-copy">
        <small>Registration renewal</small>
        <strong>
          {clock.isDue
            ? "Renewal is due"
            : `Renewal in ${clock.days} days`}
        </strong>
        <span>Valid until {dueDate}</span>
      </span>
      <ChevronRight aria-hidden="true" />
    </button>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
