import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import {
  Bell, Download, ExternalLink, FileText, HelpCircle, MapPin, Medal, Megaphone,
  Scale, ShieldCheck, UserRound,
} from "lucide-react";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { createInquiryInSupabase, resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";
import { LYDO_FACEBOOK_PAGE_URL } from "@/lib/official-links";
import { organizationEmailPattern } from "@/lib/organization-profile-domain";
import type { usePwaPortalData } from "./hooks/usePwaPortalData";
import { usePwaNavigation } from "./hooks/usePwaNavigation";
import { PwaBackButton } from "./PwaBackButton";
import { getPwaRelatedRecordRoute, PWA_ROUTES, pwaNewsDetailRoute } from "./pwaRoutes";

type PortalData = ReturnType<typeof usePwaPortalData>;

const dateLabel = (value: string) => value ? new Date(value).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "Not set";

function PageIntro({ icon: Icon, title, copy, action }: { icon: typeof FileText; title: string; copy: string; action?: ReactNode }) {
  return <section className="pwa-page-intro"><span><Icon aria-hidden="true" /></span><div><h2>{title}</h2><p>{copy}</p>{action}</div></section>;
}

function NewsImage({ src, title }: { src?: string | null; title: string }) {
  const [failedSource, setFailedSource] = useState("");
  const value = src?.trim() ?? "";
  if (!value || failedSource === value) {
    return <span className="pwa-news-placeholder" aria-label={`${title} image unavailable`}><Megaphone aria-hidden="true" /></span>;
  }
  return <img src={value} alt={`${title} preview`} referrerPolicy="no-referrer" onError={() => setFailedSource(value)} />;
}

export function PwaProfile({ data }: { data: PortalData }) {
  const profile = data.profile;
  return <div className="pwa-stack">
    <section className="pwa-card pwa-profile-hero"><span className="pwa-large-avatar">{data.organizationName.charAt(0).toUpperCase()}</span><div><h2>{data.organizationName}</h2><StatusBadge status={profile?.profileStatus ?? "incomplete"} /><strong>{data.profilePercent}% complete</strong></div></section>
    <section className="pwa-card pwa-detail-list">
      <div><UserRound /><span><small>Representative</small><strong>{profile?.representativeName || "Not set"}</strong></span></div>
      <div><ShieldCheck /><span><small>Classification</small><strong>{[profile?.majorClassification, profile?.subClassification].filter(Boolean).join(" · ") || "Not set"}</strong></span></div>
      <div><MapPin /><span><small>Location</small><strong>{[profile?.barangay, profile?.district].filter(Boolean).join(" · ") || "Not set"}</strong></span></div>
      <div><Medal /><span><small>Advocacy Areas</small><strong>{profile?.advocacies.join(", ") || "Not set"}</strong></span></div>
    </section>
  </div>;
}

export function PwaTemplates({ data }: { data: PortalData }) {
  const open = async (url: string) => {
    const resolved = await resolveSupabaseFileUrl(url);
    window.open(resolved, "_blank", "noopener,noreferrer");
  };
  return <div className="pwa-stack"><PageIntro icon={FileText} title="Official Templates" copy="View or download active templates published for your organization." /><section className="pwa-record-list pwa-stack">{data.templates.map((item) => <article className="pwa-card" key={item.id}><div className="pwa-record-heading"><div><h3>{item.name}</h3><p>{item.description || "Official reference file"}</p></div><StatusBadge status={item.templateFileUrl ? "active" : "draft"} /></div><Button variant="outline" disabled={!item.templateFileUrl} onClick={() => void open(item.templateFileUrl)}><Download className="mr-2 h-4 w-4" />View or Download</Button></article>)}</section></div>;
}

export function PwaNews({ data }: { data: PortalData }) {
  const { newsReleaseId } = useParams();
  const { go } = usePwaNavigation();
  const selected = newsReleaseId ? data.news.find((item) => item.id === newsReleaseId) : null;
  if (selected) {
    return <div className="pwa-stack"><PwaBackButton fallback={PWA_ROUTES.news} label="News Releases" /><article className="pwa-card pwa-news-detail"><NewsImage src={selected.previewImageUrl} title={selected.title} /><StatusBadge status={selected.visibilityStatus} /><h2>{selected.title}</h2><time>{dateLabel(selected.datePosted)}</time><p>{selected.description}</p>{selected.facebookPostUrl ? <a className="pwa-primary-link" href={selected.facebookPostUrl} target="_blank" rel="noreferrer">Open Facebook Post <ExternalLink /></a> : null}</article></div>;
  }
  return <div className="pwa-stack"><PageIntro icon={Megaphone} title="News Releases" copy="Official announcements and updates from the LYDO." action={<a className="pwa-secondary-button pwa-facebook-page-link" href={LYDO_FACEBOOK_PAGE_URL} target="_blank" rel="noopener noreferrer" aria-label="View the official LYDO Facebook page (opens in a new tab)"><ExternalLink aria-hidden="true" />View Facebook Page</a>} /><section className="pwa-news-list">{data.news.map((item) => <button key={item.id} type="button" className="pwa-card" onClick={() => item.facebookPostUrl ? window.open(item.facebookPostUrl, "_blank", "noopener,noreferrer") : go(pwaNewsDetailRoute(item.id))}><NewsImage src={item.previewImageUrl} title={item.title} /><span><strong>{item.title}</strong><small>{dateLabel(item.datePosted)}</small><p>{item.description}</p></span><ExternalLink /></button>)}</section></div>;
}

export function PwaCompliance({ data }: { data: PortalData }) {
  return <div className="pwa-stack"><PageIntro icon={ShieldCheck} title="Compliance Status" copy="Current remarks and consequences linked to your organization records." /><section className="pwa-record-list pwa-stack">{data.compliance.map((item) => <article className="pwa-card" key={item.id}><div className="pwa-record-heading"><div><h3>{item.relatedType.replaceAll("_", " ")}</h3><p>{item.message}</p></div><StatusBadge status={item.status || "pending"} /></div></article>)}{!data.compliance.length ? <section className="pwa-card pwa-empty-copy">No active compliance remarks.</section> : null}</section></div>;
}

export function PwaTransparency({ data }: { data: PortalData }) {
  return <div className="pwa-stack"><PageIntro icon={Scale} title="Public Transparency" copy="Published financial and program records." /><section className="pwa-record-list pwa-stack">{data.transparency.map((item) => <article className="pwa-card" key={item.id}><div className="pwa-record-heading"><div><h3>{item.title}</h3><p>{item.category} · {dateLabel(item.postDate)}</p></div><StatusBadge status={item.visibilityStatus} /></div><p>{item.description}</p>{item.attachmentUrl ? <a href={item.attachmentUrl} target="_blank" rel="noreferrer">Open attachment <ExternalLink /></a> : null}</article>)}</section></div>;
}

export function PwaNotifications({ data }: { data: PortalData }) {
  const { go } = usePwaNavigation();
  const open = async (item: (typeof data.notifications)[number]) => {
    if (!item.isRead) await data.markRead(item.id);
    const target = getPwaRelatedRecordRoute(item.relatedType, item.relatedId);
    if (target) go(target);
  };
  return <div className="pwa-stack"><div className="pwa-inline-heading"><span>{data.unreadCount} unread</span>{data.unreadCount ? <button type="button" onClick={() => void data.markAllRead()}>Mark all read</button> : null}</div><section className="pwa-notification-list">{data.notifications.map((item) => <button key={item.id} type="button" className={`pwa-card ${item.isRead ? "" : "is-unread"}`} onClick={() => void open(item)}><span className="pwa-record-icon"><Bell /></span><span><strong>{item.title}</strong><p>{item.message}</p><small>{dateLabel(item.createdAt)}</small></span></button>)}{!data.notifications.length ? <section className="pwa-card pwa-empty-copy">You&apos;re all caught up.</section> : null}</section></div>;
}

export function PwaActivity({ data }: { data: PortalData }) {
  return <div className="pwa-stack"><PwaBackButton fallback={PWA_ROUTES.home} label="Dashboard" /><section className="pwa-card"><h2 className="pwa-section-title">Organization Activity</h2><div className="pwa-activity-list">{data.activities.map((item) => <article key={item.id}><span className="pwa-activity-marker" /><div><strong>{item.description}</strong><time>{dateLabel(item.createdAt)}</time></div></article>)}{!data.activities.length ? <p className="pwa-empty-copy">No activity recorded yet.</p> : null}</div></section></div>;
}

export function PwaInquiries({ data }: { data: PortalData }) {
  const profileEmail = data.profile?.organizationEmail || data.user?.email || "";
  const [form, setForm] = useState({ email: profileEmail, subject: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm((current) => current.email ? current : { ...current, email: profileEmail });
  }, [profileEmail]);

  const submit = async () => {
    const email = form.email.trim();
    if (!email || !form.subject.trim() || !form.description.trim()) {
      toast({ title: "Missing details", description: "Please complete the email, subject, and description fields.", variant: "destructive" });
      return;
    }
    if (!organizationEmailPattern.test(email)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const saved = await createInquiryInSupabase({
        submitterName: data.organizationName,
        organizationName: data.organizationName,
        email,
        subject: form.subject,
        description: form.description,
      });
      data.store.createInquiry(saved);
      setForm({ email, subject: "", description: "" });
      toast({ title: "Inquiry sent", description: "Your inquiry is now pending review." });
    } catch (error) {
      toast({ title: "Unable to send inquiry", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };
  return <div className="pwa-stack"><PageIntro icon={HelpCircle} title="Inquiries" copy="Send a question to the LYDO and track earlier submissions." /><section className="pwa-card pwa-form-card"><label>Email<Input type="email" inputMode="email" autoComplete="email" placeholder="Email address" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label><label>Subject<Input value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} /></label><label>Description<Textarea rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label><Button disabled={saving || !form.email.trim() || !form.subject.trim() || !form.description.trim()} onClick={() => void submit()}>{saving ? "Sending..." : "Send Inquiry"}</Button></section><section className="pwa-record-list pwa-stack">{data.inquiries.map((item) => <article className="pwa-card" key={item.id}><div className="pwa-record-heading"><div><h3>{item.subject}</h3><p>{dateLabel(item.createdAt)}</p></div><StatusBadge status={item.status} /></div><p>{item.description}</p>{item.adminRemarks ? <small className="pwa-admin-note">Admin: {item.adminRemarks}</small> : null}</article>)}</section></div>;
}
