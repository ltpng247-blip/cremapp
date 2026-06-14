"use client";

import * as React from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Modal } from "./overlay";
import { IconButton } from "./app-header";
import { kina } from "@/lib/format";
import type { Attachment } from "@/lib/types";
import {
  Check,
  CheckCircle2,
  Download,
  FileText,
  Image as ImageIcon,
  Receipt,
  Share2,
  ZoomIn,
  X,
} from "lucide-react";

function iconFor(a: Attachment) {
  const t = (a.attachment_type ?? "").toUpperCase();
  if ((a.file_type ?? "").startsWith("image")) return ImageIcon;
  if (t === "INVOICE" || t === "RECEIPT") return Receipt;
  return FileText;
}

export function DocChip({
  attachment,
  reviewed,
  onOpen,
}: {
  attachment: Attachment;
  reviewed: boolean;
  onOpen: () => void;
}) {
  const Icon = iconFor(attachment);
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-xl border border-border/70 bg-background/70 px-3 py-2.5 text-left transition active:scale-[0.99]"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-foreground">{attachment.file_name}</p>
        <p className="text-[11px] capitalize text-muted-foreground">
          {(attachment.attachment_type ?? "document").toLowerCase()} · tap to view
        </p>
      </div>
      {reviewed && (
        <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-[10px] font-bold text-success">
          <Check className="size-3" /> Reviewed
        </span>
      )}
    </button>
  );
}

export function DocumentViewer({
  attachment,
  open,
  onOpenChange,
  reviewed,
  onToggleReviewed,
}: {
  attachment: Attachment | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reviewed: boolean;
  onToggleReviewed: () => void;
}) {
  const [zoom, setZoom] = React.useState(1);
  React.useEffect(() => { if (open) setZoom(1); }, [open]);

  if (!attachment) return null;
  const type = (attachment.attachment_type ?? "").toUpperCase();
  const isImage = (attachment.file_type ?? "").startsWith("image");

  return (
    <Modal open={open} onOpenChange={onOpenChange} className="bg-[hsl(150_10%_12%)]">
      {/* header */}
      <div className="flex h-12 shrink-0 items-center gap-1 px-2 text-white">
        <IconButton onClick={() => onOpenChange(false)} label="Close" className="text-white/90 hover:bg-white/10">
          <X className="size-5" />
        </IconButton>
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-[14px] font-semibold">{attachment.file_name}</p>
          <p className="text-[11px] text-white/50">Page 1 of 1 · {Math.round(zoom * 100)}%</p>
        </div>
        <IconButton onClick={() => setZoom((z) => (z >= 1.8 ? 1 : z + 0.4))} label="Zoom" className="text-white/90 hover:bg-white/10">
          <ZoomIn className="size-5" />
        </IconButton>
        <IconButton onClick={() => toast.success("Download started", { description: attachment.file_name })} label="Download" className="text-white/90 hover:bg-white/10">
          <Download className="size-5" />
        </IconButton>
        <IconButton onClick={() => toast.success("Shared internally", { description: "Sent to the Bursary unit." })} label="Share" className="text-white/90 hover:bg-white/10">
          <Share2 className="size-5" />
        </IconButton>
      </div>

      {/* page */}
      <div className="flex-1 overflow-auto p-4">
        <div
          className="mx-auto origin-top transition-transform duration-200"
          style={{ transform: `scale(${zoom})`, width: "100%", maxWidth: 360 }}
        >
          {isImage ? <ImageDoc name={attachment.file_name} /> : <PaperDoc type={type} name={attachment.file_name} />}
        </div>
      </div>

      {/* footer */}
      <div className="shrink-0 border-t border-white/10 bg-black/30 px-4 pb-[max(env(safe-area-inset-bottom),10px)] pt-3">
        <button
          onClick={onToggleReviewed}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition active:scale-[0.99]",
            reviewed ? "bg-success/20 text-success" : "bg-white/10 text-white",
          )}
        >
          <CheckCircle2 className="size-4" />
          {reviewed ? "Marked as reviewed" : "Mark as reviewed"}
        </button>
      </div>
    </Modal>
  );
}

function PaperDoc({ type, name }: { type: string; name: string }) {
  const supplier = name.split(/—|-/)[1]?.trim() || name.split(".")[0];
  const docLabel = type === "INVOICE" ? "TAX INVOICE" : type === "RECEIPT" ? "OFFICIAL RECEIPT" : type === "QUOTATION" ? "QUOTATION" : "DOCUMENT";
  const rows = [
    ["Supply as per specification", "2", "1,650", "3,300"],
    ["Delivery & handling", "1", "180", "180"],
    ["Installation / service", "1", "120", "120"],
  ];
  return (
    <div className="rounded-sm bg-white text-[hsl(224_24%_16%)] shadow-2xl">
      <div className="flex items-center justify-between bg-[hsl(224_58%_18%)] px-5 py-4 text-white">
        <div>
          <p className="font-display text-lg leading-tight">{supplier || "Supplier Pty Ltd"}</p>
          <p className="text-[10px] text-white/60">Port Moresby · National Capital District · PNG</p>
        </div>
        <span className="rounded bg-white/15 px-2 py-1 text-[10px] font-bold tracking-widest">{docLabel}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 px-5 py-4 text-[11px]">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-black/40">Billed to</p>
          <p className="font-semibold">National Judiciary Staff Services</p>
          <p className="text-black/55">Waigani, NCD</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-wider text-black/40">Reference</p>
          <p className="font-mono font-semibold">{docLabel.split(" ")[0]}-2026-0188</p>
          <p className="text-black/55">Date: 14 Jun 2026</p>
        </div>
      </div>
      <div className="px-5">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-y border-black/10 py-1.5 text-[9px] font-bold uppercase tracking-wider text-black/45">
          <span>Description</span><span className="text-right">Qty</span><span className="text-right">Unit</span><span className="text-right">Amount</span>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-b border-black/5 py-2 text-[11px]">
            <span>{r[0]}</span>
            <span className="text-right tabular-nums">{r[1]}</span>
            <span className="text-right tabular-nums">{r[2]}</span>
            <span className="text-right font-semibold tabular-nums">{r[3]}</span>
          </div>
        ))}
        <div className="flex justify-end gap-8 py-2 text-[11px]">
          <span className="text-black/50">Subtotal</span>
          <span className="font-semibold tabular-nums">{kina(3600)}</span>
        </div>
        <div className="flex justify-end gap-8 border-t border-black/10 py-2 text-[13px]">
          <span className="font-bold">Total (incl. GST)</span>
          <span className="font-display font-bold tabular-nums text-[hsl(224_58%_28%)]">{kina(3960)}</span>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between px-5 pb-5 pt-3 text-[9px] text-black/40">
        <span>System-rendered preview · NJSS CRMS</span>
        <span className="italic">Authorised signature</span>
      </div>
    </div>
  );
}

function ImageDoc({ name }: { name: string }) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-2xl">
      <div
        className="grid aspect-[4/3] place-items-center"
        style={{ backgroundImage: "linear-gradient(135deg, hsl(220 16% 80%), hsl(220 14% 64%))" }}
      >
        <ImageIcon className="size-16 text-white/80" />
      </div>
      <p className="px-3 py-2 text-[11px] text-[hsl(224_24%_16%)]">{name}</p>
    </div>
  );
}
