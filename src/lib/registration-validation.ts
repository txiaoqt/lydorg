export type RegistrationFormValues = {
  fullName: string;
  email: string;
  contactNumber: string;
  municipality: string;
  barangay: string;
};

export type RegistrationFormErrors = Partial<Record<keyof RegistrationFormValues, string>>;

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const FULL_NAME_REGEX = /^[A-Za-z][A-Za-z\s.'-]{1,119}$/;

function normalizePhoneRaw(value: string): string {
  return value.replace(/[\s()-]/g, "").trim();
}

export function normalizePhilippineMobile(value: string): string | null {
  const raw = normalizePhoneRaw(value);
  if (!raw) return null;
  if (/^09\d{9}$/.test(raw)) return `+63${raw.slice(1)}`;
  if (/^639\d{9}$/.test(raw)) return `+${raw}`;
  if (/^\+639\d{9}$/.test(raw)) return raw;
  return null;
}

export function validateRegistrationForm(input: RegistrationFormValues): {
  normalized: RegistrationFormValues;
  errors: RegistrationFormErrors;
  isValid: boolean;
} {
  const normalizedContactNumber = normalizePhilippineMobile(input.contactNumber);
  const normalized: RegistrationFormValues = {
    fullName: input.fullName.trim().replace(/\s+/g, " "),
    email: input.email.trim().toLowerCase(),
    contactNumber: normalizedContactNumber ?? input.contactNumber.trim(),
    municipality: input.municipality.trim().replace(/\s+/g, " "),
    barangay: input.barangay.trim().replace(/\s+/g, " "),
  };

  const errors: RegistrationFormErrors = {};

  if (!normalized.fullName || !FULL_NAME_REGEX.test(normalized.fullName)) {
    errors.fullName = "Enter a valid full name (letters and basic punctuation only).";
  }

  if (!normalized.email || !EMAIL_REGEX.test(normalized.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!normalizedContactNumber) {
    errors.contactNumber = "Use a valid PH mobile number (09XXXXXXXXX or +639XXXXXXXXX).";
  }

  if (!normalized.municipality || normalized.municipality.length < 2) {
    errors.municipality = "Municipality is required.";
  }

  if (!normalized.barangay || normalized.barangay.length < 2) {
    errors.barangay = "Barangay is required.";
  }

  return {
    normalized,
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}
