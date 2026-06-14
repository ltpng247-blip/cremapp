"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { usePortalHost } from "./phone-frame";

function useMounted(open: boolean, delay = 260) {
  const [mounted, setMounted] = React.useState(open);
  React.useEffect(() => {
    if (open) {
      setMounted(true);
    } else {
      const t = setTimeout(() => setMounted(false), delay);
      return () => clearTimeout(t);
    }
  }, [open, delay]);
  // trigger enter transition on next frame
  const [entered, setEntered] = React.useState(false);
  React.useEffect(() => {
    if (mounted) {
      const id = requestAnimationFrame(() => setEntered(open));
      return () => cancelAnimationFrame(id);
    }
    setEntered(false);
  }, [mounted, open]);
  return { mounted, entered };
}

export function BottomSheet({
  open,
  onOpenChange,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const host = usePortalHost();
  const { mounted, entered } = useMounted(open);
  if (!host || !mounted) return null;

  return createPortal(
    <div className="absolute inset-0 z-50">
      <div
        onClick={() => onOpenChange(false)}
        className={cn("absolute inset-0 bg-black/45 transition-opacity duration-300", entered ? "opacity-100" : "opacity-0")}
      />
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[90%] flex-col overflow-hidden rounded-t-[28px] border-t border-border bg-card shadow-2xl transition-transform duration-300 ease-out",
          entered ? "translate-y-0" : "translate-y-full",
          className,
        )}
      >
        <div className="flex shrink-0 justify-center pb-1 pt-3">
          <div className="h-1.5 w-10 rounded-full bg-muted-foreground/25" />
        </div>
        <div className="overflow-y-auto no-scrollbar">{children}</div>
      </div>
    </div>,
    host,
  );
}

export function Modal({
  open,
  onOpenChange,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const host = usePortalHost();
  const { mounted, entered } = useMounted(open);
  if (!host || !mounted) return null;

  return createPortal(
    <div className="absolute inset-0 z-[60]">
      <div
        onClick={() => onOpenChange(false)}
        className={cn("absolute inset-0 bg-black/60 transition-opacity duration-200", entered ? "opacity-100" : "opacity-0")}
      />
      <div
        className={cn(
          "absolute inset-0 flex flex-col transition-all duration-250 ease-out",
          entered ? "scale-100 opacity-100" : "scale-[0.98] opacity-0",
          className,
        )}
      >
        {children}
      </div>
    </div>,
    host,
  );
}
