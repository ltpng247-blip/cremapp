import { supabase } from "./client";
import {
  HIGH_VALUE_THRESHOLD,
  FF3_PENDING_STATES,
  FF4_PENDING_STATES,
} from "./constants";
import type {
  AppNotification,
  AuditEntry,
  BudgetImpact,
  BudgetLineView,
  CommitmentImpact,
  CommitmentView,
  FF3Detail,
  FF3Summary,
  FF4Detail,
  FF4Summary,
  RegistrarSession,
} from "../types";

const num = (v: unknown) => Number((v as number) ?? 0);

/* ----------------------------------------------------------------- session */
export async function loadRegistrarSession(
  authId: string,
  email?: string | null,
): Promise<RegistrarSession> {
  let u: any = null;
  const byAuth = await supabase
    .from("users")
    .select("id,full_name,email,position,department_id")
    .eq("auth_user_id", authId)
    .limit(1);
  u = byAuth.data?.[0];
  if (!u && email) {
    const byEmail = await supabase
      .from("users")
      .select("id,full_name,email,position,department_id")
      .eq("email", email)
      .limit(1);
    u = byEmail.data?.[0];
  }

  let roles: string[] = [];
  let departmentName: string | null = null;
  if (u) {
    const rr = await supabase
      .from("user_roles")
      .select("role:roles(name)")
      .eq("user_id", u.id);
    roles = (rr.data ?? []).map((x: any) => x.role?.name).filter(Boolean);
    if (u.department_id) {
      const d = await supabase.from("departments").select("name").eq("id", u.department_id).limit(1);
      departmentName = d.data?.[0]?.name ?? null;
    }
  }
  const isRegistrar =
    roles.includes("Registrar") ||
    (u?.position ?? "").toLowerCase().includes("registrar");

  return {
    authId,
    userId: u?.id ?? null,
    name: u?.full_name ?? "Registrar",
    email: u?.email ?? email ?? "",
    position: u?.position ?? "Registrar",
    departmentId: u?.department_id ?? null,
    departmentName,
    roles,
    isRegistrar,
  };
}

/* -------------------------------------------------------------------- FF3 */
const FF3_LIST_SELECT =
  "id,ff3_number,status,urgency_level,purpose,total_estimated_amount,is_within_budget,required_by_date,submitted_date,request_date,approved_date,selected_supplier_name," +
  "department:departments(name,code),section:sections(name),officer:users!ff3_headers_requesting_officer_id_fkey(full_name)";

function mapFF3Summary(r: any): FF3Summary {
  const total = num(r.total_estimated_amount);
  return {
    id: r.id,
    ff3_number: r.ff3_number,
    status: r.status,
    urgency_level: r.urgency_level ?? "MEDIUM",
    purpose: r.purpose ?? "",
    total_estimated_amount: total,
    is_within_budget: r.is_within_budget ?? true,
    required_by_date: r.required_by_date,
    submitted_date: r.submitted_date,
    request_date: r.request_date,
    approved_date: r.approved_date,
    departmentName: r.department?.name ?? null,
    departmentCode: r.department?.code ?? null,
    sectionName: r.section?.name ?? null,
    officerName: r.officer?.full_name ?? null,
    selected_supplier_name: r.selected_supplier_name ?? null,
    highValue: total >= HIGH_VALUE_THRESHOLD,
    kind: "FF3",
  };
}

export async function fetchPendingFF3(): Promise<FF3Summary[]> {
  const { data, error } = await supabase
    .from("ff3_headers")
    .select(FF3_LIST_SELECT)
    .in("status", FF3_PENDING_STATES)
    .order("submitted_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapFF3Summary);
}

export async function fetchRecentFF3(limit = 25): Promise<FF3Summary[]> {
  const { data, error } = await supabase
    .from("ff3_headers")
    .select(FF3_LIST_SELECT)
    .in("status", ["APPROVED", "REJECTED", "RETURNED"])
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapFF3Summary);
}

export async function fetchFF3(id: string): Promise<FF3Detail | null> {
  const { data, error } = (await supabase
    .from("ff3_headers")
    .select(
      "*,department:departments(name,code),section:sections(name)," +
        "officer:users!ff3_headers_requesting_officer_id_fkey(full_name,position)," +
        "items:ff3_items(*),quotations:ff3_quotations(*),attachments:ff3_attachments(*)",
    )
    .eq("id", id)
    .maybeSingle()) as { data: any; error: any };
  if (error) throw error;
  if (!data) return null;

  const budget = await fetchBudgetImpact(
    data.expense_code_registry_id,
    num(data.total_estimated_amount),
  );

  return {
    ...mapFF3Summary(data),
    justification: data.justification ?? null,
    procurement_method: data.procurement_method ?? null,
    financial_year: data.financial_year ?? null,
    expense_code_registry_id: data.expense_code_registry_id ?? null,
    requesting_officer_id: data.requesting_officer_id ?? null,
    officerPosition: data.officer?.position ?? null,
    rejection_reason: data.rejection_reason ?? null,
    items: (data.items ?? [])
      .map((it: any) => ({
        id: it.id,
        line_number: it.line_number,
        item_description: it.item_description,
        specifications: it.specifications,
        quantity: num(it.quantity),
        unit_of_measure: it.unit_of_measure,
        estimated_unit_price: num(it.estimated_unit_price),
        total_amount: num(it.total_amount),
      }))
      .sort((a: any, b: any) => a.line_number - b.line_number),
    quotations: (data.quotations ?? [])
      .map((q: any) => ({
        id: q.id,
        supplier_name: q.supplier_name,
        quotation_number: q.quotation_number,
        quotation_date: q.quotation_date,
        quotation_amount: num(q.quotation_amount),
        is_selected: !!q.is_selected,
      }))
      .sort((a: any, b: any) => a.quotation_amount - b.quotation_amount),
    attachments: (data.attachments ?? []).map(mapAttachment),
    budget,
  };
}

/* -------------------------------------------------------------------- FF4 */
const FF4_LIST_SELECT =
  "id,ff4_number,status,payee_name,net_amount,gross_amount,payment_description,submitted_date,payment_request_date,approved_date," +
  "commitment:ff3_commitments(committed_amount,paid_amount,remaining_balance),ff3:ff3_headers(ff3_number,urgency_level)";

function mapFF4Summary(r: any): FF4Summary {
  const net = num(r.net_amount);
  const remaining = r.commitment ? num(r.commitment.remaining_balance) : Number.POSITIVE_INFINITY;
  return {
    id: r.id,
    ff4_number: r.ff4_number,
    status: r.status,
    payee_name: r.payee_name ?? "",
    net_amount: net,
    gross_amount: num(r.gross_amount),
    payment_description: r.payment_description,
    submitted_date: r.submitted_date,
    payment_request_date: r.payment_request_date,
    approved_date: r.approved_date,
    ff3_number: r.ff3?.ff3_number ?? null,
    commitmentExceeded: net > remaining,
    highValue: net >= HIGH_VALUE_THRESHOLD,
    urgency_level: r.ff3?.urgency_level ?? "MEDIUM",
    kind: "FF4",
  };
}

export async function fetchPendingFF4(): Promise<FF4Summary[]> {
  const { data, error } = await supabase
    .from("ff4_headers")
    .select(FF4_LIST_SELECT)
    .in("status", FF4_PENDING_STATES)
    .order("submitted_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapFF4Summary);
}

export async function fetchRecentFF4(limit = 25): Promise<FF4Summary[]> {
  const { data, error } = await supabase
    .from("ff4_headers")
    .select(FF4_LIST_SELECT)
    .in("status", ["APPROVED", "REJECTED", "RETURNED", "PAID"])
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapFF4Summary);
}

export async function fetchFF4(id: string): Promise<FF4Detail | null> {
  const { data, error } = (await supabase
    .from("ff4_headers")
    .select(
      "*,commitment:ff3_commitments(*),attachments:ff4_attachments(*)," +
        "ff3:ff3_headers(ff3_number,purpose,urgency_level,department:departments(name))",
    )
    .eq("id", id)
    .maybeSingle()) as { data: any; error: any };
  if (error) throw error;
  if (!data) return null;

  const net = num(data.net_amount);
  let commitment: CommitmentImpact | null = null;
  if (data.commitment) {
    const committed = num(data.commitment.committed_amount);
    const paid = num(data.commitment.paid_amount);
    const remaining = num(data.commitment.remaining_balance);
    commitment = {
      id: data.commitment.id,
      number: data.commitment.commitment_number,
      committed,
      paid,
      remaining,
      net,
      after: remaining - net,
      exceeds: net > remaining,
      status: data.commitment.status,
      percentPaid: committed > 0 ? (paid / committed) * 100 : 0,
    };
  }

  const base = mapFF4Summary({ ...data, ff3: data.ff3 });
  return {
    ...base,
    ff3_header_id: data.ff3_header_id ?? null,
    commitment_id: data.commitment_id ?? null,
    payee_type: data.payee_type ?? null,
    invoice_number: data.invoice_number ?? null,
    invoice_date: data.invoice_date ?? null,
    tax_amount: num(data.tax_amount),
    deductions: num(data.deductions),
    payment_method: data.payment_method ?? null,
    financial_year: data.financial_year ?? null,
    rejection_reason: data.rejection_reason ?? null,
    ff3_purpose: data.ff3?.purpose ?? null,
    departmentName: data.ff3?.department?.name ?? null,
    attachments: (data.attachments ?? []).map(mapAttachment),
    commitment,
  };
}

/* ----------------------------------------------------------------- budget */
export async function fetchBudgetImpact(
  expenseCodeId: string | null,
  requested: number,
): Promise<BudgetImpact | null> {
  if (!expenseCodeId) return null;
  const { data } = await supabase
    .from("v_budget_by_code")
    .select("full_expense_code,revised_budget,released_amount,committed_amount,actual_expenditure")
    .eq("expense_code_registry_id", expenseCodeId)
    .limit(1);
  const b = data?.[0];
  if (!b) {
    return {
      code: null, revised: 0, released: 0, committed: 0, actual: 0,
      available: 0, requested, after: -requested, exceeded: requested > 0,
      low: false, utilization: 0, found: false,
    };
  }
  const released = num(b.released_amount);
  const committed = num(b.committed_amount);
  const actual = num(b.actual_expenditure);
  const available = released - committed - actual;
  const after = available - requested;
  const exceeded = after < 0;
  const low = !exceeded && (available <= released * 0.15 || after <= released * 0.1);
  return {
    code: b.full_expense_code,
    revised: num(b.revised_budget),
    released, committed, actual, available, requested, after, exceeded, low,
    utilization: released > 0 ? ((committed + actual) / released) * 100 : 0,
    found: true,
  };
}

export async function fetchBudgetLines(): Promise<BudgetLineView[]> {
  const { data, error } = await supabase
    .from("v_budget_by_code")
    .select("expense_code_registry_id,full_expense_code,department_name,cost_centre_name,revised_budget,released_amount,committed_amount,actual_expenditure")
    .order("department_name", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .filter((b: any) => b.expense_code_registry_id)
    .map((b: any) => {
      const released = num(b.released_amount);
      const committed = num(b.committed_amount);
      const actual = num(b.actual_expenditure);
      return {
        expense_code_registry_id: b.expense_code_registry_id,
        full_expense_code: b.full_expense_code ?? "—",
        department_name: b.department_name ?? null,
        cost_centre_name: b.cost_centre_name ?? null,
        revised_budget: num(b.revised_budget),
        released_amount: released,
        committed_amount: committed,
        actual_expenditure: actual,
        available: released - committed - actual,
        utilization: released > 0 ? ((committed + actual) / released) * 100 : 0,
      };
    });
}

/* ------------------------------------------------------------- commitments */
export async function fetchCommitments(): Promise<CommitmentView[]> {
  const { data, error } = await supabase
    .from("ff3_commitments")
    .select("*,ff3:ff3_headers(ff3_number,purpose)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((c: any) => {
    const committed = num(c.committed_amount);
    const paid = num(c.paid_amount);
    return {
      id: c.id,
      commitment_number: c.commitment_number,
      committed_amount: committed,
      paid_amount: paid,
      remaining_balance: num(c.remaining_balance),
      status: c.status,
      ff3_number: c.ff3?.ff3_number ?? null,
      purpose: c.ff3?.purpose ?? null,
      percentPaid: committed > 0 ? (paid / committed) * 100 : 0,
    };
  });
}

/* ---------------------------------------------------------- notifications */
export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data ?? []).map((n: any) => ({
    id: n.id,
    notification_type: n.notification_type ?? "SYSTEM",
    title: n.title ?? "",
    message: n.message ?? "",
    reference_type: n.reference_type,
    reference_id: n.reference_id,
    is_read: !!n.is_read,
    priority: n.priority ?? "MEDIUM",
    created_at: n.created_at,
    read_at: n.read_at,
  }));
}

/* ----------------------------------------------------------------- audit */
export async function fetchAuditTrail(opts?: {
  entityId?: string;
  entityType?: string;
  limit?: number;
}): Promise<AuditEntry[]> {
  let q = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(opts?.limit ?? 80);
  if (opts?.entityId) q = q.eq("entity_id", opts.entityId);
  if (opts?.entityType) q = q.eq("entity_type", opts.entityType);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((a: any) => ({
    id: a.id,
    action: a.action ?? "",
    entity_type: a.entity_type,
    entity_id: a.entity_id,
    entity_reference: a.entity_reference,
    user_name: a.user_name,
    comment: a.metadata?.comments ?? a.new_values?.comments ?? null,
    created_at: a.created_at,
  }));
}

// Combined approval history for an FF3 (audit_logs + ff3_approvals comments).
export async function fetchFF3History(ff3Id: string, ff3Number: string): Promise<AuditEntry[]> {
  const [audit, approvals] = await Promise.all([
    fetchAuditTrail({ entityId: ff3Id, limit: 40 }),
    supabase.from("ff3_approvals").select("*").eq("ff3_header_id", ff3Id).order("action_date", { ascending: false }),
  ]);
  const approvalEntries: AuditEntry[] = (approvals.data ?? []).map((a: any) => ({
    id: `appr-${a.id}`,
    action: a.action_taken ?? "DECISION",
    entity_type: "FF3",
    entity_id: ff3Id,
    entity_reference: ff3Number,
    user_name: a.approval_level ?? "Approver",
    comment: a.comments ?? null,
    created_at: a.action_date,
    stage: a.approval_level,
  }));
  return [...approvalEntries, ...audit].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

function mapAttachment(a: any) {
  return {
    id: a.id,
    file_name: a.file_name,
    file_type: a.file_type,
    file_url: a.file_url,
    attachment_type: a.attachment_type,
    uploaded_at: a.uploaded_at,
    reviewed: false,
  };
}
