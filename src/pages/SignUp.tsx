import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BrandLogo from "@/components/BrandLogo";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
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

type BarangayOption = { id: string; name: string };
type PasigDistrict = "District I" | "District II";

const pasigDistrictBarangays: Record<PasigDistrict, BarangayOption[]> = {
  "District I": [
    { id: "barangay-bagong-ilog", name: "Bagong Ilog" },
    { id: "barangay-bagong-katipunan", name: "Bagong Katipunan" },
    { id: "barangay-bambang", name: "Bambang" },
    { id: "barangay-buting", name: "Buting" },
    { id: "barangay-caniogan", name: "Caniogan" },
    { id: "barangay-kalawaan", name: "Kalawaan" },
    { id: "barangay-kapasigan", name: "Kapasigan" },
    { id: "barangay-kapitolyo", name: "Kapitolyo" },
    { id: "barangay-malinao", name: "Malinao" },
    { id: "barangay-oranbo", name: "Oranbo" },
    { id: "barangay-palatiw", name: "Palatiw" },
    { id: "barangay-pineda", name: "Pineda" },
    { id: "barangay-sagad", name: "Sagad" },
    { id: "barangay-san-antonio", name: "San Antonio" },
    { id: "barangay-san-joaquin", name: "San Joaquin" },
    { id: "barangay-san-jose", name: "San Jose" },
    { id: "barangay-san-nicolas", name: "San Nicolas" },
    { id: "barangay-sta-cruz", name: "Sta. Cruz" },
    { id: "barangay-sta-rosa", name: "Sta. Rosa" },
    { id: "barangay-sto-tomas", name: "Sto. Tomas" },
    { id: "barangay-sumilang", name: "Sumilang" },
    { id: "barangay-ugong", name: "Ugong" },
  ],
  "District II": [
    { id: "barangay-dela-paz", name: "Dela Paz" },
    { id: "barangay-manggahan", name: "Manggahan" },
    { id: "barangay-maybunga", name: "Maybunga" },
    { id: "barangay-pinagbuhatan", name: "Pinagbuhatan" },
    { id: "barangay-rosario", name: "Rosario" },
    { id: "barangay-san-miguel", name: "San Miguel" },
    { id: "barangay-sta-lucia", name: "Sta. Lucia" },
    { id: "barangay-santolan", name: "Santolan" },
  ],
};

const pasigDistrictOptions: PasigDistrict[] = ["District I", "District II"];

/** A labeled form section with a top border divider */
const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
        {title}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
    {children}
  </div>
);

const SignUp = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [district, setDistrict] = useState<PasigDistrict | "">("");
  const [barangayId, setBarangayId] = useState("");
  const [isExistingOrganization, setIsExistingOrganization] = useState(false);
  const [organizationIdentifierNumber, setOrganizationIdentifierNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [agreedToPolicies, setAgreedToPolicies] = useState(false);
  const [inlineError, setInlineError] = useState("");

  // Track which fields have been blurred so we only show errors after interaction
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const touch = (field: string) => setTouched((prev) => new Set(prev).add(field));

  const { toast } = useToast();
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const useSupabaseAuth = Boolean(supabase);

  const passwordsMatch = password === confirmPassword;
  const isGmailEmail = /^[a-z0-9._%+-]+@gmail\.com$/i.test(email.trim());
  const normalizedContactNumber = contactNumber.trim();
  const isContactNumberValid = /^09\d{9}$/.test(normalizedContactNumber);
  const districtBarangays = district ? pasigDistrictBarangays[district] : [];
  const selectedBarangayName = districtBarangays.find((b) => b.id === barangayId)?.name ?? "N/A";
  const selectedDistrictName = district || "N/A";
  const normalizedIdentifierNumber = organizationIdentifierNumber.trim();
  const isIdentifierValid = !isExistingOrganization || normalizedIdentifierNumber.length > 0;

  const canSubmit = Boolean(
    useSupabaseAuth &&
      name.trim() &&
      email.trim() &&
      isGmailEmail &&
      isContactNumberValid &&
      district &&
      barangayId &&
      isIdentifierValid &&
      password &&
      confirmPassword &&
      passwordsMatch &&
      agreedToPolicies,
  );

  // Reset barangay when district changes
  useEffect(() => {
    if (!district) { setBarangayId(""); return; }
    const opts = pasigDistrictBarangays[district];
    if (!opts.some((b) => b.id === barangayId)) setBarangayId("");
  }, [barangayId, district]);

  // Clear identifier when existing-org is unchecked
  useEffect(() => {
    if (!isExistingOrganization) setOrganizationIdentifierNumber("");
  }, [isExistingOrganization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError("");

    if (!passwordsMatch) {
      setInlineError("Password and confirm password must match.");
      return;
    }
    if (!isGmailEmail) {
      setInlineError("Email must end with @gmail.com.");
      return;
    }
    if (!isContactNumberValid) {
      setInlineError("Contact number must be 11 digits starting with 09.");
      return;
    }
    if (isExistingOrganization && !normalizedIdentifierNumber) {
      setInlineError("Organization identifier number is required for existing organizations.");
      return;
    }

    setIsConfirmOpen(true);
  };

  const proceedCreateAccount = async () => {
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
    });
    setIsCreating(false);

    if (result.error) {
      setIsConfirmOpen(false);
      setInlineError(result.error);
      return;
    }

    setIsConfirmOpen(false);
    toast({
      title: "Account created!",
      description: result.needsEmailConfirmation
        ? "Check your email to confirm your account. The link will sign you in automatically."
        : "Your account has been created. Please sign in.",
    });
    navigate("/signin");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-180px] right-[-140px] h-[360px] w-[360px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-[-190px] left-[-150px] h-[400px] w-[400px] rounded-full bg-primary/15 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="mb-7 text-left">
          <Link to="/" className="inline-flex items-center gap-3 max-w-full">
            <BrandLogo imgClassName="h-10 w-10" showText subtitle="Youth Portal" />
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 card-shadow space-y-6">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Create organization account</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Register your youth organization to start the compliance process.
            </p>
          </div>

          {!useSupabaseAuth && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-warning">
              Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and{" "}
              <code>VITE_SUPABASE_ANON_KEY</code> in your <code>.env</code> file.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>

            {/* ── Section 1: Organization details ── */}
            <FormSection title="Organization details">
              <div className="space-y-1.5">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Kapitolyo Youth Council"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => touch("name")}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => touch("email")}
                  autoComplete="email"
                  required
                />
                {touched.has("email") && email && !isGmailEmail && (
                  <p className="text-xs text-destructive">Email must end with @gmail.com.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input
                  id="contactNumber"
                  placeholder="09XXXXXXXXX"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  onBlur={() => touch("contactNumber")}
                  inputMode="numeric"
                  maxLength={11}
                  required
                />
                {touched.has("contactNumber") && contactNumber && !isContactNumberValid && (
                  <p className="text-xs text-destructive">
                    Must be 11 digits starting with 09.
                  </p>
                )}
              </div>
            </FormSection>

            {/* ── Section 2: Location ── */}
            <FormSection title="Location">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="district">District</Label>
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
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="barangay">Barangay</Label>
                  <Select
                    value={barangayId}
                    onValueChange={(v) => { setBarangayId(v); touch("barangay"); }}
                    disabled={!district}
                  >
                    <SelectTrigger id="barangay">
                      <SelectValue placeholder={district ? "Select barangay" : "Choose district first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {districtBarangays.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormSection>

            {/* ── Section 3: Registration type ── */}
            <FormSection title="Registration type">
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
                    We already have a YORP Pasig identifier number
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Check this if your organization has registered with Pasig City LYDO before.
                  </p>
                </div>
              </div>

              {/* Smooth reveal */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isExistingOrganization ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="organizationIdentifierNumber">Organization Identifier Number</Label>
                  <Input
                    id="organizationIdentifierNumber"
                    placeholder="Enter your YORP Pasig identifier number"
                    value={organizationIdentifierNumber}
                    onChange={(e) => setOrganizationIdentifierNumber(e.target.value)}
                    onBlur={() => touch("identifier")}
                    required={isExistingOrganization}
                    tabIndex={isExistingOrganization ? 0 : -1}
                  />
                  {touched.has("identifier") && isExistingOrganization && !isIdentifierValid && (
                    <p className="text-xs text-destructive">Identifier number is required.</p>
                  )}
                </div>
              </div>
            </FormSection>

            {/* ── Section 4: Account security ── */}
            <FormSection title="Account security">
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => touch("confirmPassword")}
                    className="pr-10"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {touched.has("confirmPassword") && confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-destructive">Passwords do not match.</p>
                )}
              </div>
            </FormSection>

            {/* ── Policy agreement ── */}
            <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 p-4">
              <Checkbox
                id="policy-agreement"
                checked={agreedToPolicies}
                onCheckedChange={(checked) => setAgreedToPolicies(Boolean(checked))}
                disabled={isCreating}
                className="shrink-0 mt-[3px]"
              />
              <Label htmlFor="policy-agreement" className="text-sm font-normal leading-relaxed cursor-pointer">
                I have read and agree to the{" "}
                <Link to="/terms" className="text-primary hover:underline font-medium" target="_blank" rel="noopener">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-primary hover:underline font-medium" target="_blank" rel="noopener">
                  Privacy Policy
                </Link>
                .
              </Label>
            </div>

            {/* Submit */}
            <div className="space-y-2.5">
              <Button
                type="submit"
                className="w-full font-semibold"
                disabled={!canSubmit || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  "Create Organization Account"
                )}
              </Button>

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
            <Link to="/signin" className="font-medium text-primary hover:text-primary/80 transition-colors">
              Sign in
            </Link>
          </p>
          <p>
            <Link to="/" className="hover:text-foreground transition-colors">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Review your details</AlertDialogTitle>
            <AlertDialogDescription>
              Please confirm everything looks correct before creating your account.
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
                <span className="text-muted-foreground">District</span>
                <span className="font-medium text-foreground">{selectedDistrictName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Barangay</span>
                <span className="font-medium text-foreground">{selectedBarangayName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Existing org</span>
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
