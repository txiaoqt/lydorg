import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Camera, CheckCircle2, ChevronRight, ExternalLink, ImagePlus, Loader2, Pencil, Trash2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { toast } from "@/hooks/use-toast";
import {
  advocacyOptions,
  formatSubClassificationLabel,
  majorClassificationOptions,
  subClassificationOptions,
  type OrganizationProfile,
} from "@/lib/lydo-connect-data";
import {
  ORGANIZATION_PROFILE_IMAGE_MAX_BYTES,
  ORGANIZATION_PROFILE_IMAGE_TYPES,
  removeOrganizationProfileImageInSupabase,
  updateOrganizationDirectoryPreferences,
  uploadOrganizationProfileImageInSupabase,
  upsertOrganizationProfileInSupabase,
  resubmitOrganizationUrnInSupabase,
} from "@/lib/lydo-connect-supabase";
import {
  organizationEmailPattern,
  philippineContactNumberPattern,
  isValidPersonName,
  isValidFacebookUrl,
} from "@/lib/organization-profile-domain";
import { generateUniqueUrn } from "@/lib/urn-registration";
import type { usePwaPortalData } from "../hooks/usePwaPortalData";
import { usePwaNavigation } from "../hooks/usePwaNavigation";
import { PwaBackButton } from "../PwaBackButton";
import { PwaOrganizationAvatar } from "../PwaOrganizationAvatar";
import { PWA_ROUTES } from "../pwaRoutes";
import { createBlankPwaOrganizationProfile } from "./pwaProfileDraft";

type PortalData = ReturnType<typeof usePwaPortalData>;
type ProfileTab = "overview" | "details" | "activity";

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const displayValue = (value?: string | null) => value?.trim() || "Not provided";
const requiredValue = (value?: string | null) => value?.trim() || "Missing information";
const getProfileDisplaySource = (data: PortalData) =>
  data.profile ??
  createBlankPwaOrganizationProfile({
    user: data.user,
    organizationName: data.organizationName,
  });
const classificationLabel = (profile: OrganizationProfile | null) =>
  [
    profile?.majorClassification,
    profile?.subClassification ? formatSubClassificationLabel(profile.subClassification) : "",
  ].filter(Boolean).join(" · ") || "Classification not provided";
const locationLabel = (profile: OrganizationProfile | null) =>
  [profile?.district, profile?.barangay].filter((value) => value?.trim()).join(" · ") || "Location not provided";

const statusCopy = (status?: OrganizationProfile["profileStatus"]) => {
  if (status === "verified") return "Your organization profile has been verified.";
  if (status === "pending_review") return "Your profile is complete and awaiting admin verification.";
  if (status === "needs_update") return "The admin requested changes to your organization profile.";
  return "Complete the required profile information and submit it for verification.";
};

function ProfileField({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div className="pwa-profile-field">
      <dt>{label}</dt>
      <dd>
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer">
            Open Facebook Page <ExternalLink aria-hidden="true" />
          </a>
        ) : value}
      </dd>
    </div>
  );
}

function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="pwa-card pwa-profile-section"><h2>{title}</h2>{children}</section>;
}

const formatImageSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const imageTypeLabel = (file: File) =>
  file.type === "image/png" ? "PNG" : file.type === "image/webp" ? "WebP" : "JPG";

const validateSelectedImage = async (file: File) => {
  if (!ORGANIZATION_PROFILE_IMAGE_TYPES.has(file.type)) return "Choose a JPG, PNG, or WebP image.";
  if (file.size <= 0) return "This image is empty. Choose another file.";
  if (file.size > ORGANIZATION_PROFILE_IMAGE_MAX_BYTES) return "This image exceeds the 5 MB maximum size.";
  const objectUrl = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => image.naturalWidth > 0 && image.naturalHeight > 0 ? resolve() : reject();
      image.onerror = reject;
      image.src = objectUrl;
    });
    return "";
  } catch {
    return "This image could not be opened. Choose another file.";
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

function ProfileImageDialog({
  data,
  open,
  onOpenChange,
}: {
  data: PortalData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const profile = data.profile;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const busy = uploading || removing;

  useEffect(() => {
    if (!selectedFile) {
      setSelectedPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setSelectedPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setErrorMessage("");
      setRemoveConfirmOpen(false);
    }
  }, [open]);

  const chooseFile = async (file: File) => {
    setErrorMessage("");
    const validationError = await validateSelectedImage(file);
    if (validationError) {
      setSelectedFile(null);
      setErrorMessage(validationError);
      return;
    }
    setSelectedFile(file);
  };

  const uploadImage = async () => {
    if (!selectedFile || uploading) return;
    setUploading(true);
    setErrorMessage("");
    try {
      const saved = await uploadOrganizationProfileImageInSupabase(selectedFile);
      data.store.upsertOrganizationProfile(saved);
      await data.refresh();
      toast({ title: "Profile picture updated." });
      onOpenChange(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The profile picture could not be uploaded. Check your connection and try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = async () => {
    if (removing) return;
    setRemoving(true);
    setErrorMessage("");
    try {
      const saved = await removeOrganizationProfileImageInSupabase();
      data.store.upsertOrganizationProfile(saved);
      await data.refresh();
      toast({ title: "Profile picture removed." });
      setRemoveConfirmOpen(false);
      onOpenChange(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The profile picture could not be removed. Please try again.");
      setRemoveConfirmOpen(false);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
      <DialogContent className="pwa-profile-image-dialog">
        <DialogHeader>
          <DialogTitle>{profile?.profileImageUrl ? "Manage profile picture" : "Add profile picture"}</DialogTitle>
          <DialogDescription>Use a JPG, PNG, or WebP image smaller than 5 MB.</DialogDescription>
        </DialogHeader>
        <div className="pwa-profile-image-preview">
          {selectedPreviewUrl ? (
            <img src={selectedPreviewUrl} alt="Selected organization profile picture preview" />
          ) : (
            <PwaOrganizationAvatar className="pwa-profile-modal-avatar" organizationName={data.organizationName} profileImageUrl={profile?.profileImageUrl} />
          )}
          <strong>{selectedFile ? selectedFile.name : profile?.profileImageUrl ? "Current profile picture" : "No profile picture uploaded"}</strong>
          {selectedFile ? (
            <>
              <span>{imageTypeLabel(selectedFile)} · {formatImageSize(selectedFile.size)}</span>
              <span className="pwa-profile-image-ready"><CheckCircle2 aria-hidden="true" />Ready to upload</span>
            </>
          ) : <span>{profile?.profileImageUrl ? "This image is currently shown across Y-TRACE." : "Your organization initials are shown as the fallback avatar."}</span>}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-describedby={errorMessage ? "profile-image-error" : "profile-image-help"}
          multiple={false}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void chooseFile(file);
          }}
        />
        <p id="profile-image-help" className="pwa-profile-image-help">
          {selectedFile ? "Review the image before saving it." : "Select an image from your device."}
        </p>
        {errorMessage ? <p id="profile-image-error" role="alert" className="pwa-profile-image-error">{errorMessage}</p> : null}
        <div className="sr-only" aria-live="polite">{uploading ? "Uploading profile picture" : removing ? "Removing profile picture" : selectedFile ? "Image ready to upload" : ""}</div>
        <div className="pwa-profile-image-actions">
          {selectedFile ? (
            <>
              <Button type="button" disabled={busy} onClick={() => void uploadImage()}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                {uploading ? "Uploading picture…" : "Save profile picture"}
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => fileInputRef.current?.click()}><ImagePlus className="mr-2 h-4 w-4" />Choose another picture</Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={() => { setSelectedFile(null); setErrorMessage(""); }}>Cancel selection</Button>
            </>
          ) : (
            <>
              <Button type="button" disabled={busy} onClick={() => fileInputRef.current?.click()}><ImagePlus className="mr-2 h-4 w-4" />{profile?.profileImageUrl ? "Change picture" : "Choose picture"}</Button>
              {profile?.profileImageUrl ? <Button type="button" variant="outline" className="pwa-profile-remove-button" disabled={busy} onClick={() => setRemoveConfirmOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Remove picture</Button> : null}
            </>
          )}
        </div>
        <AlertDialog open={removeConfirmOpen} onOpenChange={(next) => { if (!removing) setRemoveConfirmOpen(next); }}>
          <AlertDialogContent className="pwa-profile-remove-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove profile picture?</AlertDialogTitle>
              <AlertDialogDescription>Your organization initials will be shown instead. You can add another picture at any time.</AlertDialogDescription>
            </AlertDialogHeader>
            {errorMessage ? <p role="alert" className="pwa-profile-image-error">{errorMessage}</p> : null}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={removing} onClick={(event) => { event.preventDefault(); void removeImage(); }}>
                {removing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                {removing ? "Removing picture…" : "Remove picture"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

function ProfileSummary({ data, preview = false }: { data: PortalData; preview?: boolean }) {
  const { go } = usePwaNavigation();
  const profile = getProfileDisplaySource(data);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const openImageDialog = () => {
    if (data.profilePercent < 100) {
      toast({ title: "Finish setting up your organization profile first", description: "Complete all required profile information before adding a profile picture.", variant: "destructive" });
      return;
    }
    setImageDialogOpen(true);
  };

  return (
    <section className="pwa-card pwa-profile-summary">
      <div className="pwa-profile-identity">
        <div className="pwa-profile-photo">
          <button type="button" className="pwa-profile-avatar-button" disabled={preview} aria-label="Manage organization profile picture" onClick={openImageDialog}>
            <PwaOrganizationAvatar className="pwa-large-avatar" organizationName={data.organizationName} profileImageUrl={profile?.profileImageUrl} />
            {!preview ? <span className="pwa-profile-avatar-edit"><Camera aria-hidden="true" /></span> : null}
          </button>
        </div>
        <div>
          <h2>{data.organizationName}</h2>
          <div className="pwa-profile-status-line">
            <StatusBadge status={profile?.profileStatus ?? "incomplete"} />
            {!preview ? <span>{data.profilePercent}% complete</span> : null}
          </div>
          <p>{classificationLabel(profile)}</p>
          <p>{locationLabel(profile)}</p>
        </div>
      </div>
      {!preview ? <div className="pwa-profile-completeness">
        <div><span>Profile completeness</span><strong>{data.profilePercent}%</strong></div>
        <div className="pwa-profile-progress" role="progressbar" aria-label="Profile completeness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={data.profilePercent}>
          <span style={{ width: `${data.profilePercent}%` }} />
        </div>
      </div> : null}
      {!preview ? (
        <div className="pwa-profile-actions">
          <Button onClick={() => go(PWA_ROUTES.profileEdit)}><Pencil aria-hidden="true" />Edit Profile</Button>
          <Button variant="outline" onClick={() => go(PWA_ROUTES.profilePublic)}>View Public Profile</Button>
        </div>
      ) : null}
      <p className="pwa-profile-updated">Last updated: {formatDateTime(profile?.updatedAt)}</p>
      {!preview ? <ProfileImageDialog data={data} open={imageDialogOpen} onOpenChange={setImageDialogOpen} /> : null}
    </section>
  );
}

function ProfileOverview({ data }: { data: PortalData }) {
  const profile = getProfileDisplaySource(data);
  return (
    <div className="pwa-stack">
      <ProfileSection title="Verification Status">
        <div className="pwa-profile-verification">
          <StatusBadge status={profile?.profileStatus ?? "incomplete"} />
          <p>{statusCopy(profile?.profileStatus)}</p>
          {profile?.verifiedAt
            ? <time>Verified {formatDateTime(profile.verifiedAt)}</time>
            : profile?.updatedAt && profile.profileStatus !== "incomplete"
              ? <time>Submitted {formatDateTime(profile.updatedAt)}</time>
              : null}
        </div>
      </ProfileSection>
      <ProfileSection title="Organization Snapshot">
        <dl className="pwa-profile-fields">
          <ProfileField label="Organization Type" value={profile?.isExistingOrganization ? "Existing Organization" : "New Organization"} />
          <ProfileField label="Location" value={locationLabel(profile)} />
          <ProfileField label="Classification" value={classificationLabel(profile)} />
          <ProfileField label="Unique Registration Number (URN)" value={profile?.isExistingOrganization ? requiredValue(profile.organizationIdentifierNumber) : "Not required for this organization type"} />
        </dl>
      </ProfileSection>
      <ProfileSection title="Leadership">
        <dl className="pwa-profile-fields">
          <ProfileField label="Representative" value={displayValue(profile?.representativeName)} />
          <ProfileField label="Adviser" value={displayValue(profile?.adviserName)} />
        </dl>
      </ProfileSection>
      <ProfileSection title="Contact Snapshot">
        <dl className="pwa-profile-fields">
          <ProfileField label="Organization Email" value={displayValue(profile?.organizationEmail)} />
          <ProfileField label="Contact Number" value={displayValue(profile?.contactNumber)} />
          <ProfileField label="Complete Address" value={displayValue(profile?.address)} />
        </dl>
      </ProfileSection>
      <ProfileSection title="Advocacy Focus Areas">
        {profile?.advocacies.length ? (
          <div className="pwa-profile-chips">{profile.advocacies.map((item) => <span key={item}>{item}</span>)}</div>
        ) : <p className="pwa-profile-empty">Missing information. Add at least one advocacy in Edit Profile.</p>}
      </ProfileSection>
    </div>
  );
}

function ProfileDetails({ data }: { data: PortalData }) {
  const profile = getProfileDisplaySource(data);
  const groups = [
    ["Organization Information", [
      ["Organization Name", requiredValue(profile?.organizationName)],
      ["Organization Type", profile?.isExistingOrganization ? "Existing Organization" : "New Organization"],
      ["Unique Registration Number (URN)", profile?.isExistingOrganization ? requiredValue(profile.organizationIdentifierNumber) : "Not required for this organization type"],
    ]],
    ["Contact & Location", [
      ["Organization Email", requiredValue(profile?.organizationEmail)],
      ["Contact Number", requiredValue(profile?.contactNumber)],
      ["District", requiredValue(profile?.district)],
      ["Barangay", requiredValue(profile?.barangay)],
      ["Complete Address", displayValue(profile?.address)],
    ]],
    ["Classification", [
      ["Major Classification", requiredValue(profile?.majorClassification)],
      ["Sub-classification", profile?.subClassification ? formatSubClassificationLabel(profile.subClassification) : "Missing information"],
    ]],
    ["Leadership", [
      ["Representative", displayValue(profile?.representativeName)],
      ["Adviser", displayValue(profile?.adviserName)],
    ]],
  ] as const;
  return (
    <div className="pwa-stack">
      {groups.map(([title, fields]) => (
        <ProfileSection key={title} title={title}>
          <dl className="pwa-profile-fields">{fields.map(([label, value]) => <ProfileField key={label} label={label} value={value} />)}</dl>
        </ProfileSection>
      ))}
      <ProfileSection title="Contacts & Socials">
        <dl className="pwa-profile-fields">
          <ProfileField label="Facebook Page" value={profile?.facebookPageUrl ? "Open Facebook Page" : "Not provided"} link={profile?.facebookPageUrl || undefined} />
        </dl>
      </ProfileSection>
      <ProfileSection title="Record Information">
        <dl className="pwa-profile-fields">
          <ProfileField label="Profile Status" value={(profile?.profileStatus ?? "incomplete").replaceAll("_", " ")} />
          <ProfileField label="Date Created" value={formatDateTime(profile?.createdAt)} />
          <ProfileField label="Last Updated" value={formatDateTime(profile?.updatedAt)} />
          {profile?.verifiedAt ? <ProfileField label="Verification Date" value={formatDateTime(profile.verifiedAt)} /> : null}
        </dl>
      </ProfileSection>
    </div>
  );
}

function CityLedActivityList({ data }: { data: PortalData }) {
  const verifiedActivities = data.cityLedParticipations.filter((item) => item.status === "verified");
  return verifiedActivities.slice(0, 3).length ? (
    <div className="pwa-profile-activity-list">
      {verifiedActivities.slice(0, 3).map((item) => (
        <article key={item.id}>
          <div>
            <strong>{item.activityName}</strong>
            <time>{formatDateTime(item.joinedAt || item.activityDate)}</time>
            {item.venue ? <p>{item.venue}</p> : null}
          </div>
          <StatusBadge status={item.status} />
        </article>
      ))}
    </div>
  ) : <p className="pwa-profile-empty">No recent city-led activities.</p>;
}

function ProfileActivity({ data }: { data: PortalData }) {
  const { go } = usePwaNavigation();
  return (
    <div className="pwa-stack">
      <ProfileSection title="Recent City-Led Activities">
        <CityLedActivityList data={data} />
        {data.cityLedParticipations.length > 3 ? (
          <button type="button" className="pwa-profile-section-link" onClick={() => go(PWA_ROUTES.ypop)}>View all activities <ChevronRight aria-hidden="true" /></button>
        ) : null}
      </ProfileSection>
      <ProfileSection title="Recent Activity">
        {data.profileActivities.slice(0, 3).length ? (
          <div className="pwa-profile-audit-list">
            {data.profileActivities.slice(0, 3).map((item) => (
              <article key={item.id}>
                <span />
                <div>
                  <strong>{item.action.replaceAll("_", " ")}</strong>
                  {item.description ? <p>{item.description}</p> : null}
                  <time>{formatDateTime(item.createdAt)}</time>
                </div>
              </article>
            ))}
          </div>
        ) : <p className="pwa-profile-empty">No profile activity recorded yet.</p>}
        {data.profileActivities.length ? (
          <button type="button" className="pwa-profile-section-link" onClick={() => go(PWA_ROUTES.activity)}>View full activity log <ChevronRight aria-hidden="true" /></button>
        ) : null}
      </ProfileSection>
    </div>
  );
}

export function PwaProfilePage({ data }: { data: PortalData }) {
  const [tab, setTab] = useState<ProfileTab>("overview");
  return (
    <div className="pwa-stack pwa-profile-page">
      <ProfileSummary data={data} />
      <div className="pwa-profile-tabs" role="tablist" aria-label="Organization profile sections">
        {(["overview", "details", "activity"] as const).map((item) => (
          <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>
            {item.charAt(0).toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === "overview" ? <ProfileOverview data={data} /> : null}
        {tab === "details" ? <ProfileDetails data={data} /> : null}
        {tab === "activity" ? <ProfileActivity data={data} /> : null}
      </div>
    </div>
  );
}

function EditorField({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
  return <label className="pwa-profile-editor-field"><span>{label}{required ? " *" : ""}</span>{children}</label>;
}

export function PwaProfileEdit({ data }: { data: PortalData }) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const openImageDialog = () => {
    if (data.profilePercent < 100) {
      toast({ title: "Finish setting up your organization profile first", description: "Complete and save all required profile information before adding a profile picture.", variant: "destructive" });
      return;
    }
    setImageDialogOpen(true);
  };
  const { go } = usePwaNavigation();
  const [draft, setDraft] = useState<OrganizationProfile>(() => data.profile
    ? { ...data.profile, advocacies: [...data.profile.advocacies] }
    : createBlankPwaOrganizationProfile(data));
  const [openSection, setOpenSection] = useState("basic");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data.profile) setDraft({ ...data.profile, advocacies: [...data.profile.advocacies] });
  }, [data.profile]);

  const setField = <K extends keyof OrganizationProfile>(field: K, value: OrganizationProfile[K]) =>
    setDraft((current) => ({ ...current, [field]: value }));
  const toggleAdvocacy = (advocacy: OrganizationProfile["advocacies"][number]) =>
    setDraft((current) => ({ ...current, advocacies: current.advocacies.includes(advocacy) ? current.advocacies.filter((item) => item !== advocacy) : [...current.advocacies, advocacy] }));

  const sectionSummary = useMemo(() => ({
    basic: draft.organizationName && draft.organizationEmail && draft.contactNumber ? "Complete" : "Missing information",
    location: draft.majorClassification && draft.subClassification ? "Complete" : "Missing information",
    advocacy: `${draft.advocacies.length} selected`,
    leadership: draft.representativeName && draft.adviserName ? "Complete" : "Missing information",
    contact: draft.address ? (draft.facebookPageUrl ? "Complete" : "1 field missing") : "Missing information",
  }), [draft]);

  const save = async () => {
    if (!data.user) return;
    const next: OrganizationProfile = {
      ...draft,
      userId: data.user.id,
      organizationName: draft.organizationName.trim(),
      organizationEmail: draft.organizationEmail.trim(),
      contactNumber: draft.contactNumber.trim(),
      district: draft.district.trim(),
      barangay: draft.barangay.trim(),
      organizationIdentifierNumber: draft.organizationIdentifierNumber.trim(),
      adviserName: draft.adviserName.trim(),
      representativeName: draft.representativeName.trim(),
      address: draft.address.trim(),
      facebookPageUrl: draft.facebookPageUrl.trim(),
      internalNotes: draft.internalNotes.trim(),
      profileStatus: "pending_review",
      verifiedAt: "",
      createdAt: data.profile?.createdAt || draft.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (!next.organizationName || !next.organizationEmail || !next.contactNumber || !next.district || !next.barangay ||
      (next.isExistingOrganization && !next.organizationIdentifierNumber) || !next.majorClassification || !next.subClassification || !next.advocacies.length) {
      toast({ title: "Complete the profile", description: "Fill in all required organization, location, classification, and advocacy information.", variant: "destructive" });
      return;
    }
    if (!organizationEmailPattern.test(next.organizationEmail)) {
      toast({ title: "Invalid organization email", description: "Enter a valid organization email address.", variant: "destructive" });
      return;
    }
    if (!philippineContactNumberPattern.test(next.contactNumber)) {
      toast({ title: "Invalid contact number", description: "Enter an 11-digit Philippine mobile number starting with 09.", variant: "destructive" });
      return;
    }
    if (next.representativeName && !isValidPersonName(next.representativeName)) {
      toast({ title: "Invalid Representative Name", description: "Representative name must contain only letters, spaces, hyphens (-), apostrophes ('), and periods (.).", variant: "destructive" });
      return;
    }
    if (next.adviserName && !isValidPersonName(next.adviserName)) {
      toast({ title: "Invalid Adviser Name", description: "Adviser name must contain only letters, spaces, hyphens (-), apostrophes ('), and periods (.).", variant: "destructive" });
      return;
    }
    if (next.facebookPageUrl && !isValidFacebookUrl(next.facebookPageUrl)) {
      toast({ title: "Invalid Facebook URL", description: "Enter a valid Facebook profile or page URL starting with https://facebook.com, https://www.facebook.com, or https://fb.com.", variant: "destructive" });
      return;
    }
    if (!next.isExistingOrganization && !next.organizationIdentifierNumber) {
      next.organizationIdentifierNumber = generateUniqueUrn();
    }
    setSaving(true);
    try {
      if (
        data.profile?.registrationType === "existing_urn" &&
        (data.profile.urnReviewStatus === "needs_correction" || data.profile.urnReviewStatus === "rejected") &&
        next.organizationIdentifierNumber !== data.profile.urn
      ) {
        await resubmitOrganizationUrnInSupabase(next.organizationIdentifierNumber);
      }
      const saved = await upsertOrganizationProfileInSupabase(next);
      data.store.upsertOrganizationProfile(saved);
      await data.refresh();
      toast({ title: "Profile saved", description: "Your profile was updated and sent for admin review." });
      go(PWA_ROUTES.profile, { replace: true });
    } catch (error) {
      toast({ title: "Save failed", description: error instanceof Error ? error.message : "The profile could not be saved.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: "basic", label: "Basic Information" },
    { id: "location", label: "Location & Classification" },
    { id: "advocacy", label: "Advocacy Focus Areas" },
    { id: "leadership", label: "Leadership" },
    { id: "contact", label: "Contact & Social" },
  ] as const;
  return (
    <div className="pwa-stack pwa-profile-editor">
      <PwaBackButton fallback={PWA_ROUTES.profile} label="Organization Profile" />
      <button type="button" className="pwa-card pwa-profile-editor-intro" onClick={openImageDialog}><Pencil aria-hidden="true" /><div><h2>Edit Profile</h2><p>Update your profile picture or avatar.</p></div></button>
      <ProfileImageDialog data={data} open={imageDialogOpen} onOpenChange={setImageDialogOpen} />
      <Accordion type="single" collapsible value={openSection} onValueChange={setOpenSection} className="pwa-profile-editor-sections">
        {sections.map((section) => (
          <AccordionItem key={section.id} value={section.id} className="pwa-card">
            <AccordionTrigger><span>{section.label}<small>{sectionSummary[section.id]}</small></span></AccordionTrigger>
            <AccordionContent>
              {section.id === "basic" ? (
                <div className="pwa-profile-editor-grid">
                  <EditorField label="Organization Name" required><Input value={draft.organizationName} readOnly /></EditorField>
                  <EditorField label="Organization Email" required><Input value={draft.organizationEmail} readOnly /></EditorField>
                  <EditorField label="Contact Number" required>
                    <Input
                      value={draft.contactNumber}
                      onChange={(event) => setField("contactNumber", event.target.value.replace(/\D/g, "").slice(0, 11))}
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={11}
                      placeholder="09XXXXXXXXX"
                    />
                  </EditorField>
                </div>
              ) : null}
              {section.id === "location" ? (
                <div className="pwa-profile-editor-grid">
                  <EditorField label="District" required><Input value={draft.district} readOnly /></EditorField>
                  <EditorField label="Barangay" required><Input value={draft.barangay} readOnly /></EditorField>
                  <EditorField label="Organization Type"><Input value={draft.isExistingOrganization ? "Existing Organization" : "New Organization"} readOnly /></EditorField>
                  <EditorField label="Unique Registration Number (URN)">
                    <Input
                      value={draft.organizationIdentifierNumber || "Auto-generated upon registration"}
                      readOnly
                    />
                  </EditorField>
                  <EditorField label="Major Classification" required>
                    <select value={draft.majorClassification} onChange={(event) => setField("majorClassification", event.target.value as OrganizationProfile["majorClassification"])}>
                      <option value="">Select Major Classification</option>
                      {majorClassificationOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </EditorField>
                  <EditorField label="Sub-classification" required>
                    <select value={draft.subClassification} onChange={(event) => setField("subClassification", event.target.value as OrganizationProfile["subClassification"])}>
                      <option value="">Select Sub Classification</option>
                      {subClassificationOptions.map((option) => <option key={option} value={option}>{formatSubClassificationLabel(option)}</option>)}
                    </select>
                  </EditorField>
                </div>
              ) : null}
              {section.id === "advocacy" ? (
                <div className="pwa-profile-advocacy-options">
                  {advocacyOptions.map((item) => <label key={item}><input type="checkbox" checked={draft.advocacies.includes(item)} onChange={() => toggleAdvocacy(item)} /><span>{item}</span></label>)}
                </div>
              ) : null}
              {section.id === "leadership" ? (
                <div className="pwa-profile-editor-grid">
                  <EditorField label="Representative"><Input value={draft.representativeName} onChange={(event) => setField("representativeName", event.target.value)} /></EditorField>
                  <EditorField label="Adviser"><Input value={draft.adviserName} onChange={(event) => setField("adviserName", event.target.value)} /></EditorField>
                </div>
              ) : null}
              {section.id === "contact" ? (
                <div className="pwa-profile-editor-grid">
                  <EditorField label="Complete Address"><Textarea rows={4} value={draft.address} onChange={(event) => setField("address", event.target.value)} /></EditorField>
                  <EditorField label="Facebook Page"><Input type="url" value={draft.facebookPageUrl} onChange={(event) => setField("facebookPageUrl", event.target.value)} placeholder="https://facebook.com/..." /></EditorField>
                </div>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <div className="pwa-profile-editor-actions">
        <Button variant="outline" disabled={saving} onClick={() => go(PWA_ROUTES.profile)}>Cancel</Button>
        <Button disabled={saving} onClick={() => void save()}>{saving ? "Saving..." : "Save Profile"}</Button>
      </div>
    </div>
  );
}

export function PwaProfilePublicPreview({ data }: { data: PortalData }) {
  const profile = data.profile;
  const [savingVisibility, setSavingVisibility] = useState(false);
  const savePreferences = async (patch: Partial<{
    visible: boolean;
    showRepresentative: boolean;
    showAdviser: boolean;
  }>) => {
    if (!profile) return;
    setSavingVisibility(true);
    try {
      const saved = await updateOrganizationDirectoryPreferences({
        visible: patch.visible ?? Boolean(profile.directoryVisibility),
        showRepresentative: patch.showRepresentative ?? Boolean(profile.directoryShowRepresentative),
        showAdviser: patch.showAdviser ?? Boolean(profile.directoryShowAdviser),
      });
      data.store.upsertOrganizationProfile(saved);
      toast({ title: "Directory preferences updated" });
    } catch (error) {
      toast({ title: "Unable to update directory visibility", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setSavingVisibility(false);
    }
  };
  return (
    <div className="pwa-stack pwa-profile-public">
      <PwaBackButton fallback={PWA_ROUTES.profile} label="Organization Profile" />
      <ProfileSummary data={data} preview />
      <ProfileSection title="Organization Directory Visibility">
        {profile?.profileStatus === "verified" ? (
          <div className="pwa-directory-preferences">
            <label><span><strong>Visible in Organization Directory</strong><small>Other signed-in organizations can discover this public profile.</small></span><Switch disabled={savingVisibility} checked={Boolean(profile.directoryVisibility)} onCheckedChange={(checked) => void savePreferences({ visible: checked })} /></label>
            <label><span><strong>Show representative name</strong><small>Optional personal information.</small></span><Switch disabled={savingVisibility || !profile.directoryVisibility} checked={Boolean(profile.directoryShowRepresentative)} onCheckedChange={(checked) => void savePreferences({ showRepresentative: checked })} /></label>
            <label><span><strong>Show adviser name</strong><small>Optional personal information.</small></span><Switch disabled={savingVisibility || !profile.directoryVisibility} checked={Boolean(profile.directoryShowAdviser)} onCheckedChange={(checked) => void savePreferences({ showAdviser: checked })} /></label>
          </div>
        ) : <p className="pwa-profile-empty">Directory visibility becomes available after organization verification.</p>}
      </ProfileSection>
      <ProfileSection title="Public Organization Information">
        <dl className="pwa-profile-fields">
          {profile?.directoryShowRepresentative ? <ProfileField label="Representative" value={displayValue(profile.representativeName)} /> : null}
          {profile?.directoryShowAdviser ? <ProfileField label="Adviser" value={displayValue(profile.adviserName)} /> : null}
          <ProfileField label="Classification" value={classificationLabel(profile)} />
          <ProfileField label="Location" value={locationLabel(profile)} />
          <ProfileField label="Facebook Page" value={profile?.facebookPageUrl ? "Open Facebook Page" : "Not provided"} link={profile?.facebookPageUrl || undefined} />
        </dl>
      </ProfileSection>
      <ProfileSection title="Recent City-Led Activities"><CityLedActivityList data={data} /></ProfileSection>
    </div>
  );
}
