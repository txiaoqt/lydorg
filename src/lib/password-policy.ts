export type PasswordValidationCriteria = {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
};

export const validatePasswordCriteria = (value: string): PasswordValidationCriteria => ({
  length: value.length >= 8 && value.length <= 16,
  uppercase: /[A-Z]/.test(value),
  lowercase: /[a-z]/.test(value),
  number: /[0-9]/.test(value),
  special: /[!@#$%^&*()\-_+=[\]{}|;:'",.<>?/\\~]/.test(value),
});

export const isPasswordValid = (value: string): boolean => {
  const criteria = validatePasswordCriteria(value);
  return Object.values(criteria).every(Boolean);
};
