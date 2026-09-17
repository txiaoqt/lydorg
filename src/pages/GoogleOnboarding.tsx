import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Award,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Globe,
  Info,
  Layers,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  pasigDistrictBarangays,
  pasigDistrictOptions,
  type PasigDistrict,
} from "@/lib/pasig-districts";
import {
  advocacyOptions,
  formatSubClassificationLabel,
  majorClassificationOptions,
  subClassificationOptions,
  type Advocacy,
  type OrganizationProfile,
} from "@/lib/lydo-connect-data";
import {
  createOrganizationProfileDraft,
  getMissingEditableProfileRequirements,
  isOrganizationProfileComplete,
  isValidFacebookUrl,
  isValidPersonName,
  mapOrganizationProfileError,
  organizationEmailPattern,
  philippineContactNumberPattern,
  sanitizeContactNumber,
  validateOrganizationName,
} from "@/lib/organization-profile-domain";
import {
  fetchOrganizationProfileInSupabase,
  upsertOrganizationProfileInSupabase,
} from "@/lib/lydo-connect-supabase";
import { checkSignupUrn, DUPLICATE_URN_ERROR_MESSAGE } from "@/lib/urn-validation";

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export interface GoogleOnboardingDraftData {
  version: 1;
  savedAt: string;
  organizationName?: string;
  organizationEmail?: string;
  contactNumber?: string;
  district?: string;
  barangay?: string;
  isExistingOrganization?: boolean;
  organizationIdentifierNumber?: string;
  majorClassification?: string;
  subClassification?: string;
  advocacies?: Advocacy[];
  representativeName?: string;
  adviserName?: string;
  address?: string;
  facebookPageUrl?: string;
}

export const ONBOARDING_DRAFT_KEY_PREFIX = "ytrace-google-onboarding-draft:";

export const getGoogleOnboardingDraftStorageKey = (userId: string): string => {
  return `${ONBOARDING_DRAFT_KEY_PREFIX}${userId}`;
};

export const loadGoogleOnboardingDraft = (userId: string): GoogleOnboardingDraftData | null => {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = window.localStorage.getItem(getGoogleOnboardingDraftStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.version === 1) {
      return parsed as GoogleOnboardingDraftData;
    }
  } catch (err) {
    console.warn("Failed to load Google onboarding draft from localStorage:", err);
  }
  return null;
};

export const saveGoogleOnboardingDraft = (
  userId: string,
  profile: Partial<OrganizationProfile>,
): void => {
  if (typeof window === "undefined" || !userId) return;
  try {
    const draft: GoogleOnboardingDraftData = {
      version: 1,
      savedAt: new Date().toISOString(),
      organizationName: profile.organizationName || "",
      organizationEmail: profile.organizationEmail || "",
      contactNumber: profile.contactNumber || "",
      district: profile.district || "",
      barangay: profile.barangay || "",
      isExistingOrganization: Boolean(profile.isExistingOrganization),
      organizationIdentifierNumber: profile.organizationIdentifierNumber || "",
      majorClassification: profile.majorClassification || "",
      subClassification: profile.subClassification || "",
      advocacies: profile.advocacies || [],
      representativeName: profile.representativeName || "",
      adviserName: profile.adviserName || "",
      address: profile.address || "",
      facebookPageUrl: profile.facebookPageUrl || "",
    };
    window.localStorage.setItem(getGoogleOnboardingDraftStorageKey(userId), JSON.stringify(draft));
  } catch (err) {
    console.warn("Failed to save Google onboarding draft to localStorage:", err);
  }
};

export const clearGoogleOnboardingDraft = (userId: string): void => {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.removeItem(getGoogleOnboardingDraftStorageKey(userId));
  } catch (err) {
    console.warn("Failed to clear Google onboarding draft from localStorage:", err);
  }
};

const GoogleOnboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isInitialized, isAuthenticated, signOut } = useAuth();

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [urnAvailability, setUrnAvailability] = useState<"idle" | "checking" | "available" | "registered" | "error">("idle");

  const [profileDraft, setProfileDraft] = useState<OrganizationProfile | null>(null);
  const profileDraftUserIdRef = useRef<string | null>(null);
  const isLoadedRef = useRef(false);

  // Load existing profile and local draft; if already complete, route to dashboard
  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      if (!isInitialized) return;
      if (!user?.id) {
        setIsLoadingProfile(false);
        return;
      }

      // If already initialized for this same user.id, avoid wiping in-progress in-memory form on token refresh
      if (isLoadedRef.current && profileDraftUserIdRef.current === user.id) {
        return;
      }

      try {
        const existing = await fetchOrganizationProfileInSupabase(user.id);
        if (!active) return;

        if (existing && isOrganizationProfileComplete(existing)) {
          clearGoogleOnboardingDraft(user.id);
          navigate("/dashboard", { replace: true });
          return;
        }

        const localDraft = loadGoogleOnboardingDraft(user.id);

        const draft = createOrganizationProfileDraft(user.id, existing, {
          organizationEmail: localDraft?.organizationEmail || existing?.organizationEmail || user.email || "",
          organizationName: localDraft?.organizationName || existing?.organizationName || "",
          contactNumber: localDraft?.contactNumber || existing?.contactNumber || "",
          district: localDraft?.district || existing?.district || "",
          barangay: localDraft?.barangay || existing?.barangay || "",
          isExistingOrganization: localDraft?.isExistingOrganization ?? existing?.isExistingOrganization ?? false,
          organizationIdentifierNumber: localDraft?.organizationIdentifierNumber || existing?.organizationIdentifierNumber || "",
        });

        if (localDraft?.majorClassification) {
          draft.majorClassification = localDraft.majorClassification;
        }
        if (localDraft?.subClassification) {
          draft.subClassification = localDraft.subClassification;
        }
        if (localDraft?.advocacies && localDraft.advocacies.length > 0) {
          draft.advocacies = localDraft.advocacies;
        }
        if (localDraft?.representativeName) {
          draft.representativeName = localDraft.representativeName;
        } else if (!draft.representativeName && user.displayName) {
          draft.representativeName = user.displayName;
        }
        if (localDraft?.adviserName) {
          draft.adviserName = localDraft.adviserName;
        }
        if (localDraft?.address) {
          draft.address = localDraft.address;
        }
        if (localDraft?.facebookPageUrl) {
          draft.facebookPageUrl = localDraft.facebookPageUrl;
        }

        profileDraftUserIdRef.current = user.id;
        isLoadedRef.current = true;
        setProfileDraft(draft);
      } catch (err) {
        if (!active) return;
        console.error("Failed to load organization profile:", err);
        const localDraft = loadGoogleOnboardingDraft(user.id);
        const draft = createOrganizationProfileDraft(user.id, null, {
          organizationEmail: localDraft?.organizationEmail || user.email || "",
          organizationName: localDraft?.organizationName || "",
          contactNumber: localDraft?.contactNumber || "",
          district: localDraft?.district || "",
          barangay: localDraft?.barangay || "",
          isExistingOrganization: localDraft?.isExistingOrganization ?? false,
          organizationIdentifierNumber: localDraft?.organizationIdentifierNumber || "",
        });
        if (localDraft?.majorClassification) draft.majorClassification = localDraft.majorClassification;
        if (localDraft?.subClassification) draft.subClassification = localDraft.subClassification;
        if (localDraft?.advocacies && localDraft.advocacies.length > 0) draft.advocacies = localDraft.advocacies;
        if (localDraft?.representativeName) draft.representativeName = localDraft.representativeName;
        else if (user.displayName) draft.representativeName = user.displayName;
        if (localDraft?.adviserName) draft.adviserName = localDraft.adviserName;
        if (localDraft?.address) draft.address = localDraft.address;
        if (localDraft?.facebookPageUrl) draft.facebookPageUrl = localDraft.facebookPageUrl;

        profileDraftUserIdRef.current = user.id;
        isLoadedRef.current = true;
        setProfileDraft(draft);
      } finally {
        if (active) {
          setIsLoadingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [isInitialized, navigate, user?.id]);

  // Persist form draft automatically to localStorage whenever the user modifies fields
  useEffect(() => {
    if (!profileDraft || !user?.id || !isLoadedRef.current) return;
    saveGoogleOnboardingDraft(user.id, profileDraft);
  }, [profileDraft, user?.id]);

  const districtBarangays = useMemo(() => {
    if (!profileDraft?.district) return [];
    const districtKey = profileDraft.district as PasigDistrict;
    return pasigDistrictBarangays[districtKey] || [];
  }, [profileDraft?.district]);

  // Debounced URN check when existing organization is selected
  useEffect(() => {
    if (!profileDraft?.isExistingOrganization || !profileDraft.organizationIdentifierNumber?.trim()) {
      setUrnAvailability("idle");
      return;
    }

    let active = true;
    setUrnAvailability("checking");
    const timer = window.setTimeout(async () => {
      const status = await checkSignupUrn(profileDraft.organizationIdentifierNumber);
      if (active) setUrnAvailability(status);
    }, 500);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [profileDraft?.isExistingOrganization, profileDraft?.organizationIdentifierNumber]);

  const handleFieldChange = <K extends keyof OrganizationProfile>(field: K, value: OrganizationProfile[K]) => {
    setProfileDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
    setFormError(null);
  };

  const handleDistrictChange = (district: string) => {
    setProfileDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        district,
        barangay: "", // reset barangay on district change
      };
    });
    setFormError(null);
  };

  const toggleAdvocacy = (advocacy: Advocacy) => {
    setProfileDraft((prev) => {
      if (!prev) return prev;
      const current = prev.advocacies || [];
      const updated = current.includes(advocacy)
        ? current.filter((item) => item !== advocacy)
        : [...current, advocacy];
      return { ...prev, advocacies: updated };
    });
    setFormError(null);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/signin", { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !profileDraft || isSaving) return;

    setFormError(null);

    // 1. Validate Organization Name
    const nameErr = validateOrganizationName(profileDraft.organizationName);
    if (nameErr) {
      setFormError(nameErr);
      return;
    }

    // 2. Validate Email
    if (!profileDraft.organizationEmail?.trim() || !organizationEmailPattern.test(profileDraft.organizationEmail.trim())) {
      setFormError("Please enter a valid organization email address.");
      return;
    }

    // 3. Validate Contact Number
    const sanitizedContact = sanitizeContactNumber(profileDraft.contactNumber);
    if (!philippineContactNumberPattern.test(sanitizedContact)) {
      setFormError("Please enter an 11-digit Philippine mobile number starting with 09.");
      return;
    }

    // 4. Validate District & Barangay
    if (!profileDraft.district?.trim()) {
      setFormError("Please select your Pasig district.");
      return;
    }
    if (!profileDraft.barangay?.trim()) {
      setFormError("Please select your barangay.");
      return;
    }

    // 5. Validate Existing Organization URN
    if (profileDraft.isExistingOrganization) {
      if (!profileDraft.organizationIdentifierNumber?.trim()) {
        setFormError("Please provide your existing Unique Registration Number (URN).");
        return;
      }
      if (urnAvailability === "registered") {
        setFormError(DUPLICATE_URN_ERROR_MESSAGE);
        return;
      }
    }

    // 6. Validate Classification
    if (!profileDraft.majorClassification?.trim()) {
      setFormError("Please select a Major Classification.");
      return;
    }
    if (!profileDraft.subClassification?.trim()) {
      setFormError("Please select a Sub Classification.");
      return;
    }

    // 7. Validate Advocacies
    if (!profileDraft.advocacies || profileDraft.advocacies.length === 0) {
      setFormError("Please select at least one Advocacy Focus Area.");
      return;
    }

    // 8. Validate Leadership
    if (!profileDraft.representativeName?.trim()) {
      setFormError("Official Representative Name is required.");
      return;
    }
    if (!isValidPersonName(profileDraft.representativeName)) {
      setFormError("Representative name contains invalid characters. Numbers and symbols are not allowed.");
      return;
    }
    if (!profileDraft.adviserName?.trim()) {
      setFormError("Official Adviser Name is required.");
      return;
    }
    if (!isValidPersonName(profileDraft.adviserName)) {
      setFormError("Adviser name contains invalid characters. Numbers and symbols are not allowed.");
      return;
    }

    // 9. Validate Address
    if (!profileDraft.address?.trim()) {
      setFormError("Complete office or community address is required.");
      return;
    }

    // 10. Validate Facebook URL (if provided)
    if (profileDraft.facebookPageUrl?.trim() && !isValidFacebookUrl(profileDraft.facebookPageUrl)) {
      setFormError("Please enter a valid Facebook URL (e.g., https://facebook.com/your-org).");
      return;
    }

    // Prepare profile payload
    const isExisting = Boolean(profileDraft.isExistingOrganization);
    const finalIdentifier = isExisting
      ? profileDraft.organizationIdentifierNumber.trim()
      : "";

    const payloadToSave: OrganizationProfile = {
      ...profileDraft,
      userId: user.id,
      organizationName: profileDraft.organizationName.trim(),
      organizationEmail: profileDraft.organizationEmail.trim(),
      contactNumber: sanitizedContact,
      district: profileDraft.district.trim(),
      barangay: profileDraft.barangay.trim(),
      isExistingOrganization: isExisting,
      organizationIdentifierNumber: finalIdentifier,
      registrationType: isExisting ? "existing_urn" : "new_organization",
      urn: isExisting ? finalIdentifier : "",
      urnNormalized: isExisting && finalIdentifier ? finalIdentifier.toUpperCase() : "",
      urnReviewStatus: isExisting ? "pending" : "not_applicable",
      majorClassification: profileDraft.majorClassification,
      subClassification: profileDraft.subClassification,
      advocacies: [...profileDraft.advocacies],
      adviserName: profileDraft.adviserName.trim(),
      representativeName: profileDraft.representativeName.trim(),
      address: profileDraft.address.trim(),
      facebookPageUrl: profileDraft.facebookPageUrl?.trim() || "",
      profileStatus: "pending_review",
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    try {
      const saved = await upsertOrganizationProfileInSupabase(payloadToSave);
      const isComplete = isOrganizationProfileComplete(saved);

      if (isComplete) {
        clearGoogleOnboardingDraft(user.id);
        toast({
          title: "Registration completed!",
          description: "Your organization profile has been submitted successfully.",
        });
        navigate("/dashboard", { replace: true });
      } else {
        const missing = getMissingEditableProfileRequirements(saved);
        setFormError(
          missing.length > 0
            ? `Profile saved, but the following requirements remain incomplete: ${missing.join(", ")}.`
            : "Please verify all required fields are filled to complete your registration.",
        );
        setProfileDraft(saved);
      }
    } catch (err) {
      console.error("Failed to save organization profile:", err);
      setFormError(mapOrganizationProfileError(err, "Failed to save organization profile."));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-background grid place-items-center px-4 text-center">
        <div className="space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <h2 className="text-lg font-heading font-semibold text-foreground">Setting up your session…</h2>
          <p className="text-sm text-muted-foreground">Checking your organization registration details.</p>
        </div>
      </div>
    );
  }

  if (!profileDraft) {
    return (
      <div className="min-h-screen bg-background grid place-items-center px-4 text-center">
        <Card className="max-w-md w-full p-6 text-center space-y-4 rounded-2xl border border-border/80 shadow-sm">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <h2 className="text-lg font-heading font-semibold">Unable to load profile session</h2>
          <p className="text-sm text-muted-foreground">
            We could not establish your registration session. Please sign in again.
          </p>
          <Button onClick={handleSignOut} className="w-full h-10 font-semibold">
            Return to Sign In
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 text-foreground py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top bar with Brand Logo and Sign out */}
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <BrandLogo showText={false} className="h-10 w-auto" />
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-9 px-3 transition-colors active:scale-[0.98]"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </Button>
        </div>

        {/* Header Card */}
        <Card className="rounded-2xl border border-border/80 bg-card shadow-xs">
          <CardHeader className="p-5 sm:p-6 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-0.5 text-xs font-medium text-primary">
                  <GoogleIcon className="h-3.5 w-3.5 shrink-0" />
                  <span>Google Account Authenticated</span>
                </div>
                <CardTitle className="text-2xl sm:text-3xl font-heading font-bold text-foreground tracking-tight pt-1">
                  Complete Your Y-TRACE Organization Registration
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                  Your Google account has been authenticated successfully. Complete your organization information to
                  continue using Y-TRACE.
                </CardDescription>
              </div>
            </div>

            {/* Authenticated user badge */}
            <div className="mt-4 p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 truncate">
                <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold uppercase shrink-0 ring-1 ring-primary/20">
                  {user?.displayName ? user.displayName.charAt(0) : "G"}
                </div>
                <div className="truncate">
                  <p className="font-semibold text-foreground truncate">{user?.displayName || "Google User"}</p>
                  <p className="text-muted-foreground truncate">{user?.email || "No email available"}</p>
                </div>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline-block rounded-md bg-background/80 border border-border/50 px-2 py-0.5">
                Role: Organization User
              </span>
            </div>
          </CardHeader>
        </Card>

        {/* Main Onboarding Form */}
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {formError && (
            <div
              className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive flex items-start gap-3 shadow-xs"
              role="alert"
            >
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to complete registration</p>
                <p className="mt-0.5 text-xs text-destructive/90">{formError}</p>
              </div>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <Card className="rounded-2xl border border-border/80 bg-card shadow-xs">
            <CardHeader className="p-5 sm:p-6 pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <Building2 className="h-4 w-4 text-primary" />
                <span>1. Organization Details</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Official legal or operating details of your youth organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-0 space-y-4">
              {/* Organization Name */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="org-name" className="text-xs font-semibold">
                    Organization Name <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {profileDraft.organizationName?.length || 0}/100
                  </span>
                </div>
                <Input
                  id="org-name"
                  placeholder="e.g. Pasig Youth Leadership Council"
                  value={profileDraft.organizationName || ""}
                  maxLength={100}
                  onChange={(e) => handleFieldChange("organizationName", e.target.value)}
                  autoComplete="organization"
                  className="h-10 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Organization Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="org-email" className="text-xs font-semibold flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Official Email Address</span>
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="org-email"
                    type="email"
                    placeholder="org@example.com"
                    value={profileDraft.organizationEmail || ""}
                    onChange={(e) => handleFieldChange("organizationEmail", e.target.value)}
                    autoComplete="email"
                    className="h-10 text-sm"
                    required
                  />
                </div>

                {/* Contact Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="org-contact" className="text-xs font-semibold flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Contact Number (09XXXXXXXXX)</span>
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="org-contact"
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="09171234567"
                    value={profileDraft.contactNumber || ""}
                    onChange={(e) => handleFieldChange("contactNumber", sanitizeContactNumber(e.target.value))}
                    autoComplete="tel"
                    className="h-10 text-sm"
                    required
                  />
                </div>
              </div>

              {/* District and Barangay */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="org-district" className="text-xs font-semibold flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>District</span>
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <select
                      id="org-district"
                      value={profileDraft.district || ""}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      className={cn(
                        "h-10 w-full appearance-none rounded-md border border-input bg-card px-3 py-2 pr-9 text-sm transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                        "disabled:cursor-not-allowed disabled:bg-muted/50 disabled:text-muted-foreground disabled:opacity-60",
                        !profileDraft.district ? "text-muted-foreground" : "text-foreground font-medium",
                      )}
                      required
                    >
                      <option value="" disabled hidden>
                        Select District
                      </option>
                      {pasigDistrictOptions.map((opt) => (
                        <option key={opt} value={opt} className="text-foreground bg-card">
                          {opt}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="org-barangay" className="text-xs font-semibold flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>Barangay</span>
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <select
                      id="org-barangay"
                      value={profileDraft.barangay || ""}
                      disabled={!profileDraft.district}
                      onChange={(e) => handleFieldChange("barangay", e.target.value)}
                      className={cn(
                        "h-10 w-full appearance-none rounded-md border border-input bg-card px-3 py-2 pr-9 text-sm transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                        "disabled:cursor-not-allowed disabled:bg-muted/50 disabled:text-muted-foreground disabled:opacity-60",
                        !profileDraft.barangay ? "text-muted-foreground" : "text-foreground font-medium",
                      )}
                      required
                    >
                      <option value="" disabled hidden>
                        {profileDraft.district ? "Select Barangay" : "Select District first"}
                      </option>
                      {districtBarangays.map((b) => (
                        <option key={b.id} value={b.name} className="text-foreground bg-card">
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Registration Type (URN) */}
          <Card className="rounded-2xl border border-border/80 bg-card shadow-xs">
            <CardHeader className="p-5 sm:p-6 pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>2. Organization Registration Type</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-0 space-y-4">
              <div className="flex items-start gap-3.5 rounded-xl border border-border/80 p-4 bg-muted/20 transition-colors hover:bg-muted/30">
                <Checkbox
                  id="is-existing-org"
                  checked={profileDraft.isExistingOrganization}
                  onCheckedChange={(checked) => {
                    const isExisting = Boolean(checked);
                    handleFieldChange("isExistingOrganization", isExisting);
                    if (!isExisting) {
                      handleFieldChange("organizationIdentifierNumber", "");
                      setUrnAvailability("idle");
                    }
                  }}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <Label htmlFor="is-existing-org" className="text-sm font-semibold cursor-pointer text-foreground">
                    We already have a Unique Registration Number (URN)
                  </Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Select this option if your organization was previously registered with the Pasig City Local Youth
                    Development Office (LYDO) and already holds an assigned URN.
                  </p>
                </div>
              </div>

              {profileDraft.isExistingOrganization ? (
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="urn-input" className="text-xs font-semibold">
                    Unique Registration Number (URN) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="urn-input"
                    placeholder="e.g. LYDO-PASIG-2024-0012"
                    value={profileDraft.organizationIdentifierNumber || ""}
                    onChange={(e) => handleFieldChange("organizationIdentifierNumber", e.target.value.toUpperCase())}
                    autoComplete="off"
                    className="font-mono text-sm tracking-wide uppercase h-10"
                    required
                  />
                  {urnAvailability === "checking" && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                      <Loader2 className="h-3 w-3 animate-spin text-primary" /> Verifying URN availability…
                    </p>
                  )}
                  {urnAvailability === "registered" && (
                    <p className="text-xs text-destructive flex items-center gap-1.5 font-medium">
                      <AlertCircle className="h-3.5 w-3.5" /> {DUPLICATE_URN_ERROR_MESSAGE}
                    </p>
                  )}
                  {urnAvailability === "available" && (
                    <p className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1.5 font-medium">
                      <Check className="h-3.5 w-3.5" /> URN is available for verification.
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-muted/30 border border-dashed border-border/80 text-xs text-muted-foreground leading-relaxed">
                  <Info className="h-4 w-4 shrink-0 text-muted-foreground/80 mt-0.5" />
                  <span>
                    A new Unique Registration Number (URN) will be automatically generated and assigned to your
                    organization upon registration review.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Classification */}
          <Card className="rounded-2xl border border-border/80 bg-card shadow-xs">
            <CardHeader className="p-5 sm:p-6 pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <Layers className="h-4 w-4 text-primary" />
                <span>3. Organization Classification</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Select the major category and operational sub-classification for your organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="major-class" className="text-xs font-semibold">
                    Major Classification <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <select
                      id="major-class"
                      value={profileDraft.majorClassification || ""}
                      onChange={(e) =>
                        handleFieldChange(
                          "majorClassification",
                          e.target.value as OrganizationProfile["majorClassification"],
                        )
                      }
                      className={cn(
                        "h-10 w-full appearance-none rounded-md border border-input bg-card px-3 py-2 pr-9 text-sm transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                        "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
                        !profileDraft.majorClassification ? "text-muted-foreground" : "text-foreground font-medium",
                      )}
                      required
                    >
                      <option value="" disabled hidden>
                        Select Major Classification
                      </option>
                      {majorClassificationOptions.map((opt) => (
                        <option key={opt} value={opt} className="text-foreground bg-card">
                          {opt}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sub-class" className="text-xs font-semibold">
                    Sub Classification <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <select
                      id="sub-class"
                      value={profileDraft.subClassification || ""}
                      onChange={(e) =>
                        handleFieldChange(
                          "subClassification",
                          e.target.value as OrganizationProfile["subClassification"],
                        )
                      }
                      className={cn(
                        "h-10 w-full appearance-none rounded-md border border-input bg-card px-3 py-2 pr-9 text-sm transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                        "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
                        !profileDraft.subClassification ? "text-muted-foreground" : "text-foreground font-medium",
                      )}
                      required
                    >
                      <option value="" disabled hidden>
                        Select Sub Classification
                      </option>
                      {subClassificationOptions.map((opt) => (
                        <option key={opt} value={opt} className="text-foreground bg-card">
                          {formatSubClassificationLabel(opt)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Advocacy Focus Areas */}
          <Card className="rounded-2xl border border-border/80 bg-card shadow-xs">
            <CardHeader className="p-5 sm:p-6 pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <Award className="h-4 w-4 text-primary" />
                <span>4. Advocacy Focus Areas</span>
                <span className="text-destructive">*</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Select at least one advocacy focus area championed by your organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-0">
              <div className="flex flex-wrap gap-2">
                {advocacyOptions.map((advocacy) => {
                  const isSelected = profileDraft.advocacies?.includes(advocacy);
                  return (
                    <button
                      key={advocacy}
                      type="button"
                      onClick={() => toggleAdvocacy(advocacy)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 border cursor-pointer select-none active:scale-[0.97]",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-card text-muted-foreground border-border/80 hover:bg-muted/60 hover:text-foreground hover:border-border",
                      )}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground shrink-0" />}
                      <span className="capitalize">{advocacy}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Leadership & Location */}
          <Card className="rounded-2xl border border-border/80 bg-card shadow-xs">
            <CardHeader className="p-5 sm:p-6 pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <User className="h-4 w-4 text-primary" />
                <span>5. Leadership & Headquarters</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Authorized youth leaders and physical headquarters location in Pasig City.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="rep-name" className="text-xs font-semibold">
                    Official Representative Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="rep-name"
                    placeholder="Full name of representative"
                    value={profileDraft.representativeName || ""}
                    onChange={(e) => handleFieldChange("representativeName", e.target.value)}
                    autoComplete="name"
                    className="h-10 text-sm"
                    required
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    Authorized youth leader representing the organization.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="adviser-name" className="text-xs font-semibold">
                    Official Adviser Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="adviser-name"
                    placeholder="Full name of organization adviser"
                    value={profileDraft.adviserName || ""}
                    onChange={(e) => handleFieldChange("adviserName", e.target.value)}
                    autoComplete="name"
                    className="h-10 text-sm"
                    required
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    Faculty, community leader, or designated adult adviser.
                  </span>
                </div>
              </div>

              {/* Complete Address */}
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="org-address" className="text-xs font-semibold">
                  Complete Office or Community Address <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="org-address"
                  placeholder="Room/Unit, Street Address, Barangay, Pasig City"
                  value={profileDraft.address || ""}
                  onChange={(e) => handleFieldChange("address", e.target.value)}
                  autoComplete="street-address"
                  className="min-h-[80px] text-sm resize-y"
                  required
                />
              </div>

              {/* Facebook Page (Optional) */}
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="fb-page" className="text-xs font-semibold flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Facebook Page or Profile URL (Optional)</span>
                </Label>
                <Input
                  id="fb-page"
                  type="url"
                  placeholder="https://facebook.com/yourorganization"
                  value={profileDraft.facebookPageUrl || ""}
                  onChange={(e) => handleFieldChange("facebookPageUrl", e.target.value)}
                  autoComplete="url"
                  className="h-10 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Bar */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleSignOut}
              disabled={isSaving}
              className="w-full sm:w-auto h-11 px-5 font-medium transition-transform active:scale-[0.98]"
            >
              Cancel & Sign Out
            </Button>
            <Button
              type="submit"
              disabled={isSaving || urnAvailability === "checking" || urnAvailability === "registered"}
              className="w-full sm:w-auto min-w-[240px] font-semibold h-11 text-sm shadow-xs transition-transform active:scale-[0.98]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting Registration…
                </>
              ) : (
                "Complete Registration & Continue"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoogleOnboarding;
