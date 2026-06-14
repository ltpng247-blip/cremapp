import * as React from "react";

/**
 * National Justice Staff Services emblem — a stylised Bird of Paradise (Kumul)
 * rising over a crescent. Uses currentColor so it can be tinted (e.g. gold).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="National Justice Staff Services"
    >
      {/* crescent cradle */}
      <path
        d="M11 48 Q32 64 53 48"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
      <g fill="currentColor">
        {/* sweeping tail plumes */}
        <path d="M40 33 C 50 37, 57 46, 60 56 C 55 47, 47 40, 39 36 Z" />
        <path d="M40 35 C 48 41, 53 50, 53 60 C 49 51, 43 43, 38 38 Z" />
        <path d="M38 37 C 43 43, 46 52, 44 61 C 42 53, 39 45, 36 40 Z" />
        {/* upraised wing */}
        <path d="M25 23 C 31 15, 40 15, 45 21 C 38 23, 31 25, 27 29 Z" />
        {/* body */}
        <ellipse cx="30" cy="31" rx="12.5" ry="6.2" transform="rotate(-25 30 31)" />
        {/* head */}
        <circle cx="18.5" cy="23.5" r="4.4" />
        {/* beak */}
        <path d="M8.5 22.5 L 16 21 L 16 25.5 Z" />
        {/* crest plumes */}
        <path d="M20 18.5 C 19 12.5, 22 8, 27.5 6 C 23.5 10, 23.5 14.5, 22.5 19.5 Z" />
        <path d="M23.5 18.5 C 23.5 13, 26.5 9, 31 8 C 27.5 11.5, 27 15.5, 26.5 19.5 Z" />
      </g>
      {/* eye */}
      <circle cx="17.6" cy="23" r="1.1" fill="hsl(224 55% 10%)" />
    </svg>
  );
}
