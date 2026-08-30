import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), "utf8");

const browserSource = () =>
  globSync("src/**/*.{ts,tsx}", { cwd: ROOT })
    .map((path) => `${path}\n${read(path)}`)
    .join("\n");

test("Supabase browser client has no hardcoded fallback URL or JWT", () => {
  const source = read("src/lib/supabase/client.ts");
  assert.doesNotMatch(source, /FALLBACK_SUPABASE/);
  assert.doesNotMatch(source, /https:\/\/[a-z]+\.supabase\.co/);
  assert.doesNotMatch(source, /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  assert.match(source, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(source, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.match(source, /if\s*\(\s*!url\s*\|\|\s*!anon\s*\)/);
  assert.match(source, /throw new Error/);
});

test("tracked source has no hardcoded demo password or PIN", () => {
  const source = [browserSource(), read("scripts/seed.mjs"), read(".same/todos.md")].join("\n");
  assert.doesNotMatch(source, /Registrar#[0-9]{4}/);
  assert.doesNotMatch(source, /DEMO_(?:PASSWORD|PIN)/);
  assert.doesNotMatch(source, /Demo PIN/i);
});

test("workflow code does not directly mutate FF3 or FF4 headers", () => {
  const source = browserSource();
  assert.doesNotMatch(source, /from\(["']ff3_headers["']\)[\s\S]{0,120}\.update\(/);
  assert.doesNotMatch(source, /from\(["']ff4_headers["']\)[\s\S]{0,120}\.update\(/);
});

test("FF3 workflow uses the authoritative transition RPC", () => {
  const source = read("src/lib/supabase/mutations.ts");
  assert.match(source, /rpc\(["']njss_transition_ff3["']/);
  for (const argument of ["p_ff3_id", "p_action", "p_comments", "p_user_email"]) {
    assert.match(source, new RegExp(`\\b${argument}\\b`));
  }
  assert.match(source, /APPROVED:\s*["']APPROVE["']/);
  assert.match(source, /REJECTED:\s*["']REJECT["']/);
  assert.match(source, /RETURNED:\s*["']RETURN["']/);
  assert.match(source, /ff3\.status\s*!==\s*["']ENDORSED_SECTION_HEAD["']/);
  assert.doesNotMatch(source, /ON_HOLD/);
});

test("FF4 workflow uses the authoritative transition RPC", () => {
  const source = read("src/lib/supabase/mutations.ts");
  assert.match(source, /rpc\(["']njss_transition_ff4["']/);
  for (const argument of [
    "p_ff4_id",
    "p_action",
    "p_comments",
    "p_payment_reference",
    "p_payment_date",
    "p_payment_method",
    "p_cheque_number",
    "p_user_email",
  ]) {
    assert.match(source, new RegExp(`\\b${argument}\\b`));
  }
  assert.match(source, /p_action:\s*["']APPROVE["']/);
  assert.match(source, /ff4\.status\s*!==\s*["']VERIFIED["']/);
  assert.doesNotMatch(source, /CANCEL/);
});

test("service worker neither caches nor serves Supabase API responses", () => {
  const source = read("public/service-worker.js");
  assert.doesNotMatch(source, /cremapp-supabase-\$\{VERSION\}/);
  assert.doesNotMatch(source, /const SUPA\s*=/);
  assert.doesNotMatch(source, /Supabase reads/);
  assert.match(source, /startsWith\(["']cremapp-supabase-["']\)/);
  assert.match(source, /isSupabaseApiRequest/);
  for (const path of ["/rest/v1/", "/auth/v1/", "/storage/v1/", "/functions/v1/", "/realtime/v1/"]) {
    assert.match(source, new RegExp(path.replaceAll("/", "\\/")));
  }
  assert.ok(
    source.indexOf("if (isSupabaseApiRequest(url)) return;") < source.indexOf("if (url.origin === self.location.origin)"),
    "Supabase API requests must bypass the service worker before same-origin static caching",
  );
});

test("browser source never references the Supabase service-role key", () => {
  assert.doesNotMatch(browserSource(), /SUPABASE_SERVICE_ROLE_KEY/);
});

test("recent FF3 includes authoritative and legacy terminal states", () => {
  const source = read("src/lib/supabase/queries.ts");
  assert.match(
    source,
    /\.in\(["']status["'],\s*\[["']COMMITTED["'],\s*["']APPROVED["'],\s*["']REJECTED["'],\s*["']RETURNED["']\]\)/,
  );
});

test("COMMITTED is represented as a successful FF3 state", () => {
  const primitives = read("src/components/app/primitives.tsx");
  const filters = read("src/lib/filters.ts");
  const detail = read("src/components/screens/ff3-detail-screen.tsx");
  assert.match(primitives, /COMMITTED:\s*\{\s*label:\s*["']Approved & committed["'],\s*variant:\s*["']success["']/);
  assert.match(filters, /item\.kind\s*===\s*["']FF3["'][\s\S]{0,160}["']COMMITTED["']/);
  assert.match(detail, /\[["']COMMITTED["'],\s*["']APPROVED["']\]\.includes/);
});

test("authoritative pending stages have explicit warning badges", () => {
  const source = read("src/components/app/primitives.tsx");
  assert.match(source, /ENDORSED_SECTION_HEAD:\s*\{\s*label:\s*["']Awaiting Registrar["'],\s*variant:\s*["']warning["']/);
  assert.match(source, /VERIFIED:\s*\{\s*label:\s*["']Awaiting approval["'],\s*variant:\s*["']warning["']/);
  assert.match(read("src/lib/supabase/mutations.ts"), /ff3\.status\s*!==\s*["']ENDORSED_SECTION_HEAD["']/);
});

test("authenticated sessions enforce five-minute inactivity sign-out", () => {
  const source = read("src/components/app/app-provider.tsx");
  assert.match(source, /INACTIVITY_TIMEOUT_MS\s*=\s*5\s*\*\s*60\s*\*\s*1000/);
  assert.match(source, /authStatus\s*!==\s*["']authenticated["']/);
  for (const event of ["pointerdown", "keydown", "touchstart"]) {
    assert.match(source, new RegExp(`["']${event}["']`));
  }
  assert.match(source, /setTimeout\([\s\S]{0,160}signOut\(\)/);
  assert.match(source, /removeEventListener/);
  assert.match(source, /clearTimeout/);
});

test("real sign-out clears session-sensitive in-memory state", () => {
  const source = read("src/components/app/app-provider.tsx");
  assert.match(source, /await supabase\.auth\.signOut\(\)/);
  assert.match(source, /finally\s*\{[\s\S]{0,100}clearSessionState\(\)/);
  for (const setter of [
    "setRegistrar(null)",
    "setPendingFF3([])",
    "setPendingFF4([])",
    "setRecentFF3([])",
    "setRecentFF4([])",
    "setNotifications([])",
  ]) {
    assert.ok(source.includes(setter), `missing session cleanup: ${setter}`);
  }
});

test("no local-only unlock mechanisms return", () => {
  const source = browserSource();
  assert.doesNotMatch(source, /DEMO_PIN|unlockBiometric|unlock\s*:\s*\(|pin\s*===/i);
  assert.doesNotMatch(source, /Biometric unlock|Unlock with biometrics|two-factor authentication/i);
});
