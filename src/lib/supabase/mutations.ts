import { supabase } from "./client";
import { FF3_STATUS, FF4_STATUS, REGISTRAR_LEVEL } from "./constants";
import type { Decision, FF3Detail, FF4Detail } from "../types";

const nowIso = () => new Date().toISOString();
const today = () => nowIso().slice(0, 10);

function ff3StatusFor(d: Decision): string {
  if (d === "APPROVED") return FF3_STATUS.approved;
  if (d === "REJECTED") return FF3_STATUS.rejected;
  if (d === "RETURNED") return FF3_STATUS.returned;
  return FF3_STATUS.onHold;
}
function ff4StatusFor(d: Decision): string {
  if (d === "APPROVED") return FF4_STATUS.approved;
  if (d === "REJECTED") return FF4_STATUS.rejected;
  if (d === "RETURNED") return FF4_STATUS.returned;
  return "ON_HOLD";
}

const decisionVerb: Record<Decision, string> = {
  APPROVED: "approved",
  REJECTED: "rejected",
  RETURNED: "returned for correction",
  ON_HOLD: "placed on hold",
};

// Best-effort: never let a non-critical write block the main decision.
async function safe<T>(p: PromiseLike<T>, label: string): Promise<void> {
  try {
    const r: any = await p;
    if (r?.error) console.warn(`[NJSS] ${label}:`, r.error.message);
  } catch (e: any) {
    console.warn(`[NJSS] ${label}:`, e?.message ?? e);
  }
}

async function markRefRead(userId: string | null, refId: string | null) {
  if (!userId || !refId) return;
  await safe(
    supabase.from("notifications").update({ is_read: true, read_at: nowIso() }).eq("user_id", userId).eq("reference_id", refId),
    "mark ref notifications read",
  );
}

async function writeAudit(params: {
  action: string;
  entityType: "FF3" | "FF4";
  entityId: string;
  ref: string;
  status: string;
  comment: string;
  registrar: { userId: string | null; name: string };
}) {
  await safe(
    supabase.from("audit_logs").insert({
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      entity_reference: params.ref,
      user_id: params.registrar.userId,
      user_name: params.registrar.name,
      new_values: { status: params.status },
      metadata: params.comment ? { comments: params.comment } : null,
      created_at: nowIso(),
    }),
    "write audit log",
  );
}

/* ----------------------------------------------------------------- FF3 */
export async function decideFF3(params: {
  ff3: Pick<
    FF3Detail,
    | "id"
    | "ff3_number"
    | "expense_code_registry_id"
    | "financial_year"
    | "total_estimated_amount"
    | "requesting_officer_id"
  >;
  decision: Decision;
  comment: string;
  registrar: { userId: string | null; name: string };
}): Promise<void> {
  const { ff3, decision, comment, registrar } = params;
  const status = ff3StatusFor(decision);

  const headerPatch: Record<string, unknown> = { status, updated_at: nowIso() };
  if (decision === "APPROVED") {
    headerPatch.approved_by = registrar.userId;
    headerPatch.approved_date = nowIso();
  }
  if (decision === "REJECTED" || decision === "RETURNED") {
    headerPatch.rejection_reason = comment || null;
  }

  const { error } = await supabase.from("ff3_headers").update(headerPatch).eq("id", ff3.id);
  if (error) throw new Error(error.message);

  // Approval workflow record
  await safe(
    supabase.from("ff3_approvals").insert({
      ff3_header_id: ff3.id,
      approval_level: REGISTRAR_LEVEL,
      approver_id: registrar.userId,
      action_taken: decision,
      comments: comment || null,
      action_date: nowIso(),
    }),
    "insert ff3_approval",
  );

  // On approval, raise the budget commitment.
  if (decision === "APPROVED") {
    await createCommitment(ff3);
  }

  await writeAudit({
    action: decision,
    entityType: "FF3",
    entityId: ff3.id,
    ref: ff3.ff3_number,
    status,
    comment,
    registrar,
  });

  // Notify the originating officer + clear the Registrar's own alert.
  if (ff3.requesting_officer_id) {
    await safe(
      supabase.from("notifications").insert({
        user_id: ff3.requesting_officer_id,
        notification_type: `FF3_${decision}`,
        title: `Requisition ${decisionVerb[decision]} — ${ff3.ff3_number}`,
        message: `Your requisition ${ff3.ff3_number} has been ${decisionVerb[decision]} by the Registrar.${comment ? ` Note: ${comment}` : ""}`,
        reference_type: "FF3",
        reference_id: ff3.ff3_number,
        priority: decision === "APPROVED" ? "MEDIUM" : "HIGH",
        is_read: false,
        created_at: nowIso(),
      }),
      "notify officer (ff3)",
    );
  }
  await markRefRead(registrar.userId, ff3.ff3_number);
}

async function createCommitment(
  ff3: Pick<FF3Detail, "id" | "expense_code_registry_id" | "financial_year" | "total_estimated_amount">,
) {
  // Find a budget allocation for this expense code (commitment requires it).
  let allocId: string | null = null;
  if (ff3.expense_code_registry_id) {
    let res = await supabase
      .from("budget_allocations")
      .select("id")
      .eq("expense_code_registry_id", ff3.expense_code_registry_id)
      .eq("financial_year", ff3.financial_year ?? new Date().getFullYear())
      .limit(1);
    allocId = res.data?.[0]?.id ?? null;
    if (!allocId) {
      res = await supabase.from("budget_allocations").select("id").eq("expense_code_registry_id", ff3.expense_code_registry_id).limit(1);
      allocId = res.data?.[0]?.id ?? null;
    }
  }
  if (!allocId) {
    console.warn("[NJSS] No budget allocation found — commitment skipped.");
    return;
  }
  const fy = ff3.financial_year ?? new Date().getFullYear();
  const commitmentNumber = `CMT-${fy}-${Date.now().toString().slice(-6)}`;
  await safe(
    supabase.from("ff3_commitments").insert({
      commitment_number: commitmentNumber,
      ff3_header_id: ff3.id,
      budget_allocation_id: allocId,
      financial_year: fy,
      commitment_date: today(),
      committed_amount: ff3.total_estimated_amount,
      paid_amount: 0,
      status: "OPEN",
    }),
    "create commitment",
  );
}

/* ----------------------------------------------------------------- FF4 */
export async function decideFF4(params: {
  ff4: Pick<
    FF4Detail,
    "id" | "ff4_number" | "net_amount" | "payee_name" | "commitment" | "ff3_header_id"
  >;
  decision: Decision;
  comment: string;
  registrar: { userId: string | null; name: string };
}): Promise<void> {
  const { ff4, decision, comment, registrar } = params;

  // Hard guard: never approve a payment that exceeds the commitment balance.
  if (decision === "APPROVED" && ff4.commitment?.exceeds) {
    throw new Error(
      `Payment of ${ff4.net_amount} exceeds the remaining commitment balance of ${ff4.commitment.remaining}. Approval blocked.`,
    );
  }

  const status = ff4StatusFor(decision);
  const headerPatch: Record<string, unknown> = { status, updated_at: nowIso() };
  if (decision === "APPROVED") {
    headerPatch.approved_by = registrar.userId;
    headerPatch.approved_date = nowIso();
  }
  if (decision === "REJECTED" || decision === "RETURNED") {
    headerPatch.rejection_reason = comment || null;
  }

  const { error } = await supabase.from("ff4_headers").update(headerPatch).eq("id", ff4.id);
  if (error) throw new Error(error.message);

  await writeAudit({
    action: decision,
    entityType: "FF4",
    entityId: ff4.id,
    ref: ff4.ff4_number,
    status,
    comment,
    registrar,
  });

  // Notify the originating officer of the linked FF3 (if any).
  if (ff4.ff3_header_id) {
    const off = await supabase.from("ff3_headers").select("requesting_officer_id").eq("id", ff4.ff3_header_id).maybeSingle();
    const officerId = off.data?.requesting_officer_id;
    if (officerId) {
      await safe(
        supabase.from("notifications").insert({
          user_id: officerId,
          notification_type: decision === "APPROVED" ? "FF4_APPROVED" : `FF4_${decision}`,
          title: `Payment ${decisionVerb[decision]} — ${ff4.ff4_number}`,
          message: `Payment ${ff4.ff4_number} to ${ff4.payee_name} has been ${decisionVerb[decision]} by the Registrar.${comment ? ` Note: ${comment}` : ""}`,
          reference_type: "FF4",
          reference_id: ff4.ff4_number,
          priority: decision === "APPROVED" ? "MEDIUM" : "HIGH",
          is_read: false,
          created_at: nowIso(),
        }),
        "notify officer (ff4)",
      );
    }
  }
  await markRefRead(registrar.userId, ff4.ff4_number);
}

/* -------------------------------------------------------- notifications */
export async function markNotificationRead(id: string): Promise<void> {
  await safe(
    supabase.from("notifications").update({ is_read: true, read_at: nowIso() }).eq("id", id),
    "mark notification read",
  );
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await safe(
    supabase.from("notifications").update({ is_read: true, read_at: nowIso() }).eq("user_id", userId).eq("is_read", false),
    "mark all notifications read",
  );
}

export async function clearNotification(id: string): Promise<void> {
  await safe(supabase.from("notifications").delete().eq("id", id), "clear notification");
}
