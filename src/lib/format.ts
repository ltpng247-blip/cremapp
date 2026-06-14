// Money & date formatting helpers — PNG Kina (K) context.

export function kina(value: number | null | undefined, opts?: { decimals?: boolean }): string {
  const v = Number(value ?? 0);
  const decimals = opts?.decimals ?? false;
  return `K${v.toLocaleString("en-US", {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  })}`;
}

// Compact form for dashboards: K2.4M, K850k
export function kinaCompact(value: number | null | undefined): string {
  const v = Number(value ?? 0);
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return `K${(v / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `K${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 2)}M`;
  if (abs >= 1_000) return `K${(v / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}k`;
  return `K${Math.round(v)}`;
}

export function plainNumber(value: number): string {
  return Number(value ?? 0).toLocaleString("en-US");
}

export function formatDate(iso?: string | null, withYear = true): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// "3h ago", "in 2d", "just now"
export function relativeTime(iso?: string | null, now: number = Date.now()): string {
  if (!iso) return "—";
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const min = 60_000, hour = 60 * min, day = 24 * hour;
  const future = diff > 0;
  let txt: string;
  if (abs < min) return "just now";
  if (abs < hour) txt = `${Math.round(abs / min)}m`;
  else if (abs < day) txt = `${Math.round(abs / hour)}h`;
  else txt = `${Math.round(abs / day)}d`;
  return future ? `in ${txt}` : `${txt} ago`;
}

export function hoursUntil(iso?: string | null, now: number = Date.now()): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  return (new Date(iso).getTime() - now) / 3_600_000;
}

export function dueLabel(iso?: string | null, now: number = Date.now()): { text: string; overdue: boolean } {
  const h = hoursUntil(iso, now);
  if (!isFinite(h)) return { overdue: false, text: "No deadline" };
  if (h < 0) {
    const over = Math.abs(h);
    return { overdue: true, text: over >= 24 ? `Overdue ${Math.round(over / 24)}d` : `Overdue ${Math.round(over)}h` };
  }
  if (h < 24) return { overdue: false, text: `Due in ${Math.max(1, Math.round(h))}h` };
  return { overdue: false, text: `Due in ${Math.round(h / 24)}d` };
}

export function pct(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (value / total) * 100));
}

export function initials(name?: string | null): string {
  if (!name) return "—";
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join("");
}

export function titleCase(s?: string | null): string {
  if (!s) return "";
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
