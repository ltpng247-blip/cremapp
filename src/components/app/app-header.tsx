"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

export function IconButton({
  children,
  onClick,
  className,
  label,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full text-foreground/80 transition active:scale-90 hover:bg-accent",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function AppHeader({
  title,
  subtitle,
  onBack,
  leading,
  trailing,
  className,
  border = true,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
  border?: boolean;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-[52px] shrink-0 items-center gap-1 bg-background/85 px-2 backdrop-blur-xl",
        border && "border-b border-border/60",
        className,
      )}
    >
      {onBack ? (
        <IconButton onClick={onBack} label="Back">
          <ChevronLeft className="size-5" />
        </IconButton>
      ) : (
        leading
      )}
      <div className="min-w-0 flex-1 px-1">
        <p className="truncate font-display text-[17px] font-medium leading-tight text-foreground">{title}</p>
        {subtitle && <p className="truncate text-[11px] leading-tight text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">{trailing}</div>
    </header>
  );
}
