// View-model types consumed by the UI. They mirror the real NJSS Supabase
// tables (ff3_headers, ff4_headers, ...) plus computed budget/commitment impact.

export type ApprovalStatus = string; // SUBMITTED | APPROVED | REJECTED | RETURNED | PAID | DRAFT
export type Urgency = string; // CRITICAL | HIGH | MEDIUM | LOW
export type Decision = "APPROVED" | "REJECTED" | "RETURNED" | "ON_HOLD";

export interface RegistrarSession {
  authId: string;
  userId: string | null;
  name: string;
  email: string;
  position: string | null;
  departmentId: string | null;
  departmentName?: string | null;
  roles: string[];
  isRegistrar: boolean;
}

export interface FF3Item {
  id: string;
  line_number: number;
  item_description: string;
  specifications?: string | null;
  quantity: number;
  unit_of_measure: string | null;
  estimated_unit_price: number;
  total_amount: number;
}

export interface Quotation {
  id: string;
  supplier_name: string;
  quotation_number: string | null;
  quotation_date: string | null;
  quotation_amount: number;
  is_selected: boolean;
}

export interface Attachment {
  id: string;
  file_name: string;
  file_type: string | null;
  file_url: string | null;
  attachment_type: string | null;
  uploaded_at?: string | null;
  reviewed?: boolean; // local-only review flag
}

export interface BudgetImpact {
  code: string | null;
  revised: number;
  released: number;
  committed: number;
  actual: number;
  available: number;
  requested: number;
  after: number;
  exceeded: boolean;
  low: boolean;
  utilization: number;
  found: boolean;
}

export interface CommitmentImpact {
  id: string;
  number: string;
  committed: number;
  paid: number;
  remaining: number;
  net: number;
  after: number;
  exceeds: boolean;
  status: string;
  percentPaid: number;
}

export interface FF3Summary {
  id: string;
  ff3_number: string;
  status: ApprovalStatus;
  urgency_level: Urgency;
  purpose: string;
  total_estimated_amount: number;
  is_within_budget: boolean;
  required_by_date: string | null;
  submitted_date: string | null;
  request_date: string | null;
  approved_date: string | null;
  departmentName: string | null;
  departmentCode: string | null;
  sectionName: string | null;
  officerName: string | null;
  selected_supplier_name: string | null;
  highValue: boolean;
  kind: "FF3";
}

export interface FF3Detail extends FF3Summary {
  justification: string | null;
  procurement_method: string | null;
  financial_year: number | null;
  expense_code_registry_id: string | null;
  requesting_officer_id: string | null;
  officerPosition: string | null;
  rejection_reason: string | null;
  items: FF3Item[];
  quotations: Quotation[];
  attachments: Attachment[];
  budget: BudgetImpact | null;
}

export interface FF4Summary {
  id: string;
  ff4_number: string;
  status: ApprovalStatus;
  payee_name: string;
  net_amount: number;
  gross_amount: number;
  payment_description: string | null;
  submitted_date: string | null;
  payment_request_date: string | null;
  approved_date: string | null;
  ff3_number: string | null;
  commitmentExceeded: boolean;
  highValue: boolean;
  urgency_level: Urgency;
  kind: "FF4";
}

export interface FF4Detail extends FF4Summary {
  ff3_header_id: string | null;
  commitment_id: string | null;
  payee_type: string | null;
  payee_bank?: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  tax_amount: number;
  deductions: number;
  payment_method: string | null;
  financial_year: number | null;
  rejection_reason: string | null;
  ff3_purpose: string | null;
  departmentName: string | null;
  attachments: Attachment[];
  commitment: CommitmentImpact | null;
}

export interface AppNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  priority: string;
  created_at: string;
  read_at: string | null;
}

export interface AuditEntry {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_reference: string | null;
  user_name: string | null;
  comment?: string | null;
  created_at: string;
  stage?: string | null;
}

export interface BudgetLineView {
  expense_code_registry_id: string;
  full_expense_code: string;
  department_name: string | null;
  cost_centre_name: string | null;
  revised_budget: number;
  released_amount: number;
  committed_amount: number;
  actual_expenditure: number;
  available: number;
  utilization: number;
}

export interface CommitmentView {
  id: string;
  commitment_number: string;
  committed_amount: number;
  paid_amount: number;
  remaining_balance: number;
  status: string;
  ff3_number: string | null;
  purpose: string | null;
  percentPaid: number;
}

export type PendingItem = FF3Summary | FF4Summary;
