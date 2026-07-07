import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/portal/StatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchMyYouthTickets,
  fetchTicketTypeOptions,
  submitYouthTicket,
  type TicketTypeOption,
} from "@/lib/data-api";

type TicketStatus = "received" | "in_progress" | "resolved" | "closed";
type TicketViewFilter = "recent" | TicketStatus;

type YouthTicketItem = {
  id: string;
  referenceNo: string;
  type: string;
  subject: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
};

const ticketFilterOptions: Array<{ value: TicketViewFilter; label: string }> = [
  { value: "recent", label: "Recent" },
  { value: "in_progress", label: "Ongoing" },
  { value: "resolved", label: "Resolved" },
  { value: "received", label: "Received" },
  { value: "closed", label: "Closed" },
];

const formatStatus = (value: TicketStatus | string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function YouthDesk() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const profileEmail = user?.email ?? "";

  const [ticketOptions, setTicketOptions] = useState<TicketTypeOption[]>([]);
  const [tickets, setTickets] = useState<YouthTicketItem[]>([]);
  const [type, setType] = useState<TicketTypeOption | "">("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(profileEmail);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitEmailEditable, setIsSubmitEmailEditable] = useState(!isAuthenticated);
  const [ticketFilter, setTicketFilter] = useState<TicketViewFilter>("recent");
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && profileEmail) {
      setEmail(profileEmail);
      setIsSubmitEmailEditable(false);
      return;
    }

    if (isAuthenticated && !profileEmail) {
      setIsSubmitEmailEditable(true);
      return;
    }

    if (!isAuthenticated) {
      setEmail("");
      setIsSubmitEmailEditable(true);
      setLastSyncedAt(null);
    }
  }, [isAuthenticated, profileEmail]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      const options = await fetchTicketTypeOptions();
      if (!mounted) return;
      setTicketOptions(options);
      setType((current) => (current && options.includes(current) ? current : options[0] ?? ""));

      if (isAuthenticated && user?.id) {
        const myTickets = await fetchMyYouthTickets(user.id);
        if (!mounted) return;
        setTickets(
          myTickets.map((ticket) => ({
            id: ticket.id,
            referenceNo: ticket.referenceNo,
            type: ticket.type,
            subject: ticket.subject,
            status: ticket.status as TicketStatus,
            createdAt: ticket.createdAt,
            updatedAt: ticket.updatedAt,
          })),
        );
        setLastSyncedAt(new Date().toISOString());
      } else {
        setTickets([]);
      }
      setIsLoading(false);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    let mounted = true;
    const refreshMyTickets = async () => {
      setIsSyncing(true);
      const myTickets = await fetchMyYouthTickets(user.id);
      if (!mounted) return;
      setTickets(
        myTickets.map((ticket) => ({
          id: ticket.id,
          referenceNo: ticket.referenceNo,
          type: ticket.type,
          subject: ticket.subject,
          status: ticket.status as TicketStatus,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
        })),
      );
      setIsSyncing(false);
      setLastSyncedAt(new Date().toISOString());
    };

    void refreshMyTickets();
    const intervalId = window.setInterval(() => {
      void refreshMyTickets();
    }, 10000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, user?.id]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAuthenticated) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to submit a ticket.",
      });
      return;
    }

    if (!type) {
      toast({
        title: "Missing Ticket Type",
        description: "No ticket type is configured in Supabase yet.",
      });
      return;
    }

    if (!subject.trim() || !message.trim() || !email.trim()) {
      toast({
        title: "Missing Required Details",
        description: "Request type, subject, email, and details are required.",
      });
      return;
    }

    setIsSubmitConfirmOpen(true);
  };

  const proceedSubmitTicket = async () => {
    if (!type) return;

    setIsSubmitting(true);
    try {
      const created = await submitYouthTicket({
        type,
        subject: subject.trim(),
        message: message.trim(),
        email: email.trim(),
        userId: user?.id ?? null,
      });

      const item: YouthTicketItem = {
        id: created.id,
        referenceNo: created.reference_no,
        type,
        subject: subject.trim(),
        status: created.status as TicketStatus,
        createdAt: created.created_at,
        updatedAt: created.updated_at,
      };

      setTickets((prev) => [item, ...prev].slice(0, 10));
      setTicketFilter("recent");
      setLastSyncedAt(new Date().toISOString());
      toast({
        title: "Ticket Submitted",
        description: `Your reference number is ${created.reference_no}.`,
      });
      setIsSubmitConfirmOpen(false);
      setSubject("");
      setMessage("");
      if (!isAuthenticated) setEmail("");
      setType(ticketOptions[0] ?? "");
    } catch (error) {
      setIsSubmitConfirmOpen(false);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Unable to submit ticket right now.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTickets = useMemo(() => {
    if (ticketFilter === "recent") {
      return [...tickets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    return tickets.filter((ticket) => ticket.status === ticketFilter);
  }, [ticketFilter, tickets]);

  const activeFilterLabel = ticketFilterOptions.find((filterOption) => filterOption.value === ticketFilter)?.label ?? "Recent";
  const formLocked = !isAuthenticated;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <div className="pt-16">
        <PageHero
          title="Youth Desk (FOI / Ugnayan)"
          description="File information requests, complaints, suggestions, and service requests linked to your account."
          sectionClassName=""
          titleClassName=""
          descriptionClassName=""
        />

        <section className="container mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
          <div className="grid gap-4 sm:gap-6 items-stretch lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <form onSubmit={handleSubmit} className="bg-card border rounded-2xl p-4 sm:p-5 lg:p-6 card-shadow h-auto lg:h-[42rem] flex flex-col">
            <div className="mb-3 sm:mb-4 space-y-1">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">Submit Ticket</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Provide complete details so your concern can be processed faster.
              </p>
            </div>

            {formLocked ? (
              <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-muted-foreground">
                Sign in first to fill out and submit an FOI / Ugnayan ticket.
              </div>
            ) : null}

            {ticketOptions.length === 0 && (
              <p className="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
                No ticket types found. Insert rows into `ticket_types` first.
              </p>
            )}

            <div className="space-y-3.5 sm:space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Request Type</label>
                <Select value={type} onValueChange={(value: TicketTypeOption) => setType(value)} disabled={formLocked}>
                  <SelectTrigger className="h-11 rounded-lg" disabled={formLocked}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ticketOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Subject</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className="h-11 rounded-lg"
                  disabled={formLocked}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isAuthenticated && Boolean(profileEmail) && !isSubmitEmailEditable}
                  required
                  className="h-11 rounded-lg"
                />
                {isAuthenticated && profileEmail && (
                  <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <span className="leading-relaxed">
                      {isSubmitEmailEditable
                        ? "Using a custom ticket email for this submission."
                        : "Using your profile email by default for this ticket."}
                    </span>
                    {isSubmitEmailEditable ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-md"
                        onClick={() => {
                          setEmail(profileEmail);
                          setIsSubmitEmailEditable(false);
                        }}
                      >
                        Use Profile Email
                      </Button>
                    ) : (
                      <Button type="button" variant="outline" size="sm" className="h-8 rounded-md" onClick={() => setIsSubmitEmailEditable(true)}>
                        Use Different Email
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Details</label>
                <Textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  className="min-h-[132px] rounded-lg"
                  disabled={formLocked}
                />
              </div>
            </div>

            <div className="mt-5 sm:mt-6 lg:mt-auto lg:pt-6">
              <Button type="submit" disabled={ticketOptions.length === 0 || !isAuthenticated} className="h-12 w-full rounded-lg sm:w-auto">
                Submit Ticket
              </Button>
              {!isAuthenticated ? (
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Sign in to enable ticket submission.
                </p>
              ) : null}
            </div>
          </form>

          <div className="bg-card border rounded-2xl p-4 sm:p-5 lg:p-6 card-shadow h-auto lg:h-[42rem] flex flex-col overflow-hidden lg:border-l-4 lg:border-l-primary/20">
            <div className="pb-3 border-b space-y-2">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground">My Tickets</h2>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  View your ticket history and latest status changes.
                </p>
              </div>

              <div className="rounded-lg border bg-muted/40 px-3 py-2 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center gap-2 text-xs font-medium text-foreground leading-relaxed">
                  {isSyncing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-success" />
                  )}
                  Auto-refresh every 10 seconds
                </div>
                <span className="text-[11px] sm:text-xs text-muted-foreground">
                  {lastSyncedAt ? `Last sync: ${formatDateTime(lastSyncedAt)}` : "Waiting for first sync"}
                </span>
              </div>
            </div>

            <div className="py-3 sm:py-4 flex flex-wrap gap-2">
              {ticketFilterOptions.map((filterOption) => {
                const isActive = ticketFilter === filterOption.value;
                const buttonClassName = isActive
                  ? "h-9 rounded-lg px-3 text-xs sm:text-sm whitespace-nowrap border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground"
                  : "h-9 rounded-lg px-3 text-xs sm:text-sm whitespace-nowrap border-border bg-background text-muted-foreground hover:text-foreground";
                return (
                  <Button
                    key={filterOption.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTicketFilter(filterOption.value)}
                    className={buttonClassName}
                  >
                    {filterOption.label}
                  </Button>
                );
              })}
            </div>

            <div className="space-y-3 text-sm flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-2">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading tickets...</p>
              ) : !isAuthenticated ? (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Sign in to view your account-based ticket history.
                </p>
              ) : filteredTickets.length > 0 ? (
                filteredTickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-xl border border-border/80 bg-background/70 p-3 sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 font-mono text-xs sm:text-sm font-semibold tracking-wide text-foreground">
                        {ticket.referenceNo}
                      </span>
                      <StatusBadge status={ticket.status} />
                    </div>

                    <p className="mt-3 text-sm font-semibold text-foreground leading-snug">{ticket.subject}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{ticket.type}</p>

                    <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                      <p>Created: {formatDateTime(ticket.createdAt)}</p>
                      <p>Updated: {formatDateTime(ticket.updatedAt)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {ticketFilter === "recent" ? "No tickets submitted yet." : `No ${activeFilterLabel.toLowerCase()} tickets yet.`}
                </p>
              )}
            </div>
          </div>
          </div>
        </section>
      </div>

      <AlertDialog open={isSubmitConfirmOpen} onOpenChange={setIsSubmitConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are all ticket details correct?</AlertDialogTitle>
            <AlertDialogDescription>
              Review before submitting your ticket.
              <span className="block mt-2 text-foreground">Type: {type || "N/A"}</span>
              <span className="block text-foreground">Subject: {subject.trim() || "N/A"}</span>
              <span className="block text-foreground">Email: {email.trim() || "N/A"}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>See Form Again</AlertDialogCancel>
            <AlertDialogAction onClick={proceedSubmitTicket} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Proceed"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}
