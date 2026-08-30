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
