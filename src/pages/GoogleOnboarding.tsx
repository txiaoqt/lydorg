import { sanitizeZipCode, validateZipCode } from "@/lib/organization-profile-domain";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLydoConnect } from "@/lib/lydo-connect-store";
import { getAllPasigBarangayOptions, getPasigDistrictForBarangay } from "@/lib/pasig-districts";
import {
  advocacyOptions,
  formatAddress,
  formatPersonName,
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
  isValidPersonNamePart,
  isValidSuffix,
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
import { normalizeUrn, validateUrn } from "@/lib/urn-registration";
import { checkSignupUrn, DUPLICATE_URN_ERROR_MESSAGE } from "@/lib/urn-validation";

import GoogleIcon from "@/components/GoogleIcon";

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
  representativeFirstName?: string;
  representativeMiddleName?: string;
  representativeLastName?: string;
  representativeSuffix?: string;
  adviserFirstName?: string;
  adviserMiddleName?: string;
  adviserLastName?: string;
  adviserSuffix?: string;
  addressUnitBuilding?: string;
  addressStreet?: string;
  addressSubdivision?: string;
  addressBarangay?: string;
  addressCity?: string;
  addressProvince?: string;
  addressZipCode?: string;
  representativeName?: string;
  adviserName?: string;
  address?: string;
  facebookPageUrl?: string;
}

export const ONBOARDING_DRAFT_KEY_PREFIX = "ytrace-google-onboarding-draft:";
export const SIGNUP_PREFILL_STORAGE_KEY = "ytrace-google-onboarding-prefill";

export interface SignupPrefillData {
  organizationName?: string;
  isExistingOrganization?: boolean;
  organizationIdentifierNumber?: string;
}

export const loadSignupPrefill = (): SignupPrefillData | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SIGNUP_PREFILL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Failed to load signup prefill from localStorage:", err);
    return null;
  }
};

export const saveSignupPrefill = (data: SignupPrefillData): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIGNUP_PREFILL_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to save signup prefill to localStorage:", err);
  }
};

export const clearSignupPrefill = (): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SIGNUP_PREFILL_STORAGE_KEY);
  } catch (err) {
    console.warn("Failed to clear signup prefill from localStorage:", err);
  }
};

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
      representativeFirstName: profile.representativeFirstName || "",
      representativeMiddleName: profile.representativeMiddleName || "",
      representativeLastName: profile.representativeLastName || "",
      representativeSuffix: profile.representativeSuffix || "",
      adviserFirstName: profile.adviserFirstName || "",
      adviserMiddleName: profile.adviserMiddleName || "",
      adviserLastName: profile.adviserLastName || "",
      adviserSuffix: profile.adviserSuffix || "",
      addressUnitBuilding: profile.addressUnitBuilding || "",
      addressStreet: profile.addressStreet || "",
      addressSubdivision: profile.addressSubdivision || "",
      addressBarangay: profile.addressBarangay || profile.barangay || "",
      addressCity: profile.addressCity || "Pasig City",
      addressProvince: profile.addressProvince || "Metro Manila",
      addressZipCode: profile.addressZipCode || "",
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
  const { upsertOrganizationProfile } = useLydoConnect();

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
          upsertOrganizationProfile(existing);
          clearGoogleOnboardingDraft(user.id);
          navigate("/dashboard", { replace: true });
          return;
        }

        const localDraft = loadGoogleOnboardingDraft(user.id);
        const prefill = loadSignupPrefill();
        const authenticatedEmail = user.email?.trim().toLowerCase() || "";

        const draft = createOrganizationProfileDraft(user.id, existing, {
          organizationEmail: authenticatedEmail,
          organizationName: localDraft?.organizationName || existing?.organizationName || prefill?.organizationName || "",
          contactNumber: localDraft?.contactNumber || existing?.contactNumber || "",
          district: localDraft?.district || existing?.district || "",
          barangay: localDraft?.barangay || existing?.barangay || "",
          isExistingOrganization: localDraft?.isExistingOrganization ?? existing?.isExistingOrganization ?? prefill?.isExistingOrganization ?? false,
          organizationIdentifierNumber: localDraft?.organizationIdentifierNumber || existing?.organizationIdentifierNumber || prefill?.organizationIdentifierNumber || "",
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
        const userGiven = user.givenName?.trim() || "";
        const userFamily = user.familyName?.trim() || "";
        if (localDraft?.representativeFirstName || localDraft?.representativeLastName) {
          draft.representativeFirstName = localDraft.representativeFirstName || "";
          draft.representativeMiddleName = localDraft.representativeMiddleName || "";
          draft.representativeLastName = localDraft.representativeLastName || "";
          draft.representativeSuffix = localDraft.representativeSuffix || "";
        } else if (existing?.representativeFirstName || existing?.representativeLastName) {
          draft.representativeFirstName = existing.representativeFirstName || "";
          draft.representativeMiddleName = existing.representativeMiddleName || "";
          draft.representativeLastName = existing.representativeLastName || "";
          draft.representativeSuffix = existing.representativeSuffix || "";
        } else if (userGiven && userFamily) {
          draft.representativeFirstName = userGiven;
          draft.representativeLastName = userFamily;
        }

        if (localDraft?.adviserFirstName || localDraft?.adviserLastName) {
          draft.adviserFirstName = localDraft.adviserFirstName || "";
          draft.adviserMiddleName = localDraft.adviserMiddleName || "";
          draft.adviserLastName = localDraft.adviserLastName || "";
          draft.adviserSuffix = localDraft.adviserSuffix || "";
        } else if (existing?.adviserFirstName || existing?.adviserLastName) {
          draft.adviserFirstName = existing.adviserFirstName || "";
          draft.adviserMiddleName = existing.adviserMiddleName || "";
          draft.adviserLastName = existing.adviserLastName || "";
          draft.adviserSuffix = existing.adviserSuffix || "";
        }

        if (localDraft?.addressStreet) {
          draft.addressUnitBuilding = localDraft.addressUnitBuilding || "";
          draft.addressStreet = localDraft.addressStreet || "";
          draft.addressSubdivision = localDraft.addressSubdivision || "";
          draft.addressBarangay = localDraft.addressBarangay || localDraft.barangay || draft.barangay;
          draft.addressCity = localDraft.addressCity || "Pasig City";
          draft.addressProvince = localDraft.addressProvince || "Metro Manila";
          draft.addressZipCode = localDraft.addressZipCode || "";
        } else if (existing?.addressStreet) {
          draft.addressUnitBuilding = existing.addressUnitBuilding || "";
          draft.addressStreet = existing.addressStreet || "";
          draft.addressSubdivision = existing.addressSubdivision || "";
          draft.addressBarangay = existing.addressBarangay || existing.barangay || draft.barangay;
          draft.addressCity = existing.addressCity || "Pasig City";
          draft.addressProvince = existing.addressProvince || "Metro Manila";
          draft.addressZipCode = existing.addressZipCode || "";
        } else {
          draft.addressBarangay = draft.barangay;
          draft.addressCity = "Pasig City";
          draft.addressProvince = "Metro Manila";
        }

        if (localDraft?.representativeName) {
          draft.representativeName = localDraft.representativeName;
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
        const prefill = loadSignupPrefill();
        const authenticatedEmail = user.email?.trim().toLowerCase() || "";
        const draft = createOrganizationProfileDraft(user.id, null, {
          organizationEmail: authenticatedEmail,
          organizationName: localDraft?.organizationName || prefill?.organizationName || "",
          contactNumber: localDraft?.contactNumber || "",
          district: localDraft?.district || "",
          barangay: localDraft?.barangay || "",
          isExistingOrganization: localDraft?.isExistingOrganization ?? prefill?.isExistingOrganization ?? false,
          organizationIdentifierNumber: localDraft?.organizationIdentifierNumber || prefill?.organizationIdentifierNumber || "",
        });
        if (localDraft?.majorClassification) draft.majorClassification = localDraft.majorClassification;
        if (localDraft?.subClassification) draft.subClassification = localDraft.subClassification;
        if (localDraft?.advocacies && localDraft.advocacies.length > 0) draft.advocacies = localDraft.advocacies;
        
        const fallbackGiven = user.givenName?.trim() || "";
        const fallbackFamily = user.familyName?.trim() || "";
        if (localDraft?.representativeFirstName || localDraft?.representativeLastName) {
          draft.representativeFirstName = localDraft.representativeFirstName || "";
          draft.representativeMiddleName = localDraft.representativeMiddleName || "";
          draft.representativeLastName = localDraft.representativeLastName || "";
          draft.representativeSuffix = localDraft.representativeSuffix || "";
        } else if (fallbackGiven && fallbackFamily) {
          draft.representativeFirstName = fallbackGiven;
          draft.representativeLastName = fallbackFamily;
        }

        if (localDraft?.adviserFirstName || localDraft?.adviserLastName) {
          draft.adviserFirstName = localDraft.adviserFirstName || "";
          draft.adviserMiddleName = localDraft.adviserMiddleName || "";
          draft.adviserLastName = localDraft.adviserLastName || "";
          draft.adviserSuffix = localDraft.adviserSuffix || "";
        }

        if (localDraft?.addressStreet) {
          draft.addressUnitBuilding = localDraft.addressUnitBuilding || "";
          draft.addressStreet = localDraft.addressStreet || "";
          draft.addressSubdivision = localDraft.addressSubdivision || "";
          draft.addressBarangay = localDraft.addressBarangay || localDraft.barangay || draft.barangay;
          draft.addressCity = localDraft.addressCity || "Pasig City";
          draft.addressProvince = localDraft.addressProvince || "Metro Manila";
          draft.addressZipCode = localDraft.addressZipCode || "";
        } else {
          draft.addressBarangay = draft.barangay;
          draft.addressCity = "Pasig City";
          draft.addressProvince = "Metro Manila";
        }

        if (localDraft?.representativeName) draft.representativeName = localDraft.representativeName;
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
  }, [isInitialized, navigate, user?.id, user?.email]);

  // Persist form draft automatically to localStorage whenever the user modifies fields
  useEffect(() => {
    if (!profileDraft || !user?.id || !isLoadedRef.current) return;
    saveGoogleOnboardingDraft(user.id, profileDraft);
  }, [profileDraft, user?.id]);

  const barangayOptions = useMemo(() => getAllPasigBarangayOptions(), []);

  const urnError = useMemo(() => {
    if (!profileDraft?.isExistingOrganization) return null;
    return validateUrn(profileDraft.organizationIdentifierNumber || "");
  }, [profileDraft?.isExistingOrganization, profileDraft?.organizationIdentifierNumber]);

  // Debounced URN check when existing organization is selected
  useEffect(() => {
    if (!profileDraft?.isExistingOrganization || urnError) {
      setUrnAvailability("idle");
      return;
    }

    let active = true;
    setUrnAvailability("checking");
    const timer = window.setTimeout(async () => {
      const status = await checkSignupUrn(profileDraft.organizationIdentifierNumber || "");
      if (active) setUrnAvailability(status);
    }, 500);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [profileDraft?.isExistingOrganization, profileDraft?.organizationIdentifierNumber, urnError]);

  const handleFieldChange = <K extends keyof OrganizationProfile>(field: K, value: OrganizationProfile[K]) => {
    if (field === "organizationEmail") return; // Immutable Google account email
    setProfileDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
    setFormError(null);

  };

  const handleBarangayChange = (barangay: string) => {
    const district = getPasigDistrictForBarangay(barangay);
    setProfileDraft((prev) => prev ? ({ ...prev, barangay, district, addressBarangay: barangay }) : prev);
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

    if (!user?.email || !user.email.trim()) {
      setFormError("Authenticated Google email is missing. Please sign in again.");
      return;
    }

    setFormError(null);

    const zipError = validateZipCode(profileDraft.addressZipCode);
    if (zipError) {
      setFormError(zipError);
      return;
    }

    // 1. Validate Organization Name
    const nameErr = validateOrganizationName(profileDraft.organizationName);
    if (nameErr) {
      setFormError(nameErr);
      return;
    }

    // 2. Validate Email (Authoritative from authenticated Google user)
    const authenticatedEmail = user.email.trim().toLowerCase();
    if (!organizationEmailPattern.test(authenticatedEmail)) {
      setFormError("The authenticated Google email address is invalid.");
      return;
    }

    // 3. Validate Contact Number
    const sanitizedContact = sanitizeContactNumber(profileDraft.contactNumber);
    if (!philippineContactNumberPattern.test(sanitizedContact)) {
      setFormError("Please enter an 11-digit Philippine mobile number starting with 09.");
      return;
    }

    // 4. Validate the authoritative Section 5 headquarters Barangay.
    const headquartersBarangay = profileDraft.addressBarangay?.trim() || profileDraft.barangay?.trim() || "";
    if (!headquartersBarangay || !getPasigDistrictForBarangay(headquartersBarangay)) {
      setFormError("Please select your barangay.");
      return;
    }

    // 5. Validate Existing Organization URN
    if (profileDraft.isExistingOrganization) {
      if (urnError) {
        setFormError(urnError);
        return;
      }
      const urnStatus = await checkSignupUrn(profileDraft.organizationIdentifierNumber || "");
      if (urnStatus === "registered") {
        setUrnAvailability("registered");
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
      setFormError("Please select at least one Center of Youth Participation.");
      return;
    }

    // 8. Validate Leadership (Structured Head of Organization)
    if (!profileDraft.representativeFirstName?.trim()) {
      setFormError("Head of Organization First Name is required.");
      return;
    }
    if (!isValidPersonNamePart(profileDraft.representativeFirstName, true)) {
      setFormError("Head of Organization First Name contains invalid characters. Numbers and symbols are not allowed.");
      return;
    }
    if (profileDraft.representativeMiddleName?.trim() && !isValidPersonNamePart(profileDraft.representativeMiddleName, false)) {
      setFormError("Head of Organization Middle Name contains invalid characters.");
      return;
    }
    if (!profileDraft.representativeLastName?.trim()) {
      setFormError("Head of Organization Last Name is required.");
      return;
    }
    if (!isValidPersonNamePart(profileDraft.representativeLastName, true)) {
      setFormError("Head of Organization Last Name contains invalid characters. Numbers and symbols are not allowed.");
      return;
    }
    if (profileDraft.representativeSuffix?.trim() && !isValidSuffix(profileDraft.representativeSuffix)) {
      setFormError("Head of Organization Suffix contains invalid characters.");
      return;
    }

    // Validate Leadership (Structured Adviser)
    if (!profileDraft.adviserFirstName?.trim()) {
      setFormError("Official Adviser First Name is required.");
      return;
    }
    if (!isValidPersonNamePart(profileDraft.adviserFirstName, true)) {
      setFormError("Official Adviser First Name contains invalid characters. Numbers and symbols are not allowed.");
      return;
    }
    if (profileDraft.adviserMiddleName?.trim() && !isValidPersonNamePart(profileDraft.adviserMiddleName, false)) {
      setFormError("Official Adviser Middle Name contains invalid characters.");
      return;
    }
    if (!profileDraft.adviserLastName?.trim()) {
      setFormError("Official Adviser Last Name is required.");
      return;
    }
    if (!isValidPersonNamePart(profileDraft.adviserLastName, true)) {
      setFormError("Official Adviser Last Name contains invalid characters. Numbers and symbols are not allowed.");
      return;
    }
    if (profileDraft.adviserSuffix?.trim() && !isValidSuffix(profileDraft.adviserSuffix)) {
      setFormError("Official Adviser Suffix contains invalid characters.");
      return;
    }

    // 9. Validate Structured Address
    if (!profileDraft.addressStreet?.trim()) {
      setFormError("Street Address is required for complete office or community address.");
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
      ? normalizeUrn(profileDraft.organizationIdentifierNumber || "")
      : "";

    const repFirstName = profileDraft.representativeFirstName?.trim() || "";
    const repMiddleName = profileDraft.representativeMiddleName?.trim() || "";
    const repLastName = profileDraft.representativeLastName?.trim() || "";
    const repSuffix = profileDraft.representativeSuffix?.trim() || "";
    const computedRepName = formatPersonName({
      firstName: repFirstName,
      middleName: repMiddleName,
      lastName: repLastName,
      suffix: repSuffix,
    });

    const advFirstName = profileDraft.adviserFirstName?.trim() || "";
    const advMiddleName = profileDraft.adviserMiddleName?.trim() || "";
    const advLastName = profileDraft.adviserLastName?.trim() || "";
    const advSuffix = profileDraft.adviserSuffix?.trim() || "";
    const computedAdviserName = formatPersonName({
      firstName: advFirstName,
      middleName: advMiddleName,
      lastName: advLastName,
      suffix: advSuffix,
    });

    const addrUnit = profileDraft.addressUnitBuilding?.trim() || "";
    const addrStreet = profileDraft.addressStreet?.trim() || "";
    const addrSubdivision = profileDraft.addressSubdivision?.trim() || "";
    const addrBarangay = profileDraft.addressBarangay?.trim() || profileDraft.barangay?.trim() || "";
    const derivedDistrict = getPasigDistrictForBarangay(addrBarangay);
    const addrCity = profileDraft.addressCity?.trim() || "Pasig City";
    const addrProvince = profileDraft.addressProvince?.trim() || "Metro Manila";
    const addrZip = profileDraft.addressZipCode?.trim() || "";
    const computedAddress = formatAddress({
      unitBuilding: addrUnit,
      street: addrStreet,
      subdivision: addrSubdivision,
      barangay: addrBarangay,
      city: addrCity,
      province: addrProvince,
      zipCode: addrZip,
    });

    const payloadToSave: OrganizationProfile = {
      ...profileDraft,
      userId: user.id,
      organizationName: profileDraft.organizationName.trim(),
      organizationEmail: authenticatedEmail,
      contactNumber: sanitizedContact,
      district: derivedDistrict,
      barangay: addrBarangay,
      isExistingOrganization: isExisting,
      organizationIdentifierNumber: finalIdentifier,
      registrationType: isExisting ? "existing_urn" : "new_organization",
      urn: isExisting ? finalIdentifier : "",
      urnNormalized: isExisting && finalIdentifier ? finalIdentifier.toUpperCase() : "",
      urnReviewStatus: isExisting ? "pending" : "not_applicable",
      majorClassification: profileDraft.majorClassification,
      subClassification: profileDraft.subClassification,
      advocacies: [...profileDraft.advocacies],
      representativeFirstName: repFirstName,
      representativeMiddleName: repMiddleName,
      representativeLastName: repLastName,
      representativeSuffix: repSuffix,
      representativeName: computedRepName,
      adviserFirstName: advFirstName,
      adviserMiddleName: advMiddleName,
      adviserLastName: advLastName,
      adviserSuffix: advSuffix,
      adviserName: computedAdviserName,
      addressUnitBuilding: addrUnit,
      addressStreet: addrStreet,
      addressSubdivision: addrSubdivision,
      addressBarangay: addrBarangay,
      addressCity: addrCity,
      addressProvince: addrProvince,
      addressZipCode: addrZip,
      address: computedAddress,
      facebookPageUrl: profileDraft.facebookPageUrl?.trim() || "",
      profileStatus: "pending_review",
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    try {
      const saved = await upsertOrganizationProfileInSupabase(payloadToSave);
      const isComplete = isOrganizationProfileComplete(saved);

      upsertOrganizationProfile(saved);

      if (isComplete) {
        clearGoogleOnboardingDraft(user.id);
        clearSignupPrefill();
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

  if (!profileDraft || !user?.email) {
    return (
      <div className="min-h-screen bg-background grid place-items-center px-4 text-center">
        <Card className="max-w-md w-full p-6 text-center space-y-4 rounded-2xl border border-border/80 shadow-sm">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <h2 className="text-lg font-heading font-semibold">Unable to load profile session</h2>
          <p className="text-sm text-muted-foreground">
            {!user?.email
              ? "Your authenticated Google account does not provide an email address. Please sign in again with a valid Google account."
              : "We could not establish your registration session. Please sign in again."}
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
                {/* Organization Email — Immutable from Google Account */}
                <div className="space-y-1.5">
                  <Label htmlFor="org-email" className="text-xs font-semibold flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Official Email Address</span>
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="org-email"
                    type="email"
                    value={user?.email || profileDraft.organizationEmail || ""}
                    readOnly
                    tabIndex={-1}
                    aria-readonly="true"
                    autoComplete="off"
                    className="h-10 text-sm bg-muted/50 border-input text-foreground font-medium cursor-not-allowed select-none opacity-90"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Email is linked to your Google account and cannot be changed during onboarding.
                  </p>
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
                    Select this option if your organization was previously registered with the Pasig City Youth
                    Development Office (PCYDO) and already holds an assigned URN.
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
                    placeholder="17-26-010"
                    value={profileDraft.organizationIdentifierNumber || ""}
                    onChange={(e) => handleFieldChange("organizationIdentifierNumber", e.target.value.toUpperCase())}
                    onInput={(e) => { e.currentTarget.value = e.currentTarget.value.toUpperCase(); }}
                    autoComplete="off"
                    className="font-mono text-sm tracking-wide uppercase h-10"
                    required
                  />
                  {profileDraft.organizationIdentifierNumber?.trim() && urnError ? (
                    <p id="urn-error" className="text-xs text-destructive flex items-center gap-1.5 font-medium">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {urnError}
                    </p>
                  ) : urnAvailability === "checking" ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                      <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" /> Verifying URN availability…
                    </p>
                  ) : urnAvailability === "registered" ? (
                    <p id="urn-error" className="text-xs text-destructive flex items-center gap-1.5 font-medium">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {DUPLICATE_URN_ERROR_MESSAGE}
                    </p>
                  ) : !urnError && profileDraft.organizationIdentifierNumber?.trim() && urnAvailability === "available" ? (
                    <p id="urn-success" className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1.5 font-medium">
                      <Check className="h-3.5 w-3.5 shrink-0" /> URN is available for verification.
                    </p>
                  ) : null}
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

          {/* Section 4: Centers of Youth Participation */}
          <Card className="rounded-2xl border border-border/80 bg-card shadow-xs">
            <CardHeader className="p-5 sm:p-6 pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <Award className="h-4 w-4 text-primary" />
                <span>4. Centers of Youth Participation</span>
                <span className="text-destructive">*</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Select at least one center of youth participation championed by your organization.
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

          {/* Section 5: Leadership & Headquarters */}
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
            <CardContent className="p-5 sm:p-6 pt-0 space-y-6">
              {/* Head of Organization */}
              <div className="space-y-3">
                <div className="border-b border-border/60 pb-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Head of Organization</h4>
                  <p className="text-[11px] text-muted-foreground">Authorized youth leader heading the organization.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="rep-first-name" className="text-xs font-semibold">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="rep-first-name"
                      placeholder="e.g. Juan"
                      value={profileDraft.representativeFirstName || ""}
                      onChange={(e) => handleFieldChange("representativeFirstName", e.target.value)}
                      autoComplete="given-name"
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rep-middle-name" className="text-xs font-semibold text-muted-foreground">
                      Middle Name
                    </Label>
                    <Input
                      id="rep-middle-name"
                      placeholder="e.g. Crisostomo"
                      value={profileDraft.representativeMiddleName || ""}
                      onChange={(e) => handleFieldChange("representativeMiddleName", e.target.value)}
                      autoComplete="additional-name"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rep-last-name" className="text-xs font-semibold">
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="rep-last-name"
                      placeholder="e.g. Ibarra"
                      value={profileDraft.representativeLastName || ""}
                      onChange={(e) => handleFieldChange("representativeLastName", e.target.value)}
                      autoComplete="family-name"
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rep-suffix" className="text-xs font-semibold text-muted-foreground">
                      Suffix
                    </Label>
                    <Input
                      id="rep-suffix"
                      placeholder="e.g. Jr., III"
                      value={profileDraft.representativeSuffix || ""}
                      onChange={(e) => handleFieldChange("representativeSuffix", e.target.value)}
                      autoComplete="honorific-suffix"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Official Adviser */}
              <div className="space-y-3">
                <div className="border-b border-border/60 pb-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Official Adviser</h4>
                  <p className="text-[11px] text-muted-foreground">Faculty, community leader, or designated adult adviser.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="adviser-first-name" className="text-xs font-semibold">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="adviser-first-name"
                      placeholder="e.g. Maria"
                      value={profileDraft.adviserFirstName || ""}
                      onChange={(e) => handleFieldChange("adviserFirstName", e.target.value)}
                      autoComplete="given-name"
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="adviser-middle-name" className="text-xs font-semibold text-muted-foreground">
                      Middle Name
                    </Label>
                    <Input
                      id="adviser-middle-name"
                      placeholder="e.g. Clara"
                      value={profileDraft.adviserMiddleName || ""}
                      onChange={(e) => handleFieldChange("adviserMiddleName", e.target.value)}
                      autoComplete="additional-name"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="adviser-last-name" className="text-xs font-semibold">
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="adviser-last-name"
                      placeholder="e.g. delos Santos"
                      value={profileDraft.adviserLastName || ""}
                      onChange={(e) => handleFieldChange("adviserLastName", e.target.value)}
                      autoComplete="family-name"
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="adviser-suffix" className="text-xs font-semibold text-muted-foreground">
                      Suffix
                    </Label>
                    <Input
                      id="adviser-suffix"
                      placeholder="e.g. Jr., III"
                      value={profileDraft.adviserSuffix || ""}
                      onChange={(e) => handleFieldChange("adviserSuffix", e.target.value)}
                      autoComplete="honorific-suffix"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Office / Community Address */}
              <div className="space-y-3">
                <div className="border-b border-border/60 pb-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Office / Community Address</h4>
                  <p className="text-[11px] text-muted-foreground">Physical office, headquarters, or community base in Pasig City.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-1 md:col-span-3">
                    <Label htmlFor="address-unit" className="text-xs font-semibold text-muted-foreground">
                      Unit / Room / Building / House / Block / Lot
                    </Label>
                    <Input
                      id="address-unit"
                      placeholder="e.g. Room 201, ABC Building / Block 5 Lot 2"
                      value={profileDraft.addressUnitBuilding || ""}
                      onChange={(e) => handleFieldChange("addressUnitBuilding", e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2 md:col-span-2">
                    <Label htmlFor="address-street" className="text-xs font-semibold">
                      Street Address <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="address-street"
                      placeholder="e.g. 101 Test Center Way"
                      value={profileDraft.addressStreet || ""}
                      onChange={(e) => handleFieldChange("addressStreet", e.target.value)}
                      className="h-9 text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="address-subdivision" className="text-xs font-semibold text-muted-foreground">
                      Subdivision / Village
                    </Label>
                    <Input
                      id="address-subdivision"
                      placeholder="e.g. Kapitolyo Village"
                      value={profileDraft.addressSubdivision || ""}
                      onChange={(e) => handleFieldChange("addressSubdivision", e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="address-barangay" className="text-xs font-semibold">
                      Barangay <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={profileDraft.addressBarangay || profileDraft.barangay || ""}
                      onValueChange={handleBarangayChange}
                    >
                      <SelectTrigger id="address-barangay" className="h-9 text-xs">
                        <SelectValue placeholder="Select headquarters Barangay" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[280px]">
                        {barangayOptions.map((barangay) => (
                          <SelectItem key={barangay.id} value={barangay.name}>{barangay.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="address-district" className="text-xs font-semibold text-muted-foreground">District</Label>
                    <Input
                      id="address-district"
                      value={getPasigDistrictForBarangay(profileDraft.addressBarangay || profileDraft.barangay) || ""}
                      readOnly
                      aria-readonly="true"
                      className="h-9 text-xs bg-muted/30 text-muted-foreground"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="address-city" className="text-xs font-semibold text-muted-foreground">
                      City / Municipality
                    </Label>
                    <Input
                      id="address-city"
                      value={profileDraft.addressCity || "Pasig City"}
                      readOnly
                      className="h-9 text-xs bg-muted/30"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="address-province" className="text-xs font-semibold text-muted-foreground">
                      Province
                    </Label>
                    <Input
                      id="address-province"
                      value={profileDraft.addressProvince || "Metro Manila"}
                      readOnly
                      className="h-9 text-xs bg-muted/30"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <Label htmlFor="address-zip" className="text-xs font-semibold text-muted-foreground">
                      ZIP Code <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="address-zip"
                      placeholder="e.g. 1603"
                      value={profileDraft.addressZipCode || ""}
                      onChange={(e) => handleFieldChange("addressZipCode", sanitizeZipCode(e.target.value))}
                      className="h-9 text-xs"
                      maxLength={4}
                      inputMode="numeric"
                      pattern="[0-9]{4}"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Facebook Page (Optional) */}
              <div className="space-y-1.5 pt-2 border-t border-border/40">
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
                  className="h-9 text-xs"
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
              disabled={
                isSaving ||
                (Boolean(profileDraft?.isExistingOrganization) && Boolean(urnError)) ||
                urnAvailability === "checking" ||
                urnAvailability === "registered"
              }
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
