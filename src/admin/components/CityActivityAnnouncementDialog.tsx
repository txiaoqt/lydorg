import React, { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Megaphone,
  CalendarDays,
  MapPin,
  AlertCircle,
  Loader2,
  Send,
  Users,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  type YPOPCityActivity,
  formatActivityDateRange,
  resolveYpopCityLedCategory,
  YPOP_CITY_LED_CATEGORY_LABELS,
  normalizeYpopCityLedPoints,
} from "@/lib/lydo-connect-data";
import {
  adminPreflightCityActivityAnnouncement,
  adminSendCityActivityAnnouncement,
  type ActivityAnnouncementRecipient,
} from "@/lib/lydo-connect-supabase";
import { cn } from "@/lib/utils";

interface CityActivityAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: YPOPCityActivity | null;
  previousAnnouncement?: { status: string; recipientCount: number; sentAt?: string } | null;
  onAnnouncementSuccess: (
    activityId: string,
    result: { status: string; recipientCount: number; sentAt: string }
  ) => void;
}

const categoryPillClasses: Record<string, string> = {
  mandatory: "border-red-200 bg-red-50 text-red-700",
  invitational: "border-amber-200 bg-amber-50 text-amber-700",
  partnership: "border-blue-200 bg-blue-50 text-blue-700",
};

export const CityActivityAnnouncementDialog: React.FC<CityActivityAnnouncementDialogProps> = ({
  open,
  onOpenChange,
  activity,
  previousAnnouncement,
  onAnnouncementSuccess,
}) => {
  const [loadingPreflight, setLoadingPreflight] = useState(false);
  const [eligibleCount, setEligibleCount] = useState<number | null>(null);
  const [recipients, setRecipients] = useState<ActivityAnnouncementRecipient[]>([]);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !activity) {
      setEligibleCount(null);
      setRecipients([]);
      setPreflightError(null);
      setSending(false);
      return;
    }

    let isMounted = true;
    setLoadingPreflight(true);
    setPreflightError(null);

    adminPreflightCityActivityAnnouncement(activity.id)
      .then((res) => {
        if (!isMounted) return;
        const recs = res.recipients ?? [];
        setRecipients(recs);
        setEligibleCount(res.eligible_count ?? recs.length);
        setLoadingPreflight(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setPreflightError(
          err instanceof Error ? err.message : "Unable to load eligible recipients."
        );
        setLoadingPreflight(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, activity]);

  if (!activity) return null;

  const category = resolveYpopCityLedCategory(activity.category, activity.points);
  const points = normalizeYpopCityLedPoints(activity.points, activity.category);

  const handleSend = async () => {
    if (sending || !activity) return;
    setSending(true);

    try {
      const idempotencyKey = `announcement-${activity.id}-${Date.now()}`;
      const res = await adminSendCityActivityAnnouncement(activity.id, idempotencyKey);

      if (res.status === "sent") {
        toast({
          title: "Announcement broadcasted",
          description: `Successfully sent announcement to ${res.recipient_count} verified youth organizations via Brevo and created in-app notifications.`,
        });
        onAnnouncementSuccess(activity.id, {
          status: "sent",
          recipientCount: res.recipient_count,
          sentAt: new Date().toISOString(),
        });
        onOpenChange(false);
      } else if (res.status === "partial_failure") {
        toast({
          title: "Announcement partially sent",
          description: `Delivered to ${res.successful_count} organizations, but ${res.failed_count} deliveries failed.`,
          variant: "destructive",
        });
        onAnnouncementSuccess(activity.id, {
          status: "partial_failure",
          recipientCount: res.recipient_count,
          sentAt: new Date().toISOString(),
        });
        onOpenChange(false);
      } else {
        toast({
          title: "Announcement delivery note",
          description: res.error_message || "Announcement processing completed.",
        });
        onOpenChange(false);
      }
    } catch (err) {
      toast({
        title: "Announcement failed",
        description:
          err instanceof Error
            ? err.message
            : "An error occurred while sending the email announcement.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => (!sending ? onOpenChange(val) : undefined)}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-primary/10 text-primary shrink-0">
              <Megaphone className="h-4.5 w-4.5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold text-foreground">
                Send Activity Announcement
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate">
                Broadcast this official city-led activity via Brevo email and in-app notifications.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 flex-1 overflow-y-auto min-h-0 pr-0.5">
          {/* Activity Preview Card */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-sm text-foreground leading-snug">{activity.name}</p>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-segoe text-[11px] font-semibold",
                  categoryPillClasses[category] || "border-slate-200 bg-slate-50 text-slate-700"
                )}
              >
                {YPOP_CITY_LED_CATEGORY_LABELS[category] || category}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground/80" strokeWidth={1.5} />
                {formatActivityDateRange(activity.startDate, activity.endDate)}
              </span>
              {activity.venue ? (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground/80" strokeWidth={1.5} />
                  {activity.venue}
                </span>
              ) : null}
              <span className="font-medium text-foreground">{points} YPOP Points</span>
            </div>
          </div>

          {/* Target Recipients Section */}
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Users className="h-4 w-4 text-primary" strokeWidth={1.6} />
                Target Recipients
              </span>
              {loadingPreflight ? (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Calculating...
                </span>
              ) : eligibleCount !== null ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                  {eligibleCount} eligible {eligibleCount === 1 ? "organization" : "organizations"}
                </span>
              ) : null}
            </div>

            {/* State 1: Error */}
            {preflightError ? (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{preflightError}</span>
              </div>
            ) : loadingPreflight ? (
              /* State 2: Loading Skeletons */
              <div className="rounded-xl border border-border/70 bg-admin-surface divide-y divide-border/40 overflow-hidden">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 animate-pulse">
                    <div className="h-3 w-4 rounded bg-muted/80 shrink-0" />
                    <div className="h-3.5 w-40 rounded bg-muted" />
                    <span className="text-slate-300 select-none shrink-0">—</span>
                    <div className="h-3.5 w-32 rounded bg-muted/60" />
                  </div>
                ))}
              </div>
            ) : recipients.length === 0 ? (
              /* State 3: Empty (0 recipients) */
              <div className="flex flex-col items-center justify-center rounded-xl border border-border/70 bg-muted/10 p-6 text-center text-xs text-muted-foreground">
                <Users className="h-7 w-7 text-muted-foreground/40 mb-1.5" strokeWidth={1.5} />
                <p className="font-semibold text-foreground">No eligible organizations found.</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Only verified organizations with active accreditation can receive announcements.
                </p>
              </div>
            ) : (
              /* State 4: Actual Recipients List (default 5 visible viewport + scroll) */
              <div className="flex flex-col rounded-xl border border-border/80 bg-admin-surface overflow-hidden shadow-2xs">
                <div className="max-h-[195px] overflow-y-auto divide-y divide-border/60 overscroll-contain">
                  {recipients.map((rec, index) => (
                    <div
                      key={rec.organization_id || rec.organization_email || index}
                      className="flex items-center gap-2 px-3.5 py-2.5 text-xs transition-colors hover:bg-slate-50/80 min-w-0"
                    >
                      <span className="font-cascadia text-[11px] text-slate-400 w-4 shrink-0 text-right select-none">
                        {index + 1}.
                      </span>
                      <div className="min-w-0 flex-1 flex flex-wrap sm:flex-nowrap items-baseline gap-x-2 gap-y-0.5">
                        <span
                          className="font-semibold text-text-default truncate max-w-full"
                          title={rec.organization_name}
                        >
                          {rec.organization_name}
                        </span>
                        <span className="text-slate-300 select-none shrink-0 hidden sm:inline">—</span>
                        <span
                          className="text-text-muted font-normal text-[11.5px] truncate max-w-full font-mono text-slate-500"
                          title={rec.organization_email}
                        >
                          {rec.organization_email}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {recipients.length > 5 ? (
                  <div className="px-3.5 py-1.5 bg-slate-50 border-t border-border/60 text-[11px] text-slate-500 font-medium flex items-center justify-between">
                    <span>Showing 5 of {recipients.length} recipients visible</span>
                    <span className="text-slate-400">Scroll to view all ↓</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Previous Announcement Note */}
          {previousAnnouncement ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-800">Previously Broadcasted</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  An announcement was sent for this activity
                  {previousAnnouncement.sentAt ? ` on ${format(parseISO(previousAnnouncement.sentAt), "d MMM yyyy, h:mm a")}` : ""}
                  {" "}to {previousAnnouncement.recipientCount} organizations. Sending again will dispatch a fresh announcement.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row shrink-0 pt-2 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || loadingPreflight || !eligibleCount || eligibleCount === 0 || Boolean(preflightError)}
            className="w-full sm:w-auto gap-1.5"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sending Broadcast...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Send Announcement</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
