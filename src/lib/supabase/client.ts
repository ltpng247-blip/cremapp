import { createClient } from "@supabase/supabase-js";

// Public Supabase project values. The anon key is a PUBLIC client key — it is
// protected by Row Level Security and is already shipped to every browser that
// loads the app, so it is safe to keep here. (The privileged service-role key is
// NEVER placed in client code — it lives only in server-side scripts/.env.local.)
// These constants act as fallbacks so login works even when the host's build
// environment has no NEXT_PUBLIC_* variables configured (e.g. a Netlify build
// without env vars set in the dashboard).
const FALLBACK_SUPABASE_URL = "https://pxfayiavwxvdenhstric.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4ZmF5aWF2d3h2ZGVuaHN0cmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMTYwOTcsImV4cCI6MjA5Njg5MjA5N30.qLgAyRORojQzmtf6TsIZ51N0oEtZxEQU6H4fbAOrZiM";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: { "x-client-info": "njss-registrar-mobile" },
  },
});
