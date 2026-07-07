import { useEffect, useState } from "react";
import { BookOpen, Info, Mail, MapPin, Phone, Shield, Users } from "lucide-react";
import { LegalPolicyView } from "@/components/LegalPolicyView";
import { supabase } from "@/lib/supabase";
import { resolveDisplayPolicy } from "@/lib/ytrace-policy";
import { PwaAboutSettings } from "./settings/PwaSettingsPages";

const faqs = [
  ["What is Y-TRACE?", "Y-TRACE is Pasig City’s youth organization compliance portal for registration, required documents, YPOP participation, budget requests, liquidation reporting, templates, and LYDO/PCYDO updates."],
  ["What should I complete first?", "Complete your Organization Profile and follow the verification and document requirements shown on the Dashboard. Each later workflow remains locked until its real eligibility requirements are met."],
  ["How does document review work?", "Upload each required document from the Documents screen. The app shows whether a file is missing, under admin review, approved, or needs revision."],
  ["When can I create a budget request?", "A new activity budget request becomes available only after your organization qualifies in the active YPOP period."],
  ["When does liquidation become available?", "Liquidation becomes available only after an eligible budget reaches the approved, released, and applicable post-activity stage."],
  ["Where can I see admin updates?", "Use the notification bell for record updates and the Recent Activity section for organization activity history."],
];

const contact = {
  address: "Eulogio Amang Rodriguez Ave, Pasig, 1609 Metro Manila",
  officer: "Ms. Colleen Gail A. De Guzman",
  phone: "+63 917 123 4567",
  email: "lydo.office@prototype.local",
};

export function PwaAboutPage() {
  return (
    <div className="pwa-stack">
      <section className="pwa-card pwa-about-summary">
        <span className="pwa-eyebrow">Purpose</span>
        <h2>Built for clearer compliance</h2>
        <p>
          Y-TRACE is the official compliance portal for youth organizations registered under
          Pasig City LYDO / PCYDO.
        </p>
        <p>
          It replaces scattered paper submissions and manual follow-ups with one online workflow
          for organization verification, required documents, YPOP participation, budget requests,
          liquidation reports, templates, and official updates.
        </p>
      </section>
      <section className="pwa-card pwa-about-audience" aria-labelledby="pwa-about-users">
        <h2 id="pwa-about-users">Who uses Y-TRACE</h2>
        <article>
          <span className="pwa-menu-icon"><Users aria-hidden="true" /></span>
          <div>
            <h3>Organization Representatives</h3>
            <p>Manage their organization profile, submissions, budgets, and liquidation requirements.</p>
          </div>
        </article>
        <article>
          <span className="pwa-menu-icon"><Shield aria-hidden="true" /></span>
          <div>
            <h3>LYDO / PCYDO Staff</h3>
            <p>Review, approve, and monitor organization records through the separate Admin Portal.</p>
          </div>
        </article>
      </section>
      <PwaAboutSettings />
    </div>
  );
}

export function PwaFaqPage() {
  return (
    <div className="pwa-stack">
      <section className="pwa-card pwa-settings-detail-card">
        <span className="pwa-settings-hero-icon"><BookOpen aria-hidden="true" /></span>
        <div><h2>Frequently Asked Questions</h2><p>Quick guidance for the organization compliance workflow.</p></div>
      </section>
      <section className="pwa-card pwa-faq-list">
        {faqs.map(([question, answer], index) => (
          <details key={question} open={index === 0}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </section>
    </div>
  );
}

export function PwaContactPage() {
  return (
    <div className="pwa-stack">
      <section className="pwa-card pwa-settings-detail-card">
        <span className="pwa-settings-hero-icon"><MapPin aria-hidden="true" /></span>
        <div><h2>LYDO / PCYDO Office</h2><p>{contact.address}</p></div>
      </section>
      <section className="pwa-card pwa-contact-list">
        <div><span className="pwa-menu-icon"><Info /></span><span><small>Officer in charge</small><strong>{contact.officer}</strong></span></div>
        <a href={`tel:${contact.phone}`}><span className="pwa-menu-icon"><Phone /></span><span><small>Phone</small><strong>{contact.phone}</strong></span></a>
        <a href={`mailto:${contact.email}`}><span className="pwa-menu-icon"><Mail /></span><span><small>Email</small><strong>{contact.email}</strong></span></a>
      </section>
    </div>
  );
}

type PolicyVersion = {
  title: string;
  terms_content: string;
  privacy_content: string;
  version: string;
  effective_date: string | null;
};

export function PwaLegalPage({ type }: { type: "privacy" | "terms" }) {
  const [policy, setPolicy] = useState<PolicyVersion | null>(null);
  useEffect(() => {
    let active = true;
    if (!supabase) return () => { active = false; };
    void supabase
      .from("policy_versions")
      .select("title,terms_content,privacy_content,version,effective_date")
      .eq("is_active", true)
      .order("effective_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) setPolicy(data as PolicyVersion);
      });
    return () => { active = false; };
  }, []);
  const displayPolicy = resolveDisplayPolicy(policy);
  return (
    <div className="pwa-legal-page">
      <LegalPolicyView type={type} policy={displayPolicy} />
    </div>
  );
}
