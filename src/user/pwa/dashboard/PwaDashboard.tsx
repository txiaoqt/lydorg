import {
  AlertTriangle, CalendarDays, ChevronRight, FileText, ReceiptText, Sparkles, UserRound, WalletCards,
} from "lucide-react";
import { statusLabelMap } from "@/lib/lydo-connect-data";
import type { usePwaPortalData } from "../hooks/usePwaPortalData";
import { usePwaNavigation } from "../hooks/usePwaNavigation";
import { PWA_ROUTES } from "../pwaRoutes";
import { isUrnRegistration, urnReviewLabels } from "@/lib/urn-registration";
import { useRenewalClock } from "@/hooks/use-renewal-clock";

type PortalData = ReturnType<typeof usePwaPortalData>;

const actionIcons = {
  profile: UserRound,
  documents: FileText,
  budget: WalletCards,
  liquidation: ReceiptText,
} as const;

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
  const budgetStatus = data.revisionBudgetRequests.length
    ? { text: `${data.revisionBudgetRequests.length} need revision`, tone: "attention" }
    : data.underReviewBudgetRequests
      ? { text: `${data.underReviewBudgetRequests} under review`, tone: "progress" }
      : data.releasedBudgetRequests
        ? { text: `${data.releasedBudgetRequests} released`, tone: "success" }
        : data.latestBudget?.status === "draft"
          ? { text: "Draft to finish", tone: "attention" }
          : { text: data.latestBudget ? statusLabelMap[data.latestBudget.status] : "No requests yet", tone: "neutral" };
  const liquidationStatus = data.overdueLiquidations.length
    ? { text: `${data.overdueLiquidations.length} overdue`, tone: "danger" }
    : data.revisionLiquidations.length
      ? { text: `${data.revisionLiquidations.length} need revision`, tone: "attention" }
      : data.underReviewLiquidations
        ? { text: `${data.underReviewLiquidations} under review`, tone: "progress" }
        : data.completedLiquidations
          ? { text: `${data.completedLiquidations} completed`, tone: "success" }
          : { text: data.liquidationReports.length ? "In progress" : "No reports yet", tone: "neutral" };
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
      label: "Documents", value: `${data.approvedDocuments} of ${data.requiredTemplates.length}`,
      descriptor: "Approved", status: documentStatus.text, tone: documentStatus.tone,
      progress: data.documentPercent, icon: FileText, path: PWA_ROUTES.documents,
    },
    {
      label: "Budget",
      value: String(data.budgetRequests.length),
      descriptor: data.budgetRequests.length === 1 ? "Request" : "Requests",
      status: budgetStatus.text,
      tone: budgetStatus.tone,
      icon: WalletCards,
      path: PWA_ROUTES.budgets,
    },
    {
      label: "Liquidation",
      value: `${data.completedLiquidations} of ${data.liquidationReports.length}`,
      descriptor: "Completed",
      status: liquidationStatus.text,
      tone: liquidationStatus.tone,
      icon: ReceiptText,
      path: PWA_ROUTES.liquidations,
    },
  ];

  return (
    <div className="pwa-dashboard pwa-stack">
      <section className={`pwa-briefing pwa-briefing--${data.briefing.tone}`}>
        <div className="pwa-eyebrow"><Sparkles aria-hidden="true" /> Today&apos;s Briefing</div>
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
        <PwaRenewalStrip expiresAt={data.renewalCountdown.expiresAt} dueDate={renewalDueDate} onOpen={() => go(PWA_ROUTES.profile)} />
      ) : null}

      {data.actions.length ? (
        <section className="pwa-card pwa-dashboard-recommendations">
          <h2 className="pwa-section-title">Recommended Next Steps</h2>
          <div className="pwa-action-grid">
            {data.actions.map((action) => {
              const Icon = actionIcons[action.kind as keyof typeof actionIcons] ?? AlertTriangle;
              return (
                <button key={`${action.path}-${action.title}`} type="button" onClick={() => go(action.path)}>
                  <span className="pwa-action-icon"><Icon aria-hidden="true" /></span>
                  <span><strong>{action.title}</strong><small>{action.detail}</small></span>
                  <ChevronRight aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="pwa-card pwa-dashboard-activity">
        <div className="pwa-section-heading">
          <h2 className="pwa-section-title">Recent Activity</h2>
          {data.activities.length > 3 ? <button type="button" onClick={() => go(PWA_ROUTES.activity)}>View all activity</button> : null}
        </div>
        <div className="pwa-activity-list">
          {data.activities.slice(0, 3).map((activity) => (
            <article key={activity.id}>
              <span className="pwa-activity-marker" aria-hidden="true" />
              <div><strong>{activity.description}</strong><time>{formatDate(activity.createdAt)}</time></div>
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
            : `${clock.days}d ${String(clock.hours).padStart(2, "0")}h ${String(clock.minutes).padStart(2, "0")}m ${String(clock.seconds).padStart(2, "0")}s`}
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
