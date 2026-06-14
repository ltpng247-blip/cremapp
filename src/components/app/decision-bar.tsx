"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "./overlay";
import type { Decision } from "@/lib/types";
import {
  Ban,
  Check,
  CornerUpLeft,
  Loader2,
  Lock,
  Mic,
  PauseCircle,
  Square,
  TriangleAlert,
  X,
} from "lucide-react";

const QUICK: Record<Decision, string[]> = {
  APPROVED: ["Approved as presented.", "Within budget — approved.", "Cleared for payment.", "Noted and approved."],
  REJECTED: ["Insufficient budget.", "Not adequately justified.", "Duplicate request.", "Incorrect expense coding."],
  RETURNED: ["Obtain three competitive quotations.", "Attach the supplier invoice.", "Revise the estimated amounts.", "Clarify the purpose of expenditure."],
  ON_HOLD: ["Pending clarification from department.", "Awaiting supporting documents."],
};

const META: Record<Decision, { label: string; verb: string; tone: "success" | "destructive" | "gold" | "warning"; icon: any }> = {
  APPROVED: { label: "Approve", verb: "Approve", tone: "success", icon: Check },
  REJECTED: { label: "Reject", verb: "Reject", tone: "destructive", icon: Ban },
  RETURNED: { label: "Return", verb: "Return for correction", tone: "gold", icon: CornerUpLeft },
  ON_HOLD: { label: "Hold", verb: "Place on hold", tone: "warning", icon: PauseCircle },
};

export function DecisionBar({
  kind,
  number,
  approveBlocked,
  blockedReason,
  onSubmit,
}: {
  kind: "FF3" | "FF4";
  number: string;
  approveBlocked?: boolean;
  blockedReason?: string;
  onSubmit: (decision: Decision, comment: string) => Promise<boolean>;
}) {
  const [decision, setDecision] = React.useState<Decision | null>(null);
  const [comment, setComment] = React.useState("");
  const [recording, setRecording] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const open = (d: Decision) => {
    setDecision(d);
    setComment("");
    setRecording(false);
  };
  const close = () => { if (!submitting) setDecision(null); };

  const meta = decision ? META[decision] : null;
  const commentRequired = decision === "REJECTED" || decision === "RETURNED";
  const canConfirm = !commentRequired || comment.trim().length > 0;

  const confirm = async () => {
    if (!decision) return;
    setSubmitting(true);
    const ok = await onSubmit(decision, comment.trim());
    setSubmitting(false);
    if (ok) setDecision(null);
  };

  const toggleRecording = () => {
    if (recording) {
      setRecording(false);
      setComment((c) => (c ? c + " " : "") + "[Voice note attached]");
    } else {
      setRecording(true);
    }
  };

  return (
    <>
      <div className="shrink-0 border-t border-border/60 bg-card/95 px-4 pb-[max(env(safe-area-inset-bottom),10px)] pt-3 backdrop-blur-xl">
        {approveBlocked && (
          <div className="mb-2.5 flex items-center gap-2 rounded-xl bg-destructive/12 px-3 py-2 text-[12px] font-semibold text-destructive">
            <Lock className="size-3.5 shrink-0" /> {blockedReason ?? "Approval blocked"}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex-1 border-warning/40 text-warning hover:bg-warning/10" onClick={() => open("RETURNED")}>
            <CornerUpLeft className="size-4" /> Return
          </Button>
          <Button variant="outline" className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => open("REJECTED")}>
            <Ban className="size-4" /> Reject
          </Button>
          <Button
            variant="success"
            className="flex-[1.4]"
            disabled={approveBlocked}
            onClick={() => open("APPROVED")}
          >
            <Check className="size-4" /> Approve
          </Button>
        </div>
        <div className="mt-2 flex justify-center">
          <button onClick={() => open("ON_HOLD")} className="text-[12px] font-medium text-muted-foreground hover:text-foreground">
            Hold for clarification
          </button>
        </div>
      </div>

      <BottomSheet open={!!decision} onOpenChange={(v) => !v && close()}>
          {decision && meta && (
            <div className="mx-auto w-full max-w-[420px] px-5 pb-7 pt-1">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "grid size-11 place-items-center rounded-2xl",
                    meta.tone === "success" && "bg-success/12 text-success",
                    meta.tone === "destructive" && "bg-destructive/12 text-destructive",
                    meta.tone === "gold" && "bg-gold/15 text-gold",
                    meta.tone === "warning" && "bg-warning/15 text-warning",
                  )}
                >
                  <meta.icon className="size-5" />
                </span>
                <div>
                  <p className="font-display text-xl leading-tight">{meta.verb}</p>
                  <p className="text-[13px] text-muted-foreground">{kind} · {number}</p>
                </div>
              </div>

              {/* quick comments */}
              <div className="mt-4 flex flex-wrap gap-2">
                {QUICK[decision].map((q) => (
                  <button
                    key={q}
                    onClick={() => setComment(q)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[12px] transition active:scale-95",
                      comment === q ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground/75",
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* comment box */}
              <div className="mt-3 rounded-2xl border border-border bg-background p-3">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder={commentRequired ? "Add a reason (required)…" : "Add an approval note (optional)…"}
                  className="w-full resize-none bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
                />
                <div className="mt-1 flex items-center justify-between">
                  <button
                    onClick={toggleRecording}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium transition",
                      recording ? "bg-destructive/12 text-destructive animate-pulse" : "text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {recording ? <Square className="size-3.5" /> : <Mic className="size-3.5" />}
                    {recording ? "Stop recording" : "Voice note"}
                  </button>
                  {commentRequired && !canConfirm && (
                    <span className="text-[11px] text-destructive">Reason required</span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-2.5">
                <Button variant="outline" className="flex-1" onClick={close} disabled={submitting}>
                  <X className="size-4" /> Cancel
                </Button>
                <Button
                  variant={meta.tone === "gold" ? "gold" : meta.tone === "warning" ? "warning" : meta.tone === "destructive" ? "destructive" : "success"}
                  className="flex-[1.5]"
                  onClick={confirm}
                  disabled={!canConfirm || submitting}
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : <meta.icon className="size-4" />}
                  {submitting ? "Submitting…" : `Confirm ${meta.label}`}
                </Button>
              </div>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
                <TriangleAlert className="size-3" /> This decision updates the NJSS system and audit log immediately.
              </p>
            </div>
          )}
      </BottomSheet>
    </>
  );
}
