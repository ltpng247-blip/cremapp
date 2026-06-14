import { SLA_HOURS } from "./supabase/constants";
import type { FF3Summary, FF4Summary, PendingItem } from "./types";

export type QueueFilter = "ALL" | "FF3" | "FF4" | "URGENT" | "HIGH_VALUE" | "OVERDUE";

export function isUrgent(urgency: string): boolean {
  return ["CRITICAL", "HIGH", "URGENT"].includes((urgency ?? "").toUpperCase());
}

export function isCritical(urgency: string): boolean {
  return ["CRITICAL", "URGENT"].includes((urgency ?? "").toUpperCase());
}

// Overdue against the approval SLA (time since submission).
export function isOverdue(submittedDate: string | null | undefined, now = Date.now()): boolean {
  if (!submittedDate) return false;
  const submitted = new Date(submittedDate).getTime();
  if (isNaN(submitted)) return false;
  return now - submitted > SLA_HOURS * 3_600_000;
}

export function amountOf(item: PendingItem): number {
  return item.kind === "FF3"
    ? (item as FF3Summary).total_estimated_amount
    : (item as FF4Summary).net_amount;
}

export function matchesFilter(item: PendingItem, filter: QueueFilter): boolean {
  switch (filter) {
    case "ALL":
      return true;
    case "FF3":
      return item.kind === "FF3";
    case "FF4":
      return item.kind === "FF4";
    case "URGENT":
      return isUrgent(item.urgency_level);
    case "HIGH_VALUE":
      return item.highValue;
    case "OVERDUE":
      return isOverdue(item.submitted_date);
    default:
      return true;
  }
}

export function searchItem(item: PendingItem, q: string): boolean {
  if (!q.trim()) return true;
  const hay = (
    item.kind === "FF3"
      ? [
          (item as FF3Summary).ff3_number,
          (item as FF3Summary).purpose,
          (item as FF3Summary).departmentName,
          (item as FF3Summary).officerName,
          (item as FF3Summary).selected_supplier_name,
        ]
      : [
          (item as FF4Summary).ff4_number,
          (item as FF4Summary).payee_name,
          (item as FF4Summary).payment_description,
          (item as FF4Summary).ff3_number,
        ]
  )
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q.trim().toLowerCase());
}

export function sumValue(items: PendingItem[]): number {
  return items.reduce((s, i) => s + amountOf(i), 0);
}

export function isApprovedToday(approvedDate: string | null | undefined, now = Date.now()): boolean {
  if (!approvedDate) return false;
  const d = new Date(approvedDate);
  const n = new Date(now);
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
