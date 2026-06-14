// Values discovered from the live NJSS/CRMS Supabase backend.

export const REGISTRAR_ROLE_ID = "0cff046e-1773-4a38-a4db-a523dec894f2";
export const REGISTRAR_EMAIL = "registrar@pngjudiciary.gov.pg";
export const DEMO_PASSWORD = "Registrar#2026";
export const INSTITUTION = "National Justice Staff Services";
export const INSTITUTION_SHORT = "NJSS";

// High-value flag threshold (PNG Kina).
export const HIGH_VALUE_THRESHOLD = 50_000;

// 24h approval SLA used for "overdue" + ageing reports.
export const SLA_HOURS = 24;

// Workflow status vocabulary (the DB columns are free varchar; we standardise).
export const FF3_STATUS = {
  pending: "SUBMITTED",
  approved: "APPROVED",
  rejected: "REJECTED",
  returned: "RETURNED",
  onHold: "ON_HOLD",
} as const;

export const FF4_STATUS = {
  pending: "SUBMITTED",
  approved: "APPROVED",
  rejected: "REJECTED",
  returned: "RETURNED",
  paid: "PAID",
} as const;

export const REGISTRAR_LEVEL = "REGISTRAR";

// Statuses that mean "awaiting the Registrar".
export const FF3_PENDING_STATES = ["SUBMITTED", "ENDORSED", "PENDING_APPROVAL", "PENDING", "UNDER_REVIEW"];
export const FF4_PENDING_STATES = ["SUBMITTED", "VERIFIED", "PENDING_APPROVAL", "PENDING"];

// Demo unlock PIN (after Supabase auth, a second local factor).
export const DEMO_PIN = "4071";
