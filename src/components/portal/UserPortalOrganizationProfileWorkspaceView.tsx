import React, { useState } from "react";
import {
  Building2,
  User,
  CircleUserRound,
  ShieldCheck,
  CheckCircle2,
  Clock,
  PenSquare,
  Eye,
  MapPin,
  ExternalLink,
  Phone,
  Mail,
  Award,
  Users,
  Layers,
  Sparkles,
  Check,
  X,
  Save,
  Globe,
  FileText,
  AlertCircle,
  Medal,
  CalendarDays,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PortalStatusBadge } from "@/components/portal/portal-ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface UserPortalOrganizationProfileWorkspaceViewProps {
  profile: any;
  currentProfile: any;
  profileDraft: any;
  setProfileDraft: React.Dispatch<React.SetStateAction<any>>;
  handleProfileFieldChange: (field: string, val: any) => void;
  toggleAdvocacy: (advocacy: string) => void;
  saveOrganizationProfile: () => Promise<void>;
  savingProfile: boolean;
  profilePercent: number;
  activeProfileTab: string;
  setActiveProfileTab: (tab: string) => void;
  showProfileEditSection: boolean;
  setShowProfileEditSection: (show: boolean) => void;
  profilePreviewOpen: boolean;
  setProfilePreviewOpen: (open: boolean) => void;
  advocacyOptions: string[];
  subClassificationOptions: Array<{ value: string; label: string }>;
  joinedYpopEvents?: Array<any>;
  activityLogs?: Array<any>;
  onViewAllActivities?: () => void;
  formatShortPortalDate: (dateStr: string) => string;
  formatDateTimeLabel: (dateStr: string) => string;
  formatSubClassificationLabel: (key: string) => string;
  openFile?: (url: string, name: string) => void;
  navigate: (path: string) => void;
  userRouteMap: Record<string, string>;
}

export const UserPortalOrganizationProfileWorkspaceView: React.FC<
  UserPortalOrganizationProfileWorkspaceViewProps
> = ({
  profile,
  currentProfile,
  profileDraft,
  handleProfileFieldChange,
  toggleAdvocacy,
  saveOrganizationProfile,
  savingProfile,
  profilePercent,
  activeProfileTab,
  setActiveProfileTab,
  showProfileEditSection,
  setShowProfileEditSection,
  profilePreviewOpen,
  setProfilePreviewOpen,
  advocacyOptions,
  subClassificationOptions,
  joinedYpopEvents = [],
  activityLogs = [],
  onViewAllActivities,
  formatShortPortalDate,
  formatDateTimeLabel,
  formatSubClassificationLabel,
  navigate,
  userRouteMap,
}) => {
  const profileStatus = currentProfile?.profileStatus ?? profileDraft.profileStatus;
  const profileName = currentProfile?.organizationName?.trim() || profile.organizationName || "Organization Profile";
  const profileSubClass = formatSubClassificationLabel(profile.subClassification) || "N/A";

  // Calculate consistent URN display using authentic database value
  const profileUrn =
    currentProfile?.organizationIdentifierNumber?.trim() ||
    profile?.organizationIdentifierNumber?.trim() ||
    profileDraft?.organizationIdentifierNumber?.trim();

  const displayUrn = profileUrn
    ? profileUrn
    : profile.isExistingOrganization
    ? "Not set"
    : "Not required";

  // Form dirty tracker
  const [isFormDirty, setIsFormDirty] = useState(false);

  const onFieldChange = (field: string, val: any) => {
    handleProfileFieldChange(field, val);
    setIsFormDirty(true);
  };

  const onAdvocacyToggle = (advocacy: string) => {
    toggleAdvocacy(advocacy);
    setIsFormDirty(true);
  };

  const handleSave = async () => {
    await saveOrganizationProfile();
    setIsFormDirty(false);
  };

  return (
    <div className="bg-background text-foreground font-sans space-y-4 sm:space-y-6 max-w-[1440px] mx-auto pt-0 pb-2 sm:py-2">
      {/* 1. SaaS Hero Workspace Section (Refined Composition & Fully Responsive Header) */}
      <div className="bg-gradient-to-r from-card via-indigo-50/10 to-slate-50/40 dark:from-card dark:via-indigo-950/10 dark:to-slate-900/40 p-4 sm:p-6 rounded-2xl border border-border/60 shadow-xs transition-all duration-200">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(260px,290px)] items-start lg:items-center gap-4 sm:gap-6 lg:gap-8">
          {/* Left: Cohesive Horizontal Identity Group */}
          <div className="flex items-start gap-3 sm:gap-4.5 min-w-0 flex-1 w-full">
            {/* Tinted Radial Highlight Avatar Container */}
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-primary/20 via-indigo-500/15 to-primary/10 dark:from-primary/30 dark:via-indigo-950/40 dark:to-primary/15 text-primary border border-primary/30 flex items-center justify-center shrink-0 shadow-2xs mt-0.5 sm:mt-0">
              <CircleUserRound className="h-7 w-7 sm:h-9 sm:w-9 text-primary" />
            </div>

            <div className="space-y-1 sm:space-y-1.5 min-w-0 flex-1 break-words [overflow-wrap:anywhere] w-full">
              {/* Row 1: Org Title + Status Badge */}
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <h1 className="text-lg sm:text-2xl lg:text-3xl font-black tracking-tight text-foreground leading-tight break-words [overflow-wrap:anywhere] max-w-full">
                  {profileName}
                </h1>
                <div className="shrink-0">
                  <PortalStatusBadge status={profileStatus} />
                </div>
              </div>

              {/* Row 2: Organization Type • Classification */}
              <p className="text-xs sm:text-sm text-muted-foreground font-semibold flex flex-wrap items-center gap-x-2 gap-y-0.5 leading-snug">
                <span>{profile.majorClassification || "Youth Organization"}</span>
                <span className="text-muted-foreground/60">•</span>
                <span>{profileSubClass}</span>
              </p>

              {/* Row 3: Location & Representative */}
              <div className="flex flex-wrap items-center gap-x-2.5 sm:gap-x-4 gap-y-0.5 text-xs text-muted-foreground font-medium pt-0.5 leading-snug">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{profile.district || "District I"} • {profile.barangay || "Pasig City"}</span>
                </span>
                {profile.representativeName && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="inline-flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate max-w-[180px] sm:max-w-[220px]">{profile.representativeName}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Cohesive Action & Slim 4px Completion Panel */}
          <div className="flex flex-col items-stretch gap-2.5 sm:gap-3 bg-card/80 backdrop-blur-xs p-3.5 sm:p-4 rounded-xl border border-border/60 shadow-2xs w-full lg:w-auto">
            {/* Completion Header & Slim 4px Progress Bar */}
            <div className="w-full space-y-1.5 border-b border-border/40 pb-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">Profile Completion</span>
                <span className="font-black text-primary text-xs tracking-tight">{profilePercent}%</span>
              </div>
              {/* 4px Slim Progress Bar */}
              <div className="h-[4px] w-full rounded-full bg-primary/15 overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${profilePercent}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium text-right pt-0.5">
                Updated {currentProfile?.updatedAt ? formatShortPortalDate(currentProfile.updatedAt) : "recently"}
              </p>
            </div>

            {/* Grouped Action Buttons */}
            <div className="flex items-center gap-2 w-full pt-0.5">
              <Button
                type="button"
                onClick={() => {
                  setActiveProfileTab("organization-details");
                  setShowProfileEditSection(true);
                }}
                className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs gap-1.5 min-h-[38px] sm:min-h-0 h-9 text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <PenSquare className="h-3.5 w-3.5" /> Edit Profile
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setProfilePreviewOpen(true)}
                className="flex-1 rounded-xl border-border bg-card text-foreground hover:bg-accent shadow-2xs gap-1.5 min-h-[38px] sm:min-h-0 h-9 text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" /> View Public
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Modern Segmented Tabs Navigation Bar with Horizontal Scroll Support */}
      {!showProfileEditSection && (
        <div className="relative">
          <div className="flex items-center gap-1.5 bg-card border border-border/60 p-1.5 rounded-2xl overflow-x-auto shadow-xs overscroll-x-contain touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {[
              { id: "overview", label: "Overview" },
              { id: "organization-details", label: "Organization Details" },
              { id: "classification", label: "Classification" },
              { id: "advocacy", label: "Advocacy" },
              { id: "contacts-socials", label: "Contacts & Socials" },
              { id: "ypop-participation", label: "YPOP Participation" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveProfileTab(tab.id)}
                className={cn(
                  "rounded-xl px-3.5 sm:px-4 py-2 text-xs font-bold transition-all duration-200 shrink-0 whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
                  activeProfileTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-2xs scale-[1.01]"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. EDIT PROFILE MODE */}
      {showProfileEditSection ? (
        <Card className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-xs space-y-6 relative pb-28 transition-all duration-200">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="space-y-0.5">
              <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
                <PenSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /> Edit Organization Profile
              </h2>
              <p className="text-xs text-muted-foreground">
                Update organization details, classification, advocacies, and leadership info.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowProfileEditSection(false)}
              className="h-8 rounded-xl border-border text-xs font-semibold hover:bg-accent cursor-pointer"
            >
              Close Editor
            </Button>
          </div>

          {/* Section 1: Basic Information */}
          <div className="space-y-3.5 sm:space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> 1. Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Organization Name <span className="text-red-500">*</span></label>
                <Input
                  value={profileDraft.organizationName || ""}
                  className="h-9 text-xs rounded-xl bg-muted/40 border-border text-muted-foreground cursor-not-allowed"
                  placeholder="Organization name"
                  readOnly
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Organization Email <span className="text-red-500">*</span></label>
                <Input
                  type="email"
                  value={profileDraft.organizationEmail || ""}
                  className="h-9 text-xs rounded-xl bg-muted/40 border-border text-muted-foreground cursor-not-allowed"
                  placeholder="Organization email"
                  readOnly
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Contact Number <span className="text-red-500">*</span></label>
                <Input
                  value={profileDraft.contactNumber || ""}
                  inputMode="numeric"
                  maxLength={11}
                  className="h-9 text-xs rounded-xl bg-muted/40 border-border text-muted-foreground cursor-not-allowed"
                  placeholder="09XXXXXXXXX"
                  readOnly
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">District <span className="text-red-500">*</span></label>
                <Input
                  value={profileDraft.district || ""}
                  className="h-9 text-xs rounded-xl bg-muted/40 border-border text-muted-foreground cursor-not-allowed"
                  placeholder="District"
                  readOnly
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Barangay <span className="text-red-500">*</span></label>
                <Input
                  value={profileDraft.barangay || ""}
                  className="h-9 text-xs rounded-xl bg-muted/40 border-border text-muted-foreground cursor-not-allowed"
                  placeholder="Barangay"
                  readOnly
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Organization Type</label>
                <Input
                  value={profileDraft.isExistingOrganization ? "Existing Organization" : "Youth Organization"}
                  className="h-9 text-xs rounded-xl bg-muted/40 border-border text-muted-foreground cursor-not-allowed"
                  readOnly
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-foreground">Unique Registration Number (URN)</label>
                <Input
                  value={profileDraft.organizationIdentifierNumber || "Auto-generated upon registration"}
                  className="h-9 text-xs rounded-xl bg-muted/40 border-border text-muted-foreground font-mono cursor-not-allowed"
                  placeholder="Unique Registration Number (URN)"
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Section 2: Classification */}
          <div className="space-y-3.5 sm:space-y-4 pt-3 border-t border-border/40">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" /> 2. Classification
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Major Classification <span className="text-red-500">*</span></label>
                <select
                  value={profileDraft.majorClassification || "Youth Organization"}
                  onChange={(e) => onFieldChange("majorClassification", e.target.value)}
                  className="h-9 w-full rounded-xl bg-background border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="Youth Organization">Youth Organization</option>
                  <option value="Youth-Serving Organization">Youth-Serving Organization</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Sub Classification <span className="text-red-500">*</span></label>
                <select
                  value={profileDraft.subClassification || ""}
                  onChange={(e) => onFieldChange("subClassification", e.target.value)}
                  className="h-9 w-full rounded-xl bg-background border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="">Select Sub Classification</option>
                  {subClassificationOptions.map((opt: any) => {
                    const val = typeof opt === "string" ? opt : opt?.value || opt;
                    const label = typeof opt === "string" ? formatSubClassificationLabel(opt) : opt?.label || opt;
                    return (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Advocacies */}
          <div className="space-y-3.5 sm:space-y-4 pt-3 border-t border-border/40">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5" /> 3. Advocacy Focus Areas
            </h3>
            <p className="text-xs text-muted-foreground">Select all advocacies that apply to your organization.</p>
            <div className="flex flex-wrap gap-2 sm:gap-2.5">
              {advocacyOptions.map((advocacy) => {
                const isSelected = profileDraft.advocacies?.includes(advocacy);
                return (
                  <button
                    key={advocacy}
                    type="button"
                    onClick={() => onAdvocacyToggle(advocacy)}
                    className={cn(
                      "px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1.5 border cursor-pointer hover:-translate-y-0.5",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs scale-[1.02]"
                        : "bg-card text-muted-foreground border-border/80 hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground shrink-0" />}
                    <span className="capitalize">{advocacy}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Leadership */}
          <div className="space-y-3.5 sm:space-y-4 pt-3 border-t border-border/40">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> 4. Leadership & Representatives
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Representative Name</label>
                <Input
                  value={profileDraft.representativeName || ""}
                  onChange={(e) => onFieldChange("representativeName", e.target.value)}
                  className="h-9 text-xs rounded-xl bg-background border-border"
                  placeholder="Official Representative Name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Adviser Name</label>
                <Input
                  value={profileDraft.adviserName || ""}
                  onChange={(e) => onFieldChange("adviserName", e.target.value)}
                  className="h-9 text-xs rounded-xl bg-background border-border"
                  placeholder="Official Adviser Name"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Location & Socials */}
          <div className="space-y-3.5 sm:space-y-4 pt-3 border-t border-border/40">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> 5. Location & Facebook Page
            </h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Full Address</label>
                <Textarea
                  value={profileDraft.address || ""}
                  onChange={(e) => onFieldChange("address", e.target.value)}
                  className="text-xs rounded-xl bg-background border-border min-h-[70px]"
                  placeholder="Complete office or community address"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Facebook Page URL</label>
                <Input
                  value={profileDraft.facebookPageUrl || ""}
                  onChange={(e) => onFieldChange("facebookPageUrl", e.target.value)}
                  className="h-9 text-xs rounded-xl bg-background border-border"
                  placeholder="https://facebook.com/your-org-page"
                />
              </div>
            </div>
          </div>

          {/* Sticky Save Bar Footer with Safe-Area Cushioning */}
          <div className={cn(
            "sticky bottom-0 left-0 right-0 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 p-3.5 sm:p-4 px-4 sm:px-6 bg-card/95 backdrop-blur-md border-t border-border/80 rounded-b-2xl flex items-center justify-between shadow-lg z-20 transition-all duration-200 pb-[max(0.875rem,env(safe-area-inset-bottom))]",
            !isFormDirty && "opacity-75"
          )}>
            <div className="flex items-center gap-2 text-xs min-w-0 pr-2">
              {isFormDirty ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span className="font-semibold text-amber-600 dark:text-amber-400 truncate">Unsaved Changes</span>
                </>
              ) : (
                <span className="font-medium text-muted-foreground truncate">No unsaved changes</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowProfileEditSection(false)}
                className="h-8 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={savingProfile || !isFormDirty}
                className="h-8 text-xs font-bold rounded-xl bg-primary text-primary-foreground shadow-2xs gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" /> {savingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        /* READ-ONLY VIEW (TABS CONTENT) */
        <div className="space-y-5 sm:space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeProfileTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
              {/* Left Column (8 Cols Desktop) */}
              <div className="lg:col-span-8 space-y-5 sm:space-y-6">
                {/* Organization Information Card */}
                <Card className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 space-y-4 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" /> Organization Overview
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                    <div className="bg-accent/20 p-3.5 sm:p-4 rounded-xl border border-border/50 space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground">Organization Name</span>
                      <p className="font-bold text-foreground text-sm">{profile.organizationName || "Name not set"}</p>
                    </div>
                    <div className="bg-accent/20 p-3.5 sm:p-4 rounded-xl border border-border/50 space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground">Organization Type</span>
                      <p className="font-bold text-foreground text-sm">{profile.isExistingOrganization ? "Existing Organization" : "Youth Organization"}</p>
                    </div>
                    <div className="bg-accent/20 p-3.5 sm:p-4 rounded-xl border border-border/50 space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground">District & Barangay</span>
                      <p className="font-bold text-foreground text-sm">{profile.district || "District I"} • {profile.barangay || "Pasig City"}</p>
                    </div>
                    <div className="bg-accent/20 p-3.5 sm:p-4 rounded-xl border border-border/50 space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground">Registration URN</span>
                      <p className="font-bold text-foreground text-sm font-mono">{displayUrn}</p>
                    </div>
                  </div>
                </Card>

                {/* Verification Card */}
                <Card className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Compliance Verification
                    </h3>
                    <PortalStatusBadge status={profileStatus} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs">
                    <div className="bg-accent/20 p-3.5 sm:p-4 rounded-xl border border-border/50 space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground">Verified Date</span>
                      <p className="font-bold text-foreground text-sm">
                        {currentProfile?.verifiedAt
                          ? formatShortPortalDate(currentProfile.verifiedAt)
                          : currentProfile?.profileStatus === "verified"
                          ? "Verified"
                          : "Pending Review"}
                      </p>
                    </div>
                    <div className="bg-accent/20 p-3.5 sm:p-4 rounded-xl border border-border/50 space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground">Representative</span>
                      <p className="font-bold text-foreground text-sm truncate">{profile.representativeName || "Unassigned Representative"}</p>
                    </div>
                    <div className="bg-accent/20 p-3.5 sm:p-4 rounded-xl border border-border/50 space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground">Adviser</span>
                      <p className="font-bold text-foreground text-sm truncate">{profile.adviserName || "Unassigned Adviser"}</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Right Column (4 Cols Desktop): Dynamic Profile Activity Feed */}
              <div className="lg:col-span-4 space-y-4">
                <Card className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Profile Activity</h3>
                      <p className="text-[11px] text-muted-foreground pt-0.5">Recent account timeline</p>
                    </div>
                    {onViewAllActivities && activityLogs.length > 3 ? (
                      <button
                        type="button"
                        onClick={onViewAllActivities}
                        className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                      >
                        View all →
                      </button>
                    ) : null}
                  </div>
                  {activityLogs.length > 0 ? (
                    <div className="space-y-3.5 text-xs relative pl-4 border-l border-border/60">
                      {activityLogs.slice(0, 5).map((log: any) => (
                        <div key={log.id || log.createdAt} className="space-y-0.5 relative">
                          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                          <p className="font-bold text-foreground leading-snug">{log.description || log.action || "Profile Event"}</p>
                          {log.adminRemarks?.trim() ? (
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{log.adminRemarks}</p>
                          ) : null}
                          <span className="text-[10px] text-muted-foreground/70 font-medium">
                            {formatDateTimeLabel(log.createdAt || log.updatedAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic py-2">No profile activity recorded yet.</p>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* TAB 2: ORGANIZATION DETAILS (Clean Definition Grid) */}
          {activeProfileTab === "organization-details" && (
            <Card className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-xs space-y-4">
              <div className="border-b border-border/40 pb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Basic Information Definition</h3>
                <p className="text-xs text-muted-foreground/80 mt-0.5">Official registered credentials and administrative location.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                <div className="bg-accent/20 p-3.5 sm:p-4 rounded-xl border border-border/50 space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">Organization Name</span>
                  <p className="font-bold text-foreground text-sm sm:text-base">{profile.organizationName || "Not set"}</p>
                </div>
                <div className="bg-accent/20 p-3.5 sm:p-4 rounded-xl border border-border/50 space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">Organization Type</span>
                  <p className="font-bold text-foreground text-sm sm:text-base">{profile.isExistingOrganization ? "Existing Organization" : "Youth Organization"}</p>
                </div>
                <div className="bg-accent/20 p-3.5 sm:p-4 rounded-xl border border-border/50 space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">District</span>
                  <p className="font-bold text-foreground text-sm sm:text-base">{profile.district || "Not set"}</p>
                </div>
                <div className="bg-accent/20 p-3.5 sm:p-4 rounded-xl border border-border/50 space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">Barangay</span>
                  <p className="font-bold text-foreground text-sm sm:text-base">{profile.barangay || "Not set"}</p>
                </div>
                <div className="bg-accent/20 p-3.5 sm:p-4 rounded-xl border border-border/50 space-y-1 sm:col-span-2">
                  <span className="text-xs font-semibold text-muted-foreground">Unique Registration Number (URN)</span>
                  <p className="font-bold text-foreground text-sm sm:text-base font-mono">{displayUrn}</p>
                </div>
              </div>
            </Card>
          )}

          {/* TAB 3: CLASSIFICATION */}
          {activeProfileTab === "classification" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <Card className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-xs space-y-2.5">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground">Major Classification</span>
                <p className="text-lg sm:text-xl font-black text-foreground">{profile.majorClassification || "Youth Organization"}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">Official primary tier classification defined by PCYDO.</p>
              </Card>

              <Card className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-xs space-y-2.5">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground">Sub Classification</span>
                <p className="text-lg sm:text-xl font-black text-foreground">{profileSubClass}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">Specialized organization category sub-classification.</p>
              </Card>
            </div>
          )}

          {/* TAB 4: ADVOCACY */}
          {activeProfileTab === "advocacy" && (
            <Card className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-xs space-y-4">
              <div className="border-b border-border/40 pb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Advocacy Focus Areas</h3>
                <p className="text-xs text-muted-foreground/80 mt-0.5">Selected areas of engagement and public community initiatives.</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-2.5">
                {(profile.advocacies || ["Education", "Environment", "Governance", "Health", "Social Inclusion"]).map((adv: string) => (
                  <span
                    key={adv}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full"
                  >
                    <Award className="h-3.5 w-3.5 text-primary shrink-0" /> {adv}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* TAB 5: CONTACTS & SOCIALS */}
          {activeProfileTab === "contacts-socials" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <Card className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Leadership & Representatives
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="bg-accent/20 p-3.5 sm:p-4 rounded-xl border border-border/50 space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">Representative</span>
                    <p className="font-bold text-foreground text-sm">{profile.representativeName || "Unassigned Representative"}</p>
                  </div>
                  <div className="bg-accent/20 p-3.5 sm:p-4 rounded-xl border border-border/50 space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">Adviser</span>
                    <p className="font-bold text-foreground text-sm">{profile.adviserName || "Unassigned Adviser"}</p>
                  </div>
                </div>
              </Card>

              <Card className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" /> Location & Social Media
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="bg-accent/20 p-3.5 sm:p-4 rounded-xl border border-border/50 space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">Office Address</span>
                    <p className="font-bold text-foreground text-sm leading-relaxed">{profile.address || "Address not provided"}</p>
                  </div>
                  <div className="bg-accent/20 p-3.5 sm:p-4 rounded-xl border border-border/50 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold text-muted-foreground">Facebook Page</span>
                      {profile.facebookPageUrl ? (
                        <a
                          href={profile.facebookPageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-primary text-xs truncate block hover:underline pt-0.5 break-all"
                        >
                          {profile.facebookPageUrl}
                        </a>
                      ) : (
                        <p className="text-muted-foreground italic text-xs pt-0.5">Not provided</p>
                      )}
                    </div>
                    {profile.facebookPageUrl && (
                      <Button type="button" variant="ghost" size="sm" asChild className="h-8 w-8 p-0 shrink-0 text-primary hover:bg-primary/10">
                        <a href={profile.facebookPageUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 6: YPOP PARTICIPATION */}
          {activeProfileTab === "ypop-participation" && (
            <Card className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Medal className="h-4 w-4 text-primary" /> Recent City-Led Activities
                  </h3>
                  <p className="text-xs text-muted-foreground/80 mt-0.5">Recorded participation in Pasig City Youth Development Office events.</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(userRouteMap.ypop || "/ypop")}
                  className="text-xs text-primary font-bold hover:bg-primary/10 gap-1 cursor-pointer shrink-0"
                >
                  View all <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="space-y-3">
                {joinedYpopEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic p-4 text-center border border-border/60 rounded-xl bg-accent/20">
                    No recent city-led YPOP activities recorded.
                  </p>
                ) : (
                  joinedYpopEvents.map((act: any) => (
                    <div key={act.id} className="p-3.5 sm:p-4 rounded-xl border border-border/60 bg-accent/20 hover:bg-accent/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <CalendarDays className="h-5 w-5" />
                        </div>
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <p className="font-bold text-foreground text-sm truncate">{act.title || act.activityName}</p>
                          <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span>{act.date ? formatShortPortalDate(act.date) : "Recently"}</span>
                            <span className="text-muted-foreground/40">•</span>
                            <span>Organizer: {act.organizer || "PCYDO"}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t border-border/30 sm:border-t-0">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                          Verified
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(userRouteMap.ypop || "/ypop")}
                          className="h-8 text-xs font-semibold rounded-xl border-border hover:bg-accent cursor-pointer"
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* 4. PUBLIC PROFILE PREVIEW MODAL */}
      <Dialog open={profilePreviewOpen} onOpenChange={setProfilePreviewOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-xl p-0 overflow-hidden rounded-3xl bg-card border-border shadow-2xl">
          <div className="p-4 sm:p-7 space-y-5 sm:space-y-6 max-h-[85vh] overflow-y-auto">
            {/* Header Title */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3 sm:pb-4">
              <div className="space-y-0.5">
                <DialogTitle className="text-lg sm:text-xl font-black tracking-tight text-foreground flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" /> Public Profile Preview
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  This preview reflects the profile details currently saved on the portal.
                </DialogDescription>
              </div>
            </div>

            {/* Identity Banner Card */}
            <div className="bg-gradient-to-br from-primary/10 via-accent/30 to-indigo-500/10 p-4 sm:p-5 rounded-2xl border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
              <div className="flex items-start sm:items-center gap-3 sm:gap-3.5 min-w-0">
                <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-2xl bg-card border border-border/80 flex items-center justify-center shrink-0 shadow-2xs text-primary mt-0.5 sm:mt-0">
                  <CircleUserRound className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-base sm:text-lg text-foreground truncate">{profileName}</span>
                    <PortalStatusBadge status={profileStatus} />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    {profile.majorClassification || "Youth Organization"} • {profileSubClass}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {profile.district || "District I"} • {profile.barangay || "Pasig City"}
                  </p>
                </div>
              </div>

              <div className="bg-card/90 backdrop-blur-xs p-2.5 sm:p-3 px-3.5 sm:px-4 rounded-xl border border-border/60 text-center shrink-0 shadow-2xs self-stretch sm:self-auto">
                <span className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Profile Complete</span>
                <span className="text-base sm:text-lg font-black text-primary">{profilePercent}%</span>
              </div>
            </div>

            {/* Leadership & Representatives */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-accent/20 p-3.5 rounded-xl border border-border/50 space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">Representative</span>
                <p className="font-bold text-foreground text-sm">{profile.representativeName || "Unassigned Representative"}</p>
              </div>
              <div className="bg-accent/20 p-3.5 rounded-xl border border-border/50 space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">Adviser</span>
                <p className="font-bold text-foreground text-sm">{profile.adviserName || "Unassigned Adviser"}</p>
              </div>
            </div>

            {/* Facebook Page */}
            <div className="bg-accent/20 p-3.5 rounded-xl border border-border/50 space-y-1 text-xs">
              <span className="text-xs font-semibold text-muted-foreground">Facebook Page</span>
              {profile.facebookPageUrl ? (
                <a
                  href={profile.facebookPageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-primary truncate block hover:underline flex items-center gap-1 text-xs pt-0.5 break-all"
                >
                  {profile.facebookPageUrl} <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ) : (
                <p className="text-muted-foreground italic">Not provided</p>
              )}
            </div>

            {/* Recent City-Led Activities */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent City-Led Activities</span>
              <div className="space-y-2">
                {joinedYpopEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic p-3 text-center border border-border/60 rounded-xl bg-accent/20">
                    No recent city-led YPOP activities recorded.
                  </p>
                ) : (
                  joinedYpopEvents.slice(0, 3).map((act: any) => (
                    <div key={act.id} className="p-3 rounded-xl border border-border/60 bg-accent/20 flex items-center justify-between text-xs">
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <p className="font-bold text-foreground truncate">{act.title || act.activityName}</p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <span>{act.date ? formatShortPortalDate(act.date) : "Recently"}</span>
                          <span>•</span>
                          <span className="truncate">{act.organizer || "PCYDO"}</span>
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full shrink-0">
                        Verified
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
