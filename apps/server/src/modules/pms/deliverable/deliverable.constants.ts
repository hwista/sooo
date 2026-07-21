export const DELIVERABLE_SUBMISSION_STATUS_CODES = [
  'not_submitted',
  'submitted',
  'confirmed',
  'approved',
  'not_required',
  'rejected',
] as const;

export type DeliverableSubmissionStatusCode =
  typeof DELIVERABLE_SUBMISSION_STATUS_CODES[number];

export const COMPLETED_DELIVERABLE_SUBMISSION_STATUSES: readonly string[] = [
  'confirmed',
  'approved',
  'not_required',
  'final',
];

export const LEGACY_DELIVERABLE_SUBMISSION_STATUS_ALIASES: Readonly<Record<string, DeliverableSubmissionStatusCode>> = {
  before_submit: 'not_submitted',
  final: 'confirmed',
};

export const DELIVERABLE_SUBMISSION_STATUS_INPUT_CODES = [
  ...DELIVERABLE_SUBMISSION_STATUS_CODES,
  'before_submit',
  'final',
] as const;

const DELIVERABLE_SUBMISSION_STATUS_SET = new Set<string>(DELIVERABLE_SUBMISSION_STATUS_CODES);

export function isDeliverableSubmissionCompleted(
  submissionStatusCode: string,
): boolean {
  let normalized: DeliverableSubmissionStatusCode;
  try {
    normalized = normalizeDeliverableSubmissionStatusCode(submissionStatusCode);
  } catch {
    return false;
  }
  return COMPLETED_DELIVERABLE_SUBMISSION_STATUSES.includes(normalized);
}

export function normalizeDeliverableSubmissionStatusCode(
  submissionStatusCode: string,
): DeliverableSubmissionStatusCode {
  const normalized = submissionStatusCode.trim();
  const alias = LEGACY_DELIVERABLE_SUBMISSION_STATUS_ALIASES[normalized];
  if (alias) {
    return alias;
  }
  if (DELIVERABLE_SUBMISSION_STATUS_SET.has(normalized)) {
    return normalized as DeliverableSubmissionStatusCode;
  }
  throw new Error(`Unsupported deliverable submission status: ${submissionStatusCode}`);
}

export function countCompletedDeliverables<T extends { submissionStatusCode: string }>(
  deliverables: readonly T[],
): number {
  return deliverables.filter((deliverable) =>
    isDeliverableSubmissionCompleted(deliverable.submissionStatusCode),
  ).length;
}
