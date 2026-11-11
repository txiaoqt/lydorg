import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, DatabaseBackup, ExternalLink, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { hasAdminNavPermission } from "@/lib/admin-permissions";
import { BackupControlError, backupStatusLabel, fetchBackupRuns, isBackupActive, requestBackup, type BackupRun } from "@/lib/admin-backup-recovery";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/portal/AdminPageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useConfirmActionDialog } from "@/components/ConfirmActionDialog";
import { toast } from "@/hooks/use-toast";

const dateLabel = (value: string) => value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
function duration(run: BackupRun) {
  if (isBackupActive(run)) return "In progress";
  const seconds = Math.max(0, Math.round((Date.parse(run.updatedAt) - Date.parse(run.createdAt)) / 1000));
  return seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
}
function RunStatusChip({ run }: { run: BackupRun }) {
  const verified = run.status === "completed" && run.conclusion === "success";
  return <span className={verified ? "inline-flex items-center gap-1 rounded-full border border-border-success-subtle bg-bg-success-subtle px-2 py-0.5 text-xs font-semibold text-positive-secondary"
    : "inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-text-default"}>
    {verified && <Check className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />}{backupStatusLabel(run)}</span>;
}
function RunStatus({ run }: { run: BackupRun }) {
  const verified = run.status === "completed" && run.conclusion === "success";
  return <span className={verified ? "font-semibold text-emerald-700 dark:text-emerald-400" : "font-semibold text-text-default"}>{backupStatusLabel(run)}</span>;
}

export function BackupRecoveryPage() {
  const { user } = useAuth();
  const canView = hasAdminNavPermission(user?.permissionCodes, "backup-recovery", user?.roleCode);
  const canManage = user?.roleCode === "super_admin" || Boolean(user?.permissionCodes?.includes("backup_recovery_manage"));
  const client = useQueryClient();
  const [requestedRun, setRequestedRun] = useState<{ until: number; knownIds: number[]; runId: number | null } | null>(null);
  const busyRef = useRef(false);
  const { confirmAction, confirmationDialog } = useConfirmActionDialog();
  const permissionKey = [...(user?.permissionCodes ?? [])].sort().join(",");
  const key = ["admin", "backup-recovery", user?.id, user?.roleCode, permissionKey];
  const waitingForRun = (runs: BackupRun[] = []) => Boolean(requestedRun && Date.now() < requestedRun.until &&
    !runs.some(run => requestedRun.runId ? run.id === requestedRun.runId : !requestedRun.knownIds.includes(run.id)));
  const query = useQuery({ queryKey: key, queryFn: ({ signal }) => fetchBackupRuns(signal), enabled: Boolean(user && canView),
    retry: false, staleTime: 30_000, gcTime: 60_000, refetchOnWindowFocus: false,
    refetchInterval: current => current.state.error ? false :
      current.state.data?.activeBackup || current.state.data?.requestPending ||
      current.state.data?.runs.some(isBackupActive) || waitingForRun(current.state.data?.runs) ? 12_000 : false,
    refetchIntervalInBackground: false });
  const mutation = useMutation({ mutationFn: requestBackup, retry: false,
    onSuccess: async result => {
      setRequestedRun({ until: Date.now() + 120_000, knownIds: query.data?.runs.map(run => run.id) ?? [], runId: result.runId });
      toast({ title: "Backup requested", description: "The workflow request was accepted. Waiting for the backup run to start." });
      if (result.auditStatus !== "recorded") toast({ title: "Audit logging notice", description: result.auditStatus === "disabled"
        ? "The request was accepted, but configuration audit logging is disabled."
        : "The request was accepted, but its activity log could not be recorded. Do not submit it again." });
      await client.invalidateQueries({ queryKey: key });
    },
    onError: async error => {
      const safe = error instanceof BackupControlError ? error : new BackupControlError("control_unavailable");
      if (safe.code === "dispatch_uncertain") setRequestedRun({ until: Date.now() + 120_000, knownIds: query.data?.runs.map(run => run.id) ?? [], runId: null });
      toast({ title: safe.code === "active_backup" ? "Backup already in progress" : "Backup request could not be confirmed", description: safe.message, variant: "destructive" });
      await client.invalidateQueries({ queryKey: key });
    } });
  const runs = query.data?.runs ?? [];
  const activeRun = runs.find(isBackupActive);
  const active = Boolean(query.data?.activeBackup || query.data?.requestPending || activeRun);
  const awaiting = waitingForRun(runs) && !activeRun && !query.isError;
  const latest = activeRun ?? (awaiting || query.data?.requestPending ? undefined : runs[0]);
  const blocked = !canManage || !query.isSuccess || query.isFetching || query.data?.dispatchEnabled !== true || active || awaiting || mutation.isPending;
  const createBackup = async () => {
    if (blocked || busyRef.current) return;
    busyRef.current = true;
    try {
      const confirmed = await confirmAction({ title: "Create a new backup?", confirmLabel: "Create Backup",
        description: "Y-TRACE will back up the application database and uploaded files to the configured private external backup storage. The process may take several minutes." });
      if (confirmed) await mutation.mutateAsync().catch(() => undefined);
    } finally { busyRef.current = false; }
  };
  if (!canView) return <div role="alert" className="rounded-xl border border-admin-border bg-admin-surface p-6 text-text-default">You do not have permission to view Backup &amp; Recovery.</div>;
  const safeError = query.error instanceof BackupControlError ? query.error : new BackupControlError("control_unavailable");
  return <div className="space-y-6 font-inter">
    <AdminPageHeader title="Backup & Recovery" description="Protect Y-TRACE database records and uploaded files using verified external backups."
      action={<Button variant="outline" size="sm" onClick={() => { void query.refetch(); }} disabled={query.isFetching}>
        <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Refresh</Button>} />
    {query.isPending && <div role="status" className="rounded-xl border border-admin-border bg-admin-surface p-6 text-text-default">Loading backup history…</div>}
    {query.isError && <div role="alert" className="rounded-xl border border-admin-border bg-admin-surface p-5">
      <h2 className="font-semibold text-text-default">{safeError.code === "not_configured" ? "Backup service is not configured" : "Backup information unavailable"}</h2>
      <p className="mt-2 text-sm text-public-text-secondary">{safeError.message}</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={() => { void query.refetch(); }}>Try again</Button>
    </div>}
    {query.isSuccess && <>
      {(active || awaiting) && <p role="status" className="rounded-xl border border-admin-border bg-admin-surface p-4 text-sm font-semibold text-text-default">
        {awaiting || query.data.requestPending ? "Backup requested. Waiting for workflow status." : "A backup is already in progress."} Status refreshes every 12 seconds.</p>}
      <section aria-labelledby="latest-backup-title" className="rounded-xl border border-admin-border bg-admin-surface p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="latest-backup-title" className="text-base font-semibold text-public-text-brand">Latest Backup</h2>
          {latest ? <RunStatusChip run={latest} /> : <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-public-text-secondary">{awaiting || query.data.requestPending ? "Queued" : "No backup yet"}</span>}
        </div>
        <p className="mt-2 text-sm text-public-text-secondary">Saves the Y-TRACE database and Supabase Storage files to private external storage, then verifies the result.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {latest && <Button variant="outline" size="sm" asChild><a href={latest.htmlUrl} target="_blank" rel="noopener noreferrer">View GitHub Run<ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" /></a></Button>}
          <Button size="sm" onClick={() => { void createBackup(); }} disabled={blocked}><DatabaseBackup className="mr-2 h-4 w-4" aria-hidden="true" />{mutation.isPending ? "Requesting backup…" : "Create Backup Now"}</Button>
        </div>
        {!canManage && <p className="mt-2 text-sm text-public-text-secondary">Read-only access. Backup management permission is required to create a backup.</p>}
        {canManage && !query.data.dispatchEnabled && <p className="mt-2 text-sm text-public-text-secondary">Requests are disabled until the first manual workflow has been validated and dispatch is enabled by the service administrator.</p>}
        {latest ? <dl className="mt-5 grid gap-4 border-t border-admin-border pt-4 text-sm sm:grid-cols-3 xl:grid-cols-5">
          {[['Started', dateLabel(latest.createdAt)], ['Completed', latest.status === 'completed' ? dateLabel(latest.updatedAt) : '—'],
            ['Run', `#${latest.runNumber}`], ['Trigger', 'Manual']].map(([label, value]) =>
            <div key={label}><dt className="text-[11px] font-semibold uppercase text-public-text-secondary">{label}</dt><dd className="mt-1 font-semibold text-text-default">{value}</dd></div>)}
          <div><dt className="text-[11px] font-semibold uppercase text-public-text-secondary">Git Revision</dt>
            <dd className="mt-1 flex items-center gap-1.5 font-cascadia font-semibold text-text-default">{latest.headSha.slice(0, 7)}
              <button type="button" aria-label="Copy git revision" className="text-slate-400 hover:text-slate-600"
                onClick={() => { void navigator.clipboard.writeText(latest.headSha); toast({ title: "Copied", description: "Git revision copied to clipboard." }); }}>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" /></button></dd></div>
        </dl> : <p className="mt-4 border-t border-admin-border pt-4 text-sm text-public-text-secondary">{awaiting || query.data.requestPending ? "The run will appear after GitHub registers the request." : "No previous backup runs were found for the configured production workflow."}</p>}
      </section>
      <section aria-labelledby="backup-history-title" className="overflow-hidden rounded-xl border border-admin-border bg-admin-surface">
        <h2 id="backup-history-title" className="p-5 text-base font-semibold text-text-default">Backup History</h2>
        {runs.length ? <Table><TableHeader><TableRow><TableHead>Date/Time</TableHead><TableHead>Trigger</TableHead><TableHead>Status</TableHead><TableHead>Duration</TableHead><TableHead>Run</TableHead></TableRow></TableHeader>
          <TableBody>{runs.map(run => <TableRow key={run.id}><TableCell>{dateLabel(run.createdAt)}</TableCell><TableCell>Manual</TableCell><TableCell><RunStatus run={run} /></TableCell>
            <TableCell className="tabular-nums">{duration(run)}</TableCell><TableCell><a className="inline-flex items-center gap-1 font-semibold text-text-default underline underline-offset-4" href={run.htmlUrl} target="_blank" rel="noopener noreferrer">#{run.runNumber}<ExternalLink className="h-3 w-3" aria-hidden="true" /></a></TableCell></TableRow>)}</TableBody></Table>
          : <p className="px-5 pb-5 text-sm text-public-text-secondary">Backup history will appear here after the first manual run.</p>}
        <p className="border-t border-admin-border px-5 py-3 text-xs text-public-text-secondary">Recent 25 runs from GitHub Actions. Times use your browser’s local timezone; duration includes queue time.</p>
      </section>
    </>}
    {confirmationDialog}
  </div>;
}
