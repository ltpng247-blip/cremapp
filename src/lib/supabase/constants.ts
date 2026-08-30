// Values discovered from the live NJSS/CRMS Supabase backend.

export const INSTITUTION = "National Justice Staff Services";
export const INSTITUTION_SHORT = "NJSS";

// High-value flag threshold (PNG Kina).
export const HIGH_VALUE_THRESHOLD = 50_000;

// 24h approval SLA used for "overdue" + ageing reports.
export const SLA_HOURS = 24;

// Workflow status vocabulary (the DB columns are free varchar; we standardise).
export const FF3_STATUS = {
  pending: "ENDORSED_SECTION_HEAD",
  approved: "APPROVED",
  rejected: "REJECTED",
  returned: "RETURNED",
} as const;

export const FF4_STATUS = {
  pending: "VERIFIED",
  approved: "APPROVED",
  paid: "PAID",
} as const;

// Statuses that mean "awaiting the Registrar".
export const FF3_PENDING_STATES = [FF3_STATUS.pending];
export const FF4_PENDING_STATES = [FF4_STATUS.pending];
