import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, CheckCircle2, Eye, EyeOff, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pasigDistrictBarangays, pasigDistrictOptions, type PasigDistrict } from "@/lib/pasig-districts";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import BrandLogo from "@/components/BrandLogo";
import { PolicyContent } from "@/components/PolicyContent";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import {
  isGmailFormat,
  loadSignupDraft,
  PENDING_SIGNUP_EMAIL_KEY,
  saveSignupDraft,
  VERIFY_FRESH_NAV_KEY,
} from "@/lib/email-validation";
import { OTP_ISSUED_AT_KEY } from "@/lib/verification-error";
import { resolveDisplayPolicy } from "@/lib/ytrace-policy";
import {
  generateUniqueUrn,
  normalizeUrn,
  validateUrn,
} from "@/lib/urn-registration";
import { sanitizeContactNumber } from "@/lib/organization-profile-domain";
import { DUPLICATE_URN_ERROR_MESSAGE, checkSignupUrn, type UrnAvailability } from "@/lib/urn-validation";
import { isPasswordValid, validatePasswordCriteria } from "@/lib/password-policy";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  beginPwaAuthFlow,
  isPwaAuthFlow,
  PWA_ENTRY_ROUTE,
  pwaAuthRoute,
} from "@/user/pwa/pwaAuthFlow";
import { readPwaPreferences } from "@/user/pwa/hooks/usePwaPreferences";
import { getPwaThemeStyle } from "@/user/pwa/pwaAccentThemes";

type LegalPolicyType = "terms" | "privacy";
type PolicyVersion = {
  title: string;
  terms_content: string;
  privacy_content: string;
  version: string;
  effective_date: string | null;
};

/** A labeled form section with a top border divider */
const FormSection = ({ title, children, hidden = false }: { title: string; children: React.ReactNode; hidden?: boolean }) => (
  <div className={`space-y-4 ${hidden ? "hidden" : ""}`}>
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
        {title}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
    {children}
  </div>
);

const RequiredLabel = ({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) => (
  <Label htmlFor={htmlFor}>
    {children} <span className="text-destructive" aria-hidden="true">*</span>
    <span className="sr-only"> required</span>
  </Label>
);

const PasswordCriteriaChecklist = ({ password }: { password: string }) => {
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
    <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
      <p className="font-semibold text-muted-foreground">Password Requirements:</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2 transition-colors">
            {item.valid ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
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

const SignUp = () => {
  const initialDraft = useMemo(() => loadSignupDraft(), []);
  const [currentStep, setCurrentStep] = useState<1 | 2>(() => (initialDraft ? 2 : 1));
  const [name, setName] = useState(() => initialDraft?.organizationName ?? "");
  const [email, setEmail] = useState(() => initialDraft?.email ?? "");
  const [contactNumber, setContactNumber] = useState(() => initialDraft?.contactNumber ?? "");
  const [district, setDistrict] = useState<PasigDistrict | "">(() => (initialDraft?.district as PasigDistrict) ?? "");
  const [barangayId, setBarangayId] = useState(() => initialDraft?.barangayId ?? "");
  const [isExistingOrganization, setIsExistingOrganization] = useState(() => initialDraft?.isExistingOrganization ?? false);
  const [organizationIdentifierNumber, setOrganizationIdentifierNumber] = useState(() => initialDraft?.organizationIdentifierNumber ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [agreedToPolicies, setAgreedToPolicies] = useState(() => initialDraft?.agreedToPolicies ?? false);
  const [inlineError, setInlineError] = useState("");
  const [urnAvailability, setUrnAvailability] = useState<UrnAvailability>("idle");
  const [legalPolicyType, setLegalPolicyType] = useState<LegalPolicyType | null>(null);
  const [activePolicy, setActivePolicy] = useState<PolicyVersion | null>(null);

  // Track which fields have been blurred so we only show errors after interaction
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const touch = (field: string) => setTouched((prev) => new Set(prev).add(field));

  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const pwaFlow = isPwaAuthFlow(location.search);
  const pwaTheme = readPwaPreferences().accentTheme;
  const { signUp } = useAuth();
  const useSupabaseAuth = Boolean(supabase);

  const passwordsMatch = password === confirmPassword;
  const isGmailEmail = isGmailFormat(email);
  const normalizedContactNumber = contactNumber.trim();
  const isContactNumberValid = /^09\d{9}$/.test(normalizedContactNumber);
  const districtBarangays = district ? pasigDistrictBarangays[district] : [];
  const selectedBarangayName = districtBarangays.find((b) => b.id === barangayId)?.name ?? "N/A";
  const selectedDistrictName = district || "N/A";
  const normalizedIdentifierNumber = isExistingOrganization
    ? normalizeUrn(organizationIdentifierNumber)
    : generateUniqueUrn();
  const urnError = isExistingOrganization ? validateUrn(organizationIdentifierNumber) : null;
  const isIdentifierValid = !urnError && urnAvailability !== "registered";

  const canSubmit = Boolean(
    useSupabaseAuth &&
    name.trim() &&
    name.trim().length <= 100 &&
    email.trim() &&
    isGmailEmail &&
    isContactNumberValid &&
    district &&
    barangayId &&
    isIdentifierValid &&
    password &&
    isPasswordValid(password) &&
    confirmPassword &&
    passwordsMatch &&
    agreedToPolicies,
  );

  const confirmMatchHint = useMemo(() => {
    if (!confirmPassword) return null;
    if (password === confirmPassword && isPasswordValid(password)) {
      return (
        <p className="flex items-center gap-1 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5" /> Passwords match
        </p>
      );
    }
    if (password !== confirmPassword) {
      return <p className="text-xs text-destructive">Passwords do not match.</p>;
    }
    return null;
  }, [password, confirmPassword]);

  // Reset barangay when district changes
  useEffect(() => {
    if (!district) { setBarangayId(""); return; }
    const opts = pasigDistrictBarangays[district];
    if (!opts.some((b) => b.id === barangayId)) setBarangayId("");
  }, [barangayId, district]);

  // Clear identifier when existing-org is unchecked
  useEffect(() => {
    if (!isExistingOrganization) {
      setOrganizationIdentifierNumber("");
      setUrnAvailability("idle");
    }
  }, [isExistingOrganization]);

  useEffect(() => {
    if (!isExistingOrganization || urnError) {
      setUrnAvailability("idle");
      return;
    }

    let active = true;
    setUrnAvailability("checking");
    const timeoutId = window.setTimeout(() => {
      void checkSignupUrn(organizationIdentifierNumber).then((result) => {
        if (active) setUrnAvailability(result);
      });
    }, 500);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [isExistingOrganization, organizationIdentifierNumber, urnError]);

  useEffect(() => {
    if (new URLSearchParams(location.search).get("pwa") === "1") beginPwaAuthFlow();
  }, [location.search]);

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
        if (active && data) setActivePolicy(data as PolicyVersion);
      });
    return () => { active = false; };
  }, []);

  const displayPolicy = resolveDisplayPolicy(activePolicy);

  const continueToAccount = async () => {
    setInlineError("");
    setTouched((previous) => new Set([...previous, "name", "identifier"]));
    if (!name.trim()) {
      setInlineError("Enter your organization name to continue.");
      return;
    }
    if (name.trim().length > 100) {
      setInlineError("Organization name must not exceed 100 characters.");
      return;
    }
    if (isExistingOrganization) {
      if (urnError) {
        setInlineError(urnError);
        return;
      }
      const urnStatus = await checkSignupUrn(organizationIdentifierNumber);
      if (urnStatus === "registered") {
        setUrnAvailability("registered");
        setInlineError(DUPLICATE_URN_ERROR_MESSAGE);
        return;
      }
    }
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep === 1) {
      void continueToAccount();
      return;
    }
    setInlineError("");

    if (name.trim().length > 100) {
      setInlineError("Organization name must not exceed 100 characters.");
      return;
    }

    const missingFields = [
      !name.trim() ? "Organization Name" : "",
      !email.trim() ? "Email Address" : "",
      !normalizedContactNumber ? "Contact Number" : "",
      !district ? "District" : "",
      !barangayId ? "Barangay" : "",
      isExistingOrganization && !normalizedIdentifierNumber ? "Unique Registration Number (URN)" : "",
      !password ? "Password" : "",
      !confirmPassword ? "Confirm Password" : "",
      !agreedToPolicies ? "Privacy Policy & Terms of Service agreement" : "",
    ].filter(Boolean);

    if (missingFields.length) {
      setTouched(new Set(["name", "email", "contactNumber", "district", "barangay", "identifier", "password", "confirmPassword", "policies"]));
      setInlineError(`Complete all required fields: ${missingFields.join(", ")}.`);
      return;
    }
    const passwordCriteria = validatePasswordCriteria(password);
    if (!passwordCriteria.length) {
      setInlineError("Password must be between 8 and 16 characters long.");
      return;
    }
    if (!passwordCriteria.uppercase) {
      setInlineError("Password must contain at least one uppercase letter (A–Z).");
      return;
    }
    if (!passwordCriteria.lowercase) {
      setInlineError("Password must contain at least one lowercase letter (a–z).");
      return;
    }
    if (!passwordCriteria.number) {
      setInlineError("Password must contain at least one numeric digit (0–9).");
      return;
    }
    if (!passwordCriteria.special) {
      setInlineError("Password must contain at least one special character.");
      return;
    }
    if (!passwordsMatch) {
      setInlineError("Password and Confirm Password must match.");
      return;
    }
    if (!isGmailEmail) {
      setInlineError("Email must end with @gmail.com.");
      return;
    }
    if (!isContactNumberValid) {
      setInlineError("Contact Number must be 11 digits starting with 09.");
      return;
    }
    if (isExistingOrganization) {
      if (urnError) {
        setInlineError(urnError);
        return;
      }
      const urnStatus = await checkSignupUrn(organizationIdentifierNumber);
      if (urnStatus === "registered") {
        setUrnAvailability("registered");
        setInlineError(DUPLICATE_URN_ERROR_MESSAGE);
        return;
      }
    }

    setIsConfirmOpen(true);
  };

  const proceedCreateAccount = async () => {
    if (name.trim().length > 100) {
      setIsConfirmOpen(false);
      setInlineError("Organization name must not exceed 100 characters.");
      return;
    }
    if (isExistingOrganization) {
      const urnStatus = await checkSignupUrn(organizationIdentifierNumber);
      if (urnStatus === "registered") {
        setIsConfirmOpen(false);
        setIsCreating(false);
        setUrnAvailability("registered");
        setInlineError(DUPLICATE_URN_ERROR_MESSAGE);
        toast({
          title: "URN already registered",
          description: DUPLICATE_URN_ERROR_MESSAGE,
          variant: "destructive",
        });
        return;
      }
    }

    if (!canSubmit) {
      setIsConfirmOpen(false);
      setInlineError("Some required details are missing or invalid. Review every field before creating the account.");
      return;
    }

    // Persist non-sensitive registration draft (never passwords)
    saveSignupDraft({
      organizationName: name.trim(),
      isExistingOrganization,
      organizationIdentifierNumber: normalizedIdentifierNumber,
      email: email.trim().toLowerCase(),
      contactNumber: normalizedContactNumber,
      district,
      barangayId,
      agreedToPolicies,
    });

    setIsCreating(true);
    const result = await signUp({
      email: email.trim().toLowerCase(),
      password,
      organizationName: name.trim(),
      contactNumber: normalizedContactNumber,
      district,
      barangayId,
      barangayName: selectedBarangayName,
      isExistingOrganization,
      organizationIdentifierNumber: normalizedIdentifierNumber,
      pwaFlow,
    });
    setIsCreating(false);

    if (result.error) {
      setIsConfirmOpen(false);
      const isDuplicateUrn = /duplicate|unique|urn|organization_identifier_number/i.test(result.error);
      setInlineError(isDuplicateUrn ? DUPLICATE_URN_ERROR_MESSAGE : result.error);
      toast({
        title: isDuplicateUrn ? "URN already registered" : "Registration Error",
        description: isDuplicateUrn ? DUPLICATE_URN_ERROR_MESSAGE : result.error,
        variant: "destructive",
      });
      return;
    }

    setIsConfirmOpen(false);
    if (result.needsEmailConfirmation) {
      const normalizedEmail = email.trim().toLowerCase();
      window.sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, normalizedEmail);
      window.sessionStorage.setItem(VERIFY_FRESH_NAV_KEY, "true");
      window.sessionStorage.setItem(OTP_ISSUED_AT_KEY, String(Date.now()));
      toast({
        title: "Verification code sent",
        description: "Enter the six-digit code from your email to finish creating your account.",
      });
      navigate(pwaFlow ? pwaAuthRoute("/verify-email") : "/verify-email", {
        state: { email: normalizedEmail, fromSignup: true },
      });
      return;
    }

    toast({
      title: "Account created!",
      description: "Your account is ready.",
    });
    navigate(pwaFlow ? "/app" : "/dashboard", { replace: true });
  };

  return (
    <div
      className={`${pwaFlow ? "ytrace-pwa-app pwa-public-auth-page" : ""} min-h-screen bg-background text-foreground flex items-center justify-center px-4 pt-20 pb-10 sm:py-10 relative overflow-hidden`}
      data-pwa-theme={pwaFlow ? pwaTheme : undefined}
      style={pwaFlow ? getPwaThemeStyle(pwaTheme) : undefined}
    >
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-180px] right-[-140px] h-[360px] w-[360px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-[-190px] left-[-150px] h-[400px] w-[400px] rounded-full bg-primary/15 blur-3xl" />
      </div>

      {/* Page-level Brand Logo (upper-left viewport mark) */}
      <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-20">
        <Link
          to={pwaFlow ? PWA_ENTRY_ROUTE : "/"}
          className="inline-flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandLogo showText={false} className="h-12 sm:h-14 w-auto" />
        </Link>
      </div>

      <div className="w-full max-w-md relative z-10">
        

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 card-shadow space-y-6">
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">Create Organization Account</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Register your youth organization to access the Y-TRACE compliance portal.
              </p>
            </div>

            <ol className="grid grid-cols-3" aria-label="Registration progress">
              {(["Organization", "Account", "Verification"] as const).map((label, index) => {
                const step = index + 1;
                const isComplete = step < currentStep;
                const isActive = step === currentStep;
                return (
                  <li key={label} className="relative flex flex-col items-center gap-2 text-center">
                    {index > 0 ? (
                      <span className={`absolute right-1/2 top-3.5 h-px w-full ${step <= currentStep ? "bg-primary" : "bg-border"}`} aria-hidden="true" />
                    ) : null}
                    <span
                      className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${isActive || isComplete
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground"
                        }`}
                      aria-current={isActive ? "step" : undefined}
                    >
                      {isComplete ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : step}
                    </span>
                    <span className={`text-[11px] font-medium sm:text-xs ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                      {label}
                    </span>
                  </li>
                );
              })}
            </ol>

            {!useSupabaseAuth && (
              <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-warning">
                Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and{" "}
                <code>VITE_SUPABASE_ANON_KEY</code> in your <code>.env</code> file.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>

              {/* ── Section 1: Organization details ── */}
              <FormSection title="Organization details" hidden={currentStep !== 1}>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <RequiredLabel htmlFor="name">Organization Name</RequiredLabel>
                    <span className="text-[11px] text-muted-foreground">{name.length} / 100</span>
                  </div>
                  <Input
                    id="name"
                    placeholder="Enter your organization's name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setInlineError("");
                    }}
                    onBlur={() => touch("name")}
                    maxLength={100}
                    required
                  />
                  {touched.has("name") && !name.trim() ? (
                    <p className="text-xs text-destructive">Organization name is required.</p>
                  ) : name.trim().length > 100 ? (
                    <p className="text-xs text-destructive">Organization name must not exceed 100 characters.</p>
                  ) : null}
                </div>
              </FormSection>

              <FormSection title="Account details" hidden={currentStep !== 2}>
                <div className="space-y-1.5">
                  <RequiredLabel htmlFor="email">Email Address</RequiredLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@gmail.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setInlineError("");
                    }}
                    onBlur={() => touch("email")}
                    autoComplete="email"
                    aria-invalid={touched.has("email") && (!email.trim() || !isGmailEmail)}
                    aria-describedby="signup-email-status"
                    required
                  />
                  <div id="signup-email-status" aria-live="polite">
                    {touched.has("email") && !email.trim() ? (
                      <p className="text-xs text-destructive">Email Address is required.</p>
                    ) : touched.has("email") && email && !isGmailEmail ? (
                      <p className="text-xs text-destructive">Email must end with @gmail.com.</p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <RequiredLabel htmlFor="contactNumber">Contact Number</RequiredLabel>
                  <Input
                    id="contactNumber"
                    type="tel"
                    placeholder="09XXXXXXXXX"
                    value={contactNumber}
                    onChange={(e) => {
                      setContactNumber(sanitizeContactNumber(e.target.value));
                      setInlineError("");
                    }}
                    onBlur={() => touch("contactNumber")}
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={11}
                    required
                  />
                  {touched.has("contactNumber") && !normalizedContactNumber ? (
                    <p className="text-xs text-destructive">Contact number is required.</p>
                  ) : touched.has("contactNumber") && !isContactNumberValid ? (
                    <p className="text-xs text-destructive">
                      Must be 11 digits starting with 09.
                    </p>
                  ) : null}
                </div>
              </FormSection>

              {/* ── Section 2: Location ── */}
              <FormSection title="Location" hidden={currentStep !== 2}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <RequiredLabel htmlFor="district">District</RequiredLabel>
                    <Select
                      value={district}
                      onValueChange={(v) => { setDistrict(v as PasigDistrict); touch("district"); }}
                    >
                      <SelectTrigger id="district">
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>
                      <SelectContent>
                        {pasigDistrictOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {touched.has("district") && !district ? <p className="text-xs text-destructive">District is required.</p> : null}
                  </div>

                  <div className="space-y-1.5">
                    <RequiredLabel htmlFor="barangay">Barangay</RequiredLabel>
                    <Select
                      value={barangayId}
                      onValueChange={(v) => { setBarangayId(v); touch("barangay"); }}
                      disabled={!district}
                    >
                      <SelectTrigger id="barangay">
                        <SelectValue placeholder={district ? "Select Barangay" : "Choose district first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {districtBarangays.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {touched.has("barangay") && !barangayId ? <p className="text-xs text-destructive">Barangay is required.</p> : null}
                  </div>
                </div>
              </FormSection>

              {/* ── Section 3: Registration type ── */}
              <FormSection title="Registration type" hidden={currentStep !== 1}>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="existing-organization"
                    checked={isExistingOrganization}
                    onCheckedChange={(checked) => setIsExistingOrganization(Boolean(checked))}
                    disabled={isCreating}
                    className="shrink-0 mt-[3px]"
                  />
                  <div>
                    <Label htmlFor="existing-organization" className="text-sm font-medium cursor-pointer">
                      We already have a Unique Registration Number (URN)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Select this option if your organization has previously registered with the Pasig City Local Youth Development Office.
                    </p>
                  </div>
                </div>

                {!isExistingOrganization ? (
                  <div className="space-y-1.5 pt-3">
                    <Label className="text-sm font-medium text-foreground">Unique Registration Number (URN)</Label>
                    <p className="text-xs text-muted-foreground bg-muted/40 border border-border/70 rounded-lg p-3">
                      A URN will be assigned to your organization once your registration is successfully completed.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-3">
                    <div className="flex items-center gap-1.5">
                      <RequiredLabel htmlFor="organizationIdentifierNumber">Unique Registration Number (URN)</RequiredLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary p-0.5"
                            aria-label="URN help guidance"
                          >
                            <HelpCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent side="top" align="start" className="w-80 p-3.5 text-xs space-y-2">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <HelpCircle className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                            About Unique Registration Number (URN)
                          </div>
                          <p className="leading-relaxed text-muted-foreground">
                            Enter the URN exactly as it appears in your existing LYDO / PCYDO registration record.
                          </p>
                          <p className="leading-relaxed text-muted-foreground">
                            LYDO / PCYDO will verify this number against its official registration record so you will not need to submit the six initial registration documents once the URN is confirmed.
                          </p>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Input
                      id="organizationIdentifierNumber"
                      placeholder="PCYDO-XXXX-XXXX"
                      value={organizationIdentifierNumber}
                      onChange={(e) => setOrganizationIdentifierNumber(e.target.value.toUpperCase())}
                      onInput={(e) => { e.currentTarget.value = e.currentTarget.value.toUpperCase(); }}
                      onBlur={() => touch("identifier")}
                      required
                    />
                    {touched.has("identifier") && urnError ? (
                      <p id="urn-error" className="text-xs text-destructive">{urnError}</p>
                    ) : urnAvailability === "registered" ? (
                      <p id="urn-error" className="text-xs text-destructive">URN is unavailable.</p>
                    ) : urnAvailability === "checking" ? (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                        Checking URN availability...
                      </p>
                    ) : !urnError && organizationIdentifierNumber.trim() && urnAvailability === "available" ? (
                      <p id="urn-success" className="text-xs text-success">URN is acceptable.</p>
                    ) : null}
                  </div>
                )}
              </FormSection>

              {currentStep === 1 ? (
                <div className="space-y-2.5">
                  <Button type="button" className="w-full font-semibold" onClick={continueToAccount}>
                    Continue to Account Details
                  </Button>
                  {inlineError ? (
                    <p className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive">
                      {inlineError}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* ── Section 4: Account security ── */}
              <FormSection title="Account security" hidden={currentStep !== 2}>
                <div className="space-y-1.5">
                  <RequiredLabel htmlFor="password">Password</RequiredLabel>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setInlineError("");
                      }}
                      onBlur={() => touch("password")}
                      className="pr-10"
                      autoComplete="new-password"
                      maxLength={16}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 bg-transparent hover:bg-transparent active:bg-transparent focus:bg-transparent text-muted-foreground transition-colors hover:text-foreground active:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {touched.has("password") && !password ? <p className="text-xs text-destructive">Password is required.</p> : null}
                </div>

                <PasswordCriteriaChecklist password={password} />

                <div className="space-y-1.5">
                  <RequiredLabel htmlFor="confirmPassword">Confirm Password</RequiredLabel>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setInlineError("");
                      }}
                      onBlur={() => touch("confirmPassword")}
                      onPaste={(event) => {
                        event.preventDefault();
                        setInlineError("For security, please manually retype your confirmation password.");
                      }}
                      className="pr-10"
                      autoComplete="new-password"
                      maxLength={16}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 bg-transparent hover:bg-transparent active:bg-transparent focus:bg-transparent text-muted-foreground transition-colors hover:text-foreground active:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {touched.has("confirmPassword") && !confirmPassword ? (
                    <p className="text-xs text-destructive">Please confirm your password.</p>
                  ) : confirmMatchHint}
                </div>
              </FormSection>

              {/* ── Policy agreement ── */}
              <div className={`items-start gap-3 rounded-xl border border-border/70 bg-muted/30 p-4 ${currentStep === 2 ? "flex" : "hidden"}`}>
                <Checkbox
                  id="policy-agreement"
                  checked={agreedToPolicies}
                  onCheckedChange={(checked) => {
                    setAgreedToPolicies(Boolean(checked));
                    touch("policies");
                  }}
                  disabled={isCreating}
                  className="shrink-0 mt-[3px]"
                />
                <Label htmlFor="policy-agreement" className="text-sm font-normal leading-relaxed cursor-pointer">
                  I have read and agree to the{" "}
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setLegalPolicyType("privacy");
                    }}
                  >
                    Privacy Policy
                  </button>{" & "}
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setLegalPolicyType("terms");
                    }}
                  >
                    Terms of Service
                  </button>{" "}
                  <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
              </div>
              {currentStep === 2 && touched.has("policies") && !agreedToPolicies ? <p className="-mt-4 text-xs text-destructive">You must accept the Privacy Policy &amp; Terms of Service.</p> : null}

              {/* Submit */}
              <div className={`space-y-2.5 ${currentStep === 2 ? "" : "hidden"}`}>
                <div className="grid grid-cols-[auto_1fr] gap-3">
                  <Button type="button" variant="outline" onClick={() => { setInlineError(""); setCurrentStep(1); }} disabled={isCreating}>
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="font-semibold"
                    disabled={!useSupabaseAuth || isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account…
                      </>
                    ) : (
                      "Continue to Verification"
                    )}
                  </Button>
                </div>

                {inlineError && (
                  <p className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive">
                    {inlineError}
                  </p>
                )}
              </div>
            </form>
          </div>

        {/* Below-card links */}
        <div className="mt-5 space-y-2.5 text-center text-sm text-muted-foreground">
          <p>
            Already have an account?{" "}
            <Link to={pwaFlow ? pwaAuthRoute("/signin") : "/signin"} className="font-medium text-primary hover:text-primary/80 transition-colors">
              Sign in
            </Link>
          </p>
          <p>
            <Link to={pwaFlow ? PWA_ENTRY_ROUTE : "/"} className="hover:text-foreground transition-colors">
              ← Back to {pwaFlow ? "welcome" : "home"}
            </Link>
          </p>
        </div>
      </div>

      <Dialog open={legalPolicyType !== null} onOpenChange={(open) => { if (!open) setLegalPolicyType(null); }}>
        <DialogContent className="grid max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-3xl grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden p-0">
          <DialogHeader className="px-5 pt-5 pr-12 sm:px-6 sm:pt-6">
            <DialogTitle>{legalPolicyType === "privacy" ? "Privacy Policy" : "Terms of Service"}</DialogTitle>
            <DialogDescription>
              Version {displayPolicy.version} · Effective {displayPolicy.effectiveDate}
            </DialogDescription>
          </DialogHeader>
          <div className="mx-5 grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/40 p-1 sm:mx-6" role="tablist" aria-label="Legal policies">
            <button
              type="button"
              role="tab"
              aria-selected={legalPolicyType === "privacy"}
              className={`min-h-11 rounded-lg px-3 text-sm font-medium transition-colors ${legalPolicyType === "privacy" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setLegalPolicyType("privacy")}
            >
              Privacy Policy
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={legalPolicyType === "terms"}
              className={`min-h-11 rounded-lg px-3 text-sm font-medium transition-colors ${legalPolicyType === "terms" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setLegalPolicyType("terms")}
            >
              Terms of Service
            </button>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6" tabIndex={0}>
            <PolicyContent
              content={legalPolicyType === "privacy" ? displayPolicy.privacy_content : displayPolicy.terms_content}
              hideDocumentTitle
              hideMetadata
            />
          </div>
          <DialogFooter className="border-t border-border px-5 py-4 sm:px-6">
            <Button type="button" className="w-full sm:w-auto" onClick={() => setLegalPolicyType(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Review your details</AlertDialogTitle>
            <AlertDialogDescription>
              Please review your information carefully. Make sure everything is correct before creating your organization account.
            </AlertDialogDescription>
            <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3 space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Organization</span>
                <span className="font-medium text-foreground text-right">{name.trim() || "—"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium text-foreground text-right">{email.trim() || "—"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Contact Number</span>
                <span className="font-medium text-foreground text-right">{normalizedContactNumber}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">District</span>
                <span className="font-medium text-foreground">{selectedDistrictName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Barangay</span>
                <span className="font-medium text-foreground">{selectedBarangayName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Existing Organization</span>
                <span className="font-medium text-foreground">{isExistingOrganization ? "Yes" : "No"}</span>
              </div>
              {isExistingOrganization && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Identifier</span>
                  <span className="font-medium text-foreground">{normalizedIdentifierNumber || "—"}</span>
                </div>
              )}
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCreating}>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={proceedCreateAccount} disabled={isCreating}>
              {isCreating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>
              ) : (
                "Confirm & Create"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SignUp;
