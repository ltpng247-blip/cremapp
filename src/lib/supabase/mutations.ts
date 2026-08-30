import { supabase } from "./client";
import type { Decision, FF3Detail, FF4Detail } from "../types";

const nowIso = () => new Date().toISOString();

const FF3_ACTION: Record<Decision, "APPROVE" | "REJECT" | "RETURN"> = {
  APPROVED: "APPROVE",
  REJECTED: "REJECT",
  RETURNED: "RETURN",
};

function requireEmail(email: string): string {
  const value = email.trim();
  if (!value) throw new Error("The authenticated user's email is required for this workflow action.");
  return value;
}

export async function decideFF3(params: {
  ff3: Pick<FF3Detail, "id" | "status">;
  decision: Decision;
  comment: string;
  userEmail: string;
}): Promise<void> {
  const { ff3, decision, comment } = params;
  if (ff3.status !== "ENDORSED_SECTION_HEAD") {
    throw new Error("FF3 final decisions are only allowed from ENDORSED_SECTION_HEAD.");
  }

  const { error } = await supabase.rpc("njss_transition_ff3", {
    p_ff3_id: ff3.id,
    p_action: FF3_ACTION[decision],
    p_comments: comment || null,
    p_user_email: requireEmail(params.userEmail),
  });
  if (error) throw new Error(error.message);
}

export async function decideFF4(params: {
  ff4: Pick<
    FF4Detail,
    | "id"
    | "status"
    | "net_amount"
    | "commitment"
    | "payment_reference"
    | "payment_date"
    | "payment_method"
    | "cheque_number"
  >;
  decision: "APPROVED";
  comment: string;
  userEmail: string;
}): Promise<void> {
  const { ff4, decision, comment } = params;
  if (decision !== "APPROVED") throw new Error("FF4 only supports final approval in CREMAPP.");
  if (ff4.status !== "VERIFIED") {
    throw new Error("FF4 final approval is only allowed from VERIFIED.");
  }
  if (ff4.commitment?.exceeds) {
    throw new Error(
      `Payment of ${ff4.net_amount} exceeds the remaining commitment balance of ${ff4.commitment.remaining}. Approval blocked.`,
    );
  }

  const { error } = await supabase.rpc("njss_transition_ff4", {
    p_ff4_id: ff4.id,
    p_action: "APPROVE",
    p_comments: comment || null,
    p_payment_reference: ff4.payment_reference,
    p_payment_date: ff4.payment_date,
    p_payment_method: ff4.payment_method,
    p_cheque_number: ff4.cheque_number,
    p_user_email: requireEmail(params.userEmail),
  });
  if (error) throw new Error(error.message);
}

async function safe<T>(request: PromiseLike<T>, label: string): Promise<void> {
  try {
    const result: any = await request;
    if (result?.error) console.warn(`[NJSS] ${label}:`, result.error.message);
  } catch (error: any) {
    console.warn(`[NJSS] ${label}:`, error?.message ?? error);
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  await safe(
    supabase.from("notifications").update({ is_read: true, read_at: nowIso() }).eq("id", id),
    "mark notification read",
  );
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await safe(
    supabase
      .from("notifications")
      .update({ is_read: true, read_at: nowIso() })
      .eq("user_id", userId)
      .eq("is_read", false),
    "mark all notifications read",
  );
}

export async function clearNotification(id: string): Promise<void> {
  await safe(supabase.from("notifications").delete().eq("id", id), "clear notification");
}
