import { useEffect, useState, type ReactNode } from "react";
import {
  Accessibility, Bell, Check, ChevronRight, Database, HardDrive, Info, LockKeyhole,
  MonitorSmartphone, RefreshCw, ScrollText, ShieldCheck, SlidersHorizontal, Trash2,
} from "lucide-react";
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
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { getPasswordResetUrl } from "@/lib/auth-redirect";
import type { usePwaPortalData } from "../hooks/usePwaPortalData";
import { usePwaNavigation } from "../hooks/usePwaNavigation";
import { usePwaPreferences, type PwaPreferences } from "../hooks/usePwaPreferences";
import { usePwaRuntimeStatus } from "../hooks/usePwaRuntimeStatus";
import { PWA_ROUTES } from "../pwaRoutes";
import { parseAppVersion } from "./appVersion";

type PortalData = ReturnType<typeof usePwaPortalData>;
type Icon = typeof Bell;

function SettingsRow({
  icon: IconComponent,
  title,
  detail,
  onClick,
}: {
  icon: Icon;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="pwa-settings-row" onClick={onClick}>
      <span className="pwa-menu-icon"><IconComponent aria-hidden="true" /></span>
      <span className="pwa-menu-copy"><strong>{title}</strong><small>{detail}</small></span>
      <ChevronRight className="pwa-chevron" aria-hidden="true" />
    </button>
  );
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="pwa-settings-group">
      <h2 className="pwa-section-title">{title}</h2>
      <div className="pwa-card pwa-settings-list">{children}</div>
    </section>
  );
}

function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; detail?: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="pwa-setting-fieldset">
      <legend>{label}</legend>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? "is-selected" : ""}
          onClick={() => onChange(option.value)}
        >
          <span><strong>{option.label}</strong>{option.detail ? <small>{option.detail}</small> : null}</span>
          {value === option.value ? <Check aria-hidden="true" /> : null}
        </button>
      ))}
    </fieldset>
  );
}

function PreferenceSwitch({
  label,
  detail,
  checked,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="pwa-preference-switch">
      <span><strong>{label}</strong><small>{detail}</small></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export function PwaSettingsMain() {
  const { go } = usePwaNavigation();
  return (
    <div className="pwa-stack pwa-settings-main-page">
      <SettingsGroup title="General">
        <SettingsRow icon={Bell} title="Notifications" detail="Browser permission and delivery status" onClick={() => go(PWA_ROUTES.settingsNotifications)} />
        <SettingsRow icon={Accessibility} title="Appearance & Accessibility" detail="Text size, motion and contrast" onClick={() => go(PWA_ROUTES.settingsAppearance)} />
      </SettingsGroup>
      <SettingsGroup title="App">
        <SettingsRow icon={HardDrive} title="Files & Offline Storage" detail="Cache information and safe cleanup" onClick={() => go(PWA_ROUTES.settingsStorage)} />
        <SettingsRow icon={SlidersHorizontal} title="App Preferences" detail="Landing screen and notification badge" onClick={() => go(PWA_ROUTES.settingsPreferences)} />
      </SettingsGroup>
      <SettingsGroup title="Account">
        <SettingsRow icon={LockKeyhole} title="Account & Security" detail="Email and password recovery" onClick={() => go(PWA_ROUTES.settingsAccount)} />
      </SettingsGroup>
      <SettingsGroup title="Information">
        <SettingsRow icon={Info} title="About Y-TRACE" detail="Version, installation and update status" onClick={() => go(PWA_ROUTES.about)} />
        <SettingsRow icon={ShieldCheck} title="Privacy Policy" detail="How information is handled" onClick={() => go(PWA_ROUTES.privacy)} />
        <SettingsRow icon={ScrollText} title="Terms of Service" detail="Terms for using Y-TRACE" onClick={() => go(PWA_ROUTES.terms)} />
      </SettingsGroup>
    </div>
  );
}

export function PwaNotificationSettings() {
  const [permission, setPermission] = useState<"granted" | "denied" | "default" | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const requestPermission = async () => {
    if (typeof Notification === "undefined") return;
    setPermission(await Notification.requestPermission());
  };
  const labels = {
    granted: "Allowed",
    denied: "Blocked",
    default: "Not requested",
    unsupported: "Unsupported",
  };
  return (
    <div className="pwa-stack">
      <section className="pwa-card pwa-settings-detail-card">
        <span className="pwa-settings-hero-icon"><Bell aria-hidden="true" /></span>
        <div><h2>Browser notifications</h2><p>Y-TRACE uses your device&apos;s browser permission for notification alerts.</p></div>
      </section>
      <section className="pwa-card pwa-setting-status-row">
        <span><strong>Permission</strong><small>Current browser setting</small></span>
        <strong className={`is-${permission}`}>{labels[permission]}</strong>
      </section>
      {permission === "default" ? <button type="button" className="pwa-primary-button" onClick={() => void requestPermission()}>Allow Notifications</button> : null}
      {permission === "denied" ? <section className="pwa-card pwa-empty-copy">Notifications are blocked in browser settings. Open the site permissions for Y-TRACE to allow them.</section> : null}
      {permission === "unsupported" ? <section className="pwa-card pwa-empty-copy">This device does not expose browser notification permissions to the app.</section> : null}
      <section className="pwa-card pwa-settings-note">
        <strong>Notification categories</strong>
        <p>Document, budget, liquidation, YPOP, news, and inquiry notifications continue to follow the records generated by Y-TRACE. This screen does not silently alter server-side delivery.</p>
      </section>
    </div>
  );
}

export function PwaAppearanceSettings() {
  const { preferences, updatePreferences } = usePwaPreferences();
  const update = <K extends keyof PwaPreferences>(key: K, value: PwaPreferences[K]) => updatePreferences({ [key]: value });
  return (
    <div className="pwa-stack">
      <section className="pwa-card pwa-settings-note">
        <strong>Theme</strong>
        <p>Y-TRACE currently uses its supported light application theme. Dark mode is not offered until every workflow and document viewer supports it completely.</p>
      </section>
      <ChoiceGroup
        label="Text size"
        value={preferences.textSize}
        options={[
          { value: "standard", label: "Standard", detail: "Default application text size" },
          { value: "large", label: "Large", detail: "Increase text throughout the installed PWA" },
        ]}
        onChange={(value) => update("textSize", value)}
      />
      <section className="pwa-card pwa-preference-list">
        <PreferenceSwitch label="Reduce Motion" detail="Minimize transitions and animations" checked={preferences.reduceMotion} onChange={(value) => update("reduceMotion", value)} />
        <PreferenceSwitch label="Increase Contrast" detail="Strengthen borders and supporting text" checked={preferences.increaseContrast} onChange={(value) => update("increaseContrast", value)} />
        <PreferenceSwitch label="Underline Interactive Links" detail="Make text links easier to identify" checked={preferences.underlineLinks} onChange={(value) => update("underlineLinks", value)} />
      </section>
    </div>
  );
}

const formatBytes = (value: number | undefined) => {
  if (!value) return "0 KB";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
};

export function PwaStorageSettings() {
  const [cacheSize, setCacheSize] = useState("Calculating...");
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const measureStorage = async () => {
    if (!navigator.storage?.estimate) {
      setCacheSize("Unavailable");
      return;
    }
    const estimate = await navigator.storage.estimate();
    setCacheSize(formatBytes(estimate.usage));
  };
  useEffect(() => { void measureStorage(); }, []);

  const clearSafeCaches = async () => {
    setClearing(true);
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith("y-trace")).map((key) => caches.delete(key)));
      }
      await measureStorage();
      setClearOpen(false);
      toast({ title: "Cached files cleared", description: "Your submitted records and Supabase data were not changed." });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="pwa-stack">
      <section className="pwa-card pwa-setting-status-row">
        <span><strong>Current browser storage</strong><small>Approximate storage used by this origin</small></span>
        <strong>{cacheSize}</strong>
      </section>
      <section className="pwa-card pwa-settings-note">
        <Database aria-hidden="true" />
        <div><strong>Offline availability</strong><p>Previously loaded app resources may remain available offline. Live records and uploads still require a connection.</p></div>
      </section>
      <button type="button" className="pwa-danger-outline-button" onClick={() => setClearOpen(true)}><Trash2 aria-hidden="true" /> Clear Cached Files</button>
      <p className="pwa-settings-footnote">Clearing app caches never deletes uploaded submissions, approved files, budgets, liquidations, YPOP records, inquiries, or notifications.</p>
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-sm">
          <AlertDialogHeader><AlertDialogTitle>Clear cached files?</AlertDialogTitle><AlertDialogDescription>Offline app resources will be removed and downloaded again when needed. Your account records will remain unchanged.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel><AlertDialogAction disabled={clearing} onClick={(event) => { event.preventDefault(); void clearSafeCaches(); }}>{clearing ? "Clearing..." : "Clear Cache"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function PwaAppPreferences() {
  const { preferences, updatePreferences } = usePwaPreferences();
  return (
    <div className="pwa-stack">
      <ChoiceGroup
        label="Default landing screen"
        value={preferences.defaultLanding}
        options={[
          { value: "home", label: "Home" },
          { value: "documents", label: "Documents" },
          { value: "budget", label: "Budget" },
          { value: "liquidation", label: "Liquidation" },
        ]}
        onChange={(value) => updatePreferences({ defaultLanding: value })}
      />
      <section className="pwa-card pwa-preference-list">
        <PreferenceSwitch
          label="Show notification badge"
          detail="Display the unread count on the global bell"
          checked={preferences.showNotificationBadge}
          onChange={(value) => updatePreferences({ showNotificationBadge: value })}
        />
      </section>
      <p className="pwa-settings-footnote">These preferences are stored only on this device and affect the installed PWA, not the regular website.</p>
    </div>
  );
}

export function PwaAccountSettings({ data }: { data: PortalData }) {
  const [sending, setSending] = useState(false);
  const email = data.profile?.organizationEmail || data.user?.email || "No email available";
  const sendReset = async () => {
    if (!supabase || !data.user?.email) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.user.email, {
        redirectTo: getPasswordResetUrl(),
      });
      if (error) throw error;
      toast({ title: "Password reset sent", description: `Check ${data.user.email} for the secure reset link.` });
    } catch (error) {
      toast({ title: "Unable to send reset link", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };
  return (
    <div className="pwa-stack">
      <section className="pwa-card pwa-setting-status-row">
        <span><strong>Organization email</strong><small>Current authenticated account</small></span>
        <strong className="pwa-account-email">{email}</strong>
      </section>
      <button type="button" className="pwa-secondary-button" disabled={sending || !data.user?.email} onClick={() => void sendReset()}><LockKeyhole aria-hidden="true" />{sending ? "Sending..." : "Send Password Reset Link"}</button>
      <section className="pwa-card pwa-settings-note">
        <MonitorSmartphone aria-hidden="true" />
        <div><strong>Session security</strong><p>Sign out from the More screen when using a shared device. Multi-device session management is not exposed because the current authentication provider does not offer it in this app.</p></div>
      </section>
    </div>
  );
}

export function PwaAboutSettings() {
  const runtime = usePwaRuntimeStatus();
  const version = parseAppVersion(import.meta.env.VITE_APP_VERSION);
  const buildLabel = version.buildDateLabel ?? (version.isLocalBuild ? "Development build" : null);
  const updateLabel = runtime.updateState === "checking"
    ? "Checking..."
    : runtime.updateState === "available"
      ? "Update available"
      : runtime.updateState === "error"
        ? "Unable to check"
        : runtime.updateState === "unsupported"
          ? "Unsupported"
          : "Up to date";
  return (
    <div className="pwa-stack">
      <section className="pwa-card pwa-settings-metadata" aria-label="Application version and runtime information">
        <div><span id="pwa-version-label">Version</span><strong aria-labelledby="pwa-version-label">{version.release}</strong></div>
        {buildLabel ? <div><span id="pwa-build-label">Build</span><strong aria-labelledby="pwa-build-label">{buildLabel}</strong></div> : null}
        <div><span>Installation</span><strong>{runtime.installed ? "Installed PWA" : "Browser preview"}</strong></div>
        <div><span>Update status</span><strong>{updateLabel}</strong></div>
      </section>
      {runtime.updateState === "available" ? <button type="button" className="pwa-primary-button" onClick={() => void runtime.updateApp()}><RefreshCw /> Update App</button> : <button type="button" className="pwa-secondary-button" disabled={runtime.updateState === "checking" || runtime.updateState === "unsupported"} onClick={() => void runtime.checkForUpdates()}><RefreshCw /> Check for Updates</button>}
    </div>
  );
}
