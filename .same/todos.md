# NJSS Registrar Mobile — Approval App (LIVE Supabase backend)

Backend = existing PNG Judiciary "CRMS/NJSS" Supabase project (reused, not rebuilt).
Currency = PNG Kina (K). Registrar = Ian Augerea.

## Done
- [x] Connected to live Supabase using required public environment variables
- [x] Seeded Registrar login + pending FF3/FF4 + commitments + notifications (Kina)
- [x] Authentication and role loading through Supabase Auth and RLS
- [x] Executive dashboard, approvals queue (search/filter/tabs)
- [x] FF3 detail (budget impact) + FF4 detail (commitment block) + decision flow
- [x] Document viewer, notifications, budget, commitments, reports, audit, profile, settings
- [x] FF3 and FF4 final decisions use the authoritative NJSS transition RPCs
- [x] Treasury-executive design, in-frame phone shell, toasts

## PWA conversion
- [x] /public/manifest.json (NJSS FREMS, standalone, portrait)
- [x] Icons /public/icons (72→512, maskable, apple-touch) via sharp
- [x] Service worker app-shell precache, navigation fallback, static SWR, and push handling
- [x] /app/offline/page.tsx fallback
- [x] Install prompt + iOS hint + update detection (banners + Settings)
- [x] Push scaffolding (lib/push.ts + SW handlers) — needs VAPID key for server push
- [x] Metadata (manifest, icons, appleWebApp) + Netlify/next headers for sw & manifest
- [x] Manifest shortcuts (?tab=) wired to in-app tabs

## Notes / follow-ups
- SW registers in PRODUCTION builds only (deploy to Netlify to test install/offline)
- Real server push needs NEXT_PUBLIC_VAPID_PUBLIC_KEY + a sender (Supabase Edge Fn / web-push)
- Keep privileged backend credentials outside tracked files and browser code.
