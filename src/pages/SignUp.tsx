import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

type BarangayOption = {
  id: string;
  name: string;
};

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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [agreedToPolicies, setAgreedToPolicies] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const useSupabaseAuth = Boolean(supabase);
  const passwordsMatch = password === confirmPassword;
  const isGmailEmail = /^[a-z0-9._%+-]+@gmail\.com$/i.test(email.trim());
  const normalizedContactNumber = contactNumber.trim();
  const isContactNumberValid = /^09\d{9}$/.test(normalizedContactNumber);
  const districtBarangays = district ? pasigDistrictBarangays[district] : [];
  const selectedBarangayName = districtBarangays.find((item) => item.id === barangayId)?.name ?? "N/A";
  const selectedDistrictName = district || "N/A";
  const normalizedIdentifierNumber = organizationIdentifierNumber.trim();
  const isIdentifierRequired = isExistingOrganization;
  const isIdentifierValid = !isIdentifierRequired || normalizedIdentifierNumber.length > 0;
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
      passwordsMatch,
  );

  useEffect(() => {
    if (!district) {
      setBarangayId("");
      return;
    }

    const nextOptions = pasigDistrictBarangays[district];
    if (!nextOptions.some((item) => item.id === barangayId)) {
      setBarangayId(nextOptions[0]?.id ?? "");
    }
  }, [barangayId, district]);

  useEffect(() => {
    if (!isExistingOrganization) {
      setOrganizationIdentifierNumber("");
    }
  }, [isExistingOrganization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordsMatch) {
      toast({
        title: "Password Mismatch",
        description: "Password and confirm password must match.",
      });
      return;
    }

    if (!isGmailEmail) {
      toast({
        title: "Invalid Email",
        description: "Use a valid Gmail address ending with @gmail.com.",
      });
      return;
    }

    if (!isContactNumberValid) {
      toast({
        title: "Invalid Contact Number",
        description: "Contact number must be 11 digits and start with 09.",
      });
      return;
    }

    if (isExistingOrganization && !normalizedIdentifierNumber) {
      toast({
        title: "Identifier Required",
        description: "Please enter the organization identifier number for existing organizations.",
      });
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
      toast({ title: "Sign Up Failed", description: result.error });
      return;
    }

    setIsConfirmOpen(false);
    toast({
      title: "Account Created",
      description: result.needsEmailConfirmation
        ? "Check your email to confirm your account. The confirmation link will sign you in automatically."
        : "Your account has been created. Please sign in using your credentials.",
    });

    setName("");
    setEmail("");
    setContactNumber("");
    setDistrict("");
    setBarangayId("");
    setPassword("");
    setConfirmPassword("");
    navigate("/signin");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-180px] right-[-140px] h-[360px] w-[360px] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-[-190px] left-[-150px] h-[400px] w-[400px] rounded-full bg-primary/20 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="mb-6 text-left">
          <Link to="/" className="inline-flex items-center gap-3 max-w-full">
            <BrandLogo imgClassName="h-10 w-10" showText subtitle="Youth Portal" />
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-card p-6 sm:p-7 space-y-5 card-shadow"
        >
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Create organization account</h1>
            <p className="text-sm text-muted-foreground mt-1">Only organization accounts can be created here.</p>
          </div>

          {!useSupabaseAuth && (
            <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
              Supabase is not configured. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your `.env` file.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">Organization Name</Label>
            <Input
              id="name"
              placeholder="TADZ Organization"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
              required
            />
            {email && !isGmailEmail && <p className="text-xs text-destructive">Email must end with @gmail.com.</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactNumber" className="text-foreground">Contact Number</Label>
            <Input
              id="contactNumber"
              placeholder="09XXXXXXXXX"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              className="bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
              inputMode="numeric"
              maxLength={11}
              required
            />
            {!isContactNumberValid && (
              <p className="text-xs text-destructive">Contact number must be 11 digits and start with 09.</p>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="district" className="text-foreground">District</Label>
              <select
                id="district"
                value={district}
                onChange={(e) => setDistrict(e.target.value as PasigDistrict | "")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                <option value="">Select district</option>
                {pasigDistrictOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="barangayId" className="text-foreground">Barangay</Label>
              <select
                id="barangayId"
                value={barangayId}
                onChange={(e) => setBarangayId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={!district || districtBarangays.length === 0}
                required
              >
                <option value="">{district ? "Select barangay" : "Choose a district first"}</option>
                {districtBarangays.map((barangay) => (
                  <option key={barangay.id} value={barangay.id}>
                    {barangay.name}
                  </option>
                ))}
              </select>
              {!district && <p className="text-xs text-muted-foreground">Choose a district to see its barangays.</p>}
              {district && districtBarangays.length === 0 && (
                <p className="text-xs text-warning">No barangays available for this district.</p>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="existing-organization"
                checked={isExistingOrganization}
                onCheckedChange={(checked) => setIsExistingOrganization(Boolean(checked))}
                disabled={isCreating}
              />
              <div className="space-y-1">
                <Label htmlFor="existing-organization" className="text-sm font-medium text-foreground">
                  Existing organization
                </Label>
                <p className="text-xs text-muted-foreground">
                  Check this if your organization already has a YORP Pasig identifier number.
                </p>
              </div>
            </div>
            {isExistingOrganization && (
              <div className="space-y-2">
                <Label htmlFor="organizationIdentifierNumber" className="text-foreground">
                  Organization Identifier Number
                </Label>
                <Input
                  id="organizationIdentifierNumber"
                  placeholder="Enter the YORP Pasig identifier number"
                  value={organizationIdentifierNumber}
                  onChange={(e) => setOrganizationIdentifierNumber(e.target.value)}
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                  required
                />
                {!isIdentifierValid && (
                  <p className="text-xs text-destructive">Identifier number is required for existing organizations.</p>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
              required
            />
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-destructive">Passwords do not match.</p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            disabled={!canSubmit}
          >
            Create Organization Account
          </Button>
        </form>

        <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are all organization details correct?</AlertDialogTitle>
            <AlertDialogDescription>
              Please review before creating your organization account.
              <span className="block mt-2 text-foreground">Organization Name: {name.trim() || "N/A"}</span>
              <span className="block text-foreground">Email: {email.trim() || "N/A"}</span>
              <span className="block text-foreground">District: {selectedDistrictName}</span>
              <span className="block text-foreground">Barangay: {selectedBarangayName}</span>
              <span className="block text-foreground">
                Existing Organization: {isExistingOrganization ? "Yes" : "No"}
              </span>
              {isExistingOrganization && (
                <span className="block text-foreground">
                  Identifier Number: {normalizedIdentifierNumber || "N/A"}
                </span>
              )}
              <span className="mt-3 flex items-start gap-2">
                <Checkbox
                  id="signup-policy-agreement"
                  checked={agreedToPolicies}
                  onCheckedChange={(checked) => setAgreedToPolicies(Boolean(checked))}
                  disabled={isCreating}
                />
                <Label htmlFor="signup-policy-agreement" className="text-sm font-normal leading-5 text-left text-foreground">
                  I have read and agree to the{" "}
                  <Link to="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </Label>
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCreating}>See Form Again</AlertDialogCancel>
            <AlertDialogAction onClick={proceedCreateAccount} disabled={isCreating || !agreedToPolicies}>
              {isCreating ? "Creating..." : "Proceed"}
            </AlertDialogAction>
          </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link to="/signin" className="text-primary font-medium hover:text-primary/90">Sign in</Link>
        </p>
        <p className="text-center mt-3">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">&lt;- Back to home</Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
