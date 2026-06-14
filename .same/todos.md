# NJSS Registrar Mobile — Approval App (LIVE Supabase backend)

Backend = existing PNG Judiciary "CRMS/NJSS" Supabase project (reused, not rebuilt).
Currency = PNG Kina (K). Registrar = Ian Augerea.
Login: registrar@pngjudiciary.gov.pg / Registrar#2026  (PIN 4071)

## Done
- [x] Connected to live Supabase (anon read+write; service role only in scripts)
- [x] Seeded Registrar login + pending FF3/FF4 + commitments + notifications (Kina)
- [x] Auth (Supabase) + PIN/biometric lock + auto-lock + role load
- [x] Executive dashboard, approvals queue (search/filter/tabs)
- [x] FF3 detail (budget impact) + FF4 detail (commitment block) + decision flow
- [x] Document viewer, notifications, budget, commitments, reports, audit, profile, settings
- [x] Approve / reject / return -> updates header + ff3_approvals + audit_logs + notifications (+ commitment)
- [x] Treasury-executive design, in-frame phone shell, toasts

## PWA conversion
- [x] /public/manifest.json (NJSS FREMS, standalone, portrait)
- [x] Icons /public/icons (72→512, maskable, apple-touch) via sharp
- [x] Service worker /public/sw.js (app-shell precache, navigation fallback,
      static SWR, Supabase network-first w/ cache, push, background-sync stub)
- [x] /app/offline/page.tsx fallback
- [x] Install prompt + iOS hint + update detection (banners + Settings)
- [x] Push scaffolding (lib/push.ts + SW handlers) — needs VAPID key for server push
- [x] Metadata (manifest, icons, appleWebApp) + Netlify/next headers for sw & manifest
- [x] Manifest shortcuts (?tab=) wired to in-app tabs

## Notes / follow-ups
- SW registers in PRODUCTION builds only (deploy to Netlify to test install/offline)
- Real server push needs NEXT_PUBLIC_VAPID_PUBLIC_KEY + a sender (Supabase Edge Fn / web-push)
- Consider rotating the Supabase service_role key (was shared in chat)
