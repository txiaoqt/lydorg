import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { Mail, MessageSquareWarning, Phone, Search } from "lucide-react";
import { DataTable } from "../components/DataTable";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/portal/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TicketStatus = "received" | "in_progress" | "resolved" | "closed";

type TicketRow = {
  id: string;
  reference_no: string;
  ticket_type: string;
  subject: string;
  message: string;
  requester_email: string;
  requester_name: string | null;
  requester_contact: string | null;
  created_by_display: string;
  status: TicketStatus;
  priority: number;
  created_at: string;
  updated_at: string;
};

type StatusForm = {
  status: TicketStatus;
  priority: string;
};

const defaultStatusForm: StatusForm = {
  status: "received",
  priority: "3",
};

const formatStatus = (value: TicketStatus | string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const YouthDeskAdmin = () => {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TicketStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "1" | "2" | "3" | "4" | "5">("all");
  const [viewingTicket, setViewingTicket] = useState<TicketRow | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketRow | null>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [statusForm, setStatusForm] = useState<StatusForm>(defaultStatusForm);
  const { toast } = useToast();

  const loadTickets = async () => {
    setIsLoading(true);
    if (!isSupabaseConfigured || !supabase) {
      setTickets([]);
      setIsLoading(false);
      return;
    }

    const [ticketsResp, profilesResp] = await Promise.all([
      supabase
        .from("youth_tickets")
        .select("id,reference_no,subject,message,requester_email,requester_name,requester_contact,status,priority,created_at,updated_at,created_by_user_id,ticket_types(name)")
        .order("created_at", { ascending: false }),
      supabase.from("user_profiles").select("user_id,full_name,display_name,email"),
    ]);

    if (ticketsResp.error) {
      toast({ title: "Load Failed", description: ticketsResp.error.message });
      setTickets([]);
      setIsLoading(false);
      return;
    }

    const profileMap = new Map(
      ((profilesResp.data ?? []) as Array<{ user_id: string; full_name: string | null; display_name: string | null; email: string }>)
        .map((row) => [row.user_id, row]),
    );

    const mapped = ((ticketsResp.data ?? []) as Array<{
      id: string;
      reference_no: string;
      subject: string;
      message: string;
      requester_email: string;
      requester_name: string | null;
      requester_contact: string | null;
      status: TicketStatus;
      priority: number;
      created_at: string;
      updated_at: string;
      created_by_user_id: string | null;
      ticket_types?: { name?: string } | Array<{ name?: string }>;
    }>).map((row) => {
      const typeRef = Array.isArray(row.ticket_types) ? row.ticket_types[0] : row.ticket_types;
      const profile = row.created_by_user_id ? profileMap.get(row.created_by_user_id) : undefined;
      return {
        id: row.id,
        reference_no: row.reference_no,
        ticket_type: typeRef?.name ?? "Unknown",
        subject: row.subject,
        message: row.message,
        requester_email: row.requester_email,
        requester_name: row.requester_name,
        requester_contact: row.requester_contact,
        created_by_display: profile?.display_name || profile?.full_name || profile?.email || "",
        status: row.status,
        priority: row.priority,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    setTickets(mapped);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadTickets();
  }, []);

  const openDetailsModal = (ticket: TicketRow) => {
    setViewingTicket(ticket);
    setIsDetailsOpen(true);
  };

  const openStatusModal = (ticket: TicketRow) => {
    setEditingTicket(ticket);
    setStatusForm({
      status: ticket.status,
      priority: String(ticket.priority ?? 3),
    });
    setIsStatusOpen(true);
  };

  const saveStatus = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingTicket) return;

    if (!isSupabaseConfigured || !supabase) {
      toast({
        title: "Supabase Not Configured",
        description: "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.",
      });
      return;
    }

    const priority = Number(statusForm.priority);
    if (!Number.isInteger(priority) || priority < 1 || priority > 5) {
      toast({ title: "Invalid Priority", description: "Priority must be between 1 and 5." });
      return;
    }

    setIsSaving(true);
    const payload = {
      status: statusForm.status,
      priority,
      resolved_at:
        statusForm.status === "resolved" || statusForm.status === "closed"
          ? new Date().toISOString()
          : null,
    };

    const { error } = await supabase.from("youth_tickets").update(payload).eq("id", editingTicket.id);
    setIsSaving(false);

    if (error) {
      toast({ title: "Update Failed", description: error.message });
      return;
    }

    toast({
      title: "Ticket Updated",
      description: `${editingTicket.reference_no} status is now ${formatStatus(statusForm.status)}.`,
    });
    setEditingTicket(null);
    setIsStatusOpen(false);
    setStatusForm(defaultStatusForm);
    void loadTickets();
  };

  const columns = [
    {
      header: "Ticket",
      accessor: (ticket: TicketRow) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{ticket.reference_no}</span>
          <span className="text-xs text-muted-foreground font-medium">{ticket.ticket_type}</span>
        </div>
      ),
    },
    {
      header: "Requester",
      accessor: (ticket: TicketRow) => (
        <div className="flex flex-col text-xs text-muted-foreground gap-1">
          <span className="font-medium text-foreground">{ticket.requester_name || ticket.created_by_display || "Anonymous"}</span>
          <span className="inline-flex items-center gap-1">
            <Mail size={12} />
            {ticket.requester_email}
          </span>
          {ticket.requester_contact && (
            <span className="inline-flex items-center gap-1">
              <Phone size={12} />
              {ticket.requester_contact}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Subject",
      accessor: (ticket: TicketRow) => (
        <div className="flex flex-col max-w-[260px]">
          <span className="font-medium text-foreground truncate">{ticket.subject}</span>
          <span className="text-xs text-muted-foreground truncate">{ticket.message}</span>
        </div>
      ),
    },
    {
      header: "Status",
      accessor: (ticket: TicketRow) => (
        <StatusBadge status={ticket.status} size="md" />
      ),
    },
    {
      header: "Created",
      accessor: (ticket: TicketRow) => (
        <div className="flex flex-col text-xs text-muted-foreground">
          <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
          <span>{new Date(ticket.created_at).toLocaleTimeString()}</span>
        </div>
      ),
    },
  ];

  const filteredTickets = useMemo(
    () =>
      tickets.filter((ticket) => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = (
          ticket.reference_no.toLowerCase().includes(term) ||
          ticket.subject.toLowerCase().includes(term) ||
          ticket.requester_email.toLowerCase().includes(term) ||
          ticket.ticket_type.toLowerCase().includes(term) ||
          ticket.status.toLowerCase().includes(term)
        );
        const matchesStatus = statusFilter === "all" ? true : ticket.status === statusFilter;
        const matchesPriority = priorityFilter === "all" ? true : String(ticket.priority ?? 3) === priorityFilter;
        return matchesSearch && matchesStatus && matchesPriority;
      }),
    [searchTerm, tickets, statusFilter, priorityFilter],
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Youth Services Desk</h1>
          <p className="text-muted-foreground mt-1 font-medium">Monitor user-submitted tickets and update request status.</p>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center bg-card p-4 rounded-2xl border border-border card-shadow">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Search by reference, subject, requester email, type, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring transition-all outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | TicketStatus)}
          className="h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 text-sm min-w-0 sm:min-w-[150px]"
        >
          <option value="all">All Statuses</option>
          <option value="received">Received</option>
          <option value="in_progress">Ongoing</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as "all" | "1" | "2" | "3" | "4" | "5")}
          className="h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 text-sm min-w-0 sm:min-w-[145px]"
        >
          <option value="all">All Priorities</option>
          <option value="1">Priority 1</option>
          <option value="2">Priority 2</option>
          <option value="3">Priority 3</option>
          <option value="4">Priority 4</option>
          <option value="5">Priority 5</option>
        </select>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => {
            setStatusFilter("all");
            setPriorityFilter("all");
          }}
        >
          Clear
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filteredTickets}
        isLoading={isLoading}
        onRowClick={openDetailsModal}
        getRowAriaLabel={(item) => `Open ticket details for ${item.reference_no}`}
      />

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
            <DialogDescription>Youth Services Desk submission details.</DialogDescription>
          </DialogHeader>
          {viewingTicket && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Reference</p>
                  <p className="font-medium">{viewingTicket.reference_no}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">{viewingTicket.ticket_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Requester</p>
                  <p className="font-medium">{viewingTicket.requester_name || viewingTicket.created_by_display || "Anonymous"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{viewingTicket.requester_email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{formatStatus(viewingTicket.status)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Priority</p>
                  <p className="font-medium">{viewingTicket.priority}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Subject</p>
                <p className="font-medium">{viewingTicket.subject}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Message</p>
                <p className="font-medium whitespace-pre-wrap">{viewingTicket.message}</p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDetailsOpen(false)}>
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setIsDetailsOpen(false);
                    openStatusModal(viewingTicket);
                  }}
                >
                  Update Status
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Update Ticket Status</DialogTitle>
            <DialogDescription>Changes here are saved directly to Supabase.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveStatus} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ticket-status">Status</Label>
              <select
                id="ticket-status"
                value={statusForm.status}
                onChange={(e) => setStatusForm((prev) => ({ ...prev, status: e.target.value as TicketStatus }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="received">Received</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket-priority">Priority (1 Highest - 5 Lowest)</Label>
              <select
                id="ticket-priority"
                value={statusForm.priority}
                onChange={(e) => setStatusForm((prev) => ({ ...prev, priority: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsStatusOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

