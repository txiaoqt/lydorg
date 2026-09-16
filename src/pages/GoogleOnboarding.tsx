import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Award,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  Layers,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { isPasswordValid, validatePasswordCriteria } from "@/lib/password-policy";
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
  organizationEmailPattern,
  philippineContactNumberPattern,
  sanitizeContactNumber,
  validateOrganizationName,
} from "@/lib/organization-profile-domain";
import {
  fetchOrganizationProfileInSupabase,
  upsertOrganizationProfileInSupabase,
} from "@/lib/lydo-connect-supabase";
import { generateUniqueUrn } from "@/lib/urn-registration";
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

/**
 * Detects whether the current Supabase user already has an email/password identity.
 * Uses supabase.auth.getUserIdentities() to inspect linked auth identities.
 */
export const checkUserHasEmailIdentity = async (supabaseClient: typeof supabase): Promise<boolean> => {
  if (!supabaseClient) return false;
  try {
    if (typeof supabaseClient.auth.getUserIdentities === "function") {
      const { data, error } = await supabaseClient.auth.getUserIdentities();
      if (!error && data?.identities) {
        return data.identities.some((identity) => identity.provider === "email");
      }
    }
    if (typeof supabaseClient.auth.getUser === "function") {
      const { data } = await supabaseClient.auth.getUser();
      if (data?.user?.identities) {
        return data.user.identities.some((identity) => identity.provider === "email");
      }
    }
  } catch (err) {
    console.error("Failed to check user identities:", err);
  }
  return false;
};

/**
 * Creates/updates the Y-TRACE password for the currently authenticated Supabase user.
 * Attaches the password to the existing Supabase auth user without signing them out
 * or creating a new user account.
 */
export const createYTracePasswordForCurrentUser = async (
  supabaseClient: typeof supabase,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> => {
  if (!supabaseClient) {
    return { success: false, error: "Authentication service is currently unavailable." };
  }
  if (!isPasswordValid(newPassword)) {
    return {
      success: false,
      error: "Password does not meet Y-TRACE security requirements.",
    };
  }

  try {
    const { error } = await supabaseClient.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update password.";
    return { success: false, error: message };
  }
};

export const PasswordCriteriaChecklist = ({ password }: { password: string }) => {
  const criteria = useMemo(() => validatePasswordCriteria(password), [password]);

  const items = [
    { key: "length", label: "8–16 characters", valid: criteria.length },
    { key: "uppercase", label: "Contains an uppercase letter (A–Z)", valid: criteria.uppercase },
    { key: "lowercase", label: "Contains a lowercase letter (a–z)", valid: criteria.lowercase },
    { key: "number", label: "Contains a number (0–9)", valid: criteria.number },
    { key: "special", label: "Contains a special character (!@#$%...)", valid: criteria.special },
  ];

  if (!password) return null;

  return (
    <div
      className="space-y-1.5 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs"
      data-testid="password-criteria-checklist"
    >
      <p className="font-semibold text-muted-foreground">Password Requirements:</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2 transition-colors">
            {item.valid ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success text-green-600 dark:text-green-500" />
            ) : (
              <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-muted-foreground/40" />
            )}
            <span className={item.valid ? "font-medium text-foreground" : "text-muted-foreground"}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
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

  // Password creation state for Google users who don't have an email/password identity yet
  const [hasEmailIdentity, setHasEmailIdentity] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordCreated, setPasswordCreated] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);
  const [touchedConfirmPassword, setTouchedConfirmPassword] = useState(false);

  const needsPasswordCreation = hasEmailIdentity === false && !passwordCreated;

  const confirmMatchHint = useMemo(() => {
    if (!confirmPassword) return null;
    if (password === confirmPassword && isPasswordValid(password)) {
      return (
        <p className="flex items-center gap-1 text-xs text-green-600 dark:text-green-500">
          <CheckCircle2 className="h-3.5 w-3.5" /> Passwords match
        </p>
      );
    }
    if (password !== confirmPassword) {
      return <p className="text-xs text-destructive">Passwords do not match.</p>;
    }
    return null;
  }, [password, confirmPassword]);

  // Load existing profile if any; if already complete, route to dashboard
  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      if (!isInitialized) return;
      if (!user?.id) {
        setIsLoadingProfile(false);
        return;
      }

      try {
        const [existing, hasEmail] = await Promise.all([
          fetchOrganizationProfileInSupabase(user.id),
          checkUserHasEmailIdentity(supabase),
        ]);
        if (!active) return;

        setHasEmailIdentity(hasEmail);

        if (existing && isOrganizationProfileComplete(existing) && hasEmail) {
          navigate("/dashboard", { replace: true });
          return;
        }

        const draft = createOrganizationProfileDraft(user.id, existing, {
          organizationEmail: existing?.organizationEmail || user.email || "",
          organizationName: existing?.organizationName || "",
          contactNumber: existing?.contactNumber || "",
          district: existing?.district || "",
          barangay: existing?.barangay || "",
          isExistingOrganization: existing?.isExistingOrganization ?? false,
          organizationIdentifierNumber: existing?.organizationIdentifierNumber || "",
        });

        if (!draft.representativeName && user.displayName) {
          draft.representativeName = user.displayName;
        }

        setProfileDraft(draft);
      } catch (err) {
        if (!active) return;
        console.error("Failed to load organization profile:", err);
        const draft = createOrganizationProfileDraft(user.id, null, {
          organizationEmail: user.email || "",
        });
        if (user.displayName) {
          draft.representativeName = user.displayName;
        }
        setProfileDraft(draft);
        setHasEmailIdentity(false);
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
  }, [isInitialized, navigate, user]);

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

    // 0. Validate Y-TRACE Password if creation is required
    if (needsPasswordCreation) {
      if (!password) {
        setFormError("Please enter a password for your Y-TRACE account.");
        return;
      }
      if (!isPasswordValid(password)) {
        setFormError(
          "Password does not meet Y-TRACE security requirements. It must be 8–16 characters and contain uppercase, lowercase, numbers, and special characters.",
        );
        return;
      }
      if (password !== confirmPassword) {
        setFormError("Passwords do not match. Please verify your confirmation password.");
        return;
      }
    }

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
    const finalIdentifier = profileDraft.isExistingOrganization
      ? profileDraft.organizationIdentifierNumber.trim()
      : profileDraft.organizationIdentifierNumber.trim() || generateUniqueUrn();

    const payloadToSave: OrganizationProfile = {
      ...profileDraft,
      userId: user.id,
      organizationName: profileDraft.organizationName.trim(),
      organizationEmail: profileDraft.organizationEmail.trim(),
      contactNumber: sanitizedContact,
      district: profileDraft.district.trim(),
      barangay: profileDraft.barangay.trim(),
      isExistingOrganization: Boolean(profileDraft.isExistingOrganization),
      organizationIdentifierNumber: finalIdentifier,
      registrationType: profileDraft.isExistingOrganization ? "existing_urn" : "new_organization",
      urn: finalIdentifier,
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
      // If password creation is required, update password on existing Supabase auth user first
      if (needsPasswordCreation && supabase) {
        const { error: pwdErr } = await supabase.auth.updateUser({
          password: password,
        });
        if (pwdErr) {
          setFormError(pwdErr.message || "Failed to create Y-TRACE password. Please try again.");
          setIsSaving(false);
          return;
        }
        setPasswordCreated(true);
        setHasEmailIdentity(true);
      }

      const saved = await upsertOrganizationProfileInSupabase(payloadToSave);
      const isComplete = isOrganizationProfileComplete(saved);

      if (isComplete) {
        toast({
          title: "Registration completed!",
          description: "Your organization profile and Y-TRACE password have been configured successfully.",
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
      const msg = err instanceof Error ? err.message : "Failed to save organization profile.";
      const isDuplicateUrn = /duplicate|unique|urn|organization_identifier_number/i.test(msg);
      setFormError(isDuplicateUrn ? DUPLICATE_URN_ERROR_MESSAGE : msg);
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
        <Card className="max-w-md w-full p-6 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <h2 className="text-lg font-heading font-semibold">Unable to load profile session</h2>
          <p className="text-sm text-muted-foreground">
            We could not establish your registration session. Please sign in again.
          </p>
          <Button onClick={handleSignOut} className="w-full">
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
          <Link to="/" className="inline-flex items-center gap-2">
            <BrandLogo showText={false} className="h-10 w-auto" />
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </Button>
        </div>

        {/* Header Card */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-0.5 text-xs font-medium text-primary">
                  <GoogleIcon className="h-3.5 w-3.5 shrink-0" />
                  <span>Google Account Authenticated</span>
                </div>
                <CardTitle className="text-2xl sm:text-3xl font-heading font-bold text-foreground tracking-tight pt-1">
                  Complete Your Y-TRACE Organization Registration
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Your Google account has been authenticated successfully. Complete your organization information to
                  continue using Y-TRACE.
                </CardDescription>
              </div>
            </div>

            {/* Authenticated user badge */}
            <div className="mt-4 p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 truncate">
                <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold uppercase shrink-0">
                  {user?.displayName ? user.displayName.charAt(0) : "G"}
                </div>
                <div className="truncate">
                  <p className="font-semibold text-foreground truncate">{user?.displayName || "Google User"}</p>
                  <p className="text-muted-foreground truncate">{user?.email || "No email available"}</p>
                </div>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline-block">
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
                <p className="mt-0.5">{formError}</p>
              </div>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <Building2 className="h-4 w-4 text-primary" />
                <span>1. Organization Details</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Official legal or operating details of your youth organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Organization Name */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="org-name" className="text-xs font-semibold">
                    Organization Name <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    {profileDraft.organizationName?.length || 0}/100
                  </span>
                </div>
                <Input
                  id="org-name"
                  placeholder="e.g. Pasig Youth Leadership Council"
                  value={profileDraft.organizationName || ""}
                  maxLength={100}
                  onChange={(e) => handleFieldChange("organizationName", e.target.value)}
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
                    required
                  />
                </div>
              </div>

              {/* District and Barangay */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="org-district" className="text-xs font-semibold flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>District</span>
                    <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="org-district"
                    value={profileDraft.district || ""}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  >
                    <option value="">Select District</option>
                    {pasigDistrictOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="org-barangay" className="text-xs font-semibold">
                    Barangay <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="org-barangay"
                    value={profileDraft.barangay || ""}
                    disabled={!profileDraft.district}
                    onChange={(e) => handleFieldChange("barangay", e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  >
                    <option value="">
                      {profileDraft.district ? "Select Barangay" : "Select District first"}
                    </option>
                    {districtBarangays.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Registration Type (URN) */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>2. Organization Registration Type</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-border/80 p-3.5 bg-muted/20">
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
                  <Label htmlFor="is-existing-org" className="text-sm font-semibold cursor-pointer">
                    We already have a Unique Registration Number (URN)
                  </Label>
                  <p className="text-xs text-muted-foreground">
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
                    className="font-mono text-sm"
                    required
                  />
                  {urnAvailability === "checking" && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Verifying URN availability…
                    </p>
                  )}
                  {urnAvailability === "registered" && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {DUPLICATE_URN_ERROR_MESSAGE}
                    </p>
                  )}
                  {urnAvailability === "available" && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" /> URN is available for verification.
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-muted/40 border border-dashed border-border text-xs text-muted-foreground">
                  A new Unique Registration Number (URN) will be automatically generated and assigned to your
                  organization upon registration.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Classification */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <Layers className="h-4 w-4 text-primary" />
                <span>3. Organization Classification</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="major-class" className="text-xs font-semibold">
                    Major Classification <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="major-class"
                    value={profileDraft.majorClassification || ""}
                    onChange={(e) =>
                      handleFieldChange(
                        "majorClassification",
                        e.target.value as OrganizationProfile["majorClassification"],
                      )
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  >
                    <option value="">Select Major Classification</option>
                    {majorClassificationOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sub-class" className="text-xs font-semibold">
                    Sub Classification <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="sub-class"
                    value={profileDraft.subClassification || ""}
                    onChange={(e) =>
                      handleFieldChange(
                        "subClassification",
                        e.target.value as OrganizationProfile["subClassification"],
                      )
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  >
                    <option value="">Select Sub Classification</option>
                    {subClassificationOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {formatSubClassificationLabel(opt)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Advocacy Focus Areas */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <Award className="h-4 w-4 text-primary" />
                <span>4. Advocacy Focus Areas</span>
                <span className="text-destructive">*</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Select at least one advocacy focus area championed by your organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {advocacyOptions.map((advocacy) => {
                  const isSelected = profileDraft.advocacies?.includes(advocacy);
                  return (
                    <button
                      key={advocacy}
                      type="button"
                      onClick={() => toggleAdvocacy(advocacy)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 border cursor-pointer select-none ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-background text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground"
                      }`}
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
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <User className="h-4 w-4 text-primary" />
                <span>5. Leadership & Headquarters</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    required
                  />
                  <span className="text-[10px] text-muted-foreground">
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
                    required
                  />
                  <span className="text-[10px] text-muted-foreground">
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
                  className="min-h-[75px] text-sm"
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
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 6: Create Your Y-TRACE Password (Conditional for users without email/password identity) */}
          {needsPasswordCreation && (
            <Card className="border-border bg-card shadow-xs" data-testid="ytrace-password-section">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <Lock className="h-4 w-4 text-primary" />
                  <span>6. Create Your Y-TRACE Password</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Create a password so you can also sign in to Y-TRACE using your email address.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ytrace-password" className="text-xs font-semibold">
                      Password <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-[10px] text-muted-foreground">{password.length}/16</span>
                  </div>
                  <div className="relative">
                    <Input
                      id="ytrace-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong Y-TRACE password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setFormError(null);
                      }}
                      onBlur={() => setTouchedPassword(true)}
                      className="pr-10"
                      autoComplete="new-password"
                      maxLength={16}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 bg-transparent text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {touchedPassword && !password ? (
                    <p className="text-xs text-destructive">Password is required.</p>
                  ) : null}
                </div>

                {/* Password Requirements Checklist */}
                <PasswordCriteriaChecklist password={password} />

                {/* Confirm Password Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="ytrace-confirm-password" className="text-xs font-semibold">
                    Confirm Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="ytrace-confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your Y-TRACE password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setFormError(null);
                      }}
                      onBlur={() => setTouchedConfirmPassword(true)}
                      onPaste={(event) => {
                        event.preventDefault();
                        setFormError("For security, please manually retype your confirmation password.");
                      }}
                      className="pr-10"
                      autoComplete="new-password"
                      maxLength={16}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 bg-transparent text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {touchedConfirmPassword && !confirmPassword ? (
                    <p className="text-xs text-destructive">Please confirm your password.</p>
                  ) : (
                    confirmMatchHint
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleSignOut}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              Cancel & Sign Out
            </Button>
            <Button
              type="submit"
              disabled={isSaving || urnAvailability === "checking" || urnAvailability === "registered"}
              className="w-full sm:w-auto min-w-[220px] font-semibold h-11"
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
