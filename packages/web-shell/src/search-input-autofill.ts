export interface SsooUnexpectedAutofillDecision {
  expectedValue: string;
  candidateValue: string;
  nativeAutofilled: boolean;
  hasRecentTextEntryIntent: boolean;
}

export interface SsooSearchInputSignature {
  id: string;
  name: string;
  ariaLabel: string;
}

const SSOO_RESERVED_CREDENTIAL_FIELD_SIGNATURES = new Set([
  'username',
  'password',
  'current-password',
  'new-password',
  'confirm-new-password',
  'email',
  'one-time-code',
  'managed-user-login-id',
  'managed-user-new-password',
  'managed-user-email',
  'microsoft-client-secret',
]);

export function isReservedSsooCredentialFieldSignature(value: string): boolean {
  return SSOO_RESERVED_CREDENTIAL_FIELD_SIGNATURES.has(value.trim().toLowerCase());
}

export function getSsooSearchInputSignatureError({
  id,
  name,
  ariaLabel,
}: SsooSearchInputSignature): string | null {
  for (const [key, value] of Object.entries({ id, name, ariaLabel })) {
    if (value.trim().length === 0) {
      return `${key} must not be empty`;
    }
  }

  for (const [key, value] of Object.entries({ id, name })) {
    if (isReservedSsooCredentialFieldSignature(value)) {
      return `${key} collides with reserved credential signature: ${value}`;
    }
  }

  return null;
}

/**
 * Reject only a browser-confirmed autofill value that diverges from the value
 * owned by the application and was not preceded by an actual text-entry action.
 * The candidate's content is deliberately not classified: login IDs can use
 * arbitrary account names, employee numbers, dotted IDs, or email addresses.
 */
export function shouldRejectSsooUnexpectedAutofill({
  expectedValue,
  candidateValue,
  nativeAutofilled,
  hasRecentTextEntryIntent,
}: SsooUnexpectedAutofillDecision): boolean {
  return (
    candidateValue !== expectedValue
    && candidateValue.length > 0
    && nativeAutofilled
    && !hasRecentTextEntryIntent
  );
}
